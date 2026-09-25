#!/usr/bin/env tsx
/** Set stock=50 at the default location for all Ostric products (idempotent). */
const BACKEND = (process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) { console.error("Set creds"); process.exit(1); }

let token = "";
async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

async function main() {
  const auth = await api<{ token: string }>("POST", "/auth/user/emailpass", { email: EMAIL, password: PASSWORD });
  token = auth.token;
  const { stock_locations } = await api<{ stock_locations: { id: string }[] }>("GET", "/admin/stock-locations?limit=5");
  const locationId = stock_locations[0]?.id;
  if (!locationId) throw new Error("no stock location");

  let offset = 0, done = 0;
  for (;;) {
    const { products } = await api<{ products: { id: string; tags: { value: string }[] }[] }>(
      "GET", `/admin/products?limit=100&offset=${offset}&fields=id,tags.value`,
    );
    if (!products.length) break;
    for (const p of products) {
      if (!p.tags?.some((t) => t.value === "ostric")) continue;
      const { product } = await api<{ product: { variants: { id: string; inventory_items: { inventory_item_id: string }[] }[] } }>(
        "GET", `/admin/products/${p.id}?fields=variants.id,variants.inventory_items.inventory_item_id`,
      );
      const variants = product.variants ?? [];
      for (const v of variants) {
        for (const ii of v.inventory_items ?? []) {
          await api("POST", `/admin/inventory-items/${ii.inventory_item_id}/location-levels`, {
            location_id: locationId, stocked_quantity: 50,
          });
        }
      }
      done++;
    }
    offset += products.length;
  }
  console.log(`stock set for ${done} Ostric products`);
}
main().catch((e) => { console.error("failed:", e.message); process.exit(1); });
