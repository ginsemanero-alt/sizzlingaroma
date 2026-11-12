import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, History, ScanBarcode } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/permissions";
import { getCategories, getLocations, locationsForRole } from "@/lib/queries";
import type { ProductRow, StockStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { InventoryList, type InventoryItem } from "./inventory-list";

export const metadata: Metadata = { title: "Inventory" };

const clean = (s: string) => s.replace(/[%_,()\\*:."']/g, " ").trim().slice(0, 60);

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { profile } = await requireAccess("inventory");
  const sp = await searchParams;
  const supabase = await createClient();
  const [allLocations, categories] = await Promise.all([getLocations(), getCategories()]);
  const { allowed, defaultId, locked } = locationsForRole(allLocations, profile.role);

  let query = supabase.from("product_inventory").select("*").order("name");
  const term = clean(sp.q ?? "");
  if (term) query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%`);
  if (sp.category && /^[0-9a-f-]{36}$/i.test(sp.category)) query = query.eq("category_id", sp.category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ProductRow[];

  const items: InventoryItem[] = rows.map((p) => {
    const byLocation: Record<string, number> = {};
    for (const l of allLocations) byLocation[l.id] = Number(l.code === "kitchen" ? p.kitchen_qty : l.code === "dine_in" ? p.dine_in_qty : 0);
    // locked roles only see (and are judged on) their own location's stock
    const qty = locked ? (byLocation[defaultId] ?? 0) : Number(p.quantity);
    const status: StockStatus = qty <= 0 ? "out" : qty <= Number(p.min_stock) ? "low" : "ok";
    return { id: p.id, name: p.name, unit: p.unit, category: p.category_name, barcode: p.barcode, minStock: Number(p.min_stock), quantity: qty, status, byLocation };
  });

  return (
    <div>
      <PageHeader
        title={locked ? `${allowed[0]?.name ?? ""} Inventory` : "Inventory"}
        subtitle="Current stock per product. Add or remove stock manually, or use the scanner."
        actions={
          <>
            {can(profile.role, "movements") && <Link href="/movements" className="btn-ghost"><History className="size-4" /> Movement log</Link>}
            <Link href="/scan" className="btn-primary"><ScanBarcode className="size-4" /> Scan In/Out</Link>
          </>
        }
      />
      <div className="space-y-4">
        <FilterBar searchPlaceholder="Search product or barcode…" selects={[{ name: "category", label: "Category", allLabel: "All categories", options: categories.map((c) => ({ value: c.id, label: c.name })) }]} />
        {items.length === 0 ? (
          <div className="card"><EmptyState icon={<Boxes className="size-7" />} title={term ? "No matching items" : "No inventory yet"} description={term ? "Try a different search." : "Products added by the Owner will show here."} /></div>
        ) : (
          <InventoryList items={items} visibleLocations={allowed} allLocations={allLocations} defaultLocationId={defaultId} />
        )}
      </div>
    </div>
  );
}
