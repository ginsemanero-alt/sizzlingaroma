// Create (or promote) the first Owner account.
// Usage: node --env-file=.env.local scripts/create-owner.mjs <email-or-username> <password> "<Full Name>"
import { createClient } from "@supabase/supabase-js";

const [login, password, name = "Owner"] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.NEXT_PUBLIC_USERNAME_DOMAIN || "staff.sizzlingaroma.local";

if (!login || !password) {
  console.error('Usage: npm run create-owner -- <email-or-username> <password> "Full Name"');
  process.exit(1);
}
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const username = login.includes("@") ? null : login.toLowerCase();
const email = username ? `${username}@${domain}` : login.toLowerCase();
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  app_metadata: { role: "owner", name, username },
});
if (error && !/already/i.test(error.message)) {
  console.error(error.message);
  process.exit(1);
}
let id = data?.user?.id;
if (!id) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  id = list.users.find((u) => u.email === email)?.id;
}
const { error: upErr } = await admin.from("profiles").update({ role: "owner", active: true, name, username }).eq("id", id);
if (upErr) {
  console.error("Profile update failed:", upErr.message);
  process.exit(1);
}
console.log(`Owner ready. Sign in with "${login}".`);
