"use client";

import { clsx } from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  selectedIds,
  onSelect,
  onSelectAll,
  loading,
  emptyMessage = "Andmed puuduvad.",
  selectable = false,
}: {
  columns: Column<T>[];
  data: T[];
  selectedIds?: Set<string | number>;
  onSelect?: (id: string | number) => void;
  onSelectAll?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
}) {
  return (
    <div className="overflow-x-auto border border-line bg-panel">
      <table className="w-full text-left text-sm">
        <thead className="bg-soft">
          <tr>
            {selectable && (
              <th className="w-12 p-4">
                <input type="checkbox"
                  checked={data.length > 0 && selectedIds?.size === data.length}
                  onChange={onSelectAll}
                  className="accent-ink h-4 w-4" />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className={clsx("p-4 font-extrabold text-xs uppercase tracking-wider text-muted", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-line animate-pulse">
                {selectable && <td className="p-4"><div className="h-4 w-4 bg-soft" /></td>}
                {columns.map((col) => (
                  <td key={col.key} className="p-4"><div className="h-4 bg-soft w-3/4" /></td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={selectable ? columns.length + 1 : columns.length} className="p-12 text-center text-muted">{emptyMessage}</td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.id} className={clsx("border-t border-line hover:bg-soft/50 transition-colors", selectedIds?.has(item.id) && "bg-leaf/5")}>
                {selectable && (
                  <td className="p-4">
                    <input type="checkbox"
                      checked={selectedIds?.has(item.id) ?? false}
                      onChange={() => onSelect?.(item.id)}
                      className="accent-ink h-4 w-4" />
                  </td>
                )}
                {columns.map((col) => {
                  const val = (item as Record<string, unknown>)[col.key];
                  return (
                    <td key={col.key} className={clsx("p-4", col.className)}>
                      {val != null ? String(val) : ""}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
