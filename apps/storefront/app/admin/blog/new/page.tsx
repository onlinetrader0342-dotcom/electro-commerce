import { getBlogRepository } from "@/lib/blog";
import { PostForm } from "../_components/PostForm";

/** /admin/blog/new — create a post. */
export default async function AdminBlogNewPage() {
  const categories = await getBlogRepository()
    .listCategories()
    .catch(() => []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-brand-900">New blog post</h1>
      <PostForm mode="create" categories={categories} />
    </main>
  );
}
