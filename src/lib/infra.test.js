import { describe, it, expect } from 'vitest';
import { STORAGE_TIERS, tierCost, backfillCost, pct } from './infra';

const tier = id => STORAGE_TIERS.find(t => t.id === id);

describe('infrastructure cost math', () => {
  it('prices 1B pins × 32 B on DynamoDB at $0.25/GB-month as $8', () => {
    expect(tierCost(tier('ddbAttr'), 1)).toBeCloseTo(8);
  });

  it('adds per-item overhead for separate DynamoDB items', () => {
    expect(tierCost(tier('ddbItem'), 1)).toBeCloseTo(132 * 0.25);
  });

  it('scales linearly with catalog size', () => {
    expect(tierCost(tier('redis'), 10)).toBeCloseTo(10 * tierCost(tier('redis'), 1));
  });

  it('estimates backfill CPU from 15 ms per image at $0.04/vCPU-hour', () => {
    expect(backfillCost(1)).toBeCloseTo(1e9 * 0.015 / 3600 * 0.04);
  });

  it('computes percentiles', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(pct(xs, 0.5)).toBe(51);
    expect(pct(xs, 0.99)).toBe(100);
    expect(pct([], 0.5)).toBe(0);
  });
});
