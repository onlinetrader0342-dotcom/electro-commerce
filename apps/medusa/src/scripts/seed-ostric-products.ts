#!/usr/bin/env tsx
/**
 * Seed script — REAL Ostric LED catalog (June 2026 price list) for electro-commerce.
 *
 * Source data: ./ostric-products.json (parsed from Ostric_Price_List_3D.pdf).
 * Adds 88 Ostric products under a new "Ostric" parent category — existing demo
 * products are untouched. Idempotent: skips products/categories that already exist.
 *
 * Usage:
 *   MEDUSA_ADMIN_EMAIL=admin@… MEDUSA_ADMIN_PASSWORD=… pnpm --filter medusa seed:ostric
 *
 * CRITICAL: Medusa v2 expects variant prices in MINOR units (paisa for PKR).
 * Rs 1,670 = 167000. The JSON holds major units; we multiply by 100 here.
 */
import { readFileSync } from "fs";
import { join } from "path";

const BACKEND = (process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD first.");
  process.exit(1);
}

interface OstricProduct {
  title: string;
  handle: string;
  sku: string;
  brand: string;
  article: string;
  watt: string;
  size: string;
  category_name: string;
  category_handle: string;
  price_pkr: number; // MAJOR units — multiplied by 100 below
  price_range: string | null;
  specs: string;
  special: boolean;
  stock: number;
  short_description: string;
  description: string;
  tags: string[];
}

const HERE = __dirname;
const PRODUCTS: OstricProduct[] = JSON.parse(
  readFileSync(join(HERE, "ostric-products.json"), "utf8"),
);

let token = "";

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

async function main() {
  const auth = await api<{ token: string }>("POST", "/auth/user/emailpass", {
    email: EMAIL,
    password: PASSWORD,
  });
  token = auth.token;
  console.log("✓ logged in");

  const { sales_channels } = await api<{ sales_channels: { id: string }[] }>(
    "GET",
    "/admin/sales-channels?limit=10",
  );
  const { stock_locations } = await api<{ stock_locations: { id: string }[] }>(
    "GET",
    "/admin/stock-locations?limit=10",
  );
  const salesChannelId = sales_channels[0]?.id;
  const locationId = stock_locations[0]?.id;
  if (!salesChannelId) throw new Error("No sales channel found");
  console.log(`✓ sales channel ${salesChannelId}, stock location ${locationId ?? "(none)"}`);

  // ── categories: parent "Ostric" + one child per product line ──
  const { product_categories } = await api<{
    product_categories: { id: string; handle: string }[];
  }>("GET", "/admin/product-categories?limit=1000");
  const catIds: Record<string, string> = Object.fromEntries(
    product_categories.map((c) => [c.handle, c.id]),
  );

  async function ensureCategory(name: string, handle: string, description: string, parentHandle?: string) {
    if (catIds[handle]) return catIds[handle];
    const created = await api<{ product_category: { id: string } }>(
      "POST",
      "/admin/product-categories",
      {
        name,
        handle,
        description,
        is_active: true,
        parent_category_id: parentHandle ? catIds[parentHandle] : undefined,
      },
    );
    catIds[handle] = created.product_category.id;
    console.log(`✓ category created: ${handle}`);
    return catIds[handle];
  }

  await ensureCategory(
    "Ostric",
    "ostric",
    "Ostric LED lighting — official June 2026 price list. Energy-efficient LED lights for homes, shops and industry.",
  );

  const seenCats = new Map<string, string>(); // handle -> name
  for (const p of PRODUCTS) seenCats.set(p.category_handle, p.category_name);
  for (const [handle, name] of seenCats) {
    await ensureCategory(name, handle, `Ostric ${name} — official June 2026 price list.`, "ostric");
  }
  console.log(`✓ ${seenCats.size} Ostric categories ready`);

  // ── tags ──
  const tagIdCache = new Map<string, string>();
  async function tagId(value: string): Promise<string> {
    const cached = tagIdCache.get(value);
    if (cached) return cached;
    const found = await api<{ product_tags: { id: string }[] }>(
      "GET",
      `/admin/product-tags?value=${encodeURIComponent(value)}&limit=1`,
    );
    let id = found.product_tags[0]?.id;
    if (!id) {
      const created = await api<{ product_tag: { id: string } }>(
        "POST",
        "/admin/product-tags",
        { value },
      );
      id = created.product_tag.id;
    }
    tagIdCache.set(value, id);
    return id;
  }

  // ── products ──
  let createdCount = 0;
  let skippedCount = 0;
  for (const p of PRODUCTS) {
    const existing = await api<{ products: { id: string }[] }>(
      "GET",
      `/admin/products?handle=${encodeURIComponent(p.handle)}&limit=1`,
    );
    let productId: string | undefined = existing.products[0]?.id;

    if (!productId) {
      const created = await api<{ product: { id: string } }>("POST", "/admin/products", {
        title: p.title,
        handle: p.handle,
        subtitle: p.short_description,
        description: p.description,
        status: "published",
        categories: [{ id: catIds[p.category_handle] }],
        tags: await Promise.all(p.tags.map(async (value) => ({ id: await tagId(value) }))),
        sales_channels: [{ id: salesChannelId }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            sku: p.sku,
            options: { Default: "Default" },
            manage_inventory: true,
            // MINOR units (paisa): Rs 1,670 → 167000
            prices: [{ amount: Math.round(p.price_pkr * 100), currency_code: "pkr" }],
          },
        ],
        metadata: {
          brand: p.brand,
          article: p.article,
          wattage: p.watt || null,
          size: p.size || null,
          specifications: p.specs,
          price_list: "Ostric June 2026",
          ...(p.special ? { net_price: true, note: "Special discounted net price — no further discount." } : {}),
          ...(p.price_range ? { price_range_note: p.price_range } : {}),
        },
      });
      productId = created.product.id;
      createdCount++;
      if (createdCount % 20 === 0) console.log(`  … ${createdCount} created`);
    } else {
      skippedCount++;
    }

    if (locationId && productId) {
      try {
        const { variants } = await api<{ variants: { id: string }[] }>(
          "GET",
          `/admin/products/${productId}?fields=variants.id`,
        );
        for (const v of variants) {
          const { inventory_items } = await api<{
            inventory_items: { inventory_item_id: string }[];
          }>("GET", `/admin/products/${productId}/variants/${v.id}/inventory-items`);
          for (const ii of inventory_items) {
            await api(
              "POST",
              `/admin/inventory-items/${ii.inventory_item_id}/location-levels`,
              { location_id: locationId, stocked_quantity: p.stock },
            );
          }
        }
      } catch (err) {
        console.warn(`  ! stock setup skipped for ${p.sku}: ${(err as Error).message}`);
      }
    }
  }

  console.log(`\nDone — ${createdCount} Ostric products created, ${skippedCount} already existed.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
