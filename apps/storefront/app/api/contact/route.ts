import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { contactPayloadSchema, zodIssueList } from "@/lib/validation";

/**
 * POST /api/contact — contact form submissions.
 *
 * Expected by agent B's `app/contact/ContactForm.tsx`:
 *   { name, phone, message }
 *
 * Validation: Zod (`contactPayloadSchema` in lib/validation.ts).
 *
 * Current behavior: validate + per-IP rate limit + server log, then 200.
 * Persistence is intentionally minimal — wire to email/WhatsApp/CRM next
 * (see BUILD_NOTES.md "Contact form"). The form degrades gracefully on
 * any non-2xx response.
 */

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`contact:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = contactPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: zodIssueList(parsed.error).join("; ") },
      { status: 400 },
    );
  }
  const { name, phone, message } = parsed.data;

  // No PII beyond what the customer typed; log for the store owner to follow up.
  console.log(
    "[contact]",
    JSON.stringify({
      at: new Date().toISOString(),
      ip,
      name,
      phone,
      message: message.slice(0, 500),
    }),
  );

  return NextResponse.json({ ok: true });
}
