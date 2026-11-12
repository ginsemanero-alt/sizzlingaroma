import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import type { MenuItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { SaleTerminal } from "./sale-terminal";

export const metadata: Metadata = { title: "Record Sale" };

export default async function RecordSalePage() {
  await requireAccess("sale");
  const supabase = await createClient();
  const [{ data, error }, categories] = await Promise.all([
    supabase.from("menu_items").select("id, name, category_id, price, barcode, is_active").eq("is_active", true).order("name"),
    getCategories("menu"),
  ]);
  if (error) throw new Error(error.message);
  return (
    <div>
      <PageHeader title="Record Sale" subtitle="Tap menu items or scan. Ingredients are deducted from inventory automatically." />
      <SaleTerminal items={(data ?? []) as MenuItem[]} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
