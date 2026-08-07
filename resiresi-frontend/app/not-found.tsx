import Link from "next/link";

/** A missing page is a dead end, not a crash — say so and offer the way back. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="mb-3 text-4xl">🍽️</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        That link may be stale, or the reservation it pointed at may be gone.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/reservations" className="btn-outline">Reservations</Link>
        <Link href="/developers" className="btn-primary">Developers</Link>
      </div>
    </div>
  );
}
