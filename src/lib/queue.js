import { mulberry32 } from './random';

/* ───────────────────────── Deterministic content queue ─────────────────────────
   Each pin carries the raw outputs a Python OpenCV/SciPy worker would emit:
   fft_hf_ratio  (share of spectral magnitude above the high-frequency cutoff)  → Spatial Frequency 0–100
   shannon_H     (entropy of a 256-bin histogram, 0–8 bits)                     → Color Entropy     0–100
   canny_ratio   (edge pixels / canvas area, capped at 15%)                      → Edge Density      0–100
   SLS = 0.40·SF + 0.35·CE + 0.25·ED                                                                    */
export const ARCHETYPES = [
  { k: 'glitch',   sf: [80, 97], ce: [75, 92], ed: [75, 95], w: 3, titles: ['Glitch-art gig poster', 'Datamosh album cover', 'Cyber rave flyer'] },
  { k: 'info',     sf: [85, 96], ce: [55, 70], ed: [80, 98], w: 3, titles: ['Infographic: 47 productivity hacks', 'Cheat sheet: every Excel shortcut', 'Meal-prep chart, 30 days'] },
  { k: 'neon',     sf: [70, 88], ce: [80, 95], ed: [60, 80], w: 3, titles: ['Neon flash-sale banner', 'Black Friday countdown', 'Clearance: 80% off everything'] },
  { k: 'collage',  sf: [72, 90], ce: [82, 96], ed: [70, 90], w: 3, titles: ['Maximalist moodboard', 'Y2K sticker collage', 'Scrapbook spread, 40 cutouts'] },
  { k: 'opart',    sf: [90, 99], ce: [20, 40], ed: [85, 99], w: 2, titles: ['Op-art spiral print', 'Moiré checker tile', 'Hypnotic stripe wallpaper'] },
  { k: 'recipe',   sf: [65, 80], ce: [45, 60], ed: [60, 78], w: 2, titles: ['Recipe card: 22-step lasagna', 'Annotated knitting chart'] },
  { k: 'street',   sf: [45, 62], ce: [55, 72], ed: [40, 58], w: 3, titles: ['Street-style outfit grid', 'Night market stall'] },
  { k: 'boho',     sf: [50, 66], ce: [60, 75], ed: [45, 62], w: 2, titles: ['Boho living room, layered rugs', 'Gallery wall, 18 frames'] },
  { k: 'ceramic',  sf: [12, 25], ce: [20, 35], ed: [8, 20],  w: 2, titles: ['Matte ceramic vase', 'Single stem in a clay pot'] },
  { k: 'mountain', sf: [10, 22], ce: [30, 45], ed: [6, 16],  w: 2, titles: ['Misty mountain at dawn', 'Fog over a pine ridge'] },
  { k: 'linen',    sf: [18, 30], ce: [25, 38], ed: [12, 24], w: 2, titles: ['Oat linen bedroom', 'Morning light on a made bed'] },
  { k: 'quote',    sf: [30, 45], ce: [10, 22], ed: [20, 32], w: 1, titles: ['Sparse type card: "slow down"', 'Minimal quote poster'] },
];
export const TOTAL_W = ARCHETYPES.reduce((s, a) => s + a.w, 0);
export const W_SF = 0.40, W_CE = 0.35, W_ED = 0.25;
export const slsOf = (sf, ce, ed) => W_SF * sf + W_CE * ce + W_ED * ed;

export const itemCache = new Map();
export function getItem(i) {
  if (itemCache.has(i)) return itemCache.get(i);
  const r = mulberry32(i * 9973 + 17);
  let x = r() * TOTAL_W, a;
  for (a of ARCHETYPES) { x -= a.w; if (x < 0) break; }
  const pick = ([lo, hi]) => lo + r() * (hi - lo);
  const sf = pick(a.sf), ce = pick(a.ce), ed = pick(a.ed);
  const it = {
    id: 'c' + i, idx: i, isBreak: false, kind: a.k,
    title: a.titles[Math.floor(r() * a.titles.length)],
    aspect: [1.25, 1.5, 1.0, 1.35, 0.8, 1.6][Math.floor(r() * 6)],
    seed: i * 7919 + 3,
    sf, ce, ed, sls: slsOf(sf, ce, ed),
    raw: { hf: sf / 100, H: (ce / 100) * 8, edge: (ed / 100) * 0.15 },
  };
  itemCache.set(i, it);
  return it;
}

export const BREAK_TYPES = [
  { k: 'gradient', title: 'Soft gradient field' },
  { k: 'landscape', title: 'Horizon landscape' },
  { k: 'template', title: 'Minimal template' },
];
export function makeBreak(after, n) {
  const r = mulberry32(after.idx * 31 + 5);
  const t = BREAK_TYPES[n % 3];
  const sf = 4 + r() * 8, ce = 8 + r() * 14, ed = 2 + r() * 6;
  return {
    id: 'b' + after.idx, idx: after.idx, isBreak: true, kind: t.k, title: t.title,
    aspect: 0.72, seed: after.idx * 131 + 9, after,
    sf, ce, ed, sls: slsOf(sf, ce, ed),
    raw: { hf: sf / 100, H: (ce / 100) * 8, edge: (ed / 100) * 0.15 },
  };
}

export function buildPacedList(count, threshold, breaksOn) {
  const out = []; let n = 0;
  for (let i = 0; i < count; i++) {
    const it = getItem(i); out.push(it);
    if (breaksOn && it.sls > threshold) out.push(makeBreak(it, n++));
  }
  return out;
}
