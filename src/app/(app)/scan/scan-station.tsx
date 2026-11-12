"use client";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CircleCheck, CircleX, LoaderCircle, Minus, PackagePlus, Plus, Tag, Zap } from "lucide-react";
import { lookupBarcode, moveStock } from "@/app/actions/stock";
import { CameraScanner } from "@/components/scan/camera-scanner";
import { ScanInput, type ScanInputHandle } from "@/components/scan/scan-input";
import { StockBadge, ExpiryBadge } from "@/components/ui/badges";
import { Field } from "@/components/ui/field";
import type { Location, ProductRow } from "@/lib/types";
import { cn, formatQty } from "@/lib/utils";

type Mode = "in" | "out";
interface LogEntry {
  id: number;
  ok: boolean;
  mode: Mode;
  name: string;
  qty: number;
  unit: string;
  after?: number;
  message: string;
  at: Date;
}

export function ScanStation({
  locations,
  defaultLocationId,
  canCreate,
  initialMode,
}: {
  locations: Location[];
  defaultLocationId: string;
  canCreate: boolean;
  initialMode: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [quick, setQuick] = useState(false);
  const [camera, setCamera] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [qty, setQty] = useState("1");
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [looking, startLookup] = useTransition();
  const [saving, startSave] = useTransition();
  const scanRef = useRef<ScanInputHandle>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const pushLog = (e: Omit<LogEntry, "id" | "at">) => setLog((l) => [{ ...e, id: ++seq.current, at: new Date() }, ...l].slice(0, 15));

  const save = useCallback(
    (p: ProductRow, amount: number, method: "scan" | "manual" = "scan") => {
      startSave(async () => {
        const res = await moveStock({
          product_id: p.id,
          type: mode,
          quantity: amount,
          method,
          note,
          expiry_date: mode === "in" ? expiry : "",
          location_id: locationId,
        });
        if (!res.ok) {
          setError(res.fieldErrors?.quantity ?? res.error);
          toast.error(res.error, { description: p.name });
          pushLog({ ok: false, mode, name: p.name, qty: amount, unit: p.unit, message: res.error });
          return;
        }
        const r = res.data;
        toast.success(`${mode === "in" ? "+" : "−"}${formatQty(r.moved)} ${r.unit} · ${r.product_name}`, {
          description: `Now ${formatQty(r.total_quantity)} ${r.unit} in stock`,
        });
        pushLog({ ok: true, mode, name: r.product_name, qty: r.moved, unit: r.unit, after: r.total_quantity, message: "Saved" });
        setProduct((cur) => (cur && cur.id === p.id ? { ...cur, quantity: r.total_quantity, stock_status: r.total_quantity <= 0 ? "out" : r.total_quantity <= cur.min_stock ? "low" : "ok" } : cur));
        setQty("1");
        setNote("");
        setExpiry("");
        setError("");
        scanRef.current?.focus();
      });
    },
    [mode, note, expiry, locationId],
  );

  const handleScan = useCallback(
    (code: string) => {
      setError("");
      setNotFound(null);
      startLookup(async () => {
        const res = await lookupBarcode(code);
        if (!res.ok) {
          toast.error(res.error);
          setProduct(null);
          return;
        }
        if (res.data.kind !== "product") {
          setProduct(null);
          setNotFound(code);
          toast.error("Barcode not found", { description: code });
          pushLog({ ok: false, mode, name: code, qty: 0, unit: "", message: "Not found" });
          return;
        }
        const p = res.data.product;
        // scanning the same product again in normal mode bumps the quantity
        if (!quick && product?.id === p.id) {
          setQty((q) => String((Number(q) || 0) + 1));
          return;
        }
        setProduct(p);
        setQty("1");
        if (quick) save(p, 1, "scan");
        else setTimeout(() => qtyRef.current?.select(), 50);
      });
    },
    [quick, product, save, mode],
  );

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a quantity greater than 0.");
      qtyRef.current?.focus();
      return;
    }
    if (mode === "out" && n > Number(product.quantity)) {
      setError(`Only ${formatQty(product.quantity)} ${product.unit} in stock.`);
      qtyRef.current?.focus();
      return;
    }
    save(product, n, "scan");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="card grid grid-cols-2 gap-2 rounded-[2.5rem] p-2" role="radiogroup" aria-label="Scan mode">
          {(["in", "out"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                scanRef.current?.focus();
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-[2rem] py-4 text-lg font-black transition duration-200",
                mode === m ? (m === "in" ? "bg-ok text-white shadow-soft" : "bg-bad text-white shadow-soft") : "text-muted hover:bg-sand/60",
              )}
            >
              {m === "in" ? <Plus className="size-5" /> : <Minus className="size-5" />}
              Stock {m === "in" ? "In" : "Out"}
            </button>
          ))}
        </div>

        <div className="card space-y-4 rounded-[2.5rem] p-5 sm:p-6">
          <ScanInput ref={scanRef} onScan={handleScan} />
          <div className="grid gap-3 sm:grid-cols-2">
            <CameraScanner active={camera} onActiveChange={setCamera} onDetected={handleScan} />
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-sand/60 px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm font-bold"><Zap className="size-4 text-primary" /> Quick mode <span className="font-normal text-muted">(1 per scan)</span></span>
              <input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} className="size-5 accent-[#FF5A1F]" />
            </label>
          </div>
          {locations.length > 1 && (
            <Field id="scan-location" label="Location">
              <select id="scan-location" className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          )}
        </div>

        {/* Result */}
        <div aria-live="polite">
          {looking ? (
            <div className="card flex items-center gap-3 rounded-[2.5rem] p-6 text-muted"><LoaderCircle className="size-5 animate-spin" /> Looking up barcode…</div>
          ) : notFound ? (
            <div className="card rounded-[2.5rem] p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warn-soft text-warn"><CircleX className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">Barcode not found</h2>
                  <p className="font-mono text-sm text-muted break-all">{notFound}</p>
                  {canCreate ? (
                    <Link href={`/products/new?barcode=${encodeURIComponent(notFound)}&from=scan`} className="btn-primary mt-4">
                      <PackagePlus className="size-4" /> Create new product
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm">Ask the Owner to add this product, or check the barcode label.</p>
                  )}
                </div>
              </div>
            </div>
          ) : product ? (
            <form onSubmit={submitManual} className="card space-y-5 rounded-[2.5rem] p-6" noValidate>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">{product.category_name ?? "Product"}</p>
                  <h2 className="text-2xl font-black leading-tight">{product.name}</h2>
                  <p className="font-mono text-xs text-muted">{product.barcode}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StockBadge status={product.stock_status} />
                    {product.expiry_date && <ExpiryBadge date={product.expiry_date} />}
                  </div>
                </div>
                <div className="shrink-0 rounded-3xl bg-cream px-4 py-3 text-right">
                  <p className="text-[11px] font-bold uppercase text-muted">In stock</p>
                  <p className="text-3xl font-black leading-none">{formatQty(product.quantity)}</p>
                  <p className="text-xs font-bold text-muted">{product.unit}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="scan-qty" label={`Quantity (${product.unit})`} error={error}>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn-ghost size-12 shrink-0 !p-0" onClick={() => setQty((q) => String(Math.max(0, (Number(q) || 0) - 1)))} aria-label="Decrease quantity"><Minus className="size-4" /></button>
                    <input ref={qtyRef} id="scan-qty" type="number" inputMode="decimal" step="any" min="0" value={qty} onChange={(e) => setQty(e.target.value)} className="input text-center text-lg font-black" aria-invalid={!!error} />
                    <button type="button" className="btn-ghost size-12 shrink-0 !p-0" onClick={() => setQty((q) => String((Number(q) || 0) + 1))} aria-label="Increase quantity"><Plus className="size-4" /></button>
                  </div>
                </Field>
                {mode === "in" && (
                  <Field id="scan-expiry" label="Expiry date (optional)">
                    <input id="scan-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input" />
                  </Field>
                )}
                <Field id="scan-note" label="Note (optional)" className={mode === "in" ? "sm:col-span-2" : ""}>
                  <input id="scan-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="input" placeholder={mode === "in" ? "Delivery / supplier ref" : "Reason (spoilage, used, …)"} />
                </Field>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-ghost" onClick={() => { setProduct(null); scanRef.current?.focus(); }}>Clear</button>
                <button type="submit" disabled={saving} className={cn("btn py-3.5 text-base text-white", mode === "in" ? "bg-ok" : "bg-bad")}>
                  {saving ? <LoaderCircle className="size-4 animate-spin" /> : mode === "in" ? <Plus className="size-4" /> : <Minus className="size-4" />}
                  Save stock {mode}
                </button>
              </div>
            </form>
          ) : (
            <div className="card grid place-items-center gap-2 rounded-[2.5rem] p-10 text-center">
              <span className="grid size-16 place-items-center rounded-[1.6rem] bg-primary-soft text-primary"><Tag className="size-7" /></span>
              <p className="text-lg font-black">Ready to scan</p>
              <p className="max-w-sm text-sm text-muted">Scan a product barcode. No barcode on an item? <Link href="/labels" className="font-bold text-primary underline-offset-2 hover:underline">Print a label</Link>.</p>
            </div>
          )}
        </div>
      </div>

      {/* Session log */}
      <aside className="card h-fit rounded-[2.5rem] p-5" aria-label="Recent scans">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">This session</h2>
          {saving && <LoaderCircle className="size-4 animate-spin text-muted" aria-label="Saving" />}
        </div>
        {log.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Scans you save will appear here.</p>
        ) : (
          <ul className="space-y-2">
            {log.map((e) => (
              <li key={e.id} className={cn("flex items-start gap-3 rounded-2xl p-3", e.ok ? "bg-cream" : "bg-bad-soft/60")}>
                {e.ok ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-ok" /> : <CircleX className="mt-0.5 size-5 shrink-0 text-bad" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.name}</p>
                  <p className="text-xs text-muted">
                    {e.ok ? `${e.mode === "in" ? "+" : "−"}${formatQty(e.qty)} ${e.unit} → ${formatQty(e.after)} ${e.unit}` : e.message}
                  </p>
                </div>
                <time className="shrink-0 text-[11px] text-muted">{e.at.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</time>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
