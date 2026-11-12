import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileChartColumn } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { buildReport, REPORT_TYPES, type ReportType } from "@/lib/reports";
import { addDaysISO, cn, isISODate, todayISO } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButtons } from "./export-buttons";

export const metadata: Metadata = { title: "Report preview" };

export default async function ReportPreviewPage({ searchParams }: { searchParams: Promise<{ type?: string; from?: string; to?: string }> }) {
  await requireAccess("reports");
  const sp = await searchParams;
  const type: ReportType = sp.type && sp.type in REPORT_TYPES ? (sp.type as ReportType) : "sales";
  const today = todayISO();
  let from = isISODate(sp.from) ? sp.from : sp.type === "sales" && !sp.from ? today : addDaysISO(today, -29);
  let to = isISODate(sp.to) ? sp.to : type === "expiry" ? addDaysISO(today, 14) : today;
  if (from > to) [from, to] = [to, from];
  const report = await buildReport(type, from, to);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/reports" className="btn-ghost w-fit"><ArrowLeft className="size-4" /> All reports</Link>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <input type="hidden" name="type" value={type} />
          <div>
            <label htmlFor="pv-from" className="sr-only">From</label>
            <input id="pv-from" name="from" type="date" defaultValue={from} className="input !py-2" />
          </div>
          <div>
            <label htmlFor="pv-to" className="sr-only">To</label>
            <input id="pv-to" name="to" type="date" defaultValue={to} className="input !py-2" />
          </div>
          <button type="submit" className="btn-dark">Apply</button>
        </form>
      </div>

      <article className="card print-area rounded-[3.5rem] p-6 sm:p-10">
        <header className="flex flex-col gap-4 border-b-2 border-sand pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Sizzling Aroma" width={900} height={600} className="h-14 w-auto" />
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">{report.title}</h1>
              <p className="text-sm text-muted">{report.period} · generated {report.generatedAt}</p>
            </div>
          </div>
          <div className="no-print"><ExportButtons report={report} /></div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Summary">
          {report.summary.map((s) => (
            <div key={s.label} className="rounded-3xl bg-cream p-4">
              <p className="text-xs font-bold uppercase text-muted">{s.label}</p>
              <p className="text-xl font-black sm:text-2xl">{s.value}</p>
            </div>
          ))}
        </section>

        {report.truncated && <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">Showing the first 5,000 rows. Narrow the date range for the full detail.</p>}

        {report.secondary && report.secondary.rows.length > 0 && <ReportTable title={report.secondary.title} columns={report.secondary.columns} rows={report.secondary.rows} />}

        {report.rows.length === 0 ? (
          <EmptyState icon={<FileChartColumn className="size-7" />} title="No data in this range" description="Try a wider date range." />
        ) : (
          <ReportTable title="Details" columns={report.columns} rows={report.rows} />
        )}
      </article>
    </div>
  );
}

function ReportTable({ title, columns, rows }: { title: string; columns: { label: string; align?: "right" }[]; rows: string[][] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-black">{title} <span className="text-sm font-semibold text-muted">({rows.length})</span></h2>
      <div className="overflow-x-auto rounded-3xl border-2 border-sand">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-cream">
            <tr>{columns.map((c) => <th key={c.label} scope="col" className={cn("table-head", c.align === "right" && "text-right")}>{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {rows.map((r, i) => (
              <tr key={i} className="break-inside-avoid">
                {r.map((cell, j) => <td key={j} className={cn("px-4 py-2.5", columns[j]?.align === "right" && "text-right tabular-nums")}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
