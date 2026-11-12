import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import { PageHeader } from "@/components/ui/page-header";
import { MenuManager, type MenuRow } from "./menu-manager";

export const metadata: Metadata = { title: "Menu & Recipes" };

export default async function MenuPage() {
  await requireAccess("menu");
  const supabase = await createClient();
  const [menuRes, productsRes, categories] = await Promise.all([
    supabase.from("menu_items").select("id, name, category_id, price, barcode, is_active, recipes(product_id, qty)").order("name"),
    supabase.from("products").select("id, name, unit").is("archived_at", null).order("name"),
    getCategories("menu"),
  ]);
  if (menuRes.error) throw new Error(menuRes.error.message);
  return (
    <div>
      <PageHeader title="Menu & Recipes" subtitle="Menu prices and the ingredients each serving uses. Recording a sale deducts these automatically." />
      <MenuManager
        items={(menuRes.data ?? []) as unknown as MenuRow[]}
        products={(productsRes.data ?? []) as { id: string; name: string; unit: string }[]}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
