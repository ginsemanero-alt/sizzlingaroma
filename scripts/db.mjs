// Run migrations and/or seed against DATABASE_URL using psql.
// Usage: node --env-file=.env.local scripts/db.mjs migrate|seed|all
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;
if (!url || url.includes("YOUR-PASSWORD")) {
  console.error("Set DATABASE_URL in .env.local (Supabase → Connect → Session pooler). URL-encode special characters in the password.");
  process.exit(1);
}
const mode = process.argv[2] ?? "all";
const files = [];
if (mode === "migrate" || mode === "all") {
  files.push(...readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort().map((f) => join("supabase/migrations", f)));
}
if (mode === "seed" || mode === "all") files.push("supabase/seed.sql");

for (const f of files) {
  console.log(`→ ${f}`);
  const r = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1", "-q", "-f", f], { stdio: "inherit" });
  if (r.error) {
    console.error("psql not found. Install the PostgreSQL client, or paste supabase/setup.sql into the Supabase SQL Editor.");
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log("Done.");
