import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homePathFor } from "@/lib/permissions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  if (session?.profile.active) redirect(homePathFor(session.profile.role));

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-[#ffb35c]/25 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="card rounded-[3.5rem] p-6 sm:p-10">
          <Image
            src="/logo.png"
            alt="Sizzling Aroma — Fried Chicken & Crispy Pata Restaurant"
            width={900}
            height={600}
            priority
            className="mx-auto h-auto w-64"
          />
          <h1 className="mt-6 text-center text-3xl font-black tracking-tight">Welcome back</h1>
          <p className="mt-1 text-center text-sm text-muted">Sign in to the Products Monitoring System</p>
          {sp.error === "inactive" && (
            <p className="mt-5 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn" role="alert">
              Your account is not active. Ask the Owner to enable it.
            </p>
          )}
          <LoginForm next={sp.next ?? ""} />
        </div>
        <p className="mt-6 text-center text-xs text-muted">© {new Date().getFullYear()} Sizzling Aroma Restaurant</p>
      </div>
    </main>
  );
}
