import { requireTenant } from "@/lib/tenant";
import { requireUser } from "@/lib/user";

export const metadata = { title: "Developers" };
export const dynamic = "force-dynamic";

function Placeholder({ children }: { children: string }) {
  return (
    <div className="mt-4 flex min-h-[9rem] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

export default async function DevelopersPage() {
  const restaurant = await requireTenant();
  requireUser();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Developers</h1>
        <p className="mt-2 text-sm text-slate-600">
          Give apps and partners programmatic access to {restaurant.name}&apos;s
          reservations, and manage who can do what.
        </p>
      </div>

      {/* --- API access (placeholder until the widget is added) --- */}
      <section className="card p-6">
        <h2 className="text-base font-semibold">API access</h2>
        <Placeholder>
          The API-key widget goes here — the guided lab (or the docs) adds it.
        </Placeholder>
      </section>

      {/* --- Users & Groups (placeholder until the widget is added) --- */}
      <section className="card p-6">
        <h2 className="text-base font-semibold">Users &amp; Groups</h2>
        <Placeholder>
          The users &amp; groups widget goes here — the guided lab (or the docs) adds it.
        </Placeholder>
      </section>

    </div>
  );
}
