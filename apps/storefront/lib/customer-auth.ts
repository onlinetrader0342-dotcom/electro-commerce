import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { MedusaError, medusaBaseUrl, storeFetch } from "./commerce";

/**
 * Medusa customer auth (email/password) + httpOnly session cookie.
 *
 * ASSUMED Medusa v2 endpoints (agent A owns the backend — confirm):
 *   POST /auth/customer/emailpass/register { email, password } -> { token }
 *   POST /auth/customer/emailpass { email, password }          -> { token }
 *   GET  /store/customers/me            (Bearer token)         -> { customer }
 *   POST /store/customers { first_name, last_name, phone }     -> { customer }
 *   GET  /store/customers/me/orders      (Bearer token)         -> { orders: [] }
 *   GET  /store/orders/:id              (Bearer token)         -> { order }
 *
 * The raw JWT lives only in an httpOnly cookie — never in page props.
 */

export const CUSTOMER_COOKIE = "ec_customer";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export interface Customer {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

export interface OrderSummary {
  id: string;
  display_id?: string | number;
  total: number;
  currency_code: string;
  status?: string;
  created_at: string;
}

export interface OrderDetail extends OrderSummary {
  items: {
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    thumbnail?: string | null;
  }[];
  shipping_address?: Record<string, unknown> | null;
  shipping_total?: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

async function authCall(
  path: string,
  body: Record<string, unknown>,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${medusaBaseUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new MedusaError(
      503,
      `Auth backend unreachable: ${(err as Error).message}`,
    );
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = `Authentication failed (${res.status}).`;
    try {
      const j = JSON.parse(text) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* keep default */
    }
    throw new MedusaError(res.status === 401 ? 401 : 400, msg);
  }
  const json = JSON.parse(text) as { token?: string };
  if (!json.token) throw new MedusaError(502, "Auth did not return a token.");
  return json.token;
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ token: string; customer: Customer | null }> {
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) throw new MedusaError(400, "Invalid email address.");
  if (input.password.length < 8)
    throw new MedusaError(400, "Password must be at least 8 characters.");
  if (!input.firstName.trim() || !input.lastName.trim())
    throw new MedusaError(400, "First and last name are required.");

  const token = await authCall("/auth/customer/emailpass/register", {
    email,
    password: input.password,
  });

  // Attach profile details to the customer record.
  let customer: Customer | null = null;
  try {
    const res = await storeFetch<{ customer: Customer }>("/store/customers", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        phone: input.phone?.trim() || undefined,
      }),
    });
    customer = res.customer;
  } catch {
    customer = await getCustomer(token);
  }
  return { token, customer };
}

export async function loginCustomer(input: {
  email: string;
  password: string;
}): Promise<{ token: string; customer: Customer | null }> {
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) throw new MedusaError(400, "Invalid email address.");
  if (!input.password) throw new MedusaError(400, "Password is required.");
  const token = await authCall("/auth/customer/emailpass", {
    email,
    password: input.password,
  });
  const customer = await getCustomer(token);
  return { token, customer };
}

export async function getCustomer(token: string): Promise<Customer | null> {
  try {
    const res = await storeFetch<{ customer: Customer }>(
      "/store/customers/me",
      { headers: { authorization: `Bearer ${token}` } },
    );
    return res.customer ?? null;
  } catch (err) {
    if (err instanceof MedusaError && err.status === 401) return null;
    throw err;
  }
}

export async function listCustomerOrders(
  token: string,
): Promise<OrderSummary[]> {
  const res = await storeFetch<{ orders: OrderSummary[] }>(
    "/store/customers/me/orders",
    { headers: { authorization: `Bearer ${token}` } },
  );
  return res.orders ?? [];
}

export async function getCustomerOrder(
  token: string,
  id: string,
): Promise<OrderDetail | null> {
  try {
    const res = await storeFetch<{ order: OrderDetail }>(
      `/store/orders/${encodeURIComponent(id)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    return res.order ?? null;
  } catch (err) {
    if (err instanceof MedusaError && err.status === 404) return null;
    throw err;
  }
}

// ------------------------------------------------------- cookies ---

export function setCustomerSession(res: NextResponse, token: string): void {
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearCustomerSession(res: NextResponse): void {
  res.cookies.set(CUSTOMER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getCustomerToken(req: NextRequest): string | undefined {
  return req.cookies.get(CUSTOMER_COOKIE)?.value || undefined;
}

export function parseAuthBody(body: unknown): {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
} {
  if (!isRecord(body)) throw new MedusaError(400, "Invalid request body.");
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!validEmail(email)) throw new MedusaError(400, "Invalid email address.");
  if (!password) throw new MedusaError(400, "Password is required.");
  return {
    email: email.toLowerCase(),
    password,
    firstName: typeof body.firstName === "string" ? body.firstName : undefined,
    lastName: typeof body.lastName === "string" ? body.lastName : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
  };
}
