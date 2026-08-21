import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Camera Detection — Rekor/OS" },
      { name: "description", content: "Detect, track and recognise objects live from your camera, then capture stills or record the annotated feed." },
      { property: "og:title", content: "Live Camera Detection — Rekor/OS" },
      { property: "og:description", content: "Real-time object detection and tracking straight from your camera." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LivePage,
});

type Detection = {
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
  label: string;
  score: number;
};

const LABEL_COLORS: Record<string, string> = {
  person: "#22d3ee",
  car: "#FF5C00",
  truck: "#f59e0b",
  bus: "#f59e0b",
  motorcycle: "#a78bfa",
  bicycle: "#a78bfa",
  dog: "#34d399",
  cat: "#34d399",
};
const colorFor = (l: string) => LABEL_COLORS[l] ?? "#FF5C00";

function LivePage() {
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "error">("idle");
  const [modelProgress, setModelProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dets, setDets] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recUrl, setRecUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const detectorRef = useRef<any>(null);
  const rawImageRef = useRef<any>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const detsRef = useRef<Detection[]>([]);
  const targetsRef = useRef<Detection[]>([]);

  const busyRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(performance.now());
  const runningRef = useRef(false);

  const stopAll = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const start = useCallback(async () => {
    setError(null);
    setStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 960 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const { pipeline, env, RawImage } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      rawImageRef.current = RawImage;
      try {
        const threads = Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 4) - 1));
        (env.backends as any).onnx.wasm.numThreads = threads;
      } catch {
        /* ignore */
      }

      const supportsWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
      const load = (opts: any) =>
        pipeline("object-detection", "Xenova/yolos-tiny", {
          ...opts,
          progress_callback: (p: any) => {
            if (p.status === "progress" && typeof p.progress === "number") setModelProgress(Math.round(p.progress));
          },
        });
      try {
        detectorRef.current = supportsWebGPU
          ? await load({ device: "webgpu", dtype: "fp16" })
          : await load({ dtype: "q8" });
      } catch {
        detectorRef.current = await load({ dtype: "q8" });
      }

      setStatus("live");
      runningRef.current = true;
      renderLoop();
      inferLoop();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Could not start camera");
      setStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Composite loop: camera frame + boxes onto the visible canvas (also the recording source).
  const renderLoop = useCallback(() => {
    // Ease existing boxes toward the newest detections so motion looks smooth
    // between inference passes instead of jumping.
    const smooth = () => {
      const targets = targetsRef.current;
      const prev = detsRef.current;
      const used = new Set<number>();
      const next: Detection[] = targets.map((t) => {
        let bestIdx = -1;
        let bestDist = Infinity;
        prev.forEach((p, i) => {
          if (used.has(i) || p.label !== t.label) return;
          const d =
            Math.abs(p.box.xmin - t.box.xmin) +
            Math.abs(p.box.ymin - t.box.ymin) +
            Math.abs(p.box.xmax - t.box.xmax) +
            Math.abs(p.box.ymax - t.box.ymax);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        });
        const span = Math.max(1, t.box.xmax - t.box.xmin) * 3;
        if (bestIdx === -1 || bestDist > span) return t;
        used.add(bestIdx);
        const p = prev[bestIdx]!;
        const k = 0.35;
        const lerp = (a: number, b: number) => a + (b - a) * k;
        return {
          ...t,
          box: {
            xmin: lerp(p.box.xmin, t.box.xmin),
            ymin: lerp(p.box.ymin, t.box.ymin),
            xmax: lerp(p.box.xmax, t.box.xmax),
            ymax: lerp(p.box.ymax, t.box.ymax),
          },
        };
      });
      detsRef.current = next;
    };

    const draw = () => {
      if (!runningRef.current) return;
      smooth();
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.videoWidth) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          ctx.font = `${Math.max(12, Math.round(w / 60))}px ui-monospace, monospace`;
          ctx.textBaseline = "top";
          for (const d of detsRef.current) {
            const color = colorFor(d.label);
            const x = d.box.xmin;
            const y = d.box.ymin;
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(2, Math.round(w / 480));
            ctx.strokeRect(x, y, d.box.xmax - x, d.box.ymax - y);
            const text = `${d.label.toUpperCase()} · ${(d.score * 100).toFixed(1)}%`;
            const pad = 4;
            const tw = ctx.measureText(text).width + pad * 2;
            const th = parseInt(ctx.font, 10) + pad * 2;
            ctx.fillStyle = color;
            ctx.fillRect(x, Math.max(0, y - th), tw, th);
            ctx.fillStyle = "#0B0B0C";
            ctx.fillText(text, x + pad, Math.max(0, y - th) + pad);
          }
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const inferLoop = useCallback(async () => {
    while (runningRef.current) {
      const video = videoRef.current;
      const detector = detectorRef.current;
      const RawImage = rawImageRef.current;
      if (!video || !detector || !RawImage || !video.videoWidth || busyRef.current) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
      busyRef.current = true;
      try {
        // Reuse one offscreen canvas at a small size — no per-frame allocation, no data-URL encoding.
        let off = offRef.current;
        if (!off) {
          off = document.createElement("canvas");
          offRef.current = off;
        }
        const scale = Math.min(1, 320 / video.videoWidth);
        const ow = Math.round(video.videoWidth * scale);
        const oh = Math.round(video.videoHeight * scale);
        if (off.width !== ow || off.height !== oh) {
          off.width = ow;
          off.height = oh;
        }
        const octx = off.getContext("2d", { willReadFrequently: true })!;
        octx.drawImage(video, 0, 0, ow, oh);
        const image = RawImage.fromCanvas(off);
        const raw: Detection[] = await detector(image, { threshold: 0.4, percentage: false });
        const sx = video.videoWidth / ow;
        const sy = video.videoHeight / oh;
        const scaled = raw.map((d) => ({
          ...d,
          box: { xmin: d.box.xmin * sx, ymin: d.box.ymin * sy, xmax: d.box.xmax * sx, ymax: d.box.ymax * sy },
        }));
        targetsRef.current = scaled;
        setDets(scaled);
        const now = performance.now();
        const inst = 1000 / Math.max(1, now - lastRef.current);
        lastRef.current = now;
        setFps((prev) => (prev ? prev * 0.7 + inst * 0.3 : inst));
      } catch (e) {
        console.error(e);
      } finally {
        busyRef.current = false;
      }
      // Yield to the browser so the preview keeps painting at full frame rate.
      await new Promise((r) => requestAnimationFrame(() => r(null)));

    }
  }, []);

  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `rekor-os-capture-${Date.now()}.png`;
    a.click();
  };

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (recUrl) URL.revokeObjectURL(recUrl);
    setRecUrl(null);
    chunksRef.current = [];
    const stream = canvas.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecUrl(URL.createObjectURL(blob));
      setRecording(false);
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  };

  const counts = dets.reduce<Record<string, number>>((acc, d) => {
    acc[d.label] = (acc[d.label] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[color:var(--rkr-bg)] text-[color:var(--rkr-fg)]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="text-center">
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[color:var(--rkr-primary)]">
            Live camera
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold">
            Real-time detection &amp; tracking
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--rkr-muted)] max-w-xl mx-auto">
            Objects in the camera feed are detected, labelled and tracked live. Capture a still or record the annotated feed and save it.
          </p>
        </div>

        <div
          ref={wrapRef}
          className="relative mt-8 aspect-video bg-black rounded-lg border border-[color:var(--rkr-border)] overflow-hidden"
        >
          <video ref={videoRef} muted playsInline className="hidden" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain" />

          {status !== "live" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
              {status === "loading" ? (
                <>
                  <div className="size-10 rounded-full border-2 border-[color:var(--rkr-primary)] border-t-transparent animate-spin" />
                  <div className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
                    Starting camera · model {modelProgress}%
                  </div>
                </>
              ) : (
                <button
                  onClick={start}
                  className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] font-bold bg-[color:var(--rkr-primary)] text-black px-6 py-3 rounded hover:bg-[color:var(--rkr-fg)] transition-colors"
                >
                  ▶ Start live camera
                </button>
              )}
              {error && <div className="text-[12px] text-red-400 font-[family-name:var(--font-mono)]">{error}</div>}
            </div>
          )}

          {status === "live" && (
            <>
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none font-[family-name:var(--font-mono)] text-[10px]">
                <div className="flex gap-2 items-center bg-black/60 border border-white/10 rounded px-2 py-1 backdrop-blur">
                  <span className={`text-[color:var(--rkr-primary)] ${recording ? "animate-pulse" : ""}`}>●</span>
                  <span>{recording ? "RECORDING" : "LIVE"}</span>
                </div>
                <div className="flex gap-3 border border-white/10 bg-black/60 rounded px-3 py-1.5 backdrop-blur">
                  <div className="text-center">
                    <div className="text-[9px] text-[color:var(--rkr-muted)] leading-none">FPS</div>
                    <div className="text-xs">{fps ? fps.toFixed(1) : "—"}</div>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <div className="text-[9px] text-[color:var(--rkr-muted)] leading-none">OBJ</div>
                    <div className="text-xs">{dets.length}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => (document.fullscreenElement ? document.exitFullscreen?.() : wrapRef.current?.requestFullscreen?.())}
                aria-label="Toggle full size"
                className="absolute bottom-3 right-3 z-20 grid place-items-center size-9 rounded bg-black/70 border border-white/15 hover:bg-[color:var(--rkr-primary)] hover:text-black transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </svg>
              </button>
            </>
          )}
        </div>

        {status === "live" && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={capture}
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] font-bold bg-[color:var(--rkr-primary)] text-black px-5 py-3 rounded hover:bg-[color:var(--rkr-fg)] transition-colors"
            >
              ◉ Capture frame
            </button>
            {!recording ? (
              <button
                onClick={startRecording}
                className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] px-5 py-3 rounded border border-[color:var(--rkr-border)] hover:border-[color:var(--rkr-fg)] transition-colors"
              >
                ● Start recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] px-5 py-3 rounded border border-red-500/60 text-red-400 hover:border-red-400 transition-colors"
              >
                ■ Stop &amp; save
              </button>
            )}
            <button
              onClick={() => {
                stopAll();
                setStatus("idle");
                setDets([]);
                detsRef.current = [];
                targetsRef.current = [];

              }}
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] px-5 py-3 rounded border border-[color:var(--rkr-border)] hover:border-[color:var(--rkr-fg)] transition-colors"
            >
              ✕ Stop camera
            </button>
          </div>
        )}

        {Object.keys(counts).length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {Object.entries(counts).map(([label, n]) => (
              <div
                key={label}
                className="flex items-center gap-2 border border-[color:var(--rkr-border)] rounded px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest"
              >
                <span className="size-2 rounded-sm" style={{ background: colorFor(label) }} />
                {label}
                <span className="text-[color:var(--rkr-muted)]">· {n}</span>
              </div>
            ))}
          </div>
        )}

        {recUrl && (
          <div className="mt-8 text-center">
            <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.25em] text-[color:var(--rkr-muted)]">
              Saved recording
            </div>
            <video src={recUrl} controls className="mt-3 w-full rounded-lg border border-[color:var(--rkr-border)] bg-black" />
            <a
              href={recUrl}
              download={`rekor-os-live-${Date.now()}.webm`}
              className="inline-block mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] font-bold bg-[color:var(--rkr-primary)] text-black px-5 py-3 rounded hover:bg-[color:var(--rkr-fg)] transition-colors"
            >
              ↓ Download recording
            </a>
          </div>
        )}

        <p className="mt-8 text-center text-[12px] text-[color:var(--rkr-muted)] max-w-2xl mx-auto">
          Note: live detection is not 100% accurate. Only objects that are clearly visible to the camera can be
          recognised, and results depend on the model's training dataset, lighting and motion blur.
        </p>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[color:var(--rkr-muted)] hover:text-[color:var(--rkr-fg)] transition-colors"
          >
            ← Back to workspace
          </Link>
        </div>
      </div>
    </main>
  );
}

export default LivePage;
