import { redirect } from "next/navigation";
import { getUser, getDinerId } from "@/lib/session";
import { listMyReservations, type Reservation } from "@/lib/api";
import { MyReservations } from "@/components/MyReservations";
import { ApiTrouble, classifyApiError, type ApiTroubleKind } from "@/components/ApiTrouble";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reservations" };
export const dynamic = "force-dynamic";

export default async function MyReservationsPage() {
  const user = getUser();
  if (!user) redirect("/auth/signin?callbackUrl=/reservations/my");

  // This reads the LIST route, which is exactly what the guided lab locks down
  // ("the full reservations list is for reservationists only") — and it sits in
  // the nav, so it is the likeliest click to meet a refusal. Never throw: in dev
  // that means Next's red overlay, which is the ugliest thing a demo can show.
  let reservations: Reservation[] = [];
  let trouble: ApiTroubleKind | null = null;
  try {
    reservations = await listMyReservations(getDinerId(user));
  } catch (e) {
    trouble = classifyApiError(e);
  }

  // Name the person in the heading. "My reservations" is unreadable when you can
  // become someone else in one click — you cannot tell whose empty list you are
  // looking at, or whether the emptiness is the point.
  const first = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-serif text-4xl font-bold mb-2">{first}’s reservations</h1>
      <p className="text-stone-500 mb-10">{user.email}</p>
      {trouble === "denied" ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-100">
          <p className="mb-3 text-4xl">🔒</p>
          <h2 className="font-serif text-2xl font-bold">{first} can’t list bookings</h2>
          <p className="mt-3 text-sm text-stone-500">
            The gateway refused to hand over the whole reservations list. In the
            guided lab that is the rule you wrote doing its job — listing
            everyone’s bookings is limited to staff, while your own booking still
            opens from its own link.
          </p>
        </div>
      ) : trouble ? (
        <ApiTrouble kind={trouble} />
      ) : (
        <MyReservations initial={reservations} />
      )}
    </div>
  );
}
