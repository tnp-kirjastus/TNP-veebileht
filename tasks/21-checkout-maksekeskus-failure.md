# Task 21: Fix and verify Maksekeskus payment initiation

## Problem

Checkout can create the order flow far enough for the user to press `Kinnita ja mine maksma`, but the UI shows:

`Makse algatamine ebaonnestus. Proovi uuesti.`

With Maksekeskus test environment enabled, the user must be able to complete the redirect to the sandbox payment page.

## Current diagnostic result

A direct Maksekeskus test transaction from the Next.js project succeeds when Node is run with the Windows system CA store:

- API base: `https://api.test.maksekeskus.ee`
- Response status: `201`
- Response contains transaction id
- Response contains `payment_methods.other` with `name = redirect` and a URL

Without `NODE_OPTIONS=--use-system-ca`, Node on Windows fails TLS with `unable to verify the first certificate`.

The package scripts already set this for `npm run dev`, `npm run build`, `npm run start`, and `npm test`. If the app is started with `next dev` directly, Maksekeskus calls can fail locally.

## Implementation

1. Reproduce through the actual Next.js checkout route, not only a direct provider call.
2. Start local development with:

```powershell
npm run dev
```

3. Add temporary route-level diagnostics or structured logs around every `createPayment()` call:
   - path A vs path B
   - order id and order number
   - order total cents
   - Maksekeskus HTTP status
   - provider response body preview
   - TLS/network cause code if `fetch` fails
4. If the route is failing due to TLS, make the local setup error explicit in development logs and docs.
5. If the route is failing due to payload or order data, fix `src/lib/payments/maksekeskus.ts` or `src/app/api/checkout/route.ts`.
6. Add an integration-style test that mocks Maksekeskus `fetch` and proves `/api/checkout` returns a valid payment redirect for a normal paid order.
7. Keep preorder-only orders out of Maksekeskus, as defined in Task 18.

## Files

- `src/app/api/checkout/route.ts`
- `src/lib/payments/maksekeskus.ts`
- `src/lib/payments/maksekeskus.test.ts`
- `docs/maksekeskus-sandbox.md`
- `package.json`

## Acceptance criteria

- [ ] Normal paid checkout in test mode redirects to the Maksekeskus sandbox payment page.
- [ ] Local Windows development uses `NODE_OPTIONS=--use-system-ca`.
- [ ] Route logs reveal the real failure cause instead of only `Makse algatamine ebaonnestus`.
- [ ] Maksekeskus test credentials are never printed in logs.
- [ ] Duplicate/idempotent checkout retry still returns a valid redirect or a clear recoverable message.
- [ ] `npm run lint`, `npm run typecheck`, and `npm test` pass.

