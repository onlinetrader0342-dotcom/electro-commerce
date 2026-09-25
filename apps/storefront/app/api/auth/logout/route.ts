import { NextResponse } from "next/server";
import { clearCustomerSession } from "@/lib/customer-auth";

/** POST /api/auth/logout — clears the customer session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearCustomerSession(res);
  return res;
}
