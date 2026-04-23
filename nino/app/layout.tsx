import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "Nino's Pizza", template: "%s | Nino's Pizza" },
  description: "Wood-fired Neapolitan pizza in the heart of Midtown. Book your table online.",
  metadataBase: new URL("https://ninopizzas.com"),
  openGraph: { siteName: "Nino's Pizza", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
