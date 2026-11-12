"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sessionFor } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { fieldErrors, productSchema, type ProductInput } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

const DENIED = { ok: false as const, error: "Only the Owner can manage products." };

function revalidateInventory() {
  for (const p of ["/products", "/inventory", "/dashboard", "/expiry", "/labels", "/scan"]) revalidatePath(p);
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const session = await sessionFor("products");
  if (session?.profile.role !== "owner") return DENIED;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_product", {
    p_name: v.name,
    p_category_id: v.category_id,
    p_unit: v.unit,
    p_min_stock: v.min_stock,
    p_price: v.price,
    p_expiry: v.expiry_date,
    p_supplier: v.supplier,
    p_barcode: v.barcode,
    p_quantity: v.quantity,
    p_location_id: null,
  });
  if (error) {
    const msg = dbErrorMessage(error);
    return { ok: false, error: msg, fieldErrors: error.code === "23505" ? { barcode: msg } : undefined };
  }
  revalidateInventory();
  return { ok: true, data: { id: data as string }, message: `${v.name} added.` };
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const session = await sessionFor("products");
  if (session?.profile.role !== "owner") return DENIED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid product." };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("products")
    .update(
      {
        name: v.name, category_id: v.category_id, unit: v.unit, min_stock: v.min_stock, price: v.price,
        expiry_date: v.expiry_date, supplier: v.supplier, barcode: v.barcode,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .is("archived_at", null);
  if (error) {
    const msg = error.code === "23505" ? "That barcode is already used by another product." : dbErrorMessage(error);
    return { ok: false, error: msg, fieldErrors: error.code === "23505" ? { barcode: msg } : undefined };
  }
  if (!count) return { ok: false, error: "Product not found or you don't have permission." };
  revalidateInventory();
  return { ok: true, data: undefined, message: `${v.name} updated.` };
}

export async function deleteProduct(id: string): Promise<ActionResult<{ mode: string }>> {
  const session = await sessionFor("products");
  if (session?.profile.role !== "owner") return DENIED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid product." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_product", { p_product_id: id });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidateInventory();
  return {
    ok: true,
    data: { mode: data as string },
    message: data === "archived" ? "Product removed (history kept in the movement log)." : "Product deleted.",
  };
}
