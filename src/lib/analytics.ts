import "server-only";
import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/env";
import { addDaysISO, manilaDayStart, todayISO } from "@/lib/utils";
import type { ProductRow } from "@/lib/types";

type Client = Awaited<ReturnType<typeof createClient>>;

/** Supabase caps a response at 1000 rows, so page through. */
async function fetchAll<T>(build: (c: Client) => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: { message: string } | null }> }, client: Client, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; from < max; from += size) {
    const { data, error } = await build(client).range(from, from + size - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE });
const manilaDay = (ts: string) => dayFmt.format(new Date(ts));

export type DayPoint = {
  date: string;
  revenue: number;
  orders: number;
  stockIn: number;
  stockOut: number;
  saleUse: number;
};

export interface Analytics {
  days: DayPoint[];
  from: string;
  to: string;
  totals: { revenue: number; orders: number; items: number; avgOrder: number; stockIn: number; stockOut: number };
  /** null when there is no full previous period of data to compare against */
  previous: { revenue: number; orders: number } | null;
  topItems: { name: string; quantity: number; revenue: number }[];
  byCategory: { name: string; revenue: number; quantity: number }[];
  status: { ok: number; low: number; out: number };
  valueByCategory: { name: string; value: number }[];
}

export async function getAnalytics(days: number): Promise<Analytics> {
  const supabase = await createClient();
  const to = todayISO();
  const from = addDaysISO(to, -(days - 1));
  const prevFrom = addDaysISO(from, -days);
  const start = manilaDayStart(from);
  const end = manilaDayStart(addDaysISO(to, 1));

  type SaleRow = { sold_at: string; total: number; sale_items: { quantity: number; line_total: number; menu_items: { name: string; categories: { name: string } | null } | null }[] };
  type MoveRow = { created_at: string; product_id: string; type: string; quantity: number; delta: number };

  const [sales, prevSales, moves, inventoryRes] = await Promise.all([
    fetchAll<SaleRow>((c) => c.from("sales").select("sold_at, total, sale_items(quantity, line_total, menu_items(name, categories(name)))").gte("sold_at", start).lt("sold_at", end).order("sold_at"), supabase),
    fetchAll<{ total: number }>((c) => c.from("sales").select("total").gte("sold_at", manilaDayStart(prevFrom)).lt("sold_at", start).order("sold_at"), supabase),
    fetchAll<MoveRow>((c) => c.from("stock_movements").select("created_at, product_id, type, quantity, delta").gte("created_at", start).lt("created_at", end).order("id"), supabase),
    supabase.from("product_inventory").select("id, quantity, price, stock_status, category_name"),
  ]);
  const { data: first } = await supabase.from("sales").select("sold_at").order("sold_at").limit(1).maybeSingle<{ sold_at: string }>();
  const hasFullPrevious = !!first && Date.parse(first.sold_at) <= Date.parse(manilaDayStart(addDaysISO(prevFrom, 1)));
  if (inventoryRes.error) throw new Error(inventoryRes.error.message);
  const inventory = (inventoryRes.data ?? []) as Pick<ProductRow, "id" | "quantity" | "price" | "stock_status" | "category_name">[];
  const price = new Map(inventory.map((p) => [p.id, Number(p.price)]));

  const map = new Map<string, DayPoint>();
  for (let d = from; d <= to; d = addDaysISO(d, 1)) map.set(d, { date: d, revenue: 0, orders: 0, stockIn: 0, stockOut: 0, saleUse: 0 });

  const items = new Map<string, { quantity: number; revenue: number }>();
  const cats = new Map<string, { quantity: number; revenue: number }>();
  let itemCount = 0;
  for (const s of sales) {
    const day = map.get(manilaDay(s.sold_at));
    if (day) {
      day.revenue += Number(s.total);
      day.orders += 1;
    }
    for (const i of s.sale_items) {
      const name = i.menu_items?.name ?? "Unknown";
      const cat = i.menu_items?.categories?.name ?? "Other";
      const it = items.get(name) ?? { quantity: 0, revenue: 0 };
      it.quantity += i.quantity;
      it.revenue += Number(i.line_total);
      items.set(name, it);
      const c = cats.get(cat) ?? { quantity: 0, revenue: 0 };
      c.quantity += i.quantity;
      c.revenue += Number(i.line_total);
      cats.set(cat, c);
      itemCount += i.quantity;
    }
  }

  // Stock movements valued in pesos (qty × unit cost) so kg, L and pcs can be added together.
  for (const m of moves) {
    if (m.type === "transfer_in" || m.type === "transfer_out") continue; // internal moves don't change total stock
    const day = map.get(manilaDay(m.created_at));
    if (!day) continue;
    const value = Number(m.quantity) * (price.get(m.product_id) ?? 0);
    if (m.type === "in") day.stockIn += value;
    else if (m.type === "sale") day.saleUse += value;
    else day.stockOut += value;
  }

  const dayList = [...map.values()].map((d) => ({ ...d, revenue: round(d.revenue), stockIn: round(d.stockIn), stockOut: round(d.stockOut), saleUse: round(d.saleUse) }));
  const revenue = dayList.reduce((s, d) => s + d.revenue, 0);
  const status = { ok: 0, low: 0, out: 0 };
  const value = new Map<string, number>();
  for (const p of inventory) {
    status[p.stock_status] += 1;
    const k = p.category_name ?? "Uncategorized";
    value.set(k, (value.get(k) ?? 0) + Number(p.quantity) * Number(p.price));
  }

  return {
    days: dayList,
    from,
    to,
    totals: {
      revenue: round(revenue),
      orders: sales.length,
      items: itemCount,
      avgOrder: sales.length ? round(revenue / sales.length) : 0,
      stockIn: round(dayList.reduce((s, d) => s + d.stockIn, 0)),
      stockOut: round(dayList.reduce((s, d) => s + d.stockOut + d.saleUse, 0)),
    },
    previous: hasFullPrevious ? { revenue: round(prevSales.reduce((s, x) => s + Number(x.total), 0)), orders: prevSales.length } : null,
    topItems: [...items.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.quantity - a.quantity).slice(0, 10),
    byCategory: [...cats.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue),
    status,
    valueByCategory: [...value.entries()].map(([name, v]) => ({ name, value: round(v) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Light query for the dashboard: revenue + orders per day. */
export async function getSalesDaily(days: number): Promise<{ date: string; revenue: number; orders: number }[]> {
  const supabase = await createClient();
  const to = todayISO();
  const from = addDaysISO(to, -(days - 1));
  const rows = await fetchAll<{ sold_at: string; total: number }>(
    (c) => c.from("sales").select("sold_at, total").gte("sold_at", manilaDayStart(from)).lt("sold_at", manilaDayStart(addDaysISO(to, 1))).order("sold_at"),
    supabase,
  );
  const map = new Map<string, { date: string; revenue: number; orders: number }>();
  for (let d = from; d <= to; d = addDaysISO(d, 1)) map.set(d, { date: d, revenue: 0, orders: 0 });
  for (const r of rows) {
    const p = map.get(manilaDay(r.sold_at));
    if (p) {
      p.revenue = round(p.revenue + Number(r.total));
      p.orders += 1;
    }
  }
  return [...map.values()];
}
