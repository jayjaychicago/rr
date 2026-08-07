"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Anything that throws while rendering lands here instead of on Next's error
 * overlay — a red stack trace is the last thing a demo should show. This app
 * talks straight to the reservation backend, so the usual cause is simply that
 * the backend is not up yet (or was restarted), not an authorization refusal.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[resiresi] render failed:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="mb-3 text-4xl">🍽️</p>
      <h1 className="text-2xl font-semibold tracking-tight">This page didn’t load</h1>
      <p className="mt-2 text-sm text-slate-600">
        ResiResi couldn’t reach its reservation backend. If you are running the
        guided lab, check that the backend step is still running — everything
        here reads from it.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn-outline">Try again</button>
        <Link href="/developers" className="btn-primary">Back to Developers</Link>
      </div>
      <p className="mt-6 break-words text-xs text-slate-400">{error.message}</p>
    </div>
  );
}
