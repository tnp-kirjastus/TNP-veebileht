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
- e2e tests (`e2e/`, Playwright) include the admin→live propagation proof.
  Run: `npx playwright test`.
