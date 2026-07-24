"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";

export async function signInUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || email;
  const callbackUrl = String(formData.get("callbackUrl") ?? "/reservations");
  if (!email) return;
  cookies().set(SESSION_COOKIE, JSON.stringify({ email, name }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(callbackUrl.startsWith("/") ? callbackUrl : "/reservations");
}

export async function signOutUser() {
  cookies().delete(SESSION_COOKIE);
  redirect("/");
}
