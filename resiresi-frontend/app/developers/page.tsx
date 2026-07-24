import { requireTenant } from "@/lib/tenant";
import { requireUser } from "@/lib/user";
import { ImplementationGuide } from "./guide";

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
          reservations, and manage who can do what. You&apos;ll build both by following
          the steps below.
        </p>
      </div>

      {/* --- API access (placeholder until the widget is added) --- */}
      <section className="card p-6">
        <h2 className="text-base font-semibold">API access</h2>
        <Placeholder>
          The API-key widget goes here. Follow Technical implementation details to add it.
        </Placeholder>
      </section>

      {/* --- Users & Groups (placeholder until the widget is added) --- */}
      <section className="card p-6">
        <h2 className="text-base font-semibold">Users &amp; Groups</h2>
        <Placeholder>
          The users &amp; groups widget goes here. Follow Technical implementation details to add it.
        </Placeholder>
      </section>

      {/* --- Technical implementation details --- */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Technical implementation details
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Everything to wire up the two widgets above, start to finish.
        </p>
      </div>

      <ImplementationGuide />
    </div>
  );
}
