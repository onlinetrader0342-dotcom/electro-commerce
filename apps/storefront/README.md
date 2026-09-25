# @electro-commerce/storefront

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 storefront for
**Imran Electric Store** — PKR currency, mobile-first.

## Quick start

```bash
cp .env.example .env        # fill in Medusa vars (optional — fixtures fallback works without)
npm install
npm run dev                 # http://localhost:3000
npm run typecheck && npm run build
```

## Environment

| Var | Scope | Purpose |
|---|---|---|
| `MEDUSA_BACKEND_URL` | server | Medusa v2 base URL, e.g. `http://localhost:9000` |
| `MEDUSA_REGION_ID` | server | default region for calculated prices (optional) |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | client | same backend URL for cart mirroring |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | client | publishable key for Store API |
| `NEXT_PUBLIC_SITE_URL` | both | canonical public URL (SEO/canonical/OG) |

Without Medusa configured, all pages render from `lib/fixtures.ts`.

## Routes (owned by this agent)

`/`, `/shop`, `/category/[slug]`, `/product/[slug]`, `/search`, `/cart`,
`/contact`, `/about`, `/privacy`, `/terms`

**Not owned — do not create:** `/api/*`, `/blog/*`, `/checkout`, `/account`, `/admin`
(agent C).

## Notes

- ISR `revalidate = 3600` on all data pages; fetch tags `"products"`, `"categories"`.
- Prices normalized to **major units** (rupees) in `lib/medusa.ts`.
- See `BUILD_NOTES.md` for the handoff contract (exports, cart API, conventions).
