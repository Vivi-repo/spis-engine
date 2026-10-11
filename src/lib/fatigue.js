import { getItem } from './queue';

/* ───────────────────────── Fatigue model ─────────────────────────
   Sensory gating: the brain normally filters repeated stimuli. For gating-impaired users,
   consecutive high-load items compound instead of habituating, and a session drifts upward over time. */
export const GATING_LIMIT = 62;       // physiological, fixed: above this a pin extends the stimulus streak
export const START_F = 12;
export const DWELL_PIN = 4.2, DWELL_BREAK = 2.0;  // seconds on screen
export const AD_EVERY = 6;            // one ad window per 6 content pins

export function contentStep(s, sls) {
  s.n += 1;
  s.streak = sls > GATING_LIMIT ? s.streak + 1 : 0;
  let d = 0.55 + s.n * 0.022;
  if (sls >= 45) d += (sls - 45) * 0.085 * (1 + 0.18 * Math.min(s.streak, 6));
  else d -= (45 - sls) * 0.12 + s.f * 0.02;
  const before = s.f;
  s.f = Math.max(0, Math.min(100, s.f + d));
  return s.f - before;
}
export function breakStep(s) {
  const before = s.f;
  s.f = Math.max(0, s.f - (1.2 + s.f * 0.035));
  s.streak = 0;
  return s.f - before;
}

export function simulateSession(start, threshold, paced) {
  const s = { f: START_F, streak: 0, n: 0 };
  let t = 0, content = 0, breaks = 0, ended = false;
  const pts = [[0, START_F]];
  for (let i = start; i < start + 600; i++) {
    const it = getItem(i);
    contentStep(s, it.sls); t += DWELL_PIN; content++;
    pts.push([t, s.f]);
    if (s.f >= 100) { ended = true; break; }
    if (paced && it.sls > threshold) { breakStep(s); t += DWELL_BREAK; breaks++; pts.push([t, s.f]); }
  }
  return { content, breaks, t, ended, pts };
}

export function projectKpis(threshold, breaksOn) {
  const N = 20; let sc = 0, st = 0, pc = 0, pt = 0, pb = 0;
  for (let k = 0; k < N; k++) {
    const a = simulateSession(k * 37, threshold, false);
    const b = simulateSession(k * 37, threshold, breaksOn);
    sc += a.content; st += a.t; pc += b.content; pt += b.t; pb += b.breaks;
  }
  const std = { content: sc / N, t: st / N, ads: sc / N / AD_EVERY };
  const paced = { content: pc / N, t: pt / N, ads: pc / N / AD_EVERY, breaks: pb / N };
  return {
    std, paced,
    extension: (paced.t / std.t - 1) * 100,
    retainedAds: paced.ads - std.ads,
    overhead: paced.breaks / (paced.content + paced.breaks) * 100,
    curveStd: simulateSession(0, threshold, false),
    curvePaced: simulateSession(0, threshold, breaksOn),
  };
}

/* ───────────────────────── Zones ───────────────────────── */
export const ZONES = [
  { max: 40, label: 'Safe zone', tone: 'safe', icon: 'ShieldCheck' },
  { max: 70, label: 'Elevated', tone: 'warn', icon: 'Activity' },
  { max: 90, label: 'Strained', tone: 'strain', icon: 'TriangleAlert' },
  { max: 101, label: 'Sensory overload', tone: 'crit', icon: 'OctagonAlert' },
];
export const zoneOf = f => ZONES.find(z => f < z.max);
export const slsTone = (sls, th) => sls > th ? 'crit' : sls > th - 15 ? 'warn' : 'safe';
