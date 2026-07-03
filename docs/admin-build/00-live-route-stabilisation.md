# Task 0 — Stabilise live product and news routes

## Why this is first

The live homepage works, but five tested `/raamat/{slug}` pages, an unknown product slug and a tested `/uudis/{slug}` page return HTTP 500. Product pages are required to validate future admin edits, previews and publishing.

## Work

1. Capture the current Vercel Runtime Logs and server stack for one failing product and news route.
2. Reproduce with `npm run build` followed by `npm run start` using safe local configuration.
3. Investigate the shared server-render path. `src/lib/sanitize.ts` and its `isomorphic-dompurify`/`jsdom` dependency are a strong common candidate, but the stack trace decides the fix.
4. Verify product lookup, metadata, structured data, URL creation, sanitisation and related-product helpers.
5. Ensure an unknown product returns the Next.js 404 response rather than 500.
6. Add representative regression tests.
7. Deploy the fix through Vercel Preview and then production.

## Acceptance criteria

- Active, sale, upcoming and minimally populated products return 200.
- Unknown slugs return 404.
- News detail pages return 200.
- Product title, price, cover, description, metadata and JSON-LD render.
- Add-to-cart works.
- No new runtime errors appear after production promotion.

