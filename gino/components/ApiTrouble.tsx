import Link from "next/link";

/**
 * What went wrong talking to the reservation API, in the three shapes a visitor
 * can actually act on.
 *
 * This exists as a COMPONENT rather than an error boundary because the lab runs
 * these apps with `npm run dev` (the guided step that injects the widgets relies
 * on hot reload). In dev, Next shows its own red error overlay for a server
 * error INSTEAD of app/error.tsx — so the only way to keep a stack trace off the
 * screen is for the page never to throw. error.tsx stays as the net for
 * production builds and unexpected client-side faults.
 */
export type ApiTroubleKind = "denied" | "missing" | "unavailable";

/** Map a thrown API error onto one of the three states. */
export function classifyApiError(e: unknown): ApiTroubleKind {
  const status = (e as { status?: number })?.status;
  if (status === 401 || status === 403) return "denied";
  if (status === 404) return "missing";
  return "unavailable";
}

const COPY: Record<ApiTroubleKind, { icon: string; title: string; body: string }> = {
  denied: {
    icon: "🔒",
    title: "Not yours to see",
    body:
      "The gateway in front of this API turned the request down. If you have been " +
      "through the guided lab's rule step, that is the rule doing its job.",
  },
  missing: {
    icon: "🤷",
    title: "We couldn’t find that",
    body: "It may have been cancelled, or the link may be stale.",
  },
  unavailable: {
    icon: "🔌",
    title: "The reservation service isn’t answering",
    body:
      "Nothing is broken on this page — the API behind it did not respond. In the " +
      "guided lab this usually means the local backend or the tunnel stopped; " +
      "restart that step and try again.",
  },
};

export function ApiTrouble({ kind }: { kind: ApiTroubleKind }) {
  const c = COPY[kind];
  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-100">
      <p className="mb-3 text-4xl">{c.icon}</p>
      <h2 className="font-serif text-2xl font-bold">{c.title}</h2>
      <p className="mt-3 text-sm text-stone-500">{c.body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/reservations" className="btn-primary">Book a table</Link>
        <Link href="/" className="btn-outline">Back to the restaurant</Link>
      </div>
    </div>
  );
}
