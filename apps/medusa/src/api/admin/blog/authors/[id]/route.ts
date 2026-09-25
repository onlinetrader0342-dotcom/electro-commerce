import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../../modules/blog";
import type BlogModuleService from "../../../../../modules/blog/service";

const UpsertAuthor = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const [author] = await blog.listAuthors({ id: req.params.id });
  if (!author) return res.status(404).json({ message: "Author not found" });
  res.json({ author });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = UpsertAuthor.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const author = await blog.updateAuthors({ id: req.params.id, ...body });
  res.json({ author });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  await blog.softDeleteAuthors(req.params.id);
  res.json({ id: req.params.id, deleted: true });
};
