import type { Metadata } from "next";
import { CalendarClock, FileChartColumn, History, Package, Receipt } from "lucide-react";
import { requireAccess } from "@/lib/auth";
import { REPORT_TYPES, type ReportType } from "@/lib/reports";
import { addDaysISO, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Reports" };

const ICONS: Record<ReportType, React.ReactNode> = {
  sales: <Receipt className="size-6" />,
  inventory: <Package className="size-6" />,
  expiry: <CalendarClock className="size-6" />,
  movements: <History className="size-6" />,
};

export default async function ReportsPage() {
  await requireAccess("reports");
  const today = todayISO();
  return (
    <div>
      <PageHeader title="Reports" subtitle="Choose a report and date range, preview it, then export to PDF or CSV." />
      <form action="/reports/preview" method="get" className="card space-y-6 rounded-[3.5rem] p-6 sm:p-10">
        <fieldset>
          <legend className="field-label">Report</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(REPORT_TYPES) as ReportType[]).map((t, i) => (
              <label key={t} className="group relative flex cursor-pointer items-start gap-4 rounded-3xl border-2 border-sand p-5 transition hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
                <input type="radio" name="type" value={t} defaultChecked={i === 0} className="peer sr-only" />
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary group-has-[:checked]:bg-primary group-has-[:checked]:text-white">{ICONS[t]}</span>
                <span>
                  <span className="block font-black">{REPORT_TYPES[t].title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{REPORT_TYPES[t].description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="from" className="field-label">From</label>
            <input id="from" name="from" type="date" className="input" defaultValue={addDaysISO(today, -29)} required />
          </div>
          <div>
            <label htmlFor="to" className="field-label">To</label>
            <input id="to" name="to" type="date" className="input" defaultValue={today} required />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full py-3.5"><FileChartColumn className="size-5" /> Preview report</button>
          </div>
        </div>
      </form>
    </div>
  );
}
