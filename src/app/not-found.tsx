import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-md rounded-[3.5rem] p-10 text-center">
        <p className="text-6xl font-black text-primary">404</p>
        <h1 className="mt-2 text-2xl font-black">Page not found</h1>
        <p className="mt-2 text-sm text-muted">This page doesn&apos;t exist or was moved.</p>
        <Link href="/" className="btn-primary mt-6">Back to dashboard</Link>
      </div>
    </main>
  );
}
