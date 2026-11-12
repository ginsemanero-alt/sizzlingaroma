import { cn, daysUntil, expiryBucket, STOCK_LABEL } from "@/lib/utils";
import type { MovementMethod, MovementType, StockStatus } from "@/lib/types";

const STOCK_STYLE: Record<StockStatus, string> = {
  ok: "bg-ok-soft text-ok",
  low: "bg-warn-soft text-warn",
  out: "bg-bad-soft text-bad",
};

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <span className={cn("badge", STOCK_STYLE[status], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STOCK_LABEL[status]}
    </span>
  );
}

export function ExpiryBadge({ date, className }: { date: string | null; className?: string }) {
  const bucket = expiryBucket(date);
  const days = daysUntil(date);
  if (bucket === "none" || days === null) return <span className={cn("badge bg-sand text-muted", className)}>No expiry</span>;
  const style =
    bucket === "expired" || bucket === "3"
      ? "bg-bad-soft text-bad"
      : bucket === "7"
        ? "bg-warn-soft text-warn"
        : bucket === "14"
          ? "bg-primary-soft text-primary-dark"
          : "bg-ok-soft text-ok";
  const label =
    days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? "Expires today" : days === 1 ? "1 day left" : `${days} days left`;
  return <span className={cn("badge", style, className)}>{label}</span>;
}

const TYPE: Record<MovementType, { label: string; style: string }> = {
  in: { label: "Stock in", style: "bg-ok-soft text-ok" },
  out: { label: "Stock out", style: "bg-bad-soft text-bad" },
  sale: { label: "Sale", style: "bg-primary-soft text-primary-dark" },
  transfer_in: { label: "Transfer in", style: "bg-sky-100 text-sky-700" },
  transfer_out: { label: "Transfer out", style: "bg-violet-100 text-violet-700" },
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  return <span className={cn("badge", TYPE[type].style)}>{TYPE[type].label}</span>;
}

export function MethodBadge({ method }: { method: MovementMethod }) {
  return <span className="badge bg-sand text-ink/70">{method}</span>;
}
