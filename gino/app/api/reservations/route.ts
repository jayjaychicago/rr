import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser, getDinerId } from "@/lib/session";
import { createReservation } from "@/lib/api";
import { parseConfig, COOKIE_NAME } from "@/lib/apiblaze";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const user = getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = cookies();
  const config = parseConfig(cookieStore.get(COOKIE_NAME)?.value);
  const dinerId = getDinerId(user);

  const { party_size, starts_at, duration_minutes, notes, phone } = await req.json();
  if (!party_size || !starts_at) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  try {
    const reservation = await createReservation(
      {
        diner_external_id: dinerId,
        diner_name: user.name,
        diner_email: user.email,
        diner_phone: phone || undefined,
        party_size: Number(party_size),
        starts_at,
        duration_minutes: Number(duration_minutes) || 90,
        notes: notes || undefined,
      },
      randomUUID(),
      config
    );
    return NextResponse.json(reservation, { status: 201 });
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    return NextResponse.json({ error: e.message ?? "Failed to create reservation", code: e.code }, { status: e.status ?? 500 });
  }
}
