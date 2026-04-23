import { cookies } from "next/headers";
import { parseConfig, COOKIE_NAME } from "@/lib/apiblaze";
import { ApiBlazePanel } from "@/components/ApiBlazePanel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "APIblaze Panel" };

export default function ApiBlazeRoute() {
  const cookieStore = cookies();
  const config = parseConfig(
    cookieStore.get(COOKIE_NAME)?.value,
    process.env.RESIRESI_API_KEY!
  );

  return (
    <ApiBlazePanel
      config={config}
      originalUrl="https://backend.resiresi.com"
      proxyUrl="https://rr-nino.apiblaze.com/1.0.0/prod"
      appName="Nino's Pizza"
    />
  );
}
