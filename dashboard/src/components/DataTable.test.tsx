import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DataTable, type Column, type SortState } from "./DataTable";

interface Row {
  id: string;
  name: string;
  score: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", score: 3 },
  { id: "2", name: "Grace", score: 1 },
];

const COLUMNS: Column<Row>[] = [
  { key: "name", header: "Name", render: (row) => row.name },
  { key: "score", header: "Score", numeric: true, render: (row) => String(row.score) },
];

const SORTABLE_COLUMNS: Column<Row>[] = [
  { ...COLUMNS[0], sortable: true },
  { ...COLUMNS[1], sortable: true },
];

describe("DataTable", () => {
  test("renders headers, rows, and numeric cells without sort props", () => {
    render(<DataTable caption="People" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />);

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "3" }).className).toContain("is-numeric");
  });

  test("renders plain headers when no sort props are passed", () => {
    render(<DataTable caption="People" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort")).toBeNull();
  });

  test("marks the active sortable column with aria-sort", () => {
    const sort: SortState = { key: "name", direction: "asc" };

    render(
      <DataTable
        caption="People"
        columns={SORTABLE_COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        sort={sort}
        onSortToggle={() => {}}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Name" }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    expect(screen.getByRole("columnheader", { name: "Score" }).getAttribute("aria-sort")).toBe(
      "none",
    );
  });

  test("renders descending aria-sort for a desc active column", () => {
    const sort: SortState = { key: "score", direction: "desc" };

    render(
      <DataTable
        caption="People"
        columns={SORTABLE_COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        sort={sort}
        onSortToggle={() => {}}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Score" }).getAttribute("aria-sort")).toBe(
      "descending",
    );
  });

  test("calls onSortToggle with the column key on header click", () => {
    const onSortToggle = vi.fn();

    render(
      <DataTable
        caption="People"
        columns={SORTABLE_COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        onSortToggle={onSortToggle}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /name/i }));

    expect(onSortToggle).toHaveBeenCalledWith("name");
  });
});
