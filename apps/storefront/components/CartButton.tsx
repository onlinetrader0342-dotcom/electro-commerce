"use client";

import { useCart } from "./CartProvider";

/** Header cart button with item-count badge; opens the cart drawer. */
export default function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button
      onClick={openCart}
      aria-label={`Open cart, ${count} items`}
      className="relative rounded-full p-2.5 text-brand-900 hover:bg-brand-50"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 3h2l2.4 12.4a1 1 0 001 .6h8.9a1 1 0 001-.8L20.5 7H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="20.5" r="1.4" fill="currentColor" stroke="none" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-brand-950">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
