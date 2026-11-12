"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { LoaderCircle, Printer, Sparkles, Tag } from "lucide-react";
import { assignBarcodes } from "@/app/actions/stock";
import { BarcodeSvg } from "@/components/barcode-svg";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductRow } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type Item = Pick<ProductRow, "id" | "name" | "unit" | "barcode" | "expiry_date" | "category_name">;

export function LabelSheet({ products }: { products: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "missing">(products.some((p) => !p.barcode) ? "missing" : "all");
  const [q, setQ] = useState("");
  const [copies, setCopies] = useState(1);
  const [showExpiry, setShowExpiry] = useState(true);
  const [pending, start] = useTransition();

  const visible = useMemo(
    () => products.filter((p) => (filter === "missing" ? !p.barcode : true) && (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode?.includes(q))),
    [products, filter, q],
  );
  const chosen = products.filter((p) => selected.has(p.id));
  const missingChosen = chosen.filter((p) => !p.barcode);
  const printable = chosen.filter((p) => p.barcode);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const generate = () =>
    start(async () => {
      const res = await assignBarcodes(missingChosen.map((p) => p.id));
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setFilter("all");
      router.refresh();
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)] print:block">
      <section className="card no-print h-fit space-y-4 rounded-[2.5rem] p-5" aria-label="Choose products">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sand/60 p-1">
          {(["missing", "all"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("rounded-xl py-2 text-sm font-bold", filter === f ? "bg-white shadow-soft" : "text-muted")}>
              {f === "missing" ? `No barcode (${products.filter((p) => !p.barcode).length})` : `All (${products.length})`}
            </button>
          ))}
        </div>
        <label htmlFor="label-q" className="sr-only">Filter products</label>
        <input id="label-q" className="input" placeholder="Filter by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex items-center justify-between text-xs font-bold text-muted">
          <span>{selected.size} selected</span>
          <div className="flex gap-3">
            <button type="button" className="hover:text-primary" onClick={() => setSelected(new Set([...selected, ...visible.map((p) => p.id)]))}>Select all</button>
            <button type="button" className="hover:text-primary" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
        <ul className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
          {visible.length === 0 && <li className="py-6 text-center text-sm text-muted">{filter === "missing" ? "Every product has a barcode 🎉" : "No products."}</li>}
          {visible.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-cream">
                <input type="checkbox" className="size-5 accent-[#FF5A1F]" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="block font-mono text-xs text-muted">{p.barcode ?? "— no barcode —"}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {missingChosen.length > 0 && (
          <button type="button" onClick={generate} disabled={pending} className="btn-soft w-full">
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate {missingChosen.length} barcode{missingChosen.length === 1 ? "" : "s"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="copies" className="field-label">Copies each</label>
            <input id="copies" type="number" min={1} max={50} value={copies} onChange={(e) => setCopies(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} className="input" />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={showExpiry} onChange={(e) => setShowExpiry(e.target.checked)} className="size-5 accent-[#FF5A1F]" /> Show expiry
          </label>
        </div>
        <button type="button" className="btn-primary w-full py-3" disabled={printable.length === 0} onClick={() => window.print()}>
          <Printer className="size-4" /> Print {printable.length * copies} label{printable.length * copies === 1 ? "" : "s"}
        </button>
      </section>

      <section className="card print-area rounded-[2.5rem] p-5" aria-label="Label preview">
        <h2 className="no-print mb-4 font-black">Preview</h2>
        {printable.length === 0 ? (
          <EmptyState icon={<Tag className="size-7" />} title="No labels yet" description="Select products with a barcode (or generate one) to preview the label sheet." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-[3mm]">
            {printable.flatMap((p) =>
              Array.from({ length: copies }).map((_, i) => (
                <div key={`${p.id}-${i}`} className="flex break-inside-avoid flex-col items-center justify-between gap-1 rounded-2xl border-2 border-dashed border-sand p-3 text-center print:h-[36mm] print:rounded-none print:border print:border-solid print:border-black/30">
                  <p className="line-clamp-2 text-xs font-black leading-tight">{p.name}</p>
                  <BarcodeSvg value={p.barcode!} height={38} className="h-auto max-w-full" />
                  {showExpiry && p.expiry_date && <p className="text-[10px] font-bold">EXP {formatDate(p.expiry_date)}</p>}
                </div>
              )),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
