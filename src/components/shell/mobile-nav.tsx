"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ellipsis, LogOut, X } from "lucide-react";
import { can, ROLE_LABEL } from "@/lib/permissions";
import type { AppRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/actions/auth";
import { MOBILE_PRIMARY, NAV_ITEMS } from "./nav-items";
import { isActive } from "./sidebar";

export function MobileTopBar({ role, name }: { role: AppRole; name: string }) {
  return (
    <div className="no-print sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 bg-cream/85 px-4 py-3 backdrop-blur-md lg:hidden">
      <Link href="/" aria-label="Sizzling Aroma home" className="block">
        <Image src="/logo.png" alt="Sizzling Aroma" width={900} height={600} className="h-11 w-auto" priority />
      </Link>
      <div className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 shadow-soft">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-xs font-black text-white">
          {name.slice(0, 1).toUpperCase() || "?"}
        </span>
        <span className="text-xs font-bold">{ROLE_LABEL[role]}</span>
      </div>
    </div>
  );
}

export function BottomNav({ role, name }: { role: AppRole; name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const allowed = NAV_ITEMS.filter((i) => can(role, i.key));
  const primary = allowed.filter((i) => MOBILE_PRIMARY.includes(i.key)).slice(0, 4);
  const rest = allowed.filter((i) => !primary.includes(i));

  return (
    <>
      {open && (
        <div className="no-print fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}
      <div
        id="more-menu"
        className={cn(
          "no-print fixed inset-x-3 bottom-24 z-50 origin-bottom rounded-[2.25rem] bg-white p-4 shadow-soft transition duration-200 lg:hidden",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
        role="dialog"
        aria-label="More pages"
        aria-hidden={!open}
      >
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="text-sm font-black">{name}</p>
          <button type="button" className="btn-ghost size-9 !p-0" onClick={() => setOpen(false)} aria-label="Close menu" tabIndex={open ? 0 : -1}>
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {rest.map(({ href, short, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              tabIndex={open ? 0 : -1}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-3xl p-3 text-xs font-bold transition",
                isActive(pathname, href) ? "bg-primary text-white" : "bg-sand/60 text-ink hover:bg-sand",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {short}
            </Link>
          ))}
          <form action={signOut} className="contents">
            <button type="submit" tabIndex={open ? 0 : -1} className="flex flex-col items-center gap-1.5 rounded-3xl bg-bad-soft p-3 text-xs font-bold text-bad">
              <LogOut className="size-5" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </div>

      <nav
        aria-label="Main"
        className="no-print fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-[2rem] bg-ink px-2 py-2 shadow-soft lg:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {primary.map(({ href, short, icon: Icon, key }) => {
          const active = isActive(pathname, href);
          const isScan = key === "scan";
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-bold transition",
                isScan
                  ? "-mt-7 bg-primary px-4 py-3 text-white shadow-lift ring-4 ring-cream"
                  : active
                    ? "text-primary"
                    : "text-white/60",
              )}
            >
              <Icon className={isScan ? "size-6" : "size-5"} aria-hidden />
              {short}
            </Link>
          );
        })}
        {rest.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="more-menu"
            className={cn("flex min-w-14 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-bold", open ? "text-primary" : "text-white/60")}
          >
            <Ellipsis className="size-5" aria-hidden />
            More
          </button>
        )}
      </nav>
    </>
  );
}
