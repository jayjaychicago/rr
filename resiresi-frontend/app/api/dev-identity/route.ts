import { NextRequest, NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant";
import { USER_COOKIE } from "@/lib/user";

export const dynamic = "force-dynamic";

/**
 * One-click identity, for the guided lab's pane picker.
 *
 * Signing in here is normally two steps (pick a restaurant, then say who you
 * are) — fine for a human exploring the app, but the lab drives this page in an
 * iframe and only ever needs ONE identity: Nino's owner. Making a tester retype
 * a form they cannot get wrong is friction that only creates a way to get it
 * wrong (sign in before the admin grant exists, or with a typo'd email, and the
 * widgets refuse you).
 *
 * So: set both cookies from the query and land on the page. This is the same
 * trust level the app already has — the sign-in form takes any email with no
 * password, because it is a local demo. It adds no capability, only a shortcut.
 */
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const email = (q.get("email") ?? "").trim().toLowerCase();
  const name = (q.get("name") ?? "").trim() || email;
  const restaurant = (q.get("restaurant") ?? "").trim();
  // Only same-app paths: a full URL here would make this an open redirect.
  const raw = q.get("next") ?? "/developers";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/developers";

  if (!email || !restaurant) {
    return NextResponse.json({ error: "restaurant and email are required" }, { status: 400 });
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(TENANT_COOKIE, restaurant, COOKIE_OPTS);
  res.cookies.set(USER_COOKIE, JSON.stringify({ email, name }), COOKIE_OPTS);
  return res;
}
