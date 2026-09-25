import { notFound } from "next/navigation";
import { getBlogRepository } from "@/lib/blog";
import { PostForm } from "../_components/PostForm";

/** /admin/blog/[id] — edit a post. */
export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getBlogRepository();

  const [post, categories] = await Promise.all([
    repo.adminGetPost(id).catch(() => null),
    repo.listCategories().catch(() => []),
  ]);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-brand-900">Edit blog post</h1>
      <PostForm mode="edit" post={post} categories={categories} />
    </main>
  );
}
