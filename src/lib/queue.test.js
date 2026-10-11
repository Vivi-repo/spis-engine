import { describe, it, expect } from 'vitest';
import { getItem, slsOf, buildPacedList, W_SF, W_CE, W_ED } from './queue';

describe('Sensory Loading Score', () => {
  it('uses the 0.40 / 0.35 / 0.25 weighting', () => {
    expect(W_SF + W_CE + W_ED).toBeCloseTo(1, 10);
    expect(slsOf(100, 0, 0)).toBeCloseTo(40);
    expect(slsOf(0, 100, 0)).toBeCloseTo(35);
    expect(slsOf(0, 0, 100)).toBeCloseTo(25);
    expect(slsOf(80, 60, 40)).toBeCloseTo(0.4 * 80 + 0.35 * 60 + 0.25 * 40);
  });

  it('keeps every metric on a 0-100 scale and raw outputs in their physical ranges', () => {
    for (let i = 0; i < 1000; i++) {
      const it = getItem(i);
      for (const v of [it.sf, it.ce, it.ed, it.sls]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
      expect(it.raw.H).toBeLessThanOrEqual(8);       // Shannon entropy of a 256-bin histogram
      expect(it.raw.edge).toBeLessThanOrEqual(0.15); // edge-density cap
      expect(it.sls).toBeCloseTo(slsOf(it.sf, it.ce, it.ed));
    }
  });

  it('is deterministic per index so the demo is repeatable', () => {
    expect(getItem(42)).toBe(getItem(42));
    expect(getItem(7).sls).toBeCloseTo(getItem(7).sls);
  });
});

describe('paced list (edge worker output)', () => {
  const content = list => list.filter(x => !x.isBreak).map(x => x.idx);

  it('preserves ranking order and drops nothing', () => {
    const plan = buildPacedList(500, 65, true);
    expect(content(plan)).toEqual(Array.from({ length: 500 }, (_, i) => i));
  });

  it('inserts a break directly after, and only after, pins above the trigger', () => {
    const plan = buildPacedList(300, 65, true);
    plan.forEach((x, k) => {
      if (x.isBreak) expect(plan[k - 1]).toBe(x.after);
      else if (x.sls > 65) expect(plan[k + 1]?.isBreak).toBe(true);
      else expect(plan[k + 1]?.isBreak ?? false).toBe(false);
    });
  });

  it('passes through unchanged when pacing is off (fail-open)', () => {
    expect(buildPacedList(200, 65, false).some(x => x.isBreak)).toBe(false);
  });
});
