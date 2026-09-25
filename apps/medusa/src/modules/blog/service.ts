import { MedusaService } from "@medusajs/framework/utils";
import { Author } from "./models/author";
import { BlogCategory } from "./models/blog-category";
import { BlogPost } from "./models/blog-post";
import { BlogTag } from "./models/blog-tag";
import { PostProductLink } from "./models/post-product-link";
import { PostTag } from "./models/post-tag";

class BlogModuleService extends MedusaService({
  Author,
  BlogCategory,
  BlogPost,
  BlogTag,
  PostProductLink,
  PostTag,
}) {
  /**
   * Publish a post immediately (sets status + published_at=now).
   */
  async publishPost(id: string) {
    return this.updateBlogPosts({ id, status: "published", published_at: new Date() });
  }

  /** Unpublish — the post stays in the DB as a draft. */
  async unpublishPost(id: string) {
    return this.updateBlogPosts({ id, status: "draft" });
  }

  /**
   * Schedule a post for future publishing. A scheduled Medusa job
   * (src/jobs/publish-scheduled-posts.ts) flips due posts to published.
   */
  async schedulePost(id: string, publishAt: Date) {
    return this.updateBlogPosts({ id, status: "scheduled", published_at: publishAt });
  }

  /** Find one published post by slug (store API). */
  async getPublishedPostBySlug(slug: string) {
    const [post] = await this.listBlogPosts(
      { slug, status: "published" },
      {
        relations: ["author", "category", "tags", "product_links"],
        order: { product_links: { position: "ASC" } },
      },
    );
    return post ?? null;
  }

  /** Publish every scheduled post whose time has come. Used by the cron job. */
  async publishDueScheduledPosts(now: Date = new Date()) {
    const due = await this.listBlogPosts({
      status: "scheduled",
      published_at: { $lte: now },
    });
    for (const post of due) {
      await this.updateBlogPosts({ id: post.id, status: "published" });
    }
    return due.length;
  }
}

export default BlogModuleService;
