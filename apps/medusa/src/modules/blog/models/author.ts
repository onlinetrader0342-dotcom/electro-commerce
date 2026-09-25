import { model } from "@medusajs/framework/utils";
import { BlogPost } from "./blog-post";

export const Author = model.define("blog_author", {
  id: model.id().primaryKey(),
  name: model.text(),
  bio: model.text().nullable(),
  avatar: model.text().nullable(),
  posts: model.hasMany(() => BlogPost, { mappedBy: "author" }),
});
