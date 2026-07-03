# Task 4 — XLSX/CSV catalogue comparison and import

## Goal

Upload a catalogue file, compare it with the working catalogue, review exact changes and safely create/update products and their states.

## Inputs

- `.xlsx`
- UTF-8 `.csv`
- Optional `.tsv`
- Downloadable template and field dictionary
- Export current catalogue in a compatible structure

Import mode must be selected:

- Full authoritative snapshot
- Partial product update
- Stock-only update
- Price-only update

## Workflow

1. Upload file to a temporary protected location.
2. Scan and validate file type/size.
3. Select sheet and map columns.
4. Parse/normalise values and encoding.
5. Match records deterministically.
6. Validate and compute field-level differences.
7. Review new, updated, unchanged, conflicting, invalid and missing rows.
8. Exclude/resolve rows.
9. Approve the import.
10. Apply idempotent transaction/batches.
11. Rebuild/revalidate affected search and storefront content.
12. Download the report and retain rollback metadata.

## Matching

Match in order:

1. Existing source-system mapping/external ID
2. Exact normalised ISBN/SKU
3. Otherwise mark as new

Never automatically merge by fuzzy title or slug. Present likely duplicates as conflicts.

## Comparison statuses

- Unchanged
- New
- Update
- Conflict
- Invalid
- Skipped
- Missing from full snapshot

Updated rows show before/after values for every changed field and relationship.

## Blank/missing rules

- Partial import blank: leave unchanged.
- Missing column: leave unchanged.
- Explicit `[CLEAR]`: clear field after validation.
- Full import may treat configured blanks as clear only after the preview explicitly shows those clears.
- Products missing from a full file are listed for review; never automatically delete/archive them.

## Relationships and media

- Compare categories, series and contributor roles.
- Distinguish adding relationships from replacing the full set.
- Map unknown reference data to existing records, approve creation or reject.
- Detect duplicate/similar people and categories.
- Process cover media asynchronously where appropriate.

## Import jobs

Persist job, file hash, uploader, mode, mapping, options, row results, batch IDs and timestamps. Prevent concurrent catalogue imports. Re-uploading an identical file with the same configuration must be idempotent.

## Acceptance criteria

- Preview causes no catalogue or media mutations.
- Exact new/update/conflict/invalid/missing counts are shown.
- Field and relationship diffs are visible.
- Partial imports cannot erase unrelated data.
- Missing rows are never archived without approval.
- Repeated identical import creates no unintended changes.
- Commit and rollback are audited.

