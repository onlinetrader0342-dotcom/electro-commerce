"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  getBlogRepository,
  type BlogPostInput,
  type BlogStatus,
} from "./blog";
import { MedusaError } from "./commerce";

/**
 * Server actions for /admin/blog. All admin writes go through the
 * BlogRepository (Medusa admin API). Runs server-side only — the admin API
 * key never leaves the server.
 */

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function opt(fd: FormData, name: string): string | null {
  const v = str(fd, name);
  return v ? v : null;
}

function parseProductLinks(raw: string): { productId: string; position: number }[] {
  if (!raw.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x): x is { productId: string; position: number } =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as { productId?: unknown }).productId === "string" &&
          (x as { productId: string }).productId.trim().length > 0,
      )
      .map((x, i) => ({
        productId: x.productId.trim(),
        position: Number.isFinite(x.position) ? x.position : i + 1,
      }));
  } catch {
    return [];
  }
}

function parseStatus(fd: FormData): BlogStatus {
  const s = str(fd, "status");
  if (s === "published" || s === "scheduled" || s === "draft") return s;
  return "draft";
}

function toInput(fd: FormData): BlogPostInput {
  const title = str(fd, "title");
  if (!title) throw new Error("Title is required.");
  const content = str(fd, "content");
  if (!content) throw new Error("Content is required.");
  const excerpt = str(fd, "excerpt") || content.slice(0, 160);

  const tagIds = str(fd, "tagIds")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const status = parseStatus(fd);
  let scheduledAt = opt(fd, "scheduledAt");
  if (status === "scheduled" && !scheduledAt)
    throw new Error("Scheduled posts need a scheduled date/time.");

  return {
    title,
    slug: opt(fd, "slug") || undefined,
    excerpt,
    content,
    featuredImage: opt(fd, "featuredImage"),
    imageAlt: opt(fd, "imageAlt"),
    categoryId: opt(fd, "categoryId"),
    tagIds,
    authorName: opt(fd, "authorName"),
    seoTitle: opt(fd, "seoTitle"),
    seoDescription: opt(fd, "seoDescription"),
    canonicalUrl: opt(fd, "canonicalUrl"),
    ogImage: opt(fd, "ogImage"),
    status,
    scheduledAt,
    productLinks: parseProductLinks(str(fd, "productLinks")),
  };
}

function actionError(err: unknown): never {
  if (err instanceof MedusaError) {
    throw new Error(`Blog backend error (${err.status}): ${err.message}`);
  }
  throw err;
}

export async function createPostAction(formData: FormData): Promise<void> {
  try {
    await getBlogRepository().createPost(toInput(formData));
  } catch (err) {
    actionError(err);
  }
  revalidateTag("blog");
  redirect("/admin/blog");
}

export async function updatePostAction(
  id: string,
  formData: FormData,
): Promise<void> {
  try {
    await getBlogRepository().updatePost(id, toInput(formData));
  } catch (err) {
    actionError(err);
  }
  revalidateTag("blog");
  redirect("/admin/blog");
}

export async function deletePostAction(id: string): Promise<void> {
  try {
    await getBlogRepository().deletePost(id);
  } catch (err) {
    actionError(err);
  }
  revalidateTag("blog");
  redirect("/admin/blog");
}

export async function publishPostAction(id: string): Promise<void> {
  try {
    await getBlogRepository().publishPost(id);
  } catch (err) {
    actionError(err);
  }
  revalidateTag("blog");
  redirect("/admin/blog");
}

export async function unpublishPostAction(id: string): Promise<void> {
  try {
    await getBlogRepository().unpublishPost(id);
  } catch (err) {
    actionError(err);
  }
  revalidateTag("blog");
  redirect("/admin/blog");
}
