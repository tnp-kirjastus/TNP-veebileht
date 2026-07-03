# Task 4A — Unified cover-image import

## Goal

Make cover images part of the catalogue import workflow so an administrator can import new books and their covers without running local scripts or manually copying files.

The database, admin area and public storefront must use one cover-media source of truth. A successful import must make the cover visible on the product page and catalogue immediately after revalidation.

## Current problem

- The admin XLSX/CSV import maps ISBN, title, price, stock and description, but ignores cover fields and files.
- `scripts/import-from-excel.mjs` looks for `<ISBN>.jpg`, converts it to WebP and uploads it to Supabase Storage.
- `scripts/match-cover-images.mjs` instead writes files to `public/covers` and updates `src/data/products.json`.
- The product form accepts only a cover filename; it cannot upload or remove a file.
- The storefront renders `/covers/<filename>`, so a Storage upload alone is not guaranteed to appear publicly.

These paths must be replaced by one production workflow. Local scripts may remain only as documented migration/recovery tools and must call the same shared media service where practical.

## Source-of-truth decision

Use the private application-controlled Supabase Storage `covers` bucket as the canonical binary store and `commerce.products.cover_image` as the canonical media reference.

- Store a stable object key, not an environment-specific absolute URL.
- Recommended key: `products/<product-id>/<content-hash>.webp`.
- Resolve the object key through one shared server-side/public URL helper.
- Product cards, product pages, admin previews, metadata and JSON-LD must all use that helper.
- Remove the public storefront's runtime dependency on `src/data/products.json` and `public/covers` before enabling production imports, or provide a temporary backward-compatible resolver for legacy filenames.

## Administrator workflow

### Catalogue file

Support the optional columns:

- `cover_file` — filename in the uploaded media archive
- `cover_url` — HTTPS source URL, if remote import is explicitly enabled
- existing aliases `Pilt` and `Toote Kaanepilt`

ISBN remains the deterministic product-matching key. A cover filename is not used to match products.

### Media upload

The import page accepts:

1. the existing XLSX/CSV/TSV catalogue file; and
2. an optional ZIP archive containing JPG, JPEG, PNG, WebP, AVIF or TIFF cover files.

Default filename matching:

1. exact `cover_file` value;
2. exact normalised ISBN filename, such as `9789916178409.jpg`;
3. otherwise mark the cover as missing or ambiguous—never guess by fuzzy title.

The preview must show:

- current and proposed cover thumbnails;
- `new`, `replace`, `unchanged`, `missing`, `ambiguous` or `invalid` media status;
- source filename, detected dimensions and validation errors;
- whether applying the row will replace an existing cover.

Administrators can exclude an individual cover replacement before applying the import.

## Image processing

Process images on the server, never in the browser:

- verify the actual file signature rather than trusting the extension or MIME header;
- reject files over the configured compressed-size and pixel-count limits;
- apply EXIF rotation;
- strip metadata;
- preserve aspect ratio;
- resize inside 1200 × 1800 without enlargement;
- encode WebP at quality 86;
- record width, height, byte size and a SHA-256 content hash;
- deduplicate identical content by hash where safe.

Do not upscale small images. The preview must warn when the source is below the recommended minimum of 600 × 900.

## Security and operational requirements

- Require the existing `admin` catalogue-import permission server-side.
- Reject ZIP path traversal, symlinks, nested archives and decompression bombs.
- Set limits for archive size, file count, per-file size, total expanded size and processing time.
- Do not fetch arbitrary URLs by default. If `cover_url` is enabled, require HTTPS, block private/link-local addresses, revalidate redirects and enforce download limits to prevent SSRF.
- Use generated Storage object keys; never trust an uploaded path.
- Keep import files private and delete temporary files after success or expiry.
- Do not expose service-role credentials or signed upload authority to the client.

## Apply semantics

1. Parse and validate the catalogue and archive without mutations.
2. Persist an import job, file hashes, row/media results and administrator identity.
3. On approval, create/update product data and upload processed media.
4. Update `cover_image` only after the Storage upload succeeds.
5. If the database update fails, remove newly uploaded unreferenced objects.
6. If media processing fails, do not silently clear or replace the existing cover.
7. Record before/after cover keys in the audit event.
8. Revalidate the affected product URL, catalogue pages, homepage, sitemap and social metadata.
9. Repeating the identical import must not create new objects or further mutations.

For partial imports, a blank cover field leaves the existing cover unchanged. Clearing a cover requires an explicit `[CLEAR]` value and confirmation in the preview.

## Product editor

Replace the filename-only field with:

- current cover preview;
- file picker/drop zone;
- replace action;
- explicit remove action;
- upload progress and validation feedback.

The product editor must use the same validation, processing and Storage service as catalogue import.

## Legacy migration

Provide a one-time, idempotent migration command that:

1. reads existing `cover_image` references;
2. finds legacy files under `public/covers`;
3. processes and uploads them through the shared media service;
4. updates the database reference only after successful upload;
5. produces matched, missing, ambiguous and failed reports;
6. supports preview/dry-run and resumable apply modes.

Do not delete legacy files during the first release. Remove them only after production verification and a separate approved cleanup.

## Tests

### Unit tests

- ISBN and filename normalisation
- alias-column mapping
- image signature and dimension validation
- output sizing and format
- hash generation and deduplication
- ZIP entry/path validation
- blank, replacement and `[CLEAR]` semantics

### Integration tests

- catalogue plus ZIP preview causes no mutations
- new product plus cover
- existing product cover replacement
- existing cover preserved when media is missing or invalid
- upload failure leaves the database unchanged
- database failure cleans up the new unreferenced object
- repeated import is idempotent
- unauthorised users cannot preview, upload or apply media

### End-to-end tests

- upload XLSX and ZIP, preview, apply, and verify the cover in admin
- verify the same cover on catalogue card and product page
- verify `og:image` and product JSON-LD use the resolved production URL
- verify mobile and keyboard operation of upload, preview and exclusion controls

## Acceptance criteria

- An administrator can import a new book and ISBN-named cover using only the admin UI.
- No local filesystem path or manual script is required in production.
- Preview clearly reports every cover addition, replacement, omission and error.
- Applying an import never removes an existing cover implicitly.
- Uploaded covers appear on public pages and in metadata after revalidation.
- Admin, storefront and structured data resolve the same canonical cover object.
- Import and manual product editing use the same media-processing implementation.
- The workflow is authorised, audited, idempotent and covered by automated tests.
- Existing production covers remain visible throughout migration and rollback.

## Completion gate

Do not enable cover mutations in production while the admin catalogue and public storefront read different product/media sources. The unified source-of-truth path, legacy compatibility and rollback verification are mandatory release prerequisites.
