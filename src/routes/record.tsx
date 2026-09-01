import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { trackerStore } from "@/lib/tracker-store";

export const Route = createFileRoute("/record")({
  head: () => ({
    meta: [
      { title: "Record Live Video — Rekor/OS" },
      {
        name: "description",
        content: "Record a clip with your camera and send it straight into the Rekor/OS detection and tracking pipeline.",
      },
      { property: "og:title", content: "Record Live Video — Rekor/OS" },
      { property: "og:description", content: "Record a clip, then detect and track every object inside it." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecordPage,
});

function RecordPage() {
  const [phase, setPhase] = useState<"ready" | "recording" | "done">("ready");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<File | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const openCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: true,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not access camera");
    }
  }, []);

  useEffect(() => {
    openCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (clipUrl) URL.revokeObjectURL(clipUrl);
    };
  }, [clipUrl]);

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
    });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `live-recording-${Date.now()}.webm`, { type: "video/webm" });
      fileRef.current = file;
      setClipUrl(URL.createObjectURL(blob));
      stopCamera();
      setPhase("done");
    };
    recorderRef.current = rec;
    rec.start();
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setPhase("recording");
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const useClip = () => {
    if (!fileRef.current) return;
    trackerStore.setFile(fileRef.current);
    navigate({ to: "/track" });
  };

  const retake = async () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    setClipUrl(null);
    fileRef.current = null;
    setSeconds(0);
    setPhase("ready");
    await openCamera();
  };

  const btn =
    "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] px-5 py-3 rounded border border-[color:var(--rkr-border)] hover:border-[color:var(--rkr-fg)] transition-colors";
  const btnPrimary =
    "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] font-bold bg-[color:var(--rkr-primary)] text-black px-5 py-3 rounded hover:bg-[color:var(--rkr-fg)] transition-colors";

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-[color:var(--rkr-bg)] text-[color:var(--rkr-fg)]">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="text-center">
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-[color:var(--rkr-primary)]">
            Record &amp; upload
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl md:text-4xl font-extrabold">
            Record a live clip
          </h1>
          <p className="mt-2 text-[13px] text-[color:var(--rkr-muted)] max-w-xl mx-auto">
            Record with your camera, then send the clip into the detection and tracking pipeline just like an uploaded
            video.
          </p>
        </div>

        <div className="relative mt-8 aspect-video bg-black rounded-lg border border-[color:var(--rkr-border)] overflow-hidden">
          {phase === "done" && clipUrl ? (
            <video key={clipUrl} src={clipUrl} controls playsInline className="absolute inset-0 w-full h-full object-contain bg-black" />
          ) : (
            <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-contain bg-black" />
          )}

          <div className="absolute top-3 left-3 flex gap-2 items-center bg-black/60 border border-white/10 rounded px-2 py-1 backdrop-blur font-[family-name:var(--font-mono)] text-[10px]">
            <span className={`text-[color:var(--rkr-primary)] ${phase === "recording" ? "animate-pulse" : ""}`}>●</span>
            <span>
              {phase === "recording" ? `RECORDING · ${mmss}` : phase === "done" ? "CLIP READY" : "CAMERA READY"}
            </span>
          </div>

          {error && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-[12px] text-red-400 font-[family-name:var(--font-mono)]">
              {error}
            </div>
          )}
        </div>

        {!error && (
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {phase === "ready" && (
              <button onClick={startRecording} className={btnPrimary}>
                ● Start recording
              </button>
            )}
            {phase === "recording" && (
              <button
                onClick={stopRecording}
                className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] px-5 py-3 rounded border border-red-500/60 text-red-400 hover:border-red-400 transition-colors"
              >
                ■ Stop recording
              </button>
            )}
            {phase === "done" && (
              <>
                <button onClick={useClip} className={btnPrimary}>
                  ▶ Track / Detect
                </button>
                <button onClick={retake} className={btn}>
                  ↻ Record again
                </button>
              </>
            )}
            <Link to="/" onClick={stopCamera} className={btn}>
              ✕ Cancel
            </Link>
          </div>
        )}

        <p className="mt-8 text-center text-[12px] text-[color:var(--rkr-muted)] max-w-2xl mx-auto">
          Note: detection is not 100% accurate. Only objects clearly visible in the recording can be recognised, and
          results depend on the model's training dataset, lighting and motion blur.
        </p>
      </div>
    </main>
  );
}

