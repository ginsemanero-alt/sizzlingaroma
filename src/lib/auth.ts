import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, homePathFor, type NavKey } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

export interface Session {
  userId: string;
  email: string | null;
  profile: Profile;
}

/** Current user + profile, validated against Supabase Auth (not just the cookie). Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, username, role, location_id, active, created_at")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile) return null;
  return { userId: user.id, email: user.email ?? null, profile };
});

/** For pages: redirect away when not signed in, inactive, or lacking access. */
export async function requireAccess(key?: NavKey): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.profile.active) redirect("/login?error=inactive");
  if (key && !can(session.profile.role, key)) redirect(homePathFor(session.profile.role));
  return session;
}

/** For server actions: returns the session or null (never trusts client-sent roles). */
export async function sessionFor(key: NavKey): Promise<Session | null> {
  const session = await getSession();
  if (!session || !session.profile.active || !can(session.profile.role, key)) return null;
  return session;
}
