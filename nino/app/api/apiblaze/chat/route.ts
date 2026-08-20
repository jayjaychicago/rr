/**
 * ChatWidget relay (apiblaze Mode 2 — chatwidget_prd.md): the reservation
 * proxy's DP key stays HERE, server-side; the signed-in diner's email rides as
 * X-End-User-Id (the same attribution every reservation call already asserts).
 * The SSE stream pipes through untouched.
 */
import { createApiblazeChat } from "apiblaze/server";
import { getUser, getDinerId } from "@/lib/session";

const chat = createApiblazeChat({
  project: process.env.APIBLAZE_CHAT_PROJECT ?? "resiresinino",
  environment: process.env.APIBLAZE_CHAT_ENV ?? "prod",
  apiKey: process.env.APIBLAZE_CHAT_DP_KEY ?? "",
  getUser: () => {
    const u = getUser(); // nino's own session cookie (next/headers)
    return u ? { userId: getDinerId(u) } : null;
  },
});

export const POST = chat.handler;
