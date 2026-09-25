# electro-commerce — Architecture

> The full design for a production-ready, AI-ready e-commerce platform for
> electric products (Imran Electric Store). Medusa + PostgreSQL is the **single
> source of truth** for all commerce data.

---

## Step 1 — Complete architecture

```
CUSTOMER
  │
  ▼
NEXT.JS STOREFRONT (apps/storefront)
  │  Server components + ISR · Medusa JS client · tag-based revalidation
  ▼
MEDUSA COMMERCE ENGINE (apps/medusa)
  │  products · variants · categories · carts · orders · customers
  │  promotions · shipping · payments · + custom modules (blog, ai_keys)
  ▼
POSTGRESQL (single source of truth)  ◀── REDIS (events / cache / locks)

AI AGENT
  │
  ▼
AI API — read-only discovery (scope: ai:read)
  │  apps/storefront → app/api/ai/v1/*  (REST today)
  │  packages/ai-tools: tool defs + zod schemas, transport-agnostic
  ▼
PRODUCT SEARCH + PRODUCT DATA ──▶ MEDUSA ──▶ POSTGRESQL
  (never customer PII — types forbid it)

TRANSACTIONS (separate, explicitly authorized)
  USER ─▶ AI AGENT ─▶ AUTHORIZED COMMERCE ACTION ─▶ CART ─▶ CHECKOUT ─▶ PAYMENT ─▶ ORDER
  scopes ai:cart / ai:checkout — OFF by default, granted only behind a
  user-approval flow. Never on a shared AI key.

PRODUCT DATABASE (Medusa)
  │
  ▼
PRODUCT FEED GENERATOR (packages/feed-generator)
  │  mapMedusaToFeedProduct() — no second product DB
  ├─▶ Google Merchant Center XML (id/title/link/image/price/availability/brand/mpn/…)
  └─▶ JSON feed (for AI platforms / custom integrations)
  │
  ▼
EXTERNAL AI / COMMERCE PLATFORMS

BLOG / CMS (Medusa custom module: blog)
  │  posts · categories · tags · authors · structured product links
  ▼
NEXT.JS (/blog, /blog/[slug], /blog/category/[slug], /blog/tag/[slug])
  │
  ▼
SEO / SEARCH ENGINES (metadata + JSON-LD + sitemap + robots)
```

**Future protocol integrations** (MCP / ACP / UCP) attach at the
`packages/ai-tools` router — a thin adapter over the same tool set. Nothing
in core changes; we make no claim that any specific platform is supported,
only that the interfaces are clean.

## Step 2 — Project folder structure

```
electro-commerce/
├── package.json / pnpm-workspace.yaml / docker-compose.yml
├── .env.example / .gitignore / tsconfig.base.json
├── README.md / docs/ARCHITECTURE.md
│
├── apps/
│   ├── medusa/                      # ← this agent
│   │   ├── medusa-config.ts         # postgres + redis + module registration
│   │   ├── package.json / tsconfig.json / .env.example
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── blog/            # custom CMS module
│   │       │   │   ├── index.ts / service.ts
│   │       │   │   ├── models/      # BlogPost, BlogCategory, BlogTag,
│   │       │   │   │               # PostTag (pivot), Author, PostProductLink
│   │       │   │   └── migrations/  # one MikroORM migration per table
│   │       │   └── ai_keys/         # API-key module (sha256 hashes, scopes)
│   │       │       ├── index.ts / service.ts
│   │       │       ├── models/api-key.ts
│   │       │       └── migrations/
│   │       ├── api/
│   │       │   ├── admin/blog/…     # posts CRUD, publish/unpublish/schedule,
│   │       │   │                    # categories, tags, authors, product links
│   │       │   ├── admin/ai-keys/…  # create (raw key once) / revoke / list
│   │       │   └── store/blog/…     # public: published posts, categories, tags
│   │       ├── subscribers/
│   │       │   └── product-events.ts# product/category events → storefront revalidate
│   │       ├── jobs/
│   │       │   └── publish-scheduled-posts.ts  # every 5 min
│   │       └── scripts/
│   │           └── seed-electric-products.ts   # category tree + 12 PKR products
│   │
│   └── storefront/                  # ← sibling agent (Next.js 15 + TS)
│       # talks to Medusa Store API; hosts /api/ai/v1/* (ai:read),
│       # /api/revalidate, feed routes, sitemap, robots
│
└── packages/
    ├── types/           # shared DTOs (Product, AiProduct, FeedProduct, scopes…)
    ├── seo/             # pure metadata + JSON-LD builders (no Next.js dep)
    ├── feed-generator/  # Medusa → FeedProduct → Google Merchant XML / JSON
    ├── ai-tools/        # transport-agnostic AI tools + zod schemas + router
    ├── payments/        # PaymentProvider iface; CodProvider; StripeProvider stub
    └── shipping/        # ShippingProvider iface; FlatRateProvider; TcsProvider stub
```

