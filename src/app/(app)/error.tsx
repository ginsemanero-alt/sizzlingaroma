"use client";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="card mx-auto mt-10 max-w-lg rounded-[3.5rem] p-10 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-[1.6rem] bg-bad-soft text-bad">
        <TriangleAlert className="size-7" />
      </div>
      <h1 className="mt-4 text-2xl font-black">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">We couldn&apos;t load this page. Check your connection and try again.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
