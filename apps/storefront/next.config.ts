import type { NextConfig } from "next";

/**
 * Storefront Next.js config.
 *
 * Images: product images come from the Medusa backend (or its S3/CDN) and
 * local /public placeholders. Add any extra CDN hostnames below as needed.
 * Env passthrough: NEXT_PUBLIC_* vars are inlined at build time by Next.js
 * automatically; server-only vars (MEDUSA_BACKEND_URL, MEDUSA_REGION_ID)
 * are read at runtime in lib/medusa.ts — no extra config needed.
 */
const medusaHost = (() => {
  try {
    return process.env.MEDUSA_BACKEND_URL
      ? new URL(process.env.MEDUSA_BACKEND_URL).hostname
      : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(medusaHost
        ? [{ protocol: "https" as const, hostname: medusaHost }]
        : []),
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
