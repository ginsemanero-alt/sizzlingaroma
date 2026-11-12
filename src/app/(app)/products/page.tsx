import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus, ScanBarcode } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getLocations, locationsForRole } from "@/lib/queries";
import type { ProductRow, StockStatus } from "@/lib/types";
import { formatPeso, formatQty } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, PillFilter } from "@/components/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpiryBadge, StockBadge } from "@/components/ui/badges";
import { ProductRowActions } from "@/components/products/product-row-actions";

export const metadata: Metadata = { title: "Products" };

const clean = (s: string) => s.replace(/[%_,()\\*:."']/g, " ").trim().slice(0, 60);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const { profile } = await requireAccess("products");
  const sp = await searchParams;
  const isOwner = profile.role === "owner";
  const supabase = await createClient();
  const [categories, allLocations] = await Promise.all([getCategories(), getLocations()]);
  const { allowed, defaultId } = locationsForRole(allLocations, profile.role);

  let query = supabase.from("product_inventory").select("*").order("name");
  const term = clean(sp.q ?? "");
  if (term) query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%,supplier.ilike.%${term}%`);
  if (sp.category && /^[0-9a-f-]{36}$/i.test(sp.category)) query = query.eq("category_id", sp.category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const all = (data ?? []) as ProductRow[];

  const counts: Record<StockStatus, number> = { ok: 0, low: 0, out: 0 };
  all.forEach((p) => counts[p.stock_status]++);
  const status = sp.status === "low" || sp.status === "out" || sp.status === "ok" ? sp.status : "";
  // "low" filter includes out-of-stock items too (both need attention)
  const rows = status === "low" ? all.filter((p) => p.stock_status !== "ok") : status ? all.filter((p) => p.stock_status === status) : all;

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${all.length} item${all.length === 1 ? "" : "s"} · stock badges update live from inventory`}
        actions={
          <>
            <Link href="/scan" className="btn-ghost"><ScanBarcode className="size-4" /> Scan</Link>
            {isOwner && <Link href="/products/new" className="btn-primary"><Plus className="size-4" /> Add product</Link>}
          </>
        }
      />
      <div className="space-y-4">
        <FilterBar
          searchPlaceholder="Search name, barcode or supplier…"
          selects={[{ name: "category", label: "Category", allLabel: "All categories", options: categories.map((c) => ({ value: c.id, label: c.name })) }]}
        />
        <PillFilter
          name="status"
          value={status}
          options={[
            { value: "", label: "All", count: all.length },
            { value: "ok", label: "OK", count: counts.ok },
            { value: "low", label: "Low & Out", count: counts.low + counts.out },
            { value: "out", label: "Out", count: counts.out },
          ]}
        />

        {rows.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Package className="size-7" />}
              title={all.length === 0 && !term ? "No products yet" : "No matching products"}
              description={all.length === 0 && !term ? "Add your first product or scan a barcode to get started." : "Try another search or filter."}
              action={isOwner && all.length === 0 && !term ? <Link href="/products/new" className="btn-primary"><Plus className="size-4" /> Add product</Link> : undefined}
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card hidden overflow-hidden lg:block">
              <table className="w-full">
                <caption className="sr-only">Products</caption>
                <thead className="bg-cream/60">
                  <tr>
                    <th scope="col" className="table-head">Product</th>
                    <th scope="col" className="table-head">Category</th>
                    <th scope="col" className="table-head text-right">Stock</th>
                    <th scope="col" className="table-head">Status</th>
                    <th scope="col" className="table-head">Expiry</th>
                    <th scope="col" className="table-head text-right">Price</th>
                    <th scope="col" className="table-head text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {rows.map((p) => (
                    <tr key={p.id} className="transition hover:bg-cream/50">
                      <td className="table-cell">
                        <p className="font-bold">{p.name}</p>
                        <p className="font-mono text-xs text-muted">{p.barcode ?? "—"}{p.supplier ? ` · ${p.supplier}` : ""}</p>
                      </td>
                      <td className="table-cell text-muted">{p.category_name ?? "—"}</td>
                      <td className="table-cell text-right">
                        <span className="font-black">{formatQty(p.quantity)}</span> <span className="text-xs text-muted">{p.unit}</span>
                        <p className="text-[11px] text-muted">min {formatQty(p.min_stock)}</p>
                      </td>
                      <td className="table-cell"><StockBadge status={p.stock_status} /></td>
                      <td className="table-cell">{p.expiry_date ? <ExpiryBadge date={p.expiry_date} /> : <span className="text-muted">—</span>}</td>
                      <td className="table-cell text-right font-semibold">{formatPeso(p.price)}</td>
                      <td className="table-cell">
                        <ProductRowActions product={{ id: p.id, name: p.name, unit: p.unit, quantity: Number(p.quantity) }} isOwner={isOwner} locations={allowed} defaultLocationId={defaultId} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="space-y-3 lg:hidden">
              {rows.map((p) => (
                <li key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold leading-tight">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{p.category_name ?? "Uncategorized"} · <span className="font-mono">{p.barcode ?? "no barcode"}</span></p>
                    </div>
                    <StockBadge status={p.stock_status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black leading-none">{formatQty(p.quantity)} <span className="text-sm font-bold text-muted">{p.unit}</span></p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {p.expiry_date && <ExpiryBadge date={p.expiry_date} />}
                        <span className="text-xs text-muted">{formatPeso(p.price)}</span>
                      </div>
                    </div>
                    <ProductRowActions product={{ id: p.id, name: p.name, unit: p.unit, quantity: Number(p.quantity) }} isOwner={isOwner} locations={allowed} defaultLocationId={defaultId} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
