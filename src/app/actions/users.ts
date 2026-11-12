"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sessionFor } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/errors";
import { USERNAME_DOMAIN } from "@/lib/env";
import { fieldErrors, newUserSchema, updateUserSchema, type NewUserInput } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

const NO_KEY = "User creation needs SUPABASE_SECRET_KEY on the server (see README → Users). You can also add users in the Supabase dashboard.";

export async function createUser(input: NewUserInput): Promise<ActionResult> {
  if (!(await sessionFor("users"))) return { ok: false, error: "Only the Owner can manage users." };
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: NO_KEY };
  const v = parsed.data;
  const isEmail = v.login.includes("@");
  const email = isEmail ? v.login : `${v.login}@${USERNAME_DOMAIN}`;

  const { error } = await admin.auth.admin.createUser({
    email,
    password: v.password,
    email_confirm: true,
    // app_metadata can only be written with the secret key — the DB trigger trusts it for the role.
    app_metadata: { role: v.role, name: v.name, username: isEmail ? null : v.login },
  });
  if (error) {
    const dup = /already|registered|exists/i.test(error.message);
    return { ok: false, error: dup ? "That email/username is already in use." : error.message, fieldErrors: dup ? { login: "Already in use" } : undefined };
  }
  revalidatePath("/users");
  return { ok: true, data: undefined, message: `${v.name} can now sign in as “${v.login}”.` };
}

export async function updateUser(input: z.input<typeof updateUserSchema>): Promise<ActionResult> {
  if (!(await sessionFor("users"))) return { ok: false, error: "Only the Owner can manage users." };
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid user details." };
  const v = parsed.data;
  const supabase = await createClient();
  const { error, count } = await supabase.from("profiles").update({ name: v.name, role: v.role, active: v.active }, { count: "exact" }).eq("id", v.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (!count) return { ok: false, error: "User not found." };
  revalidatePath("/users");
  return { ok: true, data: undefined, message: `${v.name} updated.` };
}

export async function resetPassword(id: string, password: string): Promise<ActionResult> {
  if (!(await sessionFor("users"))) return { ok: false, error: "Only the Owner can manage users." };
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Invalid user." };
  if (password.length < 8 || password.length > 72) return { ok: false, error: "Password must be 8–72 characters.", fieldErrors: { password: "8–72 characters" } };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: NO_KEY };
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined, message: "Password changed." };
}
