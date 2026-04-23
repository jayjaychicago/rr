import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400" id="contact">
      <div className="mx-auto max-w-6xl px-4 py-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        <div>
          <p className="font-serif text-lg font-bold text-white mb-2">🍕 Nino&apos;s Pizza</p>
          <p className="text-sm">Wood-fired Neapolitan pizza crafted with imported Italian flour and a 48-hour cold-fermented dough.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Visit Us</p>
          <address className="not-italic text-sm space-y-1">
            <p>641 Lexington Ave</p>
            <p>New York, NY 10022</p>
            <p className="mt-2">Mon–Thu: 11 am – 10 pm</p>
            <p>Fri–Sat: 11 am – 11 pm</p>
            <p>Sun: 11 am – 10 pm</p>
          </address>
        </div>
        <div>
          <p className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Reserve</p>
          <p className="text-sm mb-3">Book online or call <a href="tel:+12125559876" className="text-white hover:underline">(212) 555-9876</a></p>
          <Link href="/reservations" className="btn-primary text-xs">Book a Table</Link>
        </div>
      </div>
      <div className="border-t border-stone-800 px-4 py-4 text-center text-xs">
        © {new Date().getFullYear()} Nino&apos;s Pizza. All rights reserved.
      </div>
    </footer>
  );
}
