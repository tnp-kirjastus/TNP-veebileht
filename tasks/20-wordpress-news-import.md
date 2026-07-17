# Task 20: Import old WordPress news into the Next.js store

## Scope

Use the old WordPress install only as a read-only source. Do not develop or modify anything under `D:\WORKS\TNP\htdocs`.

The target is the Next.js store at `D:\WORKS\TNP\tnp-store`, using the existing `content.posts` table and `/uudised` / `/uudis/[slug]` pages.

## Source found

- SQL dump: `D:\WORKS\TNP\htdocs\DB\d1640_4585762457.sql`
- WordPress table prefix: `t2n1p_`
- Published WordPress posts found: 111 rows where `post_type = 'post'` and `post_status = 'publish'`
- Newest sampled post: `2026-01-26 15:06:50`, slug `algab-lastejutuvoistlus-minu-esimene-raamat-2`

## Why this is not a raw dump task

The WordPress content includes Visual Composer shortcodes, old host URLs, attachments, and WP-specific markup. Importing it raw would show shortcode noise on the new site. The import must clean content before seeding `content.posts`.

## Implementation

1. Create a script under the Next.js repo, for example `scripts/import-wp-news.mjs`.
2. Read from `D:\WORKS\TNP\htdocs\DB\d1640_4585762457.sql`.
3. Parse multi-line `INSERT INTO t2n1p_posts` statements.
4. Select only `post_type = 'post'` and `post_status = 'publish'`.
5. Map fields:
   - `post_name` -> `content.posts.slug`
   - `post_title` -> `title_et`
   - `post_excerpt` -> `excerpt_et`
   - cleaned `post_content` -> `content_et`
   - `post_date_gmt` or `post_date` -> `published_at`
   - `true` -> `is_published`
6. Parse `t2n1p_postmeta` for `_thumbnail_id`.
7. Resolve thumbnail IDs through `t2n1p_posts` attachment rows and map usable URLs to `image_url`.
8. Rewrite old media URLs to the current public source if the asset remains hosted, or leave `image_url` null if it cannot be verified.
9. Generate a Supabase migration such as `supabase/migrations/024_seed_wp_news.sql` using `ON CONFLICT (slug) DO UPDATE`.
10. Keep current admin editing behavior intact.

## Cleaning rules

- Remove Visual Composer wrapper shortcodes like `[vc_row]`, `[vc_column]`, `[vc_column_text]`.
- Preserve normal HTML paragraphs, links, headings, lists, and images.
- Remove empty paragraphs and `&nbsp;`-only blocks.
- Decode common WordPress escaped characters.
- Keep external links but ensure rendered HTML still passes existing sanitizer.

## Acceptance criteria

- [ ] `/uudised` shows the imported real historical posts instead of mock posts.
- [ ] `/uudis/[slug]` works for imported slugs.
- [ ] Imported content does not display raw shortcode text.
- [ ] Published dates match WordPress dates.
- [ ] Featured images are mapped when a valid attachment exists.
- [ ] Running the import is repeatable and does not duplicate posts.
- [ ] WordPress files under `D:\WORKS\TNP\htdocs` are never modified.

