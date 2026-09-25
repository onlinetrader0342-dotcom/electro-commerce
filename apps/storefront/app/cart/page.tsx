"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPKR } from "@/lib/format";
import { useCart } from "@/components/CartProvider";
import QuantitySelector from "@/components/QuantitySelector";

/** Cart page: line items, qty update, remove, totals, proceed to checkout. */
export default function CartPage() {
  const { lines, subtotal, currency, count, setQty, removeItem, clear } = useCart();
  const shippingNote = subtotal >= 5000 || subtotal === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-extrabold text-brand-900">
        Shopping Cart {count > 0 && <span className="text-slate-400">({count})</span>}
      </h1>

      {lines.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-bold text-slate-700">Your cart is empty</p>
          <p className="mt-2 text-sm text-slate-500">
            Browse our inverters, solar panels, LED lights and more.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-xl bg-brand-900 px-8 py-3 text-sm font-bold text-white hover:bg-brand-700"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {lines.map((l) => (
                <li key={l.id} className="flex gap-4 p-4 sm:p-5">
                  <Link
                    href={`/product/${l.handle}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-50"
                  >
                    {l.thumbnail && (
                      <Image src={l.thumbnail} alt={l.title} fill sizes="96px" className="object-cover" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {l.brand && (
                          <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{l.brand}</p>
                        )}
                        <Link href={`/product/${l.handle}`} className="font-semibold text-slate-900 hover:text-brand-700">
                          {l.title}
                        </Link>
                      </div>
                      <button
                        onClick={() => removeItem(l.id)}
                        className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantitySelector value={l.qty} onChange={(v) => setQty(l.id, v)} small />
                      <p className="font-bold text-brand-900">
                        {formatPKR(l.unitPrice * l.qty, l.currency)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={clear}
              className="mt-4 text-sm font-medium text-slate-500 hover:text-red-600 hover:underline"
            >
              Clear cart
            </button>
          </div>

          <aside className="lg:sticky lg:top-40 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-brand-900">Order Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-semibold">{formatPKR(subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Shipping</dt>
                  <dd className="font-semibold">
                    {shippingNote ? "Free" : "Calculated at checkout"}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                  <dt className="font-bold text-brand-900">Total</dt>
                  <dd className="font-extrabold text-brand-900">{formatPKR(subtotal, currency)}</dd>
                </div>
              </dl>
              {!shippingNote && (
                <p className="mt-3 rounded-lg bg-accent-50 p-3 text-xs text-accent-700">
                  Add {formatPKR(5000 - subtotal, currency)} more for free delivery.
                </p>
              )}
              <Link
                href="/checkout"
                className="mt-5 block rounded-xl bg-accent-500 py-3.5 text-center text-sm font-bold text-brand-950 hover:bg-accent-400"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/shop"
                className="mt-2 block rounded-xl border border-slate-300 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Continue Shopping
              </Link>
              <p className="mt-4 text-xs text-slate-400">
                Prices and stock are re-validated on our server at checkout — what you see is final.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
