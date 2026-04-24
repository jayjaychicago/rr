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

  const config = parseConfig(cookieStore.get(COOKIE_NAME)?.value, process.env.RESIRESI_API_KEY!);

  return (
    <ApiBlazePanel
      config={config}
      originalUrl="https://backend.resiresi.com"
      proxyUrl="https://rr-nino.apiblaze.com/1.0.0/prod"
      ownOriginalUrl={process.env.NEXTAUTH_URL ?? "https://ninopizzas.com"}
      ownProxyUrl="https://nino-api.apiblaze.com"
      appName="Nino's Pizza"
    />
  );
}
