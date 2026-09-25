import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./lib/rate-limit";

/**
 * Edge middleware: security headers on every response, admin gate for
 * /admin/*, and coarse rate limiting on /api/v1/*.
 *
 * NOTE: fine-grained AI rate limiting (60/min per API key) happens in the
 * route handlers (lib/ai-api.ts) where the key is validated. This layer only
 * blunts anonymous abuse. Uses the in-memory bucket — see BUILD_NOTES.md.
 */

const ADMIN_COOKIE = "ec_admin";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Admin gate: /admin/* (except the login page + its API) ------------
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const authed = req.cookies.get(ADMIN_COOKIE)?.value === "1";
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();

  // --- Security headers (all responses) ----------------------------------
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // --- Coarse rate limit on versioned APIs --------------------------------
  if (pathname.startsWith("/api/v1/")) {
    const key = req.headers.get("x-api-key")?.trim() || clientIp(req);
    const rl = checkRateLimit(`mw:${key}`, 120, 60_000);
    res.headers.set("X-RateLimit-Limit", "120");
    res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Slow down and retry.",
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(rl.resetMs / 1000))),
          },
        },
      );
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
