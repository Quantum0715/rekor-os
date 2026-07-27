import { useEffect, useRef, useState, useCallback } from "react";

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

function colorFor(label: string) {
  return LABEL_COLORS[label] ?? "#FF5C00";
}

export function VideoTracker() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading-model" | "ready" | "running" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastTimeRef = useRef(performance.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const loadModel = useCallback(async () => {
    if (detectorRef.current) return detectorRef.current;
    setStatus("loading-model");
    setProgress(0);
    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      const det = await pipeline("object-detection", "Xenova/yolos-tiny", {
        progress_callback: (p: any) => {
          if (p.status === "progress" && typeof p.progress === "number") {
            setProgress(Math.round(p.progress));
          }
        },
      });
      detectorRef.current = det;
      setStatus("ready");
      return det;
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to load model");
      setStatus("error");
      throw e;
    }
  }, []);

  const drawFrame = useCallback((dets: Detection[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${Math.max(12, Math.round(w / 60))}px ui-monospace, monospace`;
    ctx.textBaseline = "top";
    for (const d of dets) {
      const color = colorFor(d.label);
      const x = d.box.xmin;
      const y = d.box.ymin;
      const bw = d.box.xmax - d.box.xmin;
      const bh = d.box.ymax - d.box.ymin;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, Math.round(w / 480));
      ctx.strokeRect(x, y, bw, bh);
      const text = `${d.label.toUpperCase()} · ${(d.score * 100).toFixed(1)}%`;
      const pad = 4;
      const tw = ctx.measureText(text).width + pad * 2;
      const th = parseInt(ctx.font, 10) + pad * 2;
      ctx.fillStyle = color;
      ctx.fillRect(x, Math.max(0, y - th), tw, th);
      ctx.fillStyle = "#0B0B0C";
      ctx.fillText(text, x + pad, Math.max(0, y - th) + pad);
    }
  }, []);

  const loop = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector) return;

    if (!video.paused && !video.ended && !busyRef.current && video.readyState >= 2) {
      busyRef.current = true;
      try {
        const off = document.createElement("canvas");
        const scale = Math.min(1, 480 / Math.max(video.videoWidth, 1));
        off.width = Math.round(video.videoWidth * scale);
        off.height = Math.round(video.videoHeight * scale);
        const octx = off.getContext("2d");
        if (octx) {
          octx.drawImage(video, 0, 0, off.width, off.height);
          const url = off.toDataURL("image/jpeg", 0.7);
          const raw: Detection[] = await detector(url, { threshold: 0.35, percentage: false });
          const sx = video.videoWidth / off.width;
          const sy = video.videoHeight / off.height;
          const scaled = raw.map((d) => ({
            ...d,
            box: {
              xmin: d.box.xmin * sx,
              ymin: d.box.ymin * sy,
              xmax: d.box.xmax * sx,
              ymax: d.box.ymax * sy,
            },
          }));
          setDetections(scaled);
          drawFrame(scaled);
          const now = performance.now();
          const dt = now - lastTimeRef.current;
          lastTimeRef.current = now;
          setFps(1000 / dt);
        }
      } catch (e) {
        console.error(e);
      } finally {
        busyRef.current = false;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [drawFrame]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setDetections([]);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      try {
        await loadModel();
        setStatus("running");
      } catch {
        /* handled */
      }
    },
    [loadModel, videoUrl],
  );

  useEffect(() => {
    if (status !== "running") return;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, loop]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("video/")) handleFile(f);
  };

  const counts = detections.reduce<Record<string, number>>((acc, d) => {
    acc[d.label] = (acc[d.label] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative">
      <div
        className="relative aspect-[4/3] bg-black rounded-lg border border-[color:var(--rkr-border)] overflow-hidden shadow-[0_30px_80px_-20px_rgba(255,92,0,0.25)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {!videoUrl && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-3 rounded-md border-2 border-dashed border-[color:var(--rkr-primary)]/60 hover:border-[color:var(--rkr-primary)] transition-colors flex flex-col items-center justify-center gap-4 group"
          >
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-[color:var(--rkr-primary)] group-hover:scale-110 transition-transform">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-center px-6">
              <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[color:var(--rkr-fg)]">
                Upload Video
              </div>
              <div className="mt-1.5 text-[13px] text-[color:var(--rkr-muted)]">
                Click to upload or drag &amp; drop
              </div>
            </div>
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest bg-[color:var(--rkr-primary)] text-black px-4 py-2 rounded font-bold">
              Choose Video →
            </span>
            <div className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
              MP4 · MOV · WEBM · Max 500MB
            </div>
          </button>
        )}

        {videoUrl && (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
              onLoadedData={() => {
                if (detectorRef.current) setStatus("running");
              }}
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--rkr-fg)]">
              <div className="flex gap-2 items-center bg-black/60 border border-white/10 rounded px-2 py-1 backdrop-blur">
                <span className="text-[color:var(--rkr-primary)] animate-pulse">●</span>
                <span>{status === "loading-model" ? `LOAD ${progress}%` : status === "running" ? "LIVE" : "READY"}</span>
              </div>
              <div className="flex gap-3 border border-white/10 bg-black/60 rounded px-3 py-1.5 backdrop-blur">
                <div className="text-center">
                  <div className="text-[9px] text-[color:var(--rkr-muted)] leading-none">FPS</div>
                  <div className="text-xs">{fps ? fps.toFixed(1) : "—"}</div>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-[9px] text-[color:var(--rkr-muted)] leading-none">OBJ</div>
                  <div className="text-xs">{detections.length}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setVideoUrl(null);
                setDetections([]);
                setStatus(detectorRef.current ? "ready" : "idle");
              }}
              className="absolute bottom-3 right-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest bg-black/70 text-white border border-white/15 px-2.5 py-1.5 rounded hover:bg-[color:var(--rkr-primary)] hover:text-black transition-colors"
            >
              ✕ New Video
            </button>
          </>
        )}

        {status === "loading-model" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div className="h-full bg-[color:var(--rkr-primary)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {videoUrl && Object.keys(counts).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(counts).map(([label, n]) => (
            <div
              key={label}
              className="flex items-center gap-2 border border-[color:var(--rkr-border)] rounded px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[color:var(--rkr-fg)]"
            >
              <span className="size-2 rounded-sm" style={{ background: colorFor(label) }} />
              {label}
              <span className="text-[color:var(--rkr-muted)]">· {n}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3 text-[12px] text-red-400 font-[family-name:var(--font-mono)]">{error}</div>
      )}
    </div>
  );
}

export default VideoTracker;