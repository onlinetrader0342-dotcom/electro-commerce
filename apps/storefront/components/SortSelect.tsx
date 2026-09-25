"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductSort } from "@/lib/medusa";

const OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A–Z" },
];

/** Sort dropdown — updates ?sort=, resets ?page=1. */
export default function SortSelect({ value }: { value: ProductSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-slate-500 sm:inline">Sort by</span>
      <select
        value={value}
        aria-label="Sort products"
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          const v = e.target.value as ProductSort;
          if (v === "relevance") params.delete("sort");
          else params.set("sort", v);
          params.delete("page");
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
