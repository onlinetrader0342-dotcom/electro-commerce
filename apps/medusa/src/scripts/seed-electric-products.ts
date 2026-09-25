#!/usr/bin/env tsx
/**
 * Seed script — electric-products catalog for electro-commerce.
 *
 * Standalone script talking to the Medusa Admin API (no server start needed
 * beyond `pnpm dev` running in another terminal).
 *
 * Usage:
 *   MEDUSA_ADMIN_EMAIL=admin@… MEDUSA_ADMIN_PASSWORD=… pnpm --filter medusa seed
 *
 * What it does:
 *   1. Logs in as the admin user (create one first: `medusa user -e … -p …`)
 *   2. Creates the category tree (idempotent — skips existing handles)
 *   3. Creates 12 realistic products with PKR prices, SKUs, specs in
 *      `metadata.specifications` (read by the feed generator + AI API)
 *   4. Best-effort: sets stock levels at the default stock location
 *
 * Notes on Medusa v2 conventions used here:
 *   - Variant `prices[].amount` is in MINOR currency units (paisa for PKR),
*     per Medusa v2 convention: Rs 285,000 = 28500000.
 *   - `manage_inventory: true` on a variant auto-creates a linked inventory item;
 *     stock is then set via /admin/inventory-items/:id/location-levels.
 */
import { randomUUID } from "crypto";

const BACKEND = (process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL;
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD first.");
  process.exit(1);
}

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

/* ── Category tree ────────────────────────────────────────── */

interface SeedCategory {
  name: string;
  handle: string;
  description: string;
  parent?: string; // parent handle
}

const CATEGORIES: SeedCategory[] = [
  { name: "Inverters", handle: "inverters", description: "Solar, hybrid and on-grid inverters for home and commercial use." },
  { name: "Solar Inverters", handle: "solar-inverters", description: "On-grid and off-grid solar inverters.", parent: "inverters" },
  { name: "Hybrid Inverters", handle: "hybrid-inverters", description: "Hybrid inverters with solar + grid + battery support.", parent: "inverters" },
  { name: "Solar Panels", handle: "solar-panels", description: "Mono PERC and N-type solar panels." },
  { name: "Batteries", handle: "batteries", description: "Tubular, lead-acid and lithium batteries for backup power." },
  { name: "LED Lights", handle: "led-lights", description: "Energy-efficient LED lighting for every need." },
  { name: "LED Bulbs", handle: "led-bulbs", description: "LED bulbs in multiple wattages.", parent: "led-lights" },
  { name: "Flood Lights", handle: "flood-lights", description: "Outdoor LED flood lights.", parent: "led-lights" },
  { name: "Street Lights", handle: "street-lights", description: "LED street and area lights.", parent: "led-lights" },
  { name: "Fans", handle: "fans", description: "Ceiling, pedestal and bracket fans." },
  { name: "Ceiling Fans", handle: "ceiling-fans", description: "Energy-saving ceiling fans.", parent: "fans" },
  { name: "Pedestal Fans", handle: "pedestal-fans", description: "Pedestal and stand fans.", parent: "fans" },
  { name: "Switches", handle: "switches", description: "Switch plates, sockets and smart switches." },
  { name: "Electrical Accessories", handle: "electrical-accessories", description: "Wires, breakers, distribution boxes and fittings." },
];

/* ── Products ─────────────────────────────────────────────── */

interface SeedProduct {
  title: string;
  handle: string;
  sku: string;
  brand: string;
  model: string;
  category: string; // category handle
  price: number; // PKR, major units
  salePrice?: number;
  stock: number;
  weightKg: number;
  warranty: string;
  shortDescription: string;
  description: string;
  specifications: Record<string, string>;
  tags: string[];
}

