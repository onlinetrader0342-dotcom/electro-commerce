import Image from "next/image";
import Link from "next/link";
import { discountPercent } from "@/lib/format";
import type { StoreProduct } from "@/lib/medusa";
import Price from "./Price";

function Stars({ rating }: { rating?: number }) {
  const value = rating ?? 0;
  return (
    <span className="flex items-center gap-0.5" aria-label={rating ? `Rated ${rating} out of 5` : "No ratings yet"}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 ${i <= Math.round(value) ? "fill-accent-500" : "fill-slate-200"}`}
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9 4.7 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

/** Product card for grids: image, brand, name, price/sale, stock badge, rating. */
export default function ProductCard({ product }: { product: StoreProduct }) {
  const href = `/product/${product.handle}`;
  const off = discountPercent(product.price, product.salePrice);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-slate-50">
        {product.thumbnail ? (
          <Image
            src={product.thumbnail}
            alt={product.images[0]?.alt ?? product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-50 text-brand-300">
            <svg viewBox="0 0 24 24" className="h-12 w-12" fill="currentColor" aria-hidden="true">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {off !== null && (
            <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              -{off}%
            </span>
          )}
          {!product.inStock && (
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {product.brand && (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            {product.brand}
          </p>
        )}
        <Link href={href}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-brand-700 sm:text-base">
            {product.title}
          </h3>
        </Link>
        <div className="flex items-center gap-1.5">
          <Stars rating={product.rating} />
          {typeof product.reviewCount === "number" && product.reviewCount > 0 && (
            <span className="text-xs text-slate-400">({product.reviewCount})</span>
          )}
        </div>
        <div className="mt-auto pt-1">
          <Price price={product.price} salePrice={product.salePrice} currency={product.currency} size="sm" />
          <p className={`mt-1 text-xs font-medium ${product.inStock ? "text-green-600" : "text-red-600"}`}>
            {product.inStock ? "In stock" : "Out of stock"}
          </p>
        </div>
      </div>
    </article>
  );
}
