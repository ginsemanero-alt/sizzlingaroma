"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectFilter {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}

/** URL-driven filters: search box (debounced) + selects + optional date range. */
export function FilterBar({
  searchPlaceholder = "Search…",
  selects = [],
  dateRange = false,
  showSearch = true,
  className,
}: {
  searchPlaceholder?: string;
  selects?: SelectFilter[];
  dateRange?: boolean;
  showSearch?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={cn("card no-print flex flex-col gap-3 p-3 md:flex-row md:flex-wrap md:items-end", className)}>
      {showSearch && (
        <div className="relative min-w-0 flex-1 md:min-w-64">
          <label htmlFor="filter-q" className="sr-only">Search</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="filter-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="input pl-11 pr-10" autoComplete="off" />
          {pending ? (
            <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-label="Loading" />
          ) : q ? (
            <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-sand" aria-label="Clear search">
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      )}
      {selects.map((s) => (
        <div key={s.name} className="md:w-52">
          <label htmlFor={`filter-${s.name}`} className="field-label">{s.label}</label>
          <select id={`filter-${s.name}`} className="input" value={params.get(s.name) ?? ""} onChange={(e) => update({ [s.name]: e.target.value })}>
            <option value="">{s.allLabel ?? "All"}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
      {dateRange && (
        <div className="grid grid-cols-2 gap-3 md:flex">
          <div>
            <label htmlFor="filter-from" className="field-label">From</label>
            <input id="filter-from" type="date" className="input" value={params.get("from") ?? ""} onChange={(e) => update({ from: e.target.value })} />
          </div>
          <div>
            <label htmlFor="filter-to" className="field-label">To</label>
            <input id="filter-to" type="date" className="input" value={params.get("to") ?? ""} onChange={(e) => update({ to: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Pill links to switch a single URL param (e.g. status / period). */
export function PillFilter({ name, options, value }: { name: string; options: { value: string; label: string; count?: number }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  return (
    <div className="no-print -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              if (o.value) next.set(name, o.value);
              else next.delete(name);
              startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
            }}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
              active ? "bg-ink text-white shadow-soft" : "bg-white text-ink/70 shadow-soft hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px]", active ? "bg-primary text-white" : "bg-sand")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
