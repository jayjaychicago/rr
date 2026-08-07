import Link from "next/link";

/** A missing page is a dead end, not a crash — say so and offer the way back. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="mb-4 text-5xl">🍕</p>
      <h1 className="font-serif text-3xl font-bold">We couldn’t find that page</h1>
      <p className="mt-3 text-stone-500">
        The link may be stale, or the booking it pointed at may have been removed.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/reservations/my" className="btn-outline">Your reservations</Link>
        <Link href="/" className="btn-primary">Start over</Link>
      </div>
    </div>
  );
}
