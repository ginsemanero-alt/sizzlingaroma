import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, hasMore, params }: { page: number; hasMore: boolean; params: Record<string, string | undefined> }) {
  if (page <= 1 && !hasMore) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  return (
    <nav className="no-print mt-4 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className="btn-ghost"><ChevronLeft className="size-4" /> Newer</Link> : <span />}
      <span className="text-sm font-bold text-muted">Page {page}</span>
      {hasMore ? <Link href={href(page + 1)} className="btn-ghost">Older <ChevronRight className="size-4" /></Link> : <span />}
    </nav>
  );
}
