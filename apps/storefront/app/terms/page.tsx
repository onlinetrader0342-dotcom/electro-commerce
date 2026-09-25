import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms & Conditions of Imran Electric Store — orders, pricing, warranty and delivery.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]} />
      <h1 className="mt-4 text-3xl font-extrabold text-brand-900">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: September 2026</p>
      <div className="rich-text mt-6">
        <h2>1. Orders & pricing</h2>
        <p>
          All prices are in Pakistani Rupees (PKR) and include applicable
          taxes unless stated otherwise. Prices and stock shown on the site are
          re-validated on our server when you place an order — in the rare case
          of a price error or stock mismatch, we will contact you before
          dispatching and you may cancel for a full refund.
        </p>
        <h2>2. Payment</h2>
        <p>
          We accept Cash on Delivery (COD) and online payments through our
          licensed payment partners. Online payments are confirmed before
          dispatch.
        </p>
        <h2>3. Delivery</h2>
        <ul>
          <li>Orders are dispatched within 1–2 working days.</li>
          <li>Delivery across Pakistan typically takes 2–5 working days.</li>
          <li>Delivery is free on orders over Rs 5,000; a flat fee applies below that.</li>
          <li>Heavy items (solar panels, batteries, inverters) may ship via cargo — we will coordinate with you.</li>
        </ul>
        <h2>4. Warranty</h2>
        <p>
          Every product carries the brand&apos;s official warranty as stated on
          its product page. Warranty covers manufacturing defects under normal
          use; it does not cover physical damage, incorrect installation, or
          use outside the rated specifications. Keep your order number — it is
          your warranty proof.
        </p>
        <h2>5. Returns</h2>
        <p>
          Unused products in original packaging may be returned within 7 days
          of delivery for a refund or exchange. Electrical items that have been
          installed or wired cannot be returned unless faulty.
        </p>
        <h2>6. Fair use</h2>
        <p>
          Product images, descriptions and prices on this site belong to Imran
          Electric Store. Automated scraping for resale listings without
          permission is not allowed; our product feed and AI APIs are the
          supported channels for programmatic access.
        </p>
        <h2>7. Contact</h2>
        <p>
          Questions about these terms? Call or WhatsApp 0317 5953134
          (Mon–Sat, 9am–9pm PKT).
        </p>
      </div>
    </div>
  );
}
