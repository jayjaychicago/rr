"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { TENANT_COOKIE } from "@/lib/tenant";
import { USER_COOKIE } from "@/lib/user";
import {
  createReservation,
  updateReservation,
  deleteReservation,
} from "@/lib/api";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

// --- session ------------------------------------------------------------
// No passwords. Two steps: pick a restaurant, then sign in as a person.

export async function chooseRestaurant(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return;
  cookies().set(TENANT_COOKIE, slug, COOKIE_OPTS);
  // Picking the restaurant is step one; identifying yourself is step two.
  cookies().delete(USER_COOKIE);
  redirect("/signin");
}

export async function signInUser(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || email;
  if (!email) return;
  cookies().set(USER_COOKIE, JSON.stringify({ email, name }), COOKIE_OPTS);
  // The whole point of the demo is the API access surface — land there.
  redirect("/developers");
}

export async function signOutUser() {
  cookies().delete(USER_COOKIE);
  redirect("/signin");
}

export async function signOut() {
  cookies().delete(TENANT_COOKIE);
  cookies().delete(USER_COOKIE);
  redirect("/login");
}

// --- reservation CRUD ----------------------------------------------------

function toIso(local: string): string {
  // datetime-local gives "YYYY-MM-DDTHH:mm" with no zone; treat it as local time.
  return new Date(local).toISOString();
}

function readForm(formData: FormData) {
  const tableId = String(formData.get("table_id") ?? "");
  return {
    diner_name: String(formData.get("diner_name") ?? "").trim(),
    diner_email: String(formData.get("diner_email") ?? "").trim() || undefined,
    diner_phone: String(formData.get("diner_phone") ?? "").trim() || undefined,
    party_size: Number(formData.get("party_size")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    table_id: tableId || undefined,
  };
}

export async function addReservation(restaurantId: string, formData: FormData) {
  const fields = readForm(formData);
  await createReservation(restaurantId, {
    ...fields,
    starts_at: toIso(String(formData.get("starts_at"))),
    duration_minutes: Number(formData.get("duration_minutes")) || 90,
    status: String(formData.get("status") || "confirmed"),
  });
  revalidatePath("/reservations");
}

export async function editReservation(
  restaurantId: string,
  reservationId: string,
  formData: FormData
) {
  const fields = readForm(formData);
  const startsAt = String(formData.get("starts_at") ?? "");
  const duration = Number(formData.get("duration_minutes")) || 90;

  const patch: Record<string, unknown> = {
    ...fields,
    status: String(formData.get("status")),
  };

  if (startsAt) {
    const starts = new Date(startsAt);
    patch.starts_at = starts.toISOString();
    patch.ends_at = new Date(starts.getTime() + duration * 60_000).toISOString();
  }

  await updateReservation(restaurantId, reservationId, patch);
  revalidatePath("/reservations");
  redirect("/reservations");
}

export async function removeReservation(restaurantId: string, reservationId: string) {
  await deleteReservation(restaurantId, reservationId);
  revalidatePath("/reservations");
}
