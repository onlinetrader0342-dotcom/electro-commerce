import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Filters from "@/components/Filters";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import SortSelect from "@/components/SortSelect";
import {
  listBrands,
  priceBounds,
  searchProducts,
  type ProductSort,
} from "@/lib/medusa";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Search Products",
  description: "Search inverters, solar panels, batteries, LED lights, fans and switches.",
};

const VALID_SORTS: ProductSort[] = ["relevance", "price_asc", "price_desc", "newest", "name"];

function parseNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (qRaw ?? "").trim();
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: ProductSort = VALID_SORTS.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : "relevance";
  const brand = Array.isArray(sp.brand) ? sp.brand[0] : sp.brand;

  const [result, brands, bounds] = q
    ? await Promise.all([
        searchProducts(q, {
          sort,
          page: parseNum(sp.page) ?? 1,
          pageSize: 12,
          brand: brand || undefined,
          minPrice: parseNum(sp.minPrice),
          maxPrice: parseNum(sp.maxPrice),
          inStock: sp.inStock === "1",
        }),
        listBrands(),
        priceBounds(),
      ])
    : [{ products: [], count: 0, page: 1, pageSize: 12, totalPages: 1 }, [], { min: 0, max: 0 }];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <div className="mx-auto mt-6 max-w-2xl">
        <SearchBar initialQuery={q} autoFocus placeholder="Search products, brands, models…" />
      </div>

      {!q ? (
        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h1 className="text-xl font-bold text-brand-900">Search our store</h1>
          <p className="mt-2 text-sm text-slate-500">
            Try “5kW inverter”, “550W solar panel”, “12W LED bulb” or a brand name.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-brand-900">
                Results for “{q}”
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {result.count} {result.count === 1 ? "product" : "products"} found
              </p>
            </div>
            <SortSelect value={sort} />
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
            <aside className="lg:sticky lg:top-40 lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <Filters
                  brands={brands}
                  bounds={bounds}
                  initial={{
                    brand: brand || undefined,
                    minPrice: parseNum(sp.minPrice),
                    maxPrice: parseNum(sp.maxPrice),
                    inStock: sp.inStock === "1",
                  }}
                />
              </div>
            </aside>
            <div>
              {result.products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-lg font-bold text-slate-700">No products found</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Check the spelling or try a more general term like “inverter” or “LED”.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                  {result.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
              <Pagination page={result.page} totalPages={result.totalPages} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
