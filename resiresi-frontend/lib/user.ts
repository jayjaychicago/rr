import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const USER_COOKIE = "resiresi_user";

/**
 * A lightweight signed-in identity: just who the tester is playing (a name and
 * an email). No password — this is a demo. The email is what matters: it's the
 * identity APIblaze authorizes on (key eligibility, tenant-admin allowlist).
 */
export interface SessionUser {
  name: string;
  email: string;
}

export function getUser(): SessionUser | null {
  const raw = cookies().get(USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as Partial<SessionUser>;
    if (typeof u.email === "string" && u.email) {
      return { email: u.email, name: u.name || u.email };
    }
  } catch {
    /* malformed cookie → treated as signed out */
  }
  return null;
}

export function requireUser(): SessionUser {
  const user = getUser();
  if (!user) redirect("/signin");
  return user;
}
