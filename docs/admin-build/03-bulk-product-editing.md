# Task 3 — Bulk product editing

## Goal

Apply controlled changes to selected products or all products matching a filter without overwriting unrelated fields.

## Selection

- Select individual rows.
- Select current page.
- Select all records matching the current filters with an explicit affected count.
- Preserve selection while paging where practical.

## Supported actions

- Change publication/availability state
- Archive/unarchive
- Set or adjust stock
- Set regular price or adjust by amount/percentage
- Set/remove sale price and dates
- Add/remove categories
- Assign/remove series
- Add/remove campaign membership
- Set origin
- Set upcoming/pre-order and expected date
- Set featured flag
- Export selection

Each editable field supports:

- Leave unchanged
- Set/replace
- Clear

## Preview and commit

1. Show the affected count.
2. Validate every resulting record.
3. Display a sampled and downloadable before/after diff.
4. Show conflicts and records that will be skipped.
5. Require explicit confirmation.
6. Commit using a batch ID.
7. Revalidate affected storefront paths.
8. Produce a result report.

Do not hard-delete products referenced by orders. Archive them.

## Rollback

- Store sufficient batch metadata to reverse only fields changed by the bulk action.
- Do not overwrite later unrelated edits during rollback.
- Restrict rollback/destructive operations to administrators.

## Acceptance criteria

- Unselected and untouched fields remain unchanged.
- A filtered “select all” clearly reports its complete scope.
- Invalid records block or skip safely with explanations.
- Every batch is auditable and reportable.
- Approved batches can be safely reversed within the defined policy.

