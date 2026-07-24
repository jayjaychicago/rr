import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { requireUser } from "@/lib/user";
import { listReservations, listTables, STATUSES, type Reservation } from "@/lib/api";
import { addReservation, removeReservation } from "../actions";
import { ReservationForm } from "./form";

export const metadata = { title: "Reservations" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  seated:    "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  no_show:   "bg-red-50 text-red-700 ring-red-600/20",
};

function formatWhen(iso: string, timezone: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const restaurant = await requireTenant();
  requireUser();
  const status = searchParams.status;

  const [reservations, tables] = await Promise.all([
    listReservations(restaurant.id, { status }),
    listTables(restaurant.id).catch(() => []),
  ]);

  const tableLabel = (id: string | null) =>
    id ? tables.find((t) => t.id === id)?.label ?? "—" : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{restaurant.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {reservations.length} reservation{reservations.length === 1 ? "" : "s"}
          {status ? ` · filtered by ${status}` : ""}
        </p>
      </div>

      {/* status filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/reservations"
          className={`rounded-full px-3 py-1 text-sm ${
            !status ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/reservations?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm ${
              status === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* add */}
      <section className="card p-6">
        <h2 className="text-base font-semibold">Add a reservation</h2>
        <ReservationForm
          tables={tables}
          action={addReservation.bind(null, restaurant.id)}
          submitLabel="Add reservation"
        />
      </section>

      {/* list */}
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Diner</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No reservations yet.
                  </td>
                </tr>
              )}
              {reservations.map((r: Reservation) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{r.diner_name}</div>
                    {r.diner_email && (
                      <div className="text-xs text-slate-500">{r.diner_email}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatWhen(r.starts_at, restaurant.timezone)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.party_size}</td>
                  <td className="px-4 py-3 text-slate-700">{tableLabel(r.table_id)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        STATUS_STYLES[r.status] ?? STATUS_STYLES.completed
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/reservations/${r.id}`} className="btn-outline px-3 py-1.5">
                        Edit
                      </Link>
                      <form action={removeReservation.bind(null, restaurant.id, r.id)}>
                        <button type="submit" className="btn-danger">
                          Cancel
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
