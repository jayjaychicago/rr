import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { createReservation } from "@/lib/api";
import { parseConfig, COOKIE_NAME } from "@/lib/apiblaze";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = cookies();
  const config = parseConfig(
    cookieStore.get(COOKIE_NAME)?.value,
    process.env.RESIRESI_API_KEY!,
    process.env.RESTAURANT_API_KEY!
  );
  const oauthToken = (session as unknown as Record<string, unknown>).accessToken as string | undefined;
  const dinerId = (session as unknown as Record<string, unknown>).dinerId as string;

  const body = await req.json();
  const { party_size, starts_at, duration_minutes, notes, phone } = body;

  if (!party_size || !starts_at) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const reservation = await createReservation(
      {
        diner_external_id: dinerId,
        diner_name: session.user.name ?? session.user.email,
        diner_phone: phone || undefined,
        party_size: Number(party_size),
        starts_at,
        duration_minutes: Number(duration_minutes) || 90,
        notes: notes || undefined,
      },
      randomUUID(),
      config,
      oauthToken
    );
    return NextResponse.json(reservation, { status: 201 });
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };
    return NextResponse.json(
      { error: e.message ?? "Failed to create reservation", code: e.code },
      { status: e.status ?? 500 }
    );
  }
}
