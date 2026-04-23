import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ReservationForm } from "@/components/ReservationForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Book a Table" };

export default async function ReservationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin?callbackUrl=/reservations");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="font-serif text-4xl font-bold mb-2">Reserve Your Table</h1>
        <p className="text-stone-500">Signed in as <span className="font-medium text-stone-700">{session.user?.email}</span></p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-stone-100 p-8">
        <ReservationForm user={session.user} />
      </div>
    </div>
  );
}
