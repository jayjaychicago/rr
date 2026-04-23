import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gino's Pizza – Authentic New York Pizza",
};

const MENU = [
  {
    category: "Signature Pies",
    items: [
      { name: "The Original Margherita", desc: "San Marzano tomato, fior di latte, fresh basil, olive oil", price: "$22" },
      { name: "Gino's Special", desc: "Fennel sausage, roasted peppers, caramelized onion, smoked mozzarella", price: "$26" },
      { name: "Vodka Ricotta", desc: "House vodka sauce, whipped ricotta, pancetta, pecorino", price: "$24" },
      { name: "White Clam", desc: "Littleneck clams, garlic, olive oil, fresh parsley, no red sauce", price: "$27" },
    ],
  },
  {
    category: "Starters",
    items: [
      { name: "Arancini (3)", desc: "Risotto balls, smoked mozzarella center, pomodoro dipping sauce", price: "$14" },
      { name: "Burrata", desc: "Heirloom tomatoes, basil oil, aged balsamic, grilled bread", price: "$18" },
      { name: "Caesar Salad", desc: "Romaine, house-made Caesar, parmigiano, anchovy, garlic croutons", price: "$14" },
    ],
  },
  {
    category: "Desserts",
    items: [
      { name: "Cannoli", desc: "House-made shells, sweetened ricotta, pistachios, mini chocolate chips", price: "$9" },
      { name: "Tiramisu", desc: "Espresso-soaked ladyfingers, mascarpone cream, cocoa", price: "$10" },
    ],
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-700 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)`,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-28 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-red-200">
            New York City · Since 1987
          </p>
          <h1 className="font-serif text-5xl font-bold leading-tight md:text-7xl">
            Pizza the way<br />it was meant to be.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-red-100">
            Coal-fired, hand-tossed, and made with recipes that haven&apos;t changed in 35 years. Reserve your table tonight.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/reservations" className="rounded-full bg-white px-8 py-3 text-sm font-bold text-brand-700 shadow hover:bg-red-50 transition">
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
            { icon: "🔥", label: "Coal-fired oven" },
            { icon: "🌿", label: "Fresh ingredients daily" },
            { icon: "🍷", label: "Italian wine list" },
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-brand-700 mb-6 pb-2 border-b border-stone-200">
                {section.category}
              </h3>
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
      <section id="about" className="bg-brand-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-red-200 mb-3">Our Story</p>
            <h2 className="font-serif text-4xl font-bold mb-6">A family tradition,<br />served by the slice.</h2>
            <p className="text-red-100 leading-relaxed mb-4">
              Gino Calabrese opened his first pizzeria on Bleecker Street with a single coal-fired oven, a handful of family recipes, and an obsession with quality that bordered on the unreasonable.
            </p>
            <p className="text-red-100 leading-relaxed mb-8">
              Nearly four decades later, nothing has changed — except the lines. We still import San Marzano tomatoes from the same farm in Campania, still hand-stretch every dough, and still refuse to put pineapple on anything.
            </p>
            <Link href="/reservations" className="rounded-full bg-white px-8 py-3 text-sm font-bold text-brand-700 hover:bg-red-50 transition inline-block">
              Reserve Your Spot
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {["🫙 House-made sauce", "🌾 00-flour dough", "🧀 Imported cheeses", "🔥 900°F coal oven"].map((f) => (
              <div key={f} className="rounded-xl bg-brand-800/60 p-5 text-sm font-medium">{f}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h2 className="font-serif text-4xl font-bold mb-4">Ready for the best slice of your life?</h2>
        <p className="text-stone-500 mb-8">Reserve online in 60 seconds. Sign in with Google or Facebook — no account needed.</p>
        <Link href="/reservations" className="btn-primary text-base px-10 py-4">
          Book a Table
        </Link>
      </section>
    </>
  );
}
