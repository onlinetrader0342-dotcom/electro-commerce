/**
 * Payment abstraction layer.
 *
 * The whole application talks to `PaymentProvider`, never to a concrete
 * gateway. Switching provider = changing `PAYMENT_PROVIDER` (and wiring the
 * provider's module in apps/medusa) — no checkout code changes.
 *
 * SECURITY — never trust client-side prices:
 * `createSession()` must ALWAYS be called server-side with the order total
 * computed by Medusa from the cart (server-side price + stock validation).
 * The amount passed here is informational/auditing; the charge is created
 * against the server-computed total.
 */
import type { Money } from "@electro-commerce/types";

export type PaymentStatus =
  | "pending"
  | "requires_action"
  | "authorized"
  | "captured"
  | "refunded"
  | "voided"
  | "failed";

export interface PaymentSessionInput {
  /** Medusa order id (server-generated). */
  orderId: string;
  /** Server-computed order total. NEVER take this from the client. */
  amount: Money;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface PaymentSessionResult {
  providerId: string;
  /** Provider-side payment/session id — store on the Medusa payment. */
  sessionId: string;
  status: PaymentStatus;
  /** Where to redirect the customer (card gateways). Undefined for COD. */
  redirectUrl?: string;
}

export type PaymentWebhookType =
  | "payment.captured"
  | "payment.failed"
  | "payment.refunded"
  | "payment.requires_action";

export interface PaymentWebhookEvent {
  type: PaymentWebhookType;
  providerPaymentId: string;
  orderId?: string;
  amount?: Money;
}

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  createSession(input: PaymentSessionInput): Promise<PaymentSessionResult>;
  capturePayment(
    providerPaymentId: string,
    amount?: Money,
  ): Promise<{ status: PaymentStatus }>;
  refundPayment(
    providerPaymentId: string,
    amount?: Money,
    reason?: string,
  ): Promise<{ status: PaymentStatus }>;
  /** Verify signature + normalize the provider webhook into our event. */
  parseWebhook(
    rawBody: string | Buffer,
    signature?: string,
  ): Promise<PaymentWebhookEvent>;
}

export class NotConfiguredError extends Error {
  constructor(provider: string, hint: string) {
    super(`${provider} is not configured: ${hint}`);
    this.name = "NotConfiguredError";
  }
}

/* ── Cash on Delivery (Pakistan launch default) ───────────── */

export class CodProvider implements PaymentProvider {
  readonly id = "cod";
  readonly name = "Cash on Delivery";

  async createSession(input: PaymentSessionInput): Promise<PaymentSessionResult> {
    // No money moves now; the order is confirmed and paid on delivery.
    return {
      providerId: this.id,
      sessionId: `cod_${input.orderId}`,
      status: "pending",
    };
  }

  /** Called by the admin/fulfilment flow when cash is collected. */
  async capturePayment(providerPaymentId: string) {
    return { status: "captured" as PaymentStatus, providerPaymentId };
  }

  /** COD refunds are manual (cash handed back); we just void the record. */
  async refundPayment(providerPaymentId: string) {
    return { status: "voided" as PaymentStatus, providerPaymentId };
  }

  async parseWebhook(): Promise<PaymentWebhookEvent> {
    throw new Error("CodProvider has no webhooks");
  }
}

/* ── Stripe (stub — wire when the business is ready) ──────── */

export class StripeProvider implements PaymentProvider {
  readonly id = "stripe";
  readonly name = "Stripe";

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new NotConfiguredError(
        "StripeProvider",
        "set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) in the environment",
      );
    }
  }

  async createSession(): Promise<PaymentSessionResult> {
    // Integration point: create a Stripe PaymentIntent with the
    // SERVER-computed amount (minor units) and return its client_secret.
    // Kept as a stub until card payments are actually enabled.
    throw new Error(
      "StripeProvider.createSession: wire the Stripe SDK in apps/medusa payment module",
    );
  }

  async capturePayment(): Promise<{ status: PaymentStatus }> {
    throw new Error("StripeProvider.capturePayment: not wired yet");
  }

  async refundPayment(): Promise<{ status: PaymentStatus }> {
    throw new Error("StripeProvider.refundPayment: not wired yet");
  }

  async parseWebhook(
    rawBody: string | Buffer,
    signature?: string,
  ): Promise<PaymentWebhookEvent> {
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("StripeProvider.parseWebhook: missing signature/secret");
    }
    // Integration point: stripe.webhooks.constructEvent(rawBody, signature, secret)
    // then map to PaymentWebhookEvent. Stub until wired.
    throw new Error("StripeProvider.parseWebhook: not wired yet");
  }
}

/** Resolve the active provider from `PAYMENT_PROVIDER` (default: cod). */
export function resolvePaymentProvider(
  providerId: string = process.env.PAYMENT_PROVIDER ?? "cod",
): PaymentProvider {
  switch (providerId.toLowerCase()) {
    case "stripe":
      return new StripeProvider();
    case "cod":
    default:
      return new CodProvider();
  }
}
