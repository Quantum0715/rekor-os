// Shared browser-side object detector built on YOLOv10 (COCO, 80 classes).
//
// YOLOv10 is NMS-free and considerably more accurate than the old YOLOS-tiny
// backbone (COCO mAP ~46 for the "s" variant vs ~29), while still being small
// enough to run in a phone browser. The model is loaded once per session and
// shared between the live camera page and the upload/track page.

export type Box = { xmin: number; ymin: number; xmax: number; ymax: number };
export type Detection = { box: Box; label: string; score: number };

export type DetectorBackend = "webgpu" | "wasm";

export type Detector = {
  backend: DetectorBackend;
  modelId: string;
  /** Source canvas edge (px) to draw before inference. YOLOv10 ONNX expects 640x640. */
  liveSize: number;
  offlineSize: number;
  detect(source: HTMLCanvasElement, opts?: { size?: number; threshold?: number }): Promise<Detection[]>;
};

type ProgressCb = (pct: number) => void;

let detectorPromise: Promise<Detector> | null = null;
const progressListeners = new Set<ProgressCb>();

function isLowEndDevice() {
  const nav = navigator as any;
  const mem = typeof nav.deviceMemory === "number" ? nav.deviceMemory : 8;
  const cores = navigator.hardwareConcurrency || 4;
  return mem <= 4 || cores <= 4;
}

async function hasUsableWebGPU() {
  try {
    const gpu = (navigator as any).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

async function build(): Promise<Detector> {
  const tf = await import("@huggingface/transformers");
  const { AutoModel, AutoProcessor, RawImage, env } = tf as any;
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  try {
    const threads = Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 4) - 1));
    env.backends.onnx.wasm.numThreads = threads;
    env.backends.onnx.wasm.proxy = false;
  } catch {
    /* ignore */
  }

  const report = (p: any) => {
    if (p?.status === "progress" && typeof p.progress === "number") {
      const pct = Math.round(p.progress);
      progressListeners.forEach((cb) => cb(pct));
    }
  };

  const webgpu = await hasUsableWebGPU();
  const lowEnd = isLowEndDevice();

  // Candidate configs, best first. Each falls back to the next on failure.
  const candidates: Array<{ id: string; opts: any; backend: DetectorBackend; live: number; offline: number }> = [];
  if (webgpu) {
    candidates.push({
      id: "onnx-community/yolov10s",
      opts: { device: "webgpu", dtype: "fp32" },
      backend: "webgpu",
      live: 640,
      offline: 640,
    });
    candidates.push({
      id: "onnx-community/yolov10n",
      opts: { device: "webgpu", dtype: "fp32" },
      backend: "webgpu",
      live: 640,
      offline: 640,
    });
  }
  candidates.push({
    id: "onnx-community/yolov10n",
    opts: { device: "wasm", dtype: lowEnd ? "q8" : "fp32" },
    backend: "wasm",
    live: 640,
    offline: 640,
  });
  candidates.push({
    id: "onnx-community/yolov10n",
    opts: { device: "wasm", dtype: "q8" },
    backend: "wasm",
    live: 640,
    offline: 640,
  });

  let lastErr: unknown = null;
  for (const c of candidates) {
    try {
      const model = await AutoModel.from_pretrained(c.id, { ...c.opts, progress_callback: report });
      const processor = await AutoProcessor.from_pretrained(c.id);
      const id2label: Record<string, string> = model.config?.id2label ?? {};

      // Warm-up pass so the first real frame doesn't pay shader/kernel compile cost.
      try {
        const warm = document.createElement("canvas");
        warm.width = warm.height = 640;
        const img = RawImage.fromCanvas(warm);
        const { pixel_values } = await processor(img);
        await model({ images: pixel_values });
      } catch {
        /* warm-up is best effort */
      }

      const detect: Detector["detect"] = async (source, opts) => {
        const threshold = opts?.threshold ?? 0.45;
        const image = RawImage.fromCanvas(source);
        const { pixel_values, reshaped_input_sizes } = await processor(image);
        const out = await model({ images: pixel_values });
        const tensor = out.output0 ?? (Object.values(out)[0] as any);
        const data: Float32Array = tensor.data;
        const [rh, rw] = reshaped_input_sizes[0] as [number, number];
        const sx = image.width / rw;
        const sy = image.height / rh;
        const dets: Detection[] = [];
        for (let i = 0; i + 5 < data.length; i += 6) {
          const score = data[i + 4];
          if (score < threshold) continue;
          const cls = Math.round(data[i + 5]);
          const label = id2label[String(cls)] ?? `class_${cls}`;
          const xmin = Math.max(0, data[i] * sx);
          const ymin = Math.max(0, data[i + 1] * sy);
          const xmax = Math.min(image.width, data[i + 2] * sx);
          const ymax = Math.min(image.height, data[i + 3] * sy);
          if (xmax - xmin < 4 || ymax - ymin < 4) continue;
          dets.push({ box: { xmin, ymin, xmax, ymax }, label, score });
        }
        return dets;
      };

      return { backend: c.backend, modelId: c.id, liveSize: c.live, offlineSize: c.offline, detect };
    } catch (e) {
      console.warn(`[detector] ${c.id} (${c.opts.device}/${c.opts.dtype}) failed, trying next`, e);
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not load detection model");
}

/** Load (or reuse) the shared detector. Progress is reported 0–100 while downloading. */
export function loadDetector(onProgress?: ProgressCb): Promise<Detector> {
  if (onProgress) progressListeners.add(onProgress);
  if (!detectorPromise) {
    detectorPromise = build().catch((e) => {
      detectorPromise = null;
      throw e;
    });
  }
  return detectorPromise.finally(() => {
    if (onProgress) progressListeners.delete(onProgress);
  });
}

/** Kick off the model download in the background (e.g. from the landing page). */
export function preloadDetector() {
  if (typeof window === "undefined") return;
  const run = () => loadDetector().catch(() => {});
  if ("requestIdleCallback" in window) (window as any).requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}
