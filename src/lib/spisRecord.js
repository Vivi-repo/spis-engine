import { CLUSTERS } from './attention';
import { mulberry32 } from './random';

/* 32-byte sensory record. Little-endian, fixed width. */
export const SPIS_LAYOUT = [
  { off: 0,  size: 1, type: 'u8',  name: 'schema_ver',        group: 'hdr' },
  { off: 1,  size: 1, type: 'u8',  name: 'flags',             group: 'hdr' },
  { off: 2,  size: 2, type: 'u16', name: 'sls ×100',          group: 'score' },
  { off: 4,  size: 2, type: 'u16', name: 'spatial_freq ×100', group: 'score' },
  { off: 6,  size: 2, type: 'u16', name: 'color_entropy ×100', group: 'score' },
  { off: 8,  size: 2, type: 'u16', name: 'edge_density ×100', group: 'score' },
  { off: 10, size: 2, type: 'u16', name: 'fft_hf_ratio ×1e4', group: 'raw' },
  { off: 12, size: 2, type: 'u16', name: 'shannon_H millibits', group: 'raw' },
  { off: 14, size: 2, type: 'u16', name: 'canny_ratio ×1e5',  group: 'raw' },
  { off: 16, size: 1, type: 'u8',  name: 'dominant_hue',      group: 'aux' },
  { off: 17, size: 1, type: 'u8',  name: 'lum_contrast',      group: 'aux' },
  { off: 18, size: 1, type: 'u8',  name: 'motion_score',      group: 'aux' },
  { off: 19, size: 1, type: 'u8',  name: 'theme_cluster',     group: 'aux' },
  { off: 20, size: 4, type: 'u32', name: 'computed_at (unix s)', group: 'meta' },
  { off: 24, size: 2, type: 'u16', name: 'worker_version',    group: 'meta' },
  { off: 26, size: 6, type: 'pad', name: 'reserved',          group: 'pad' },
];
export const GROUP_TONE = { hdr: 'text-muted', score: 'text-accent', raw: 'text-std', aux: 'text-safe', meta: 'text-warn', pad: 'text-muted/50' };

export function encodeSpis(it) {
  const buf = new ArrayBuffer(32), dv = new DataView(buf);
  const r = mulberry32(it.seed + 77);
  const textHeavy = ['info', 'recipe', 'neon'].includes(it.kind);
  const highContrast = ['neon', 'glitch', 'opart'].includes(it.kind);
  const animated = !it.isBreak && it.sls > 75;
  const flags = (animated ? 1 : 0) | (textHeavy ? 2 : 0) | (highContrast ? 4 : 0) | (it.isBreak ? 8 : 0);
  const cluster = it.isBreak ? 255 : CLUSTERS.findIndex(c => c.kinds.includes(it.kind));
  const vals = {
    schema_ver: 1, flags,
    'sls ×100': Math.round(it.sls * 100), 'spatial_freq ×100': Math.round(it.sf * 100),
    'color_entropy ×100': Math.round(it.ce * 100), 'edge_density ×100': Math.round(it.ed * 100),
    'fft_hf_ratio ×1e4': Math.round(it.raw.hf * 1e4), 'shannon_H millibits': Math.round(it.raw.H * 1000),
    'canny_ratio ×1e5': Math.round(it.raw.edge * 1e5),
    dominant_hue: Math.floor(r() * 256), lum_contrast: Math.round(it.sf * 2.4 + r() * 10),
    motion_score: animated ? 140 + Math.floor(r() * 80) : 0, theme_cluster: cluster,
    'computed_at (unix s)': 1767225600 + it.idx * 4513, worker_version: 0x0203,
  };
  for (const f of SPIS_LAYOUT) {
    const v = vals[f.name];
    if (f.type === 'u8') dv.setUint8(f.off, Math.min(255, v));
    if (f.type === 'u16') dv.setUint16(f.off, v, true);
    if (f.type === 'u32') dv.setUint32(f.off, v, true);
  }
  const bytes = new Uint8Array(buf);
  const b64 = btoa(String.fromCharCode(...bytes));
  return { bytes, b64, vals };
}

// Inverse of encodeSpis. Used by tests and by any consumer that needs the full record, not just the SLS bytes.
export function decodeSpis(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = {};
  for (const f of SPIS_LAYOUT) {
    if (f.type === 'u8') out[f.name] = dv.getUint8(f.off);
    if (f.type === 'u16') out[f.name] = dv.getUint16(f.off, true);
    if (f.type === 'u32') out[f.name] = dv.getUint32(f.off, true);
  }
  return out;
}
