import type { Metadata } from "next";
import Link from "next/link";
import { getBlogRepository } from "@/lib/blog";
import { absoluteUrl } from "@/lib/format";
import { PostCard } from "./_components/PostCard";

export const metadata: Metadata = {
  title: "Blog | Imran Electric Store",
  description:
    "Buying guides aur maloomat: inverters, solar panels, LED lights aur bijli ke products ke bare me Roman Urdu guides.",
  alternates: { canonical: absoluteUrl("/blog") },
};

const PAGE_SIZE = 12;

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const repo = getBlogRepository();

  const [{ posts, total }, categories, tags] = await Promise.all([
    repo.getPosts({
      status: "published",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    repo.listCategories(),
    repo.listTags(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">Blog</h1>
        <p className="mt-2 text-slate-600">
          Bijli ke products khareedne se pehle jan'ne wali zaroori baatein —
          asaan Roman Urdu me.
        </p>
      </header>

      {categories.length > 0 && (
        <nav aria-label="Blog categories" className="mb-4">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <Link
              href="/blog"
              className="shrink-0 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white"
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/blog/category/${c.slug}`}
                className="shrink-0 rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-500 hover:text-brand-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {tags.length > 0 && (
        <nav aria-label="Blog tags" className="mb-8">
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {tags.map((t) => (
              <Link
                key={t.id}
                href={`/blog/tag/${t.slug}`}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-accent-100 hover:text-brand-800"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Abhi koi articles nahi hain. Jald wapas aayein.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/blog?page=${page - 1}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:border-brand-500"
            >
              ← Previous
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/blog?page=${page + 1}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:border-brand-500"
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
