import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Imran Electric Store — call, WhatsApp or send a message about solar, inverters, LED lights and more.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <h1 className="mt-4 text-3xl font-extrabold text-brand-900">Contact Us</h1>
      <p className="mt-2 text-slate-500">
        Questions about a product, price or delivery? We reply fast.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-brand-900">Send a message</h2>
          <ContactForm />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-brand-950 p-6 text-white">
            <h2 className="text-lg font-bold">Call / WhatsApp</h2>
            <a href="tel:+923175953134" className="mt-2 block text-2xl font-extrabold text-accent-400 hover:underline">
              0317 5953134
            </a>
            <p className="mt-2 text-sm text-slate-300">Mon–Sat, 9am–9pm PKT</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-brand-900">Visit the store</h2>
            <p className="mt-2 text-sm text-slate-500">
              Imran Electric Store — walk in for wholesale rates on solar,
              inverters, batteries and LED lighting.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-brand-900">Bulk / dealer orders</h2>
            <p className="mt-2 text-sm text-slate-500">
              Buying for a project or shop? Mention “bulk order” in your message
              for special dealer pricing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
