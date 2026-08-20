/**
 * ChatWidget relay (apiblaze Mode 2 — chatwidget_prd.md): the reservation
 * proxy's DP key stays HERE, server-side; the signed-in diner's email rides as
 * X-End-User-Id (the same attribution every reservation call already asserts).
 * The SSE stream pipes through untouched.
 */
import { createApiblazeChat } from "apiblaze/server";
import { getUser, getDinerId } from "@/lib/session";

// Built on the first request, not at module scope. createApiblazeChat throws
// when the key is missing, and a throw at import time is collected during
// `next build` — so an unset key didn't disable chat, it failed the whole build
// and took every other page down with it. Same shape the generated widget
// routes use: construct lazily, answer 503 while unconfigured.
let chat: ReturnType<typeof createApiblazeChat> | null = null;

function handler(req: Request) {
  const apiKey = process.env.APIBLAZE_CHAT_DP_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "Chat isn’t configured on this deployment. Set APIBLAZE_CHAT_DP_KEY " +
          "to a DP key for the chat proxy — it is server-only and must never reach the browser.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  chat ??= createApiblazeChat({
    project: process.env.APIBLAZE_CHAT_PROJECT ?? "resiresinino",
    environment: process.env.APIBLAZE_CHAT_ENV ?? "prod",
    apiKey,
    getUser: () => {
      const u = getUser(); // nino's own session cookie (next/headers)
      return u ? { userId: getDinerId(u) } : null;
    },
  });
  return chat.handler(req);
}

export const POST = handler;
