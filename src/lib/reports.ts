import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MovementRow, ProductRow } from "@/lib/types";
import { addDaysISO, formatDate, formatDateTime, manilaDayStart, todayISO } from "@/lib/utils";

export const REPORT_TYPES = {
  sales: { title: "Sales Report", description: "Every sale with items and totals, plus a per-item summary." },
  inventory: { title: "Inventory Report", description: "Current stock per location, status and stock value (snapshot as of now)." },
  expiry: { title: "Expiry Report", description: "In-stock items expiring within the range, including already expired." },
  movements: { title: "Stock Movement Report", description: "All stock in, out, sale deductions and transfers in the range." },
} as const;
export type ReportType = keyof typeof REPORT_TYPES;

export interface ReportData {
  type: ReportType;
  title: string;
  period: string;
  generatedAt: string;
  summary: { label: string; value: string }[];
  columns: { label: string; align?: "right" }[];
  rows: string[][];
  secondary?: { title: string; columns: { label: string; align?: "right" }[]; rows: string[][] };
  truncated: boolean;
}

const LIMIT = 5000;
const money = (n: number | string) => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n: number | string) => Number(n).toLocaleString("en-PH", { maximumFractionDigits: 3 });

export async function buildReport(type: ReportType, from: string, to: string): Promise<ReportData> {
  const supabase = await createClient();
  const start = manilaDayStart(from);
  const end = manilaDayStart(addDaysISO(to, 1));
  const period = `${formatDate(from)} – ${formatDate(to)}`;
  const base = { type, title: REPORT_TYPES[type].title, period, generatedAt: formatDateTime(new Date()) };

  if (type === "sales") {
    const [salesRes, usersRes] = await Promise.all([
      supabase
        .from("sales")
        .select("id, sale_no, sold_at, total, note, user_id, sale_items(quantity, unit_price, line_total, menu_items(name))")
        .gte("sold_at", start).lt("sold_at", end)
        .order("sold_at", { ascending: true })
        .limit(LIMIT + 1),
      supabase.from("profiles").select("id, name"),
    ]);
    if (salesRes.error) throw new Error(salesRes.error.message);
    const names = new Map((usersRes.data ?? []).map((u) => [u.id as string, u.name as string]));
    type S = { id: string; sale_no: number; sold_at: string; total: number; note: string | null; user_id: string | null; sale_items: { quantity: number; unit_price: number; line_total: number; menu_items: { name: string } | null }[] };
    const all = (salesRes.data ?? []) as unknown as S[];
    const sales = all.slice(0, LIMIT);
    const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
    const perItem = new Map<string, { qty: number; revenue: number }>();
    for (const s of sales) for (const i of s.sale_items) {
      const k = i.menu_items?.name ?? "Unknown";
      const cur = perItem.get(k) ?? { qty: 0, revenue: 0 };
      cur.qty += i.quantity;
      cur.revenue += Number(i.line_total);
      perItem.set(k, cur);
    }
    const itemsSold = [...perItem.values()].reduce((s, v) => s + v.qty, 0);
    return {
      ...base,
      summary: [
        { label: "Revenue", value: `₱${money(revenue)}` },
        { label: "Orders", value: qty(sales.length) },
        { label: "Items sold", value: qty(itemsSold) },
        { label: "Avg. order", value: `₱${money(sales.length ? revenue / sales.length : 0)}` },
      ],
      columns: [{ label: "Sale #" }, { label: "Date" }, { label: "Items" }, { label: "Recorded by" }, { label: "Total (₱)", align: "right" }],
      rows: sales.map((s) => [
        String(s.sale_no),
        formatDateTime(s.sold_at),
        s.sale_items.map((i) => `${i.quantity}× ${i.menu_items?.name ?? "Item"}`).join(", "),
        (s.user_id && names.get(s.user_id)) || "—",
        money(s.total),
      ]),
      secondary: {
        title: "Sales by menu item",
        columns: [{ label: "Menu item" }, { label: "Qty sold", align: "right" }, { label: "Revenue (₱)", align: "right" }],
        rows: [...perItem.entries()].sort((a, b) => b[1].qty - a[1].qty).map(([k, v]) => [k, qty(v.qty), money(v.revenue)]),
      },
      truncated: all.length > LIMIT,
    };
  }

  if (type === "inventory") {
    const { data, error } = await supabase.from("product_inventory").select("*").order("category_name").order("name");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ProductRow[];
    const value = rows.reduce((s, p) => s + Number(p.quantity) * Number(p.price), 0);
    return {
      ...base,
      period: `Snapshot as of ${formatDate(todayISO())}`,
      summary: [
        { label: "Products", value: qty(rows.length) },
        { label: "Low stock", value: qty(rows.filter((p) => p.stock_status === "low").length) },
        { label: "Out of stock", value: qty(rows.filter((p) => p.stock_status === "out").length) },
        { label: "Stock value", value: `₱${money(value)}` },
      ],
      columns: [
        { label: "Product" }, { label: "Category" }, { label: "Kitchen", align: "right" }, { label: "Dine-in", align: "right" },
        { label: "Total", align: "right" }, { label: "Unit" }, { label: "Min", align: "right" }, { label: "Status" }, { label: "Value (₱)", align: "right" },
      ],
      rows: rows.map((p) => [
        p.name, p.category_name ?? "—", qty(p.kitchen_qty), qty(p.dine_in_qty), qty(p.quantity), p.unit, qty(p.min_stock),
        p.stock_status.toUpperCase(), money(Number(p.quantity) * Number(p.price)),
      ]),
      truncated: false,
    };
  }

  if (type === "expiry") {
    const { data, error } = await supabase
      .from("product_inventory").select("*")
      .not("expiry_date", "is", null).gt("quantity", 0)
      .lte("expiry_date", to)
      .order("expiry_date");
    if (error) throw new Error(error.message);
    const today = todayISO();
    const rows = ((data ?? []) as ProductRow[]).filter((p) => p.expiry_date! >= from || p.expiry_date! < today);
    const days = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
    return {
      ...base,
      summary: [
        { label: "Items", value: qty(rows.length) },
        { label: "Expired", value: qty(rows.filter((p) => days(p.expiry_date!) < 0).length) },
        { label: "≤ 3 days", value: qty(rows.filter((p) => days(p.expiry_date!) >= 0 && days(p.expiry_date!) <= 3).length) },
        { label: "≤ 7 days", value: qty(rows.filter((p) => days(p.expiry_date!) >= 0 && days(p.expiry_date!) <= 7).length) },
      ],
      columns: [{ label: "Product" }, { label: "Category" }, { label: "Qty", align: "right" }, { label: "Unit" }, { label: "Expiry date" }, { label: "Days left", align: "right" }, { label: "Supplier" }],
      rows: rows.map((p) => {
        const d = days(p.expiry_date!);
        return [p.name, p.category_name ?? "—", qty(p.quantity), p.unit, formatDate(p.expiry_date), d < 0 ? `Expired (${-d}d)` : String(d), p.supplier ?? "—"];
      }),
      truncated: false,
    };
  }

  // movements
  const { data, error } = await supabase
    .from("stock_movement_log").select("*")
    .gte("created_at", start).lt("created_at", end)
    .order("created_at", { ascending: true })
    .limit(LIMIT + 1);
  if (error) throw new Error(error.message);
  const all = (data ?? []) as MovementRow[];
  const rows = all.slice(0, LIMIT);
  const count = (t: string) => rows.filter((r) => r.type === t).length;
  const perProduct = new Map<string, { unit: string; added: number; deducted: number }>();
  for (const r of rows) {
    const cur = perProduct.get(r.product_name) ?? { unit: r.unit, added: 0, deducted: 0 };
    if (r.delta > 0) cur.added += Number(r.quantity);
    else cur.deducted += Number(r.quantity);
    perProduct.set(r.product_name, cur);
  }
  return {
    ...base,
    summary: [
      { label: "Movements", value: qty(rows.length) },
      { label: "Stock in", value: qty(count("in")) },
      { label: "Stock out", value: qty(count("out")) },
      { label: "Sale deductions", value: qty(count("sale")) },
    ],
    columns: [
      { label: "Date" }, { label: "Product" }, { label: "Type" }, { label: "Qty", align: "right" }, { label: "Balance", align: "right" },
      { label: "Location" }, { label: "User" }, { label: "Method" }, { label: "Note" },
    ],
    rows: rows.map((m) => [
      formatDateTime(m.created_at), m.product_name, m.type.replace("_", " "),
      `${m.delta > 0 ? "+" : "-"}${qty(m.quantity)} ${m.unit}`, qty(m.balance_after), m.location_name, m.user_name ?? "System", m.method, m.note ?? "",
    ]),
    secondary: {
      title: "Totals per product",
      columns: [{ label: "Product" }, { label: "Added", align: "right" }, { label: "Deducted", align: "right" }, { label: "Net", align: "right" }],
      rows: [...perProduct.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [k, `${qty(v.added)} ${v.unit}`, `${qty(v.deducted)} ${v.unit}`, `${qty(v.added - v.deducted)} ${v.unit}`]),
    },
    truncated: all.length > LIMIT,
  };
}
