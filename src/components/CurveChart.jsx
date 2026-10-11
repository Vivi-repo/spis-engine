import { useState } from 'react';
import { fmt } from '../lib/format';

export function CurveChart({ kpi }) {
  const W = 340, H = 170, P = { l: 30, r: 12, t: 10, b: 24 };
  const a = kpi.curveStd.pts, b = kpi.curvePaced.pts;
  const tMax = Math.max(a[a.length - 1][0], b[b.length - 1][0]);
  const xMaxMin = Math.ceil(tMax / 60);
  const x = t => P.l + (t / (xMaxMin * 60)) * (W - P.l - P.r);
  const y = f => P.t + (1 - f / 100) * (H - P.t - P.b);
  const path = pts => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const [hover, setHover] = useState(null);
  const at = (pts, t) => { let v = pts[0][1]; for (const p of pts) { if (p[0] <= t) v = p[1]; else break; } return pts[pts.length - 1][0] < t ? null : v; };
  const step = xMaxMin <= 6 ? 1 : xMaxMin <= 12 ? 2 : 5;
  const ticks = []; for (let m = 0; m <= xMaxMin; m += step) ticks.push(m);
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const t = Math.max(0, Math.min(xMaxMin * 60, ((px - P.l) / (W - P.l - P.r)) * xMaxMin * 60));
    setHover(t);
  };
  const aEnd = a[a.length - 1], bEnd = b[b.length - 1];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Projected fatigue over a typical session. Standard feed reaches overload at ${fmt(aEnd[0] / 60)} minutes; paced feed at ${fmt(bEnd[0] / 60)} minutes.`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="rgb(var(--line))" strokeDasharray={v === 100 ? '0' : '2 3'} />
            <text x={P.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">{v}</text>
          </g>
        ))}
        {ticks.map(m => (
          <text key={m} x={x(m * 60)} y={H - 8} textAnchor="middle" fontSize="9" fill="rgb(var(--muted))" fontFamily="IBM Plex Mono, monospace">{m}m</text>
        ))}
        <path d={path(a)} fill="none" stroke="rgb(var(--std))" strokeWidth="2" strokeLinejoin="round" />
        <path d={path(b)} fill="none" stroke="rgb(var(--accent))" strokeWidth="2" strokeLinejoin="round" />
        {kpi.curveStd.ended && <circle cx={x(aEnd[0])} cy={y(aEnd[1])} r="4.5" fill="rgb(var(--std))" stroke="rgb(var(--surface))" strokeWidth="2" />}
        {kpi.curvePaced.ended && <circle cx={x(bEnd[0])} cy={y(bEnd[1])} r="4.5" fill="rgb(var(--accent))" stroke="rgb(var(--surface))" strokeWidth="2" />}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="rgb(var(--muted))" strokeWidth="1" />}
      </svg>
      {hover != null && (
        <div className="absolute top-1 pointer-events-none rounded-md border border-line bg-surface px-2 py-1 font-mono text-[10.5px] tnum shadow-sm"
          style={{ left: `${Math.min(62, (x(hover) / W) * 100)}%` }}>
          <div className="text-muted">{fmt(hover / 60)} min</div>
          <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-std inline-block" />Standard {at(a, hover) == null ? 'left app' : fmt(at(a, hover), 0)}</div>
          <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-accent inline-block" />Paced {at(b, hover) == null ? 'left app' : fmt(at(b, hover), 0)}</div>
        </div>
      )}
    </div>
  );
}
