"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_DOMAIN } from "@/lib/env";
import { homePathFor } from "@/lib/permissions";
import { fieldErrors, loginSchema } from "@/lib/validation";
import type { AppRole } from "@/lib/types";

export interface LoginState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: { login: string };
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ login: formData.get("login"), password: formData.get("password") });
  const login = String(formData.get("login") ?? "");
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { login } };

  const raw = parsed.data.login.toLowerCase();
  const email = raw.includes("@") ? raw : `${raw}@${USERNAME_DOMAIN}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error || !data.user) {
    return { error: "Incorrect email/username or password.", values: { login } };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle<{ role: AppRole; active: boolean }>();

  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "Your account is not active yet. Ask the Owner to enable it.", values: { login } };
  }

  const next = String(formData.get("next") ?? "");
  // only allow internal relative paths
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? homePathFor(profile.role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
