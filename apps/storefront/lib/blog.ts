import "server-only";
import { adminFetch, hasAdminKey, MedusaError, storeFetch } from "./commerce";
import {
  BLOG_FIXTURES,
  FIXTURE_CATEGORIES,
  FIXTURE_TAGS,
  filterFixtures,
  fixtureBySlug,
} from "./blog-fixtures";

/**
 * Blog domain: types + BlogRepository interface.
 *
 * PRODUCT REFERENCES: posts carry `productLinks: { productId, position }[]`.
 * Product data is NEVER copied into a post — at render time each productId
 * is resolved live through the commerce layer (see app/blog/[slug]/page.tsx).
 * One source of truth (Medusa) feeds the post, the AI API and the feed.
 */

// ---------------------------------------------------------------- types ---

export type BlogStatus = "draft" | "published" | "scheduled";

export interface BlogAuthor {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

/** Structured reference to a commerce product (resolved live at render). */
export interface ProductLink {
  productId: string;
  position: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Markdown source. */
  content: string;
  featuredImage?: string | null;
  imageAlt?: string | null;
  category?: BlogCategory | null;
  tags: BlogTag[];
  author: BlogAuthor;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: string | null;
  status: BlogStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  productLinks: ProductLink[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  featuredImage?: string | null;
  imageAlt?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  authorId?: string | null;
  authorName?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: string | null;
  status?: BlogStatus;
  scheduledAt?: string | null;
  productLinks?: ProductLink[];
}

export interface BlogListParams {
  status?: BlogStatus | "all";
  category?: string;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface BlogListResult {
  posts: BlogPost[];
  total: number;
}

// ---------------------------------------------------------- interface ---

export interface BlogRepository {
  getPosts(params?: BlogListParams): Promise<BlogListResult>;
  getPostBySlug(slug: string): Promise<BlogPost | null>;
  getPostsByCategory(
    categorySlug: string,
    params?: Omit<BlogListParams, "category">,
  ): Promise<BlogListResult>;
  getPostsByTag(
    tagSlug: string,
    params?: Omit<BlogListParams, "tag">,
  ): Promise<BlogListResult>;
  listCategories(): Promise<BlogCategory[]>;
  listTags(): Promise<BlogTag[]>;
  createPost(input: BlogPostInput): Promise<BlogPost>;
  updatePost(id: string, input: Partial<BlogPostInput>): Promise<BlogPost>;
  deletePost(id: string): Promise<void>;
  publishPost(id: string): Promise<BlogPost>;
  unpublishPost(id: string): Promise<BlogPost>;
}

// ------------------------------------- Medusa wire format + mapping ---

/**
 * ASSUMED Medusa blog-module REST contract (agent A owns the Medusa app).
 * If the module exposes different routes/shapes, only `normalizePost` and
 * the paths below need to change — the interface above stays stable.
 *
 *   Store reads:
 *     GET /store/blog-posts?status=&category=&tag=&q=&limit=&offset=
 *       -> { posts: RawBlogPost[], count: number }
 *     GET /store/blog-posts/:slug            -> { post: RawBlogPost }
 *     GET /store/blog-categories              -> { categories: RawCategory[] }
 *     GET /store/blog-tags                    -> { tags: RawTag[] }
 *   Admin writes (MEDUSA_ADMIN_API_KEY):
 *     GET    /admin/blog-posts?...            -> { posts, count }
 *     POST   /admin/blog-posts                { post: input } -> { post }
 *     PATCH  /admin/blog-posts/:id            { post: patch } -> { post }
 *     DELETE /admin/blog-posts/:id            -> 204
 *     POST   /admin/blog-posts/:id/publish    -> { post }
 *     POST   /admin/blog-posts/:id/unpublish  -> { post }
 */
interface RawBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image?: string | null;
  image_alt?: string | null;
  category?: { id: string; name: string; slug: string; description?: string | null } | null;
  tags?: { id: string; name: string; slug: string }[];
  author?: { id: string; name: string; avatar?: string | null; bio?: string | null } | null;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  og_image?: string | null;
  status?: BlogStatus;
  published_at?: string | null;
  scheduled_at?: string | null;
  product_links?: { product_id: string; position: number }[];
  created_at: string;
  updated_at: string;
}

function normalizePost(raw: RawBlogPost): BlogPost {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt ?? "",
    content: raw.content ?? "",
    featuredImage: raw.featured_image ?? null,
    imageAlt: raw.image_alt ?? null,
    category: raw.category
      ? {
          id: raw.category.id,
          name: raw.category.name,
          slug: raw.category.slug,
          description: raw.category.description ?? null,
        }
      : null,
    tags: (raw.tags ?? []).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
    author: raw.author
      ? {
          id: raw.author.id,
          name: raw.author.name,
          avatar: raw.author.avatar ?? null,
          bio: raw.author.bio ?? null,
        }
      : { id: "unknown", name: "Imran Electric Store" },
    seoTitle: raw.seo_title ?? null,
    seoDescription: raw.seo_description ?? null,
    canonicalUrl: raw.canonical_url ?? null,
    ogImage: raw.og_image ?? null,
    status: raw.status ?? "draft",
    publishedAt: raw.published_at ?? null,
    scheduledAt: raw.scheduled_at ?? null,
    productLinks: (raw.product_links ?? [])
      .map((l) => ({ productId: l.product_id, position: l.position ?? 0 }))
      .sort((a, b) => a.position - b.position),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/** camelCase input -> snake_case Medusa payload */
function toPayload(input: Partial<BlogPostInput>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (input.title !== undefined) p.title = input.title;
  if (input.slug !== undefined) p.slug = input.slug;
  if (input.excerpt !== undefined) p.excerpt = input.excerpt;
  if (input.content !== undefined) p.content = input.content;
  if (input.featuredImage !== undefined) p.featured_image = input.featuredImage;
  if (input.imageAlt !== undefined) p.image_alt = input.imageAlt;
  if (input.categoryId !== undefined) p.category_id = input.categoryId;
  if (input.tagIds !== undefined) p.tag_ids = input.tagIds;
  if (input.authorId !== undefined) p.author_id = input.authorId;
  if (input.authorName !== undefined) p.author_name = input.authorName;
  if (input.seoTitle !== undefined) p.seo_title = input.seoTitle;
  if (input.seoDescription !== undefined) p.seo_description = input.seoDescription;
  if (input.canonicalUrl !== undefined) p.canonical_url = input.canonicalUrl;
  if (input.ogImage !== undefined) p.og_image = input.ogImage;
  if (input.status !== undefined) p.status = input.status;
  if (input.scheduledAt !== undefined) p.scheduled_at = input.scheduledAt;
  if (input.productLinks !== undefined)
    p.product_links = input.productLinks.map((l) => ({
      product_id: l.productId,
      position: l.position,
    }));
  return p;
}

// ------------------------------------------------- implementation ---

const BLOG_CACHE_TAGS = ["blog"];

export class DbBlogRepository implements BlogRepository {
  private warned = false;

  private warnFallback(where: string, err: unknown) {
    if (!this.warned) {
      console.warn(
        `[blog] Medusa blog module unavailable in ${where} — using fixtures.`,
        err instanceof Error ? err.message : err,
      );
      this.warned = true;
    }
  }

  async getPosts(params: BlogListParams = {}): Promise<BlogListResult> {
    const {
      status = "published",
      category,
      tag,
      search,
      limit = 12,
      offset = 0,
    } = params;
    try {
      const res = await storeFetch<{ posts: RawBlogPost[]; count: number }>(
        "/store/blog-posts",
        {
          params: { status, category, tag, q: search, limit, offset },
          tags: BLOG_CACHE_TAGS,
          revalidate: 300,
        },
      );
      return {
        posts: res.posts.map(normalizePost),
        total: res.count ?? res.posts.length,
      };
    } catch (err) {
      this.warnFallback("getPosts", err);
      return filterFixtures(params);
    }
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const res = await storeFetch<{ post: RawBlogPost | null }>(
        `/store/blog-posts/${encodeURIComponent(slug)}`,
        { tags: [...BLOG_CACHE_TAGS, `blog-post:${slug}`], revalidate: 300 },
      );
      return res.post ? normalizePost(res.post) : null;
    } catch (err) {
      this.warnFallback("getPostBySlug", err);
      return fixtureBySlug(slug);
    }
  }

  getPostsByCategory(
    categorySlug: string,
    params: Omit<BlogListParams, "category"> = {},
  ): Promise<BlogListResult> {
    return this.getPosts({ ...params, category: categorySlug });
  }

  getPostsByTag(
    tagSlug: string,
    params: Omit<BlogListParams, "tag"> = {},
  ): Promise<BlogListResult> {
    return this.getPosts({ ...params, tag: tagSlug });
  }

  async listCategories(): Promise<BlogCategory[]> {
    try {
      const res = await storeFetch<{ categories: RawBlogPost["category"][] }>(
        "/store/blog-categories",
        { tags: BLOG_CACHE_TAGS, revalidate: 600 },
      );
      return (res.categories ?? []).map((c) => ({
        id: c!.id,
        name: c!.name,
        slug: c!.slug,
        description: c!.description ?? null,
      }));
    } catch (err) {
      this.warnFallback("listCategories", err);
      return FIXTURE_CATEGORIES;
    }
  }

  async listTags(): Promise<BlogTag[]> {
    try {
      const res = await storeFetch<{ tags: { id: string; name: string; slug: string }[] }>(
        "/store/blog-tags",
        { tags: BLOG_CACHE_TAGS, revalidate: 600 },
      );
      return (res.tags ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
      }));
    } catch (err) {
      this.warnFallback("listTags", err);
      return FIXTURE_TAGS;
    }
  }

