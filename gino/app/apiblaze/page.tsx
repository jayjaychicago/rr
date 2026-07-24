import { cookies } from "next/headers";
import { parseConfig, COOKIE_NAME } from "@/lib/apiblaze";
import { ApiBlazePanel } from "@/components/ApiBlazePanel";
import { ApiBlazeLogin } from "@/components/ApiBlazeLogin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "APIblaze Panel" };

export default function ApiBlazeRoute() {
  const cookieStore = cookies();

  if (cookieStore.get("apiblaze-auth")?.value !== "qpzm123") {
    return <ApiBlazeLogin />;
  }

  const config = parseConfig(cookieStore.get(COOKIE_NAME)?.value);

  return (
    <ApiBlazePanel
      config={config}
      originalUrl="https://backend.resiresi.com"
      proxyUrl="https://rr-gino.apiblaze.com/1.0.0"
      ownOriginalUrl={process.env.NEXTAUTH_URL ?? "https://ginopizzas.com"}
      ownProxyUrl="https://gino-api.apiblaze.com"
      appName="Gino's Pizza"
    />
  );
}
