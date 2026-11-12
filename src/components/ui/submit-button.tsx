"use client";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SubmitButton({
  pending,
  children,
  className = "btn-primary",
  disabled,
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button type="submit" className={cn(className)} disabled={pending || disabled} aria-busy={pending}>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
