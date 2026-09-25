"use client";

import { useState } from "react";
import { createPostAction, updatePostAction } from "@/lib/blog-actions";
import type { BlogCategory, BlogPost } from "@/lib/blog";

interface ProductLinkDraft {
  productId: string;
  position: number;
  title?: string;
}

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string | null;
  price: number;
  currency: string;
  priceFormatted: string;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500";
const labelCls = "mb-1 block text-sm font-semibold text-slate-700";

export function PostForm({
  mode,
  post,
  categories,
}: {
  mode: "create" | "edit";
  post?: BlogPost;
  categories: BlogCategory[];
}) {
  const [links, setLinks] = useState<ProductLinkDraft[]>(
    (post?.productLinks ?? []).map((l) => ({ ...l })),
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function searchProducts() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/product-search?q=${encodeURIComponent(query.trim())}`,
      );
      const json = await res.json();
      setResults(json.products ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addLink(r: SearchResult) {
    if (links.some((l) => l.productId === r.id)) return;
    setLinks((prev) => [
      ...prev,
      { productId: r.id, position: prev.length + 1, title: r.title },
    ]);
  }

  function removeLink(productId: string) {
    setLinks((prev) =>
      prev
        .filter((l) => l.productId !== productId)
        .map((l, i) => ({ ...l, position: i + 1 })),
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    formData.set("productLinks", JSON.stringify(links));
    try {
      if (mode === "edit" && post) {
        await updatePostAction(post.id, formData);
      } else {
        await createPostAction(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setPending(false);
    }
  }

  const tagIdsDefault = post?.tags.map((t) => t.id).join(", ") ?? "";

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div>
            <label htmlFor="title" className={labelCls}>
              Title *
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={post?.title ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="slug" className={labelCls}>
              Slug (optional — auto-generated if empty)
            </label>
            <input
              id="slug"
              name="slug"
              defaultValue={post?.slug ?? ""}
              className={inputCls}
              placeholder="5kw-inverter-kya-hota-hai"
            />
          </div>
          <div>
            <label htmlFor="excerpt" className={labelCls}>
              Excerpt
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              defaultValue={post?.excerpt ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="content" className={labelCls}>
              Content (Markdown) *
            </label>
            <textarea
              id="content"
              name="content"
              required
              rows={16}
              defaultValue={post?.content ?? ""}
              className={`${inputCls} font-mono`}
            />
          </div>

          <fieldset className="rounded-xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-bold text-brand-900">
              Recommended products (resolved live at render)
            </legend>
            <div className="mb-3 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchProducts();
                  }
                }}
                placeholder="Search products by name…"
                className={inputCls}
              />
              <button
                type="button"
                onClick={searchProducts}
                disabled={searching}
                className="shrink-0 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {searching ? "…" : "Search"}
              </button>
            </div>
            {results.length > 0 && (
              <ul className="mb-3 max-h-48 space-y-1 overflow-auto rounded-lg border border-slate-200 p-2">
                {results.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded p-1.5 hover:bg-slate-50"
                  >
                    <span className="truncate text-sm">
                      {r.title}{" "}
                      <span className="text-slate-500">
                        · {r.priceFormatted}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => addLink(r)}
                      className="shrink-0 rounded bg-accent-500 px-2 py-1 text-xs font-bold text-brand-950"
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {links.length === 0 ? (
              <p className="text-sm text-slate-500">
                No linked products yet. Search above to attach products —
                only the product ID is stored, data stays live.
              </p>
            ) : (
              <ol className="space-y-1">
                {links.map((l) => (
                  <li
                    key={l.productId}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                        {l.position}
                      </span>
                      {l.title ?? l.productId}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLink(l.productId)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </fieldset>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="status" className={labelCls}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={post?.status ?? "draft"}
              className={inputCls}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
          <div>
            <label htmlFor="scheduledAt" className={labelCls}>
              Scheduled at (for scheduled posts)
            </label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={post?.scheduledAt?.slice(0, 16) ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="categoryId" className={labelCls}>
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={post?.category?.id ?? ""}
              className={inputCls}
            >
              <option value="">— No category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tagIds" className={labelCls}>
              Tag IDs (comma-separated)
            </label>
            <input
              id="tagIds"
              name="tagIds"
              defaultValue={tagIdsDefault}
              className={inputCls}
              placeholder="tag_inverter, tag_guide"
            />
          </div>
          <div>
            <label htmlFor="authorName" className={labelCls}>
              Author name
            </label>
            <input
              id="authorName"
              name="authorName"
              defaultValue={post?.author.name ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="featuredImage" className={labelCls}>
              Featured image URL
            </label>
            <input
              id="featuredImage"
              name="featuredImage"
              defaultValue={post?.featuredImage ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
          <div>
            <label htmlFor="imageAlt" className={labelCls}>
              Image alt text
            </label>
            <input
              id="imageAlt"
              name="imageAlt"
              defaultValue={post?.imageAlt ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="seoTitle" className={labelCls}>
              SEO title
            </label>
            <input
              id="seoTitle"
              name="seoTitle"
              defaultValue={post?.seoTitle ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="seoDescription" className={labelCls}>
              SEO description
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              defaultValue={post?.seoDescription ?? ""}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="canonicalUrl" className={labelCls}>
              Canonical URL
            </label>
            <input
              id="canonicalUrl"
              name="canonicalUrl"
              defaultValue={post?.canonicalUrl ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
          <div>
            <label htmlFor="ogImage" className={labelCls}>
              OG image URL
            </label>
            <input
              id="ogImage"
              name="ogImage"
              defaultValue={post?.ogImage ?? ""}
              className={inputCls}
              placeholder="https://…"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent-500 px-6 py-2.5 font-bold text-brand-950 hover:bg-accent-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : mode === "edit" ? "Update post" : "Create post"}
        </button>
        <a
          href="/admin/blog"
          className="rounded-lg border border-slate-300 px-6 py-2.5 font-semibold text-slate-700"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
