import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryNav from "@/components/CategoryNav";
import Filters from "@/components/Filters";
import JsonLd from "@/components/JsonLd";
import Pagination from "@/components/Pagination";
import ProductCard from "@/components/ProductCard";
import SortSelect from "@/components/SortSelect";
import {
  getCategory,
  listBrands,
  listCategories,
  listProducts,
  priceBounds,
  type ProductFilters,
  type ProductSort,
} from "@/lib/medusa";
import { breadcrumbJsonLd, generateCategoryMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found" };
  return generateCategoryMetadata(category);
}

const VALID_SORTS: ProductSort[] = ["relevance", "price_asc", "price_desc", "newest", "name"];

function parseNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: ProductSort = VALID_SORTS.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : "relevance";
  const brand = Array.isArray(sp.brand) ? sp.brand[0] : sp.brand;
  const filters: ProductFilters = {
    categoryId: category.id,
    sort,
    page: parseNum(sp.page) ?? 1,
    pageSize: 12,
    brand: brand || undefined,
    minPrice: parseNum(sp.minPrice),
    maxPrice: parseNum(sp.maxPrice),
    inStock: sp.inStock === "1",
  };

  const [allCategories, result, brands, bounds] = await Promise.all([
    listCategories(),
    listProducts(filters),
    listBrands(),
    priceBounds(),
  ]);
  const subcategories = allCategories.filter((c) => c.parentId === category.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.name },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.name },
        ]}
      />

      {/* Category hero */}
      <div className="mt-4 rounded-2xl bg-gradient-to-r from-brand-950 to-brand-700 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{category.description}</p>
        )}
      </div>

      {subcategories.length > 0 && (
        <div className="mt-4">
          <CategoryNav categories={subcategories} basePath="/category" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-slate-500">
          {result.count} {result.count === 1 ? "product" : "products"} in {category.name}
        </p>
        <SortSelect value={sort} />
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-[240px_1fr]">
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
              <p className="text-lg font-bold text-slate-700">No products in this category yet</p>
              <p className="mt-2 text-sm text-slate-500">Check back soon or browse other categories.</p>
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
