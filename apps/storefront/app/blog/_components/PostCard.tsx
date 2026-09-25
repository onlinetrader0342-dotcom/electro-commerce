import Link from "next/link";
import type { BlogPost } from "@/lib/blog";

/** Card for blog index / category / tag grids. */
export function PostCard({ post }: { post: BlogPost }) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.featuredImage ? (
          <img
            src={post.featuredImage}
            alt={post.imageAlt || post.title}
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-brand-50">
            <span className="text-4xl" aria-hidden>
              💡
            </span>
          </div>
        )}
        <div className="p-5">
          {post.category && (
            <span className="mb-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              {post.category.name}
            </span>
          )}
          <h3 className="mb-2 text-lg font-bold text-brand-900 group-hover:text-brand-600">
            {post.title}
          </h3>
          <p className="mb-3 line-clamp-2 text-sm text-slate-600">
            {post.excerpt}
          </p>
          <p className="text-xs text-slate-500">
            {post.author.name}
            {date ? ` · ${date}` : ""}
          </p>
        </div>
      </Link>
    </article>
  );
}
