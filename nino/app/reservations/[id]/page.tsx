import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, getDinerId } from "@/lib/session";
import { getReservation, type Reservation } from "@/lib/api";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reservation" };
export const dynamic = "force-dynamic";

// A single reservation, opened BY ID — the demo's money shot. Before the
// gateway rules exist, any signed-in diner can open anyone's booking here.
// After the rules: the gateway answers 403 for other people's bookings, and
// this page renders that as a friendly locked state instead of an error.
export default async function ReservationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = getUser();
  if (!user) redirect(`/auth/signin?callbackUrl=/reservations/${params.id}`);

  let reservation: Reservation | null = null;
  let denied = false;
  let missing = false;
  try {
    reservation = await getReservation(params.id, getDinerId(user));
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) denied = true;
    else if (status === 404) missing = true;
    else throw e;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <p className="mb-6 text-sm">
        <Link href="/reservations/my" className="text-stone-500 hover:text-stone-800">
          ← My reservations
        </Link>
      </p>

      {denied && (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-100">
          <p className="mb-3 text-4xl">🔒</p>
          <h1 className="font-serif text-2xl font-bold">
            This reservation isn&apos;t yours to view
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-stone-500">
            You&apos;re signed in as <span className="font-medium text-stone-700">{user.email}</span>.
            Reservations can only be opened by the person who made them — or by
            Nino&apos;s staff.
          </p>
        </div>
      )}

      {missing && (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-100">
          <p className="mb-3 text-4xl">🤔</p>
          <h1 className="font-serif text-2xl font-bold">Reservation not found</h1>
          <p className="mt-3 text-sm text-stone-500">It may have been cancelled.</p>
        </div>
      )}

      {reservation && (
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-100">
          <h1 className="font-serif text-3xl font-bold">Reservation</h1>
          <p className="mt-1 text-sm text-stone-500">
            {reservation.diner_name}
            {reservation.diner_email ? ` · ${reservation.diner_email}` : ""}
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-stone-100 pb-3">
              <dt className="text-stone-500">When</dt>
              <dd className="font-medium">
                {new Date(reservation.starts_at).toLocaleString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                })}
              </dd>
            </div>
            <div className="flex justify-between border-b border-stone-100 pb-3">
              <dt className="text-stone-500">Party size</dt>
              <dd className="font-medium">{reservation.party_size} guests</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Status</dt>
              <dd className="font-medium capitalize">{reservation.status}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
