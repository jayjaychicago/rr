"use client";
import { useState } from "react";
import Link from "next/link";
import type { Reservation } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending:   "bg-yellow-100 text-yellow-800",
  seated:    "bg-blue-100 text-blue-800",
  completed: "bg-stone-100 text-stone-600",
  cancelled: "bg-red-100 text-red-700",
  no_show:   "bg-stone-100 text-stone-500",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

export function MyReservations({ initial }: { initial: Reservation[] }) {
  const [reservations, setReservations] = useState(initial);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const upcoming = reservations.filter((r) => !["cancelled","completed","no_show"].includes(r.status) && new Date(r.starts_at) > new Date());
  const past = reservations.filter((r) => ["cancelled","completed","no_show"].includes(r.status) || new Date(r.starts_at) <= new Date());

  async function cancel(id: string) {
    setCancelling(id);
    await fetch(`/api/reservations/${id}`, { method: "DELETE" });
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" } : r));
    setCancelling(null);
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400">
        <p className="text-4xl mb-4">🍽️</p>
        <p className="font-medium text-stone-600 mb-2">No reservations yet</p>
        <Link href="/reservations" className="btn-primary mt-4 inline-flex">Book a Table</Link>
      </div>
    );
  }

  function ResList({ items, title }: { items: Reservation[]; title: string }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-10">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">{title}</h2>
        <div className="space-y-3">
          {items.map((r) => {
            const { date, time } = fmt(r.starts_at);
            const canCancel = !["cancelled","completed","no_show"].includes(r.status) && new Date(r.starts_at) > new Date();
            return (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-stone-100 text-stone-600"}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="font-semibold text-stone-900">{date} at {time}</p>
                  <p className="text-sm text-stone-500">{r.party_size} {r.party_size === 1 ? "guest" : "guests"}{r.notes ? ` · ${r.notes}` : ""}</p>
                </div>
                {canCancel && (
                  <button
                    onClick={() => cancel(r.id)}
                    disabled={cancelling === r.id}
                    className="shrink-0 rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition disabled:opacity-50"
                  >
                    {cancelling === r.id ? "Cancelling…" : "Cancel"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <ResList items={upcoming} title="Upcoming" />
      <ResList items={past} title="Past & Cancelled" />
      <div className="mt-4">
        <Link href="/reservations" className="btn-primary inline-flex">Book another table</Link>
      </div>
    </div>
  );
}
