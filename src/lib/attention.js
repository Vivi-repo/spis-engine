import { GATING_LIMIT } from './fatigue';
import { mulberry32 } from './random';

/* ───────────────────────── Cognitive Resonance Map ─────────────────────────
   x = Sensory Loading Score from the vision worker (real axis).
   y = second dimension of a style embedding (simulated), which separates themes.
   The path is the user's attention state. Each pin pulls attention toward itself; how hard depends on
   gating load. Consecutive high-stimulus pins saturate gating, so each pin captures attention fully
   (no momentum, a jump). Rest breaks clear the load, so attention keeps momentum and glides. */
export const CLUSTERS = [
  { id: 'minimal',   label: 'Minimalist',            kinds: ['ceramic', 'quote', 'linen'],    y: 62, shape: 'circle' },
  { id: 'organic',   label: 'Organic Textures',      kinds: ['mountain', 'boho'],             y: 22, shape: 'square' },
  { id: 'editorial', label: 'Editorial Lifestyle',   kinds: ['street', 'recipe'],             y: 42, shape: 'triangle' },
  { id: 'dense',     label: 'Dense Pattern & Type',  kinds: ['info', 'opart', 'collage'],     y: 74, shape: 'diamond' },
  { id: 'neon',      label: 'High-Contrast Neon',    kinds: ['neon', 'glitch'],               y: 91, shape: 'cross' },
].map((c, i) => ({ ...c, color: `rgb(var(--c${i + 1}))`, slot: i + 1 }));
export const clusterOf = kind => CLUSTERS.find(c => c.kinds.includes(kind));
export const SAVED_PINS = 120, DEMO_LEN = 40, JOLT = 20;

export function mapPos(it) {
  if (it._pos) return it._pos;
  const r = mulberry32(it.idx * 523 + 11);
  const c = clusterOf(it.kind);
  it._pos = { x: it.sls, y: Math.max(4, Math.min(98, c.y + (r() - 0.5) * 16)) };
  return it._pos;
}

export function attentionPath(list) {
  const content = list.filter(it => !it.isBreak);
  if (!content.length) return [];
  const first = mapPos(content[0]);
  let p = { ...first }, v = { x: 0, y: 0 }, load = 0;
  const out = [{ ...p, it: content[0] }];
  for (let k = list.indexOf(content[0]) + 1; k < list.length; k++) {
    const it = list[k];
    if (it.isBreak) {
      load = 0; v = { x: v.x * 0.5, y: v.y * 0.5 };
      p = { x: p.x + v.x, y: p.y + v.y };
      out.push({ ...p, it, brk: true });
      continue;
    }
    const t = mapPos(it);
    load = it.sls > GATING_LIMIT ? load + 1 : load * 0.7;
    const cap = Math.max(0, 1 - 0.25 * load);       // remaining gating capacity
    const g = 0.18 + 0.8 * (1 - cap), m = 0.62 * cap;
    v = { x: m * v.x + g * (t.x - p.x), y: m * v.y + g * (t.y - p.y) };
    p = { x: Math.max(0, Math.min(100, p.x + v.x)), y: Math.max(0, Math.min(100, p.y + v.y)) };
    out.push({ ...p, it, cap });
  }
  for (let k = 1; k < out.length; k++) out[k].jolt = Math.hypot(out[k].x - out[k - 1].x, out[k].y - out[k - 1].y) > JOLT;
  return out;
}

export function pathStats(pts) {
  if (pts.length < 3) return null;
  let len = 0, turn = 0, tc = 0, jolts = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    len += d; if (pts[i].jolt) jolts++;
    if (i > 1) {
      const a1 = Math.atan2(pts[i - 1].y - pts[i - 2].y, pts[i - 1].x - pts[i - 2].x);
      const a2 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
      let t = Math.abs(a2 - a1); if (t > Math.PI) t = 2 * Math.PI - t;
      turn += t; tc++;
    }
  }
  const pins = pts.filter(p => !p.brk).length;
  return { step: len / (pts.length - 1), turn: (turn / Math.max(1, tc)) * 180 / Math.PI, jolts, joltRate: jolts / pins * 10, pins };
}
