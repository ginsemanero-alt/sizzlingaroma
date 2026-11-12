"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, LoaderCircle, Printer } from "lucide-react";
import type { ReportData } from "@/lib/reports";

const fileBase = (r: ReportData) => `sizzling-aroma-${r.type}-${new Date().toISOString().slice(0, 10)}`;

function csvEscape(v: string) {
  // guard against spreadsheet formula injection
  const safe = /^[=+\-@\t\r]/.test(v) && !/^-?\d/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButtons({ report }: { report: ReportData }) {
  const [busy, setBusy] = useState(false);

  const exportCsv = () => {
    const lines = [
      [report.title], [report.period], [],
      ...report.summary.map((s) => [s.label, s.value]), [],
      report.columns.map((c) => c.label),
      ...report.rows,
    ];
    if (report.secondary) lines.push([], [report.secondary.title], report.secondary.columns.map((c) => c.label), ...report.secondary.rows);
    const csv = "﻿" + lines.map((l) => l.map((c) => csvEscape(String(c))).join(",")).join("\r\n");
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${fileBase(report)}.csv`);
    toast.success("CSV downloaded");
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const wide = report.columns.length > 6;
      const doc = new jsPDF({ orientation: wide ? "landscape" : "portrait", unit: "pt", format: "a4" });
      const pdfText = (s: string) => s.replace(/₱/g, "PHP ").replace(/[–—]/g, "-").replace(/≤/g, "<=").replace(/×/g, "x");
      const W = doc.internal.pageSize.getWidth();

      try {
        const img = await fetch("/logo.png").then((r) => r.blob()).then((b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); }));
        doc.addImage(img, "PNG", 40, 28, 72, 48);
      } catch { /* logo optional */ }
      doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(27, 20, 17).text(pdfText(report.title), 124, 50);
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(138, 123, 114).text(pdfText(`${report.period} · generated ${report.generatedAt}`), 124, 66);

      const summary = report.summary.map((s) => `${pdfText(s.label)}: ${pdfText(s.value)}`).join("    ");
      doc.setFontSize(10).setTextColor(27, 20, 17).text(summary, 40, 98, { maxWidth: W - 80 });

      const styles = { font: "helvetica", fontSize: 8, cellPadding: 4 };
      const headStyles = { fillColor: [255, 90, 31] as [number, number, number], textColor: 255, fontStyle: "bold" as const };
      const align = (cols: ReportData["columns"]) => Object.fromEntries(cols.map((c, i) => [i, { halign: c.align === "right" ? ("right" as const) : ("left" as const) }]));
      let y = 114;
      if (report.secondary && report.secondary.rows.length) {
        doc.setFont("helvetica", "bold").setFontSize(11).text(pdfText(report.secondary.title), 40, y);
        autoTable(doc, { startY: y + 6, head: [report.secondary.columns.map((c) => pdfText(c.label))], body: report.secondary.rows.map((r) => r.map(pdfText)), styles, headStyles, columnStyles: align(report.secondary.columns), margin: { left: 40, right: 40 } });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
      }
      doc.setFont("helvetica", "bold").setFontSize(11).text("Details", 40, y);
      autoTable(doc, {
        startY: y + 6,
        head: [report.columns.map((c) => pdfText(c.label))],
        body: report.rows.map((r) => r.map(pdfText)),
        styles,
        headStyles,
        alternateRowStyles: { fillColor: [255, 246, 238] },
        columnStyles: align(report.columns),
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          const h = doc.internal.pageSize.getHeight();
          doc.setFontSize(8).setTextColor(138, 123, 114).text(`Sizzling Aroma · page ${doc.getNumberOfPages()}`, 40, h - 20);
        },
      });
      doc.save(`${fileBase(report)}.pdf`);
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not create the PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={exportPdf} disabled={busy} className="btn-primary">
        {busy ? <LoaderCircle className="size-4 animate-spin" /> : <FileText className="size-4" />} PDF
      </button>
      <button type="button" onClick={exportCsv} className="btn-dark"><Download className="size-4" /> CSV</button>
      <button type="button" onClick={() => window.print()} className="btn-ghost"><Printer className="size-4" /> Print</button>
    </div>
  );
}
