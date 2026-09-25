"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Product filters (client). Updates URLSearchParams (?brand=, ?minPrice=,
 * ?maxPrice=, ?inStock=) and resets ?page=1. Server pages re-fetch via
 * lib/medusa.ts. Brands/bounds come from props — never hard-coded.
 */
export default function Filters({
  brands,
  bounds,
  initial,
}: {
  brands: string[];
  bounds: { min: number; max: number };
  initial: {
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [min, setMin] = useState(initial.minPrice?.toString() ?? "");
  const [max, setMax] = useState(initial.maxPrice?.toString() ?? "");

  const update = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const toggleBrand = (brand: string, on: boolean) => {
    update((p) => {
      if (on) p.set("brand", brand);
      else p.delete("brand");
    });
  };

  const applyPrice = () => {
    update((p) => {
      if (min.trim()) p.set("minPrice", min.trim());
      else p.delete("minPrice");
      if (max.trim()) p.set("maxPrice", max.trim());
      else p.delete("maxPrice");
    });
  };

  const toggleStock = (on: boolean) => {
    update((p) => {
      if (on) p.set("inStock", "1");
      else p.delete("inStock");
    });
  };

  const clearAll = () => {
    setMin("");
    setMax("");
    const params = new URLSearchParams(searchParams.toString());
    for (const k of ["brand", "minPrice", "maxPrice", "inStock", "page"]) {
      params.delete(k);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const hasActive =
    initial.brand || initial.minPrice !== undefined || initial.maxPrice !== undefined || initial.inStock;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-900">
          Filters
        </h2>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {brands.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Brand</legend>
          <ul className="space-y-1.5">
            {brands.map((b) => (
              <li key={b}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={initial.brand === b}
                    onChange={(e) => toggleBrand(b, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-700"
                  />
                  {b}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">
          Price (Rs)
        </legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={String(bounds.min)}
            aria-label="Minimum price"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min={0}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={String(bounds.max)}
            aria-label="Maximum price"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={applyPrice}
          className="mt-2 w-full rounded-lg bg-brand-900 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Apply
        </button>
      </fieldset>

      <fieldset>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <input
            type="checkbox"
            checked={Boolean(initial.inStock)}
            onChange={(e) => toggleStock(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-brand-700"
          />
          In stock only
        </label>
      </fieldset>
    </div>
  );
}