const PRODUCTS: SeedProduct[] = [
  {
    title: "VoltCore 5kW Hybrid Solar Inverter",
    handle: "voltcore-5kw-hybrid-solar-inverter",
    sku: "VC-HYB-5K",
    brand: "VoltCore",
    model: "VC-5000HYB",
    category: "hybrid-inverters",
    price: 285000,
    stock: 15,
    weightKg: 28,
    warranty: "5 years official warranty",
    shortDescription: "5kW hybrid solar inverter with 80A MPPT, 48V battery support and WiFi monitoring.",
    description:
      "The VoltCore VC-5000HYB is a 5kW hybrid solar inverter built for Pakistani homes and small businesses. " +
      "It blends solar, grid and battery power automatically, delivers pure sine wave output, and can be monitored " +
      "from your phone over WiFi. Ideal for running air conditioners, refrigerators and full home loads during load-shedding.",
    specifications: {
      "Rated output": "5 kW",
      "MPPT current": "80 A",
      "Battery voltage": "48 V",
      "Output waveform": "Pure sine wave",
      "Display": "LCD + WiFi monitoring",
      "Parallel support": "Up to 6 units",
    },
    tags: ["inverter", "hybrid", "5kw", "solar"],
  },
  {
    title: "VoltCore 3kW On-Grid Solar Inverter",
    handle: "voltcore-3kw-on-grid-solar-inverter",
    sku: "VC-ONG-3K",
    brand: "VoltCore",
    model: "VC-3000ONG",
    category: "solar-inverters",
    price: 165000,
    stock: 20,
    weightKg: 16,
    warranty: "5 years official warranty",
    shortDescription: "3kW on-grid solar inverter for net-metering systems.",
    description:
      "A 3kW on-grid solar inverter designed for net-metering installations. High conversion efficiency keeps " +
      "your electricity bill low, and the compact wall-mount design suits homes and shops.",
    specifications: {
      "Rated output": "3 kW",
      "Max efficiency": "97.6%",
      "MPPT trackers": "2",
      "Net metering": "Supported",
    },
    tags: ["inverter", "on-grid", "3kw", "net-metering"],
  },
  {
    title: "Osaka TR-1800 Tall Tubular Battery 185Ah",
    handle: "osaka-tr-1800-tall-tubular-battery",
    sku: "OSK-TR1800",
    brand: "Osaka",
    model: "TR-1800",
    category: "batteries",
    price: 62500,
    stock: 40,
    weightKg: 62,
    warranty: "2 years replacement warranty",
    shortDescription: "185Ah tall tubular battery for inverters and UPS — deep cycle, long backup.",
    description:
      "Osaka TR-1800 tall tubular battery with 185Ah capacity. Deep-cycle tubular plates give longer backup " +
      "and a longer service life than ordinary batteries — the standard choice for home UPS and inverter systems.",
    specifications: {
      "Capacity": "185 Ah",
      "Voltage": "12 V",
      "Type": "Tall tubular, deep cycle",
      "Backup (typical)": "6–8 hours (2 fans + 4 lights)",
    },
    tags: ["battery", "tubular", "185ah", "ups"],
  },
  {
    title: "PowerCell 5kWh LiFePO4 Lithium Battery",
    handle: "powercell-5kwh-lifepo4-lithium-battery",
    sku: "PWC-LFP-5KWH",
    brand: "PowerCell",
    model: "PC-LFP51.2-100",
    category: "batteries",
    price: 395000,
    stock: 8,
    weightKg: 48,
    warranty: "5 years official warranty",
    shortDescription: "5kWh lithium iron phosphate battery — 6000 cycles, wall-mount, for hybrid inverters.",
    description:
      "A 5kWh LiFePO4 lithium battery with built-in BMS. Up to 6000 charge cycles — roughly 10x the life of " +
      "lead-acid — in half the weight and size. Pairs perfectly with 48V hybrid inverters.",
    specifications: {
      "Capacity": "5.12 kWh",
      "Voltage": "51.2 V",
      "Chemistry": "LiFePO4",
      "Cycle life": "6000 cycles @ 80% DoD",
      "Mounting": "Wall-mount / rack",
    },
    tags: ["battery", "lithium", "lifepo4", "5kwh"],
  },
  {
    title: "SunHarvest 550W Mono PERC Solar Panel",
    handle: "sunharvest-550w-mono-perc-solar-panel",
    sku: "SH-550M",
    brand: "SunHarvest",
    model: "SH-550M-PERC",
    category: "solar-panels",
    price: 48500,
    stock: 120,
    weightKg: 28,
    warranty: "12 years product, 25 years performance warranty",
    shortDescription: "550W mono PERC half-cell solar panel — high efficiency for rooftop systems.",
    description:
      "550W monocrystalline PERC solar panel with half-cell technology for better shade tolerance and lower " +
      "heat losses. A workhorse for residential rooftop installations across Pakistan.",
    specifications: {
      "Power": "550 W",
      "Cell type": "Mono PERC half-cell",
      "Efficiency": "21.3%",
      "Frame": "Anodized aluminium",
    },
    tags: ["solar-panel", "550w", "mono", "perc"],
  },
  {
    title: "SunHarvest 585W N-Type Bifacial Solar Panel",
    handle: "sunharvest-585w-n-type-bifacial-solar-panel",
    sku: "SH-585N-BF",
    brand: "SunHarvest",
    model: "SH-585N-BF",
    category: "solar-panels",
    price: 56000,
    stock: 90,
    weightKg: 32,
    warranty: "15 years product, 30 years performance warranty",
    shortDescription: "585W N-type bifacial panel — captures light from both sides for extra yield.",
    description:
      "585W N-type bifacial solar panel. The glass-glass bifacial design harvests reflected light from the rear " +
      "side too, delivering up to 15% extra energy on reflective rooftops.",
    specifications: {
      "Power": "585 W",
      "Cell type": "N-type TOPCon bifacial",
      "Efficiency": "22.6%",
      "Bifacial gain": "Up to 15%",
    },
    tags: ["solar-panel", "585w", "bifacial", "n-type"],
  },
  {
    title: "BrightLite 12W LED Bulb — Pack of 4",
    handle: "brightlite-12w-led-bulb-pack-of-4",
    sku: "BL-12W-4PK",
    brand: "BrightLite",
    model: "BL-12W-E27",
    category: "led-bulbs",
    price: 1850,
    salePrice: 1650,
    stock: 500,
    weightKg: 0.4,
    warranty: "1 year replacement warranty",
    shortDescription: "Pack of four 12W LED bulbs — bright white light, 85% energy saving.",
    description:
      "Four BrightLite 12W LED bulbs (E27 screw base). Each bulb replaces a 100W incandescent while using 85% " +
      "less electricity, with a cool daylight glow suited to Pakistani homes.",
    specifications: {
      "Wattage": "12 W",
      "Base": "E27",
      "Lumens": "1200 lm",
      "Color temperature": "6500 K (daylight)",
      "Lifespan": "25,000 hours",
    },
    tags: ["led", "bulb", "12w", "pack"],
  },
  {
    title: "BrightLite 50W LED Flood Light",
    handle: "brightlite-50w-led-flood-light",
    sku: "BL-FL-50W",
    brand: "BrightLite",
    model: "BL-FL50-IP66",
    category: "flood-lights",
    price: 6200,
    stock: 150,
    weightKg: 1.8,
    warranty: "2 years official warranty",
    shortDescription: "50W IP66 outdoor LED flood light for boundary walls and shops.",
    description:
      "IP66 weatherproof 50W LED flood light with die-cast aluminium housing. Bright, even illumination for " +
      "boundary walls, shop signboards, parking areas and farms.",
    specifications: {
      "Wattage": "50 W",
      "Lumens": "5000 lm",
      "Protection": "IP66 weatherproof",
      "Housing": "Die-cast aluminium",
    },
    tags: ["led", "flood-light", "50w", "outdoor"],
  },
  {
    title: "BrightLite 100W LED Street Light",
    handle: "brightlite-100w-led-street-light",
    sku: "BL-SL-100W",
    brand: "BrightLite",
    model: "BL-SL100-IP66",
    category: "street-lights",
    price: 14800,
    stock: 80,
    weightKg: 4.2,
    warranty: "2 years official warranty",
    shortDescription: "100W LED street light with pole-mount arm for roads and housing societies.",
    description:
      "100W LED street light with adjustable pole-mount arm and IP66 protection. Designed for streets, " +
      "housing societies, factories and commercial plazas.",
    specifications: {
      "Wattage": "100 W",
      "Lumens": "11,000 lm",
      "Protection": "IP66 weatherproof",
      "Mounting": "Pole arm (60mm)",
    },
    tags: ["led", "street-light", "100w", "outdoor"],
  },
  {
    title: "AirFlow 56\" Copper Ceiling Fan",
    handle: "airflow-56-copper-ceiling-fan",
    sku: "AF-56-CU",
    brand: "AirFlow",
    model: "AF-56CU",
    category: "ceiling-fans",
    price: 12500,
    stock: 60,
    weightKg: 7.5,
    warranty: "2 years motor warranty",
    shortDescription: "56-inch 99.99% copper winding ceiling fan — strong air delivery, low noise.",
    description:
      "AirFlow 56-inch ceiling fan with pure copper winding motor for stronger air throw and lower electricity " +
      "use. Aerodynamic blades keep noise down even at full speed.",
    specifications: {
      "Sweep": '56"',
      "Motor": "99.99% copper winding",
      "Power": "75 W",
      "Air delivery": "230 CMM",
      "Speed": "330 RPM",
    },
    tags: ["fan", "ceiling-fan", "copper", "56-inch"],
  },
  {
    title: "AirFlow 18\" Pedestal Fan",
    handle: "airflow-18-pedestal-fan",
    sku: "AF-18-PD",
    brand: "AirFlow",
    model: "AF-18PD",
    category: "pedestal-fans",
    price: 8900,
    stock: 70,
    weightKg: 6.8,
    warranty: "1 year motor warranty",
    shortDescription: "18-inch pedestal fan with height adjustment and oscillation.",
    description:
      "18-inch pedestal fan with adjustable height, 90° oscillation and three speed settings. Sturdy base " +
      "keeps it stable at full speed — ideal for shops and large rooms.",
    specifications: {
      "Blade size": '18"',
      "Speeds": "3",
      "Oscillation": "90°",
      "Height": "Adjustable 110–135 cm",
    },
    tags: ["fan", "pedestal-fan", "18-inch"],
  },
  {
    title: "SwitchPro 4-Gang Smart Switch Plate",
    handle: "switchpro-4-gang-smart-switch-plate",
    sku: "SP-4G-SM",
    brand: "SwitchPro",
    model: "SP-4G-WIFI",
    category: "switches",
    price: 3450,
    stock: 200,
    weightKg: 0.3,
    warranty: "1 year replacement warranty",
    shortDescription: "4-gang WiFi smart switch — control fans and lights from your phone.",
    description:
      "4-gang smart switch plate with WiFi control. Switch fans and lights from your phone or with voice " +
      "assistants, set timers and schedules, and fit it into standard switch boxes.",
    specifications: {
      "Gangs": "4",
      "Connectivity": "WiFi 2.4 GHz",
      "Voice control": "Alexa / Google Assistant",
      "Rating": "10 A per gang",
    },
    tags: ["switch", "smart-switch", "4-gang", "wifi"],
  },
];

