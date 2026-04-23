import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { cancelReservation, listMyReservations } from "@/lib/api";
import { parseConfig, COOKIE_NAME } from "@/lib/apiblaze";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = cookies();
  const config = parseConfig(
    cookieStore.get(COOKIE_NAME)?.value,
    process.env.RESIRESI_API_KEY!
  );
  const oauthToken = (session as unknown as Record<string, unknown>).accessToken as string | undefined;

  const mine = await listMyReservations(session.user.email, config, oauthToken);
  if (!mine.find((r) => r.id === params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await cancelReservation(params.id, config, oauthToken);
    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
