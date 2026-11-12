import "server-only";
import { createClient } from "@/lib/supabase/server";
import { lockedLocationCode } from "@/lib/permissions";
import type { AppRole, Category, Location } from "@/lib/types";

export async function getLocations(): Promise<Location[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("locations").select("id, code, name, is_default").order("is_default", { ascending: false }).order("name");
  return (data ?? []) as Location[];
}

export async function getCategories(kind?: Category["kind"] | Category["kind"][]): Promise<Category[]> {
  const supabase = await createClient();
  let q = supabase.from("categories").select("id, name, kind, sort_order").order("sort_order").order("name");
  if (kind) q = Array.isArray(kind) ? q.in("kind", kind) : q.eq("kind", kind);
  const { data } = await q;
  return (data ?? []) as Category[];
}

/** Locations a role may work in + the one to preselect. */
export function locationsForRole(all: Location[], role: AppRole) {
  const code = lockedLocationCode(role);
  const allowed = code ? all.filter((l) => l.code === code) : all;
  const preferred = allowed.find((l) => l.is_default) ?? allowed[0] ?? null;
  return { allowed, defaultId: preferred?.id ?? "", locked: !!code };
}
