import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { trackerStore } from "@/lib/tracker-store";
import { preloadDetector } from "@/lib/detector";

type Mode = "choose" | "upload" | "live-choose";

export function VideoUpload() {
  const [mode, setMode] = useState<Mode>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Launch / Start Tracking buttons anywhere on the page reopen this card's chooser.
  useEffect(() => {
    const open = () => {
      setMode("choose");
      document.getElementById("rkr-upload-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("rkr:open-upload", open);
    return () => window.removeEventListener("rkr:open-upload", open);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = useCallback(
    (f: File) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setMode("upload");
      // Start fetching the detection model while the user previews the clip,
      // so pressing Track/Detect doesn't wait on a cold download.
      preloadDetector();
    },
    [previewUrl],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("video/")) handleFile(f);
  };

  const startTracking = () => {
    if (!file) return;
    trackerStore.setFile(file);
    navigate({ to: "/track" });
  };

  const cancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
    setMode("choose");
  };

  const tile =
    "flex flex-col items-center justify-center gap-3 rounded-md border border-[color:var(--rkr-border)] hover:border-[color:var(--rkr-primary)] bg-white/[0.02] hover:bg-[color:var(--rkr-primary)]/5 transition-colors px-6 py-8 text-center group";

  return (
    <div className="relative" id="rkr-upload-card">
      <div
        className="relative aspect-[4/3] bg-black rounded-lg border border-[color:var(--rkr-border)] overflow-hidden shadow-[0_30px_80px_-20px_rgba(255,92,0,0.25)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {mode === "choose" && (
          <div className="absolute inset-3 flex flex-col justify-center gap-3">
            <div className="text-center">
              <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[color:var(--rkr-fg)]">
                Start a session
              </div>
              <div className="mt-1 text-[13px] text-[color:var(--rkr-muted)]">
                Choose how you want to detect &amp; track objects
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { preloadDetector(); setMode("live-choose"); }} className={tile}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-[color:var(--rkr-primary)] group-hover:scale-110 transition-transform">
                  <path d="M15 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3.5l6 3.5V7z" />
                </svg>
                <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest font-bold text-[color:var(--rkr-fg)]">
                  Start live video detection
                </div>
                <div className="text-[11px] text-[color:var(--rkr-muted)]">Use your camera in real time</div>
              </button>
              <button type="button" onClick={() => inputRef.current?.click()} className={tile}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--rkr-primary)] group-hover:scale-110 transition-transform">
                  <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest font-bold text-[color:var(--rkr-fg)]">
                  Upload video
                </div>
                <div className="text-[11px] text-[color:var(--rkr-muted)]">MP4 · MOV · WEBM · Max 500MB</div>
              </button>
            </div>
          </div>
        )}

        {mode === "live-choose" && (
          <div className="absolute inset-3 flex flex-col justify-center gap-3">
            <div className="text-center">
              <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[color:var(--rkr-fg)]">
                Live video detection
              </div>
              <div className="mt-1 text-[13px] text-[color:var(--rkr-muted)]">Pick a live mode</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => navigate({ to: "/live" })} className={tile}>
                <span className="text-2xl text-[color:var(--rkr-primary)]">◉</span>
                <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest font-bold text-[color:var(--rkr-fg)]">
                  Start live camera
                </div>
                <div className="text-[11px] text-[color:var(--rkr-muted)]">
                  Detect live, capture stills or record the tracked feed
                </div>
              </button>
              <button type="button" onClick={() => navigate({ to: "/record" })} className={tile}>
                <span className="text-2xl text-[color:var(--rkr-primary)]">●</span>
                <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest font-bold text-[color:var(--rkr-fg)]">
                  Record live video &amp; upload
                </div>
                <div className="text-[11px] text-[color:var(--rkr-muted)]">
                  Record a clip, then process it like an upload
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="mx-auto font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[color:var(--rkr-muted)] hover:text-[color:var(--rkr-fg)] transition-colors"
            >
              ← Back
            </button>
          </div>
        )}

        {mode === "upload" && file && previewUrl && (
          <>
            <video
              key={previewUrl}
              src={previewUrl}
              controls
              playsInline
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--rkr-fg)]">
              <div className="flex gap-2 items-center bg-black/60 border border-white/10 rounded px-2 py-1 backdrop-blur">
                <span className="text-[color:var(--rkr-primary)]">●</span>
                <span>READY</span>
              </div>
              <div className="bg-black/60 border border-white/10 rounded px-2 py-1 backdrop-blur max-w-[60%] truncate">
                {file.name}
              </div>
            </div>
          </>
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

      {mode === "upload" && file && (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={startTracking}
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] font-bold bg-[color:var(--rkr-primary)] text-black px-5 py-3 rounded hover:bg-[color:var(--rkr-fg)] transition-colors"
          >
            ▶ Track / Detect
          </button>
          <button
            onClick={cancel}
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] bg-transparent text-[color:var(--rkr-fg)] px-5 py-3 rounded border border-[color:var(--rkr-border)] hover:border-[color:var(--rkr-fg)] transition-colors"
          >
            ✕ Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoUpload;
