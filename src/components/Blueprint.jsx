import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { PayloadInspector } from './PayloadInspector';
import { fmt, moneyFine } from '../lib/format';
import { INGEST_MS, STORAGE_TIERS, VCPU_HR, backfillCost, tierCost } from '../lib/infra';
import { buildPacedList, getItem } from '../lib/queue';

export const ARCH_NODES = [
  { id: 'ranker', x: 10, y: 50, w: 190, h: 82, step: 'STEP 1', title: 'Recommendation Engine', sub: 'e.g. OmniSage · top 500', foot: 'unmodified', icon: 'Server' },
  { id: 'proxy', x: 240, y: 50, w: 190, h: 82, step: 'STEP 2', title: 'SPIS Post-Ranking Proxy', sub: 'hydrates 32 B per pin', foot: '< 1.2 ms budget', icon: 'Network' },
  { id: 'edge', x: 470, y: 50, w: 190, h: 82, step: 'STEP 3', title: 'Client-Side Edge Worker', sub: 'in-browser, before render', foot: 'paces + injects breaks', icon: 'Monitor' },
  { id: 'feed', x: 700, y: 50, w: 190, h: 82, step: 'RESULT', title: 'Paced feed render', sub: 'same pins, same order', foot: '+ rest breaks', icon: 'LayoutGrid' },
  { id: 'store', x: 240, y: 170, w: 190, h: 60, step: 'STORE', title: 'Sensory metric store', sub: '32 B / pin · KV', icon: 'Database' },
  { id: 'upload', x: 10, y: 270, w: 190, h: 62, step: 'OFFLINE', title: 'Asset ingestion', sub: 'new pin uploaded', icon: 'Upload' },
  { id: 'vision', x: 240, y: 270, w: 190, h: 62, step: 'OFFLINE', title: 'Async vision worker', sub: 'FFT · entropy · Canny', icon: 'ScanLine' },
];

