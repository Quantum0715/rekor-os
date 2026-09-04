import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackerStore } from "@/lib/tracker-store";
import { loadDetector } from "@/lib/detector";
import { Tracker, type TrackedDetection } from "@/lib/tracker";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Tracking Workspace — Rekor/OS" },
      { name: "description", content: "Process video, review original and tracked output side-by-side, and export detections as JSON." },
      { property: "og:title", content: "Tracking Workspace — Rekor/OS" },
      { property: "og:description", content: "Side-by-side original and tracked video output with export." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

type Detection = TrackedDetection;

type FrameResult = { t: number; dets: Detection[] };

/** Boxes for time `t`, linearly interpolated between the two nearest sampled frames by track ID. */
function detectionsAt(results: FrameResult[], t: number): Detection[] {
  if (results.length === 0) return [];
  if (t <= results[0].t) return results[0].dets;
  const last = results[results.length - 1];
  if (t >= last.t) return last.dets;
  let lo = 0;
  let hi = results.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (results[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = results[lo];
  const b = results[hi];
  const span = b.t - a.t || 1;
  const k = Math.min(1, Math.max(0, (t - a.t) / span));
  const next = new Map(b.dets.map((d) => [d.id, d]));
  const out: Detection[] = [];
  for (const d of a.dets) {
    const n = next.get(d.id);
    if (!n) {
      if (k < 0.5) out.push(d);
      continue;
    }
    out.push({
      ...d,
      box: {
        xmin: d.box.xmin + (n.box.xmin - d.box.xmin) * k,
        ymin: d.box.ymin + (n.box.ymin - d.box.ymin) * k,
        xmax: d.box.xmax + (n.box.xmax - d.box.xmax) * k,
        ymax: d.box.ymax + (n.box.ymax - d.box.ymax) * k,
      },
    });
    next.delete(d.id);
  }
  if (k >= 0.5) next.forEach((d) => out.push(d));
  return out;
}

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

function toggleFullscreen(el: HTMLElement | null) {
  if (!el) return;
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else {
    el.requestFullscreen?.();
  }
}

const STAGES = [
  { key: "load", label: "Loading model" },
  { key: "analyze", label: "Analyzing frames" },
  { key: "frame", label: "Framing detections" },
  { key: "done", label: "Tracking successful" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];

function TrackPage() {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("clip.mp4");
  const [stage, setStage] = useState<StageKey>("load");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FrameResult[] | null>(null);
  const [recording, setRecording] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const originalRef = useRef<HTMLVideoElement>(null);
  const trackedRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const originalWrapRef = useRef<HTMLDivElement>(null);
  const trackedWrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Read the uploaded file. If missing (direct nav), redirect home.
  useEffect(() => {
    const f = trackerStore.getFile();
    if (!f) {
      navigate({ to: "/" });
      return;
    }
    setFileName(f.name);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [navigate]);

  // Run the processing pipeline once video metadata is available on a hidden element.
  useEffect(() => {
    if (!videoUrl) return;
    let cancelled = false;

    (async () => {
      try {
        // Stage 1: load model
        setStage("load");
        setProgress(0);
        const detector = await loadDetector((pct) => {
          if (!cancelled) setProgress(pct);
        });
        if (cancelled) return;

        // Stage 2: analyze frames — sample by seeking through hidden <video>.
        setStage("analyze");
        setProgress(0);

        const vid = document.createElement("video");
        vid.src = videoUrl;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "auto";
        vid.crossOrigin = "anonymous";
        await new Promise<void>((res, rej) => {
          vid.onloadedmetadata = () => res();
          vid.onerror = () => rej(new Error("Could not read video"));
        });

        const duration = isFinite(vid.duration) ? vid.duration : 0;
        // Sample densely on fast hardware, sparser on slow — capped so long
        // clips never take minutes. Boxes are interpolated between samples.
        const baseStep = detector.backend === "webgpu" ? 0.2 : 0.5;
        const maxFrames = detector.backend === "webgpu" ? 240 : 60;
        const step = Math.max(baseStep, duration / maxFrames);
        const times: number[] = [];
        for (let t = 0; t < Math.max(duration, step); t += step) times.push(t);
        if (times.length === 0) times.push(0);

        const off = document.createElement("canvas");
        const vw = vid.videoWidth || 640;
        const vh = vid.videoHeight || 480;
        const scale = Math.min(1, detector.offlineSize / Math.max(vw, vh));
        off.width = Math.max(1, Math.round(vw * scale));
        off.height = Math.max(1, Math.round(vh * scale));
        const octx = off.getContext("2d", { willReadFrequently: true })!;
        const sx = vw / off.width;
        const sy = vh / off.height;

        const tracker = new Tracker({ minHits: 1, maxMisses: 2, alpha: 1, iouThreshold: 0.25 });
        const frames: FrameResult[] = [];
        for (let i = 0; i < times.length; i++) {
          if (cancelled) return;
          const t = times[i];
          await new Promise<void>((res) => {
            const onSeek = () => {
              vid.removeEventListener("seeked", onSeek);
              res();
            };
            vid.addEventListener("seeked", onSeek);
            try {
              vid.currentTime = Math.min(t, Math.max(duration - 0.05, 0));
            } catch {
              res();
            }
          });
          octx.drawImage(vid, 0, 0, off.width, off.height);
          const raw = await detector.detect(off, { size: detector.offlineSize, threshold: 0.4 });
          const scaled = raw.map((d) => ({
            ...d,
            box: { xmin: d.box.xmin * sx, ymin: d.box.ymin * sy, xmax: d.box.xmax * sx, ymax: d.box.ymax * sy },
          }));
          frames.push({ t, dets: tracker.update(scaled) });
          setProgress(Math.round(((i + 1) / times.length) * 100));
          // Let the UI repaint between frames so progress rings stay smooth.
          if (i % 3 === 0) await new Promise((r) => requestAnimationFrame(() => r(null)));
        }
        if (cancelled) return;

        // Stage 3: framing
        setStage("frame");
        setProgress(0);
        for (let p = 0; p <= 100; p += 10) {
          if (cancelled) return;
          setProgress(p);
          await new Promise((r) => setTimeout(r, 60));
        }

        // Stage 4: tracking successful
        setResults(frames);
        setStage("done");
        setProgress(0);
        for (let p = 0; p <= 100; p += 20) {
          if (cancelled) return;
          setProgress(p);
          await new Promise((r) => setTimeout(r, 70));
        }
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;
        setShowReview(true);
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? "Processing failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  // Overlay: draw the nearest cached detections onto canvas as tracked video plays.
  useEffect(() => {
    if (!showReview || !results) return;
    const video = trackedRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;

    const draw = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const dets = detectionsAt(results, video.currentTime);

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
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showReview, results]);

  const counts = useMemo(() => {
    if (!results) return {};
    const c: Record<string, number> = {};
    for (const f of results) {
      for (const d of f.dets) c[d.label] = (c[d.label] ?? 0) + 1;
    }
    return c;
  }, [results]);

  const downloadJson = () => {
    if (!results) return;
    const payload = {
      file: fileName,
      generatedAt: new Date().toISOString(),
      frameCount: results.length,
      frames: results,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}_tracks.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTrackedVideo = async () => {
    const video = trackedRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas || !results) return;

    // Composite video + overlay into a recording canvas
    const rec = document.createElement("canvas");
    rec.width = video.videoWidth;
    rec.height = video.videoHeight;
    const rctx = rec.getContext("2d")!;

    setRecording(true);
    video.pause();
    video.currentTime = 0;
    await new Promise((r) => setTimeout(r, 120));

    const stream = rec.captureStream(30);
    // Try to include audio from the video element
    try {
      const vStream = (video as any).captureStream?.();
      vStream?.getAudioTracks().forEach((tr: MediaStreamTrack) => stream.addTrack(tr));
    } catch {
      /* ignore */
    }

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    const drawRec = () => {
      rctx.drawImage(video, 0, 0, rec.width, rec.height);
      rctx.drawImage(canvas, 0, 0, rec.width, rec.height);
    };
    let rafId: number;
    const tick = () => {
      drawRec();
      rafId = requestAnimationFrame(tick);
    };

    recorder.start();
    tick();
    await video.play();

    await new Promise<void>((res) => {
      video.onended = () => res();
    });

    cancelAnimationFrame(rafId!);
    recorder.stop();
    await new Promise<void>((res) => {
      recorder.onstop = () => res();
    });

    const blob = new Blob(chunks, { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}_tracked.webm`;
    a.click();
    URL.revokeObjectURL(url);
    setRecording(false);
  };

  const currentStageIdx = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="min-h-screen bg-[color:var(--rkr-bg)] text-[color:var(--rkr-fg)] font-[family-name:var(--font-sans)]">
      {/* Top bar */}
      <div className="sticky top-0 z-50 h-14 border-b border-[color:var(--rkr-border)] bg-[color:var(--rkr-bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-widest text-[color:var(--rkr-muted)] hover:text-[color:var(--rkr-fg)] transition-colors"
            >
              ← Back
            </Link>
            <span className="text-[color:var(--rkr-border)]">/</span>
            <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-widest text-[color:var(--rkr-fg)]">
              Tracking Workspace
            </span>
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--rkr-muted)] truncate max-w-[50%]">
            {fileName}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1360px] px-5 py-10">
        {/* Processing panel */}
        {!showReview && (
          <div className="border border-[color:var(--rkr-border)] rounded-lg p-8 bg-[color:var(--rkr-surface)]/40 text-center">
            <div className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--rkr-primary)]">
              Processing
            </div>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight tracking-tight font-extrabold">
              {error
                ? "Processing failed"
                : stage === "load"
                  ? "Loading detection model…"
                  : stage === "analyze"
                    ? "Analyzing every frame…"
                    : stage === "frame"
                      ? "Framing tracked objects…"
                      : "Tracking successful."}
            </h1>
            <p className="mt-3 text-[14px] text-[color:var(--rkr-muted)] max-w-2xl mx-auto">
              {error
                ? error
                : "The video is being processed frame by frame. The YOLO detector identifies every visible object and caches the bounding boxes for smooth playback."}
            </p>

            {/* Stage circles */}
            <div className="mt-10 flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
              {STAGES.map((s, i) => {
                const allDone = stage === "done" && progress >= 100;
                const done = allDone || i < currentStageIdx;
                const active = !allDone && i === currentStageIdx;
                return (
                  <div key={s.key} className="flex flex-col items-center text-center w-[128px]">
                    <div
                      className={`relative grid size-14 place-items-center rounded-full border-2 transition-colors ${
                        done
                          ? "border-emerald-500 bg-emerald-500/10"
                          : active
                            ? "border-[color:var(--rkr-primary)] bg-[color:var(--rkr-primary)]/10"
                            : "border-[color:var(--rkr-border)] bg-transparent"
                      }`}
                    >
                      {active && !error && (
                        <span className="absolute inset-0 rounded-full border-2 border-[color:var(--rkr-primary)]/40 animate-ping" />
                      )}
                      {done ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M5 12.5l4.5 4.5L19 7.5"
                            stroke="#10b981"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <span
                          className={`font-[family-name:var(--font-mono)] text-[11px] tracking-widest ${
                            active ? "text-[color:var(--rkr-primary)]" : "text-[color:var(--rkr-muted)]"
                          }`}
                        >
                          {active && !error ? `${progress}%` : `0${i + 1}`}
                        </span>
                      )}
                    </div>
                    <div
                      className={`mt-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] leading-snug ${
                        done || active ? "text-[color:var(--rkr-fg)]" : "text-[color:var(--rkr-muted)]"
                      }`}
                    >
                      {s.label}
                    </div>
                    <div className="mt-1.5 h-4 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.22em]">
                      {done ? (
                        <span className="text-emerald-400">Done</span>
                      ) : active && !error ? (
                        <span className="text-[color:var(--rkr-primary)]">Running</span>
                      ) : (
                        <span className="text-[color:var(--rkr-muted)]/60">Waiting</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!error && (
              <div className="mt-6 h-1 rounded bg-white/5 overflow-hidden max-w-2xl mx-auto">
                <div
                  className="h-full bg-[color:var(--rkr-primary)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Dual video review */}
        {showReview && videoUrl && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--rkr-primary)]">
                  Review
                </div>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-tight">
                  Tracking successful.
                </h1>
                <p className="mt-2 text-[13.5px] text-[color:var(--rkr-muted)]">
                  {results?.length ?? 0} frames sampled · {Object.values(counts).reduce((a, b) => a + b, 0)} total detections
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={downloadTrackedVideo}
                  disabled={recording}
                  className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] font-bold bg-[color:var(--rkr-primary)] text-black px-4 py-2.5 rounded hover:bg-[color:var(--rkr-fg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recording ? "⏺ Recording…" : "↓ Download Video"}
                </button>
                <button
                  onClick={downloadJson}
                  className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] bg-transparent text-[color:var(--rkr-fg)] px-4 py-2.5 rounded border border-[color:var(--rkr-border)] hover:border-[color:var(--rkr-fg)] transition-colors"
                >
                  ↓ Download JSON
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Original */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
                    01 · Original
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
                    Source clip
                  </span>
                </div>
                <div
                  ref={originalWrapRef}
                  className="relative aspect-video bg-black rounded-lg overflow-hidden border border-[color:var(--rkr-border)]"
                >
                  <video
                    ref={originalRef}
                    src={videoUrl}
                    controls
                    controlsList="nofullscreen"
                    disablePictureInPicture
                    playsInline
                    onPlay={() => trackedRef.current?.pause()}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => toggleFullscreen(originalWrapRef.current)}
                    aria-label="Fullscreen original video"
                    title="Full size"
                    className="absolute bottom-1 right-1 z-20 grid size-9 place-items-center rounded bg-black/85 text-white hover:text-[color:var(--rkr-primary)] transition-colors sm:size-10"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--rkr-muted)]">
                  Note: this is the untouched source clip — no detection is applied here. It is kept
                  for side-by-side comparison only.
                </p>
              </div>

              {/* Tracked */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[color:var(--rkr-primary)]">
                    02 · Tracked
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
                    With bounding boxes
                  </span>
                </div>
                <div
                  ref={trackedWrapRef}
                  className="relative aspect-video bg-black rounded-lg overflow-hidden border border-[color:var(--rkr-primary)]/40 shadow-[0_20px_60px_-20px_rgba(255,92,0,0.35)]"
                >
                  <video
                    ref={trackedRef}
                    src={videoUrl}
                    controls
                    controlsList="nofullscreen"
                    disablePictureInPicture
                    playsInline
                    crossOrigin="anonymous"
                    onPlay={() => originalRef.current?.pause()}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                  <canvas
                    ref={overlayRef}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleFullscreen(trackedWrapRef.current)}
                    aria-label="Fullscreen tracked video"
                    title="Full size"
                    className="absolute bottom-1 right-1 z-20 grid size-9 place-items-center rounded bg-black/85 text-white hover:text-[color:var(--rkr-primary)] transition-colors sm:size-10"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--rkr-muted)]">
                  Note: boxes and labels are model predictions, not ground truth. Detection is only
                  possible for objects clearly visible in the frame — accuracy depends on the
                  model's training dataset, so this output is not 100% accurate.
                </p>
              </div>
            </div>

            {/* Detection summary */}
            {Object.keys(counts).length > 0 && (
              <div className="mt-8 border border-[color:var(--rkr-border)] rounded-lg p-5 bg-[color:var(--rkr-surface)]/40">
                <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[color:var(--rkr-muted)] mb-3">
                  Detected classes
                </div>
                <div className="flex flex-wrap gap-2">
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
              </div>
            )}

            {/* Accuracy disclaimer */}
            <div className="mt-6 border border-[color:var(--rkr-border)] rounded-lg p-5 bg-[color:var(--rkr-surface)]/40 text-center">
              <div className="flex items-center justify-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--rkr-primary)]">
                <span className="size-2 bg-[color:var(--rkr-primary)]" />
                Accuracy note
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--rkr-muted)] max-w-3xl mx-auto">
                These results are not 100% accurate. The model can only detect and track objects
                that are clearly visible in the frame — blurred, tiny, heavily occluded or
                fast-moving objects may be missed or mislabelled. Detection quality depends
                entirely on the dataset the model was trained on: the larger and more varied the
                training data, the sharper the output. Every box and label here should be read as a
                confidence-scored prediction, not as ground truth.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}