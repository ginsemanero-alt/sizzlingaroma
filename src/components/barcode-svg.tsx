"use client";
import { useEffect, useRef } from "react";

export function BarcodeSvg({ value, height = 44, className }: { value: string; height?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let cancelled = false;
    import("jsbarcode").then(({ default: JsBarcode }) => {
      if (cancelled || !ref.current) return;
      try {
        JsBarcode(ref.current, value, { format: "CODE128", height, margin: 0, fontSize: 12, width: 1.6, displayValue: true, font: "monospace" });
      } catch {
        /* invalid characters for CODE128 are impossible with our validation */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [value, height]);
  return <svg ref={ref} className={className} role="img" aria-label={`Barcode ${value}`} />;
}
