<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Windows TLS / Node.js

Node.js uses its own CA store and may not trust the Supabase certificate on Windows.
All npm scripts set `NODE_OPTIONS=--use-system-ca` to use the Windows certificate store.
If you see `TypeError: fetch failed` with cause `unable to verify the first certificate`,
ensure `--use-system-ca` is active.

## Admin system runs against Supabase

All admin pages use `createAdminClient()` (`src/lib/supabase/admin.ts`) which connects
to the remote Supabase project using the `SUPABASE_SERVICE_ROLE_KEY`. There is no local
Supabase instance — the `.env.local` must contain valid remote credentials.

## Database-driven architecture

The store is fully database-driven. There is **no build-time JSON layer** — do not
reintroduce one. Rules that keep the system coherent:

- Storefront catalog reads go ONLY through `src/lib/db/catalog.ts`
  (view `commerce.v_products` + RPC `commerce.search_products`).
- Pages render dynamically (`force-dynamic`); admin changes are live immediately.
  Never add `revalidate`/`unstable_cache` to catalog pages.
- Shipping rates, VAT, email templates live in `content.settings`
  (read via `src/lib/settings.ts`); coupons in `commerce.coupons`.
  No hardcoded pricing constants in code.
- Checkout logic (stock, reservations, coupon, shipping, VAT, preorder) lives in
  ONE transactional RPC: `commerce.checkout_cart`. The API route only validates
  input and initiates payment.
- DB types are generated: `npm run db:types` → `src/lib/supabase/database.types.ts`.
  Regenerate after every migration.
- Migrations in `supabase/migrations/` are applied manually via the Supabase SQL
  editor (the app keys have no DDL access). Keep them numbered and forward-only.
- Import ZIP archives upload browser→Storage directly via signed URLs
  (`src/lib/import-archive.ts`), never through server action payloads.
- Archived (`is_archived = true`) products are PUBLIC: their detail pages must
  open (no 404), text search uses `scope: "all"`, and series pages list them
  with a "Läbimüüdud" badge. The publisher's editors use the site as a
  bibliographic reference — do not hide the backlist. Archived products show
  NO price (page, cards, JSON-LD `offers`) and stay indexed with lower
  sitemap priority.
- Upcoming (`is_upcoming = true`) products WITHOUT preorder
  (`allow_preorder = false`) show NO price until release (page, cards,
  JSON-LD `offers`). Preorderable upcoming books show price (incl. sale price).
- Reprint dates live in `commerce.products.editions` (JSONB
  `[{type:"2. trükk", date}]`; `release_date` = first printing). One-off import:
  `node scripts/import-editions-from-excel.mjs [--preview]`. The admin Excel
  import parses the release-date column (`DD.MM.YYYY`, `|`-separated reprint
  lists → earliest date) via `src/lib/import-parse.ts`; it never touches
  `editions`.
- Admin Excel import (`/haldus/import`) also maps flag columns
  `is_upcoming` ("Ilmumas") and `allow_preorder` ("Ettetellimus") — `x` = true,
  empty = false. Category matching is by exact `name_et` — names must stay
  unique (the children's-fiction subcategory is "Laste ilukirjandus",
  distinct from root "Ilukirjandus").
- Campaign admin (`/haldus/kampaaniad`) sets only sale dates on products —
  never auto-set `sale_price` (prices come from Excel import / product form).
- Expected delivery time is 3–14 business days (single-person fulfilment) —
  stated in checkout and product JSON-LD.
- Homepage product sections are driven 1:1 by `content.homepage.sections`
  (shared defaults/types in `src/lib/homepage-sections.ts`): heading, count,
  link and order come from admin — no hidden overrides (e.g. campaign names)
  or hardcoded strips on the front page. Empty-source sections are skipped.
- e2e tests (`e2e/`, Playwright) include the admin→live propagation proof.
  Run: `npx playwright test`.
