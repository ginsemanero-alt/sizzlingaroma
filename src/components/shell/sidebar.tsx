"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { can, ROLE_LABEL } from "@/lib/permissions";
import type { AppRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { NAV_ITEMS } from "./nav-items";

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ role, name }: { role: AppRole; name: string }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => can(role, i.key));
  return (
    <aside className="no-print sticky top-4 hidden h-[calc(100dvh-2rem)] w-72 shrink-0 flex-col rounded-[2.5rem] bg-ink p-5 text-white shadow-soft lg:flex">
      <Link href="/" className="mb-6 block rounded-[1.75rem] bg-white p-3 transition hover:scale-[1.02]" aria-label="Sizzling Aroma home">
        <Image src="/logo.png" alt="Sizzling Aroma — Fried Chicken & Crispy Pata Restaurant" width={900} height={600} className="h-auto w-full" priority />
      </Link>
      <nav aria-label="Main" className="-mx-1 flex-1 space-y-1 overflow-y-auto px-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200",
                active ? "bg-primary text-white shadow-lift" : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 rounded-3xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-primary text-sm font-black">
            {name.slice(0, 1).toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="text-xs text-white/50">{ROLE_LABEL[role]}</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="grid size-10 place-items-center rounded-2xl text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
