import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getTenantSlug } from "@/lib/tenant";
import { getUser } from "@/lib/user";
import { signOut, signOutUser } from "./actions";

export const metadata: Metadata = {
  title: { default: "ResiResi", template: "%s | ResiResi" },
  description: "Reservation management for restaurants on the ResiResi platform.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍽️</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = getTenantSlug();
  const user = getUser();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span aria-hidden>🍽️</span>
                <span>ResiResi</span>
              </Link>
              {tenant && user && (
                <nav className="flex items-center gap-4 text-sm">
                  <Link href="/reservations" className="text-slate-600 hover:text-slate-900">
                    Reservations
                  </Link>
                  <Link href="/developers" className="text-slate-600 hover:text-slate-900">
                    Developers
                  </Link>
                </nav>
              )}
            </div>
            {tenant && (
              <div className="flex items-center gap-4">
                <span className="hidden text-sm text-slate-500 sm:inline">
                  {tenant}
                  {user && (
                    <>
                      {" · "}
                      <span className="font-medium text-slate-800">{user.email}</span>
                    </>
                  )}
                </span>
                {user && (
                  <form action={signOutUser}>
                    <button type="submit" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                      Sign out
                    </button>
                  </form>
                )}
                <form action={signOut}>
                  <button type="submit" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    Switch restaurant
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          ResiResi reservation platform
        </footer>
      </body>
    </html>
  );
}
