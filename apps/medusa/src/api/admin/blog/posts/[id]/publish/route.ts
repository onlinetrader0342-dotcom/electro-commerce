import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../../../modules/blog";
import type BlogModuleService from "../../../../../../modules/blog/service";

const PublishAction = z.object({
  action: z.enum(["publish", "unpublish", "schedule"]),
  /** Required when action === "schedule". ISO datetime. */
  published_at: z.string().datetime().optional(),
});

/**
 * POST /admin/blog/posts/:id/publish
 * { action: "publish" }            → live now
 * { action: "unpublish" }          → back to draft
 * { action: "schedule", published_at } → auto-publishes via cron job
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { action, published_at } = PublishAction.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;

  let post;
  if (action === "publish") post = await blog.publishPost(req.params.id);
  else if (action === "unpublish") post = await blog.unpublishPost(req.params.id);
  else {
    if (!published_at) {
      return res.status(400).json({ message: "published_at is required to schedule" });
    }
    post = await blog.schedulePost(req.params.id, new Date(published_at));
  }
  res.json({ post });
};
