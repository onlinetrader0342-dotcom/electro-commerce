import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../../modules/blog";
import type BlogModuleService from "../../../../../modules/blog/service";

const UpsertCategory = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const [category] = await blog.listBlogCategories({ id: req.params.id });
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ category });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = UpsertCategory.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const category = await blog.updateBlogCategories({ id: req.params.id, ...body });
  res.json({ category });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  await blog.softDeleteBlogCategories(req.params.id);
  res.json({ id: req.params.id, deleted: true });
};
