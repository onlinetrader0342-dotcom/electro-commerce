import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../modules/blog";
import type BlogModuleService from "../../../../modules/blog/service";

const UpsertTag = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const tags = await blog.listBlogTags({}, { order: { name: "ASC" } });
  res.json({ tags });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = UpsertTag.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const tag = await blog.createBlogTags({
    ...body,
    slug: body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  });
  res.status(201).json({ tag });
};
