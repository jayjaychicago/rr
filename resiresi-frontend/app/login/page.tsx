import { listRestaurants } from "@/lib/api";
import { chooseRestaurant } from "../actions";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let restaurants;
  try {
    restaurants = await listRestaurants();
  } catch (err) {
    return (
      <div className="card mx-auto max-w-lg p-6">
        <h1 className="text-lg font-semibold">Can&apos;t reach the reservation API</h1>
        <p className="mt-2 text-sm text-slate-600">
          {(err as Error).message}
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Check <code className="rounded bg-slate-100 px-1.5 py-0.5">RESIRESI_API_URL</code> and
          that the backend is running.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Choose the restaurant you manage. You&apos;ll see and edit only its reservations.
      </p>

      <div className="card mt-6 divide-y divide-slate-200">
        {restaurants.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            No restaurants yet. Seed the backend first.
          </p>
        )}
        {restaurants.map((r) => (
          <form key={r.id} action={chooseRestaurant} className="flex items-center justify-between gap-4 p-4">
            <input type="hidden" name="slug" value={r.slug} />
            <div className="min-w-0">
              <p className="truncate font-medium">{r.name}</p>
              <p className="truncate text-sm text-slate-500">
                {r.slug}
                {r.address ? ` · ${r.address}` : ""}
              </p>
            </div>
            <button type="submit" className="btn-primary shrink-0">
              Sign in
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
