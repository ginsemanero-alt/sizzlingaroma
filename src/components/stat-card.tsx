import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-primary-dark",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  ink: "bg-sand text-ink",
} as const;

export function StatCard({
  href, label, value, hint, icon, tone = "primary",
}: {
  href: string; label: string; value: ReactNode; hint?: string; icon: ReactNode; tone?: keyof typeof TONES;
}) {
  return (
    <Link href={href} className="card group relative flex flex-col gap-3 p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className="flex items-start justify-between">
        <span className={cn("grid size-12 place-items-center rounded-2xl", TONES[tone])}>{icon}</span>
        <ArrowUpRight className="size-5 text-muted transition group-hover:text-primary" aria-hidden />
      </div>
      <div>
        <p className="text-3xl font-black tracking-tight sm:text-4xl">{value}</p>
        <p className="text-sm font-bold text-muted">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted/80">{hint}</p>}
      </div>
    </Link>
  );
}
