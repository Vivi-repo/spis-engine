import { Icon } from './Icon';
import { ZONES, zoneOf } from '../lib/fatigue';
import { fmt, toneBg, toneText } from '../lib/format';

export function LiveTrace({ std, paced }) {
  const W = 220, H = 56;
  const len = Math.max(std.length, paced.length, 20);
  const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${(i / (len - 1)) * W},${H - (v / 100) * H}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" role="img" aria-label="Live fatigue trace for both feeds">
      <line x1="0" x2={W} y1={H * 0.3} y2={H * 0.3} stroke="rgb(var(--line))" strokeDasharray="3 3" />
      <path d={path(std)} fill="none" stroke="rgb(var(--std))" strokeWidth="2" strokeLinejoin="round" />
      <path d={path(paced)} fill="none" stroke="rgb(var(--accent))" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function FatigueMeter({ sessions, active, onReset }) {
  const s = sessions[active || 'standard'];
  const other = sessions[active === 'paced' ? 'standard' : 'paced'];
  const f = s.f; const z = zoneOf(f);
  const crit = f >= 90;
  const last = s.last;
  return (
    <section aria-label="Cognitive Fatigue Meter" className="rounded-2xl border border-line bg-surface p-4 sm:p-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] items-center">
      <div className="grid gap-3 min-w-0">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow flex items-center gap-1.5"><Icon name="Brain" size={13} />Cognitive Fatigue Meter · viewing {active === 'paced' ? 'Sensory-Paced feed' : active === 'standard' ? 'Standard feed' : 'no feed yet'}</div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className={`font-display text-[44px] leading-none font-bold tnum ${toneText[z.tone]} ${crit ? 'meter-crit' : ''}`}>{fmt(f, 0)}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium ${toneText[z.tone]} border border-current`} aria-live="polite">
                <Icon name={z.icon} size={14} />{z.label}
              </span>
            </div>
          </div>
          <div className="text-[12.5px] text-muted max-w-[420px] min-h-[38px]" aria-live="polite">
            {last ? (
              <span>
                <b className={`font-mono tnum ${last.d > 0 ? 'text-crit' : 'text-safe'}`}>{last.d > 0 ? '+' : ''}{fmt(last.d)}</b>{' '}
                {last.isBreak ? 'Visual rest break absorbed' : <>“{last.title}” · SLS {fmt(last.sls)}</>}
                {!last.isBreak && last.streak > 1 && <> · high-stimulus streak ×{last.streak}</>}
              </span>
            ) : (
              <span>Scroll either feed, press <b>Scroll</b>, or start <b>Auto-scroll</b>. Each pin that passes the fold adds to this user’s sensory load.</span>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="h-5 rounded-full overflow-hidden flex bg-surface2" aria-hidden="true">
            {ZONES.map((zz, i) => {
              const lo = i ? ZONES[i - 1].max : 0, hi = Math.min(zz.max, 100);
              return <div key={zz.label} className={`${toneBg[zz.tone]} opacity-15 h-full`} style={{ width: `${hi - lo}%` }} />;
            })}
          </div>
          <div className={`absolute left-0 top-0 h-5 rounded-full transition-[width] duration-500 ${toneBg[z.tone]} ${crit ? 'meter-crit' : ''}`} style={{ width: `${Math.max(2, f)}%` }}
            role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f)} aria-label="Cognitive fatigue" />
          {active && (
            <div className="absolute -top-1 h-7 w-0.5 bg-ink/60 transition-[left] duration-500" style={{ left: `${other.f}%` }} title="Other feed">
              <span className="absolute top-7 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted">{active === 'paced' ? 'standard' : 'paced'} {fmt(other.f, 0)}</span>
            </div>
          )}
          <div className="flex justify-between font-mono text-[10px] text-muted mt-5 tnum">
            <span>0 · rested</span><span className="hidden sm:inline">40</span><span className="hidden sm:inline">70</span><span className="hidden sm:inline">90</span><span>100 · user leaves</span>
          </div>
        </div>
      </div>
      <div className="grid gap-1 border-t lg:border-t-0 lg:border-l border-line pt-3 lg:pt-0 lg:pl-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Live trace</span>
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-ink"><Icon name="RotateCcw" size={12} />Reset</button>
        </div>
        <LiveTrace std={sessions.standard.trace} paced={sessions.paced.trace} />
        <div className="flex gap-3 font-mono text-[10.5px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-std inline-block" />Standard</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-accent inline-block" />Paced</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 border-t border-dashed border-line inline-block" />Strain line</span>
        </div>
      </div>
    </section>
  );
}

/* Projected fatigue curve for a typical session (deterministic) */
