import type { ApiBlazeConfig } from "./apiblaze";

// Resiresi (shared reservation backend)
const ORIGINAL_BASE = `${process.env.RESIRESI_API_URL ?? "http://localhost:8080"}`;
// Optional: an APIblaze DP key. Set when RESIRESI_API_URL points at the proxy —
// the key says which APP is calling; X-End-User-Id (below) says which PERSON.
const ENV_API_KEY = process.env.RESIRESI_API_KEY;
const PROXY_BASE = "https://rr-nino.apiblaze.com/1.0.0/prod";
// Accepts the restaurant slug ("nino") or its UUID — the API resolves either.
export const RESTAURANT_ID = process.env.RESIRESI_RESTAURANT_ID ?? "nino";

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
  // The resiresi origin is open. A key is sent only when one is configured —
  // from the apiblaze panel cookie, or the RESIRESI_API_KEY env (proxy mode).
  const key = config?.apiKey || ENV_API_KEY;
  return key ? { "x-api-key": key } : {};
}

async function apiFetch(
  path: string,
  init?: RequestInit,
  config?: ApiBlazeConfig,
  oauthToken?: string,
  endUserId?: string
) {
  const base = config?.backend === "proxy" ? PROXY_BASE : ORIGINAL_BASE;
  const authHeaders = buildAuthHeaders(config, oauthToken);
  const customHeaders: Record<string, string> = {};
  for (const h of config?.customHeaders ?? []) {
    if (h.name) customHeaders[h.name] = h.value;
  }
  // Attribution is a request property, never the credential's: the shared API
  // key says which APP is calling; X-End-User-Id says which PERSON it acts for.
  // The gateway resolves groups/limits per end-user from this assertion.
  const identityHeaders: Record<string, string> = endUserId
    ? { "X-End-User-Id": endUserId }
    : {};
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders, ...customHeaders, ...identityHeaders, ...init?.headers },
    cache: "no-store",
  });
  // Never assume JSON: a gateway refusal or a dropped tunnel can answer with
  // HTML or nothing at all, and parsing that first would throw an error with no
  // .status — which callers checking for 403 would rethrow as a hard crash.
  const body = await res.json().catch(() => ({} as Record<string, never>));
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
    oauthToken,
    data.diner_external_id
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
    oauthToken,
    dinerId
  );
  return data.data as Reservation[];
}

export async function getReservation(
  reservationId: string,
  dinerId: string,
  config?: ApiBlazeConfig,
  oauthToken?: string
): Promise<Reservation> {
  // Open a single reservation BY ID — the demo's pivotal call: before the
  // gateway rules, any signed-in diner can open anyone's booking this way;
  // after, the gateway returns 403 unless dinerId owns it (or is staff).
  return apiFetch(
    `/restaurants/${RESTAURANT_ID}/reservations/${reservationId}`,
    undefined,
    config,
    oauthToken,
    dinerId
  ) as Promise<Reservation>;
}

export async function cancelReservation(
  reservationId: string,
  config?: ApiBlazeConfig,
  oauthToken?: string,
  dinerId?: string
) {
  return apiFetch(
    `/restaurants/${RESTAURANT_ID}/reservations/${reservationId}`,
    { method: "DELETE" },
    config,
    oauthToken,
    dinerId
  );
}
