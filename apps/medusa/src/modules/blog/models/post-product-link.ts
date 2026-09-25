import { model } from "@medusajs/framework/utils";
import { BlogPost } from "./blog-post";

/**
 * Structured link from a blog post to a Medusa product.
 *
 * `medusa_product_id` is intentionally a plain text column, not a cross-module
 * FK: the blog module must not hard-depend on product-module internals. The
 * storefront resolves these ids against the Medusa Store API at render time,
 * so the product data shown in "Recommended products" is always current.
 */
export const PostProductLink = model.define("post_product_link", {
  id: model.id().primaryKey(),
  post: model.belongsTo(() => BlogPost, { mappedBy: "product_links" }),
  medusa_product_id: model.text(),
  /** Display order inside the article's recommendation block. */
  position: model.number().default(0),
});
