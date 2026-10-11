export const toneText = { safe: 'text-safe', warn: 'text-warn', strain: 'text-strain', crit: 'text-crit' };
export const toneBg = { safe: 'bg-safe', warn: 'bg-warn', strain: 'bg-strain', crit: 'bg-crit' };
export const fmt = (v, d = 1) => Number(v).toFixed(d);

export const money = v => v >= 1e9 ? `$${fmt(v / 1e9, 2)}B` : v >= 1e6 ? `$${fmt(v / 1e6, 1)}M` : `$${Math.round(v / 1e3)}K`;

export const moneyFine = v => v >= 1000 ? `$${Math.round(v).toLocaleString()}` : `$${v.toFixed(2)}`;
