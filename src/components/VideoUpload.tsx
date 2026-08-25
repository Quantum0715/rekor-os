import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { trackerStore } from "@/lib/tracker-store";

export function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Allow Launch / Start Tracking buttons anywhere on the page to open the picker.
  useEffect(() => {
    const openPicker = () => inputRef.current?.click();
    window.addEventListener("rkr:open-upload", openPicker);
    return () => window.removeEventListener("rkr:open-upload", openPicker);
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
  };

  return (
    <div className="relative">
      <div
        className="relative aspect-[4/3] bg-black rounded-lg border border-[color:var(--rkr-border)] overflow-hidden shadow-[0_30px_80px_-20px_rgba(255,92,0,0.25)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {!file && (
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

        {file && previewUrl && (
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

      {file && (
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