# Tänapäev webshop admin area specification

## 1. Purpose

The admin area is the operational control centre for the catalogue, merchandising, editorial content, homepage, customer service and supporting reference data. An authorised staff user must be able to maintain the shop and assist customers without editing source files, running command-line scripts or asking a developer to publish routine changes.

The system should make common work fast while making destructive changes deliberate, previewable, auditable and reversible.

## 2. Current implementation and principal gaps

The project already has protected admin navigation, authentication roles, an audit table, product/category/series/person/campaign tables, a working basic blog/news editor and catalogue import logic.

Current gaps:

- Products, campaigns, categories, series and people are list/read-only views.
- There is no individual product editor.
- There is no bulk product selection or bulk edit workflow.
- Excel import runs from the command line and does not compare changes in an admin preview.
- CSV upload is not supported.
- Import does not provide a durable job report, approval step or rollback.
- Campaign membership and campaign content cannot be edited.
- Categories cannot be created, moved, merged or safely removed.
- Blog/news editing uses raw HTML rather than an editor and media library.
- Homepage hero and promotional cards are hard-coded in the storefront.
- Catalogue state is spread across stock and boolean fields, which can create inconsistent combinations.
- There is no customer registration, login, account profile or account-linked order history.
- Orders contain guest contact details but are not owned by a durable customer identity.
- The existing `public.profiles` table represents staff roles and must not be reused as the customer profile/authorisation model.

## 3. Users, roles and permissions

Keep the existing staff `viewer`, `editor` and `admin` roles, but enforce permissions at the server/action level as well as in the interface. A customer is not an admin role. Customer storefront sessions and staff admin sessions must use distinct authorisation checks, routes and profile data even if both identities are ultimately backed by the same authentication provider.

| Capability | Viewer | Editor | Admin |
|---|---:|---:|---:|
| View products, content and import reports | Yes | Yes | Yes |
| Edit products and reference data | No | Yes | Yes |
| Create and edit news, campaigns and homepage content | No | Yes | Yes |
| Publish or schedule content | No | Yes | Yes |
| Change prices, stock and product state | No | Yes | Yes |
| Run a preview import | No | Yes | Yes |
| Commit a catalogue import | No | Optional | Yes |
| Bulk archive/delete/merge records | No | No | Yes |
| Manage users and roles | No | No | Yes |
| View customer service records | No | Optional | Yes |
| Suspend/restore customer access and process privacy requests | No | No | Yes |
| View detailed audit history and rollback imports | No | No | Yes |

Recommended additions:

- Require recent re-authentication for imports, bulk archive, category merge and user management.
- Show the current environment prominently so staging cannot be confused with production.
- Never rely on hidden controls alone; every mutation must verify the role on the server.
- Never grant `/haldus` access merely because a customer has an authenticated session; require an explicit active staff profile and role.

## 4. Admin navigation and dashboard

Primary navigation:

1. Overview
2. Products
3. Import centre
4. Campaigns
5. Categories
6. Series
7. People
8. Blog / News
9. Homepage
10. Customers
11. Media
12. Orders
13. Audit log
14. Settings and users

The dashboard should show:

- Product totals by state: draft, upcoming, active, out of stock and archived.
- Products with validation issues, missing covers, missing categories or future dates with the wrong state.
- Low-stock and out-of-stock products.
- Active, scheduled and recently ended campaigns.
- Draft and scheduled news posts.
- Last catalogue import, its result and unresolved conflicts.
- New customer registrations, locked/suspended accounts and open privacy requests.
- Guest versus account checkout/order counts and failed account-verification notifications.
- Recent admin changes.
- Shortcuts for new product, import catalogue, new campaign, new news post and edit homepage.

## 5. Product catalogue

### 5.1 Product list

The list must support server-side search, filters, sorting and pagination for the complete catalogue, not only the first 100 records.

Search by:

- Title
- ISBN/SKU
- Slug
- Author and other contributors
- Series

Filters:

- Product state
- Stock state
- Category and subcategory
- Series
- Author origin
- Campaign membership
- Sale active/scheduled/expired
- Release-date range
- Missing cover, description, category or SEO fields
- Last updated by/date

Useful columns:

- Selection checkbox
- Cover thumbnail
- Title and primary author
- ISBN/SKU
- Regular and effective price
- Stock
- Release date
- Product state
- Campaign/sale indicator
- Last updated
- Validation warning count

