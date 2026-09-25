"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  MEDUSA_CART_ID_KEY,
  type CartLine,
} from "@/lib/cart";

/**
 * /checkout — shipping form + method/payment select, then server-validated
 * order placement.
 *
 * CART CONTRACT (owned by agent B — lib/cart.ts):
 *   localStorage key "electro-cart-v1" holds JSON CartLine[]:
 *   [{ id, productId, handle, title, thumbnail?, brand?, unitPrice, currency, qty }]
 *   The mirrored Medusa store-cart id lives under "electro-medusa-cart-id".
 * Prices are NEVER read from the cart — the server re-prices everything.
 * Qty edits here write back to the same key and dispatch
 * "electro:cart-updated" so the header cart badge stays in sync.
 */

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  priceFormatted: string;
  currency: string;
  etaDays: [number, number];
}

// Source of truth: lib/payments.ts (enabled methods). Kept in sync manually
// for the client; the server re-validates the selected id.
const PAYMENT_METHODS = [
  {
    id: "cod",
    name: "Cash on Delivery",
    description: "Pay in cash when your order arrives.",
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    description: "Transfer to our bank account after ordering.",
  },
];

interface SummaryLine {
  productId: string;
  variantId: string;
  title: string;
  image: string | null;
  unitPriceFormatted: string;
  quantity: number;
  lineTotalFormatted: string;
}

