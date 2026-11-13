"use client";
import { useState } from "react";
import { useWidth } from "./use-width";

export interface Series {
  key: string;
  label: string;
  color: string;
}
/** One day: `date` is YYYY-MM-DD, other keys are numeric values. */
export type TimePoint = { date: string } & Record<string, number | string>;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}
const short = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
const long = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Daily bars (one or two series side by side) with a hover/focus tooltip. One y-axis only. */
export function TimeBarChart({
  data,
  series,
  format,
  axisFormat = format,
  height = 240,
  title,
  extraTooltip,
}: {
  data: TimePoint[];
  series: Series[];
  format: (n: number) => string;
  axisFormat?: (n: number) => string;
  height?: number;
  title: string;
  extraTooltip?: (p: TimePoint) => string | null;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 52, padR = 8, padT = 12, padB = 26;
  const w = Math.max(width, 200);
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const band = innerW / Math.max(1, data.length);
  const groupW = Math.min(band * 0.72, 44);
  const gap = series.length > 1 ? 2 : 0;
  const barW = Math.max(1.5, (groupW - gap * (series.length - 1)) / series.length);
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 56)));

  const bar = (x: number, v: number) => {
    const h = Math.max(0, (v / max) * innerH);
    if (h <= 0) return "";
    const r = Math.min(4, barW / 2, h);
    const top = padT + innerH - h;
    const b = padT + innerH;
    return `M${x},${b}V${top + r}Q${x},${top} ${x + r},${top}H${x + barW - r}Q${x + barW},${top} ${x + barW},${top + r}V${b}Z`;
  };

  const hp = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(padL + band * hover + band / 2, 90), w - 90) : 0;

  return (
    <figure className="m-0">
      {series.length > 1 && (
        <figcaption className="mb-3 flex flex-wrap gap-4 text-xs font-bold text-ink/80">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-3 rounded-[4px]" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
      <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={w} height={height} role="img" aria-label={title} className="block overflow-visible">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="#F6EBE1" strokeWidth={1} />
                <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[10px] font-semibold tabular-nums">{axisFormat(t)}</text>
              </g>
            ))}
            {hover !== null && <rect x={padL + band * hover} y={padT} width={band} height={innerH} fill="#FFF6EE" />}
            {data.map((d, i) => {
              const gx = padL + band * i + (band - groupW) / 2;
              return (
                <g key={d.date}>
                  {series.map((s, j) => (
                    <path key={s.key} d={bar(gx + j * (barW + gap), Number(d[s.key]) || 0)} fill={s.color} opacity={hover === null || hover === i ? 1 : 0.45} />
                  ))}
                  {i % labelEvery === 0 && (
                    <text x={padL + band * i + band / 2} y={height - 8} textAnchor="middle" className="fill-muted text-[10px] font-semibold">{short(d.date)}</text>
                  )}
                  {/* hit target: the whole day column */}
                  <rect
                    x={padL + band * i}
                    y={padT}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${long(d.date)}: ${series.map((s) => `${s.label} ${format(Number(d[s.key]) || 0)}`).join(", ")}`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    onTouchStart={() => setHover(i)}
                    className="outline-none"
                  />
                </g>
              );
            })}
            <line x1={padL} x2={w - padR} y1={padT + innerH} y2={padT + innerH} stroke="#8A7B72" strokeOpacity={0.4} />
          </svg>
        )}
        {hp && (
          <div className="pointer-events-none absolute top-0 z-10 min-w-40 -translate-x-1/2 rounded-2xl bg-ink px-3 py-2 text-xs text-white shadow-soft" style={{ left: tipLeft }} role="status">
            <p className="mb-1 font-bold text-white/70">{long(hp.date)}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />{s.label}</span>
                <span className="font-black tabular-nums">{format(Number(hp[s.key]) || 0)}</span>
              </p>
            ))}
            {extraTooltip?.(hp) && <p className="mt-1 text-white/70">{extraTooltip(hp)}</p>}
          </div>
        )}
        {width === 0 && <div style={{ height }} className="skeleton" />}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer font-bold text-muted hover:text-ink">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-2xl border-2 border-sand">
          <table className="w-full">
            <thead className="bg-cream"><tr><th scope="col" className="px-3 py-2 text-left">Date</th>{series.map((s) => <th key={s.key} scope="col" className="px-3 py-2 text-right">{s.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-sand">
              {data.map((d) => (
                <tr key={d.date}><td className="px-3 py-1.5">{long(d.date)}</td>{series.map((s) => <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">{format(Number(d[s.key]) || 0)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
