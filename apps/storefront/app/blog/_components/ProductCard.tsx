import Link from "next/link";
import { getAiProductById } from "@/lib/ai-api";
import { formatPKR } from "@/lib/format";

/**
 * Product card for the blog "Recommended products" section.
 * Product data is resolved LIVE from the commerce layer at render time —
 * nothing is copied into the post. Returns null when the product no longer
 * exists, so stale links simply disappear instead of showing wrong data.
 */
export async function RecommendedProductCard({
  productId,
}: {
  productId: string;
}) {
  const p = await getAiProductById(productId);
  if (!p) return null;

  return (
    <div className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {p.image ? (
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-2xl">
          🔌
        </div>
      )}
      <div className="min-w-0 flex-1">
        {p.brand && (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {p.brand}
            {p.model ? ` · ${p.model}` : ""}
          </p>
        )}
        <Link
          href={p.url}
          className="block truncate font-semibold text-brand-900 hover:text-brand-600"
        >
          {p.name}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-bold text-brand-800">
            {formatPKR(p.salePrice ?? p.price, p.currency)}
          </span>
          {p.salePrice !== null && (
            <span className="text-sm text-slate-400 line-through">
              {formatPKR(p.price, p.currency)}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span
            className={`text-xs font-medium ${
              p.availability === "in_stock"
                ? "text-green-700"
                : "text-amber-700"
            }`}
          >
            {p.availability === "in_stock" ? "● In stock" : "● Check availability"}
          </span>
          <Link
            href={p.url}
            className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-bold text-brand-950 hover:bg-accent-400"
          >
            View product
          </Link>
        </div>
      </div>
    </div>
  );
}
