/**
 * Hand-rolled SVG charts — no chart library.
 * Keeps the bundle tiny and gives exact control over the palette.
 * Every chart renders its own empty state.
 */
import { useId } from "react";

const EmptyChart = ({ message }) => (
  <p className="text-[13px] text-slate-400 text-center py-6">{message}</p>
);

const niceMax = (max) => {
  if (max <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / mag) * mag;
};

/* ---------------------------------------------------------------- donut */

export const DonutChart = ({ data = [], size = 180, thickness = 28, centerLabel, centerValue }) => {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!data.length || total <= 0) return <EmptyChart message="No orders this month." />;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center justify-center" style={{ minHeight: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={thickness}
          />
          {data.map((d, i) => {
            const fraction = (d.value || 0) / total;
            const dash = fraction * circumference;
            const segment = (
              <circle
                key={`${d.name}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color || "#94a3b8"}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${d.name}: ${d.count ?? d.value}`}</title>
              </circle>
            );
            offset += dash;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">
            {centerValue ?? data.reduce((s, d) => s + (d.count || 0), 0)}
          </span>
          <span className="text-[11px] text-slate-500">{centerLabel || "Orders"}</span>
        </div>
      </div>
    </div>
  );
};

export const ChartLegend = ({ data = [], valueKey = "value", suffix = "%" }) => (
  <ul className="space-y-2 mt-4">
    {data.map((d, i) => (
      <li key={`${d.name}-${i}`} className="flex items-center gap-2 text-[12px]">
        <span
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: d.color || "#94a3b8" }}
        />
        <span className="text-slate-600 truncate flex-1">{d.name}</span>
        <span className="text-slate-900 font-medium tabular-nums">
          {d[valueKey]}
          {suffix}
        </span>
      </li>
    ))}
  </ul>
);

/* ------------------------------------------------------------------- bar */

export const BarChart = ({ data = [], accent = "#2563eb", valueFormatter = (v) => v }) => {
  const gradientId = useId();
  if (!data.length || data.every((d) => !d.value)) {
    return <EmptyChart message="No sales in the last 7 days." />;
  }

  const W = 360;
  const H = 200;
  const padX = 8;
  const padTop = 24;
  const padBottom = 26;
  const max = niceMax(Math.max(...data.map((d) => d.value || 0)));
  const plotH = H - padTop - padBottom;
  const slot = (W - padX * 2) / data.length;
  const barW = Math.min(30, slot * 0.55);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }} role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={W - padX}
          y1={padTop + plotH * t}
          y2={padTop + plotH * t}
          stroke="#E2E8F0"
          strokeDasharray="3 5"
          strokeWidth="1"
        />
      ))}

      {data.map((d, i) => {
        const h = max ? ((d.value || 0) / max) * plotH : 0;
        const x = padX + slot * i + (slot - barW) / 2;
        const y = padTop + plotH - h;
        return (
          <g key={`${d.day}-${i}`}>
            {h > 0 && (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-slate-500"
                style={{ fontSize: 9 }}
              >
                {valueFormatter(d.value)}
              </text>
            )}
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx="3"
              fill={`url(#${gradientId})`}
            >
              <title>{`${d.day}: ${valueFormatter(d.value)} (${d.orders || 0} orders)`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={H - 8}
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: 10 }}
            >
              {d.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------ area chart */

export const RevenueChart = ({ data = [], labels = [], color = "#2563eb" }) => {
  const gradientId = useId();
  if (!data.length || data.every((v) => !v)) {
    return <EmptyChart message="No revenue recorded in this window." />;
  }

  const W = 720;
  const H = 220;
  const padX = 10;
  const padTop = 16;
  const padBottom = 24;
  const plotH = H - padTop - padBottom;
  const max = niceMax(Math.max(...data));
  const step = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = padX + step * i;
    const y = padTop + plotH - (max ? (v / max) * plotH : 0);
    return [x, y];
  });

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${padX},${padTop + plotH} ${line} ${padX + step * (data.length - 1)},${padTop + plotH}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }} role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.33, 0.66, 1].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={W - padX}
          y1={padTop + plotH * t}
          y2={padTop + plotH * t}
          stroke="#E2E8F0"
          strokeDasharray="3 5"
          strokeWidth="1"
        />
      ))}

      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" fill="transparent">
          <title>{`${labels[i] || `Day ${i + 1}`}: ${data[i]}`}</title>
        </circle>
      ))}
    </svg>
  );
};

/* ------------------------------------------------------- dual area chart */

