"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoreCategory } from "@/lib/medusa";

const STATIC_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Mobile hamburger menu: slide-over with nav links + categories. */
export default function MobileMenu({ categories }: { categories: StoreCategory[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open ]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-full p-2.5 text-brand-900 hover:bg-brand-50 lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <span className="text-lg font-bold text-brand-900">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-1">
                {STATIC_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-3 py-2.5 font-semibold text-slate-800 hover:bg-brand-50 hover:text-brand-800"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {categories.length > 0 && (
                <>
                  <p className="mb-2 mt-6 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Categories
                  </p>
                  <ul className="space-y-1">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/category/${c.handle}`}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg px-3 py-2.5 text-slate-700 hover:bg-brand-50 hover:text-brand-800"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
