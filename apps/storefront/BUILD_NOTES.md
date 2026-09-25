# BUILD_NOTES — storefront (agent B) → agent C handoff

## What was built

`apps/storefront` — Next.js 15 App Router + TypeScript (strict) + Tailwind CSS v4,
mobile-first. Self-contained `package.json` (`@electro-commerce/storefront`).

**Pages:** `/` (home), `/shop`, `/category/[slug]`, `/product/[slug]`, `/search`,
`/cart`, `/contact`, `/about`, `/privacy`, `/terms`, `not-found.tsx`.
All data pages: server components, ISR `revalidate = 3600`.

**NOT created (yours):** `app/api/*`, `app/blog/*`, `app/checkout`, `app/account`,
`app/admin`. Nav/footer link to `/blog`, `/account`, `/checkout` — they 404 until
you build them.

## lib/medusa.ts — SERVER ONLY (`import "server-only"`)

Typed client for the Medusa v2 Store API with **fixture fallback**:
every function tries Medusa first, catches any failure, and returns fixture data
(`lib/fixtures.ts`: 12 products, 7 categories, PKR). Pages never break without Medusa.

Exports:

- Types: `StoreProduct`, `StoreCategory`, `ProductImage`, `SpecRow`,
  `ProductFilters`, `ProductSort`, `ProductListResult`
- `listProducts(filters)` — q/brand/categoryId/minPrice/maxPrice/inStock/sort/page/pageSize
- `getProductByHandle(handle)` + alias `getProductBySlug`
- `listCategories()`, `getCategory(slug)`
- `searchProducts(query, filters)`, `getRelatedProducts(product, limit)`
- `listBrands()`, `priceBounds()` — feed the Filters UI (never hard-coded)
- `isMedusaConfigured()`
- **Prices are normalized to major units** (rupees): Medusa minor units ÷ 100 in `normalizeProduct()`.
- Fetch caching: `next: { revalidate: 3600, tags: ["products"] | ["categories"] }`.
- Medusa product metadata contract (used by `normalizeProduct`): `brand`, `model`,
  `short_description`, `weight`, `dimensions`, `warranty`, `seo_title`,
  `seo_description`, `specifications: [{name,value}]`, `attributes: {k:v}`,
  `rating`, `review_count`, `is_featured`, `is_best_seller`.

