"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle, Minus, Plus, Receipt, Search, ShoppingCart, Trash2, TriangleAlert, UtensilsCrossed } from "lucide-react";
import { lookupSaleBarcode, recordSale } from "@/app/actions/sales";
import { CameraScanner } from "@/components/scan/camera-scanner";
import { ScanInput } from "@/components/scan/scan-input";
import { EmptyState } from "@/components/ui/empty-state";
import type { MenuItem, SaleWarning } from "@/lib/types";
import { cn, formatPeso, formatQty } from "@/lib/utils";

export function SaleTerminal({ items, categories }: { items: MenuItem[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [camera, setCamera] = useState(false);
  const [warnings, setWarnings] = useState<SaleWarning[]>([]);
  const [pending, start] = useTransition();
  const [scanning, startScan] = useTransition();
  const cartRef = useRef<HTMLElement>(null);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const visible = items.filter((i) => (!cat || i.category_id === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  const lines = Object.entries(cart).filter(([, n]) => n > 0).map(([id, n]) => ({ item: byId.get(id)!, qty: n })).filter((l) => l.item);
  const total = lines.reduce((s, l) => s + Number(l.item.price) * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const add = (id: string, d = 1) => setCart((c) => ({ ...c, [id]: Math.min(1000, Math.max(0, (c[id] ?? 0) + d)) }));
  const set = (id: string, n: number) => setCart((c) => ({ ...c, [id]: Math.min(1000, Math.max(0, Math.floor(n) || 0)) }));

  const onScan = (code: string) =>
    startScan(async () => {
      const res = await lookupSaleBarcode(code);
      if (!res.ok) return void toast.error(res.error);
      add(res.data.id);
      toast.success(`Added ${res.data.name}`, { duration: 1500 });
    });

  const save = () => {
    if (!lines.length) return void toast.error("Add at least one item.");
    start(async () => {
      const res = await recordSale({ items: lines.map((l) => ({ menu_item_id: l.item.id, quantity: l.qty })), note });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message, { description: `Total ${formatPeso(res.data.total)}` });
      setWarnings(res.data.warnings ?? []);
      if (res.data.warnings?.length) toast.warning(`${res.data.warnings.length} ingredient(s) ran short — check inventory.`);
      setCart({});
      setNote("");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <div className="card grid gap-3 rounded-[2.5rem] p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <ScanInput onScan={onScan} disabled={scanning} label="Scan menu or product barcode" autoRefocus={false} />
          </div>
          <CameraScanner active={camera} onActiveChange={setCamera} onDetected={onScan} />
          <div className="relative">
            <label htmlFor="menu-q" className="sr-only">Search menu</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input id="menu-q" className="input pl-11" placeholder="Search menu…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Menu categories">
          {[{ id: "", name: "All" }, ...categories].map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold shadow-soft transition", cat === c.id ? "bg-ink text-white" : "bg-white text-ink/70")}>
              {c.name}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="card"><EmptyState icon={<UtensilsCrossed className="size-7" />} title={items.length ? "No matching items" : "No menu items yet"} description={items.length ? "Try another search." : "The Owner can add menu items in Menu & Recipes."} /></div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {visible.map((i) => {
              const n = cart[i.id] ?? 0;
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => add(i.id)}
                    className={cn("card relative flex h-full w-full flex-col items-start gap-2 p-4 text-left transition duration-200 hover:-translate-y-0.5 active:scale-[0.98]", n > 0 && "ring-2 ring-primary")}
                    aria-label={`Add ${i.name}, ${formatPeso(i.price)}${n ? `, ${n} in order` : ""}`}
                  >
                    <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary"><UtensilsCrossed className="size-5" /></span>
                    <span className="text-sm font-bold leading-tight">{i.name}</span>
                    <span className="mt-auto text-base font-black text-primary">{formatPeso(i.price)}</span>
                    {n > 0 && <span className="absolute right-3 top-3 grid min-w-7 place-items-center rounded-full bg-primary px-2 py-0.5 text-xs font-black text-white">{n}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside ref={cartRef} className="card h-fit rounded-[2.5rem] p-5 xl:sticky xl:top-4" aria-label="Current order">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black"><ShoppingCart className="size-5 text-primary" /> Order</h2>
          {lines.length > 0 && <button type="button" className="text-xs font-bold text-muted hover:text-bad" onClick={() => setCart({})}>Clear</button>}
        </div>
        {lines.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Tap a menu item or scan to start an order.</p>
        ) : (
          <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {lines.map(({ item, qty }) => (
              <li key={item.id} className="rounded-2xl bg-cream p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-tight">{item.name}</p>
                  <p className="shrink-0 text-sm font-black">{formatPeso(Number(item.price) * qty)}</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" className="btn-ghost size-9 !p-0" onClick={() => add(item.id, -1)} aria-label={`Remove one ${item.name}`}><Minus className="size-4" /></button>
                  <label htmlFor={`qty-${item.id}`} className="sr-only">Quantity of {item.name}</label>
                  <input id={`qty-${item.id}`} type="number" inputMode="numeric" min={0} max={1000} value={qty} onChange={(e) => set(item.id, Number(e.target.value))} className="input w-16 !px-2 !py-1.5 text-center font-black" />
                  <button type="button" className="btn-ghost size-9 !p-0" onClick={() => add(item.id, 1)} aria-label={`Add one ${item.name}`}><Plus className="size-4" /></button>
                  <span className="ml-auto text-xs text-muted">{formatPeso(item.price)} ea</span>
                  <button type="button" className="grid size-9 place-items-center rounded-xl text-muted hover:bg-bad-soft hover:text-bad" onClick={() => set(item.id, 0)} aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <label htmlFor="sale-note" className="field-label">Note (optional)</label>
          <input id="sale-note" className="input" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Table 4 / take-out / Grab" />
        </div>
        <div className="mt-4 flex items-end justify-between rounded-3xl bg-ink p-5 text-white">
          <div>
            <p className="text-xs font-bold uppercase text-white/50">Total · {count} item{count === 1 ? "" : "s"}</p>
            <p className="text-3xl font-black tracking-tight" aria-live="polite">{formatPeso(total)}</p>
          </div>
        </div>
        <button type="button" onClick={save} disabled={pending || lines.length === 0} className="btn-primary mt-3 w-full py-4 text-base">
          {pending ? <LoaderCircle className="size-5 animate-spin" /> : <Receipt className="size-5" />} Save sale
        </button>
        {warnings.length > 0 && (
          <div className="mt-4 rounded-3xl bg-warn-soft p-4 text-warn" role="status">
            <p className="flex items-center gap-2 text-sm font-black"><TriangleAlert className="size-4" /> Last sale: ingredients short</p>
            <ul className="mt-2 space-y-1 text-xs font-semibold">
              {warnings.map((w) => <li key={w.product_id}>{w.product_name}: short by {formatQty(w.short)} {w.unit}</li>)}
            </ul>
          </div>
        )}
      </aside>
      {lines.length > 0 && (
        <button type="button" onClick={() => cartRef.current?.scrollIntoView({ behavior: "smooth" })} className="btn-primary fixed bottom-24 right-5 z-40 rounded-full py-3 shadow-lift xl:hidden">
          <ShoppingCart className="size-4" /> {count} · {formatPeso(total)}
        </button>
      )}
    </div>
  );
}