  private requireAdmin() {
    if (!hasAdminKey()) {
      throw new MedusaError(
        503,
        "Blog admin writes need MEDUSA_ADMIN_API_KEY and a reachable Medusa blog module.",
      );
    }
  }

  async createPost(input: BlogPostInput): Promise<BlogPost> {
    this.requireAdmin();
    const res = await adminFetch<{ post: RawBlogPost }>("/admin/blog-posts", {
      method: "POST",
      body: JSON.stringify({ post: toPayload(input) }),
    });
    return normalizePost(res.post);
  }

  async updatePost(
    id: string,
    input: Partial<BlogPostInput>,
  ): Promise<BlogPost> {
    this.requireAdmin();
    const res = await adminFetch<{ post: RawBlogPost }>(
      `/admin/blog-posts/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ post: toPayload(input) }) },
    );
    return normalizePost(res.post);
  }

  async deletePost(id: string): Promise<void> {
    this.requireAdmin();
    await adminFetch<void>(`/admin/blog-posts/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async publishPost(id: string): Promise<BlogPost> {
    this.requireAdmin();
    const res = await adminFetch<{ post: RawBlogPost }>(
      `/admin/blog-posts/${encodeURIComponent(id)}/publish`,
      { method: "POST" },
    );
    return normalizePost(res.post);
  }

  async unpublishPost(id: string): Promise<BlogPost> {
    this.requireAdmin();
    const res = await adminFetch<{ post: RawBlogPost }>(
      `/admin/blog-posts/${encodeURIComponent(id)}/unpublish`,
      { method: "POST" },
    );
    return normalizePost(res.post);
  }

  /** Admin list (all statuses) for the /admin/blog UI. */
  async adminListPosts(params: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<BlogListResult> {
    this.requireAdmin();
    const res = await adminFetch<{ posts: RawBlogPost[]; count: number }>(
      "/admin/blog-posts",
      {
        params: {
          limit: params.limit ?? 50,
          offset: params.offset ?? 0,
          q: params.search,
        },
      },
    );
    return {
      posts: res.posts.map(normalizePost),
      total: res.count ?? res.posts.length,
    };
  }

  /** Admin fetch single post by id (for the edit form). */
  async adminGetPost(id: string): Promise<BlogPost | null> {
    this.requireAdmin();
    try {
      const res = await adminFetch<{ post: RawBlogPost | null }>(
        `/admin/blog-posts/${encodeURIComponent(id)}`,
      );
      return res.post ? normalizePost(res.post) : null;
    } catch (err) {
      if (err instanceof MedusaError && err.status === 404) return null;
      throw err;
    }
  }
}

let instance: DbBlogRepository | null = null;

/** Singleton repository used by pages, API routes and server actions. */
export function getBlogRepository(): DbBlogRepository {
  if (!instance) instance = new DbBlogRepository();
  return instance;
}

/** All fixtures (used by sitemap when Medusa is down). */
export function getFixturePosts(): BlogPost[] {
  return BLOG_FIXTURES;
}
