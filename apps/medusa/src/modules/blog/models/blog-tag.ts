import { model } from "@medusajs/framework/utils";
import { BlogPost } from "./blog-post";
import { PostTag } from "./post-tag";

export const BlogTag = model.define("blog_tag", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
  posts: model.manyToMany(() => BlogPost, {
    mappedBy: "tags",
    pivotEntity: () => PostTag,
  }),
});
