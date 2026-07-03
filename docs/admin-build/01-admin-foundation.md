# Task 1 — Shared admin foundation

## Goal

Turn the existing protected admin shell into a consistent foundation for editable resources.

## Work

### Navigation and dashboard

- Add Products, Import, Campaigns, Categories, Series, People, Blog/News, Homepage, Customers, Orders and Audit navigation.
- Add active navigation state and responsive navigation.
- Display the current staff user and role.
- Add dashboard cards for product states, validation problems, low stock, campaigns, drafts, imports, customer requests and recent changes.

### Permissions

- Keep `viewer`, `editor` and `admin` as staff roles.
- Viewer: read-only admin access.
- Editor: content/catalogue editing and preview.
- Admin: imports, bulk destructive actions, account actions and role management.
- Enforce every permission in server actions/routes, not only by hiding buttons.
- Customer authentication must never satisfy staff-role checks.

### Shared admin components

- Page header and action area
- Search/filter toolbar
- Paginated data table
- Selection controls
- Status badges
- Form field/error components
- Confirmation dialog
- Before/after diff viewer
- Media picker
- Empty/loading/error states
- Toast or result feedback

### Audit and concurrency

- Record actor, action, resource, record ID, source and safe before/after summary.
- Add optimistic concurrency using `updated_at` or an equivalent version field.
- Warn rather than overwrite when another edit has been saved since the form opened.
- Avoid storing secrets or unnecessary customer personal data in audit summaries.

### Revalidation

- Centralise safe revalidation for changed products, category/series pages, news, campaigns and homepage.
- Only allow known path patterns.
- Ensure failed revalidation does not silently report a successful save.

## Acceptance criteria

- Each staff role receives exactly its allowed capabilities.
- Shared table/forms work on desktop and mobile.
- Mutations are validated and audited.
- Concurrent edits are detected.
- Preview deployments cannot use the local admin bypass.

