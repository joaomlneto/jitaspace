import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as UseCategoryModule from "../src/hooks/universe/useCategory";
import type * as UseGroupModule from "../src/hooks/universe/useGroup";

// @swc/jest does not hoist jest.mock above imports, so the modules under test
// are required lazily below, after the mock is registered.
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetUniverseGroupsGroupId: jest.fn(() => ({ data: undefined })),
  useGetUniverseCategoriesCategoryId: jest.fn(() => ({ data: undefined })),
}));

interface QueryOptions {
  query?: { enabled?: boolean; staleTime?: number };
}
type GeneratedHook = jest.MockedFunction<
  (id: number | undefined, headers: unknown, options: QueryOptions) => unknown
>;

const { useGetUniverseGroupsGroupId, useGetUniverseCategoriesCategoryId } =
  require("@jitaspace/esi-client") as {
    useGetUniverseGroupsGroupId: GeneratedHook;
    useGetUniverseCategoriesCategoryId: GeneratedHook;
  };
const { useGroup } =
  require("../src/hooks/universe/useGroup") as typeof UseGroupModule;
const { useCategory } =
  require("../src/hooks/universe/useCategory") as typeof UseCategoryModule;

/** The `enabled` the wrapper handed the generated hook on its last call. */
const enabledOf = (hook: GeneratedHook) =>
  hook.mock.lastCall?.[2].query?.enabled;

describe.each([
  ["useGroup", () => useGroup, useGetUniverseGroupsGroupId],
  ["useCategory", () => useCategory, useGetUniverseCategoriesCategoryId],
] as const)("%s", (_name, getHook, generated) => {
  beforeEach(() => {
    generated.mockClear();
  });

  // The generated hook enables on `!!(id)`, so id 0 — "#System", a real group
  // and category — never fetched and its breadcrumbs showed a skeleton forever.
  it("fetches id 0", () => {
    getHook()(0);
    expect(generated).toHaveBeenCalledWith(0, undefined, expect.anything());
    expect(enabledOf(generated)).toBe(true);
  });

  it("fetches an ordinary id", () => {
    getHook()(25);
    expect(enabledOf(generated)).toBe(true);
  });

  it("stays idle while the id is unknown", () => {
    getHook()(undefined);
    expect(enabledOf(generated)).toBe(false);
  });

  it("lets an explicit caller `enabled` win, and keeps other query options", () => {
    getHook()(0, undefined, { query: { enabled: false, staleTime: 5 } });
    expect(generated.mock.lastCall?.[2].query).toEqual({
      enabled: false,
      staleTime: 5,
    });
  });
});
