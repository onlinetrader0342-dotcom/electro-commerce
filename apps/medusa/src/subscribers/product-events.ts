import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";

/**
 * Cache invalidation bridge: Medusa → Next.js storefront.
 *
 * On product / category changes we POST the affected cache tags to the
 * storefront's /api/revalidate endpoint (guarded by REVALIDATE_SECRET).
 * The storefront uses tag-based ISR, so only the changed pages (product,
 * category, feed, AI API responses) are regenerated — not the whole site.
 *
 * If STOREFRONT_URL or REVALIDATE_SECRET is unset, we log and skip — the
 * storefront then simply serves the next ISR window's fresh data.
 */

function tagsForEvent(
  eventName: string,
  data: Record<string, unknown>,
): string[] {
  const id = typeof data?.id === "string" ? data.id : undefined;
  if (eventName.startsWith("product-category.")) {
    return [
      ...(id ? [`category:${id}`] : []),
      "categories",
      "sitemap",
    ];
  }
  if (eventName.startsWith("product.")) {
    return [
      ...(id ? [`product:${id}`] : []),
      "products",
      "feed", // product feed is regenerated from Medusa
      "ai-products", // AI discovery responses
      "sitemap",
    ];
  }
  if (eventName.startsWith("price-list.") || eventName.startsWith("inventory")) {
    return ["products", "feed", "ai-products"];
  }
  return [];
}

export default async function productEventsHandler({
  event: { name, data },
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const logger = container.resolve("logger");
  const tags = tagsForEvent(name, (data ?? {}) as Record<string, unknown>);
  if (!tags.length) return;

  const storefrontUrl = process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!storefrontUrl || !secret) {
    logger.warn(
      `[revalidate] skipping — set STOREFRONT_URL and REVALIDATE_SECRET (event: ${name})`,
    );
    return;
  }

  try {
    const resp = await fetch(`${storefrontUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags }),
    });
    if (!resp.ok) {
      logger.warn(
        `[revalidate] storefront responded ${resp.status} for tags ${tags.join(",")}`,
      );
    } else {
      logger.info(`[revalidate] tags invalidated: ${tags.join(",")}`);
    }
  } catch (err) {
    logger.error(`[revalidate] failed for event ${name}: ${(err as Error).message}`);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "price-list.created",
    "price-list.updated",
    "price-list.deleted",
  ],
};
