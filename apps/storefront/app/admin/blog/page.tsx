import Link from "next/link";
import { getBlogRepository } from "@/lib/blog";
import {
  publishPostAction,
  unpublishPostAction,
} from "@/lib/blog-actions";
import { DeleteButton } from "./_components/DeleteButton";

/** /admin/blog — list all posts (any status) with publish controls. */
export default async function AdminBlogListPage() {
  const repo = getBlogRepository();

  let posts: Awaited<ReturnType<typeof repo.adminListPosts>>["posts"] = [];
  let total = 0;
  let backendError: string | null = null;
  try {
    const res = await repo.adminListPosts({ limit: 50 });
    posts = res.posts;
    total = res.total;
  } catch (err) {
    backendError = err instanceof Error ? err.message : "Unknown error.";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Blog posts</h1>
          <p className="text-sm text-slate-600">
            {total} post{total === 1 ? "" : "s"} in the Medusa blog module
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-lg bg-accent-500 px-4 py-2 font-bold text-brand-950 hover:bg-accent-400"
        >
          + New post
        </Link>
      </div>

      {backendError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-bold">Blog backend unavailable</p>
          <p className="mt-1">
            Admin writes need a reachable Medusa blog module and
            MEDUSA_ADMIN_API_KEY. ({backendError})
          </p>
        </div>
      )}

      {!backendError && posts.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No posts yet. Create the first one.
        </p>
      )}

      {posts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-brand-900">
                    <Link
                      href={`/blog/${p.slug}`}
                      className="hover:underline"
                      target="_blank"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.status === "published"
                          ? "bg-green-100 text-green-800"
                          : p.status === "scheduled"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(p.updatedAt).toLocaleDateString("en-PK")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/blog/${p.id}`}
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Edit
                      </Link>
                      {p.status === "published" ? (
                        <form action={unpublishPostAction.bind(null, p.id)}>
                          <button className="text-xs font-semibold text-amber-700 hover:underline">
                            Unpublish
                          </button>
                        </form>
                      ) : (
                        <form action={publishPostAction.bind(null, p.id)}>
                          <button className="text-xs font-semibold text-green-700 hover:underline">
                            Publish
                          </button>
                        </form>
                      )}
                      <DeleteButton id={p.id} title={p.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
