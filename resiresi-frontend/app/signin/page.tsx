import { requireTenant } from "@/lib/tenant";
import { signInUser } from "../actions";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const restaurant = await requireTenant();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">
        Sign in to {restaurant.name}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Who are you? This is the account you&apos;ll manage {restaurant.name} as.
        No password — it&apos;s a demo.
      </p>

      <form action={signInUser} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" className="input" placeholder="Nino Rossi" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email" name="email" type="email" required
            className="input" placeholder="owner@nino.com" autoComplete="email"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Your email is what decides what you can do — whether you can issue API
            keys or manage staff is checked against it.
          </p>
        </div>
        <button type="submit" className="btn-primary w-full">
          Sign in
        </button>
      </form>
    </div>
  );
}
