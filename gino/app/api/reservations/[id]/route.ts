import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser, getDinerId } from "@/lib/session";
import { cancelReservation, listMyReservations } from "@/lib/api";
import { parseConfig, COOKIE_NAME } from "@/lib/apiblaze";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = cookies();
  const config = parseConfig(cookieStore.get(COOKIE_NAME)?.value);
  const dinerId = getDinerId(user);

  const mine = await listMyReservations(dinerId, config);
  if (!mine.find((r) => r.id === params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await cancelReservation(params.id, config, undefined, dinerId);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
