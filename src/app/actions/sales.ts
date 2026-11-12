"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sessionFor } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { barcodeSchema, fieldErrors, saleSchema, type SaleInput } from "@/lib/validation";
import type { ActionResult, MenuItem, SaleResult } from "@/lib/types";

export async function recordSale(input: SaleInput): Promise<ActionResult<SaleResult>> {
  if (!(await sessionFor("sale"))) return { ok: false, error: "You are not allowed to record sales." };
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sale.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  // Only ids + quantities are sent. Prices and totals are computed in the database.
  const { data, error } = await supabase.rpc("record_sale", {
    p_items: parsed.data.items,
    p_note: parsed.data.note,
    p_location_id: null,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  for (const p of ["/dashboard", "/best-sellers", "/inventory", "/products", "/movements", "/reports"]) revalidatePath(p);
  const r = data as SaleResult;
  return { ok: true, data: r, message: `Sale #${r.sale_no} saved.` };
}

/** Barcode → menu item. Falls back to a product barcode whose product is sold 1:1 as a menu item (e.g. bottled drinks). */
export async function lookupSaleBarcode(raw: string): Promise<ActionResult<MenuItem>> {
  if (!(await sessionFor("sale"))) return { ok: false, error: "Not allowed." };
  const parsed = barcodeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid barcode." };
  const supabase = await createClient();
  const cols = "id, name, category_id, price, barcode, is_active";

  const { data: menu } = await supabase.from("menu_items").select(cols).eq("barcode", parsed.data).eq("is_active", true).maybeSingle<MenuItem>();
  if (menu) return { ok: true, data: menu };

  const { data: product } = await supabase.from("products").select("id, name").eq("barcode", parsed.data).is("archived_at", null).maybeSingle<{ id: string; name: string }>();
  if (!product) return { ok: false, error: `No menu item or product with barcode ${parsed.data}.` };

  const { data: recipes } = await supabase.from("recipes").select("menu_item_id, menu_items!inner(id, is_active)").eq("product_id", product.id).eq("qty", 1);
  for (const r of recipes ?? []) {
    const { count } = await supabase.from("recipes").select("id", { count: "exact", head: true }).eq("menu_item_id", r.menu_item_id);
    if (count === 1) {
      const { data: item } = await supabase.from("menu_items").select(cols).eq("id", r.menu_item_id).eq("is_active", true).maybeSingle<MenuItem>();
      if (item) return { ok: true, data: item };
    }
  }
  return { ok: false, error: `${product.name} isn't sold as a menu item.` };
}
