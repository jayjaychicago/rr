import { cookies } from "next/headers";

export const SESSION_COOKIE = "gino_user";

/**
 * Lightweight signed-in identity: a name and an email, no password (demo).
 * The email doubles as the diner's stable id (`diner_external_id`) AND as the
 * X-End-User-Id asserted on every call to the reservation API — attribution is
 * a request property; the credential (a shared API key) never implies a person.
 */
export interface SessionUser {
  name: string;
  email: string;
}

export function getUser(): SessionUser | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as Partial<SessionUser>;
    if (typeof u.email === "string" && u.email) {
      return { email: u.email, name: u.name || u.email };
    }
  } catch {
    /* malformed cookie → signed out */
  }
  return null;
}

/** The diner's stable external id — the signed-in email. */
export function getDinerId(user: SessionUser): string {
  return user.email;
}