## Step 3 — How Next.js communicates with Medusa

1. **Server-side Store API calls.** The storefront fetches catalog data with
   the Medusa JS client (`@medusajs/js-sdk`) inside React Server Components,
   using the **publishable API key** (`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`).
   Product listing, details, categories, search, blog — all read paths are
   server-rendered or ISR-cached.
2. **Cart & checkout.** Cart operations use the Store API cart endpoints with
   the customer's session; totals are computed **by Medusa server-side**.
   The storefront never computes prices.
3. **Tag-based ISR + revalidation.** `src/subscribers/product-events.ts`
   listens to `product.*`, `product-category.*`, `price-list.*` events and
   POSTs affected cache tags (`product:<id>`, `products`, `feed`,
   `ai-products`, `sitemap`) to `STOREFRONT_URL/api/revalidate` with
   `REVALIDATE_SECRET`. Only changed pages regenerate.
4. **Admin** stays in Medusa (`/app`): products, inventory, prices, orders,
   customers, promotions, shipping, blog, API keys.

## Step 4 — Database structure

PostgreSQL, managed by Medusa v2 (MikroORM). Core commerce tables come from
Medusa itself (`product`, `product_variant`, `product_category`, `price`,
`inventory_item`, `cart`, `order`, `customer`, `promotion`, …). Our custom
tables:

```
blog_author        id, name, bio, avatar
blog_category      id, name, slug (unique), description
blog_tag           id, name, slug (unique)
blog_post          id, title, slug (unique), excerpt, content (markdown),
                   status (draft|published|scheduled), published_at,
                   seo_title, seo_description, canonical_url, og_image,
                   featured_image, image_alt, author_id → blog_author,
                   category_id → blog_category
post_tag           id, post_id → blog_post, tag_id → blog_tag (unique pair)
post_product_link  id, post_id → blog_post, medusa_product_id (text),
                   position
ai_api_key         id, name, key_hash (sha256, unique), prefix,
                   scopes (jsonb), rate_limit_per_min, is_active, last_used_at
```

All tables carry `created_at / updated_at / deleted_at` (soft delete).
`post_product_link.medusa_product_id` is deliberately a plain text column, not
a cross-module FK — the blog module never hard-depends on product internals.

## Step 5 — Product data flow

```
ADMIN (Medusa /app)
  │  product entered ONCE: title, SKU, brand, model, description,
  │  images, prices, stock, category, specs (metadata.specifications),
  │  warranty, SEO fields
  ▼
MEDUSA ──▶ POSTGRESQL   (source of truth)
  │
  ├─▶ Next.js product page (ISR, tag product:<id>) ──▶ SEO
  │     metadata + JSON-LD from packages/seo
  ├─▶ DATABASE ──▶ PRODUCT FEED (tag: feed)
  │     mapMedusaToFeedProduct() → Google Merchant XML / JSON
  ├─▶ DATABASE ──▶ AI PRODUCT API (tag: ai-products)
  │     packages/ai-tools over a Medusa-backed ProductService
  └─▶ Blog "Recommended products" (structured PostProductLink,
      resolved live — never copied into article text)
```

A product entered once is automatically available to the storefront, search,
product pages, feed, AI APIs and related-product sections. No duplication.

## Step 6 — SEO architecture

- **Per-page dynamic metadata** via `packages/seo` (pure functions, no
  framework lock-in): `buildProductMetadata`, `buildCategoryMetadata`,
  `buildArticleMetadata` → title, meta description, canonical, Open Graph.
- **JSON-LD**: `jsonLdProduct` (price/availability/brand/specs),
  `jsonLdBreadcrumb`, `jsonLdArticle`, `jsonLdOrganization` (+ WebSite with
  SearchAction for sitelinks search box).
