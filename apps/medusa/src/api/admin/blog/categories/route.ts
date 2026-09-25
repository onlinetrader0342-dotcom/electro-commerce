import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../modules/blog";
import type BlogModuleService from "../../../../modules/blog/service";

const UpsertCategory = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const categories = await blog.listBlogCategories({}, { order: { name: "ASC" } });
  res.json({ categories });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = UpsertCategory.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const category = await blog.createBlogCategories({
    ...body,
    slug: body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  });
  res.status(201).json({ category });
};
