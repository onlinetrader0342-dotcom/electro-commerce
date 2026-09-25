"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** /checkout/success — order confirmation. Cart already cleared. */
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-slate-500">Loading…</p>}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const order = searchParams.get("order");

  useEffect(() => {
    // Safety net: the complete step already clears the cart.
    try {
      localStorage.removeItem("ec_cart");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✓
      </div>
      <h1 className="text-3xl font-bold text-brand-900">
        Shukriya! Your order is placed.
      </h1>
      {order && (
        <p className="mt-3 text-slate-600">
          Order reference:{" "}
          <span className="font-mono font-bold text-brand-800">{order}</span>
        </p>
      )}
      <p className="mt-3 text-slate-600">
        We&apos;ll call you to confirm before dispatch. You can track this
        order in your account.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/account/orders"
          className="rounded-lg bg-brand-700 px-6 py-2.5 font-bold text-white hover:bg-brand-600"
        >
          View my orders
        </Link>
        <Link
          href="/shop"
          className="rounded-lg border border-slate-300 px-6 py-2.5 font-semibold text-slate-700"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
