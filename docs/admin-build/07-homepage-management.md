# Task 7 — Homepage hero and section management

## Goal

Replace hard-coded homepage hero/cards/sections with editable, versioned content.

## Hero editor

- Internal version name
- Eyebrow/label
- Main heading
- Supporting text
- Primary and optional secondary CTA labels/targets
- Search box visibility and placeholder
- Desktop/mobile images and alt text
- Background/theme and layout variant
- Start/end schedule
- Draft/published state

## Featured hero cards

Each current history, children and hobby card becomes an editable record:

- Label
- Heading
- Description
- Link target
- Desktop/mobile image and alt text
- Background/theme
- Position/order
- Visibility and schedule

Allow cards to be added/removed within defined layout limits.

## Homepage sections

- Visibility and order
- Heading and “view all” link
- Product source: newest, upcoming, campaign, sale, category or manual selection
- Product count
- Background/theme
- Optional editorial section type

## Publishing

- Desktop/mobile preview
- Preview scheduled state at a selected time
- Validate internal links and required media/alt text
- Publish atomically
- Version history and rollback
- Revalidate homepage after publish

## Acceptance criteria

- Hero, cards and product sections are editable without code/deployment.
- Draft changes are previewable but not public.
- Invalid/broken links and missing required media block publishing.
- Published configuration renders on desktop/mobile.
- A previous homepage version can be restored safely.