The user should be able to save common filter views, choose visible columns and export the current selection as CSV/XLSX.

### 5.2 Individual product editor

Every product needs a dedicated URL, for example `/haldus/tooted/{id}`, with autosave protection, explicit Save and Save & Preview actions, unsaved-change warnings and an audit/history panel.

#### Identity

- Internal ID, read-only
- ISBN/SKU, unique and required
- Estonian title, required
- English title
- URL slug, unique; warn before changing a published URL
- Optional legacy/external catalogue ID

If a published slug changes, create a permanent redirect from the old product URL.

#### Description and merchandising

- Short description/subtitle
- Full Estonian description using a safe rich-text editor
- English description if used
- Highlight/badge text
- Featured product toggle
- Manual related products or merchandising override

#### Price and sale

- Regular price
- Sale price
- Sale start and end date/time
- Computed effective price and discount percentage preview
- VAT/tax classification if this may vary later

Validation must reject negative prices, sale price above regular price and end dates before start dates.

#### Inventory and availability

- Stock quantity
- Optional low-stock threshold
- Backorder/pre-order allowed
- Expected availability or dispatch date
- Product state
- Archive reason/internal note

Recommended product states:

- `draft`: exists in admin but is not public
- `scheduled`: prepared and becomes public on a specified date
- `upcoming`: public and available for pre-order
- `active`: public and available for ordinary purchase
- `out_of_stock`: public but cannot currently be purchased
- `archived`: sold out/discontinued and shown only in the archive

The public state should be derived or validated against stock, release date and pre-order settings. For example, a future release cannot silently be presented as an ordinary in-stock title.

#### Publication details

- Binding
- Page count
- Release date
- Edition/format/language if needed
- Publisher/imprint if needed
- Author origin: Estonian/foreign
- Series and optional order/volume within series

#### Classification and contributors

- One or more categories; identify a primary category
- Authors
- Translators
- Editors
- Designers
- Illustrators
- Contributor ordering where display order matters

Users should select existing records or create a new person/series/category in a controlled inline dialog. Similar-name warnings should prevent duplicates.

#### Media

- Primary cover
- Additional product images
- Drag-to-reorder
- Image crop/preview
- Alt text
- Replace image without changing the product
- Validate file type, size and dimensions
- Generate optimised image variants

Store a clean storage key rather than sometimes storing `filename.webp` and sometimes `/covers/filename.webp`.

#### SEO and discoverability

- SEO title with length preview
- Meta description with length preview
- Canonical URL preview
- Social-share image/preview
- Search visibility/indexing override where legitimately required
- Structured-data preview and validation summary

#### Preview and history

- Preview the storefront product page before publishing.
- Show who changed which fields and when.
- Allow an admin to restore an earlier version.
- Show imports, campaigns and orders that reference the product.

### 5.3 Bulk product operations

Bulk actions should work on selected rows or all records matching the current filters. Before applying, show the number of affected products and a sample of changes.

Required bulk actions:

- Set product state
- Archive/unarchive
- Set or adjust stock
- Set regular price or adjust by fixed amount/percentage
- Set/remove sale price and sale dates
- Add/remove categories
- Assign/remove series
- Add/remove campaign membership
- Set origin
- Set upcoming/pre-order state and expected date
- Set featured flag
- Export selected products

Bulk editing must support three field modes:

- Leave unchanged
- Set/replace value
- Clear value

Destructive operations require confirmation, an audit entry and a rollback batch identifier. Products referenced by paid orders must never be physically deleted; archive them instead.

## 6. Catalogue import centre

### 6.1 Supported inputs

- `.xlsx`
- `.csv` with UTF-8 as the default
- Optional `.tsv`
- A downloadable current import template and field dictionary
- Download/export of the current catalogue in the same structure

The user chooses whether the file is:

- A full authoritative catalogue snapshot
- A partial update containing only selected products/fields
- A stock-only or price-only update

This choice determines how missing products and blank cells are interpreted.

### 6.2 Import workflow

```mermaid
flowchart LR
  A["Upload file"] --> B["Map columns"]
  B --> C["Parse and normalise"]
  C --> D["Match catalogue records"]
  D --> E["Validate and compare"]
  E --> F["Review changes and conflicts"]
  F --> G["Approve import"]
  G --> H["Apply in transaction/batches"]
  H --> I["Reindex and revalidate storefront"]
  I --> J["Report, audit and rollback"]
```

No database or media changes occur before approval.

