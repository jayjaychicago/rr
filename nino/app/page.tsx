import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nino's Pizza – Neapolitan Wood-Fired Pizza" };

const MENU = [
  {
    category: "Signature Pies",
    items: [
      { name: "Margherita Verace", desc: "DOP San Marzano, fior di latte, fresh basil, extra virgin olive oil", price: "$21" },
      { name: "Diavola", desc: "Spicy Calabrian salami, smoked mozzarella, chili oil, honey drizzle", price: "$25" },
      { name: "Tartufo Bianco", desc: "Black truffle cream, taleggio, wild mushrooms, thyme, no red sauce", price: "$29" },
      { name: "Nino's Classic", desc: "House tomato, mozzarella, nduja, roasted garlic, fresh oregano", price: "$24" },
    ],
  },
  {
    category: "Antipasti",
    items: [
      { name: "Frittura Mista", desc: "Fried zucchini, eggplant, artichoke, lemon aioli", price: "$15" },
      { name: "Prosciutto e Burrata", desc: "24-month prosciutto di Parma, house burrata, fig mostarda", price: "$19" },
      { name: "Zuppa del Giorno", desc: "Ask your server — changes daily with seasonal vegetables", price: "$12" },
    ],
  },
  {
    category: "Dolci",
    items: [
      { name: "Panna Cotta", desc: "Vanilla bean, mixed berry coulis, candied pistachios", price: "$10" },
      { name: "Affogato", desc: "Double espresso over house-made fior di latte gelato", price: "$8" },
    ],
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-800 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-28 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-300">
            Midtown Manhattan · Neapolitan Tradition
          </p>
          <h1 className="font-serif text-5xl font-bold leading-tight md:text-7xl">
            Naples in every bite.<br />New York in every table.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-green-100">
            48-hour fermented dough, a wood-fired oven at 900°F, and ingredients flown in weekly from Campania. Reserve your spot tonight.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/reservations" className="rounded-full bg-white px-8 py-3 text-sm font-bold text-brand-800 shadow hover:bg-green-50 transition">
              Book a Table
            </Link>
            <Link href="#menu" className="rounded-full border border-white/40 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10 transition">
              View Menu
            </Link>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="bg-stone-100 border-y border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[
            { icon: "🔥", label: "Wood-fired oven" },
            { icon: "✈️", label: "Imported ingredients" },
            { icon: "⏳", label: "48-hr fermented dough" },
            { icon: "📅", label: "Reservations welcome" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl">{item.icon}</p>
              <p className="mt-1 text-sm font-medium text-stone-600">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="font-serif text-4xl font-bold text-center mb-12">Our Menu</h2>
        <div className="space-y-12">
          {MENU.map((section) => (
            <div key={section.category}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-700 mb-6 pb-2 border-b border-stone-200">{section.category}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.items.map((item) => (
                  <div key={item.name} className="flex justify-between gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
                    <div>
                      <p className="font-semibold text-stone-900">{item.name}</p>
                      <p className="mt-0.5 text-sm text-stone-500">{item.desc}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-brand-700">{item.price}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-brand-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-green-300 mb-3">Our Philosophy</p>
            <h2 className="font-serif text-4xl font-bold mb-6">Obsessively Neapolitan.<br />Unapologetically New York.</h2>
            <p className="text-green-100 leading-relaxed mb-4">
              Nino Esposito trained at the Associazione Verace Pizza Napoletana before moving to Manhattan in 2003 with a single goal: make a pizza in New York that would pass in Naples.
            </p>
            <p className="text-green-100 leading-relaxed mb-8">
              We import Caputo 00 flour, DOP San Marzano tomatoes, and fior di latte every week. The dough ferments for 48 hours. The oven runs at 900°F. The pizza takes 90 seconds. There are no shortcuts.
            </p>
            <Link href="/reservations" className="rounded-full bg-white px-8 py-3 text-sm font-bold text-brand-800 hover:bg-green-50 transition inline-block">
              Reserve Your Spot
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["🌾 Caputo 00 flour", "🍅 DOP San Marzano", "🧀 Fior di latte", "🔥 90-second bake"].map((f) => (
              <div key={f} className="rounded-xl bg-brand-900/60 p-5 text-sm font-medium">{f}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h2 className="font-serif text-4xl font-bold mb-4">A table worth booking.</h2>
        <p className="text-stone-500 mb-8">Sign in with Google or Facebook and reserve in under a minute. No account needed.</p>
        <Link href="/reservations" className="btn-primary text-base px-10 py-4">Book a Table</Link>
      </section>
    </>
  );
}
