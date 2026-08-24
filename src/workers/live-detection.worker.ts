import { env, pipeline, RawImage } from "@huggingface/transformers";

type FrameMessage = {
  type: "frame";
  bitmap: ImageBitmap;
  width: number;
  height: number;
  inputSize: number;
};

let detector: any = null;
let loading: Promise<void> | null = null;
let canvas: OffscreenCanvas | null = null;

// RT-DETR is both supported by transformers.js and far more reliable than
// yolos-tiny, which invented objects that were not in frame.
const CANDIDATES: { model: string; dtype: string }[] = [
  { model: "onnx-community/rtdetr_v2_r18vd", dtype: "q8" },
  { model: "onnx-community/rtdetr_r18vd", dtype: "q8" },
  { model: "Xenova/yolos-tiny", dtype: "q8" },
];

async function loadModel() {
  if (detector) return;
  if (loading) return loading;

  loading = (async () => {
    env.allowLocalModels = false;
    try {
      (env.backends as any).onnx.wasm.numThreads = 1;
    } catch {
      // Single-threaded WASM is intentional: inference runs off the UI thread.
    }

    let lastError: unknown = null;
    for (const candidate of CANDIDATES) {
      try {
        detector = await pipeline("object-detection", candidate.model, {
          dtype: candidate.dtype as any,
          progress_callback: (progress: any) => {
            if (progress.status === "progress" && typeof progress.progress === "number") {
              self.postMessage({ type: "progress", progress: Math.round(progress.progress) });
            }
          },
        });
        self.postMessage({ type: "ready", model: candidate.model });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("No detection model could be loaded");
  })().catch((error) => {
    loading = null;
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Model could not load" });
  });

  return loading;
}


self.onmessage = async (event: MessageEvent<{ type: "load" } | FrameMessage>) => {
  if (event.data.type === "load") {
    await loadModel();
    return;
  }

  const { bitmap, width, height, inputSize } = event.data;
  try {
    await loadModel();
    if (!detector) return;

    const scale = Math.min(1, inputSize / width);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    if (!canvas || canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas = new OffscreenCanvas(targetWidth, targetHeight);
    }
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Camera frame could not be prepared");
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const startedAt = performance.now();
    const image = RawImage.fromCanvas(canvas as any);
    const detections = await detector(image, { threshold: 0.5, percentage: false });
    self.postMessage({
      type: "result",
      detections,
      sourceWidth: width,
      sourceHeight: height,
      inputWidth: targetWidth,
      inputHeight: targetHeight,
      duration: performance.now() - startedAt,
    });
  } catch (error) {
    self.postMessage({ type: "frame-error", message: error instanceof Error ? error.message : "Detection failed" });
  } finally {
    bitmap.close();
  }
};