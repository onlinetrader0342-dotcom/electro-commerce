import "server-only";

/**
 * Payment abstraction layer.
 *
 * Checkout references payment methods by id only. Each method declares
 * whether it needs an online capture step. Providers (JazzCash, EasyPaisa,
 * cards via Stripe/Paymob, …) are added as new entries/adapters — the
 * checkout flow does not change.
 */

export type PaymentMethodId = "cod" | "bank_transfer" | "card";

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description: string;
  /** True when money must be captured online during checkout. */
  requiresOnlineCapture: boolean;
  /** False = shown as "coming soon", cannot be selected. */
  enabled: boolean;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cod",
    name: "Cash on Delivery",
    description: "Pay in cash when your order arrives.",
    requiresOnlineCapture: false,
    enabled: true,
  },
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    description:
      "Transfer to our bank account after placing the order; we confirm on receipt.",
    requiresOnlineCapture: false,
    enabled: true,
  },
  {
    id: "card",
    name: "Debit / Credit Card",
    description: "Online card payments — coming soon.",
    requiresOnlineCapture: true,
    enabled: false,
  },
];

export function getPaymentMethod(id: string): PaymentMethod | null {
  return (
    PAYMENT_METHODS.find((m) => m.id === id && m.enabled) ?? null
  );
}

export function listPaymentMethods(): PaymentMethod[] {
  return PAYMENT_METHODS;
}
