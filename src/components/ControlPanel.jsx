import { Icon } from './Icon';
import { CurveChart } from './CurveChart';
import { HealthCard } from './HealthCard';
import { fmt, money } from '../lib/format';

export function Kpi({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 min-w-0">
      <div className="text-[11.5px] text-muted leading-snug">{label}</div>
      <div className={`font-display text-[24px] font-bold tnum leading-tight mt-0.5 ${tone || ''}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted mt-0.5 tnum">{sub}</div>}
    </div>
  );
}

export function Toggle({ id, label, hint, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex items-start justify-between gap-3 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block text-[11.5px] text-muted leading-snug">{hint}</span>}
      </span>
      <span className="relative shrink-0 mt-0.5">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="block w-9 h-5 rounded-full bg-surface2 border border-line peer-checked:bg-accent peer-checked:border-accent transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function NumField({ id, label, value, onChange, step, prefix, suffix }) {
  return (
    <label htmlFor={id} className="grid gap-1 min-w-0">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="flex items-center rounded-lg border border-line bg-surface px-2 focus-within:border-accent">
        {prefix && <span className="text-[12px] text-muted">{prefix}</span>}
        <input id={id} type="number" step={step} min="0" value={value} onChange={e => onChange(Math.max(0, +e.target.value || 0))}
          className="w-full min-w-0 bg-transparent py-1.5 px-1 text-[13px] font-mono tnum outline-none" />
        {suffix && <span className="text-[12px] text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

export function ControlPanel({ threshold, setThreshold, breaksOn, setBreaksOn, flashOn, setFlashOn, kpi, assume, setAssume, traces, infra, setInfra, outage }) {
  // Only sessions that would have ended in overload can be recovered; everyone else leaves for their own reasons.
  const daily = assume.sessions * 1e6 * (assume.eligible / 100) * (assume.overload / 100) * kpi.retainedAds * (assume.fill / 100) * assume.ecpm / 1000;
  const annual = daily * 365;
  return (
    <aside className="grid gap-4 content-start min-w-0" aria-label="Solutions Engineering Control Panel">
      <section className="rounded-2xl border border-line bg-surface p-4 grid gap-4">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Icon name="SlidersHorizontal" size={13} />Solutions engineering controls</div>
          <h2 className="font-display text-[19px] font-bold mt-1">Tune the middleware</h2>
        </div>
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="threshold" className="text-[13px] font-medium">Sensory Threshold Trigger Limit</label>
            <span className="font-display text-[22px] font-bold tnum text-accent">{threshold}</span>
          </div>
          <input id="threshold" type="range" min="40" max="90" step="1" value={threshold} onChange={e => setThreshold(+e.target.value)} className="w-full" />
          <div className="flex justify-between font-mono text-[10px] text-muted"><span>40 · aggressive</span><span>65 default</span><span>90 · lenient</span></div>
          <p className="text-[11.5px] text-muted leading-snug">Pins scoring above this SLS get a rest break after them in the paced feed. Lower values protect more users but spend more feed slots on buffers.</p>
        </div>
        <Toggle id="breaks" label="Inject Visual Rest Breaks" hint="Turn off to see the paced feed behave like the control." checked={breaksOn} onChange={setBreaksOn} />
        <Toggle id="flash" label="Animate high-stimulus pins" hint="Pulses pins above SLS 75 at under 3 Hz. Off when your system asks for reduced motion." checked={flashOn} onChange={setFlashOn} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 grid gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Icon name="TrendingUp" size={13} />Overload model · 20 simulated sessions</div>
          <h2 className="font-display text-[19px] font-bold mt-1">What overload is costing</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Kpi label="Pins before overload" value={`${fmt(kpi.std.content, 0)} → ${fmt(kpi.paced.content, 0)}`} tone="text-accent"
            sub="un-throttled → paced" />
          <Kpi label="Ad windows recovered per overload exit" value={`+${fmt(kpi.retainedAds)}`}
            sub={`${fmt(kpi.std.ads)} → ${fmt(kpi.paced.ads)} before overload`} />
          <Kpi label="Time to overload" value={`${fmt(kpi.std.t / 60)} → ${fmt(kpi.paced.t / 60)}`}
            sub={`minutes · +${fmt(kpi.extension, 0)}% if the user would have kept going`} />
          <Kpi label="Buffer overhead" value={`${fmt(kpi.overhead, 0)}%`} sub={`${fmt(kpi.paced.breaks, 0)} breaks per session`}
            tone={kpi.overhead > 40 ? 'text-warn' : ''} />
        </div>
        <p className="text-[11px] text-muted leading-snug">Simulated users scroll until overload stops them. Real users also leave because they found what they wanted, so these figures apply only to sessions that end in overload.</p>
        <div className="rounded-xl border border-line p-3 grid gap-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[12.5px] font-medium">Projected fatigue, one typical session</span>
            <span className="flex gap-3 font-mono text-[10px] text-muted">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-std inline-block" />Standard</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-accent inline-block" />Paced</span>
            </span>
          </div>
          <CurveChart kpi={kpi} />
          <p className="text-[11px] text-muted leading-snug">Dots mark the moment the simulated user leaves. Hover the chart to compare both feeds at any minute.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 grid gap-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Icon name="DollarSign" size={13} />Revenue bridge · illustrative</div>
          <h2 className="font-display text-[19px] font-bold mt-1">{money(annual)} <span className="text-[14px] font-medium text-muted">per year recovered</span></h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumField id="a-sessions" label="Daily sessions" value={assume.sessions} step="1" suffix="M" onChange={v => setAssume(a => ({ ...a, sessions: v }))} />
          <NumField id="a-eligible" label="Sensory-sensitive share" value={assume.eligible} step="1" suffix="%" onChange={v => setAssume(a => ({ ...a, eligible: v }))} />
          <NumField id="a-ecpm" label="eCPM" value={assume.ecpm} step="0.5" prefix="$" onChange={v => setAssume(a => ({ ...a, ecpm: v }))} />
          <NumField id="a-fill" label="Ad fill rate" value={assume.fill} step="1" suffix="%" onChange={v => setAssume(a => ({ ...a, fill: v }))} />
          <div className="col-span-2">
            <NumField id="a-overload" label="Their sessions that end in overload (unknown: measure first)" value={assume.overload} step="1" suffix="%" onChange={v => setAssume(a => ({ ...a, overload: Math.min(100, v) }))} />
          </div>
        </div>
        <div className="font-mono text-[10.5px] text-muted leading-relaxed break-words">
          {assume.sessions}M sessions × {assume.eligible}% sensitive × {assume.overload}% overload exits × {fmt(kpi.retainedAds)} windows × {assume.fill}% fill × ${assume.ecpm} / 1000 × 365
        </div>
        <p className="text-[11px] text-muted leading-snug">Placeholder assumptions. The overload-exit share drives the result and nobody knows it yet; measuring it from session logs is the first validation step.</p>
      </section>

      <HealthCard traces={traces} infra={infra} setInfra={setInfra} outage={outage} annualRevenue={annual} />
    </aside>
  );
}
