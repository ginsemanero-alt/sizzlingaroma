import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";

/** Part-to-whole of inventory health. Status colors + icon + label (never color alone). */
export function StatusBar({ ok, low, out }: { ok: number; low: number; out: number }) {
  const total = ok + low + out || 1;
  const parts = [
    { key: "ok", label: "OK", value: ok, color: "#16A34A", icon: <CircleCheck className="size-4 text-ok" /> },
    { key: "low", label: "Low", value: low, color: "#D97706", icon: <TriangleAlert className="size-4 text-warn" /> },
    { key: "out", label: "Out", value: out, color: "#DC2626", icon: <CircleX className="size-4 text-bad" /> },
  ];
  return (
    <div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Inventory health: ${ok} OK, ${low} low, ${out} out of stock`}>
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.key} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <li key={p.key} className="rounded-2xl bg-cream p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted">{p.icon}{p.label}</p>
            <p className="text-2xl font-black tabular-nums">{p.value}</p>
            <p className="text-[11px] text-muted">{Math.round((p.value / total) * 100)}%</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
