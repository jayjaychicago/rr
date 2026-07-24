/** The backend the app talks to, without the version prefix. */
export const API_ORIGIN =
  process.env.RESIRESI_API_URL ?? "https://backend.resiresi.com";

export const SPEC_URL = `${API_ORIGIN}/openapi.yaml`;
export const DOCS_URL = `${API_ORIGIN}/docs`;

const BASE = `${API_ORIGIN}/v1`;

// The resiresi origin is open — no credential of its own. A key is sent only if
// one is configured, which is what you do when pointing at an APIblaze proxy.
const API_KEY = process.env.RESIRESI_API_KEY;

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  address: string | null;
  phone: string | null;
}

export interface Reservation {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  diner_name: string;
  diner_email: string | null;
  diner_phone: string | null;
  party_size: number;
  starts_at: string;
  ends_at: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
}

export type ReservationStatus =
  | "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";

export const STATUSES: ReservationStatus[] = [
  "pending", "confirmed", "seated", "completed", "cancelled", "no_show",
];

export interface DiningTable {
  id: string;
  label: string;
  capacity: number;
  active: boolean;
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body?.error?.message ?? `API error (${res.status})`), {
      status: res.status,
      code: body?.error?.code,
    });
  }
  return body;
}

export async function listRestaurants(): Promise<Restaurant[]> {
  const body = await apiFetch("/restaurants");
  return body.data as Restaurant[];
}

export async function getRestaurant(idOrSlug: string): Promise<Restaurant> {
  return (await apiFetch(`/restaurants/${idOrSlug}`)) as Restaurant;
}

export async function listTables(restaurantId: string): Promise<DiningTable[]> {
  const body = await apiFetch(`/restaurants/${restaurantId}/tables`);
  return body.data as DiningTable[];
}

export async function listReservations(
  restaurantId: string,
  opts: { status?: string; limit?: number } = {}
): Promise<Reservation[]> {
  const params = new URLSearchParams();
  params.set("limit", String(opts.limit ?? 200));
  if (opts.status) params.set("status", opts.status);
  const body = await apiFetch(`/restaurants/${restaurantId}/reservations?${params}`);
  return body.data as Reservation[];
}

export async function getReservation(
  restaurantId: string,
  reservationId: string
): Promise<Reservation> {
  return (await apiFetch(
    `/restaurants/${restaurantId}/reservations/${reservationId}`
  )) as Reservation;
}

export async function createReservation(
  restaurantId: string,
  data: Record<string, unknown>
): Promise<Reservation> {
  return (await apiFetch(`/restaurants/${restaurantId}/reservations`, {
    method: "POST",
    body: JSON.stringify(data),
  })) as Reservation;
}

export async function updateReservation(
  restaurantId: string,
  reservationId: string,
  data: Record<string, unknown>
): Promise<Reservation> {
  return (await apiFetch(`/restaurants/${restaurantId}/reservations/${reservationId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })) as Reservation;
}

export async function deleteReservation(
  restaurantId: string,
  reservationId: string
): Promise<void> {
  await apiFetch(`/restaurants/${restaurantId}/reservations/${reservationId}`, {
    method: "DELETE",
  });
}
