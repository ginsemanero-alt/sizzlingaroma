"use client";
import { TimeBarChart, type TimePoint } from "@/components/charts/time-bar-chart";
import { formatPeso, pesoCompact } from "@/lib/utils";

export const SALES_COLOR = "#FF5A1F";
export const IN_COLOR = "#2A78D6";
export const OUT_COLOR = "#EB6834";

export function SalesChart({ data, height }: { data: TimePoint[]; height?: number }) {
  return (
    <TimeBarChart
      title="Sales revenue per day"
      data={data}
      series={[{ key: "revenue", label: "Sales", color: SALES_COLOR }]}
      format={formatPeso}
      axisFormat={pesoCompact}
      height={height}
      extraTooltip={(p) => `${p.orders} order${p.orders === 1 ? "" : "s"}`}
    />
  );
}

export function StockFlowChart({ data }: { data: TimePoint[] }) {
  return (
    <TimeBarChart
      title="Stock in versus stock out per day, in pesos"
      data={data}
      series={[
        { key: "stockIn", label: "Stock In", color: IN_COLOR },
        { key: "out", label: "Stock Out (incl. sales)", color: OUT_COLOR },
      ]}
      format={formatPeso}
      axisFormat={pesoCompact}
      extraTooltip={(p) => (Number(p.saleUse) > 0 ? `Used by sales: ${formatPeso(Number(p.saleUse))}` : null)}
    />
  );
}
