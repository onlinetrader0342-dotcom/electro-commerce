import { model } from "@medusajs/framework/utils";
import { BlogPost } from "./blog-post";
import { BlogTag } from "./blog-tag";

/** Pivot entity for the post ↔ tag many-to-many. */
export const PostTag = model.define("post_tag", {
  id: model.id().primaryKey(),
  post: model.belongsTo(() => BlogPost, { mappedBy: "tags" }),
  tag: model.belongsTo(() => BlogTag, { mappedBy: "posts" }),
});
