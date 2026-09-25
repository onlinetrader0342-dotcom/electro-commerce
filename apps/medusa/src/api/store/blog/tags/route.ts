import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../modules/blog";
import type BlogModuleService from "../../../../modules/blog/service";

/** GET /store/blog/tags — public list for tag clouds / tag pages. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const tags = await blog.listBlogTags({}, { order: { name: "ASC" } });
  res.json({ tags });
};
