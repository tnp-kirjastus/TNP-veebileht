# Task 6 — Blog and news management

## Goal

Complete the existing basic post editor so editorial staff can draft, preview, schedule, publish and revise news without raw HTML work.

## Work

- Searchable, paginated post list
- Draft, scheduled, published and archived filters
- Safe rich-text/block editor
- Featured image upload/media picker
- Image alt text and caption
- Title, slug, excerpt and content
- SEO title/description and social preview
- Draft, scheduled, published and archived states
- Publish/unpublish dates
- Optional type/category/tags and byline
- Duplicate post
- Preview unpublished version
- Revision history and restore
- Redirect old published slug
- Bulk publish/unpublish/archive where safe

Rich-text sanitisation must work in the Vercel production runtime; Task 0 resolves the current shared sanitizer failure before this editor is released.

## Acceptance criteria

- Editor can publish without writing HTML.
- Draft/scheduled content is not publicly exposed.
- Scheduled publication uses the intended timezone.
- Images include alt-text support.
- Slug changes preserve old inbound links.
- News detail pages render without server errors.
- Save/publish/unpublish operations are audited and revalidated.

