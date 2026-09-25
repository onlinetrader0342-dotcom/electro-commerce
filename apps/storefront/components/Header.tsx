import Link from "next/link";
import { listCategories } from "@/lib/medusa";
import CartButton from "./CartButton";
import CategoryNav from "./CategoryNav";
import MobileMenu from "./MobileMenu";
import SearchBar from "./SearchBar";

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Imran Electric Store — home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-accent-400" aria-hidden="true">
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight text-brand-900">
          Imran Electric
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-widest text-accent-600">
          Store · Solar & Power
        </span>
      </span>
    </Link>
  );
}

/** Site header: top strip, logo + search + cart, category nav. */
export default async function Header() {
  const categories = await listCategories();

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top strip */}
      <div className="bg-brand-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
          <p className="min-w-0 flex-1 truncate">
            Free delivery on orders over Rs 5,000 · Genuine products with warranty
          </p>
          <a href="tel:+923175953134" className="hidden shrink-0 font-semibold hover:underline sm:block">
            0317 5953134
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <MobileMenu categories={categories} />
        <Logo />
        <div className="hidden flex-1 px-4 md:block">
          <SearchBar />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/account"
            className="hidden rounded-full p-2.5 text-brand-900 hover:bg-brand-50 sm:block"
            aria-label="My account"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" strokeLinecap="round" />
            </svg>
          </Link>
          <CartButton />
        </div>
      </div>

      {/* Mobile search */}
      <div className="px-4 pb-3 md:hidden">
        <SearchBar />
      </div>

      {/* Desktop nav */}
      <nav aria-label="Primary" className="hidden border-t border-slate-100 lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2.5 text-sm font-semibold">
          <Link href="/" className="text-slate-700 hover:text-brand-700">Home</Link>
          <Link href="/shop" className="text-slate-700 hover:text-brand-700">Shop All</Link>
          {categories.slice(0, 5).map((c) => (
            <Link key={c.id} href={`/category/${c.handle}`} className="text-slate-700 hover:text-brand-700">
              {c.name}
            </Link>
          ))}
          <Link href="/blog" className="text-slate-700 hover:text-brand-700">Blog</Link>
          <Link href="/contact" className="ml-auto text-slate-700 hover:text-brand-700">Contact</Link>
        </div>
      </nav>

      {/* Mobile category rail */}
      <div className="border-t border-slate-100 px-4 pb-2 lg:hidden">
        <CategoryNav categories={categories} />
      </div>
    </header>
  );
}
