import { feedItemsToGoogleXml, getFeedItems } from "@/lib/feed";

/**
 * GET /api/feeds/google.xml — Google Merchant product feed.
 * Built live from the Medusa product list (single source of truth).
 * Cached at the edge: 1h fresh, stale-while-revalidate 24h.
 */
export async function GET() {
  const items = await getFeedItems();
  const xml = feedItemsToGoogleXml(items);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
