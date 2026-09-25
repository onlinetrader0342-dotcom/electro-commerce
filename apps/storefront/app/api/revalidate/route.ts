import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * POST /api/revalidate — on-demand ISR invalidation.
 * Body: { "secret": "<REVALIDATE_SECRET>", "tags": ["products","categories","blog"] }
 * Called by the Medusa backend (or admin tooling) when data changes so the
 * storefront, feeds and AI caches refresh without a redeploy.
 */

const ALLOWED_TAGS = new Set(["products", "categories", "blog"]);

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Revalidation is not configured (REVALIDATE_SECRET missing)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const provided =
    typeof (body as { secret?: unknown }).secret === "string"
      ? ((body as { secret: string }).secret ?? "")
      : "";

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
  }

  const rawTags = (body as { tags?: unknown }).tags;
  const requested: string[] =
    Array.isArray(rawTags) && rawTags.length
      ? rawTags.map(String).slice(0, 20)
      : ["products", "categories", "blog"];

  const revalidated: string[] = [];
  for (const tag of requested) {
    // Allow "products" and granular "product:<id>"-style tags.
    const base = tag.split(":")[0];
    if (ALLOWED_TAGS.has(base) || ALLOWED_TAGS.has(tag)) {
      revalidateTag(tag);
      revalidated.push(tag);
    }
  }

  return NextResponse.json({ revalidated });
}