Env (see `.env.example`): `MEDUSA_BACKEND_URL`, `MEDUSA_REGION_ID`,
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_BACKEND_URL`,
`NEXT_PUBLIC_SITE_URL` (canonical/OG base).

## lib/seo.ts + components/JsonLd.tsx

- `generateProductMetadata(p)`, `generateCategoryMetadata(c)` — title/description/canonical/OG/Twitter.
- `productJsonLd(p)`, `breadcrumbJsonLd(items)`, `organizationJsonLd()`, `webSiteJsonLd()` (with SearchAction).
- Layout injects Organization + WebSite JSON-LD globally; product page adds Product + BreadcrumbList.

## Cart (lib/cart.ts + components/CartProvider.tsx, CartDrawer.tsx)

- UI source of truth: `localStorage` key `electro-cart-v1`; cross-tab sync via
  `electro:cart-updated` CustomEvent.
- `useCart()` → `{ lines, count, subtotal, currency, isCartOpen, openCart, closeCart, addItem, removeItem, setQty, clear }`.
- **Medusa mirroring (best-effort, debounced 800ms):** `syncCartToMedusa(lines)`
  creates a fresh `/store/carts` cart and re-adds lines as `variant_id: productId`.
  For checkout use:
  - `ensureMedusaCart(): Promise<string | null>` — get-or-create Medusa cart id
  - `getMedusaCartId(): string | null` — stored id (`electro-medusa-cart-id`)
  - ⚠️ Line items are sent with `variant_id = productId`; if your Medusa setup uses
    real variant ids, map them in checkout before trusting the mirrored cart.
  - **Checkout must re-validate price/stock server-side** — cart unit prices are UI snapshots.
- `AddToCartButton` takes an `AddableProduct` + `qty`; `PurchaseBox.tsx` (in
  `app/product/[slug]/`) wires the quantity selector.
- `/cart` page links “Proceed to Checkout” → `/checkout` (yours to build).

## Components

`ProductCard`, `Price` (PKR formatting via `lib/format.ts`), `Breadcrumbs`,
`CategoryNav` (data-driven chips), `SearchBar` → `/search?q=`, `Filters`
(brand/price/in-stock → URLSearchParams), `SortSelect`, `Pagination`,
`QuantitySelector`, `ProductGallery`, `Header` (server; top strip, logo, search,
`CartButton`, `MobileMenu`, desktop nav + mobile category rail), `Footer` (server),
`JsonLd`, `CartButton`, `MobileMenu`, `CartDrawer`, `CartProvider`, `ContactForm`
(POSTs to `/api/contact` — **you need to create that endpoint**).

## Conventions

- Import alias `@/*` → repo-relative (`@/lib/...`, `@/components/...`).
- Categories/brands rendered from API/fixtures everywhere — nothing hard-coded.
- Placeholder images: generated SVGs in `public/images/{products,categories}/`; real
  Medusa image URLs flow through `next.config.ts` `remotePatterns` (Medusa host
  derived from `MEDUSA_BACKEND_URL` at config load).
- Fixture product handles are the URL slugs (e.g. `/product/voltmax-hybrid-5kw-solar-inverter`).
- `globals.css` uses Tailwind v4 `@theme` (brand navy + accent amber); `.rich-text`
  styles for CMS/static content.
- Do not start a dev server in this environment (per task constraints); verify with
  `npm run typecheck` / `npm run build`.

## Suggested next steps for agent C

1. `POST /api/contact` — persist/forward contact form messages.
2. `/checkout` — load cart via `getMedusaCartId()`/`ensureMedusaCart()`, server-side
   price+stock validation, payment + shipping abstraction layers.
3. `/account`, `/admin`, `/blog/*` + blog API, sitemap.xml/robots.ts (SEO).
4. Revalidate ISR tags (`products`, `categories`) from Medusa webhooks when data changes.

---

# Agent C build notes (2026-09-25)

Scope: blog CMS + fixtures, public blog routes, admin blog CRUD, checkout,
shipping/payment abstractions, customer account/auth/order pages, read-only AI
API + transactional API stubs, feeds, revalidation, sitemap/robots,
middleware/security, `POST /api/contact`, Zod validation. Did NOT touch
`app/layout.tsx`, `components/`, `lib/medusa.ts`, or agent B's shop pages.

## What was built

**Blog** (`lib/blog.ts`, `lib/blog-fixtures.ts`, `lib/blog-actions.ts`, `lib/markdown.ts`)
- `BlogRepository` interface; `DbBlogRepository` talks to the assumed Medusa
  blog-module routes (see "Assumed backend contracts" below); reads fall back
  to 4 local fixtures, admin writes need `MEDUSA_ADMIN_API_KEY`.
- Public: `/blog`, `/blog/[slug]` (Article + Breadcrumb JSON-LD, metadata,
  author box, recommended products resolved live via `getAiProductById`),
  `/blog/category/[slug]`, `/blog/tag/[slug]`. Local UI in
  `app/blog/_components/` only.
- Admin: `/admin/login` (shared-password gate, httpOnly cookie),
  `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]` with product search
  picker (`/api/admin/product-search`); server actions in `lib/blog-actions.ts`.
- `lib/markdown.ts`: dependency-free renderer, escapes raw HTML, supports
  headings/lists/quotes/code/tables (tables added — fixtures use one).

**Checkout** (`app/checkout`, `app/api/checkout/*`, `lib/checkout-server.ts`,
`lib/shipping.ts`, `lib/payments.ts`, `lib/validation.ts`)
- Reads agent B's cart: localStorage `electro-cart-v1` (`CartLine` shape from
  `lib/cart.ts`); qty edits write back + dispatch `electro:cart-updated`;
  success clears `electro-cart-v1` + `electro-medusa-cart-id`.
- `validateCheckout()` (Zod `checkoutPayloadSchema`) re-fetches every
  product's price + inventory from Medusa and recomputes
  subtotal/shipping/total server-side. Client prices are never trusted.
- `/api/checkout/validate`, `/api/checkout/complete`, `/api/checkout/shipping-methods`.
- `lib/shipping.ts`: flat-rate provider (standard/express/overnight,
  free-shipping threshold via `FREE_SHIPPING_THRESHOLD`), Medusa shipping-option
  lookup when configured. `lib/payments.ts`: `cod` + `bank_transfer`
  (manual providers — no card processing in code).

**Customer account** (`app/account/*`, `app/api/auth/*`, `lib/customer-auth.ts`)
- `/account/login`, `/account/register`, `/account`, `/account/orders`,
  `/account/orders/[id]`; httpOnly session cookies; Medusa
  `/auth/customer/emailpass*` + `/store/customers/me*` (assumed).

**AI read-only API** (`app/api/v1/ai/*`, `lib/ai-api.ts`, `lib/validation.ts`)
- `search_products`, `get_product`, `get_product_details`,
  `search_categories`, `check_inventory`, `get_price`, `get_related_products`.
- `{ data, meta }` envelopes, `x-api-key` auth (timing-safe, 60/min
  token-bucket per key), no customer data exposed.
- Query parsing is Zod (`parseAiQuery` + schemas in `lib/validation.ts`).
- `aiSearchProducts` reads through agent B's `lib/medusa.ts` `listProducts`
  (fixture fallback included, category slug→id resolution); product/card
  mapping handles both `[{name,value}]` and `{k:v}` specification forms and
  prefers Medusa `calculated_price`.

**Transactional API stubs** (`app/api/v1/commerce/*`): JWT-gated `501`
contracts for `create_cart`, `get_cart`, `add_to_cart`, `update_cart`,
`remove_from_cart`, `checkout` — shapes only, Medusa wiring is agent A's job.

**Feeds/SEO** (`app/api/feeds/google.xml`, `app/api/feeds/products.json`,
`app/sitemap.ts`, `app/robots.ts`, `app/api/revalidate`, `middleware.ts`)
- Google Merchant XML (single `<g:mpn>`, SKU preferred) + JSON feed.
- Sitemap uses the REAL routes: `/product/[slug]`, `/category/[slug]`,
  `/`, `/shop`, `/blog`, `/contact`, `/about`, `/privacy`, `/terms`.
- `POST /api/revalidate` (`REVALIDATE_SECRET`) revalidates ISR tags
  (`products`, `categories`, `blog`).
- Middleware: security headers, `/admin/*` password-cookie gate, coarse
  `/api/v1/*` rate limiting (in-memory — per instance; use Redis for
  multi-instance prod).

**Contact** (`app/api/contact/route.ts`): Zod-validated, per-IP rate-limited
(5/min); currently logs server-side and returns 200. **Wire to email/WhatsApp/
CRM before launch** — messages are not persisted anywhere yet.

## Cross-agent alignment fixes (agent B's contracts)

- Product URLs: `/product/[slug]` (was `/products`) — `PRODUCT_URL_PREFIX`
  default fixed in `lib/ai-api.ts`, `app/sitemap.ts`, `.env.example`.
- Category URLs: `/category/[slug]` (was `/categories`) — sitemap fixed.
- Checkout now uses B's `electro-cart-v1` CartLine shape (was a private
  `ec_cart` key) and notifies via `electro:cart-updated`.
- `lib/commerce.ts` kept ONLY for raw/admin/auth/cart/blog endpoints that
  B's `lib/medusa.ts` doesn't cover; typed catalog reads go through B's
  client (`aiSearchProducts`, `mapStoreProductToAi`).
- Blog fixture `productLinks` now reference real fixture ids
  (`prod-voltmax-hybrid-5kw`, `prod-voltmax-ups-3kva`,
  `prod-solarstar-550w-mono`, `prod-ostric-led-bulb-12w`,
  `prod-ostric-panel-18w`); `getAiProductById` falls back to fixtures when
  Medusa is unreachable (503/502).
- Price semantics: B's `StoreProduct.price` = effective, `salePrice` =
  compare-at; `AiProduct.price` = list, `salePrice` = discounted —
  `mapStoreProductToAi` converts between them.
- Money: Medusa minor units → major (PKR) by ÷100 everywhere, consistent
  with B's normalization.

## Validation (Zod — user requirement)

- `zod@^4` added to `apps/storefront/package.json` dependencies
  (installed with `npm install zod --no-workspaces`; the monorepo root
  declares pnpm workspaces but the storefront was npm-installed — do NOT run
  bare `npm install` at the repo root, it chokes on `workspace:*`).
- `lib/validation.ts`: `aiSearchProductsQuerySchema`, `aiIdQuerySchema`,
  `aiInventoryQuerySchema`, `aiRelatedQuerySchema`,
  `aiCategoriesQuerySchema` (+ `parseAiQuery` helper),
  `checkoutPayloadSchema` (used by `validateCheckout` in
  `lib/checkout-server.ts`), `contactPayloadSchema`.
- Legacy `qStr/qInt/qNum/qBool` helpers remain exported from `lib/ai-api.ts`
  but no route uses them anymore.

## Assumed backend contracts (agent A must confirm)

- Blog store: `GET /store/blog-posts`, `/store/blog-posts/:slug`,
  `/store/blog-categories`, `/store/blog-tags`; admin: `GET/POST
  /admin/blog-posts`, `PATCH/DELETE /admin/blog-posts/:id`,
  `POST /admin/blog-posts/:id/publish|unpublish`.
- AI keys: `POST /admin/ai-keys/validate { key }` (else `AI_API_KEYS` env).
- Customer auth: `/auth/customer/emailpass`, `.../register`,
  `/store/customers/me`, `/store/customers/me/orders`.
- Checkout: Medusa cart → line items → address → shipping method → payment
  collection/session → `POST /store/carts/:id/complete`; `cod` and
  `bank_transfer` payment providers must exist in Medusa.
- Blog `productLinks` store `{ productId, position }[]` on the post.

## Verification

- `npm run typecheck` — clean (2026-09-25).
- `renderMarkdown` + Zod schemas runtime smoke-tested via tsc-compiled output.
- `npm run build` — see below (ran after typecheck, no dev server started).

## Known limitations (not production-grade yet)

1. Admin auth = shared password + cookie (`ADMIN_PASSWORD`); replace with real
   user accounts before launch.
2. Contact messages only logged — no persistence/notification.
3. In-memory rate limiter is per-instance; use Redis/shared store for
   multi-instance deployments.
4. Checkout shipping/payment Medusa provider ids are assumptions; confirm
   with agent A against the real backend.
5. Transactional `/api/v1/commerce/*` are 501 stubs by design.
6. `lib/blog.ts` admin writes require `MEDUSA_ADMIN_API_KEY`; without the
   blog module, admin edits only affect in-memory fixtures (not durable).
