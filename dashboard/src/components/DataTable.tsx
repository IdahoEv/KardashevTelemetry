import type { ReactNode } from "react";
import "./DataTable.css";

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface Column<Row> {
  key: string;
  header: string;
  numeric?: boolean;
  render: (row: Row) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<Row> {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  sort?: SortState | null;
  onSortToggle?: (key: string) => void;
}

function ariaSortValue(
  col: { key: string },
  sort: SortState | null | undefined,
  sortable: boolean,
): "ascending" | "descending" | "none" | undefined {
  if (!sortable) return undefined;
  if (sort?.key !== col.key) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

function sortArrow(col: { key: string }, sort: SortState | null | undefined): string {
  if (sort?.key !== col.key) return "↕";
  return sort.direction === "asc" ? "▲" : "▼";
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  sort,
  onSortToggle,
}: DataTableProps<Row>) {
  return (
    <div className="data-table__scroll">
      <table className="data-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = Boolean(col.sortable && onSortToggle);
              const ariaSort = ariaSortValue(col, sort, sortable);
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={col.numeric ? "is-numeric" : undefined}
                  aria-sort={ariaSort}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="data-table__sort"
                      onClick={() => onSortToggle?.(col.key)}
                    >
                      {col.header}
                      <span className="data-table__sort-arrow" aria-hidden="true">
                        {sortArrow(col, sort)}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.numeric ? "is-numeric" : undefined}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
