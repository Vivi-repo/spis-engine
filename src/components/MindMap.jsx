import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { CLUSTERS, DEMO_LEN, JOLT, SAVED_PINS, attentionPath, clusterOf, mapPos, pathStats } from '../lib/attention';
import { fmt } from '../lib/format';
import { buildPacedList, getItem } from '../lib/queue';

export const MW = 420, MH = 300, MP = { l: 34, r: 12, t: 14, b: 30 };
export const mx = x => MP.l + (x / 100) * (MW - MP.l - MP.r);
export const my = y => MP.t + (1 - y / 100) * (MH - MP.t - MP.b);

export function catmullRom(pts) {
  if (!pts.length) return '';
  const P = pts.map(p => [mx(p.x), my(p.y)]);
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function Marker({ shape, x, y, r = 3.6, fill, stroke = 'rgb(var(--surface))', opacity = 1 }) {
  const common = { fill, stroke, strokeWidth: 1, opacity };
  if (shape === 'square') return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx="0.8" {...common} />;
  if (shape === 'triangle') return <path d={`M${x},${y - r * 1.15}L${x + r * 1.1},${y + r * 0.85}L${x - r * 1.1},${y + r * 0.85}Z`} {...common} />;
  if (shape === 'diamond') return <path d={`M${x},${y - r * 1.25}L${x + r * 1.25},${y}L${x},${y + r * 1.25}L${x - r * 1.25},${y}Z`} {...common} />;
  if (shape === 'cross') return <path d={`M${x - r},${y - r * 0.35}h${r * 0.65}v${-r * 0.65}h${r * 0.7}v${r * 0.65}h${r * 0.65}v${r * 0.7}h${-r * 0.65}v${r * 0.65}h${-r * 0.7}v${-r * 0.65}h${-r * 0.65}Z`} {...common} />;
  return <circle cx={x} cy={y} r={r} {...common} />;
}

export function MapPanel({ feed, pins, centroids, path, progress, threshold, focus, emptyNote }) {
  const isStd = feed === 'standard';
  const pathRef = useRef(null);
  const [len, setLen] = useState(0);
  const [hover, setHover] = useState(null);
  const d = useMemo(() => catmullRom(path), [path]);
  useLayoutEffectSafe(() => { setLen(pathRef.current ? pathRef.current.getTotalLength() : 0); }, [d]);
  const drawn = len * progress;
  let head = null;
  if (pathRef.current && len > 0) { try { head = pathRef.current.getPointAtLength(drawn); } catch (e) { head = null; } }
  const visibleIdx = Math.floor(progress * (path.length - 1) + 1e-6);
  const stats = pathStats(path);

  return (
    <figure className="rounded-2xl border border-line bg-surface p-3 sm:p-4 grid gap-2 min-w-0 m-0">
      <figcaption className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${isStd ? 'bg-std' : 'bg-accent'}`} />{isStd ? 'Control' : 'SPIS middleware on'}
          </div>
          <div className="font-display text-[17px] font-bold mt-0.5">{isStd ? 'Standard feed path' : 'Sensory-paced path'}</div>
        </div>
        {stats && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border border-current px-2.5 py-1 text-[12px] font-medium ${stats.joltRate > 1.5 ? 'text-crit' : 'text-safe'}`}>
            <Icon name={stats.joltRate > 1.5 ? 'Zap' : 'Waves'} size={13} />
            {stats.joltRate > 1.5 ? 'Jagged · gating failure' : 'Continuous · gating holds'}
          </span>
        )}
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${MW} ${MH}`} className="w-full h-auto block" role="img"
          aria-label={`${isStd ? 'Standard' : 'Sensory-paced'} attention path across ${pins.length} saved pins.${stats ? ` ${stats.jolts} hard jolts, mean turn ${Math.round(stats.turn)} degrees.` : ''}`}>
          {/* grid + axes */}
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line x1={mx(v)} x2={mx(v)} y1={MP.t} y2={MH - MP.b} stroke="rgb(var(--line))" strokeDasharray="2 4" />
              <text x={mx(v)} y={MH - MP.b + 13} textAnchor="middle" fontSize="9" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">{v}</text>
            </g>
          ))}
          <text x={MW - MP.r} y={MH - 4} textAnchor="end" fontSize="9" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">sensory load (SLS) →</text>
          <text x={12} y={MP.t + 4} fontSize="9" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace" transform={`rotate(-90 12 ${MP.t + 4})`} textAnchor="end">synthetic</text>
          <text x={12} y={MH - MP.b} fontSize="9" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace" transform={`rotate(-90 12 ${MH - MP.b})`} textAnchor="start">organic</text>
          {/* trigger line */}
          <line x1={mx(threshold)} x2={mx(threshold)} y1={MP.t} y2={MH - MP.b} stroke="rgb(var(--crit))" strokeOpacity="0.55" strokeDasharray="4 3" />
          <text x={mx(threshold) + 4} y={MP.t + 9} fontSize="9" fill="rgb(var(--crit))" fontFamily="IBM Plex Mono, monospace">trigger {threshold}</text>
          {/* cluster halos */}
          {centroids.map(c => (
            <ellipse key={c.id} cx={mx(c.x)} cy={my(c.y)} rx={Math.max(14, (c.sx * 2 / 100) * (MW - MP.l - MP.r))} ry={Math.max(12, (c.sy * 2 / 100) * (MH - MP.t - MP.b))}
              fill={c.color} fillOpacity={focus && focus !== c.id ? 0.02 : 0.09} stroke={c.color} strokeOpacity={focus && focus !== c.id ? 0.1 : 0.35} />
          ))}
          {/* saved pins */}
          {pins.map(it => {
            const p = mapPos(it), c = clusterOf(it.kind);
            const dim = focus && focus !== c.id;
            return (
              <g key={it.id} onPointerEnter={() => setHover(it)} onPointerLeave={() => setHover(h => (h === it ? null : h))}>
                <circle cx={mx(p.x)} cy={my(p.y)} r="7" fill="transparent" />
                <Marker shape={c.shape} x={mx(p.x)} y={my(p.y)} fill={c.color} opacity={dim ? 0.18 : 0.85} />
              </g>
            );
          })}
          {/* trajectory */}
          {d && <path ref={pathRef} d={d} fill="none" stroke="rgb(var(--ink))" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={len ? `${drawn} ${len + 10}` : undefined} />}
          {path.slice(1, visibleIdx + 1).map((p, i) => p.brk ? (
            <path key={'b' + i} d={`M${mx(p.x)},${my(p.y) - 5}L${mx(p.x) + 5},${my(p.y)}L${mx(p.x)},${my(p.y) + 5}L${mx(p.x) - 5},${my(p.y)}Z`}
              fill="rgb(var(--surface))" stroke="rgb(var(--accent))" strokeWidth="1.6" />
          ) : p.jolt ? (
            <circle key={'j' + i} cx={mx(p.x)} cy={my(p.y)} r="5" fill="none" stroke="rgb(var(--crit))" strokeWidth="1.6" />
          ) : null)}
          {head && progress > 0 && (
            <g>
              <circle cx={head.x} cy={head.y} r="9" fill={isStd ? 'rgb(var(--std))' : 'rgb(var(--accent))'} opacity="0.2" />
              <circle cx={head.x} cy={head.y} r="4.5" fill={isStd ? 'rgb(var(--std))' : 'rgb(var(--accent))'} stroke="rgb(var(--surface))" strokeWidth="2" />
            </g>
          )}
        </svg>
        {!path.length && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <p className="rounded-lg border border-line bg-surface/95 px-3 py-2 text-[12px] text-muted max-w-[260px] text-center">{emptyNote}</p>
          </div>
        )}
        {hover && (() => {
          const p = mapPos(hover), c = clusterOf(hover.kind);
          return (
            <div className="absolute pointer-events-none rounded-md border border-line bg-surface px-2 py-1.5 shadow-sm text-[11px] max-w-[220px]"
              style={{ left: `${Math.min(58, (mx(p.x) / MW) * 100)}%`, top: `${Math.max(0, (my(p.y) / MH) * 100 - 22)}%` }}>
              <div className="font-medium leading-snug">{hover.title}</div>
              <div className="font-mono text-[10px] text-muted">{c.label} · pin #{hover.idx + 1} · SLS {fmt(hover.sls)}</div>
            </div>
          );
        })()}
      </div>
      {stats ? (
        <dl className="grid grid-cols-3 gap-2">
          {[
            ['Hard jolts', `${stats.jolts}`, `${fmt(stats.joltRate)} per 10 pins`],
            ['Mean step', fmt(stats.step), 'map units per item'],
            ['Mean turn', `${Math.round(stats.turn)}°`, 'direction change'],
          ].map(([k, v, s]) => (
            <div key={k} className="rounded-lg bg-surface2/60 px-2.5 py-2 min-w-0">
              <dt className="text-[11px] text-muted">{k}</dt>
              <dd className="m-0 font-display text-[20px] font-bold tnum leading-tight">{v}</dd>
              <dd className="m-0 font-mono text-[10px] text-muted">{s}</dd>
            </div>
          ))}
        </dl>
      ) : <div className="font-mono text-[11px] text-muted px-1">Needs at least 3 viewed pins to measure the path.</div>}
    </figure>
  );
}
export function useLayoutEffectSafe(fn, deps) { return React.useLayoutEffect(fn, deps); }

export function MindMap({ sessions, threshold, breaksOn, reduced }) {
  const liveStd = sessions.standard.path, livePaced = sessions.paced.path;
  const liveCount = liveStd.filter(i => !i.isBreak).length + livePaced.filter(i => !i.isBreak).length;
  const [source, setSource] = useState('demo');
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [playing, setPlaying] = useState(!reduced);
  const [focus, setFocus] = useState(null);

  const lists = useMemo(() => source === 'live'
    ? { standard: liveStd, paced: livePaced }
    : { standard: Array.from({ length: DEMO_LEN }, (_, i) => getItem(i)), paced: buildPacedList(DEMO_LEN, threshold, breaksOn) },
    [source, liveStd, livePaced, threshold, breaksOn]);
  const paths = useMemo(() => ({ standard: attentionPath(lists.standard), paced: attentionPath(lists.paced) }), [lists]);

  const pins = useMemo(() => {
    const maxIdx = Math.max(SAVED_PINS - 1, ...lists.standard.map(i => i.idx), ...lists.paced.map(i => i.idx));
    return Array.from({ length: maxIdx + 1 }, (_, i) => getItem(i));
  }, [lists]);
  const centroids = useMemo(() => CLUSTERS.map(c => {
    const pts = pins.filter(it => c.kinds.includes(it.kind)).map(mapPos);
    const n = Math.max(1, pts.length);
    const x = pts.reduce((s, p) => s + p.x, 0) / n, y = pts.reduce((s, p) => s + p.y, 0) / n;
    const sx = Math.sqrt(pts.reduce((s, p) => s + (p.x - x) ** 2, 0) / n), sy = Math.sqrt(pts.reduce((s, p) => s + (p.y - y) ** 2, 0) / n);
    return { ...c, x, y, sx, sy, n: pts.length };
  }), [pins]);

  // replay from the start whenever the data behind the paths changes
  useEffect(() => { if (!reduced) { setProgress(0); setPlaying(true); } }, [source, threshold, breaksOn]);

  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const tick = now => {
      const dt = now - last; last = now;
      setProgress(p => {
        const n = p + dt / 14000;
        if (n >= 1) { setPlaying(false); return 1; }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const togglePlay = () => { if (progress >= 1) setProgress(0); setPlaying(p => !p); };
  const emptyNote = 'No live path yet. Switch to the Feeds view and scroll this feed, then come back.';

  return (
    <section className="grid gap-4 min-w-0" aria-label="Cognitive Resonance Map">
      <div className="rounded-2xl border border-line bg-surface p-4 grid gap-3">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="eyebrow flex items-center gap-1.5"><Icon name="Orbit" size={13} />Cognitive Resonance Map</div>
            <h2 className="font-display text-[21px] font-bold mt-1">An abstract map of the user’s mind</h2>
            <p className="text-[12.5px] text-muted mt-1 max-w-[640px] leading-relaxed">
              Each mark is one of {pins.length} saved pins, placed by its sensory load (across) and visual style (up). The line traces where the user’s attention
              travels as they scroll. Watch the same queue produce a zigzag in the standard feed and a glide in the paced feed.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div role="radiogroup" aria-label="Path source" className="inline-flex rounded-lg border border-line p-0.5 bg-surface2/60">
              {[['demo', `Demo session · ${DEMO_LEN} pins`], ['live', `Your live scroll · ${liveCount}`]].map(([k, lbl]) => (
                <button key={k} type="button" role="radio" aria-checked={source === k} onClick={() => setSource(k)}
                  className={`rounded-md px-2.5 py-1 text-[12px] ${source === k ? 'bg-surface shadow-sm font-medium' : 'text-muted hover:text-ink'}`}>{lbl}</button>
              ))}
            </div>
            <button type="button" onClick={togglePlay} className="inline-flex items-center gap-1 rounded-lg bg-accent text-white px-2.5 py-1.5 text-[12px] font-medium">
              <Icon name={playing ? 'Pause' : progress >= 1 ? 'RotateCcw' : 'Play'} size={13} />{playing ? 'Pause' : progress >= 1 ? 'Replay' : 'Play'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="map-progress" className="font-mono text-[10.5px] text-muted shrink-0">Scroll position</label>
          <input id="map-progress" type="range" min="0" max="1000" value={Math.round(progress * 1000)}
            onChange={e => { setPlaying(false); setProgress(+e.target.value / 1000); }} className="w-full" />
          <span className="font-mono text-[10.5px] text-muted tnum shrink-0 w-10 text-right">{Math.round(progress * 100)}%</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Highlight a theme cluster">
          {centroids.map(c => (
            <button key={c.id} type="button" aria-pressed={focus === c.id} onClick={() => setFocus(f => (f === c.id ? null : c.id))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${focus === c.id ? 'border-ink bg-surface2' : 'border-line hover:bg-surface2/60'}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><Marker shape={c.shape} x={6} y={6} r={3.8} fill={c.color} /></svg>
              {c.label}<span className="font-mono text-[10px] text-muted tnum">{c.n}</span>
            </button>
          ))}
          <span className="inline-flex items-center gap-3 text-[11.5px] text-muted px-1">
            <span className="inline-flex items-center gap-1"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.2" fill="none" stroke="rgb(var(--crit))" strokeWidth="1.6" /></svg>hard jolt</span>
            <span className="inline-flex items-center gap-1"><svg width="12" height="12" aria-hidden="true"><path d="M6,1.5L10.5,6L6,10.5L1.5,6Z" fill="rgb(var(--surface))" stroke="rgb(var(--accent))" strokeWidth="1.6" /></svg>rest break</span>
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MapPanel feed="standard" pins={pins} centroids={centroids} path={paths.standard} progress={progress} threshold={threshold} focus={focus} emptyNote={emptyNote} />
        <MapPanel feed="paced" pins={pins} centroids={centroids} path={paths.paced} progress={progress} threshold={threshold} focus={focus} emptyNote={emptyNote} />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Zap', 'Why the standard path zigzags', 'Back-to-back pins above SLS 62 stack up gating load. Once the brain’s filter is saturated, every new pin captures attention completely, so the path jumps straight to it and loses all direction.'],
          ['Waves', 'Why the paced path glides', 'Each rest break clears the gating load. With the filter intact, a new pin only nudges attention and the previous direction carries through, so the path drifts between neighboring themes.'],
          ['TrendingUp', 'What it means commercially', 'Jagged paths are what users feel just before they close the app. A smooth path through their own taste clusters is a session that keeps going, and keeps filling ad windows.'],
        ].map(([ic, t, b]) => (
          <div key={t} className="grid gap-1 content-start">
            <div className="flex items-center gap-1.5 text-[13px] font-medium"><Icon name={ic} size={14} className="text-accent" />{t}</div>
            <p className="text-[12.5px] text-muted leading-relaxed">{b}</p>
          </div>
        ))}
        <p className="sm:col-span-3 font-mono text-[10.5px] text-muted">
          Model note: across = SLS from the vision worker. Up = a simulated style-embedding dimension. Attention update: v ← m·v + g·(pin − p), with g = 0.18 + 0.8·(1 − capacity), m = 0.62·capacity, capacity = 1 − 0.25·gating load. A step longer than {JOLT} map units counts as a hard jolt.
        </p>
      </div>
    </section>
  );
}
