import { NextResponse } from "next/server";
import { feedItemsToJson, getFeedItems } from "@/lib/feed";

/**
 * GET /api/feeds/products.json — generic JSON product feed for external
 * AI/commerce platforms. Same source data as google.xml.
 */
export async function GET() {
  const items = await getFeedItems();
  return NextResponse.json(feedItemsToJson(items), {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