### 6.3 Matching rules

Use a deterministic order:

1. Exact internal/external catalogue ID when supplied
2. Exact normalised ISBN/SKU
3. Existing saved source-system mapping
4. Otherwise mark as a potential new product

Never automatically merge products based only on title, slug or fuzzy similarity. Show likely duplicates as conflicts for human review.

Normalise ISBN values by removing spreadsheet formatting and spaces while preserving leading zeros where relevant. Treat Excel scientific notation explicitly.

### 6.4 Comparison results

Every row should receive one status:

- `unchanged`
- `new`
- `update`
- `conflict`
- `invalid`
- `skipped`
- `missing_from_file`

For updated products, show a field-level before/after diff. The reviewer must be able to filter by status, validation problem or changed field and exclude individual rows from the import.

Summary example:

- 786 matched
- 42 unchanged
- 18 new
- 65 updates
- 3 conflicts
- 2 invalid
- 11 existing products missing from a full snapshot

### 6.5 Blank and missing values

Blank cells must not silently erase existing values.

Recommended rules:

- In partial imports, blank means “leave unchanged.”
- An explicit token such as `[CLEAR]` clears a field.
- In authoritative full imports, the column mapping can optionally define blank as clear, but the reviewer must approve the resulting clears.
- Missing columns always mean leave unchanged.

### 6.6 Products missing from an uploaded catalogue

Never automatically delete or archive missing products without review.

For a full snapshot, list missing products and offer:

- Leave unchanged
- Mark out of stock
- Archive selected products
- Export the missing list for investigation

Partial imports must ignore catalogue products that are not present in the file.

### 6.7 Related data

The preview must include changes to:

- Categories
- Series
- People and contributor roles
- Product relationships
- Cover images
- Product states
- Price and sale schedules

Unknown categories/series/people should be mapped to an existing record, created with approval or rejected. The system should detect naming differences and likely duplicates.

Importing updated relationships should distinguish “add these relationships” from “replace the complete relationship set.”

### 6.8 Validation

Validate at minimum:

- Required and unique ISBN/SKU
- Required title
- Unique/valid slug
- Valid money and integer formats
- Sale price and date constraints
- Stock is non-negative
- Release date and upcoming state agree
- Referenced categories/series/people exist or are approved for creation
- Image paths/files are safe and valid
- Encoding is valid UTF-8 and Estonian characters survive round-tripping

Errors block affected rows. Warnings can be approved explicitly.

### 6.9 Commit, report and rollback

- Apply data in a database transaction where practical, or resumable idempotent batches for large imports/media.
- Prevent two imports from modifying the catalogue concurrently.
- Record file hash, uploader, mapping, options, counts, row results and timestamps.
- Make repeat uploads idempotent.
- Rebuild search data and revalidate affected storefront pages after commit.
- Provide a downloadable error/change report.
- Allow an admin to roll back the catalogue fields changed by an import while preserving later unrelated edits and order history.

## 7. Campaign management

The codebase currently has both content campaigns and commerce promotions. The product design should clarify their responsibilities or unify them:

- Campaign: customer-facing landing page, title, message, artwork and product collection.
- Promotion: price/discount rule and eligibility.

A campaign editor should include:

- Internal name and public title
- Slug
- Description/rich text
- Banner and mobile image
- Start/end date and timezone
- Draft, scheduled, active, paused and ended states
- Landing-page SEO fields
- Products selected individually, by filter, category, import or bulk paste of ISBNs
- Manual product ordering
- Optional attached promotion/discount rule
- Homepage placement and priority
- Preview at a chosen date/time

Discount options, if managed here:

- Fixed sale price per product
- Percentage discount
- Fixed amount discount
- Date-limited offer
- Exclusions and minimum-price validation

Do not overwrite a product’s base price merely to display a campaign price. Define conflict precedence when product sales and campaign promotions overlap.

## 8. Category management

Provide a hierarchical tree with drag-to-reorder and clear parent/child relationships.

Required actions:

- Create and edit category
- Change parent
- Reorder siblings
- Set primary navigation visibility
- Archive/hide category
- Merge duplicate categories
- Redirect an old slug after rename/merge

Fields:

- Estonian name
- Slug
- Parent
- Sort order
- Description/introduction
- Category image if required
- SEO title and meta description
- Indexing/public visibility

Before deleting or merging, show affected product counts and child categories. A category with references cannot be hard-deleted until products/children have been reassigned.

