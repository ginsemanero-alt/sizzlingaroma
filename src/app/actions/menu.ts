"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sessionFor } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { fieldErrors, menuItemSchema, type MenuItemInput } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function saveMenuItem(input: MenuItemInput): Promise<ActionResult<{ id: string }>> {
  if (!(await sessionFor("menu"))) return { ok: false, error: "Only the Owner can edit the menu." };
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_menu_item", {
    p_id: v.id,
    p_name: v.name,
    p_category_id: v.category_id,
    p_price: v.price,
    p_barcode: v.barcode,
    p_is_active: v.is_active,
    p_recipe: v.recipe,
  });
  if (error) {
    const msg = error.code === "23505" ? "Name or barcode is already used by another menu item." : dbErrorMessage(error);
    return { ok: false, error: msg };
  }
  revalidatePath("/menu");
  revalidatePath("/sales/new");
  return { ok: true, data: { id: data as string }, message: `${v.name} saved.` };
}
