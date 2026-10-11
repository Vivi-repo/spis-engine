import { describe, it, expect } from 'vitest';
import { encodeSpis, decodeSpis, SPIS_LAYOUT } from './spisRecord';
import { getItem, makeBreak } from './queue';

describe('32-byte SPIS record', () => {
  it('lays out fields contiguously with no overlap, ending at exactly 32 bytes', () => {
    let next = 0;
    for (const f of SPIS_LAYOUT) { expect(f.off).toBe(next); next += f.size; }
    expect(next).toBe(32);
  });

  it('encodes to 32 bytes and 44 base64 characters', () => {
    const { bytes, b64 } = encodeSpis(getItem(3));
    expect(bytes.byteLength).toBe(32);
    expect(b64).toHaveLength(44);
  });

  it('round-trips scores within fixed-point precision', () => {
    for (const i of [0, 11, 99, 250]) {
      const it = getItem(i);
      const d = decodeSpis(encodeSpis(it).bytes);
      expect(d['sls ×100'] / 100).toBeCloseTo(it.sls, 2);
      expect(d['spatial_freq ×100'] / 100).toBeCloseTo(it.sf, 2);
      expect(d['shannon_H millibits'] / 1000).toBeCloseTo(it.raw.H, 3);
      expect(d['canny_ratio ×1e5'] / 1e5).toBeCloseTo(it.raw.edge, 5);
      expect(d.schema_ver).toBe(1);
    }
  });

  it('flags rest breaks and leaves reserved bytes zeroed', () => {
    const brk = makeBreak(getItem(5), 0);
    const { bytes } = encodeSpis(brk);
    expect(decodeSpis(bytes).flags & 8).toBe(8);
    expect([...bytes.slice(26)]).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
