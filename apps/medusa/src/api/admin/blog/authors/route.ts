import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../modules/blog";
import type BlogModuleService from "../../../../modules/blog/service";

const UpsertAuthor = z.object({
  name: z.string().min(1),
  bio: z.string().optional(),
  avatar: z.string().optional(),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const authors = await blog.listAuthors({}, { order: { name: "ASC" } });
  res.json({ authors });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = UpsertAuthor.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const author = await blog.createAuthors(body);
  res.status(201).json({ author });
};
