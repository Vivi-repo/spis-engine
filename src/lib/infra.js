import { mulberry32 } from './random';

export const STORAGE_TIERS = [
  { id: 'ddbAttr', name: 'DynamoDB, attribute on existing pin item', perGB: 0.25, overhead: 0, read: 'Rides the metadata read the API already makes', fits: true },
  { id: 'redis', name: 'Redis / ElastiCache, key per pin', perGB: 12, overhead: 56, read: 'MGET of 500 keys, about 0.3 to 1 ms in-region', fits: true },
  { id: 'ddbItem', name: 'DynamoDB, separate item per pin', perGB: 0.25, overhead: 100, read: 'BatchGetItem caps at 100 keys, so 5 calls per request', fits: false },
  { id: 'obj', name: 'S3 Standard (cold source of truth)', perGB: 0.023, overhead: 0, read: 'Not on the serving path; backfill and audit only', fits: false },
];
export const tierCost = (tier, pinsB) => pinsB * (32 + tier.overhead) * tier.perGB; // pinsB × 1e9 × bytes / 1e9 B per GB
export const INGEST_MS = 15, VCPU_HR = 0.04;
export const backfillCost = pinsB => pinsB * 1e9 * INGEST_MS / 1000 / 3600 * VCPU_HR;
export function sampleTrace(rand = Math.random) {
  const tail = rand() < 0.03 ? 0.25 + rand() * 0.18 : 0;
  return { ranker: 38 + rand() * 14, hydrate: 0.32 + rand() * 0.38 + tail, edge: 0.08 + rand() * 0.2 };
}
export const SEED_TRACES = (() => { const r = mulberry32(4242); return Array.from({ length: 24 }, () => sampleTrace(r)); })();
export const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
