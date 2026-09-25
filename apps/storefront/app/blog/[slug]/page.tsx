import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogRepository } from "@/lib/blog";
import { absoluteUrl } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { RecommendedProductCard } from "../_components/ProductCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogRepository().getPostBySlug(slug);
  if (!post) return { title: "Article not found" };

  const url = absoluteUrl(`/blog/${post.slug}`);
  const canonical = post.canonicalUrl || url;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const ogImage = post.ogImage || post.featuredImage || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      ...(ogImage ? { images: [{ url: ogImage, alt: post.imageAlt || post.title }] } : {}),
      publishedTime: post.publishedAt ?? undefined,
      authors: [post.author.name],
      tags: post.tags.map((t) => t.name),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = getBlogRepository();
  const post = await repo.getPostBySlug(slug);
  if (!post || post.status !== "published") notFound();

  const url = absoluteUrl(`/blog/${post.slug}`);
  const html = renderMarkdown(post.content);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage || post.ogImage || undefined,
    author: { "@type": "Person", name: post.author.name },
    publisher: {
      "@type": "Organization",
      name: "Imran Electric Store",
      url: absoluteUrl("/"),
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
  };

  const breadcrumbItems: { name: string; href: string }[] = [
    { name: "Home", href: absoluteUrl("/") },
    { name: "Blog", href: absoluteUrl("/blog") },
  ];
  if (post.category)
    breadcrumbItems.push({
      name: post.category.name,
      href: absoluteUrl(`/blog/category/${post.category.slug}`),
    });
  breadcrumbItems.push({ name: post.title, href: url });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.href,
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-700">
              Home
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href="/blog" className="hover:text-brand-700">
              Blog
            </Link>
          </li>
          {post.category && (
            <>
              <li aria-hidden>›</li>
              <li>
                <Link
                  href={`/blog/category/${post.category.slug}`}
                  className="hover:text-brand-700"
                >
                  {post.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>›</li>
          <li className="max-w-[16rem] truncate text-slate-700">{post.title}</li>
        </ol>
      </nav>

      <article>
        <header className="mb-6">
          {post.category && (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
            >
              {post.category.name}
            </Link>
          )}
          <h1 className="text-3xl font-bold text-brand-900 md:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            By <span className="font-medium text-slate-700">{post.author.name}</span>
            {date ? ` · ${date}` : ""}
          </p>
        </header>

        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt={post.imageAlt || post.title}
            className="mb-8 w-full rounded-xl object-cover"
          />
        )}

        <div
          className="rich-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link
                key={t.id}
                href={`/blog/tag/${t.slug}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-accent-100 hover:text-brand-800"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        )}

        <aside className="mt-8 flex gap-4 rounded-xl bg-brand-50 p-5">
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xl font-bold text-white">
              {post.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-brand-900">{post.author.name}</p>
            {post.author.bio && (
              <p className="mt-1 text-sm text-slate-600">{post.author.bio}</p>
            )}
          </div>
        </aside>
      </article>

      {post.productLinks.length > 0 && (
        <section aria-labelledby="recommended-products" className="mt-12">
          <h2
            id="recommended-products"
            className="mb-1 text-2xl font-bold text-brand-900"
          >
            Recommended products
          </h2>
          <p className="mb-5 text-sm text-slate-600">
            Is article se mutaliq products — qeemat aur stock live update hoti hai.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {post.productLinks.map((link) => (
              <RecommendedProductCard
                key={link.productId}
                productId={link.productId}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
