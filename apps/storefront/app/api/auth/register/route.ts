import { NextRequest, NextResponse } from "next/server";
import {
  parseAuthBody,
  registerCustomer,
  setCustomerSession,
} from "@/lib/customer-auth";
import { MedusaError } from "@/lib/commerce";

/**
 * POST /api/auth/register { email, password, firstName, lastName, phone? }
 * Registers via Medusa, stores the JWT in an httpOnly cookie.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const parsed = parseAuthBody(body);
    if (!parsed.firstName?.trim() || !parsed.lastName?.trim()) {
      return NextResponse.json(
        { error: "First and last name are required." },
        { status: 400 },
      );
    }
    const { token, customer } = await registerCustomer({
      email: parsed.email,
      password: parsed.password,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone,
    });
    const res = NextResponse.json({ ok: true, customer });
    setCustomerSession(res, token);
    return res;
  } catch (err) {
    const status = err instanceof MedusaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed." },
      { status },
    );
  }
}