export const DualAreaChart = ({ newData = [], returningData = [] }) => {
  const idA = useId();
  const idB = useId();
  const hasData = [...newData, ...returningData].some((v) => v > 0);
  if (!hasData) return <EmptyChart message="No customer activity in this window." />;

  const W = 640;
  const H = 200;
  const padX = 10;
  const padTop = 14;
  const padBottom = 18;
  const plotH = H - padTop - padBottom;
  const len = Math.max(newData.length, returningData.length);
  const max = niceMax(Math.max(...newData, ...returningData, 1));
  const step = len > 1 ? (W - padX * 2) / (len - 1) : 0;

  const build = (series) => {
    const pts = Array.from({ length: len }, (_, i) => {
      const v = series[i] || 0;
      const x = padX + step * i;
      const y = padTop + plotH - (v / max) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      line: pts.join(" "),
      area: `${padX},${padTop + plotH} ${pts.join(" ")} ${padX + step * (len - 1)},${padTop + plotH}`,
    };
  };

  const a = build(newData);
  const b = build(returningData);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 210 }} role="img">
      <defs>
        <linearGradient id={idA} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={idB} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F766E" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 0.5, 1].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={W - padX}
          y1={padTop + plotH * t}
          y2={padTop + plotH * t}
          stroke="#E2E8F0"
          strokeDasharray="3 5"
        />
      ))}

      <polygon points={b.area} fill={`url(#${idB})`} />
      <polygon points={a.area} fill={`url(#${idA})`} />
      <polyline points={b.line} fill="none" stroke="#0F766E" strokeWidth="2" strokeLinejoin="round" />
      <polyline points={a.line} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
};

/* ---------------------------------------------------------------- funnel */

export const FunnelChart = ({ data = [] }) => {
  if (!data.length || !data[0]?.value) return <EmptyChart message="No orders to chart yet." />;

  const top = data[0].value || 1;

  return (
    <div className="space-y-3">
      {data.map((stage, i) => {
        const pct = Math.round(((stage.value || 0) / top) * 100);
        const prev = i > 0 ? data[i - 1].value || 0 : null;
        const conversion = prev ? Math.round(((stage.value || 0) / prev) * 100) : null;
        return (
          <div key={stage.stage}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-slate-600">{stage.stage}</span>
              <span className="text-[12px] text-slate-900 font-medium tabular-nums">
                {stage.value}
                {conversion !== null && (
                  <span className="text-slate-400 font-normal ml-1.5">{conversion}%</span>
                )}
              </span>
            </div>
            <div className="h-7 bg-slate-50 rounded-md overflow-hidden">
              <div
                className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
              >
                {pct > 12 && (
                  <span className="text-[10px] font-semibold text-white">{pct}%</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------- sparkline */

export const Sparkline = ({ data = [], color = "#2563eb", width = 120, height = 34 }) => {
  // Gradient id derives from the colour so multiple sparklines never collide.
  const gradientId = `spark-${color.replace("#", "")}-${useId().replace(/:/g, "")}`;
  if (!data.length) return <div style={{ width, height }} />;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;

  const pts = data.map((v, i) => {
    const x = step * i;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${pts.join(" ")} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

/* ------------------------------------------------------- horizontal bars */

export const InventoryBars = ({ data = [] }) => {
  if (!data.length) return <EmptyChart message="No products to report on." />;

  const max = Math.max(...data.map((d) => Math.max(d.inStock || 0, d.reorder || 0)), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const pct = (item.inStock / max) * 100;
        const markerPct = (item.reorder / max) * 100;
        const low = item.inStock <= item.reorder;
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1.5 gap-3">
              <span className="text-[12px] text-slate-600 truncate flex-1" title={item.name}>
                {item.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {low && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600 tracking-wide">
                    LOW STOCK
                  </span>
                )}
                <span className="text-[12px] text-slate-900 font-medium tabular-nums">
                  {item.inStock}
                </span>
              </div>
            </div>
            <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: item.color }}
              />
              <span
                className="absolute top-0 bottom-0 w-[2px] bg-red-500"
                style={{ left: `${markerPct}%` }}
                title={`Reorder at ${item.reorder}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------------------------------------------------- progress row */

export const ProgressRow = ({ label, value, amount, color }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[12px] text-slate-600 truncate">{label}</span>
      <span className="text-[12px] text-slate-900 font-semibold tabular-nums">{amount}</span>
    </div>
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(value, 1)}%`, backgroundColor: color }}
      />
    </div>
  </div>
);
