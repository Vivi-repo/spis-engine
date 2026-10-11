import { describe, it, expect } from 'vitest';
import { simulateSession, projectKpis, zoneOf, START_F } from './fatigue';

describe('fatigue model', () => {
  it('ends an un-throttled session in overload', () => {
    const s = simulateSession(0, 65, false);
    expect(s.ended).toBe(true);
    expect(s.pts.at(-1)[1]).toBe(100);
  });

  it('keeps a paced session going longer than the control on the same queue', () => {
    for (const start of [0, 37, 74, 111]) {
      const std = simulateSession(start, 65, false);
      const paced = simulateSession(start, 65, true);
      expect(paced.content).toBeGreaterThan(std.content);
    }
  });

  it('reports zero extension when pacing is disabled', () => {
    const k = projectKpis(65, false);
    expect(k.extension).toBeCloseTo(0);
    expect(k.retainedAds).toBeCloseTo(0);
  });

  it('trades longer sessions for more buffer overhead as the trigger drops', () => {
    const strict = projectKpis(50, true), lenient = projectKpis(80, true);
    expect(strict.paced.content).toBeGreaterThan(lenient.paced.content);
    expect(strict.overhead).toBeGreaterThan(lenient.overhead);
  });

  it('maps fatigue to zones', () => {
    expect(zoneOf(START_F).label).toBe('Safe zone');
    expect(zoneOf(55).label).toBe('Elevated');
    expect(zoneOf(80).label).toBe('Strained');
    expect(zoneOf(100).label).toBe('Sensory overload');
  });
});
