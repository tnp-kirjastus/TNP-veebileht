# Maksekeskus sandbox setup

Use Maksekeskus TEST credentials for trial payments. Do not use live keys while validating the checkout flow.

Required environment:

```env
MAKSEKESKUS_ENV=test
MAKSEKESKUS_SHOP_ID=<test shop id>
MAKSEKESKUS_SECRET=<test secret key>
MAKSEKESKUS_PUBLISHABLE_KEY=<test publishable key>
NEXT_PUBLIC_SITE_URL=https://<public-preview-host>
```

`NEXT_PUBLIC_SITE_URL` must be a public HTTPS origin. Maksekeskus posts payment callbacks to:

```text
/api/maksekeskus/return
/api/maksekeskus/webhook
```

## Windows TLS requirement

On Windows, Node.js uses its own CA store and may not trust the Maksekeskus certificate. All npm scripts set `NODE_OPTIONS=--use-system-ca` to use the Windows certificate store.

If checkout fails with `Makse algatamine ebaonnestus` and the server logs show `maksekeskus_tls_error`, ensure:
- The app is started with `npm run dev` (not `next dev` directly)
- `NODE_OPTIONS=--use-system-ca` is set in the environment

You can verify the TLS connection works with:
```powershell
$env:NODE_OPTIONS="--use-system-ca"
```

## Checkout route diagnostics

The checkout route logs structured diagnostics around every `createPayment` call:
- `maksekeskus_create_error` — non-200 HTTP response from Maksekeskus (includes status and response body preview)
- `maksekeskus_tls_error` — TLS certificate verification failure (includes NODE_OPTIONS state)
- `maksekeskus_create_failed` / `maksekeskus_create_failed_retry` — any other error during payment creation (includes order id, order number, path, error name, and cause chain)

Before running paid checkout tests:

1. Apply all Supabase migrations to the remote project used by the preview deployment.
2. Confirm the preview deployment has valid remote Supabase credentials and service role key.
3. Confirm parcel-machine loading works. If the sandbox merchant does not have Shipping+ enabled, use a personal Maksekeskus test merchant with Shipping+ access before testing shipment creation.
4. Run one successful sandbox payment and one cancelled/expired sandbox payment.
5. Verify the order reaches `paid`, `cancelled`, or `expired` in `commerce.orders` and that one matching row exists in `commerce.payment_events`.

Maksekeskus TEST and LIVE use separate API hosts and keys. `MAKSEKESKUS_ENV=test` selects `https://api.test.maksekeskus.ee`; `MAKSEKESKUS_ENV=live` selects `https://api.maksekeskus.ee`. `MAKSEKESKUS_API_BASE` can override the host for diagnostics, but should normally be unset.
