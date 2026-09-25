import "server-only";
import { NextResponse } from "next/server";

/**
 * Shared helper for /api/v1/commerce/* stubs.
 *
 * These transactional endpoints are intentionally NOT implemented yet:
 * they require customer JWT auth and a hardened cart/checkout flow.
 * Each stub returns 501 with its planned interface so integrators can
 * build against the contract. Scope is separate from ai:read.
 */

export interface CommerceStubSpec {
  method: "POST" | "GET" | "PATCH" | "DELETE";
  auth: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
}

export function commerceStub(
  name: string,
  spec: CommerceStubSpec,
): Response {
  return NextResponse.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: `${name} is coming soon. The interface below is the planned contract.`,
      },
      interface: {
        endpoint: name,
        method: spec.method,
        auth: spec.auth,
        scope: "commerce:write (customer JWT — separate from ai:read)",
        request: spec.request,
        response: spec.response,
      },
    },
    { status: 501 },
  );
}

export function requireCustomerJwt(req: Request): Response | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || auth.length < 12) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message:
            "Customer sign-in required. Send Authorization: Bearer <customer-jwt>.",
        },
      },
      { status: 401 },
    );
  }
  return null;
}
