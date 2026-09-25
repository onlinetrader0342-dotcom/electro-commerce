import Link from "next/link";
import { listCategories } from "@/lib/medusa";

/** Site footer: shop links, company links, contact info, legal bar. */
export default async function Footer() {
  const categories = await listCategories();

  return (
    <footer className="bg-brand-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-accent-400" aria-hidden="true">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
            </span>
            <span className="text-lg font-extrabold text-white">Imran Electric Store</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Pakistan&apos;s trusted shop for solar, inverters, batteries, LED
            lights, fans and switches — genuine products, official warranty,
            fair prices.
          </p>
        </div>

        <nav aria-label="Shop">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            Shop
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/shop" className="hover:text-accent-400">All Products</Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.handle}`} className="hover:text-accent-400">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            Company
          </h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-accent-400">About Us</Link></li>
            <li><Link href="/blog" className="hover:text-accent-400">Blog</Link></li>
            <li><Link href="/contact" className="hover:text-accent-400">Contact</Link></li>
            <li><Link href="/privacy" className="hover:text-accent-400">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-accent-400">Terms &amp; Conditions</Link></li>
          </ul>
        </nav>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            Contact
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-400">
            <li>
              <a href="tel:+923175953134" className="hover:text-accent-400">
                0317 5953134
              </a>
            </li>
            <li>Mon–Sat, 9am–9pm PKT</li>
            <li>Cash on Delivery available</li>
            <li>All prices in Pakistani Rupees (PKR)</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Imran Electric Store. All rights reserved.</p>
          <p>Secure checkout · Server-validated prices &amp; stock</p>
        </div>
      </div>
    </footer>
  );
}
