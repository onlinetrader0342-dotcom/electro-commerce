import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Filters from "@/components/Filters";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import {
  listBrands,
  listProducts,
  priceBounds,
  type ProductFilters,
  type ProductSort,
} from "@/lib/medusa";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shop All Electric Products Online in Pakistan",
  description:
    "Shop inverters, solar panels, batteries, LED lights, fans, switches and more online in Pakistan. Genuine products, official warranty, best prices.",
  alternates: { canonical: "/shop" },
};

const VALID_SORTS: ProductSort[] = ["relevance", "price_asc", "price_desc", "newest", "name"];

function parseNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseFilters(sp: Record<string, string | string[] | undefined>): ProductFilters {
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: ProductSort = VALID_SORTS.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : "relevance";
  const brand = Array.isArray(sp.brand) ? sp.brand[0] : sp.brand;
  return {
    sort,
    page: parseNum(sp.page) ?? 1,
    pageSize: 12,
    brand: brand || undefined,
    minPrice: parseNum(sp.minPrice),
    maxPrice: parseNum(sp.maxPrice),
    inStock: sp.inStock === "1" || (Array.isArray(sp.inStock) ? sp.inStock[0] : sp.inStock) === "1",
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [result, brands, bounds] = await Promise.all([
    listProducts(filters),
    listBrands(),
    priceBounds(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-900">Shop All Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result.count} {result.count === 1 ? "product" : "products"} found
          </p>
        </div>
        <SortSelect value={filters.sort ?? "relevance"} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-40 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <Filters
              brands={brands}
              bounds={bounds}
              initial={{
                brand: filters.brand,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice,
                inStock: filters.inStock,
              }}
            />
          </div>
        </aside>

        <div>
          {result.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-lg font-bold text-slate-700">No products match your filters</p>
              <p className="mt-2 text-sm text-slate-500">Try widening the price range or clearing the brand filter.</p>
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
    </div>
  );
}
