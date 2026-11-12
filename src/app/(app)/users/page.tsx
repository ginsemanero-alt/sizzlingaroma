import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { UsersManager } from "./users-manager";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const { userId } = await requireAccess("users");
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, name, username, role, location_id, active, created_at").order("created_at");
  if (error) throw new Error(error.message);
  const admin = createAdminClient();
  const emails: Record<string, string> = {};
  if (admin) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of list?.users ?? []) if (u.email) emails[u.id] = u.email;
  }
  return (
    <div>
      <PageHeader title="Users" subtitle="Staff accounts and roles. Permissions are enforced by the database, not just this screen." />
      <UsersManager users={(data ?? []) as Profile[]} emails={emails} meId={userId} canCreate={!!admin} />
    </div>
  );
}