## 9. Series and people

Although not explicitly merchandising modules, both are essential to complete product editing.

Series editor:

- Name, slug, description and image
- SEO fields
- Ordered products in the series
- Merge duplicates and redirect old slugs

People editor:

- Name, slug, biography and portrait
- Contributor roles
- Connected products
- Name aliases/source identifiers
- Merge duplicates without breaking product links

## 10. Blog / News

Retain the current draft/published foundation and add:

- Safe rich-text/block editor instead of raw HTML
- Featured image upload and media picker
- Image alt text and caption
- Excerpt
- SEO title, description and social preview
- Draft, scheduled, published and archived states
- Publish/unpublish dates
- Preview before publication
- Optional content type, tags or category
- Author/byline if required
- Duplicate post
- Revision history and restore
- Redirects when a published slug changes

The post list needs search, status/date filters, pagination and bulk publish/unpublish/archive actions.

## 11. Homepage management

Add a dedicated Homepage module. The storefront should read published homepage configuration from the content database rather than hard-coded JSX.

### 11.1 Hero fields

- Internal configuration name/version
- Eyebrow/label
- Main heading
- Supporting text
- Primary CTA label and target
- Optional secondary CTA
- Search box visibility and placeholder
- Desktop hero image
- Mobile hero image
- Image alt text
- Background/theme colour
- Text alignment/layout variant
- Start/end schedule
- Draft/published state

### 11.2 Featured hero cards

The current history, children’s and hobby cards should be independently editable:

- Label
- Heading
- Description
- Link target
- Image and alt text
- Background colour/theme
- Position/order
- Visibility and schedule

Allow adding/removing cards within layout limits rather than fixing the homepage permanently to three cards.

### 11.3 Homepage sections

The admin should also control:

- Section visibility
- Section order
- Heading and “view all” link
- Product source: newest, upcoming, campaign, sale, category, manual selection
- Product count
- Background/theme

Provide desktop and mobile preview, scheduled preview, publish, version history and rollback. Validate that internal links exist and images/alt text are present.

## 12. Media library

A shared media library should support product covers, campaign banners, homepage artwork and news images.

- Upload with type/size/dimension validation
- Search by filename, product or usage
- Automatic optimisation and responsive variants
- Crop/focal-point tools where appropriate
- Alt text and caption metadata
- Usage/reference list before deletion
- Prevent deletion of files still in use
- Replace media while preserving references

## 13. Orders

The existing order list remains separate from catalogue/content editing. It should eventually support:

- Search by order number, name or email
- Status/date/payment filters
- Order detail and timeline
- Shipping and payment information
- Permitted fulfilment status transitions
- Internal notes
- Export for fulfilment/accounting
- Refund/manual-review actions restricted to administrators
- Customer account link and whether the order was placed as a guest or signed-in customer
- A safe “link to verified customer” action for exceptional support cases

Product catalogue edits must never rewrite historical order item titles or prices.

Orders should store a nullable immutable `customer_id` in addition to the order-time name, email, phone and address snapshot. Customer profile edits must not rewrite historical order contact or fulfilment data.

## 14. Customers and customer accounts

Customer accounts are primarily a storefront capability, but the admin requires a controlled customer-service view. Staff authentication and customer authentication must remain separate security domains in application logic.

### 14.1 Customer storefront account

Customers should be able to:

- Register with email and password, with email verification
- Log in and log out
- Request a password-reset email
- Optionally use an email magic link
- View and edit name, phone and preferred language
- Change email through a verified change flow
- Change password and revoke other sessions
- Save, edit and remove delivery addresses
- Set newsletter/marketing preferences with separate consent records
- View order history and individual order status
- View products, quantities, prices, payment and fulfilment snapshots for each order
- Reorder available products into the current cart
- Download an invoice/receipt when available
- Request a personal-data export
- Request account deletion

Account creation should remain optional. Guest checkout should continue to work unless the business explicitly decides otherwise. After guest checkout, the customer may be invited to create an account and claim the completed order through a verified, expiring link.

### 14.2 Checkout and order ownership

- When signed in, checkout should prefill profile and selected address data, while allowing edits for that order.
- A newly created order should be linked to the authenticated customer ID server-side; never trust a customer ID supplied by the browser.
- A guest order should keep `customer_id = null` and continue using the existing secure confirmation token.
- Do not expose historical orders merely because their email text matches the current account email.
- Claiming a historical guest order requires control of the order email plus an expiring single-use claim token or equivalent re-verification.
- Changing a customer’s account email must not silently transfer orders from another identity.
- Merged accounts and transferred orders require an administrator, explicit confirmation and a complete audit trail.

