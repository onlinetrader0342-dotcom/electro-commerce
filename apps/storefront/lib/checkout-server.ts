import "server-only";
import {
  fromMinorUnits,
  MedusaError,
  medusaRegionId,
  storeFetch,
} from "./commerce";
import { getPaymentMethod, type PaymentMethod } from "./payments";
import {
  checkoutPayloadSchema,
  zodIssueList,
} from "./validation";
import {
  getShippingProvider,
  shippingFeeFor,
  type ShippingMethod,
} from "./shipping";

/**
 * Server-side checkout: validation + order creation.
 *
 * SECURITY: client-submitted prices are NEVER trusted. Every line item is
 * re-fetched from Medusa (price + stock) and totals are recomputed here.
 * Any mismatch -> 422 with per-line details.
 */

// ---------------------------------------------------------------- types ---

export interface CheckoutItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CheckoutAddressInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode?: string;
  country?: string;
}

export interface CheckoutInput {
  items: CheckoutItemInput[];
  address: CheckoutAddressInput;
  shippingMethodId: string;
  paymentMethodId: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface ValidatedLine {
  productId: string;
  variantId: string;
  title: string;
  sku: string | null;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ValidatedCheckout {
  lines: ValidatedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  address: Required<CheckoutAddressInput>;
  notes?: string;
  idempotencyKey?: string;
}

export type ValidationResult =
  | { ok: true; checkout: ValidatedCheckout }
  | { ok: false; errors: string[] };

// ------------------------------------------------------------ validation ---

const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "PKR";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length >= min && t.length <= max ? t : null;
}

function parseInput(input: unknown): CheckoutInput | string[] {
  const parsed = checkoutPayloadSchema.safeParse(input);
  if (!parsed.success) return zodIssueList(parsed.error);
  const v = parsed.data;
  return {
    items: v.items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
    })),
    address: {
      firstName: v.address.firstName,
      lastName: v.address.lastName,
      phone: v.address.phone,
      email: v.address.email,
      address1: v.address.address1,
      address2: v.address.address2,
      city: v.address.city,
      province: v.address.province,
      postalCode: v.address.postalCode,
      country: v.address.country,
    },
    shippingMethodId: v.shippingMethodId,
    paymentMethodId: v.paymentMethodId,
    notes: v.notes,
    idempotencyKey: v.idempotencyKey,
  };
}

interface RawCheckoutProduct {
  id: string;
  title: string;
  thumbnail?: string | null;
  variants?: {
    id: string;
    sku?: string | null;
    inventory_quantity?: number | null;
    prices?: { amount: number; currency_code: string }[] | null;
  }[] | null;
}

/**
 * Re-fetch every line from Medusa and recompute totals. Client prices,
 * discounts and totals are ignored entirely.
 */
export async function validateCheckout(
  input: unknown,
): Promise<ValidationResult> {
  const parsed = parseInput(input);
  if (Array.isArray(parsed)) return { ok: false, errors: parsed };

  const shippingProvider = getShippingProvider();
  const shippingMethod = await shippingProvider.getMethod(
    parsed.shippingMethodId,
  );
  if (!shippingMethod)
    return { ok: false, errors: ["Unknown shipping method."] };

  const paymentMethod = getPaymentMethod(parsed.paymentMethodId);
  if (!paymentMethod)
    return {
      ok: false,
      errors: ["Unknown or unavailable payment method."],
    };

  const errors: string[] = [];
  const lines: ValidatedLine[] = [];
  let currency = DEFAULT_CURRENCY;

  for (const item of parsed.items) {
    let raw: RawCheckoutProduct;
    try {
      const res = await storeFetch<{ products: RawCheckoutProduct[] }>(
        "/store/products",
        {
          params: {
            id: item.productId,
            limit: 1,
            fields:
              "id,title,thumbnail,variants.id,variants.sku,variants.inventory_quantity,variants.prices",
          },
        },
      );
      const found = res.products[0];
      if (!found) {
        errors.push(`Product ${item.productId} is no longer available.`);
        continue;
      }
      raw = found;
    } catch (err) {
      errors.push(
        `Could not verify product ${item.productId}: ${err instanceof MedusaError ? `backend ${err.status}` : "backend unreachable"}.`,
      );
      continue;
    }

    const variants = raw.variants ?? [];
    const variant = item.variantId
      ? variants.find((v) => v.id === item.variantId)
      : (variants[0] ?? null);
    if (!variant) {
      errors.push(`"${raw.title}": selected variant is unavailable.`);
      continue;
    }

    const priceEntry =
      (variant.prices ?? []).find(
        (pr) => pr.currency_code?.toUpperCase() === currency.toUpperCase(),
      ) ?? variant.prices?.[0];
    if (!priceEntry) {
      errors.push(`"${raw.title}": no price available.`);
      continue;
    }
    const unitPrice = fromMinorUnits(priceEntry.amount);
    currency = (priceEntry.currency_code || currency).toUpperCase();

    if (
      typeof variant.inventory_quantity === "number" &&
      variant.inventory_quantity < item.quantity
    ) {
      errors.push(
        `"${raw.title}": only ${variant.inventory_quantity} in stock.`,
      );
      continue;
    }

    lines.push({
      productId: raw.id,
      variantId: variant.id,
      title: raw.title,
      sku: variant.sku ?? null,
      image: raw.thumbnail ?? null,
      unitPrice,
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    });
  }

  if (errors.length) return { ok: false, errors };
  if (!lines.length) return { ok: false, errors: ["Cart is empty."] };

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = shippingFeeFor(shippingMethod, subtotal);
  const total = subtotal + shipping;

  return {
    ok: true,
    checkout: {
      lines,
      subtotal,
      shipping,
      total,
      currency,
      shippingMethod,
      paymentMethod,
      address: {
        ...parsed.address,
        email: parsed.address.email ?? "",
        address2: parsed.address.address2 ?? "",
        postalCode: parsed.address.postalCode ?? "",
        country: parsed.address.country ?? "Pakistan",
      },
      notes: parsed.notes,
      idempotencyKey: parsed.idempotencyKey,
    },
  };
}

