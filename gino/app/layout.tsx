import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: { default: "Gino's Pizza", template: "%s | Gino's Pizza" },
  description: "Authentic New York pizza since 1987. Book your table online.",
  metadataBase: new URL("https://ginopizzas.com"),
  openGraph: {
    siteName: "Gino's Pizza",
    type: "website",
  },
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
