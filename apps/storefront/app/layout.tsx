import type { Metadata, Viewport } from "next";
import CartDrawer from "@/components/CartDrawer";
import CartProvider from "@/components/CartProvider";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/format";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.imranelectricstore.pk",
  ),
  title: {
    default: "Imran Electric Store — Solar, Inverters, LED Lights & More",
    template: "%s | Imran Electric Store",
  },
  description:
    "Buy solar panels, hybrid inverters, batteries, LED lights, fans and switches online in Pakistan. Genuine products, official warranty, best prices.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    siteName: "Imran Electric Store",
    title: "Imran Electric Store — Solar, Inverters, LED Lights & More",
    description:
      "Buy solar panels, hybrid inverters, batteries, LED lights, fans and switches online in Pakistan.",
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Imran Electric Store",
    description:
      "Solar, inverters, batteries, LED lights, fans & switches — online in Pakistan.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={webSiteJsonLd()} />
        <CartProvider>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
