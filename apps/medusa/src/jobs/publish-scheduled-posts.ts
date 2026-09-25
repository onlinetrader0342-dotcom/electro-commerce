import type { MedusaContainer } from "@medusajs/framework/types";
import { BLOG_MODULE } from "../modules/blog";
import type BlogModuleService from "../modules/blog/service";

/**
 * Scheduled job — publishes blog posts whose scheduled time has arrived.
 * Runs every 5 minutes. Pairs with the "schedule" action on
 * POST /admin/blog/posts/:id/publish.
 */
export default async function publishScheduledPosts(
  container: MedusaContainer,
) {
  const blog = container.resolve(BLOG_MODULE) as BlogModuleService;
  const published = await blog.publishDueScheduledPosts(new Date());
  if (published > 0) {
    container.resolve("logger").info(
      `[blog] published ${published} scheduled post(s)`,
    );
  }
}

export const config = {
  name: "publish-scheduled-posts",
  schedule: "*/5 * * * *",
};
