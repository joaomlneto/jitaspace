import { describe, expect, it } from "@jest/globals";

import type { DataTableColumnFilter } from "@jitaspace/datatable";

import {
  facetOptions,
  filterKeys,
  isColumnFilterActive,
  matchesColumnFilter,
  numericBounds,
  toLocalDay,
} from "../filters";

const text: DataTableColumnFilter = { type: "text" };
const select: DataTableColumnFilter = { type: "select" };
const multi: DataTableColumnFilter = { type: "multi-select" };
const range: DataTableColumnFilter = { type: "range" };
const boolean: DataTableColumnFilter = { type: "boolean" };
const dates: DataTableColumnFilter = { type: "date-range" };

describe("isColumnFilterActive", () => {
  it.each([
    [text, "", false],
    [text, " ", true],
    [select, "", false],
    [select, "a", true],
    [multi, [], false],
    [multi, ["a"], true],
    [multi, [1], false],
    [range, [null, null], false],
    [range, [0, null], true],
    [range, [null, 5], true],
    [range, [1], false],
    [boolean, false, true],
    [boolean, true, true],
    [boolean, "true", false],
    [dates, [null, null], false],
    [dates, ["2024-01-01", null], true],
    [text, undefined, false],
  ])("%j with %j → %s", (filter, value, expected) => {
    expect(isColumnFilterActive(filter, value)).toBe(expected);
  });
});

describe("matchesColumnFilter", () => {
  it("passes every row while the filter value is inactive or malformed", () => {
    expect(matchesColumnFilter(select, "a", undefined)).toBe(true);
    expect(matchesColumnFilter(range, 5, "not a range")).toBe(true);
  });

  it("text: case-insensitive substring", () => {
    expect(matchesColumnFilter(text, "Brokers Fee", "fee")).toBe(true);
    expect(matchesColumnFilter(text, "Brokers Fee", "tax")).toBe(false);
    expect(matchesColumnFilter(text, ["Alpha", "Beta"], "bet")).toBe(true);
  });

  it("select: exact match on the stringified value", () => {
    expect(matchesColumnFilter(select, 4, "4")).toBe(true);
    expect(matchesColumnFilter(select, 44, "4")).toBe(false);
    expect(matchesColumnFilter(select, "Corp A", "Corp")).toBe(false);
  });

  it("multi-select: exact match on any selection, never a substring", () => {
    // The wallet's regression: "Brokers Fee" is contained in both contract
    // broker fees, and a substring match kept them too.
    const selected = ["Brokers Fee"];
    expect(matchesColumnFilter(multi, "Brokers Fee", selected)).toBe(true);
    expect(matchesColumnFilter(multi, "Contract Brokers Fee", selected)).toBe(
      false,
    );
    expect(
      matchesColumnFilter(multi, "Transaction Tax", [
        "Brokers Fee",
        "Transaction Tax",
      ]),
    ).toBe(true);
    // An array value matches when any of its elements does.
    expect(matchesColumnFilter(multi, ["Friends", "Foes"], ["Foes"])).toBe(
      true,
    );
  });

  it("range: inclusive, open-ended, and drops non-numbers", () => {
    expect(matchesColumnFilter(range, 5, [5, 10])).toBe(true);
    expect(matchesColumnFilter(range, 10, [5, 10])).toBe(true);
    expect(matchesColumnFilter(range, 11, [5, 10])).toBe(false);
    expect(matchesColumnFilter(range, -3, [null, 0])).toBe(true);
    expect(matchesColumnFilter(range, 1e12, [100, null])).toBe(true);
    expect(matchesColumnFilter(range, null, [0, null])).toBe(false);
    expect(matchesColumnFilter(range, "7", [0, 10])).toBe(false);
  });

  it("boolean: compares truthiness", () => {
    expect(matchesColumnFilter(boolean, true, true)).toBe(true);
    expect(matchesColumnFilter(boolean, undefined, false)).toBe(true);
    expect(matchesColumnFilter(boolean, undefined, true)).toBe(false);
  });

  it("date-range: whole local days, inclusive, open-ended", () => {
    const noon = new Date(2024, 0, 15, 12);
    expect(matchesColumnFilter(dates, noon, ["2024-01-15", "2024-01-15"])).toBe(
      true,
    );
    expect(matchesColumnFilter(dates, noon, ["2024-01-16", null])).toBe(false);
    expect(matchesColumnFilter(dates, noon, [null, "2024-01-14"])).toBe(false);
    expect(
      matchesColumnFilter(dates, noon.getTime(), [null, "2024-01-31"]),
    ).toBe(true);
    expect(matchesColumnFilter(dates, "garbage", ["2024-01-01", null])).toBe(
      false,
    );
  });
});

describe("filterKeys / toLocalDay", () => {
  it("flattens arrays and drops blanks", () => {
    expect(filterKeys(["a", "", 3, null])).toEqual(["a", "3"]);
    expect(filterKeys(undefined)).toEqual([]);
  });

  it("formats a local day and rejects non-dates", () => {
    expect(toLocalDay(new Date(2024, 1, 3, 23, 59))).toBe("2024-02-03");
    expect(toLocalDay({})).toBeUndefined();
    expect(toLocalDay("nope")).toBeUndefined();
  });
});

describe("facetOptions / numericBounds", () => {
  it("lists distinct values in natural order", () => {
    expect(facetOptions(["b", "a", "b", 10, 9, null, ""])).toEqual([
      { value: "9", label: "9" },
      { value: "10", label: "10" },
      { value: "a", label: "a" },
      { value: "b", label: "b" },
    ]);
  });

  it("finds the numeric extremes, ignoring non-numbers", () => {
    expect(numericBounds([3, "x", -2, 8, null])).toEqual({ min: -2, max: 8 });
    expect(numericBounds(["x"])).toBeUndefined();
  });
});
