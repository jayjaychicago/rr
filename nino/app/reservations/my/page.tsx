import { redirect } from "next/navigation";
import { getUser, getDinerId } from "@/lib/session";
import { listMyReservations } from "@/lib/api";
import { MyReservations } from "@/components/MyReservations";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Reservations" };
export const dynamic = "force-dynamic";

export default async function MyReservationsPage() {
  const user = getUser();
  if (!user) redirect("/auth/signin?callbackUrl=/reservations/my");

  const reservations = await listMyReservations(getDinerId(user));

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-serif text-4xl font-bold mb-2">My Reservations</h1>
      <p className="text-stone-500 mb-10">{user.email}</p>
      <MyReservations initial={reservations} />
    </div>
  );
}
