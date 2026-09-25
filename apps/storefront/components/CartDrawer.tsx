"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { formatPKR } from "@/lib/format";
import { useCart } from "./CartProvider";
import QuantitySelector from "./QuantitySelector";

/** Slide-over cart drawer, opened from header / AddToCartButton. */
export default function CartDrawer() {
  const { lines, subtotal, currency, count, isCartOpen, closeCart, removeItem, setQty } =
    useCart();

  useEffect(() => {
    document.body.style.overflow = isCartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-brand-900">
            Your Cart {count > 0 && <span className="text-slate-400">({count})</span>}
          </h2>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <svg viewBox="0 0 24 24" className="h-14 w-14 text-slate-200" fill="currentColor" aria-hidden="true">
              <path d="M7 18a2 2 0 102 2 2 2 0 00-2-2zm10 0a2 2 0 102 2 2 2 0 00-2-2zM7.2 14.6l.1-.3 11.2-2.1a1 1 0 00.8-.8l1.2-5.4a1 1 0 00-.8-1.2L6.1 3.6 5.4 2a1 1 0 00-1-.7H2a1 1 0 000 2h1.7l3.6 7.6-1.4 2.6a2 2 0 001.8 3.1H19a1 1 0 000-2H8.4a.3.3 0 01-.3-.4z" />
            </svg>
            <p className="font-semibold text-slate-700">Your cart is empty</p>
            <p className="text-sm text-slate-500">
              Add inverters, solar panels, LED lights and more.
            </p>
            <button
              onClick={closeCart}
              className="mt-2 rounded-xl bg-brand-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.id} className="flex gap-3 py-4">
                  <Link
                    href={`/product/${l.handle}`}
                    onClick={closeCart}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50"
                  >
                    {l.thumbnail ? (
                      <Image src={l.thumbnail} alt={l.title} fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-brand-50" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link
                      href={`/product/${l.handle}`}
                      onClick={closeCart}
                      className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-brand-700"
                    >
                      {l.title}
                    </Link>
                    <p className="mt-0.5 text-sm font-bold text-brand-900">
                      {formatPKR(l.unitPrice, l.currency)}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QuantitySelector small value={l.qty} onChange={(v) => setQty(l.id, v)} />
                      <button
                        onClick={() => removeItem(l.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-200 px-5 py-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm text-slate-500">Subtotal</span>
                <span className="text-lg font-bold text-brand-900">
                  {formatPKR(subtotal, currency)}
                </span>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                Shipping & taxes calculated at checkout.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="flex-1 rounded-xl border border-brand-900 py-3 text-center text-sm font-bold text-brand-900 hover:bg-brand-50"
                >
                  View Cart
                </Link>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="flex-1 rounded-xl bg-accent-500 py-3 text-center text-sm font-bold text-brand-950 hover:bg-accent-400"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
