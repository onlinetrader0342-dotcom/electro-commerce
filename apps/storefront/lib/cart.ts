/**
 * Cart state helpers (client-safe).
 *
 * Strategy: the cart lives in localStorage as the source of truth for the
 * UI. Whenever the Medusa backend is reachable (NEXT_PUBLIC_MEDUSA_BACKEND_URL
 * + publishable key), we best-effort mirror the cart into a Medusa store cart
 * so agent C's /checkout can pick it up via `getMedusaCartId()` /
 * `ensureMedusaCart()` without re-adding line items.
 *
 * Nothing here throws — Medusa failures are swallowed and the local cart
 * keeps working.
 */

export interface CartLine {
  /** Stable local id: productId + variant signature */
  id: string;
  productId: string;
  handle: string;
  title: string;
  thumbnail?: string;
  brand?: string;
  /** Major units (rupees) — snapshot at add time; checkout revalidates server-side */
  unitPrice: number;
  currency: string;
  qty: number;
}

export const CART_STORAGE_KEY = "electro-cart-v1";
export const MEDUSA_CART_ID_KEY = "electro-medusa-cart-id";
export const CART_UPDATED_EVENT = "electro:cart-updated";

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""
).replace(/\/$/, "");
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const REGION_ID = process.env.MEDUSA_REGION_ID || "";

function medusaAvailable(): boolean {
  return (
    typeof window !== "undefined" && Boolean(MEDUSA_URL && PUBLISHABLE_KEY)
  );
}

// ---------------------------------------------------------------------------
// Local storage
// ---------------------------------------------------------------------------

export function loadLocalCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  } catch {
    // storage unavailable — cart stays in memory for this session
  }
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
}

// ---------------------------------------------------------------------------
// Medusa store-cart mirroring (best-effort)
// ---------------------------------------------------------------------------

async function medusaRequest(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    ...init,
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Medusa cart ${path} -> ${res.status}`);
  return res.json();
}

function getStoredMedusaCartId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MEDUSA_CART_ID_KEY);
}

function setStoredMedusaCartId(id: string): void {
  try {
    window.localStorage.setItem(MEDUSA_CART_ID_KEY, id);
  } catch {
    /* ignore */
  }
}

/**
 * Returns the Medusa store cart id for this browser, creating one if needed.
 * Used by /checkout (agent C) to load the real server-side cart.
 */
export async function ensureMedusaCart(): Promise<string | null> {
  if (!medusaAvailable()) return null;
  const existing = getStoredMedusaCartId();
  if (existing) return existing;
  try {
    const data = (await medusaRequest("/store/carts", {
      method: "POST",
      body: JSON.stringify(REGION_ID ? { region_id: REGION_ID } : {}),
    })) as { cart?: { id?: string } };
    const id = data?.cart?.id;
    if (id) {
      setStoredMedusaCartId(id);
      return id;
    }
    return null;
  } catch {
    return null;
  }
}

export function getMedusaCartId(): string | null {
  return getStoredMedusaCartId();
}

function clearStoredMedusaCartId(): void {
  try {
    window.localStorage.removeItem(MEDUSA_CART_ID_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Best-effort: rebuild the Medusa cart's line items from local lines.
 * Medusa needs variant ids; we send productId as variant_id and let the
 * backend/checkout validation resolve it. Failures are swallowed — the
 * local cart remains authoritative for the UI.
 */
export async function syncCartToMedusa(lines: CartLine[]): Promise<void> {
  if (!medusaAvailable()) return;
  try {
    const cartId = await ensureMedusaCart();
    if (!cartId) return;

    // Simplest robust sync: create a fresh cart and add lines.
    const data = (await medusaRequest("/store/carts", {
      method: "POST",
      body: JSON.stringify(REGION_ID ? { region_id: REGION_ID } : {}),
    })) as { cart?: { id?: string } };
    const freshId = data?.cart?.id;
    if (!freshId) return;
    setStoredMedusaCartId(freshId);

    for (const line of lines) {
      try {
        await medusaRequest(`/store/carts/${freshId}/line-items`, {
          method: "POST",
          body: JSON.stringify({
            variant_id: line.productId,
            quantity: line.qty,
          }),
        });
      } catch {
        // per-line failures shouldn't kill the whole sync
      }
    }
  } catch {
    clearStoredMedusaCartId();
  }
}
