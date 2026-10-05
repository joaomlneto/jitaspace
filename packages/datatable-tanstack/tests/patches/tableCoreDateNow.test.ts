/* eslint-disable no-restricted-properties --
   The behaviour under test is keyed on NODE_ENV, which table-core reads from
   process.env itself; there is no validated `~/env` module in this package. */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";

// Guards `patches/@tanstack__table-core@8.21.3.patch`. Unpatched, table-core's
// memo reads `Date.now()` on every row-model computation whenever
// `NODE_ENV === "development"` — even with every `debug*` option off — and
// Next.js (cacheComponents) reports that as a client component reading the
// current time during prerender. If this fails after a TanStack upgrade, the
// patch was dropped or no longer applies: re-check upstream before re-patching.

interface Row {
  name: string;
}

function computeRowModels(options: { debugAll?: boolean } = {}) {
  const table = createTable<Row>({
    data: [{ name: "b" }, { name: "a" }],
    columns: [{ accessorKey: "name" }],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting: [{ id: "name", desc: false }] },
    onStateChange: () => undefined,
    renderFallbackValue: null,
    ...options,
  });
  return table.getRowModel().rows.map((row) => row.original.name);
}

describe("@tanstack/table-core memo timing (patched)", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // table-core only times its memos in development.
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("does not read the clock in development when debugging is off", () => {
    const now = jest.spyOn(Date, "now");

    expect(computeRowModels()).toEqual(["a", "b"]);
    expect(now).not.toHaveBeenCalled();
  });

  it("still times memos when debugging is on", () => {
    const now = jest.spyOn(Date, "now");
    jest.spyOn(console, "info").mockImplementation(() => undefined);

    expect(computeRowModels({ debugAll: true })).toEqual(["a", "b"]);
    expect(now).toHaveBeenCalled();
  });
});
