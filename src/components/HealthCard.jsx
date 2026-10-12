import { Icon } from './Icon';
import { fmt, money, moneyFine } from '../lib/format';
import { STORAGE_TIERS, pct, tierCost } from '../lib/infra';

export function HealthCard({ traces, infra, setInfra, outage, annualRevenue }) {
  const hyd = traces.filter(t => t.hydrate != null).map(t => t.hydrate);
  const p50 = pct(hyd, 0.5), p99 = pct(hyd, 0.99);
  const tier = STORAGE_TIERS.find(t => t.id === infra.tier);
  const monthly = tierCost(tier, infra.pinsB);
  const share = annualRevenue > 0 ? (monthly * 12) / annualRevenue * 100 : 0;
  const Row = ({ icon, label, value, tone, note }) => (
    <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] gap-x-2 items-start py-2 border-t border-line first:border-t-0">
      <Icon name={icon} size={15} className="text-muted mt-0.5" />
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium">{label}</div>
        <div className="text-[11px] text-muted leading-snug">{note}</div>
      </div>
      <div className={`font-display text-[19px] font-bold tnum text-right ${tone || ''}`}>{value}</div>
    </div>
  );
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 grid gap-1">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow flex items-center gap-1.5"><Icon name="Cloud" size={13} />Infrastructure overhead</div>
          <h2 className="font-display text-[19px] font-bold mt-1">System Health &amp; Cloud Cost</h2>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border border-current px-2 py-0.5 text-[11px] font-medium ${outage ? 'text-warn' : 'text-safe'}`}>
          <Icon name={outage ? 'ShieldOff' : 'CircleCheck'} size={12} />{outage ? 'Fail-open' : 'Healthy'}
        </span>
      </div>
      <Row icon="Cpu" label="Server CPU Load Delta" value="0.0%" tone="text-safe"
        note="Serving path: no pixel convolutions, no model calls, no retraining. Pixel work is a one-time ingest job." />
      <Row icon="Timer" label="Payload Latency Overhead" value={outage ? '0 ms' : `${fmt(p99, 2)} ms`} tone={p99 < 1.2 ? 'text-safe' : 'text-warn'}
        note={outage ? 'Bypassed while SPIS is down.' : `Simulated p99 over ${hyd.length} requests (p50 ${fmt(p50, 2)} ms). Budget < 1.2 ms.`} />
      <Row icon="HardDrive" label="Monthly storage" value={moneyFine(monthly)}
        note={`${infra.pinsB}B pins × ${32 + tier.overhead} B on ${tier.name.split(',')[0]}. Change the tier in Architecture.`} />
      <Row icon="Server" label="Core model changes" value="None" tone="text-safe" note="No feature, weight, or ranking change. Ships behind a remote-config flag." />
      <div className="rounded-lg bg-surface2/60 px-3 py-2 mt-1 text-[12px] leading-snug">
        Storage runs {moneyFine(monthly * 12)} a year against {money(annualRevenue)} in recovered ad revenue
        {annualRevenue > 0 && <> , or <b className="tnum">{share < 0.001 ? '< 0.001' : fmt(share, 3)}%</b> of the upside</>}.
      </div>
    </section>
  );
}
