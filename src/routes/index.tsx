import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const VideoUpload = lazy(() => import("@/components/VideoUpload"));

function openUpload() {
  const target = document.getElementById("hero");
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  // small delay lets the scroll happen before triggering the picker
  setTimeout(() => window.dispatchEvent(new Event("rkr:open-upload")), 250);
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="1" y="1" width="20" height="20" rx="3" fill="#FF5C00" />
        <rect x="1" y="1" width="20" height="20" rx="3" stroke="#FF5C00" strokeOpacity=".2" />
        <path d="M11 4v3M11 15v3M4 11h3M15 11h3" stroke="#0B0B0C" strokeWidth="1.4" strokeLinecap="square" />
        <rect x="8" y="8" width="6" height="6" stroke="#0B0B0C" strokeWidth="1.4" />
        <circle cx="11" cy="11" r="1" fill="#0B0B0C" />
      </svg>
      <span className="font-[family-name:var(--font-display)] text-[13px] tracking-tight uppercase font-extrabold text-[color:var(--rkr-fg)]">
        Rekor<span className="text-[color:var(--rkr-primary)]">/OS</span>
      </span>
    </div>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-[color:var(--rkr-border)] bg-[color:var(--rkr-bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden md:flex gap-5 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--rkr-muted)]">
            <a href="#tools" className="hover:text-[color:var(--rkr-fg)] transition-colors">Tools</a>
            <a href="#flow" className="hover:text-[color:var(--rkr-fg)] transition-colors">Pipeline</a>
            <a href="#advantages" className="hover:text-[color:var(--rkr-fg)] transition-colors">Advantages</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--rkr-muted)] border border-[color:var(--rkr-border)] rounded px-2 py-1">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM_READY
          </div>
          <button
            onClick={openUpload}
            className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-widest bg-[color:var(--rkr-fg)] text-black px-3.5 py-2 rounded hover:bg-[color:var(--rkr-primary)] transition-colors font-bold"
          >
            Launch
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section id="hero" className="relative border-b border-[color:var(--rkr-border)] overflow-hidden">
      {/* grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="relative mx-auto max-w-[1360px] px-5 pt-20 pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--rkr-muted)] border border-[color:var(--rkr-border)] rounded-full px-3 py-1">
            <span className="size-1.5 rounded-full bg-[color:var(--rkr-primary)]" />
            v1.0 · Computer Vision Workspace
          </div>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.98] tracking-[-0.03em] font-extrabold text-[color:var(--rkr-fg)]">
            Track every object.<br />
            <span className="text-[color:var(--rkr-muted)]">Across every</span>{" "}
            <span className="relative inline-block">
              frame.
              <span className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-[color:var(--rkr-primary)]" />
            </span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-[color:var(--rkr-muted)]">
            Rekor/OS is a forensic-grade workspace for multi-object detection, tracking, and
            trajectory analysis in video. Upload footage, run AI inference, and study every
            track ID like an analyst at a light table.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={openUpload}
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] font-bold bg-[color:var(--rkr-primary)] text-black px-5 py-3 rounded hover:bg-[color:var(--rkr-fg)] transition-colors"
            >
              Start Tracking →
            </button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {[
              ["24ms", "Inference"],
              ["98.4%", "mAP@0.5"],
              ["80+", "Object classes"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-[color:var(--rkr-fg)]">
                  {n}
                </div>
                <div className="mt-1 font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <ClientTracker />
      </div>
    </section>
  );
}

function ClientTracker() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="relative aspect-[4/3] bg-black rounded-lg border border-[color:var(--rkr-border)] overflow-hidden shadow-[0_30px_80px_-20px_rgba(255,92,0,0.25)]" />
    );
  }
  return (
    <Suspense
      fallback={
        <div className="relative aspect-[4/3] bg-black rounded-lg border border-[color:var(--rkr-border)] overflow-hidden shadow-[0_30px_80px_-20px_rgba(255,92,0,0.25)] grid place-items-center">
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
            Loading tracker…
          </span>
        </div>
      }
    >
      <VideoUpload />
    </Suspense>
  );
}

function Tools() {
  const items = [
    { id: "01", name: "YOLOv9 · Detector", desc: "Real-time bounding-box detection across 80+ COCO classes with configurable confidence thresholds." },
    { id: "02", name: "ByteTrack · Tracker", desc: "Multi-object association with occlusion recovery — keeps track IDs stable across frames." },
    { id: "03", name: "Scene Reasoning", desc: "Automatic scene summaries and per-track behaviour notes — dwell, direction, and anomaly flags derived from track history." },
    { id: "04", name: "Trajectory Studio", desc: "Per-object paths, heatmaps and dwell-time overlays for spatial analysis." },
    { id: "05", name: "Timeline Lanes", desc: "Per-track lanes across the clip — scrub, isolate, export segments in one gesture." },
    { id: "06", name: "Export · Video / JSON / CSV", desc: "Structured tracks, bounding boxes, and confidences for downstream research." },
  ];
  return (
    <section id="tools" className="border-b border-[color:var(--rkr-border)]">
      <div className="mx-auto max-w-[1360px] px-5 py-24">
        <SectionHeader kicker="01 · Toolchain" title="Every tool an analyst needs, one workspace." />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--rkr-border)] border border-[color:var(--rkr-border)]">
          {items.map((t) => (
            <div
              key={t.id}
              className="group relative bg-[color:var(--rkr-bg)] p-7 hover:bg-[color:var(--rkr-surface)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--rkr-muted)]">
                  {t.id}
                </span>
                <span className="size-1.5 rounded-full bg-[color:var(--rkr-border)] group-hover:bg-[color:var(--rkr-primary)] transition-colors" />
              </div>
              <h3 className="mt-6 font-[family-name:var(--font-display)] text-xl tracking-tight font-bold text-[color:var(--rkr-fg)]">
                {t.name}
              </h3>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[color:var(--rkr-muted)]">
                {t.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    { n: "01", t: "Ingest", d: "Drop MP4 / MOV footage or connect a live feed." },
    { n: "02", t: "Detect", d: "YOLOv9 draws bounding boxes on every frame." },
    { n: "03", t: "Associate", d: "ByteTrack assigns and holds stable track IDs." },
    { n: "04", t: "Reason", d: "Track histories are summarised and anomalies flagged." },
    { n: "05", t: "Export · Video", d: "Tracked video, timeline, trajectories and JSON for research." },
  ];
  return (
    <section id="flow" className="border-b border-[color:var(--rkr-border)] bg-[color:var(--rkr-surface)]">
      <div className="mx-auto max-w-[1360px] px-5 py-24">
        <SectionHeader kicker="02 · Pipeline" title="How a frame becomes a track." />

        {/* Desktop flow */}
        <div className="mt-14 hidden lg:block relative">
          <div className="absolute left-0 right-0 top-9 h-px bg-[color:var(--rkr-border)]" />
          <svg
            aria-hidden
            className="absolute left-0 right-0 top-9 w-full h-px overflow-visible"
            viewBox="0 0 100 1"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="0.5"
              x2="100"
              y2="0.5"
              stroke="#FF5C00"
              strokeWidth="0.4"
              strokeDasharray="2 2"
              style={{ animation: "rkr-flow 1.8s linear infinite" }}
            />
          </svg>
          <div className="grid grid-cols-5 gap-6 relative">
            {steps.map((s, i) => (
              <div key={s.n} className="relative">
                <div className="relative z-10 mx-auto size-[72px] rounded-full bg-[color:var(--rkr-bg)] border border-[color:var(--rkr-border)] grid place-items-center">
                  <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest text-[color:var(--rkr-primary)]">
                    {s.n}
                  </span>
                  {i === 0 && (
                    <span className="absolute inset-0 rounded-full border border-[color:var(--rkr-primary)]/30 animate-ping" />
                  )}
                </div>
                <div className="mt-6 text-center">
                  <h4 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                    {s.t}
                  </h4>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[color:var(--rkr-muted)]">
                    {s.d}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile flow */}
        <div className="mt-12 lg:hidden relative pl-8">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-[color:var(--rkr-border)]" />
          <div className="space-y-8">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <span className="absolute -left-[22px] top-1.5 size-3 rounded-full bg-[color:var(--rkr-bg)] border-2 border-[color:var(--rkr-primary)]" />
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--rkr-primary)]">
                  {s.n}
                </div>
                <h4 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                  {s.t}
                </h4>
                <p className="mt-1 text-[13px] text-[color:var(--rkr-muted)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Advantages() {
  const rows = [
    { k: "MOTA", label: "Multi-Object Tracking Accuracy", legacy: "62.4%", rekor: "78.9%" },
    { k: "IDF1", label: "Identity F1 — how long an ID stays correct", legacy: "58.1%", rekor: "76.2%" },
    { k: "LAT", label: "Frame latency at 1080p", legacy: "68ms", rekor: "24ms" },
    { k: "OCC", label: "Occlusion recovery after an object is hidden", legacy: "Manual", rekor: "Automatic" },
    { k: "IDSW", label: "Identity switches per 1,000 frames", legacy: "41", rekor: "12" },
    { k: "CLS", label: "Object classes recognised out of the box", legacy: "20", rekor: "80+" },
    { k: "SETUP", label: "Install, drivers and environment setup", legacy: "CUDA build", rekor: "In-browser" },
    { k: "EXPORT", label: "Structured output for reports and analysis", legacy: "CSV only", rekor: "JSON + video" },
  ];
  const cards = [
    { t: "Analyst-first readouts", d: "Every measurement is monospaced and precise. Numbers you can trust, laid out for study." },
    { t: "Runs on any device", d: "Desktop workspace and mobile-friendly review. Same interface, different form factor." },
    { t: "Repeatable results", d: "Deterministic pipelines, versioned models, exportable JSON — ready for a paper or a lab notebook." },
  ];
  return (
    <section id="advantages" className="border-b border-[color:var(--rkr-border)]">
      <div className="mx-auto max-w-[1360px] px-5 py-24">
        <SectionHeader kicker="03 · Advantages" title="Why Rekor/OS holds up under review." />

        <div className="mt-14 grid lg:grid-cols-[1.2fr_1fr] gap-10">
          {/* Comparison table */}
          <div className="border border-[color:var(--rkr-border)] rounded-md overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_110px_110px] bg-[color:var(--rkr-surface)] border-b border-[color:var(--rkr-border)] font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
              <div className="p-3 border-r border-[color:var(--rkr-border)]">Metric</div>
              <div className="p-3 border-r border-[color:var(--rkr-border)]">Definition</div>
              <div className="p-3 border-r border-[color:var(--rkr-border)] text-right">Baseline</div>
              <div className="p-3 text-right text-[color:var(--rkr-primary)]">Rekor/OS</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.k}
                className={`grid grid-cols-[80px_1fr_110px_110px] border-b border-[color:var(--rkr-border)] last:border-b-0 ${i % 2 ? "bg-[color:var(--rkr-surface)]/40" : ""}`}
              >
                <div className="p-3 border-r border-[color:var(--rkr-border)] font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--rkr-fg)]">
                  {r.k}
                </div>
                <div className="p-3 border-r border-[color:var(--rkr-border)] text-[13px] text-[color:var(--rkr-muted)]">
                  {r.label}
                </div>
                <div className="p-3 border-r border-[color:var(--rkr-border)] text-right font-[family-name:var(--font-mono)] text-[12px] text-[color:var(--rkr-muted)]">
                  {r.legacy}
                </div>
                <div className="p-3 text-right font-[family-name:var(--font-mono)] text-[12px] font-bold text-[color:var(--rkr-primary)]">
                  {r.rekor}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            {cards.map((c) => (
              <div
                key={c.t}
                className="border border-[color:var(--rkr-border)] rounded-md p-5 bg-[color:var(--rkr-surface)]/60"
              >
                <div className="flex items-center gap-2">
                  <span className="size-2 bg-[color:var(--rkr-primary)]" />
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[color:var(--rkr-muted)]">
                    Advantage
                  </span>
                </div>
                <h4 className="mt-2 font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                  {c.t}
                </h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--rkr-muted)]">
                  {c.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const links: { key: string; label: string; title: string; body: string; icon: React.ReactNode }[] = [
    {
      key: "about",
      label: "About",
      title: "About Rekor/OS",
      body: "Rekor/OS is a computer-vision project exploring how multi-object detection and tracking can run entirely inside the browser. Upload a clip, let the detector read every sampled frame, and review the original and tracked output side-by-side with exportable data.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 10.5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="7.6" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      title: "Contact",
      body: "Questions, feedback or collaboration on the tracking pipeline are welcome. Reach the team through the course portal, or write to the project address listed in the report cover page. Bug reports with a sample clip get answered fastest.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="m3.5 7 8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: "social",
      label: "Social media",
      title: "Social media",
      body: "Build logs, demo clips and evaluation charts are posted as the project evolves. Follow along for release notes on new detector weights, tracker tuning, and UI updates to the workspace.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17" cy="6.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17" cy="17.5" r="2.4" stroke="currentColor" strokeWidth="1.6" />
          <path d="m8.2 10.9 6.6-3.3M8.2 13.1l6.6 3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: "privacy",
      label: "Privacy policy",
      title: "Privacy policy",
      body: "Your footage never leaves your device. Video is read locally in the browser, the detection model runs client-side, and no frames, detections or files are uploaded to any server. Nothing is stored — closing the tab clears everything.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3.5 5 6.2v5.1c0 4.3 2.9 7.6 7 9.2 4.1-1.6 7-4.9 7-9.2V6.2L12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="m9 12.2 2.1 2.1L15 10.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const active = links.find((l) => l.key === openItem);

  return (
    <footer className="bg-[color:var(--rkr-surface)]">
      <div className="mx-auto max-w-[1360px] px-5 py-16">
        <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 items-start">
          <div>
            <Logo />
            <p className="mt-5 text-[13px] leading-relaxed text-[color:var(--rkr-muted)] max-w-xs">
              Rekor/OS is a browser-based computer-vision workspace. Upload any video and
              it detects every visible object frame by frame, tracks each one across the
              clip, draws labelled bounding boxes with confidence scores, and lets you
              review original vs tracked output side by side — then export the tracked
              video and its detection data as JSON.
            </p>
            <div className="mt-5 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--rkr-muted)]">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              ALL SYSTEMS · NOMINAL
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {links.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setOpenItem(l.key)}
                className="group flex flex-col items-center gap-2.5 rounded-md border border-[color:var(--rkr-border)] px-3 py-4 text-[color:var(--rkr-muted)] hover:border-[color:var(--rkr-primary)] hover:text-[color:var(--rkr-primary)] transition-colors"
              >
                {l.icon}
                <span className="font-[family-name:var(--font-mono)] text-[9.5px] uppercase tracking-[0.16em] text-center">
                  {l.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-[color:var(--rkr-border)] flex flex-wrap justify-between items-center gap-3 font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-[color:var(--rkr-muted)]">
          <span>© {new Date().getFullYear()} REKOR/OS · BUILD 24.0.1</span>
          <span>MULTI-OBJECT TRACKING · COMPUTER VISION</span>
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpenItem(null)}
        >
          <div
            className="relative w-full max-w-md rounded-lg border border-[color:var(--rkr-border)] bg-[color:var(--rkr-bg)] p-6 shadow-[0_30px_80px_-20px_rgba(255,92,0,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.24em] text-[color:var(--rkr-primary)]">
                {active.icon}
                {active.label}
              </span>
              <button
                onClick={() => setOpenItem(null)}
                aria-label="Close"
                className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--rkr-muted)] hover:text-[color:var(--rkr-fg)] transition-colors"
              >
                ✕
              </button>
            </div>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
              {active.title}
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[color:var(--rkr-muted)]">
              {active.body}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setOpenItem(null)}
                className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] bg-[color:var(--rkr-primary)] text-black px-4 py-2 rounded font-bold hover:bg-[color:var(--rkr-fg)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}

function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="flex flex-col gap-3 max-w-3xl">
      <span className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.24em] text-[color:var(--rkr-primary)]">
        {kicker}
      </span>
      <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.02] tracking-[-0.02em] font-extrabold text-[color:var(--rkr-fg)]">
        {title}
      </h2>
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-[color:var(--rkr-bg)] text-[color:var(--rkr-fg)] font-[family-name:var(--font-sans)] selection:bg-[color:var(--rkr-primary)]/30">
      <Nav />
      <Hero />
      <Tools />
      <Flow />
      <Advantages />
      <Footer />
    </div>
  );
}
