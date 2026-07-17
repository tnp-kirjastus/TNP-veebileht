# 22. Live launch follow-ups

These items need production credentials, provider decisions, or a longer dependency migration window. They should be closed before public launch.

## Credential and environment rotation

- Rotate every secret currently present in `.env.local` before launch, especially service-role, payment, email, shipping, cron, revalidate, and cart-session secrets.
- Replace placeholder values such as `change-me-to-random-bytes` and temporary cart secrets with strong production secrets.
- Confirm `.env.local` is not committed or shared outside the deployment path.

## Maksekeskus end-to-end certification

- Run one successful sandbox payment and confirm:
  - order reaches `paid`;
  - stock reservation is consumed;
  - cart is cleared;
  - confirmation email is sent once;
  - shipment is created once.
- Run one cancelled payment and one expired payment and confirm:
  - order reaches `cancelled` or `expired`;
  - stock reservation is released;
  - no confirmation email or shipment is created.
- Confirm whether Maksekeskus treats `APPROVED` and `COMPLETED` as equivalent final success states in this merchant setup.

## Outbox worker

- Implement a cron or worker for `commerce.outbox` events that are not sent inline:
  - `order.paid`;
  - `payment.manual_reconciliation`;
  - `availability_request` if direct Resend sending fails.
- Use `commerce.claim_outbox`, `commerce.complete_outbox`, and `commerce.fail_outbox` so retries and dead letters work.

## Dependency risk

- `xlsx` has unresolved npm advisories. Keep XLSX parsing admin-only, with strict file-size and file-type limits, then schedule a migration to a maintained parser or isolated processing worker.
- Re-run `npm audit --omit=dev` after each Next.js patch release. Do not use `npm audit fix --force` if it downgrades Next.js.

## AI crawlability policy

- Decide whether AI crawlers should be allowed. Current `robots.ts` blocks GPTBot, OAI-SearchBot, CCBot, Anthropic, and Claude-Web.
- If AI discovery is desired, allow the selected bots and add `public/llms.txt` with high-value catalogue, policy, and contact links.

## Build-time settings fetch

- Production build now succeeds, but static generation logs `getStoreSettings` fallback messages when settings fetches fail.
- Either keep defaults intentionally, or make settings available during build so generated pages use production settings without fallback noise.
