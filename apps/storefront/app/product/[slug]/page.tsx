import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import Price from "@/components/Price";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/medusa";
import {
  breadcrumbJsonLd,
  generateProductMetadata,
  productJsonLd,
} from "@/lib/seo";
import PurchaseBox from "./PurchaseBox";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return generateProductMetadata(product);
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    ...(product.category
      ? [{ label: product.category.name, href: `/category/${product.category.handle}` }]
      : []),
    { label: product.title },
  ];

  const detailRows: [string, string | undefined][] = [
    ["Brand", product.brand],
    ["Model", product.model],
    ["SKU", product.sku],
    ["Weight", product.weight],
    ["Dimensions", product.dimensions],
    ["Warranty", product.warranty],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <ProductGallery images={product.images} title={product.title} />

        {/* Buy panel */}
        <div>
          {product.brand && (
            <p className="text-sm font-bold uppercase tracking-widest text-brand-600">
              {product.brand}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-extrabold text-brand-950 sm:text-3xl">
            {product.title}
          </h1>

          <div className="mt-2 flex items-center gap-2 text-sm">
            {typeof product.rating === "number" && (
              <>
                <span className="font-bold text-brand-900">{product.rating.toFixed(1)}</span>
                <span className="text-slate-400">
                  ({product.reviewCount ?? 0} reviews)
                </span>
                <span className="text-slate-300">·</span>
              </>
            )}
            {product.sku && <span className="text-slate-400">SKU: {product.sku}</span>}
          </div>

          <div className="mt-4">
            <Price
              price={product.price}
              salePrice={product.salePrice}
              currency={product.currency}
              size="lg"
            />
          </div>

          <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
            product.inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            <span className={`h-2 w-2 rounded-full ${product.inStock ? "bg-green-500" : "bg-red-500"}`} />
            {product.inStock ? "In Stock — ready to ship" : "Out of Stock"}
          </p>

          {product.shortDescription && (
            <p className="mt-4 leading-relaxed text-slate-600">{product.shortDescription}</p>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <PurchaseBox product={product} />
            <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
              <li>✓ Cash on Delivery available across Pakistan</li>
              <li>✓ Prices & stock validated on our server at checkout</li>
              {product.warranty && <li>✓ {product.warranty}</li>}
            </ul>
          </div>

          {product.category && (
            <p className="mt-4 text-sm text-slate-500">
              Category:{" "}
              <Link
                href={`/category/${product.category.handle}`}
                className="font-semibold text-brand-600 hover:underline"
              >
                {product.category.name}
              </Link>
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <section className="mt-12" aria-labelledby="desc-heading">
          <h2 id="desc-heading" className="text-2xl font-extrabold text-brand-900">
            Product Description
          </h2>
          <div className="rich-text mt-4 max-w-3xl">
            {product.description.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      )}

      {/* Specifications */}
      {product.specifications.length > 0 && (
        <section className="mt-12" aria-labelledby="specs-heading">
          <h2 id="specs-heading" className="text-2xl font-extrabold text-brand-900">
            Specifications
          </h2>
          <div className="mt-4 max-w-3xl overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <tbody>
                {product.specifications.map((s, i) => (
                  <tr key={`${s.name}-${i}`} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                    <th scope="row" className="w-1/3 px-5 py-3 text-left font-semibold text-brand-900">
                      {s.name}
                    </th>
                    <td className="px-5 py-3 text-slate-600">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Details: brand / model / SKU / weight / dimensions / warranty */}
      <section className="mt-12" aria-labelledby="details-heading">
        <h2 id="details-heading" className="text-2xl font-extrabold text-brand-900">
          Product Details
        </h2>
        <dl className="mt-4 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          {detailRows.map(([label, value]) =>
            value ? (
              <div key={label} className="rounded-xl border border-slate-200 bg-white px-5 py-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-1 font-semibold text-slate-800">{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl font-extrabold text-brand-900">
            Related Products
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