/* ── Seed run ─────────────────────────────────────────────── */

async function main() {
  // 1. login
  const auth = await api<{ token: string }>("POST", "/auth/user/emailpass", {
    email: EMAIL,
    password: PASSWORD,
  });
  token = auth.token;
  console.log("✓ logged in");

  // 2. default sales channel + stock location
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

  // 3. categories (parents first — array is already ordered)
  const { product_categories } = await api<{
    product_categories: { id: string; handle: string }[];
  }>("GET", "/admin/product-categories?limit=1000");
  const catIds: Record<string, string> = Object.fromEntries(
    product_categories.map((c) => [c.handle, c.id]),
  );

  for (const c of CATEGORIES) {
    if (catIds[c.handle]) {
      console.log(`· category exists: ${c.handle}`);
      continue;
    }
    const created = await api<{ product_category: { id: string } }>(
      "POST",
      "/admin/product-categories",
      {
        name: c.name,
        handle: c.handle,
        description: c.description,
        is_active: true,
        parent_category_id: c.parent ? catIds[c.parent] : undefined,
      },
    );
    catIds[c.handle] = created.product_category.id;
    console.log(`✓ category created: ${c.handle}`);
  }

  // 4. products
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
        subtitle: p.shortDescription,
        description: p.description,
        status: "published",
        categories: [{ id: catIds[p.category] }],
        tags: await Promise.all(p.tags.map(async (value) => ({ id: await tagId(value) }))),
        sales_channels: [{ id: salesChannelId }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            sku: p.sku,
            options: { Default: "Default" },
            manage_inventory: true,
            prices: [
              {
                amount: (p.salePrice ?? p.price) * 100,
                currency_code: "pkr",
              },
            ],
          },
        ],
        metadata: {
          brand: p.brand,
          model: p.model,
          warranty: p.warranty,
          weight_kg: p.weightKg,
          specifications: p.specifications,
          // Keep the original list price when a sale price is active.
          ...(p.salePrice ? { list_price_pkr: p.price } : {}),
        },
      });
      productId = created.product.id;
      console.log(`✓ product created: ${p.handle} (${productId})`);
    } else {
      console.log(`· product exists: ${p.handle}`);
    }

    // 5. stock levels (best effort — continues on failure)
    if (locationId && productId) {
      try {
        const { variants } = await api<{
          variants: { id: string; sku: string }[];
        }>("GET", `/admin/products/${productId}?fields=variants.id,variants.sku`);
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
        console.log(`  ✓ stock set to ${p.stock} for ${p.sku}`);
      } catch (err) {
        console.warn(`  ! stock setup skipped for ${p.sku}: ${(err as Error).message}`);
      }
    }
  }

  console.log("\nDone — catalog seeded. Verify in Medusa admin → Products.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
