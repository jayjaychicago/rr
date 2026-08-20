import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getUser } from "@/lib/session";
import { signOutUser } from "./auth/actions";
import { NinoChat } from "@/components/NinoChat";

export const metadata: Metadata = {
  title: { default: "NINO", template: "%s | Nino's Pizza" },
  description: "Wood-fired Neapolitan pizza in the heart of Midtown. Book your table online.",
  metadataBase: new URL("https://ninopizzas.com"),
  openGraph: { siteName: "Nino's Pizza", type: "website" },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🟢</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Nav who={getUser()?.name ?? null} signOutAction={signOutUser} />
          <main className="flex-1">{children}</main>
          <Footer />
          <NinoChat signedIn={Boolean(getUser())} userKey={getUser()?.email} />
        </Providers>
      </body>
    </html>
  );
}
