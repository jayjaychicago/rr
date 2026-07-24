import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { signInUser } from "../actions";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  if (getUser()) redirect(searchParams.callbackUrl ?? "/reservations");

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-4xl mb-3">🍕</p>
          <h1 className="font-serif text-3xl font-bold">Sign in to book</h1>
          <p className="mt-2 text-stone-500 text-sm">
            Just your name and email — no password needed.
          </p>
        </div>
        <form action={signInUser} className="space-y-4 bg-white rounded-2xl shadow-sm ring-1 ring-stone-100 p-6">
          <input type="hidden" name="callbackUrl" value={searchParams.callbackUrl ?? "/reservations"} />
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-700">Your name</label>
            <input
              id="name" name="name" autoComplete="name" placeholder="Alex Rivera"
              className="block w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="email" placeholder="alex@example.com"
              className="block w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
        </form>
        <p className="mt-6 text-center text-xs text-stone-400">
          Your reservations are linked to this email.
        </p>
      </div>
    </div>
  );
}
