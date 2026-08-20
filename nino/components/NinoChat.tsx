"use client";

/**
 * The floating chat bubble — apiblaze <ChatWidget/> in relay mode. The widget
 * holds no credential: it talks to /api/apiblaze/chat, which attaches the DP
 * key server-side and streams the AI SDK protocol back.
 */
import { ChatWidget } from "apiblaze/react";

export function NinoChat({ signedIn }: { signedIn: boolean }) {
  // No login UI in the chat, ever (widget UX rule): signed-out visitors simply
  // don't get the bubble — the site's own Sign in is the affordance.
  if (!signedIn) return null;
  return (
    <ChatWidget
      endpoint="/api/apiblaze/chat"
      title="Chat with Nino"
      avatar="🍕"
      welcome="Ciao! I can check your reservations or book you a table — just ask."
      suggestions={[
        "Book a table for 2 tomorrow at 8pm",
        "What reservations do I have?",
        "Cancel my next reservation",
      ]}
      theme={{
        accent: "#dc2626",
        userBubble: "#dc2626",
        launcherBackground: "#dc2626",
        assistantBubble: "#f5f5f4",
        border: "#e7e5e4",
      }}
    />
  );
}
