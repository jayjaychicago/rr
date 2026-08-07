"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Anything that throws while rendering lands here instead of on Next's error
 * overlay. That overlay (a red stack trace) is the single ugliest thing a
 * demo can show, and this storefront is deliberately pointed at a gateway that
 * WILL start refusing requests part-way through the guided lab — so hitting one
 * is normal, not exceptional.
 *
 * "Start over" resets to the home page: whatever state confused the app, the
 * front door always works.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[storefront] render failed:", error);
  }, [error]);

  const denied = /403|401|forbidden|not allowed/i.test(error.message);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="mb-4 text-5xl">{denied ? "🔒" : "🍕"}</p>
      <h1 className="font-serif text-3xl font-bold">
        {denied ? "That one isn’t yours to see" : "Something went wrong here"}
      </h1>
      <p className="mt-3 text-stone-500">
        {denied
          ? "The gateway in front of this API turned the request down. If you have been through the lab’s rule step, that is the rule doing its job."
          : "The page could not load. The reservation API may be restarting, or the tunnel to it may have dropped."}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn-outline">Try again</button>
        <Link href="/" className="btn-primary">Start over</Link>
      </div>
      <p className="mt-6 text-xs text-stone-400 break-words">{error.message}</p>
    </div>
  );
}
