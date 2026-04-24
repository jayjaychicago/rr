import type { ApiBlazeConfig } from "./apiblaze";

// Resiresi (shared reservation backend)
const ORIGINAL_BASE = `${process.env.RESIRESI_API_URL!}/v1`;
const PROXY_BASE = "https://rr-gino.apiblaze.com/1.0.0";
const DEFAULT_API_KEY = process.env.RESIRESI_API_KEY!;
export const RESTAURANT_ID = process.env.RESIRESI_RESTAURANT_ID!;

export interface Reservation {
  id: string;
  restaurant_id: string;
  diner_name: string;
  diner_email: string;
  diner_phone: string | null;
  party_size: number;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Profile {
  diner_external_id: string;
  name: string | null;
  phone: string | null;
  dietary_notes: string | null;
  marketing_opt_in: boolean;
}

function buildAuthHeaders(
  config: ApiBlazeConfig | undefined,
  oauthToken: string | undefined
): Record<string, string> {
  const mode = config?.authMode ?? "apikey";
  if (mode === "oauth" && oauthToken) return { Authorization: `Bearer ${oauthToken}` };
  if (mode === "passthru") return {};
  return { "x-api-key": config?.apiKey ?? DEFAULT_API_KEY };
}

async function apiFetch(
  path: string,
  init?: RequestInit,
  config?: ApiBlazeConfig,
  oauthToken?: string
) {
  const base = config?.backend === "proxy" ? PROXY_BASE : ORIGINAL_BASE;
  const authHeaders = buildAuthHeaders(config, oauthToken);
  const customHeaders: Record<string, string> = {};
  for (const h of config?.customHeaders ?? []) {
    if (h.name) customHeaders[h.name] = h.value;
  }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...customHeaders, ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok)
    throw Object.assign(new Error(body.error?.message ?? "API error"), {
      status: res.status,
      code: body.error?.code,
    });
  return body;
}

export async function createReservation(
  data: {
    diner_external_id: string;
    diner_name: string;
    diner_email?: string;
    diner_phone?: string;
    party_size: number;
    starts_at: string;
    duration_minutes: number;
    notes?: string;
  },
  idempotencyKey?: string,
  config?: ApiBlazeConfig,
  oauthToken?: string
) {
  return apiFetch(
    `/restaurants/${RESTAURANT_ID}/reservations`,
    {
      method: "POST",
      body: JSON.stringify({ ...data, status: "confirmed" }),
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    },
    config,
    oauthToken
  ) as Promise<Reservation>;
}

export async function listMyReservations(
  dinerId: string,
  config?: ApiBlazeConfig,
  oauthToken?: string
): Promise<Reservation[]> {
  const data = await apiFetch(
    `/restaurants/${RESTAURANT_ID}/reservations?diner_external_id=${encodeURIComponent(dinerId)}&limit=50`,
    undefined,
    config,
    oauthToken
  );
  return data.data as Reservation[];
}

export async function cancelReservation(
  reservationId: string,
  config?: ApiBlazeConfig,
  oauthToken?: string
) {
  return apiFetch(
    `/restaurants/${RESTAURANT_ID}/reservations/${reservationId}`,
    { method: "DELETE" },
    config,
    oauthToken
  );
}
