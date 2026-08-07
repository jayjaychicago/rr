import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { requireUser } from "@/lib/user";
import { getReservation, listTables } from "@/lib/api";
import { editReservation } from "../../actions";
import { ReservationForm } from "../form";

export const metadata = { title: "Edit reservation" };
export const dynamic = "force-dynamic";

export default async function EditReservationPage({
  params,
}: {
  params: { id: string };
}) {
  const restaurant = await requireTenant();
  requireUser();

  // A 404 is a real dead end; anything else (backend stopped, gateway refusal,
  // an HTML error body) must NOT rethrow — in `npm run dev`, which is how the
  // guided lab runs this app, a rethrow is Next's red overlay rather than
  // app/error.tsx.
  let reservation;
  let unreachable = false;
  try {
    reservation = await getReservation(restaurant.id, params.id);
  } catch (err) {
    if ((err as { status?: number }).status === 404) notFound();
    unreachable = true;
  }

  if (unreachable || !reservation) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/reservations" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to reservations
        </Link>
        <div className="card p-8 text-center">
          <p className="mb-3 text-3xl">🔌</p>
          <h1 className="text-xl font-semibold tracking-tight">Couldn’t open this reservation</h1>
          <p className="mt-2 text-sm text-slate-600">
            The backend didn’t answer for it. If you’re running the guided lab,
            check that its backend step is still going, then try again.
          </p>
        </div>
      </div>
    );
  }

  const tables = await listTables(restaurant.id).catch(() => []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/reservations" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to reservations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit reservation</h1>
        <p className="mt-1 text-sm text-slate-500">{restaurant.name}</p>
      </div>

      <section className="card p-6">
        <ReservationForm
          tables={tables}
          reservation={reservation}
          timezone={restaurant.timezone}
          action={editReservation.bind(null, restaurant.id, reservation.id)}
          submitLabel="Save changes"
        />
      </section>
    </div>
  );
}
