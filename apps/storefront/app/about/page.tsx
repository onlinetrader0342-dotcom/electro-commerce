import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "About Imran Electric Store — trusted seller of solar, inverters, batteries, LED lights, fans and switches in Pakistan.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About Us" }]} />
      <h1 className="mt-4 text-3xl font-extrabold text-brand-900">About Imran Electric Store</h1>
      <div className="rich-text mt-6">
        <p>
          Imran Electric Store started as a neighbourhood electrical shop with a
          simple promise: <strong>genuine products at fair prices</strong>. Today
          we serve customers across Pakistan online — from solar panels and
          hybrid inverters to LED lighting, fans and switches.
        </p>
        <h2>What we sell</h2>
        <ul>
          <li>Solar panels (180W–550W), hybrid & UPS inverters, solar batteries</li>
          <li>LED bulbs, flood lights, panel lights and street lights</li>
          <li>Ceiling fans, pedestal fans and exhaust fans</li>
          <li>Modular switches, sockets and electrical accessories</li>
        </ul>
        <h2>Why buy from us</h2>
        <ul>
          <li><strong>100% genuine</strong> — every product is original, with official brand warranty.</li>
          <li><strong>Honest pricing</strong> — no fake “discounts”; prices are validated on our server at checkout.</li>
          <li><strong>Real advice</strong> — we size solar systems and backup setups for your actual load, not our commission.</li>
          <li><strong>After-sales support</strong> — warranty claims handled by us, not passed to you.</li>
        </ul>
        <h2>Our promise</h2>
        <p>
          If a product fails within its warranty period under normal use, we
          repair or replace it — no long stories. That is the imandari wali
          baat our customers know us for.
        </p>
      </div>
    </div>
  );
}