interface Summary {
  lines: SummaryLine[];
  subtotalFormatted: string;
  shippingFormatted: string;
  shippingMethod: { id: string; name: string };
  paymentMethod: { id: string; name: string };
  totalFormatted: string;
  currency: string;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500";
const labelCls = "mb-1 block text-sm font-semibold text-slate-700";

const EMPTY_ADDRESS = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Pakistan",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState("standard");
  const [paymentMethodId, setPaymentMethodId] = useState("cod");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<"form" | "validating" | "review">("form");
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
      setItems(
        Array.isArray(parsed)
          ? parsed.filter((l) => l && l.productId && l.qty > 0)
          : [],
      );
    } catch {
      setItems([]);
    }
    setLoaded(true);
    fetch("/api/checkout/shipping-methods")
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.methods) && j.methods.length) {
          setMethods(j.methods);
          setShippingMethodId(j.methods[0].id);
        }
      })
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof EMPTY_ADDRESS>(k: K, v: string) {
    setAddress((a) => ({ ...a, [k]: v }));
  }

  function payload() {
    return {
      // Server resolves each productId to its default Medusa variant and
      // re-fetches live price + stock — cart snapshots are ignored.
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.qty,
      })),
      address,
      shippingMethodId,
      paymentMethodId,
      notes: notes || undefined,
    };
  }

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    setPhase("validating");
    try {
      const res = await fetch("/api/checkout/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        setErrors(json.errors ?? ["Validation failed."]);
        setPhase("form");
        return;
      }
      setSummary(json.summary as Summary);
      setPhase("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors(["Could not validate the order. Check your connection."]);
      setPhase("form");
    }
  }

  async function handlePlaceOrder() {
    setErrors([]);
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrors(json.errors ?? ["Order could not be placed."]);
        setPlacing(false);
        return;
      }
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(MEDUSA_CART_ID_KEY);
      window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
      router.push(
        `/checkout/success?order=${encodeURIComponent(json.displayId ?? json.orderId)}`,
      );
    } catch {
      setErrors(["Could not place the order. Check your connection."]);
      setPlacing(false);
    }
  }

  function updateQty(index: number, qty: number) {
    setItems((prev) => {
      const next = [...prev];
      if (qty <= 0) next.splice(index, 1);
      else next[index] = { ...next[index], qty: Math.min(99, qty) };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
      return next;
    });
  }

  if (!loaded) return <p className="p-10 text-center text-slate-500">Loading…</p>;

  if (items.length === 0 && phase === "form") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-brand-900">Your cart is empty</h1>
        <p className="mt-2 text-slate-600">
          Add some products before checking out.
        </p>
        <a
          href="/shop"
          className="mt-6 inline-block rounded-lg bg-accent-500 px-6 py-2.5 font-bold text-brand-950"
        >
          Continue shopping
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-brand-900">Checkout</h1>

      {errors.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4">
          <p className="mb-1 font-bold text-red-800">Please fix the following:</p>
          <ul className="list-disc pl-5 text-sm text-red-700">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {phase === "review" && summary ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-brand-900">Review your order</h2>
          <ul className="mb-4 divide-y divide-slate-100">
            {summary.lines.map((l) => (
              <li key={l.variantId} className="flex items-center gap-4 py-3">
                {l.image ? (
                  <img
                    src={l.image}
                    alt={l.title}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-xl">
                    🔌
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-brand-900">{l.title}</p>
                  <p className="text-sm text-slate-500">
                    {l.quantity} × {l.unitPriceFormatted}
                  </p>
                </div>
                <p className="font-bold">{l.lineTotalFormatted}</p>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Subtotal</dt>
              <dd className="font-semibold">{summary.subtotalFormatted}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">
                Shipping ({summary.shippingMethod.name})
              </dt>
              <dd className="font-semibold">{summary.shippingFormatted}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Payment</dt>
              <dd className="font-semibold">{summary.paymentMethod.name}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg">
              <dt className="font-bold text-brand-900">Total</dt>
              <dd className="font-bold text-brand-900">{summary.totalFormatted}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Prices and stock were verified live with the store just now.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={handlePlaceOrder}
              disabled={placing}
              className="rounded-lg bg-accent-500 px-8 py-3 font-bold text-brand-950 hover:bg-accent-400 disabled:opacity-50"
            >
              {placing ? "Placing order…" : "Place order"}
            </button>
            <button
              onClick={() => setPhase("form")}
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700"
            >
              Back
            </button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleValidate}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-brand-900">
                  Shipping details
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className={labelCls}>First name *</label>
                    <input id="firstName" required value={address.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelCls}>Last name *</label>
                    <input id="lastName" required value={address.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelCls}>Phone *</label>
                    <input id="phone" required value={address.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03xx xxxxxxx" className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="email" className={labelCls}>Email (optional)</label>
                    <input id="email" type="email" value={address.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address1" className={labelCls}>Address *</label>
                    <input id="address1" required value={address.address1} onChange={(e) => set("address1", e.target.value)} className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="address2" className={labelCls}>Address line 2 (optional)</label>
                    <input id="address2" value={address.address2} onChange={(e) => set("address2", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="city" className={labelCls}>City *</label>
                    <input id="city" required value={address.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="province" className={labelCls}>Province *</label>
                    <input id="province" required value={address.province} onChange={(e) => set("province", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className={labelCls}>Postal code (optional)</label>
                    <input id="postalCode" value={address.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="notes" className={labelCls}>Order notes (optional)</label>
                    <input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-brand-900">Shipping method</h2>
                <div className="space-y-2">
                  {methods.map((m) => (
                    <label
                      key={m.id}
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 ${
                        shippingMethodId === m.id
                          ? "border-brand-600 bg-brand-50"
                          : "border-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={shippingMethodId === m.id}
                          onChange={() => setShippingMethodId(m.id)}
                        />
                        <span>
                          <span className="block font-semibold text-brand-900">{m.name}</span>
                          <span className="block text-xs text-slate-500">{m.description}</span>
                        </span>
                      </span>
                      <span className="font-bold">{m.priceFormatted}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-brand-900">Payment method</h2>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((p) => (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                        paymentMethodId === p.id
                          ? "border-brand-600 bg-brand-50"
                          : "border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethodId === p.id}
                        onChange={() => setPaymentMethodId(p.id)}
                      />
                      <span>
                        <span className="block font-semibold text-brand-900">{p.name}</span>
                        <span className="block text-xs text-slate-500">{p.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-4">
              <h2 className="mb-4 text-lg font-bold text-brand-900">
                Cart ({items.reduce((s, i) => s + i.qty, 0)})
              </h2>
              <ul className="mb-4 space-y-3">
                {items.map((item, idx) => (
                  <li key={item.id || `${item.productId}-${idx}`} className="flex items-center gap-3">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title ?? "Product"} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-lg">🔌</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-900">{item.title ?? "Product"}</p>
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label="Decrease quantity" onClick={() => updateQty(idx, item.qty - 1)} className="rounded border border-slate-300 px-2 text-sm">−</button>
                        <span className="text-sm">{item.qty}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => updateQty(idx, item.qty + 1)} className="rounded border border-slate-300 px-2 text-sm">+</button>
                      </div>
                    </div>
                    <button type="button" onClick={() => updateQty(idx, 0)} className="text-xs font-semibold text-red-600 hover:underline">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                disabled={phase === "validating"}
                className="w-full rounded-lg bg-accent-500 py-3 font-bold text-brand-950 hover:bg-accent-400 disabled:opacity-50"
              >
                {phase === "validating" ? "Verifying prices & stock…" : "Continue to review"}
              </button>
              <p className="mt-3 text-xs text-slate-500">
                Final prices are verified with the store before you pay — the
                cart never decides the price.
              </p>
            </aside>
          </div>
        </form>
      )}
    </main>
  );
}
