import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { GROUP_TONE, SPIS_LAYOUT, encodeSpis } from '../lib/spisRecord';

export function PayloadInspector({ it, threshold, outage }) {
  const { bytes, b64, vals } = useMemo(() => encodeSpis(it), [it.id]);
  const [hl, setHl] = useState(null);
  const field = off => SPIS_LAYOUT.find(f => off >= f.off && off < f.off + f.size);
  const pinId = String(8174429310045000 + it.idx * 37);
  const hex = n => n.toString(16).padStart(2, '0');
  const show = f => f.type === 'pad' ? '—' : f.name === 'worker_version' ? 'v2.3' : f.name === 'flags' ? `0b${vals.flags.toString(2).padStart(4, '0')}` : String(vals[f.name]);
  return (
    <div className="grid gap-3 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[11px] font-medium"><Icon name="Binary" size={12} />32 B record · 26 B used</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2 py-0.5 text-[11px] font-mono">+44 B on the wire (base64)</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-safe/15 text-safe px-2 py-0.5 text-[11px] font-medium"><Icon name="CircleCheck" size={12} />rank &amp; score untouched</span>
      </div>
      <div className="rounded-xl bg-[rgb(14_20_28)] text-[rgb(214_224_236)] p-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto">
        <pre className="m-0 whitespace-pre"><span className="text-[rgb(126_200_150)]">{'// Compute Cost: 0ms runtime server latency. Metrics pre-computed asynchronously at asset ingestion.\n'}</span><span className="text-[rgb(126_200_150)]">{'// Serving cost: one co-located 32-byte read during existing metadata hydration (budget < 1.2 ms p99).\n'}</span><span className="text-[rgb(126_200_150)]">{`// ${outage ? 'SPIS proxy unavailable: payload passes through un-hydrated (fail-open).' : 'Hydrated by SPIS post-ranking proxy. Core ranker fields are forwarded byte-for-byte.'}\n`}</span>{'{\n'}
{'  "pin_id": '}<span className="text-[rgb(240_190_120)]">"{pinId}"</span>{',\n'}
{'  "rank": '}<span className="text-[rgb(140_180_250)]">{it.idx + 1}</span>{',          '}<span className="text-[rgb(126_200_150)]">// from core ranker, unchanged</span>{'\n'}
{'  "score": '}<span className="text-[rgb(140_180_250)]">{(0.98 - it.idx * 0.0011).toFixed(4)}</span>{',    '}<span className="text-[rgb(126_200_150)]">// from core ranker, unchanged</span>{'\n'}
{'  "media": { "w": 736, "h": '}<span className="text-[rgb(140_180_250)]">{Math.round(736 * it.aspect)}</span>{' },\n'}
{outage
  ? <>{'  "spis": '}<span className="text-[rgb(140_180_250)]">null</span>{'          '}<span className="text-[rgb(126_200_150)]">// edge worker treats as "no pacing"</span>{'\n'}</>
  : <>{'  "spis": '}<span className="text-[rgb(240_190_120)]">"{b64}"</span>{'\n'}</>}
{'}'}</pre>
      </div>
      <div className="grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)] items-start">
        <div className="overflow-x-auto">
          <div className="eyebrow mb-1">Decoded bytes · little-endian</div>
          <div className="grid grid-cols-[repeat(16,minmax(0,auto))] gap-x-1 gap-y-1 font-mono text-[11px] tnum w-max">
            {Array.from(bytes).map((b, i) => {
              const f = field(i);
              const on = hl && hl === f.name;
              return (
                <span key={i} onPointerEnter={() => setHl(f.name)} onPointerLeave={() => setHl(null)}
                  className={`px-0.5 rounded ${GROUP_TONE[f.group]} ${on ? 'bg-accent/20 outline outline-1 outline-accent' : ''}`}>{hex(b)}</span>
              );
            })}
          </div>
          <div className="font-mono text-[10px] text-muted mt-1">offset 0x00 to 0x1f · hover a byte or a row</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px] border-collapse">
            <thead>
              <tr className="text-left text-muted font-mono text-[10px]">
                <th className="font-normal pr-2 pb-1">off</th><th className="font-normal pr-2 pb-1">type</th><th className="font-normal pr-2 pb-1">field</th><th className="font-normal pb-1 text-right">value</th>
              </tr>
            </thead>
            <tbody>
              {SPIS_LAYOUT.map(f => (
                <tr key={f.name} onPointerEnter={() => setHl(f.name)} onPointerLeave={() => setHl(null)}
                  className={`border-t border-line ${hl === f.name ? 'bg-accent/10' : ''}`}>
                  <td className="font-mono pr-2 py-0.5 text-muted tnum">{f.off.toString().padStart(2, '0')}</td>
                  <td className={`font-mono pr-2 py-0.5 ${GROUP_TONE[f.group]}`}>{f.type}{f.size > 1 && f.type === 'pad' ? `[${f.size}]` : ''}</td>
                  <td className="pr-2 py-0.5">{f.name}</td>
                  <td className="font-mono py-0.5 text-right tnum">{show(f)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11.5px] text-muted leading-relaxed">
        Flags: bit0 animated, bit1 text-heavy, bit2 high-contrast, bit3 rest break. The edge worker reads 2 bytes (SLS) to decide pacing at the current trigger of {threshold}; the rest feeds analytics and the Mind Map.
      </p>
    </div>
  );
}

export function InspectorModal({ it, onClose, threshold, outage }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!it) return;
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [it]);
  if (!it) return null;
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-center p-4" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="insp-title" className="w-full max-w-[860px] max-h-[88vh] overflow-y-auto rounded-2xl border border-line bg-surface p-4 sm:p-5 grid gap-3 shadow-2xl fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-1.5"><Icon name="Braces" size={13} />Payload inspector</div>
            <h2 id="insp-title" className="font-display text-[19px] font-bold mt-0.5">{it.title} <span className="text-muted font-medium text-[14px]">{it.isBreak ? `rest break after pin #${it.after.idx + 1}` : `pin #${it.idx + 1}`}</span></h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close payload inspector" className="rounded-lg border border-line p-1.5 hover:bg-surface2"><Icon name="X" size={16} /></button>
        </div>
        <PayloadInspector it={it} threshold={threshold} outage={outage} />
      </div>
    </div>
  );
}
