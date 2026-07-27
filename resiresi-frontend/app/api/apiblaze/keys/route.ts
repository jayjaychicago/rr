import { NextResponse } from "next/server";
import { createApiblazeKeys } from "apiblaze/server";
import { getApiblazeUser } from "@/lib/apiblaze-user";

let h: ReturnType<typeof createApiblazeKeys> | null = null;

function handler(req: Request) {
  const cpKey = process.env.APIBLAZE_CP_KEY;
  if (!cpKey) return NextResponse.json({ error: "APIBLAZE_CP_KEY not set" }, { status: 503 });
  h ??= createApiblazeKeys({ cpKey, getUser: () => getApiblazeUser() });
  return h.handler(req);
}

export const GET = handler;
export const POST = handler;
