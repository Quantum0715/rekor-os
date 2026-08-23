export type Box = { xmin: number; ymin: number; xmax: number; ymax: number };
export type Det = { box: Box; label: string; score: number };

const area = (b: Box) => Math.max(0, b.xmax - b.xmin) * Math.max(0, b.ymax - b.ymin);

export function iou(a: Box, b: Box) {
  const x1 = Math.max(a.xmin, b.xmin);
  const y1 = Math.max(a.ymin, b.ymin);
  const x2 = Math.min(a.xmax, b.xmax);
  const y2 = Math.min(a.ymax, b.ymax);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = area(a) + area(b) - inter;
  return union > 0 ? inter / union : 0;
}

/** Keep the strongest box per cluster so one object isn't labelled twice. */
export function nms(dets: Det[], thr = 0.55) {
  const sorted = [...dets].sort((a, b) => b.score - a.score);
  const keep: Det[] = [];
  for (const d of sorted) {
    if (keep.some((k) => iou(k.box, d.box) > thr)) continue;
    keep.push(d);
  }
  return keep;
}

/**
 * Rejects noise before anything is drawn:
 * - low confidence and sliver/oversized boxes are dropped
 * - a detection must be confirmed over several consecutive passes to appear
 * - a confirmed track survives a few missed passes so labels don't flicker
 */
export class Stabilizer {
  private tracks: { det: Det; hits: number; misses: number; shown: boolean }[] = [];

  constructor(
    private opts: {
      minScore?: number;
      minAreaRatio?: number;
      maxAreaRatio?: number;
      minHits?: number;
      maxMisses?: number;
    } = {},
  ) {}

  reset() {
    this.tracks = [];
  }

  update(raw: Det[], frameW: number, frameH: number): Det[] {
    const {
      minScore = 0.5,
      minAreaRatio = 0.0015,
      maxAreaRatio = 0.9,
      minHits = 2,
      maxMisses = 4,
    } = this.opts;

    const frameArea = Math.max(1, frameW * frameH);
    const clean = nms(
      raw.filter((d) => {
        if (d.score < minScore) return false;
        const w = d.box.xmax - d.box.xmin;
        const h = d.box.ymax - d.box.ymin;
        if (w < 8 || h < 8) return false;
        const ratio = (w * h) / frameArea;
        if (ratio < minAreaRatio || ratio > maxAreaRatio) return false;
        const aspect = w / h;
        if (aspect > 12 || aspect < 1 / 12) return false;
        return true;
      }),
    );

    const existing = this.tracks;
    const matched = new Set<number>();
    const fresh: typeof this.tracks = [];

    for (const d of clean) {
      let best = -1;
      let bestIou = 0.3;
      existing.forEach((t, i) => {
        if (matched.has(i) || t.det.label !== d.label) return;
        const o = iou(t.det.box, d.box);
        if (o > bestIou) {
          bestIou = o;
          best = i;
        }
      });
      if (best === -1) {
        fresh.push({ det: d, hits: 1, misses: 0, shown: false });
      } else {
        matched.add(best);
        const t = existing[best]!;
        t.det = { ...d, score: t.det.score * 0.6 + d.score * 0.4 };
        t.hits += 1;
        t.misses = 0;
      }
    }

    existing.forEach((t, i) => {
      if (!matched.has(i)) t.misses += 1;
      if (t.hits >= minHits) t.shown = true;
    });

    this.tracks = [...existing, ...fresh].filter((t) => t.misses <= maxMisses);

    // Keep a confirmed object for two missed inference passes. Rendering continues
    // between passes, so this prevents boxes flashing on/off as the camera moves.
    return this.tracks.filter((t) => t.shown && t.misses <= Math.min(2, maxMisses)).map((t) => t.det);
  }

}
