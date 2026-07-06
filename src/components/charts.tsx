export function KpiCard({ label, value, icon, bg, text, suffix, valueColor }: {
  label: string; value: number; icon: React.ReactNode; bg: string; text: string; suffix?: string; valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex flex-col items-center text-center gap-2">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <span className={text}>{icon}</span>
      </div>
      <div>
        <p className={`text-2xl font-black ${valueColor ?? "text-gray-800"}`}>
          {value.toLocaleString("fr-FR")}{suffix ? <span className="text-sm font-semibold text-gray-400 ml-1">{suffix}</span> : null}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export function BarRow({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="text-gray-500">{value.toLocaleString("fr-FR")}{unit ? ` ${unit}` : ""}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const DONUT_COLORS = ["#1e3a5f", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899"];

export function DonutChart({ data, colors = DONUT_COLORS }: { data: { label: string; value: number }[]; colors?: string[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 160;
  const radius = 60;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90;

  const arcs = data.map((d, i) => {
    const fraction = total > 0 ? d.value / total : 0;
    const startAngle = angle;
    const endAngle = angle + fraction * 360;
    angle = endAngle;
    const large = fraction > 0.5 ? 1 : 0;
    const toXY = (a: number) => {
      const rad = (a * Math.PI) / 180;
      return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
    };
    const [x1, y1] = toXY(startAngle);
    const [x2, y2] = toXY(endAngle);
    const path = fraction >= 0.9999
      ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    return { path, color: colors[i % colors.length] };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-40 h-40 shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} stroke="white" strokeWidth={1} />
        ))}
        <circle cx={cx} cy={cy} r={radius * 0.55} fill="white" />
      </svg>
      <div className="flex-1 w-full space-y-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-gray-600 truncate">{d.label}</span>
            </div>
            <span className="font-semibold text-gray-700 whitespace-nowrap">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export function MiniBarChart({ points, color = "#1e3a5f" }: { points: { mois: number; total: number }[]; color?: string }) {
  const width = 600;
  const height = 180;
  const padding = 30;
  const max = Math.max(1, ...points.map(p => p.total));
  const data = Array.from({ length: 12 }, (_, i) => {
    const found = points.find(p => p.mois === i + 1);
    return found ? found.total : 0;
  });
  const stepX = (width - padding * 2) / 12;
  const barWidth = stepX * 0.55;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" />
      {data.map((v, i) => {
        const x = padding + i * stepX + (stepX - barWidth) / 2;
        const barHeight = (v / max) * (height - padding * 2);
        const y = height - padding - barHeight;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx={3} fill={color} />
            {v > 0 && (
              <text x={x + barWidth / 2} y={y - 6} fontSize={9.5} textAnchor="middle" fill="#6b7280">
                {v.toLocaleString("fr-FR")}
              </text>
            )}
          </g>
        );
      })}
      {data.map((_, i) => (
        <text key={i} x={padding + i * stepX + stepX / 2} y={height - padding + 16} fontSize={10} textAnchor="middle" fill="#9ca3af">
          {MOIS_LABELS[i]}
        </text>
      ))}
    </svg>
  );
}

function fmtY(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(Math.round(v));
}

export function MiniLineChart({ points }: { points: { mois: number; total: number }[] }) {
  const width = 620;
  const height = 200;
  const paddingLeft = 72;
  const paddingRight = 20;
  const paddingTop = 16;
  const paddingBottom = 28;

  const max = Math.max(1, ...points.map(p => p.total));
  const data = Array.from({ length: 12 }, (_, i) => {
    const found = points.find(p => p.mois === i + 1);
    return found ? found.total : 0;
  });

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const stepX = chartW / 11;

  const toX = (i: number) => paddingLeft + i * stepX;
  const toY = (v: number) => paddingTop + chartH - (v / max) * chartH;

  const coords = data.map((v, i) => ({ x: toX(i), y: toY(v), v }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  const Y_TICKS = 5;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (max / Y_TICKS) * i);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
      {/* Y-axis gridlines + labels */}
      {yTicks.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y}
              stroke="#e5e7eb" strokeDasharray={i === 0 ? "0" : "4 3"} />
            <text x={paddingLeft - 6} y={y + 4} fontSize={10} textAnchor="end" fill="#9ca3af">
              {fmtY(v)}
            </text>
          </g>
        );
      })}

      {/* Y-axis line */}
      <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + chartH} stroke="#d1d5db" />

      {/* Line + dots */}
      <path d={path} fill="none" stroke="#1e3a5f" strokeWidth={2.5} strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3.5} fill="#1e3a5f" />
      ))}

      {/* X-axis labels */}
      {coords.map((c, i) => (
        <text key={i} x={c.x} y={height - paddingBottom + 16} fontSize={10} textAnchor="middle" fill="#9ca3af">
          {MOIS_LABELS[i]}
        </text>
      ))}
    </svg>
  );
}