// ------------------------------------------------------- order creation ---

/**
 * Create a Medusa order from an already-validated checkout.
 *
 * ASSUMED Medusa v2 store flow (agent A owns the backend — confirm):
 *   POST /store/carts { region_id? }                       -> { cart }
 *   POST /store/carts/:id/line-items { variant_id, quantity }
 *   POST /store/carts/:id { email, shipping_address }       -> { cart }
 *   GET  /store/shipping-options?cart_id=:id               -> { shipping_options }
 *   POST /store/carts/:id/shipping-methods { option_id }
 *   POST /store/payment-collections { cart_id }             -> { payment_collection }
 *   POST /store/payment-collections/:id/payment-sessions { provider_id }
 *        (provider_id "cod" must be registered on the backend for COD)
 *   POST /store/carts/:id/complete                         -> { order } | { type: "order", order }
 */
export async function createOrderFromCheckout(
  v: ValidatedCheckout,
  customerToken?: string,
): Promise<{ orderId: string; displayId?: string | number }> {
  const authHeaders = customerToken
    ? { authorization: `Bearer ${customerToken}` }
    : undefined;
  const idemHeaders = v.idempotencyKey
    ? { "Idempotency-Key": v.idempotencyKey }
    : undefined;

  // 1. Cart
  const cartRes = await storeFetch<{ cart: { id: string } }>("/store/carts", {
    method: "POST",
    headers: { ...authHeaders, ...idemHeaders },
    body: JSON.stringify({ region_id: medusaRegionId() }),
  });
  const cartId = cartRes.cart.id;

  // 2. Line items (server-verified variant ids + quantities only)
  for (const line of v.lines) {
    await storeFetch(`/store/carts/${cartId}/line-items`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        variant_id: line.variantId,
        quantity: line.quantity,
      }),
    });
  }

  // 3. Address
  const a = v.address;
  await storeFetch(`/store/carts/${cartId}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      email: a.email || undefined,
      shipping_address: {
        first_name: a.firstName,
        last_name: a.lastName,
        phone: a.phone,
        address_1: a.address1,
        address_2: a.address2 || undefined,
        city: a.city,
        province: a.province,
        postal_code: a.postalCode || undefined,
        country_code: "pk",
      },
    }),
  });

  // 4. Shipping method — match a Medusa shipping option by name, else first.
  const shipRes = await storeFetch<{
    shipping_options: { id: string; name: string; provider_id: string }[];
  }>("/store/shipping-options", {
    params: { cart_id: cartId },
    headers: authHeaders,
  });
  const options = shipRes.shipping_options ?? [];
  const match =
    options.find((o) =>
      o.name.toLowerCase().includes(v.shippingMethod.name.split(" ")[0].toLowerCase()),
    ) ?? options[0];
  if (!match) throw new MedusaError(502, "No shipping options returned by Medusa.");
  await storeFetch(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ option_id: match.id }),
  });

  // 5. Payment collection + session (COD needs a "cod" provider on Medusa).
  const pcRes = await storeFetch<{
    payment_collection: { id: string };
  }>("/store/payment-collections", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ cart_id: cartId }),
  });
  const pcId = pcRes.payment_collection.id;
  await storeFetch(
    `/store/payment-collections/${pcId}/payment-sessions`,
    {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ provider_id: v.paymentMethod.id }),
    },
  );

  // 6. Complete
  const done = await storeFetch<{
    type?: string;
    id?: string;
    order?: { id: string; display_id?: string | number };
  }>(`/store/carts/${cartId}/complete`, {
    method: "POST",
    headers: authHeaders,
  });
  // Medusa v2 returns { type: "order", order: {...} }; tolerate a bare order too.
  const order =
    done.order ??
    (done.type === "order" && done.id
      ? { id: done.id, display_id: undefined as string | number | undefined }
      : undefined);
  if (!order?.id) throw new MedusaError(502, "Cart completion did not return an order.");
  return { orderId: order.id, displayId: order.display_id };
}
