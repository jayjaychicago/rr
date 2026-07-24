import { NextRequest, NextResponse } from "next/server";
import { getUser, getDinerId } from "@/lib/session";
import { getProfileFromDb, upsertProfileInDb } from "@/lib/profile";

export async function GET() {
  const user = getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json(await getProfileFromDb(getDinerId(user)) ?? null);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    return NextResponse.json(
      await upsertProfileInDb({ ...body, diner_external_id: getDinerId(user) })
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
