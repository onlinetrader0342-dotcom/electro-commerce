/**
 * Small formatting helpers shared across server and client components.
 */

/** Format a major-unit amount as PKR, e.g. 145000 -> "Rs 145,000" */
export function formatPKR(amount: number, currency = "PKR"): string {
  const rounded = Math.round(amount);
  const grouped = rounded.toLocaleString("en-PK");
  return currency === "PKR" ? `Rs ${grouped}` : `${currency} ${grouped}`;
}

/** Discount percentage between price and sale price, e.g. 15 */
export function discountPercent(
  price: number,
  salePrice?: number,
): number | null {
  if (!salePrice || salePrice >= price || price <= 0) return null;
  return Math.round(((price - salePrice) / price) * 100);
}

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.imranelectricstore.pk"
  ).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
