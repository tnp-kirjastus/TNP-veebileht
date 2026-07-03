# Task 9 — Quality, migration and release gates

## Automated verification

Required on pull requests:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high --omit=dev
```

Add:

- Migration apply/reset tests
- RLS tests for anonymous, customer and staff roles
- Product/admin integration tests
- Import fixture and idempotency tests
- Critical Playwright flows on Vercel Preview
- Secret scanning

## Critical end-to-end flows

- Product CRUD, preview, publish and storefront render
- Bulk edit preview/commit/rollback
- XLSX and CSV preview/commit/repeat import
- Campaign/category/series/person changes
- Blog/news draft/schedule/publish
- Homepage draft/preview/publish/rollback
- Customer registration/login/order isolation
- Guest and signed-in checkout through payment sandbox

## Production-safe migration process

1. Review migration and affected data volume.
2. Test from clean local reset.
3. Test against representative non-production data.
4. Deploy code that is backward-compatible where multi-step migration requires it.
5. Apply migration through the established Supabase workflow.
6. Verify app, constraints, RLS and performance.
7. Promote Vercel deployment.
8. Monitor and use rollback/forward-fix procedure if needed.

Never edit historical order snapshots or destructively reset production.

## Release checklist

- Product/news 500 incident remains resolved.
- Admin role boundaries pass.
- Customer/admin boundary passes.
- No client bundle or log exposes secrets.
- Imports and bulk actions are audited and reversible.
- Revalidation updates public pages.
- Accessibility and mobile admin smoke tests pass.
- Monitoring covers runtime, import, payment, webhook and scheduled-job failures.
- Privacy/retention documentation reflects customer accounts.

## Completion gate

No production promotion if product rendering, RLS isolation, admin authorisation, import safety, payment verification or backup/recovery checks fail.