### 14.3 Customer admin list

The Customers module should provide server-side search, filters and pagination.

Search by:

- Name
- Normalised email
- Phone
- Customer/account ID
- Order number

Filters:

- Active, unverified, locked, suspended or deletion-requested
- Registration date and last activity date
- Has orders/no orders
- Guest-order claim pending
- Marketing consent state
- Total orders/lifetime value range

Columns should include name, email, verification state, account state, registration date, last sign-in, order count, lifetime value and open support/privacy flags. Financial summaries should be calculated from eligible paid orders and must exclude cancelled/refunded amounts as defined by the business.

### 14.4 Customer detail and staff actions

The detail page should show:

- Customer ID and account state
- Verified email and contact profile
- Saved addresses, with sensitive fields visible only to authorised staff
- Orders and order timeline
- Consent history with source, wording/version and timestamp
- Account/security events such as verification, password reset request, suspension and session revocation
- Privacy/export/deletion requests
- Internal support notes with author and timestamp
- Audit history

Permitted staff actions:

- Resend verification email
- Trigger a password-reset email
- Suspend/reactivate account access
- Revoke all customer sessions
- Correct non-identity profile fields where policy allows
- Link an order only after the secure ownership check
- Start/export a customer data package
- Process anonymisation/deletion according to retention rules
- Merge confirmed duplicate accounts as an administrator-only audited operation

Staff must never see, retrieve or set a customer’s password. Password reset and verification links must be generated by the authentication provider, expire quickly and never appear in audit payloads.

Avoid general-purpose account impersonation. Prefer a read-only support view. If impersonation is later judged essential, make it administrator-only, time-limited, separately re-authenticated and heavily audited, with a persistent “support session” banner; block payment, password, email, consent and destructive actions during impersonation.

### 14.5 Account states

Recommended account states:

- `pending_verification`
- `active`
- `locked` after security/rate-limit events
- `suspended` by an administrator
- `deletion_requested`
- `anonymised`

Authentication provider state and business profile state should be reconciled but not conflated. Suspending the customer profile must reliably prevent storefront access even if an authentication session still exists.

### 14.6 Privacy and data protection

- Collect only data needed for accounts, fulfilment, support and explicitly consented marketing.
- Treat transactional communication and marketing consent separately.
- Store consent text/version, source, timestamp and withdrawal history.
- Provide customer self-service export and deletion requests with identity re-verification.
- Define retention rules for customer profiles, addresses, audit events and legally required order/accounting records.
- Deletion should anonymise removable profile data while retaining the minimum legally required immutable order records.
- Never place addresses, phone numbers, reset tokens, session tokens or complete customer payloads in ordinary audit summaries or application logs.
- Restrict customer export/deletion processing to administrators and record each step.

### 14.7 Customer security

- Use the authentication provider’s password hashing and session handling; never store passwords in application tables.
- Require email verification before exposing account order history or sensitive actions.
- Rate-limit registration, login, reset, verification resend and order-claim flows.
- Prevent account enumeration by returning neutral login/reset messages.
- Protect authenticated mutations against CSRF and verify origin where applicable.
- Rotate sessions after login, password/email changes and privilege-sensitive events.
- Offer optional multi-factor authentication later, especially for high-value accounts.
- Apply row-level security so customers can access only their own profile, addresses, consents and linked orders.
- Use service-role access only in trusted server code; never expose it to the browser.
- Alert/log suspicious login and account-change activity without storing secrets.

### 14.8 Customer data model

Recommended tables/relationships:

- `customer_profiles`: `user_id` referencing the authentication identity, display/contact fields, locale, state and timestamps
- `customer_addresses`: customer-owned delivery addresses with labels and one optional default
- `customer_consents`: consent purpose, policy/version, granted/withdrawn timestamp and source
- `customer_privacy_requests`: export/deletion request lifecycle
- `customer_support_notes`: restricted internal notes
- `order_claims`: hashed single-use token, order, intended email/customer and expiry
- `commerce.orders.customer_id`: nullable customer profile/identity reference

Keep staff role profiles separate from customer profiles. If both share `auth.users`, all staff checks must still require an explicit staff profile with an allowed role, and customer row-level policies must never infer admin privilege from ordinary authentication alone.

