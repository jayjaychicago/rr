"use client";
import Link from "next/link";
import { useState } from "react";

export function Nav({
  signedIn,
  signOutAction,
}: {
  signedIn: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🍕</span>
          <span className="font-serif text-xl font-bold text-brand-700">Nino&apos;s Pizza</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/#menu" className="text-sm font-medium text-stone-600 hover:text-brand-700 transition">Menu</Link>
          <Link href="/#about" className="text-sm font-medium text-stone-600 hover:text-brand-700 transition">About</Link>
          <Link href="/#contact" className="text-sm font-medium text-stone-600 hover:text-brand-700 transition">Contact</Link>
          {signedIn && (
            <>
              <Link href="/reservations/my" className="text-sm font-medium text-stone-600 hover:text-brand-700 transition">My Reservations</Link>
              <Link href="/profile" className="text-sm font-medium text-stone-600 hover:text-brand-700 transition">Profile</Link>
              <form action={signOutAction}>
                <button type="submit" className="btn-outline text-xs px-4 py-2">Sign out</button>
              </form>
            </>
          )}
          <Link href="/reservations" className="btn-primary text-xs px-4 py-2">Book a Table</Link>
          <Link href="/apiblaze" className="text-xs font-mono text-stone-400 hover:text-stone-700 transition border border-stone-200 px-2 py-1 rounded">⚡ apiblaze</Link>
        </nav>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          <span className="block w-5 h-0.5 bg-stone-700 mb-1" />
          <span className="block w-5 h-0.5 bg-stone-700 mb-1" />
          <span className="block w-5 h-0.5 bg-stone-700" />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-stone-100 bg-white px-4 pb-4 space-y-2">
          <Link href="/#menu" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>Menu</Link>
          <Link href="/#about" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>About</Link>
          <Link href="/#contact" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>Contact</Link>
          {signedIn && (
            <>
              <Link href="/reservations/my" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>My Reservations</Link>
              <Link href="/profile" className="block py-2 text-sm font-medium" onClick={() => setOpen(false)}>Profile</Link>
              <form action={signOutAction}>
                <button type="submit" className="block py-2 text-sm font-medium text-brand-700">Sign out</button>
              </form>
            </>
          )}
          <Link href="/reservations" className="btn-primary block text-center mt-2" onClick={() => setOpen(false)}>Book a Table</Link>
        </div>
      )}
    </header>
  );
}
