import type { PostgrestError } from "@supabase/supabase-js";

/** Codes raised deliberately by our SQL functions carry user-friendly messages. */
const FRIENDLY = new Set(["P0001", "P0002", "22023", "23505", "42501"]);

export function dbErrorMessage(error: PostgrestError | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code === "23505" && !error.message.includes("already used")) return "That value is already in use (duplicate).";
  if (error.code === "42501" && error.message.includes("row-level security")) return "You don't have permission to do that.";
  if (error.code && FRIENDLY.has(error.code)) return error.message;
  if (error.code === "23503") return "This record is linked to other data and can't be changed that way.";
  console.error("[db]", error.code, error.message);
  return fallback;
}
