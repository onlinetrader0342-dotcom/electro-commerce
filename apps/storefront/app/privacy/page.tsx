import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy of Imran Electric Store — how we collect, use and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <h1 className="mt-4 text-3xl font-extrabold text-brand-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: September 2026</p>
      <div className="rich-text mt-6">
        <h2>1. What we collect</h2>
        <p>
          When you shop with us we collect only what an order needs: your name,
          phone number, delivery address, and order details. If you create an
          account, we store your login credentials securely (hashed — we never
          see your password).
        </p>
        <h2>2. What we never collect</h2>
        <p>
          We never store full payment card numbers on our servers. Online
          payments are processed by licensed payment providers; we only receive
          a payment confirmation reference.
        </p>
        <h2>3. How we use your data</h2>
        <ul>
          <li>To process, deliver and support your orders</li>
          <li>To contact you about your order or warranty claims</li>
          <li>To improve our store and product range</li>
        </ul>
        <p>We do not sell your personal data to anyone, ever.</p>
        <h2>4. Cookies</h2>
        <p>
          We use essential cookies to keep your cart and login working, and
          optional analytics cookies to understand store traffic. You can
          disable non-essential cookies in your browser at any time.
        </p>
        <h2>5. Data security</h2>
        <p>
          All traffic is encrypted (HTTPS). Admin and API access is protected
          by authentication, role-based permissions and rate limiting. Prices
          and stock are always validated on our server — never trusted from the
          browser.
        </p>
        <h2>6. Your rights</h2>
        <p>
          You may ask us at any time what data we hold about you, and ask us to
          correct or delete it. Contact us at 0317 5953134 and we will respond
          within 7 days.
        </p>
      </div>
    </div>
  );
}
