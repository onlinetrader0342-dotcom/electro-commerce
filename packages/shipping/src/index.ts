/**
 * Shipping abstraction layer.
 *
 * The application talks to `ShippingProvider`; zones, methods and rates are
 * configuration, and the courier itself is swappable via `SHIPPING_PROVIDER`.
 * Medusa's fulfilment/shipping-option records remain the source of truth for
 * what the customer sees at checkout — this package models the *provider*
 * contract behind them.
 */
import type { Money } from "@electro-commerce/types";

export interface ShippingContext {
  country: string; // ISO-2, e.g. "PK"
  city?: string;
  postalCode?: string;
  subtotal: Money;
  totalWeightKg?: number;
  itemCount: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  estimatedDelivery?: string; // e.g. "2–4 working days"
}

export interface ShipmentInput {
  orderId: string;
  methodId: string;
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode?: string;
    country: string;
  };
  totalWeightKg?: number;
  codAmount?: Money; // collect cash on delivery
}

export interface ShipmentResult {
  providerId: string;
  /** Courier consignment / tracking number. */
  trackingNumber?: string;
  labelUrl?: string;
}

export interface ShippingProvider {
  readonly id: string;
  readonly name: string;
  listMethods(ctx: ShippingContext): Promise<ShippingMethod[]>;
  calculateRate(methodId: string, ctx: ShippingContext): Promise<Money>;
  createShipment(input: ShipmentInput): Promise<ShipmentResult>;
}

export class NotConfiguredError extends Error {
  constructor(provider: string, hint: string) {
    super(`${provider} is not configured: ${hint}`);
    this.name = "NotConfiguredError";
  }
}

/* ── Flat rate (launch default) ───────────────────────────── */

export interface FlatRateRule {
  methodId: string;
  name: string;
  description?: string;
  estimatedDelivery?: string;
  /** Flat amount in major currency units. */
  flatAmount: number;
  currency: "PKR";
  /** Orders at/above this subtotal ship free with this method. */
  freeAbove?: number;
  /** Max weight this method accepts (kg). */
  maxWeightKg?: number;
}

const DEFAULT_FLAT_RATES: FlatRateRule[] = [
  {
    methodId: "standard",
    name: "Standard Delivery",
    description: "Nationwide delivery via courier",
    estimatedDelivery: "2–4 working days",
    flatAmount: 250,
    currency: "PKR",
    freeAbove: 50000,
  },
  {
    methodId: "express",
    name: "Express Delivery",
    description: "Priority nationwide delivery",
    estimatedDelivery: "1–2 working days",
    flatAmount: 450,
    currency: "PKR",
  },
];

export class FlatRateProvider implements ShippingProvider {
  readonly id = "flat_rate";
  readonly name = "Flat Rate Shipping";

  constructor(private readonly rules: FlatRateRule[] = DEFAULT_FLAT_RATES) {}

  async listMethods(ctx: ShippingContext): Promise<ShippingMethod[]> {
    return this.rules
      .filter(
        (r) =>
          r.maxWeightKg == null ||
          (ctx.totalWeightKg ?? 0) <= r.maxWeightKg,
      )
      .map((r) => ({
        id: r.methodId,
        name: r.name,
        description: r.description,
        estimatedDelivery: r.estimatedDelivery,
      }));
  }

  async calculateRate(methodId: string, ctx: ShippingContext): Promise<Money> {
    const rule = this.rules.find((r) => r.methodId === methodId);
    if (!rule) throw new Error(`Unknown shipping method: ${methodId}`);
    const free =
      rule.freeAbove != null && ctx.subtotal.amount >= rule.freeAbove;
    return { amount: free ? 0 : rule.flatAmount, currency: rule.currency };
  }

  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    // Flat-rate has no courier API — the warehouse books the courier
    // manually and enters the tracking number in Medusa admin.
    return {
      providerId: this.id,
      trackingNumber: `MANUAL-${input.orderId}`,
    };
  }
}

/* ── TCS (Pakistan courier — stub until credentials exist) ── */

export class TcsProvider implements ShippingProvider {
  readonly id = "tcs";
  readonly name = "TCS Courier";

  constructor() {
    if (!process.env.TCS_API_KEY || !process.env.TCS_ACCOUNT_NO) {
      throw new NotConfiguredError(
        "TcsProvider",
        "set TCS_API_KEY and TCS_ACCOUNT_NO in the environment",
      );
    }
  }

  async listMethods(): Promise<ShippingMethod[]> {
    throw new Error("TcsProvider.listMethods: wire the TCS rate API");
  }

  async calculateRate(): Promise<Money> {
    throw new Error("TcsProvider.calculateRate: wire the TCS rate API");
  }

  async createShipment(): Promise<ShipmentResult> {
    // Integration point: TCS booking API → consignment number (CN).
    throw new Error("TcsProvider.createShipment: wire the TCS booking API");
  }
}

/** Resolve the active provider from `SHIPPING_PROVIDER` (default: flat_rate). */
export function resolveShippingProvider(
  providerId: string = process.env.SHIPPING_PROVIDER ?? "flat_rate",
): ShippingProvider {
  switch (providerId.toLowerCase()) {
    case "tcs":
      return new TcsProvider();
    case "flat_rate":
    default:
      return new FlatRateProvider();
  }
}
