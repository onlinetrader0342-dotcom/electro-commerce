import { NextRequest, NextResponse } from "next/server";
import {
  loginCustomer,
  parseAuthBody,
  setCustomerSession,
} from "@/lib/customer-auth";
import { MedusaError } from "@/lib/commerce";

/**
 * POST /api/auth/login { email, password }
 * Authenticates against Medusa, stores the JWT in an httpOnly cookie.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const { email, password } = parseAuthBody(body);
    const { token, customer } = await loginCustomer({ email, password });
    const res = NextResponse.json({ ok: true, customer });
    setCustomerSession(res, token);
    return res;
  } catch (err) {
    const status = err instanceof MedusaError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login failed." },
      { status },
    );
  }
}
