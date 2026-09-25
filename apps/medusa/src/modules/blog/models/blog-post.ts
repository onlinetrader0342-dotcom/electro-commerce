import { model } from "@medusajs/framework/utils";
import { Author } from "./author";
import { BlogCategory } from "./blog-category";
import { BlogTag } from "./blog-tag";
import { PostTag } from "./post-tag";
import { PostProductLink } from "./post-product-link";

export const BlogPost = model.define("blog_post", {
  id: model.id().primaryKey(),
  title: model.text(),
  slug: model.text().unique(),
  excerpt: model.text().nullable(),
  /** Markdown article body. */
  content: model.text(),
  status: model
    .enum(["draft", "published", "scheduled"])
    .default("draft"),
  published_at: model.dateTime().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  canonical_url: model.text().nullable(),
  og_image: model.text().nullable(),
  featured_image: model.text().nullable(),
  image_alt: model.text().nullable(),

  author: model.belongsTo(() => Author, { mappedBy: "posts" }).nullable(),
  category: model
    .belongsTo(() => BlogCategory, { mappedBy: "posts" })
    .nullable(),
  tags: model.manyToMany(() => BlogTag, {
    mappedBy: "posts",
    pivotEntity: () => PostTag,
  }),
  /** Structured product recommendations — resolved against Medusa products,
   *  never copied into the article body. */
  product_links: model.hasMany(() => PostProductLink, { mappedBy: "post" }),
});
