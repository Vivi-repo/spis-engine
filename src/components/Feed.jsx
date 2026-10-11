import { useEffect, useRef, useCallback } from 'react';
import { Icon } from './Icon';
import { PinCard } from './PinCard';
import { DWELL_PIN, zoneOf } from '../lib/fatigue';
import { fmt, toneText } from '../lib/format';

export function Masonry({ list, threshold, flashOn, feed }) {
  const cols = [[], []]; const h = [0, 0];
  list.forEach((it, order) => {
    const c = h[0] <= h[1] ? 0 : 1;
    cols[c].push({ it, order }); h[c] += it.aspect + 0.25;
  });
  return (
    <div className="grid grid-cols-2 gap-2.5 items-start">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-2.5">
          {col.map(({ it, order }) => (
            <div key={it.id} data-key={it.id} data-order={order}>
              <PinCard it={it} threshold={threshold} flashOn={flashOn} feed={feed} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Feed({ feed, list, active, session, onConsume, onLoadMore, onActivate, threshold, flashOn, autoplay, setAutoplay, onReset, onSwitch }) {
  const ref = useRef(null);
  const consumed = useRef(new Set());
  const listRef = useRef(list); listRef.current = list;
  const locked = session.terminated;
  const isStd = feed === 'standard';

  const check = useCallback((silent) => {
    const el = ref.current; if (!el) return;
    const line = el.scrollTop + el.clientHeight * 0.72;
    const fresh = [];
    el.querySelectorAll('[data-key]').forEach(n => {
      const k = n.dataset.key;
      if (!consumed.current.has(k) && n.offsetTop < line) { consumed.current.add(k); fresh.push(+n.dataset.order); }
    });
    if (!silent && fresh.length) onConsume(feed, fresh.sort((a, b) => a - b).map(o => listRef.current[o]).filter(Boolean));
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 900) onLoadMore(feed);
  }, [feed, onConsume, onLoadMore]);

  useEffect(() => { check(true); }, [list.length, threshold]);

  useEffect(() => {
    if (!autoplay || locked) return;
    let raf, last = performance.now();
    const tick = now => {
      const el = ref.current;
      if (el) el.scrollTop += Math.min(60, (now - last)) * 0.09;
      last = now; raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, locked]);

  useEffect(() => { if (locked && autoplay) setAutoplay(null); }, [locked]);

  const advance = () => { onActivate(feed); ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: 'smooth' }); };
  const z = zoneOf(session.f);
  const breaksSeen = session.breaks;

  return (
    <section aria-label={isStd ? 'Standard un-throttled feed' : 'Sensory-paced feed'}
      className={`relative rounded-2xl border bg-surface flex flex-col min-w-0 transition-shadow ${active ? (isStd ? 'border-std/70 shadow-[0_0_0_3px_rgb(var(--std)/0.15)]' : 'border-accent/70 shadow-[0_0_0_3px_rgb(var(--accent)/0.18)]') : 'border-line'}`}>
      <header className="px-4 pt-4 pb-3 border-b border-line grid gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${isStd ? 'bg-std' : 'bg-accent'}`} />
              {isStd ? 'Control' : 'SPIS middleware on'}
            </div>
            <h2 className="font-display text-[19px] font-bold leading-tight mt-1">{isStd ? 'Standard Un-throttled Feed' : 'Sensory-Paced Feed'}</h2>
          </div>
          <div className={`text-right shrink-0 ${toneText[z.tone]}`}>
            <div className="font-display text-[24px] font-bold tnum leading-none">{fmt(session.f, 0)}</div>
            <div className="font-mono text-[10px] mt-1">{z.label}</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-mono text-[10.5px] text-muted tnum">
            {session.n} pins viewed{isStd ? '' : ` · ${breaksSeen} rest breaks`}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { onActivate(feed); setAutoplay(autoplay ? null : feed); }} disabled={locked}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[12px] hover:bg-surface2 disabled:opacity-40">
              <Icon name={autoplay ? 'Pause' : 'Play'} size={13} />{autoplay ? 'Pause' : 'Auto-scroll'}
            </button>
            <button type="button" onClick={advance} disabled={locked}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-40 ${isStd ? 'bg-std' : 'bg-accent'}`}>
              <Icon name="ArrowDown" size={13} />Scroll
            </button>
          </div>
        </div>
      </header>
      <div ref={ref} onScroll={() => { onActivate(feed); check(false); }} onPointerDown={() => onActivate(feed)}
        tabIndex={0} aria-label="Feed scroll area"
        className={`feed-scroll relative p-3 h-[620px] ${locked ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Masonry list={list} threshold={threshold} flashOn={flashOn} feed={feed} />
        <div className="py-6 text-center font-mono text-[11px] text-muted">Loading more pins…</div>
      </div>
      {locked && (
        <div className="absolute inset-0 top-[104px] rounded-b-2xl bg-surface/90 backdrop-blur-[2px] flex items-center justify-center p-6 fade-in" role="alert">
          <div className="max-w-[300px] text-center grid gap-3 justify-items-center">
            <span className="w-11 h-11 rounded-full bg-crit/15 text-crit grid place-items-center"><Icon name="OctagonAlert" size={22} /></span>
            <h3 className="font-display text-[20px] font-bold">Session terminated</h3>
            <p className="text-[13px] text-muted leading-relaxed">
              The simulated user hit sensory overload and closed the app after <b className="text-ink tnum">{session.n}</b> pins
              (about {fmt(session.n * DWELL_PIN / 60)} min). Every ad window after this point is lost.
            </p>
            <div className="flex gap-2 flex-wrap justify-center">
              {isStd && <button type="button" onClick={onSwitch} className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white px-3 py-1.5 text-[12.5px] font-medium"><Icon name="Leaf" size={14} />Try the paced feed</button>}
              <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px]"><Icon name="RotateCcw" size={14} />Reset session</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* Live sparkline of both sessions inside the meter band */
