# Task 2 — Individual product management

## Goal

Allow staff to find, create, edit, preview and publish every aspect of one product.

## Product list

Replace the current first-100 read-only table with server-side search, filters, sorting and pagination.

Search:

- Title
- ISBN/SKU
- Slug
- Contributors
- Series

Filters:

- Publication/availability state
- Stock state
- Category and series
- Origin
- Campaign/sale status
- Release-date range
- Missing cover, description, category or contributor
- Last-updated range

Columns include cover, title/author, ISBN, price, stock, release date, state, campaign/sale, validation warnings and updated time.

## Product editor

Create `/haldus/tooted/uus` and `/haldus/tooted/{id}`.

### Identity

- ID read-only
- Unique ISBN/SKU
- Estonian and optional English title
- Unique slug
- Redirect old published slug after change

### Content

- Short description/subtitle
- Safe rich-text description
- Optional English description
- Featured/badge fields

### Commerce

- Regular price
- Sale price and date range
- Computed discount/effective price preview
- Stock and low-stock threshold
- Pre-order/backorder permission
- Expected availability/dispatch date

### Product state

Support a validated state model: draft, scheduled, upcoming/pre-order, active, out of stock and archived. Prevent impossible combinations such as a future release being silently sold as ordinary in-stock stock.

### Publication metadata

- Binding, page count, release date
- Origin/language/format as required
- Series and volume/order
- Categories with one primary category
- Authors, translators, editors, designers and illustrators with display ordering

### Media

- Primary cover and additional images
- Upload, preview, reorder and replace
- Alt text
- Consistent storage keys without duplicated `/covers/` prefixes
- File type/size/dimension validation and optimised variants

### SEO

- SEO title and description previews
- Canonical URL preview
- Social image/preview
- Indexing override where justified
- Book/Offer structured-data preview

### Actions

- Save draft
- Save and preview
- Publish/schedule
- Archive/unarchive
- View audit history
- Restore a permitted earlier version

## Data and validation

- Add required columns through migrations.
- Preserve historical order-item title and price snapshots.
- Reject duplicate ISBN/slug, invalid money, negative stock, invalid dates and broken relationships.
- Warn on likely duplicate people/series/categories.

## Acceptance criteria

- Every current product field and relationship is editable.
- A new product can be created without code changes.
- Published changes appear after revalidation.
- Invalid state/price/stock combinations cannot be saved.
- Existing orders remain unchanged.
- Product preview reflects the unsaved or draft version safely.

