import { discountPercent, formatPKR } from "@/lib/format";

interface PriceProps {
  price: number;
  salePrice?: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

/** Product price block: sale price emphasized, original struck through. */
export default function Price({
  price,
  salePrice,
  currency = "PKR",
  size = "md",
  showBadge = true,
}: PriceProps) {
  const effective = salePrice ?? price;
  const off = discountPercent(price, salePrice);
  const sizeCls =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
        ? "text-base"
        : "text-xl";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`${sizeCls} font-bold text-brand-900`}>
        {formatPKR(effective, currency)}
      </span>
      {salePrice && salePrice < price && (
        <span className="text-sm text-slate-400 line-through">
          {formatPKR(price, currency)}
        </span>
      )}
      {showBadge && off !== null && (
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
          -{off}%
        </span>
      )}
    </div>
  );
}
