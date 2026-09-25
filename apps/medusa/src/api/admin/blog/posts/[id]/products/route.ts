import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../../../modules/blog";
import type BlogModuleService from "../../../../../../modules/blog/service";

const AddLink = z.object({
  /** Medusa product id — resolved live against the Store API at render. */
  medusa_product_id: z.string().min(1),
  position: z.number().int().min(0).default(0),
});

/** List the structured product links of a post (ordered). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const links = await blog.listPostProductLinks(
    { post_id: req.params.id },
    { order: { position: "ASC" } },
  );
  res.json({ links });
};

/** Attach a product recommendation to a post. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = AddLink.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const link = await blog.createPostProductLinks({
    post_id: req.params.id,
    medusa_product_id: body.medusa_product_id,
    position: body.position,
  });
  res.status(201).json({ link });
};

/** Remove a product link: DELETE …/products?link_id=… */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const linkId = z.string().min(1).parse(req.query.link_id);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  await blog.deletePostProductLinks(linkId);
  res.json({ id: linkId, deleted: true });
};
