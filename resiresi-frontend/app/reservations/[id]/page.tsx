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

  let reservation;
  try {
    reservation = await getReservation(restaurant.id, params.id);
  } catch (err) {
    if ((err as { status?: number }).status === 404) notFound();
    throw err;
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
