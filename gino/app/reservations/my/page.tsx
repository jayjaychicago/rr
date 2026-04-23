import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listMyReservations } from "@/lib/api";
import { MyReservations } from "@/components/MyReservations";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Reservations" };

export default async function MyReservationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin?callbackUrl=/reservations/my");

  const reservations = await listMyReservations(session.user!.email!);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-serif text-4xl font-bold mb-2">My Reservations</h1>
      <p className="text-stone-500 mb-10">{session.user?.email}</p>
      <MyReservations initial={reservations} />
    </div>
  );
}
