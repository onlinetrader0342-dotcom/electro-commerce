import "server-only";

/**
 * Minimal Medusa HTTP helper for RAW/ADMIN/AUTH endpoints.
 *
 * OWNERSHIP: agent B owns `lib/medusa.ts` — the typed Store API client used
 * by all shop pages (with fixture fallback). It now exists. This module is
 * kept for everything B's client does NOT cover: raw fetches with custom
 * params/fields, admin API (`MEDUSA_ADMIN_API_KEY`), customer auth, cart
 * lifecycle, payment collections, the blog module and the ai_keys module.
 * New code should prefer `lib/medusa.ts` for typed catalog reads.
 *
 * Server-only: never import from client components.
 */

const MEDUSA_BACKEND_URL = (
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "";

const ADMIN_KEY = process.env.MEDUSA_ADMIN_API_KEY || "";
/** Auth scheme for the Medusa v2 admin API key. Override via env if the backend differs. */
const ADMIN_AUTH_SCHEME = process.env.MEDUSA_ADMIN_AUTH_SCHEME || "Bearer";

const REGION_ID = process.env.MEDUSA_REGION_ID || "";

export class MedusaError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "MedusaError";
    this.status = status;
  }
}

export interface CommerceFetchOptions extends Omit<RequestInit, "headers"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /** Next.js Data Cache tags (works with revalidateTag). */
  tags?: string[];
  /** Next.js Data Cache revalidate seconds. */
  revalidate?: number | false;
}

function buildUrl(
  path: string,
  params?: CommerceFetchOptions["params"],
): string {
  const url = new URL(
    path.startsWith("http")
      ? path
      : `${MEDUSA_BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  path: string,
  opts: CommerceFetchOptions & { admin?: boolean },
): Promise<T> {
  const { params, tags, revalidate, headers: extraHeaders, admin, ...init } =
    opts;
  const headers = new Headers();
  headers.set("accept", "application/json");
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (admin) {
    if (ADMIN_KEY) headers.set("authorization", `${ADMIN_AUTH_SCHEME} ${ADMIN_KEY}`);
  } else if (PUBLISHABLE_KEY) {
    headers.set("x-publishable-api-key", PUBLISHABLE_KEY);
  }
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      // Fail fast when the backend sleeps/is unreachable; callers map this
      // to 503. An explicitly passed signal still wins via ...init.
      signal: AbortSignal.timeout(15000),
      ...init,
      headers,
      ...(tags !== undefined || revalidate !== undefined
        ? { next: { tags, revalidate } }
        : {}),
    });
  } catch (err) {
    throw new MedusaError(
      503,
      `Medusa backend unreachable at ${MEDUSA_BACKEND_URL}: ${(err as Error).message}`,
    );
  }
  if (res.status === 204 || res.status === 205) return undefined as T;
  const text = await res.text();
  if (!res.ok) {
    throw new MedusaError(
      res.status,
      `Medusa ${res.status} on ${path}: ${text.slice(0, 400)}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MedusaError(502, `Medusa returned non-JSON on ${path}`);
  }
}

/** Authenticated as the storefront (publishable key). */
export function storeFetch<T>(
  path: string,
  opts: CommerceFetchOptions = {},
): Promise<T> {
  return request<T>(path, { ...opts, admin: false });
}

/** Authenticated as admin (MEDUSA_ADMIN_API_KEY). Server-only. */
export function adminFetch<T>(
  path: string,
  opts: CommerceFetchOptions = {},
): Promise<T> {
  return request<T>(path, { ...opts, admin: true });
}

export function medusaBaseUrl(): string {
  return MEDUSA_BACKEND_URL;
}

export function medusaRegionId(): string | undefined {
  return REGION_ID || undefined;
}

export function hasAdminKey(): boolean {
  return ADMIN_KEY.length > 0;
}

/**
 * Medusa v2 money amounts are integers in the currency's minor unit
 * (e.g. paisa for PKR). Convert to major units (rupees).
 * If the backend seeds amounts already in major units, change this
 * single function.
 */
export function fromMinorUnits(amount: number): number {
  return amount / 100;
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}
