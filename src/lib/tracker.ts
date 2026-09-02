// Lightweight multi-object tracker (IoU association + label voting).
//
// Raw per-frame detections flicker: a box may disappear for a frame, or the
// classifier may briefly call a "truck" a "bus". The tracker keeps a persistent
// ID per object, coasts through short dropouts and reports the majority-voted
// label with a smoothed confidence — so the name shown on screen is stable.

import type { Box, Detection } from "./detector";

export type TrackedDetection = Detection & { id: number };

type Track = {
  id: number;
  box: Box;
  votes: string[];
  score: number;
  hits: number;
  misses: number;
};

export type TrackerOptions = {
  /** Minimum IoU to associate a detection with an existing track. */
  iouThreshold?: number;
  /** Frames a track may go undetected before it is dropped. */
  maxMisses?: number;
  /** Consecutive hits before a track is shown. */
  minHits?: number;
  /** Label votes kept per track. */
  voteWindow?: number;
  /** Box smoothing factor (0 = frozen, 1 = jump to newest). */
  alpha?: number;
};

function iou(a: Box, b: Box) {
  const ix = Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin));
  const iy = Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));
  const inter = ix * iy;
  if (!inter) return 0;
  const ua = (a.xmax - a.xmin) * (a.ymax - a.ymin) + (b.xmax - b.xmin) * (b.ymax - b.ymin) - inter;
  return ua > 0 ? inter / ua : 0;
}

function majority(votes: string[]) {
  const c = new Map<string, number>();
  let best = votes[votes.length - 1] ?? "";
  let bestN = 0;
  for (const v of votes) {
    const n = (c.get(v) ?? 0) + 1;
    c.set(v, n);
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

export class Tracker {
  private tracks: Track[] = [];
  private nextId = 1;
  private readonly o: Required<TrackerOptions>;

  constructor(opts: TrackerOptions = {}) {
    this.o = {
      iouThreshold: opts.iouThreshold ?? 0.3,
      maxMisses: opts.maxMisses ?? 6,
      minHits: opts.minHits ?? 2,
      voteWindow: opts.voteWindow ?? 12,
      alpha: opts.alpha ?? 0.6,
    };
  }

  reset() {
    this.tracks = [];
    this.nextId = 1;
  }

  update(dets: Detection[]): TrackedDetection[] {
    const { iouThreshold, maxMisses, minHits, voteWindow, alpha } = this.o;

    // Greedy matching by IoU, best pairs first.
    const pairs: Array<{ t: number; d: number; v: number }> = [];
    this.tracks.forEach((t, ti) => {
      dets.forEach((d, di) => {
        const v = iou(t.box, d.box);
        if (v >= iouThreshold) pairs.push({ t: ti, d: di, v });
      });
    });
    pairs.sort((a, b) => b.v - a.v);

    const usedT = new Set<number>();
    const usedD = new Set<number>();
    for (const p of pairs) {
      if (usedT.has(p.t) || usedD.has(p.d)) continue;
      usedT.add(p.t);
      usedD.add(p.d);
      const t = this.tracks[p.t]!;
      const d = dets[p.d]!;
      t.box = {
        xmin: t.box.xmin + (d.box.xmin - t.box.xmin) * alpha,
        ymin: t.box.ymin + (d.box.ymin - t.box.ymin) * alpha,
        xmax: t.box.xmax + (d.box.xmax - t.box.xmax) * alpha,
        ymax: t.box.ymax + (d.box.ymax - t.box.ymax) * alpha,
      };
      t.votes.push(d.label);
      if (t.votes.length > voteWindow) t.votes.shift();
      t.score = t.score * 0.6 + d.score * 0.4;
      t.hits += 1;
      t.misses = 0;
    }

    // Unmatched tracks coast; drop after too many misses.
    this.tracks.forEach((t, ti) => {
      if (!usedT.has(ti)) t.misses += 1;
    });
    this.tracks = this.tracks.filter((t) => t.misses <= maxMisses);

    // Unmatched detections start new tracks.
    dets.forEach((d, di) => {
      if (usedD.has(di)) return;
      this.tracks.push({ id: this.nextId++, box: { ...d.box }, votes: [d.label], score: d.score, hits: 1, misses: 0 });
    });

    return this.tracks
      .filter((t) => t.hits >= minHits && t.misses <= 1)
      .map((t) => ({ id: t.id, box: { ...t.box }, label: majority(t.votes), score: t.score }));
  }
}
