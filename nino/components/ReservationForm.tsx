"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TIME_SLOTS = [
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30",
];

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function minDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function maxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().split("T")[0];
}

interface User { name?: string | null; email?: string | null; }

export function ReservationForm({ user }: { user?: User }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [party, setParty] = useState("2");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_size: Number(party),
          starts_at: toIso(date, time),
          duration_minutes: 90,
          phone: phone || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        const msg = body.code === "table_conflict"
          ? "That time slot is fully booked. Please pick a different time."
          : body.error || "Something went wrong.";
        setErrorMsg(msg);
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-8">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="font-serif text-2xl font-bold mb-2">You&apos;re booked!</h2>
        <p className="text-stone-500 mb-2">
          {party} guests · {new Date(`${date}T${time}`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {time}
        </p>
        <p className="text-stone-500 mb-8">A confirmation has been noted for {user?.email}.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => router.push("/reservations/my")} className="btn-primary">View my reservations</button>
          <button onClick={() => { setStatus("idle"); setDate(""); setTime(""); }} className="btn-outline">Book another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input
            id="date" type="date" className="input"
            min={minDate()} max={maxDate()}
            value={date} onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="party">Party size</label>
          <select id="party" className="input" value={party} onChange={(e) => setParty(e.target.value)}>
            {[1,2,3,4,5,6,7,8].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Time</label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {TIME_SLOTS.map((t) => (
            <button
              key={t} type="button"
              onClick={() => setTime(t)}
              className={`rounded-lg border py-2 text-sm font-medium transition ${
                time === t
                  ? "border-brand-700 bg-brand-700 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:border-brand-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="phone">Phone <span className="text-stone-400 font-normal">(optional)</span></label>
        <input id="phone" type="tel" className="input" placeholder="+1 (212) 555-0000"
          value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div>
        <label className="label" htmlFor="notes">Special requests <span className="text-stone-400 font-normal">(optional)</span></label>
        <textarea id="notes" className="input resize-none" rows={3}
          placeholder="Allergies, celebrations, seating preferences…"
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!date || !time || status === "loading"}
        className="btn-primary w-full py-3"
      >
        {status === "loading" ? "Reserving…" : "Confirm Reservation"}
      </button>
    </form>
  );
}
