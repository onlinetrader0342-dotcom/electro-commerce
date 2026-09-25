import "server-only";

/**
 * Shipping abstraction layer.
 *
 * The storefront talks only to the ShippingProvider interface. Today it is
 * backed by a static zone table (suitable for Pakistan-wide flat rates);
 * tomorrow it can be swapped for TCS/Leopards/PostEx/etc. adapters without
 * touching checkout code.
 */

export interface ShippingAddress {
  city: string;
  province: string;
  country: string;
  postalCode?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  /** Major units (PKR). */
  price: number;
  currency: string;
  etaDays: [number, number];
}

export interface ShippingProvider {
  readonly id: string;
  listMethods(address: ShippingAddress): Promise<ShippingMethod[]>;
  getMethod(id: string): Promise<ShippingMethod | null>;
}

const CURRENCY = process.env.DEFAULT_CURRENCY || "PKR";

/** Free standard shipping threshold (major units). 0 = disabled. */
const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD ?? 50000,
);

class StaticShippingProvider implements ShippingProvider {
  readonly id = "static";

  private base(): ShippingMethod[] {
    return [
      {
        id: "standard",
        name: "Standard Delivery",
        description: "Pakistan-wide delivery via courier (3–5 working days).",
        price: 250,
        currency: CURRENCY,
        etaDays: [3, 5],
      },
      {
        id: "express",
        name: "Express Delivery",
        description: "Priority dispatch (1–2 working days, major cities).",
        price: 450,
        currency: CURRENCY,
        etaDays: [1, 2],
      },
      {
        id: "pickup",
        name: "Store Pickup",
        description: "Pick up from Imran Electric Store — no delivery fee.",
        price: 0,
        currency: CURRENCY,
        etaDays: [0, 1],
      },
    ];
  }

  async listMethods(_address: ShippingAddress): Promise<ShippingMethod[]> {
    // Single national zone for now; per-city zones can be added here later.
    return this.base();
  }

  async getMethod(id: string): Promise<ShippingMethod | null> {
    return this.base().find((m) => m.id === id) ?? null;
  }
}

let provider: ShippingProvider | null = null;

/** Swap this to plug a courier API adapter later. */
export function getShippingProvider(): ShippingProvider {
  if (!provider) provider = new StaticShippingProvider();
  return provider;
}

/** Shipping fee for a method, applying the free-shipping threshold. */
export function shippingFeeFor(
  method: ShippingMethod,
  subtotal: number,
): number {
  if (method.id === "pickup") return 0;
  if (FREE_SHIPPING_THRESHOLD > 0 && subtotal >= FREE_SHIPPING_THRESHOLD)
    return 0;
  return method.price;
}
