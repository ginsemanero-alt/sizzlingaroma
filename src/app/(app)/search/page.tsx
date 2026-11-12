import type { Metadata } from "next";
import Link from "next/link";
import { Package, Receipt, Search } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/types";
import { formatDateTime, formatPeso, formatQty } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/search-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { StockBadge } from "@/components/ui/badges";

export const metadata: Metadata = { title: "Search" };

interface SaleHit {
  id: string;
  sale_no: number;
  sold_at: string;
  total: number;
  sale_items: { quantity: number; menu_items: { name: string } | null }[];
}

/** Escape characters that have meaning in PostgREST filter strings / LIKE patterns. */
const clean = (s: string) => s.replace(/[%_,()\\*:."']/g, " ").trim();

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAccess("search");
  const { q = "" } = await searchParams;
  const term = clean(q).slice(0, 60);
  const supabase = await createClient();

  let products: ProductRow[] = [];
  let sales: SaleHit[] = [];
  if (term) {
    const saleNo = /^#?\d+$/.test(q.trim()) ? Number(q.trim().replace("#", "")) : null;
    const [pRes, menuRes] = await Promise.all([
      supabase.from("product_inventory").select("*")
        .or(`name.ilike.%${term}%,barcode.ilike.%${term}%,supplier.ilike.%${term}%,category_name.ilike.%${term}%`)
        .order("name").limit(25),
      supabase.from("menu_items").select("id").ilike("name", `%${term}%`).limit(20),
    ]);
    products = (pRes.data ?? []) as ProductRow[];
    const menuIds = (menuRes.data ?? []).map((m) => m.id as string);

    let saleIds: string[] = [];
    if (menuIds.length) {
      const { data } = await supabase.from("sale_items").select("sale_id").in("menu_item_id", menuIds).order("sale_id").limit(200);
      saleIds = [...new Set((data ?? []).map((r) => r.sale_id as string))];
    }
    let query = supabase.from("sales").select("id, sale_no, sold_at, total, sale_items(quantity, menu_items(name))").order("sold_at", { ascending: false }).limit(20);
    if (saleNo !== null) query = query.eq("sale_no", saleNo);
    else if (saleIds.length) query = query.in("id", saleIds.slice(0, 200));
    else query = query.ilike("note", `%${term}%`);
    const sRes = await query;
    sales = (sRes.data ?? []) as unknown as SaleHit[];
  }

  return (
    <div>
      <PageHeader title="Search" subtitle={term ? `Results for “${q}”` : "Find products, barcodes and sales"} />
      <SearchBar defaultValue={q} />
      {!term ? (
        <EmptyState icon={<Search className="size-7" />} title="Type to search" description="Search by product name, barcode, supplier, category, menu item or sale number (e.g. #120)." />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="card p-6" aria-labelledby="res-products">
            <h2 id="res-products" className="mb-3 flex items-center gap-2 font-black"><Package className="size-5 text-primary" /> Products ({products.length})</h2>
            {products.length === 0 ? (
              <EmptyState title="No products found" className="py-8" />
            ) : (
              <ul className="divide-y divide-sand">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products?q=${encodeURIComponent(p.name)}`} className="flex items-center justify-between gap-3 rounded-2xl px-2 py-3 hover:bg-cream">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{p.name}</p>
                        <p className="truncate text-xs text-muted">{p.category_name ?? "Uncategorized"} · {p.barcode ?? "no barcode"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold">{formatQty(p.quantity)} {p.unit}</span>
                        <StockBadge status={p.stock_status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-6" aria-labelledby="res-sales">
            <h2 id="res-sales" className="mb-3 flex items-center gap-2 font-black"><Receipt className="size-5 text-primary" /> Sales ({sales.length})</h2>
            {sales.length === 0 ? (
              <EmptyState title="No sales found" className="py-8" />
            ) : (
              <ul className="divide-y divide-sand">
                {sales.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-3 px-2 py-3">
                    <div className="min-w-0">
                      <p className="font-bold">Sale #{s.sale_no}</p>
                      <p className="text-xs text-muted">{formatDateTime(s.sold_at)}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-ink/70">
                        {s.sale_items.map((i) => `${i.quantity}× ${i.menu_items?.name ?? "Item"}`).join(", ")}
                      </p>
                    </div>
                    <span className="shrink-0 font-black">{formatPeso(s.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
