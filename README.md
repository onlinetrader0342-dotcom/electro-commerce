# electro-commerce

Production-ready, AI-ready e-commerce platform for electric products
(Imran Electric Store) — built as a real commercial platform, not a demo.

```
CUSTOMER ──▶ NEXT.JS STOREFRONT (apps/storefront)
                  │  (Medusa JS client, server components, ISR)
                  ▼
        MEDUSA COMMERCE ENGINE (apps/medusa) ──▶ POSTGRESQL
                  │                                    ▲
   ┌──────────────┼──────────────┐                       │ single source
   │              │              │                       │ of truth
BLOG MODULE   AI KEYS MODULE   SUBSCRIBERS
(custom)      (custom)         (revalidate webhooks)

AI AGENT ──▶ AI API (read-only discovery now, transactions later)
                  │  packages/ai-tools (transport-agnostic)
                  ▼
        PRODUCT SEARCH + PRODUCT DATA ──▶ MEDUSA ──▶ POSTGRESQL

PRODUCT DATABASE ──▶ FEED GENERATOR (packages/feed-generator)
                          │  Google Merchant XML + JSON
                          ▼
              EXTERNAL AI / COMMERCE PLATFORMS
```

## Repo map

| Path | What it is |
|---|---|
| `apps/medusa` | Medusa v2 commerce engine: products, carts, orders, customers, promotions, shipping, payments. Custom modules: `blog`, `ai_keys`. Subscriber pushes revalidation to the storefront on product/category changes. |
| `apps/storefront` | Next.js 15 + TypeScript storefront (sibling build agent). Talks to Medusa via the Store API; never duplicates product data. |
| `packages/types` | Shared TypeScript DTOs (Product, Category, BlogPost, AiProduct, FeedProduct, ApiKey scopes…). |
| `packages/seo` | Pure SEO helpers: metadata builders + JSON-LD (Product, Breadcrumb, Article, Organization). No Next.js dependency. |
| `packages/feed-generator` | `mapMedusaToFeedProduct()` + Google Merchant Center XML and JSON feed generators. Reads from Medusa — no second product DB. |
| `packages/ai-tools` | Transport-agnostic AI tool definitions (`search_products`, `get_product`, …) with zod schemas. A `ProductService` interface is injected, so REST now / MCP / ACP / UCP later plug in without touching core. |
| `packages/payments` | `PaymentProvider` interface + `CodProvider` (cash on delivery — Pakistan launch default) + `StripeProvider` stub (throws until configured). |
| `packages/shipping` | `ShippingProvider` interface + `FlatRateProvider` + `TcsProvider` stub (Pakistan courier). |
| `docs/ARCHITECTURE.md` | The full 10-step architecture write-up (data flows, SEO, blog, AI API, feed, cost breakdown). |

## Quick start

```bash
# 1. infrastructure
cp .env.example .env
docker compose up -d                      # postgres:16 + redis:7

# 2. install
pnpm install

# 3. medusa backend
cd apps/medusa
cp .env.example .env                      # or reuse root .env values
pnpm exec medusa db:migrate
pnpm exec medusa user -e admin@imranelectric.store -p <strong-password>
pnpm dev                                  # http://localhost:9000 (admin: /app)

# 4. seed demo catalog (12 electric products, PKR)
pnpm seed

# 5. storefront (sibling agent)
pnpm dev:storefront                       # http://localhost:3000
```

## Key principles

1. **Medusa + PostgreSQL is the single source of truth** for all commerce data.
   The storefront, AI API, product feed and blog product-references all read
   from it — nothing is duplicated.
2. **Read-only AI discovery is separated from transactional commerce actions.**
   An AI key with scope `ai:read` can never touch carts, checkout, or customer
   PII. Transaction scopes (`ai:cart`, `ai:checkout`) are defined but enforced
   off by default until an explicit approval flow exists.
3. **Never trust client-side prices.** Totals are always computed server-side
   (Medusa cart totals); payment/shipping providers only receive
   server-computed amounts.
4. **Providers are swappable.** Payments (`cod` → `stripe`) and shipping
   (`flat_rate` → `tcs`) change via env config, not code rewrites.
5. **SEO is structural, not an afterthought**: dynamic metadata, JSON-LD,
   canonicals, sitemap, robots — generated from the same product data.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.
