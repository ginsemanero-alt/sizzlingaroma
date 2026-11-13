import { cn } from "@/lib/utils";

/** Ranked horizontal bars — one series, one color. Values are always visible as text. */
export function BarList({
  rows,
  color = "#FF5A1F",
  format,
  empty = "No data yet.",
}: {
  rows: { label: string; value: number; note?: string }[];
  color?: string;
  format: (n: number) => string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${format(r.value)}${r.note ? ` · ${r.note}` : ""}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-bold">{r.label}</span>
            <span className="shrink-0 font-black tabular-nums">{format(r.value)}{r.note && <span className="ml-1 text-xs font-semibold text-muted">{r.note}</span>}</span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-sand">
            <div className={cn("h-2.5 rounded-full transition-all duration-500 group-hover:brightness-110")} style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
