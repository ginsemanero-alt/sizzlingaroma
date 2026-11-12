"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sessionFor } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import {
  barcodeSchema, fieldErrors, stockMoveSchema, transferSchema, type StockMoveInput, type TransferInput,
} from "@/lib/validation";
import type { ActionResult, MenuItem, ProductRow, StockMoveResult } from "@/lib/types";

function revalidateStock() {
  for (const p of ["/inventory", "/products", "/dashboard", "/expiry", "/movements"]) revalidatePath(p);
}

export async function moveStock(input: StockMoveInput): Promise<ActionResult<StockMoveResult>> {
  if (!(await sessionFor("scan"))) return { ok: false, error: "You are not allowed to change stock." };
  const parsed = stockMoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("stock_move", {
    p_product_id: v.product_id,
    p_type: v.type,
    p_quantity: v.quantity,
    p_method: v.method,
    p_note: v.note,
    p_expiry: v.type === "in" ? v.expiry_date : null,
    p_location_id: v.location_id,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidateStock();
  const r = data as StockMoveResult;
  return { ok: true, data: r, message: `${v.type === "in" ? "Added" : "Removed"} ${r.moved} ${r.unit} · ${r.product_name}` };
}

export async function transferStock(input: TransferInput): Promise<ActionResult> {
  if (!(await sessionFor("inventory"))) return { ok: false, error: "You are not allowed to transfer stock." };
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_stock", {
    p_product_id: v.product_id, p_from: v.from, p_to: v.to, p_quantity: v.quantity, p_note: v.note,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidateStock();
  return { ok: true, data: undefined, message: "Transfer saved." };
}

export type LookupResult =
  | { kind: "product"; product: ProductRow }
  | { kind: "menu"; item: MenuItem }
  | { kind: "none"; barcode: string };

/** Find a product (and optionally a menu item) by barcode. */
export async function lookupBarcode(raw: string, includeMenu = false): Promise<ActionResult<LookupResult>> {
  if (!(await sessionFor("scan"))) return { ok: false, error: "Not allowed." };
  const parsed = barcodeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid barcode." };
  const code = parsed.data;
  const supabase = await createClient();

  if (includeMenu) {
    const { data: menu } = await supabase.from("menu_items").select("id, name, category_id, price, barcode, is_active").eq("barcode", code).eq("is_active", true).maybeSingle<MenuItem>();
    if (menu) return { ok: true, data: { kind: "menu", item: menu } };
  }
  const { data, error } = await supabase.from("product_inventory").select("*").eq("barcode", code).maybeSingle<ProductRow>();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (data) return { ok: true, data: { kind: "product", product: data } };
  return { ok: true, data: { kind: "none", barcode: code } };
}

export async function assignBarcodes(ids: string[]): Promise<ActionResult<{ count: number }>> {
  if (!(await sessionFor("labels"))) return { ok: false, error: "Not allowed." };
  const parsed = z.array(z.uuid()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Select at least one product." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_barcodes", { p_product_ids: parsed.data });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/labels");
  revalidatePath("/products");
  return { ok: true, data: { count: data as number }, message: `Generated ${data} barcode${data === 1 ? "" : "s"}.` };
}
