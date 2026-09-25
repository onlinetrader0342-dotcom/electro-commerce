import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * POST /api/admin/login { password }
 * Simple password gate for /admin/*. Sets an httpOnly cookie (ec_admin=1).
 *
 * This is a STARTING POINT, not production auth: a single shared password,
 * no brute-force protection beyond middleware rate limits, no audit log.
 * Replace with Medusa admin user auth (or SSO) before real use —
 * see BUILD_NOTES.md.
 */

const ADMIN_COOKIE = "ec_admin";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return ha.length === hb.length && timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Admin access is not configured (ADMIN_PASSWORD missing)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const password =
    typeof (body as { password?: unknown }).password === "string"
      ? ((body as { password: string }).password ?? "")
      : "";

  if (!password || !safeEqual(password, expected)) {
    // Small delay to blunt brute force; real protection = replace this auth.
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json(
      { error: "Invalid password." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 12 * 60 * 60,
  });
  // Also readable on /api/admin/* routes:
  res.cookies.set(`${ADMIN_COOKIE}_api`, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin",
    maxAge: 12 * 60 * 60,
  });
  return res;
}