export function ArchDiagram({ selected, onSelect, outage, activeStage, reduced }) {
  const flow = reduced ? '' : 'arch-flow';
  const n = id => ARCH_NODES.find(x => x.id === id);
  const midY = 91;
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 900 345" className="w-full min-w-[680px] h-auto block" role="group" aria-label="SPIS system diagram">
        <text x="10" y="28" fontSize="10.5" letterSpacing="0.08em" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">SERVING PATH · PER REQUEST</text>
        <text x="10" y="258" fontSize="10.5" letterSpacing="0.08em" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">OFFLINE · ONCE PER IMAGE AT INGESTION</text>
        <line x1="10" x2="890" y1="246" y2="246" stroke="rgb(var(--line))" />
        {/* serving edges */}
        <path d={`M200,${midY} H240`} className={outage ? '' : flow} stroke={outage ? 'rgb(var(--line))' : 'rgb(var(--accent))'} strokeWidth="2.5" fill="none" strokeDasharray="6 5" />
        <path d={`M430,${midY} H470`} className={outage ? '' : flow} stroke={outage ? 'rgb(var(--line))' : 'rgb(var(--accent))'} strokeWidth="2.5" fill="none" strokeDasharray="6 5" />
        <path d={`M660,${midY} H700`} className={flow} stroke="rgb(var(--accent))" strokeWidth="2.5" fill="none" strokeDasharray="6 5" />
        {outage && (
          <g>
            <path d={`M200,70 C220,36 450,36 470,70`} className={flow} stroke="rgb(var(--warn))" strokeWidth="2.5" fill="none" strokeDasharray="6 5" />
            <text x="335" y="40" textAnchor="middle" fontSize="10.5" fill="rgb(var(--warn))" fontFamily="IBM Plex Mono, monospace">fail-open bypass</text>
          </g>
        )}
        {/* store link + offline */}
        <path d="M335,132 V170" stroke="rgb(var(--muted))" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
        <text x="342" y="155" fontSize="10" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">read 32 B/pin</text>
        <path d="M335,270 V230" stroke="rgb(var(--muted))" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
        <text x="342" y="254" fontSize="10" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">write once</text>
        <path d="M200,301 H240" stroke="rgb(var(--muted))" strokeWidth="1.5" fill="none" strokeDasharray="3 3" />
        <g fontFamily="IBM Plex Sans, sans-serif" fill="rgb(var(--muted))" fontSize="11.5">
          <text x="470" y="284">Runs off the serving path, at upload time.</text>
          <text x="470" y="302">Ranking traffic never waits on pixel work.</text>
          <text x="470" y="320">Backfill once; new uploads stream through.</text>
        </g>
        {ARCH_NODES.map(nd => {
          const sel = selected === nd.id, act = activeStage === nd.id, down = outage && nd.id === 'proxy';
          const big = nd.h > 70;
          return (
            <g key={nd.id} role="button" tabIndex={0} aria-pressed={sel} aria-label={`${nd.title}. ${nd.sub}`}
              onClick={() => onSelect(nd.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(nd.id); } }}
              className="cursor-pointer" style={{ outline: 'none' }}>
              <rect x={nd.x} y={nd.y} width={nd.w} height={nd.h} rx="12"
                fill={act ? 'rgb(var(--accent) / 0.14)' : nd.id === 'proxy' && !down ? 'rgb(var(--accent) / 0.07)' : 'rgb(var(--surface))'}
                stroke={sel || act ? 'rgb(var(--accent))' : down ? 'rgb(var(--warn))' : 'rgb(var(--line))'} strokeWidth={sel || act ? 2.2 : 1.2}
                strokeDasharray={down ? '5 4' : undefined} opacity={down ? 0.7 : 1} />
              <text x={nd.x + 14} y={nd.y + 20} fontSize="9.5" letterSpacing="0.08em" fill={nd.id === 'proxy' ? 'rgb(var(--accent))' : 'rgb(var(--muted))'} fontFamily="IBM Plex Mono, monospace">{down ? 'BYPASSED' : nd.step}</text>
              <text x={nd.x + 14} y={nd.y + 39} fontSize="13" fontWeight="600" fill="rgb(var(--ink))" fontFamily="IBM Plex Sans, sans-serif">{nd.title}</text>
              <text x={nd.x + 14} y={nd.y + 55} fontSize="11" fill="rgb(var(--muted))" fontFamily="IBM Plex Sans, sans-serif">{nd.sub}</text>
              {big && nd.foot && <text x={nd.x + 14} y={nd.y + 72} fontSize="10" fill={nd.id === 'ranker' ? 'rgb(var(--safe))' : 'rgb(var(--accent))'} fontFamily="IBM Plex Mono, monospace">{nd.foot}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const STAGE_INFO = {
  ranker: { title: 'Step 1 · Core Recommendation Engine', does: 'Generates and scores the top 500 candidate pins exactly as it does today.', input: 'User request, embeddings, engagement signals', output: '500 ranked candidates (pin_id, rank, score)', budget: 'Unchanged', never: 'SPIS does not read model weights, change features, re-rank, or require retraining.' },
  proxy: { title: 'Step 2 · SPIS Post-Ranking Proxy', does: 'Intercepts the ranker response at the API gateway and attaches each pin’s 32-byte sensory record. No pixels are processed here.', input: '500 candidate pin_ids', output: 'Same 500 candidates in the same order, each with a "spis" field', budget: '< 1.2 ms p99 added', never: 'Never reorders, drops, or rescores. If the store is slow or down, it forwards the payload untouched (fail-open).' },
  edge: { title: 'Step 3 · Client-Side Edge Worker', does: 'A Service Worker reads the 2-byte SLS from each record and plans where rest breaks go before the UI thread renders the page.', input: 'Hydrated page of pins + trigger threshold (remote config)', output: 'Render plan: original pins + rest-break slots', budget: '≈ 0.1 to 0.3 ms per page on device', never: 'Never hides or reorders ranked pins. With no "spis" field it renders the feed as-is.' },
  feed: { title: 'Result · Paced feed render', does: 'The client renders the ranked pins in their original order, with calm buffer tiles placed after high-load pins.', input: 'Render plan', output: 'Paced feed', budget: 'Same frame budget as today', never: 'Ad slots keep their positions relative to ranked content.' },
  store: { title: 'Sensory metric store', does: 'Holds one fixed 32-byte record per pin. Best stored as an attribute on the pin record the API already fetches, so hydration adds bytes, not a round trip.', input: 'Writes from the vision worker', output: 'Batched reads by the proxy', budget: 'See storage options below', never: 'No per-user data. Records are content metadata only.' },
  upload: { title: 'Asset ingestion', does: 'Existing upload pipeline emits an event when a pin image lands.', input: 'Image asset', output: 'Queue message to the vision worker', budget: 'Async, not user-facing', never: 'Upload latency is unaffected; scoring happens after the upload returns.' },
  vision: { title: 'Async vision worker', does: 'OpenCV/SciPy job computes FFT high-frequency ratio, 256-bin Shannon entropy and Canny edge ratio on a downscaled copy, then writes the record.', input: 'Downscaled image (≈512 px)', output: '32-byte record', budget: `≈ ${INGEST_MS} ms CPU per image, once`, never: 'Runs on batch/spot capacity, never in the request path.' },
};

export function Waterfall({ trace }) {
  const total = trace.ranker + trace.hydrate;
  const rows = [
    { k: 'Core ranker (existing, illustrative)', v: trace.ranker, start: 0, cls: 'bg-muted/40' },
    { k: 'SPIS hydration (added)', v: trace.hydrate, start: trace.ranker, cls: 'bg-accent' },
    { k: 'Edge worker pacing (on device)', v: trace.edge, start: total, cls: 'bg-safe', device: true },
  ];
  const span = total + trace.edge;
  return (
    <div className="grid gap-1.5">
      {rows.map(r => (
        <div key={r.k} className="grid grid-cols-[minmax(0,190px)_minmax(0,1fr)_64px] gap-2 items-center">
          <span className="text-[11.5px] truncate">{r.k}</span>
          <span className="relative h-3 rounded bg-surface2">
            <span className={`absolute top-0 h-3 rounded ${r.cls}`} style={{ left: `${(r.start / span) * 100}%`, width: `max(3px, ${(r.v / span) * 100}%)` }} />
          </span>
          <span className="font-mono text-[11px] tnum text-right">{fmt(r.v, 2)} ms</span>
        </div>
      ))}
      <div className="font-mono text-[10.5px] text-muted">Server-side time added by SPIS: <b className="text-ink">{fmt(trace.hydrate, 2)} ms</b> of {fmt(total, 1)} ms ({fmt(trace.hydrate / total * 100, 1)}%). Simulated trace.</div>
    </div>
  );
}

export function Blueprint({ threshold, breaksOn, outage, setOutage, traces, pushTrace, infra, setInfra, reduced, onInspect }) {
  const [selected, setSelected] = useState('proxy');
  const [stage, setStage] = useState(null);
  const [running, setRunning] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(11);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const candidates = useMemo(() => Array.from({ length: 500 }, (_, i) => getItem(i)), []);
  const edge = useMemo(() => {
    const plan = buildPacedList(500, threshold, breaksOn && !outage);
    const content = plan.filter(x => !x.isBreak);
    const preserved = content.every((x, i) => x.idx === candidates[i].idx);
    return { high: candidates.filter(x => x.sls > threshold).length, breaks: plan.length - content.length, preserved, kept: content.length };
  }, [threshold, breaksOn, outage, candidates]);

  const run = () => {
    if (running) return;
    timers.current.forEach(clearTimeout); timers.current = [];
    setRunning(true);
    const seq = outage ? ['ranker', 'edge', 'feed'] : ['ranker', 'proxy', 'edge', 'feed'];
    const stepMs = reduced ? 0 : 280;
    seq.forEach((id, i) => timers.current.push(setTimeout(() => setStage(id), i * stepMs)));
    timers.current.push(setTimeout(() => { setStage(null); setRunning(false); pushTrace(outage); }, seq.length * stepMs + 40));
  };

  const last = traces[traces.length - 1];
  const info = STAGE_INFO[selected];
  const sample = getItem(sampleIdx);

  return (
    <section className="grid gap-4 min-w-0" aria-label="Zero-Disruption Architecture Blueprint">
      <div className="rounded-2xl border border-line bg-surface p-4 grid gap-3">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-1.5"><Icon name="Network" size={13} />Architecture Blueprint</div>
            <h2 className="font-display text-[21px] font-bold mt-1">Zero-disruption, downstream of ranking</h2>
            <p className="text-[12.5px] text-muted mt-1 max-w-[660px] leading-relaxed">
              SPIS sits after the recommender, not inside it. Pixel analysis happens once at upload. At request time the proxy only attaches a 32-byte record, and the browser decides where rest breaks go.
              Click any box for its contract.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label htmlFor="outage" className="inline-flex items-center gap-2 text-[12.5px] cursor-pointer">
              <input id="outage" type="checkbox" checked={outage} onChange={e => setOutage(e.target.checked)} className="w-4 h-4 accent-[rgb(var(--warn))]" />
              Simulate SPIS outage
            </label>
            <button type="button" onClick={run} disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white px-3 py-1.5 text-[12.5px] font-medium disabled:opacity-60">
              <Icon name="Send" size={14} />{running ? 'Tracing…' : 'Send test request'}
            </button>
          </div>
        </div>
        <ArchDiagram selected={selected} onSelect={setSelected} outage={outage} activeStage={stage} reduced={reduced} />
        {outage && (
          <div className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[12.5px] flex items-start gap-2">
            <Icon name="ShieldOff" size={15} className="text-warn mt-0.5 shrink-0" />
            <span>Proxy is down. Ranked pins still flow to the client in the same order with no "spis" field, so the paced feed falls back to the standard feed. Nothing errors; the retention gain pauses until SPIS recovers. Check the Feeds tab and the KPI panel.</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4 grid gap-2 content-start">
          <div className="eyebrow">Contract</div>
          <h3 className="font-display text-[16px] font-bold">{info.title}</h3>
          <p className="text-[12.5px] leading-relaxed">{info.does}</p>
          <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px]">
            <dt className="text-muted">Input</dt><dd className="m-0">{info.input}</dd>
            <dt className="text-muted">Output</dt><dd className="m-0">{info.output}</dd>
            <dt className="text-muted">Latency</dt><dd className="m-0 font-mono">{info.budget}</dd>
            <dt className="text-muted">Never</dt><dd className="m-0">{info.never}</dd>
          </dl>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 grid gap-3 content-start">
          <div className="flex items-center justify-between gap-2">
            <div className="eyebrow">Last request trace</div>
            <span className="font-mono text-[10.5px] text-muted tnum">{traces.length} requests traced</span>
          </div>
          {last ? <Waterfall trace={last} /> : <p className="text-[12px] text-muted">Send a test request to trace it.</p>}
          <div className="border-t border-line pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Candidates in', '500'],
              ['Kept, in order', `${edge.kept} / 500`],
              ['Above trigger', `${edge.high}`],
              ['Breaks planned', `${edge.breaks}`],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0"><div className="text-[11px] text-muted">{k}</div><div className="font-display text-[18px] font-bold tnum">{v}</div></div>
            ))}
          </div>
          <div className={`text-[12px] inline-flex items-center gap-1.5 ${edge.preserved ? 'text-safe' : 'text-crit'}`}>
            <Icon name="CircleCheck" size={14} />
            {edge.preserved ? 'Ranking order preserved: Kendall τ = 1.00, 0 candidates dropped.' : 'Order mismatch detected.'}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 grid gap-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="eyebrow flex items-center gap-1.5"><Icon name="Database" size={13} />Storage options</div>
            <h3 className="font-display text-[16px] font-bold mt-0.5">Where the 32 bytes live</h3>
          </div>
          <label htmlFor="pins-b" className="inline-flex items-center gap-2 text-[12px]">
            Pins in catalog
            <span className="flex items-center rounded-lg border border-line px-2">
              <input id="pins-b" type="number" min="0" step="1" value={infra.pinsB} onChange={e => setInfra(s => ({ ...s, pinsB: Math.max(0, +e.target.value || 0) }))}
                className="w-16 bg-transparent py-1 font-mono tnum outline-none text-right" />
              <span className="text-muted ml-1">B</span>
            </span>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse min-w-[620px]">
            <thead>
              <tr className="text-left text-muted text-[11px]">
                <th className="font-normal pb-1.5 pr-3">Tier</th><th className="font-normal pb-1.5 pr-3">Bytes / pin</th><th className="font-normal pb-1.5 pr-3">List $/GB-mo</th><th className="font-normal pb-1.5 pr-3 text-right">Monthly</th><th className="font-normal pb-1.5">Serving read</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_TIERS.map(t => (
                <tr key={t.id} onClick={() => setInfra(s => ({ ...s, tier: t.id }))}
                  className={`border-t border-line cursor-pointer ${infra.tier === t.id ? 'bg-accent/10' : 'hover:bg-surface2/60'}`}>
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <input type="radio" name="tier" aria-label={t.name} checked={infra.tier === t.id} onChange={() => setInfra(s => ({ ...s, tier: t.id }))} />
                      {t.name}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono tnum">{32 + t.overhead}</td>
                  <td className="py-1.5 pr-3 font-mono tnum">${t.perGB}</td>
                  <td className="py-1.5 pr-3 font-mono tnum text-right font-medium">{moneyFine(tierCost(t, infra.pinsB))}</td>
                  <td className={`py-1.5 ${t.fits ? '' : 'text-muted'}`}>{t.read}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-mono text-[10.5px] text-muted leading-relaxed">
          Monthly = pins × bytes per pin × $/GB-month. Approximate public list prices (us-east-1), before replicas and reserved-capacity discounts. Per-item overhead: DynamoDB ≈ 100 B, Redis ≈ 56 B.
          One-time backfill compute: {infra.pinsB}B pins × {INGEST_MS} ms ≈ {fmt(infra.pinsB * 1e9 * INGEST_MS / 1000 / 3600 / 1000, 1)}K vCPU-hours ≈ {moneyFine(backfillCost(infra.pinsB))} at ${VCPU_HR}/vCPU-hr.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 grid gap-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="eyebrow flex items-center gap-1.5"><Icon name="Braces" size={13} />Payload inspector</div>
            <h3 className="font-display text-[16px] font-bold mt-0.5">What one hydrated pin looks like</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous pin" onClick={() => setSampleIdx(i => Math.max(0, i - 1))} className="rounded-lg border border-line p-1 hover:bg-surface2"><Icon name="ChevronLeft" size={15} /></button>
            <span className="font-mono text-[12px] tnum w-36 text-center truncate">#{sampleIdx + 1} · SLS {fmt(sample.sls)}</span>
            <button type="button" aria-label="Next pin" onClick={() => setSampleIdx(i => i + 1)} className="rounded-lg border border-line p-1 hover:bg-surface2"><Icon name="ChevronRight" size={15} /></button>
          </div>
        </div>
        <PayloadInspector it={sample} threshold={threshold} outage={outage} />
      </div>
    </section>
  );
}
