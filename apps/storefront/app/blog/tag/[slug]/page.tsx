import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogRepository } from "@/lib/blog";
import { absoluteUrl } from "@/lib/format";
import { PostCard } from "../../_components/PostCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getBlogRepository().listTags();
  const tag = tags.find((t) => t.slug === slug);
  if (!tag) return { title: "Tag not found" };
  return {
    title: `#${tag.name} | Blog | Imran Electric Store`,
    description: `#${tag.name} tag wale articles aur guides.`,
    alternates: { canonical: absoluteUrl(`/blog/tag/${tag.slug}`) },
  };
}

export default async function BlogTagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const repo = getBlogRepository();
  const tags = await repo.listTags();
  const tag = tags.find((t) => t.slug === slug);
  if (!tag) notFound();

  const { posts } = await repo.getPostsByTag(slug, {
    status: "published",
    limit: 24,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <ol className="flex items-center gap-1.5">
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
          <li aria-hidden>›</li>
          <li className="text-slate-700">#{tag.name}</li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">#{tag.name}</h1>
        <p className="mt-2 text-slate-600">
          {posts.length} article{posts.length === 1 ? "" : "s"}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Is tag me abhi koi articles nahi hain.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