## 15. Audit, safety and operational behavior

Audit every mutation with:

- Actor
- Timestamp
- Action
- Resource and record ID
- Before/after field summary
- Source: manual, bulk edit, import or automation
- Batch/import identifier

Additional requirements:

- Optimistic concurrency: warn when another user changed a record after it was opened.
- Soft deletion/archive for business records.
- Confirmation for destructive/broad actions.
- Clear success/error feedback and actionable row-level validation.
- Store timestamps in UTC and display them in `Europe/Tallinn`.
- Revalidate affected storefront pages after publication changes.
- Preserve an accessible keyboard workflow and visible focus states.
- Do not expose service-role credentials or database access to the browser.
- Scan uploads and enforce safe MIME types and file-size limits.
- Redact customer personal data and all authentication/claim secrets from audit summaries.
- Record customer-service actions, but do not turn the audit log into a second ungoverned copy of customer data.

## 16. Recommended supporting data changes

The existing schema is a good base but needs extensions:

- Add a single validated product publication/availability state or strict rules that derive it from existing fields.
- Add product short description, expected dispatch date, primary category, low-stock threshold and SEO fields.
- Add product version/history or field-level audit snapshots.
- Add category description, SEO, visibility, redirect and `updated_at` fields.
- Add SEO and `updated_at` fields to series.
- Add person portrait, aliases/source IDs and SEO fields if public people pages are introduced.
- Add homepage configuration/blocks with versions, schedules and publication state.
- Add media asset and asset-usage tables.
- Add import jobs, import rows, mappings and rollback metadata.
- Resolve the overlap between `content.campaigns`, `commerce.promotions` and product-level sale fields.
- Add the customer profile, address, consent, privacy request, support note and order-claim structures described above.
- Add nullable `customer_id` to orders while retaining immutable order-time customer snapshots.
- Add explicit staff/customer authorisation boundaries and customer-owned row-level security policies.

## 17. Delivery phases

### Phase 1: catalogue operations

- Product list with complete search/filter/pagination
- Individual product editor covering every current database field and relationship
- Product validation, preview and audit
- Category, series and people CRUD
- Safe image upload

### Phase 2: bulk and import

- Bulk selection/editing
- XLSX/CSV upload and column mapping
- Catalogue comparison/diff preview
- Conflict handling, approval, reports and import history
- Controlled treatment of missing products
- Rollback support

### Phase 3: merchandising and content

- Campaign and promotion editor
- Improved blog/news editor
- Homepage hero/cards/sections editor
- Media library
- Scheduling and preview

### Phase 4: customer accounts

- Customer registration, verification, login, logout and password reset
- Customer profile, address book and session/security controls
- Signed-in checkout prefill with guest checkout preserved
- Account-linked orders and secure guest-order claim flow
- Customer order history, detail and reorder
- Customer admin list/detail with tightly scoped support actions
- Consent history and privacy export/deletion requests
- Customer row-level security, rate limiting and security tests

### Phase 5: operational refinement

- Saved views and exports
- Product/content version restore
- Advanced order operations
- Dashboard alerts and data-quality reporting
- Staff user/role management
- Customer account reporting and support workflow refinement

## 18. Minimum acceptance criteria

The admin area is ready for routine catalogue operation when:

1. An editor can create, fully edit, preview and publish one product without code changes.
2. An editor can update selected product fields across many products without clearing unrelated data.
3. An admin can upload XLSX/CSV, see exact new/changed/conflicting/missing records, approve selected changes and download the result.
4. Re-uploading the same file produces no unintended changes.
5. Missing rows never cause automatic deletion or archiving without explicit approval.
6. Campaigns, category hierarchy, series and contributors can be maintained safely.
7. News can be drafted, previewed, scheduled, published and revised.
8. Homepage hero, feature cards and product sections can be edited, previewed and rolled back.
9. Every mutation is permission-checked, validated and auditable.
10. Publishing or importing revalidates the affected storefront content without a deployment.
11. A customer can register, verify, sign in, reset credentials and manage their own profile without gaining any admin access.
12. Guest checkout remains functional and signed-in checkout links new orders to the authenticated customer server-side.
13. Customers can access only their own linked orders; matching an email address alone never grants historical order access.
14. Staff can assist, suspend and process privacy requests without seeing passwords or authentication tokens.
15. Account deletion/export and consent history follow explicit retention, verification and audit rules.
