import { describe, expect, it } from "@jest/globals";

import type { DataTableColumn } from "@jitaspace/datatable";

import {
  columnSortKey,
  compareSortKeys,
  matchesGlobalFilter,
  primitiveString,
  readColumnValue,
  readFilterValue,
  rowMatchesGlobalFilter,
  sortRows,
  toSortKey,
} from "../values";

interface Row {
  name: string;
  score: number | null;
}

const byName: DataTableColumn<Row> = {
  id: "name",
  header: "Name",
  accessor: "name",
};
const byScore: DataTableColumn<Row> = {
  id: "score",
  header: "Score",
  accessor: "score",
};

describe("readColumnValue / readFilterValue", () => {
  it("reads a key accessor, a function accessor, and no accessor", () => {
    const row = { name: "Alice", score: 3 };
    expect(readColumnValue(byName, row)).toBe("Alice");
    expect(
      readColumnValue({ ...byName, accessor: (r) => r.name.length }, row),
    ).toBe(5);
    expect(readColumnValue({ id: "x", header: "X" }, row)).toBeUndefined();
  });

  it("prefers filterAccessor for the filter value", () => {
    const row = { name: "Alice", score: 3 };
    expect(readFilterValue(byName, row)).toBe("Alice");
    expect(
      readFilterValue({ ...byName, filterAccessor: (r) => r.score }, row),
    ).toBe(3);
  });
});

describe("primitiveString", () => {
  it("stringifies primitives and blanks everything else", () => {
    expect(primitiveString("a")).toBe("a");
    expect(primitiveString(7)).toBe("7");
    expect(primitiveString(false)).toBe("false");
    expect(primitiveString(null)).toBe("");
    expect(primitiveString({ a: 1 })).toBe("");
    expect(primitiveString([1, 2])).toBe("");
  });
});

describe("toSortKey", () => {
  it("normalises dates, booleans and missing values", () => {
    expect(toSortKey(5)).toBe(5);
    expect(toSortKey("x")).toBe("x");
    expect(toSortKey(true)).toBe(1);
    expect(toSortKey(false)).toBe(0);
    expect(toSortKey(new Date(1000))).toBe(1000);
    expect(toSortKey(new Date("not a date"))).toBeUndefined();
    expect(toSortKey(Number.NaN)).toBeUndefined();
    expect(toSortKey(null)).toBeUndefined();
    expect(toSortKey(undefined)).toBeUndefined();
    expect(toSortKey({})).toBeUndefined();
  });

  it("uses sortAccessor over the accessor value", () => {
    const column: DataTableColumn<Row> = {
      ...byName,
      sortAccessor: (r) => r.name.length,
    };
    expect(columnSortKey(column, { name: "Bob", score: 1 })).toBe(3);
  });
});

describe("compareSortKeys", () => {
  it("compares numbers numerically and strings naturally", () => {
    expect(compareSortKeys(2, 10)).toBeLessThan(0);
    expect(compareSortKeys("Item 9", "Item 10")).toBeLessThan(0);
    expect(compareSortKeys("b", "a")).toBeGreaterThan(0);
    expect(compareSortKeys("a", "a")).toBe(0);
  });
});

describe("sortRows", () => {
  const rows: Row[] = [
    { name: "b", score: 2 },
    { name: "a", score: null },
    { name: "c", score: 1 },
    { name: "d", score: 3 },
  ];

  it("keeps rows without a sort key last when ascending", () => {
    expect(sortRows(rows, byScore, "asc").map((r) => r.name)).toEqual([
      "c",
      "b",
      "d",
      "a",
    ]);
  });

  it("keeps rows without a sort key last when descending", () => {
    expect(sortRows(rows, byScore, "desc").map((r) => r.name)).toEqual([
      "d",
      "b",
      "c",
      "a",
    ]);
  });

  it("does not mutate its input", () => {
    const copy = [...rows];
    sortRows(rows, byName, "desc");
    expect(rows).toEqual(copy);
  });
});

describe("global filter", () => {
  it("matches a case-insensitive substring and treats a blank query as all", () => {
    expect(matchesGlobalFilter("Alice", "LIC")).toBe(true);
    expect(matchesGlobalFilter("Alice", "bob")).toBe(false);
    expect(matchesGlobalFilter(42, "4")).toBe(true);
    expect(matchesGlobalFilter({ name: "Alice" }, "alice")).toBe(false);
    expect(matchesGlobalFilter("anything", "   ")).toBe(true);
  });

  it("searches every accessor column of a row, skipping display-only ones", () => {
    const columns: DataTableColumn<Row>[] = [
      byName,
      byScore,
      { id: "display", header: "Display", cell: () => "zzz" },
    ];
    const row = { name: "Alice", score: 90 };
    expect(rowMatchesGlobalFilter(columns, row, "90")).toBe(true);
    expect(rowMatchesGlobalFilter(columns, row, "ali")).toBe(true);
    expect(rowMatchesGlobalFilter(columns, row, "zzz")).toBe(false);
    expect(rowMatchesGlobalFilter(columns, row, "")).toBe(true);
  });
});
