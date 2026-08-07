import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * One-click identity, for the guided lab's pane picker.
 *
 * The whole point of the storefront in the lab is switching between two diners
 * — John and Maria — to watch the SAME request succeed for one and be refused
 * for the other. Retyping a name and an email between every beat buries that
 * comparison in form-filling, and a typo silently breaks the demo (the email is
 * the diner's id, so a wrong one is simply a third person).
 *
 * Same trust level the app already has: its sign-in form takes any email with
 * no password, because it is a local demo. This adds no capability, only a
 * shortcut.
 */
export function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams;
  const email = (q.get("email") ?? "").trim().toLowerCase();
  const name = (q.get("name") ?? "").trim() || email;
  // Only same-app paths: a full URL here would make this an open redirect.
  const raw = q.get("next") ?? "/reservations";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/reservations";

  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(SESSION_COOKIE, JSON.stringify({ email, name }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
