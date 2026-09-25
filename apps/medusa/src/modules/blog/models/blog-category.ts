import { model } from "@medusajs/framework/utils";
import { BlogPost } from "./blog-post";

export const BlogCategory = model.define("blog_category", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  description: model.text().nullable(),
  posts: model.hasMany(() => BlogPost, { mappedBy: "category" }),
});