- **Technical SEO**: SEO-friendly slugs, canonical URLs, sitemap.xml
  (regenerated on `sitemap` tag), robots.txt, image `alt` text, proper
  H1/H2/H3 hierarchy, internal linking (breadcrumbs, related products,
  blog→product links).
- **Performance**: server rendering + ISR, Next.js image optimization,
  lazy loading, pagination, DB indexes (slug/status/category), Redis caching.

## Step 7 — Blog architecture

Custom Medusa module (`blog`) — swappable later for a headless CMS without
touching the storefront contract:

- **Admin** (`/admin/blog/*`): create/edit/delete posts, drafts,
  publish/unpublish, **scheduling** (`published_at` + 5-min cron job),
  featured image + alt, categories, tags, author, excerpt, SEO title /
  description / canonical / OG image / custom slug.
- **Store API** (`/store/blog/*`): published-only listing with
  category/tag/search filters; single post by slug with relations.
- **Routes** (storefront): `/blog`, `/blog/[slug]`, `/blog/category/[slug]`,
  `/blog/tag/[slug]` — article JSON-LD, breadcrumbs, sitemap inclusion.
- **Blog → product connection**: `PostProductLink` rows
  (`post_id`, `medusa_product_id`, `position`). The article stores *references*,
  not product data; the storefront resolves them live via the Store API, so
  price/stock are always current and the "Add to cart" button works.

## Step 8 — AI-agent API architecture

`packages/ai-tools` — the core is **transport-agnostic**:

```ts
// Each tool: pure definition + zod schema + handler over an injected service
{ name: "search_products", inputSchema, handler: (service, input) => … }
// Service interface implemented once per deployment (Medusa-backed adapter)
interface ProductService { searchProducts, getProduct, getProductDetails,
  searchCategories, checkInventory, getPrice, getRelatedProducts }
// Router: any transport calls listTools() / execute(name, input)
createAiToolRouter(service)
```

- **Today**: REST under `app/api/ai/v1/*` in the storefront, guarded by the
  `ai_keys` module (`Authorization: Bearer ec_…`, scope `ai:read`,
  per-key rate limits, timing-safe hash validation).
- **Later**: an MCP server, ACP or UCP adapter wraps the *same* router —
  no tool or service code changes.
- **Read vs transaction split**: only read-only discovery tools exist here.
  `create_cart / add_to_cart / checkout` belong to a separate, explicitly
  authorized layer; an unauthenticated AI request can never reach customer
  data (the `AiProduct` type physically excludes it).

## Step 9 — Product-feed architecture

`packages/feed-generator`:

```
Medusa products ──▶ mapMedusaToFeedProduct() ──▶ FeedProduct
                                                  ├─▶ toGoogleMerchantXml()
                                                  └─▶ toJsonFeed()
```

- Google Merchant Center RSS 2.0 (`g:id, title, description, link,
  image_link, price, sale_price, availability, brand, mpn, condition,
  product_type, google_product_category`, plus `product_detail` specs).
- JSON feed (same data) for AI platforms and custom integrations.
- Regenerated from Medusa on demand / cron / `feed` revalidation tag —
  updates automatically when product data changes. No second product DB.

## Step 10 — Open-source / free vs paid

| Component | License / cost |
|---|---|
| Next.js, TypeScript, React | Free, open source (MIT) |
| Medusa v2 | Free, open source (MIT) — self-hosted |
| PostgreSQL 16, Redis 7 | Free, open source — self-hosted via docker-compose |
| Blog module, AI tools, feed generator, SEO helpers | Ours — free |
| Cash on Delivery | Free (no gateway fees) — launch default |
| Flat-rate shipping | Free (manual courier booking) — launch default |
| Stripe | **Paid** — ~2.9% + fixed per transaction; only when card payments launch (stub included) |
| TCS courier API | **Paid** — per-shipment rates; only when wired (stub included) |
| Hosting (Render/Railway/VPS) | **Paid** — free tiers exist; production needs a paid DB + always-on services |
| Google Merchant Center | Free listing; ads optional/paid |
| Domain + SSL | Paid yearly (small) |

**Launch path for Pakistan (zero gateway cost):** COD + flat-rate shipping,
self-hosted Postgres/Redis, free-tier hosting. Card payments (Stripe) and
live courier rates (TCS) are clean swap-ins later via env config.
