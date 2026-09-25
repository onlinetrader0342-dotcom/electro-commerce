import "server-only";
import { z } from "zod";
import { AiValidationError } from "./ai-api";

/**
 * Zod validation schemas (single home for request validation).
 *
 * AI QUERY PARSING — every /api/v1/ai/* route parses its URLSearchParams
 * through `parseAiQuery(schema, sp)`; failures throw AiValidationError,
 * which runAiHandler maps to a 400 { data, meta } envelope.
 *
 * CHECKOUT — /api/checkout/* routes validate the JSON body through
 * `checkoutPayloadSchema`; failures become 422 string errors via
 * `formatZodIssues`.
 */

// ------------------------------------------------------------ helpers ---

const idParam = z.string().min(1).max(128);

const boolParam = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

/** Parse URLSearchParams against a Zod schema; throw AiValidationError on failure. */
export function parseAiQuery<T extends z.ZodTypeAny>(
  schema: T,
  sp: URLSearchParams,
): z.infer<T> {
  const input: Record<string, string> = {};
  sp.forEach((value, key) => {
    input[key] = value;
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AiValidationError(`Invalid query: ${formatZodIssues(parsed.error)}`);
  }
  return parsed.data;
}

/** "path.to.field: message; ..." — one line per failed issue. */
export function formatZodIssues(error: z.ZodError): string {
  return zodIssueList(error).join("; ");
}

/** One "path: message" string per failed issue. */
export function zodIssueList(error: z.ZodError): string[] {
  return error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "value";
    return `${path}: ${i.message}`;
  });
}

// ------------------------------------------------------- AI queries ---

export const aiIdQuerySchema = z.object({ id: idParam });

export const aiSearchProductsQuerySchema = z
  .object({
    q: z.string().max(200).optional(),
    category: z.string().max(128).optional(),
    brand: z.string().max(128).optional(),
    min_price: z.coerce.number().nonnegative().optional(),
    max_price: z.coerce.number().nonnegative().optional(),
    in_stock: boolParam.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sort: z
      .enum(["price_asc", "price_desc", "name_asc", "name_desc", "newest"])
      .optional(),
  })
  .transform((v) => ({
    q: v.q,
    category: v.category,
    brand: v.brand,
    minPrice: v.min_price,
    maxPrice: v.max_price,
    inStock: v.in_stock,
    limit: v.limit,
    offset: v.offset,
    sort: v.sort,
  }));

export const aiInventoryQuerySchema = z
  .object({
    ids: z
      .string()
      .min(1)
      .max(4000)
      .transform((raw) =>
        raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
      ),
  })
  .refine((v) => v.ids.length > 0, {
    message: "ids must contain at least one product id.",
  });

export const aiRelatedQuerySchema = z.object({
  id: idParam,
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const aiCategoriesQuerySchema = z.object({
  q: z.string().max(200).optional(),
});

// ---------------------------------------------------------- checkout ---

const PHONE_RE = /^[+\d][\d\s-]{5,19}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const emptyToUndefined = (v: string | undefined) =>
  v === "" ? undefined : v;

export const checkoutPayloadSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(128),
        variantId: z.string().min(1).max(128).optional(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Cart must contain at least one item.")
    .max(50, "Cart cannot exceed 50 lines."),
  address: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z
      .string()
      .trim()
      .min(6)
      .max(20)
      .regex(PHONE_RE, "Phone number looks invalid."),
    email: z
      .string()
      .trim()
      .max(120)
      .refine((v) => v === "" || EMAIL_RE.test(v), {
        message: "Email address looks invalid.",
      })
      .transform(emptyToUndefined)
      .optional(),
    address1: z.string().trim().min(5).max(200),
    address2: z
      .string()
      .trim()
      .max(200)
      .transform(emptyToUndefined)
      .optional(),
    city: z.string().trim().min(2).max(80),
    province: z.string().trim().min(2).max(80),
    postalCode: z
      .string()
      .trim()
      .max(20)
      .transform(emptyToUndefined)
      .optional(),
    country: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((v) => (v ? v : "Pakistan")),
  }),
  shippingMethodId: z.string().trim().min(1).max(64),
  paymentMethodId: z.string().trim().min(1).max(64),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z
    .string()
    .trim()
    .max(128)
    .transform(emptyToUndefined)
    .optional(),
});

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;

// ----------------------------------------------------------- contact ---

export const contactPayloadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(PHONE_RE, "Phone number looks invalid."),
  message: z.string().trim().min(10).max(2000),
});

export type ContactPayload = z.infer<typeof contactPayloadSchema>;
