# Admin and customer-area implementation tasks

These tasks implement [ADMIN_AREA_SPEC.md](../../ADMIN_AREA_SPEC.md).

## Operating assumptions

- GitHub, Vercel and Supabase are connected and operational.
- `https://tnp-store.vercel.app/` is the current live production shop.
- Existing Supabase migrations remain the source of truth for database changes.
- Work is performed in Git branches, checked by the existing CI workflow and verified in Vercel Preview before production promotion.
- Existing production data is preserved. Schema changes use forward migrations and reversible/forward-fix plans.
- Environment, account and provider setup are outside this task pack.
- No task may enable `DEV_ADMIN_BYPASS` outside controlled local development.

## Required order

1. [00-live-route-stabilisation.md](./00-live-route-stabilisation.md)
2. [01-admin-foundation.md](./01-admin-foundation.md)
3. [02-product-management.md](./02-product-management.md)
4. [03-bulk-product-editing.md](./03-bulk-product-editing.md)
5. [04-catalogue-import.md](./04-catalogue-import.md)
6. [04a-cover-media-import.md](./04a-cover-media-import.md)
7. [05-campaigns-and-taxonomy.md](./05-campaigns-and-taxonomy.md)
8. [06-blog-and-news.md](./06-blog-and-news.md)
9. [07-homepage-management.md](./07-homepage-management.md)
10. [08-customer-accounts.md](./08-customer-accounts.md)
11. [09-quality-and-release.md](./09-quality-and-release.md)

Product management must be stable before bulk editing and import are allowed to mutate production data. Homepage and editorial work can proceed in parallel after the shared admin foundation is complete.

## Definition of done for every task

- Server-side authorisation is enforced.
- Input is validated server-side.
- Relevant mutations create audit records.
- Production-facing changes trigger appropriate Next.js revalidation.
- Empty, loading, validation, error and success states are implemented.
- Keyboard and mobile admin use are supported.
- Unit/integration tests cover business rules.
- A Vercel Preview is verified before production promotion.
- Documentation and migration notes are updated.
