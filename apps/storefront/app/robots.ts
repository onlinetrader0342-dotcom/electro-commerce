import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  const site = absoluteUrl("/");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/account/", "/checkout/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(site).host,
  };
}
