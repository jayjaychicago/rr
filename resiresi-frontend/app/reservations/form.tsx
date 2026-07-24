import { STATUSES, type DiningTable, type Reservation } from "@/lib/api";

/** Renders a datetime-local value ("YYYY-MM-DDTHH:mm") for a given IANA zone. */
function toLocalInput(iso: string, timezone?: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function ReservationForm({
  tables,
  action,
  submitLabel,
  reservation,
  timezone,
}: {
  tables: DiningTable[];
  action: (formData: FormData) => void;
  submitLabel: string;
  reservation?: Reservation;
  timezone?: string;
}) {
  const durationMinutes = reservation
    ? Math.max(
        15,
        Math.round(
          (new Date(reservation.ends_at).getTime() -
            new Date(reservation.starts_at).getTime()) / 60000
        )
      )
    : 90;

  return (
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="diner_name">Diner name</label>
        <input
          id="diner_name" name="diner_name" required maxLength={200}
          defaultValue={reservation?.diner_name}
          className="input" placeholder="Jane Doe"
        />
      </div>

      <div>
        <label className="label" htmlFor="party_size">Party size</label>
        <input
          id="party_size" name="party_size" type="number" required min={1} max={50}
          defaultValue={reservation?.party_size ?? 2}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="diner_email">Email</label>
        <input
          id="diner_email" name="diner_email" type="email"
          defaultValue={reservation?.diner_email ?? ""}
          className="input" placeholder="jane@example.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="diner_phone">Phone</label>
        <input
          id="diner_phone" name="diner_phone"
          defaultValue={reservation?.diner_phone ?? ""}
          className="input" placeholder="+1 555 000 1234"
        />
      </div>

      <div>
        <label className="label" htmlFor="starts_at">Starts at</label>
        <input
          id="starts_at" name="starts_at" type="datetime-local" required
          defaultValue={reservation ? toLocalInput(reservation.starts_at, timezone) : undefined}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="duration_minutes">Duration (minutes)</label>
        <input
          id="duration_minutes" name="duration_minutes" type="number" min={15} step={15}
          defaultValue={durationMinutes}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="table_id">Table</label>
        <select
          id="table_id" name="table_id"
          defaultValue={reservation?.table_id ?? ""}
          className="input"
        >
          <option value="">Unassigned</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} · seats {t.capacity}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="status">Status</label>
        <select
          id="status" name="status"
          defaultValue={reservation?.status ?? "confirmed"}
          className="input"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea
          id="notes" name="notes" rows={2}
          defaultValue={reservation?.notes ?? ""}
          className="input" placeholder="Window table, birthday…"
        />
      </div>

      <div className="sm:col-span-2">
        <button type="submit" className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
