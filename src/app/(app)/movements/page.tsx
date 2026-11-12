import type { Metadata } from "next";
import { History } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MovementRow } from "@/lib/types";
import { addDaysISO, formatDateTime, formatQty, isISODate, manilaDayStart } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { MethodBadge, MovementTypeBadge } from "@/components/ui/badges";
import { Pagination } from "@/components/pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stock Movement Log" };

const PAGE = 50;
const UUID = /^[0-9a-f-]{36}$/i;
const TYPES = ["in", "out", "sale", "transfer_in", "transfer_out"];

type SP = { product?: string; user?: string; type?: string; method?: string; from?: string; to?: string; page?: string };

export default async function MovementsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAccess("movements");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  const [productsRes, usersRes] = await Promise.all([
    supabase.from("products").select("id, name").is("archived_at", null).order("name"),
    supabase.from("profiles").select("id, name").order("name"),
  ]);

  let q = supabase.from("stock_movement_log").select("*").order("created_at", { ascending: false }).order("id", { ascending: false });
  if (sp.product && UUID.test(sp.product)) q = q.eq("product_id", sp.product);
  if (sp.user && UUID.test(sp.user)) q = q.eq("user_id", sp.user);
  if (sp.type && TYPES.includes(sp.type)) q = q.eq("type", sp.type);
  if (sp.method && ["scan", "manual", "sale", "transfer"].includes(sp.method)) q = q.eq("method", sp.method);
  if (isISODate(sp.from)) q = q.gte("created_at", manilaDayStart(sp.from));
  if (isISODate(sp.to)) q = q.lt("created_at", manilaDayStart(addDaysISO(sp.to, 1)));
  const { data, error } = await q.range((page - 1) * PAGE, page * PAGE);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as MovementRow[];
  const hasMore = rows.length > PAGE;
  const list = rows.slice(0, PAGE);

  const totalIn = list.filter((r) => r.delta > 0).reduce((s, r) => s + Number(r.quantity), 0);
  const totalOut = list.filter((r) => r.delta < 0).reduce((s, r) => s + Number(r.quantity), 0);
  const singleProduct = sp.product && UUID.test(sp.product) && list[0];

  return (
    <div>
      <PageHeader title="Stock Movement Log" subtitle="Every stock in, stock out, sale deduction and transfer — who, when and how." />
      <div className="space-y-4">
        <FilterBar
          showSearch={false}
          dateRange
          selects={[
            { name: "product", label: "Product", allLabel: "All products", options: (productsRes.data ?? []).map((p) => ({ value: p.id as string, label: p.name as string })) },
            { name: "user", label: "User", allLabel: "All users", options: (usersRes.data ?? []).map((u) => ({ value: u.id as string, label: (u.name as string) || "Unnamed" })) },
            {
              name: "type", label: "Type", allLabel: "All types",
              options: [
                { value: "in", label: "Stock in" }, { value: "out", label: "Stock out" }, { value: "sale", label: "Sale deduction" },
                { value: "transfer_in", label: "Transfer in" }, { value: "transfer_out", label: "Transfer out" },
              ],
            },
            { name: "method", label: "Method", allLabel: "All methods", options: ["scan", "manual", "sale", "transfer"].map((m) => ({ value: m, label: m[0].toUpperCase() + m.slice(1) })) },
          ]}
        />

        {singleProduct && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4"><p className="text-xs font-bold uppercase text-muted">Added (this page)</p><p className="text-2xl font-black text-ok">+{formatQty(totalIn)} {list[0].unit}</p></div>
            <div className="card p-4"><p className="text-xs font-bold uppercase text-muted">Deducted (this page)</p><p className="text-2xl font-black text-bad">−{formatQty(totalOut)} {list[0].unit}</p></div>
          </div>
        )}

        {list.length === 0 ? (
          <div className="card"><EmptyState icon={<History className="size-7" />} title="No movements found" description="Stock changes will be logged here automatically." /></div>
        ) : (
          <>
            <div className="card hidden overflow-x-auto lg:block">
              <table className="w-full">
                <caption className="sr-only">Stock movements</caption>
                <thead className="bg-cream/60">
                  <tr>
                    <th scope="col" className="table-head">Date</th>
                    <th scope="col" className="table-head">Product</th>
                    <th scope="col" className="table-head">Type</th>
                    <th scope="col" className="table-head text-right">Qty</th>
                    <th scope="col" className="table-head text-right">Balance</th>
                    <th scope="col" className="table-head">Location</th>
                    <th scope="col" className="table-head">User</th>
                    <th scope="col" className="table-head">Method</th>
                    <th scope="col" className="table-head">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {list.map((m) => (
                    <tr key={m.id} className="hover:bg-cream/50">
                      <td className="table-cell whitespace-nowrap text-muted">{formatDateTime(m.created_at)}</td>
                      <td className="table-cell font-bold">{m.product_name}</td>
                      <td className="table-cell"><MovementTypeBadge type={m.type} /></td>
                      <td className={cn("table-cell text-right font-black tabular-nums", m.delta > 0 ? "text-ok" : "text-bad")}>
                        {m.delta > 0 ? "+" : "−"}{formatQty(m.quantity)} <span className="text-xs font-semibold text-muted">{m.unit}</span>
                      </td>
                      <td className="table-cell text-right tabular-nums">{formatQty(m.balance_after)}</td>
                      <td className="table-cell text-muted">{m.location_name}</td>
                      <td className="table-cell">{m.user_name ?? <span className="text-muted">System</span>}</td>
                      <td className="table-cell"><MethodBadge method={m.method} /></td>
                      <td className="table-cell max-w-56 truncate text-muted" title={m.note ?? undefined}>{m.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-3 lg:hidden">
              {list.map((m) => (
                <li key={m.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold leading-tight">{m.product_name}</p>
                      <p className="text-xs text-muted">{formatDateTime(m.created_at)} · {m.user_name ?? "System"}</p>
                    </div>
                    <p className={cn("shrink-0 text-lg font-black tabular-nums", m.delta > 0 ? "text-ok" : "text-bad")}>
                      {m.delta > 0 ? "+" : "−"}{formatQty(m.quantity)} <span className="text-xs text-muted">{m.unit}</span>
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <MovementTypeBadge type={m.type} />
                    <MethodBadge method={m.method} />
                    <span className="text-xs text-muted">{m.location_name} · bal {formatQty(m.balance_after)}</span>
                  </div>
                  {m.note && <p className="mt-2 text-xs text-ink/70">{m.note}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={page} hasMore={hasMore} params={sp} />
      </div>
    </div>
  );
}
