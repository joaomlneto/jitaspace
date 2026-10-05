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
  constructTable,
  sortFn_text,
  tableFeatures,
} from "@tanstack/table-core";
import { storeReactivityBindings } from "@tanstack/table-core/store-reactivity-bindings";

import { features as engineFeatures } from "../DataTable/features";

// TanStack Table v8's memo read `Date.now()` on every row-model computation
// whenever `NODE_ENV === "development"`, even with every `debug*` option off:
// it tested the always-truthy `opts.debug` function instead of calling it.
// Next.js (cacheComponents) reports that as a client component reading the
// current time during prerender, so v8 needed a pnpm patch. v9 only reads a
// clock (`performance.now()`) once a `debug*` option is on; this keeps it that
// way across upgrades. If it fails, check upstream before patching.
//
// This builds a table with table-core directly, not through React: React's
// scheduler calls `performance.now()` itself, which would drown the signal.

interface Row {
  name: string;
}

// Exactly the engine's features, plus what `useTable` supplies in React and a
// vanilla table needs spelled out.
const features = tableFeatures({
  coreReactivityFeature: storeReactivityBindings(),
  ...engineFeatures,
});

function computeRowModels(options: { debugAll?: boolean } = {}) {
  const table = constructTable<typeof features, Row>({
    features,
    data: [{ name: "b" }, { name: "a" }],
    columns: [{ accessorKey: "name", sortFn: sortFn_text }],
    initialState: { sorting: [{ id: "name", desc: false }] },
    ...options,
  });
  return table.getRowModel().rows.map((row) => row.original.name);
}

describe("@tanstack/table-core memo timing", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // table-core only times its memos in development.
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("does not read the clock in development when debugging is off", () => {
    const dateNow = jest.spyOn(Date, "now");
    const performanceNow = jest.spyOn(performance, "now");

    expect(computeRowModels()).toEqual(["a", "b"]);
    expect(dateNow).not.toHaveBeenCalled();
    expect(performanceNow).not.toHaveBeenCalled();
  });

  it("still times memos when debugging is on", () => {
    // Proves the test above reaches the timing code, rather than passing
    // because nothing is ever timed.
    const performanceNow = jest.spyOn(performance, "now");
    jest.spyOn(console, "groupCollapsed").mockImplementation(() => undefined);
    jest.spyOn(console, "groupEnd").mockImplementation(() => undefined);
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "trace").mockImplementation(() => undefined);

    expect(computeRowModels({ debugAll: true })).toEqual(["a", "b"]);
    expect(performanceNow).toHaveBeenCalled();
  });
});
