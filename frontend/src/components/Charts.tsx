import { money } from '../lib/format';

export const PALETTE = ['#1f6b3a', '#f2a31b', '#3b82c4', '#c1272d', '#8e5bb5', '#d97b4a', '#2f9e9a'];

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};
const compact = (v: number) => (v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1000 ? `${v / 1000}k` : String(v));

export function BarChart({ data }: { data: { label: string; sub?: string; value: number }[] }) {
  const W = 640, H = 260, L = 48, R = 12, T = 24, B = 40;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const innerW = W - L - R, innerH = H - T - B;
  const bw = innerW / data.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const latest = data.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Revenue for the last 7 days">
      {ticks.map((t) => {
        const y = T + innerH - t * innerH;
        return (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y} y2={y} className="grid" />
            <text x={L - 8} y={y + 4} textAnchor="end" className="axis">{compact(max * t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = L + i * bw + bw * 0.18;
        const w = bw * 0.64;
        return (
          <g key={d.label}>
            <rect x={x} y={T + innerH - h} width={w} height={Math.max(h, 1)} rx={6} fill={i === latest ? '#f2a31b' : '#1f6b3a'}>
              <title>{`${d.label}: ${money(d.value)}${d.sub ? ` · ${d.sub}` : ''}`}</title>
            </rect>
            <text x={x + w / 2} y={T + innerH - h - 6} textAnchor="middle" className="bar-value">{d.value > 0 ? compact(Math.round(d.value)) : ''}</text>
            <text x={x + w / 2} y={H - 18} textAnchor="middle" className="axis">{d.label}</text>
            {d.sub && <text x={x + w / 2} y={H - 4} textAnchor="middle" className="axis axis-sub">{d.sub}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 62, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 180 180" className="donut" role="img" aria-label="Sales by category">
        <g transform="rotate(-90 90 90)">
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--border)" strokeWidth="26" />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle key={d.name} cx="90" cy="90" r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="26"
                strokeDasharray={`${Math.max(len - 2, 0)} ${c - Math.max(len - 2, 0)}`} strokeDashoffset={-offset}>
                <title>{`${d.name}: ${money(d.value)} (${Math.round((d.value / total) * 100)}%)`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="90" y="86" textAnchor="middle" className="donut-total">{money(Math.round(total / 1000))}k</text>
        <text x="90" y="104" textAnchor="middle" className="axis">total sales</text>
      </svg>
      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.name}>
            <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="legend-name">{d.name}</span>
            <strong>{Math.round((d.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
