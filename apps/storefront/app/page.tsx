import Link from "next/link";
import CategoryNav from "@/components/CategoryNav";
import ProductCard from "@/components/ProductCard";
import { listCategories, listProducts } from "@/lib/medusa";

export const revalidate = 3600;

const BLOG_TEASERS = [
  {
    slug: "5kw-inverter-kya-hota-hai",
    title: "5kW Inverter Kya Hota Hai? Poori Maloomat",
    excerpt:
      "5kW inverter kitna load chala sakta hai, solar ke saath kaise kaam karta hai, aur kharidne se pehle kya dekhna chahiye.",
  },
  {
    slug: "solar-panel-choose-karne-ka-tareeqa",
    title: "Solar Panel Choose Karne Ka Tareeqa",
    excerpt:
      "Mono vs poly, wattage, efficiency aur warranty — sahi solar panel chunne ke 7 usool.",
  },
  {
    slug: "inverter-aur-ups-mein-farq",
    title: "Inverter Aur UPS Mein Farq",
    excerpt:
      "Dono backup dete hain, lekin kaam alag hai. Jaaniye aap ke ghar ke liye kaunsa behtar hai.",
  },
];

const TRUST_BADGES = [
  { title: "Genuine Products", text: "100% original brands", icon: "M9 12l2 2 4-4m5.6 2.6A9 9 0 1112 3a9 9 0 018.6 9.6z" },
  { title: "Official Warranty", text: "Brand warranty on everything", icon: "M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" },
  { title: "Fast Delivery", text: "Across Pakistan", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm11 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" },
  { title: "Secure Payment", text: "COD & online options", icon: "M4 7h16v10H4zM4 10h16M8 15h4" },
];

export default async function HomePage() {
  const [categories, bestSellers, featured] = await Promise.all([
    listCategories(),
    listProducts({ pageSize: 8 }),
    listProducts({ pageSize: 4 }),
  ]);
  const sellers = bestSellers.products.filter((p) => p.isBestSeller).slice(0, 8);
  const featuredProducts = featured.products.filter((p) => p.isFeatured).slice(0, 4);
  const brands = [...new Set(bestSellers.products.map((p) => p.brand).filter(Boolean))] as string[];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 inline-block rounded-full bg-accent-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent-300">
              Solar · Inverters · LED · Fans
            </p>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
              Power Your Home with{" "}
              <span className="text-accent-400">Genuine</span> Electric Products
            </h1>
            <p className="mt-4 max-w-lg text-slate-300">
              Solar panels, hybrid inverters, batteries, LED lights and fans —
              original brands, official warranty, and Pakistan&apos;s best prices,
              delivered to your doorstep.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-xl bg-accent-500 px-7 py-3.5 text-sm font-bold text-brand-950 hover:bg-accent-400"
              >
                Shop Now
              </Link>
              <Link
                href="/category/solar-panels"
                className="rounded-xl border border-white/30 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10"
              >
                Solar Deals
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {featuredProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.handle}`}
                  className="rounded-2xl bg-white/10 p-4 backdrop-blur transition-colors hover:bg-white/15"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">
                    {p.brand}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold">{p.title}</p>
                  <p className="mt-2 text-accent-400 font-bold">
                    Rs {(p.salePrice ?? p.price).toLocaleString("en-PK")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-6">
          <CategoryNav categories={categories} />
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 lg:grid-cols-4">
          {TRUST_BADGES.map((b) => (
            <div key={b.title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-brand-700" fill="none" strokeWidth="1.8" aria-hidden="true">
                  <path d={b.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-brand-900">{b.title}</p>
                <p className="text-xs text-slate-500">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold text-brand-900">Shop by Category</h2>
          <Link href="/shop" className="text-sm font-semibold text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.handle}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-900 transition-colors group-hover:bg-accent-500">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white group-hover:fill-brand-950" aria-hidden="true">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
              </span>
              <h3 className="mt-3 font-bold text-brand-900">{c.name}</h3>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      {sellers.length > 0 && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-extrabold text-brand-900">Best Sellers</h2>
              <Link href="/shop" className="text-sm font-semibold text-brand-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {sellers.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Promo banners */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/category/inverters"
            className="rounded-2xl bg-gradient-to-r from-brand-900 to-brand-700 p-8 text-white transition-transform hover:scale-[1.01]"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-accent-300">Solar Season Sale</p>
            <h3 className="mt-2 text-2xl font-extrabold">Up to 10% off Hybrid Inverters</h3>
            <p className="mt-2 text-sm text-slate-300">5kW systems with WiFi monitoring & 2-year warranty.</p>
            <span className="mt-4 inline-block rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-bold text-brand-950">
              Shop Inverters
            </span>
          </Link>
          <Link
            href="/category/led-lights"
            className="rounded-2xl bg-gradient-to-r from-accent-600 to-accent-500 p-8 text-brand-950 transition-transform hover:scale-[1.01]"
          >
            <p className="text-xs font-bold uppercase tracking-widest">Energy Saving</p>
            <h3 className="mt-2 text-2xl font-extrabold">LED Lights from Rs 450</h3>
            <p className="mt-2 text-sm text-brand-950/70">Bulbs, flood lights & panels with 1-year warranty.</p>
            <span className="mt-4 inline-block rounded-xl bg-brand-950 px-5 py-2.5 text-sm font-bold text-white">
              Shop LED Lights
            </span>
          </Link>
        </div>
      </section>

      {/* Brand strip */}
      {brands.length > 0 && (
        <section className="border-y border-slate-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
              Brands we carry
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {brands.map((b) => (
                <span key={b} className="text-lg font-extrabold tracking-wide text-slate-400">
                  {b}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog teasers (placeholder — full blog by agent C) */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold text-brand-900">From the Blog</h2>
          <Link href="/blog" className="text-sm font-semibold text-brand-600 hover:underline">
            All articles →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {BLOG_TEASERS.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-lg"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-accent-600">Guide</p>
              <h3 className="mt-2 text-lg font-bold text-brand-900">{a.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-slate-500">{a.excerpt}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-600">
                Read more →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
