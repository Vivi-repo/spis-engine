import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { drawPin } from '../art/drawPin';
import { InspectCtx } from './InspectCtx';
import { slsTone } from '../lib/fatigue';
import { fmt, toneText } from '../lib/format';

export function MetricBar({ label, short, value, raw, weight }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 items-baseline">
      <div className="text-[12px] font-medium">{label} <span className="text-muted font-mono text-[10px]">×{weight}</span></div>
      <div className="font-mono text-[12px] tnum">{fmt(value)}</div>
      <div className="col-span-2 h-1.5 rounded-full bg-surface2 overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
      <div className="col-span-2 font-mono text-[10px] text-muted">{raw}</div>
    </div>
  );
}

export function PinCard({ it, threshold, flashOn, feed }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const inspect = React.useContext(InspectCtx);
  useEffect(() => { if (ref.current) drawPin(ref.current, it); }, [it.id]);
  const over = it.sls > threshold;
  const tone = it.isBreak ? 'safe' : slsTone(it.sls, threshold);
  const flashing = flashOn && !it.isBreak && it.sls > 75;
  return (
    <article className={`group relative rounded-xl overflow-hidden border ${it.isBreak ? 'border-accent/50 bg-accent/5' : 'border-line bg-surface'} fade-in`}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        aria-label={`${it.title}. Sensory Loading Score ${fmt(it.sls)}. ${open ? 'Hide' : 'Show'} metrics`}
        className="block w-full text-left">
        <div className="relative overflow-hidden">
          <canvas ref={ref} className={`block w-full h-auto ${flashing ? 'pin-flash' : ''}`} style={{ aspectRatio: `1 / ${it.aspect}` }} />
          {it.isBreak && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-mono text-accent">
              <Icon name="Leaf" size={11} /> REST BREAK
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-200 bg-surface/95 px-2.5 py-1.5 font-mono text-[10px] tnum flex justify-between">
            <span>SF {fmt(it.sf, 0)}</span><span>CE {fmt(it.ce, 0)}</span><span>ED {fmt(it.ed, 0)}</span>
          </div>
        </div>
        <div className="px-2.5 py-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium leading-snug">{it.title}</div>
            <div className="font-mono text-[10px] text-muted mt-0.5">{it.isBreak ? `after pin #${it.after.idx + 1}` : `pin #${it.idx + 1}`}</div>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] tnum border border-current ${toneText[tone]}`}>
            {fmt(it.sls)}
            <Icon name="ChevronDown" size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </div>
      </button>
      {open && (
        <div className="border-t border-line bg-surface2/60 px-2.5 py-3 grid gap-3 fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="eyebrow">Vision worker output</span>
            {it.isBreak ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10.5px] font-medium"><Icon name="Leaf" size={11} />Injected buffer</span>
            ) : over ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-crit/15 text-crit px-2 py-0.5 text-[10.5px] font-medium"><Icon name="TriangleAlert" size={11} />Buffer required</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-safe/15 text-safe px-2 py-0.5 text-[10.5px] font-medium"><Icon name="ShieldCheck" size={11} />No buffer needed</span>
            )}
          </div>
          <MetricBar label="Spatial Frequency" weight="0.40" value={it.sf} raw={`fft_hf_ratio = ${fmt(it.raw.hf, 3)}`} />
          <MetricBar label="Color Entropy" weight="0.35" value={it.ce} raw={`shannon_H = ${fmt(it.raw.H, 2)} / 8.00 bits`} />
          <MetricBar label="Edge Density" weight="0.25" value={it.ed} raw={`canny_ratio = ${fmt(it.raw.edge * 100, 2)}% / 15% cap`} />
          <div className="rounded-lg bg-surface border border-line px-2.5 py-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium">Sensory Loading Score</span>
              <span className={`font-display text-[22px] font-bold tnum ${toneText[tone]}`}>{fmt(it.sls)}</span>
            </div>
            <div className="font-mono text-[10px] text-muted mt-1 break-words">
              0.40×{fmt(it.sf)} + 0.35×{fmt(it.ce)} + 0.25×{fmt(it.ed)}
            </div>
          </div>
          <button type="button" onClick={() => inspect(it)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 text-[11.5px] font-medium hover:border-accent hover:text-accent">
            <Icon name="Braces" size={13} />Inspect payload · 32 B
          </button>
          <p className="text-[11px] text-muted leading-relaxed">
            {it.isBreak
              ? `Inserted because pin #${it.after.idx + 1} scored ${fmt(it.after.sls)}, above the ${threshold} trigger.`
              : over
                ? feed === 'standard'
                  ? `Above the ${threshold} trigger. The un-throttled feed takes no action.`
                  : `Above the ${threshold} trigger. SPIS placed a rest break directly after this pin.`
                : `Below the ${threshold} trigger. Served without intervention.`}
          </p>
        </div>
      )}
    </article>
  );
}
