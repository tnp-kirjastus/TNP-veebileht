# Task 5 — Campaigns, categories, series and people

## Campaigns

Clarify the existing overlap:

- Content campaign: public title, landing content, artwork and product collection.
- Commerce promotion: discount rule, dates and eligibility.

Campaign editor fields/actions:

- Internal/public name, slug and description
- Desktop/mobile banner and alt text
- Draft, scheduled, active, paused and ended states
- Start/end time in Europe/Tallinn display
- SEO fields
- Add products individually, by filter/category, CSV/ISBN paste or selection
- Manual product ordering
- Optional attached percentage/fixed/per-product promotion
- Homepage placement and priority
- Preview at a selected time

Define precedence when product sale dates and campaign promotions overlap. Never overwrite base price merely to display a campaign discount.

## Categories

- Hierarchical tree
- Create/edit name, slug, parent and order
- Description, image, SEO and public/navigation visibility
- Drag/reorder siblings
- Move category
- Merge duplicates with product reassignment and redirect
- Safe archive/delete only after showing child/product references

## Series

- Create/edit name, slug, description, image and SEO
- Order connected products
- Merge duplicates and redirect old slugs

## People

- Create/edit name, slug, biography and portrait
- Display contributor roles and connected products
- Store aliases/source identifiers if required
- Merge duplicates without breaking product links

## Acceptance criteria

- Campaign content, dates, product membership and promotion are editable.
- Scheduled activation/ending behaves correctly.
- Category tree operations preserve product relationships.
- Published slug changes create redirects.
- Series/person merges preserve all product links.
- Destructive operations show affected references and are audited.

