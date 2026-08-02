import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// Both hooks are thin wrappers over `useQuery(sdeRecordQueryOptions(...))`, now
// that this static reference data comes from our own database instead of the
// SDE HTTP API. React Query's `useQuery` is mocked so the tests control what the
// query returns, while the real `sdeRecordQueryOptions` still runs — that is
// what makes the resource/id assertions meaningful. @swc/jest does not hoist
// jest.mock above imports, so the hooks under test are required lazily.

const mockUseQuery = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  __esModule: true,
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  // The real `queryOptions` only adds typing; at runtime it returns its input.
  queryOptions: (options: unknown) => options,
}));

const { useMarketGroup } =
  require("../src/hooks/market/useMarketGroup") as typeof import("../src/hooks/market/useMarketGroup");
const { useSdeAgent } =
  require("../src/hooks/character/useSdeAgent") as typeof import("../src/hooks/character/useSdeAgent");

/** The options object the hook under test handed to `useQuery`. */
function optionsPassedToUseQuery() {
  const calls = mockUseQuery.mock.calls;
  return calls[calls.length - 1]?.[0] as {
    queryKey: unknown[];
    enabled: boolean;
  };
}

function querySuccess<T>(data: T) {
  return { data, error: null, isError: false, isLoading: false };
}

// A `MarketGroup` row exactly as `/api/sde/market-group/:id` serves it.
const AMMUNITION_MARKET_GROUP = {
  marketGroupId: 11,
  name: "Ammunition & Charges",
  description: "Ammunition and charges for all weapon systems.",
  parentMarketGroupId: 9,
  iconId: 1156,
};

describe("useMarketGroup", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue(querySuccess(undefined));
  });

  it("renames the database columns to the ESI-style field names consumers read", () => {
    mockUseQuery.mockReturnValue(querySuccess(AMMUNITION_MARKET_GROUP));

    const { result } = renderHook(() => useMarketGroup(11));

    expect(result.current).toEqual({
      market_group_id: 11,
      name: "Ammunition & Charges",
      description: "Ammunition and charges for all weapon systems.",
      parent_group_id: 9,
      iconID: 1156,
    });
  });

  it("turns a null parent and a null icon into undefined, not null", () => {
    // A root market group: nothing above it, and no icon assigned.
    mockUseQuery.mockReturnValue(
      querySuccess({
        marketGroupId: 2,
        name: "Blueprints & Reactions",
        description: "Blueprints and reaction formulas.",
        parentMarketGroupId: null,
        iconId: null,
      }),
    );

    const { result } = renderHook(() => useMarketGroup(2));

    expect(result.current.market_group_id).toBe(2);
    expect(result.current.parent_group_id).toBeUndefined();
    expect(result.current.iconID).toBeUndefined();
    // Load-bearing: the breadcrumb walks parents with `(id && parent) ?? 0`,
    // which a null would sail straight through instead of terminating at 0.
    expect(result.current.parent_group_id ?? 0).toBe(0);
    expect(result.current.iconID ?? 0).toBe(0);
  });

  it("leaves every field undefined while the query has no data yet", () => {
    mockUseQuery.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useMarketGroup(11));

    expect(result.current.market_group_id).toBeUndefined();
    expect(result.current.name).toBeUndefined();
    expect(result.current.description).toBeUndefined();
    expect(result.current.parent_group_id).toBeUndefined();
    expect(result.current.iconID).toBeUndefined();
  });

  it("looks the record up as the market-group resource under the requested id", () => {
    renderHook(() => useMarketGroup(1857));

    const options = optionsPassedToUseQuery();
    expect(options.queryKey).toEqual(["sde", "market-group", 1857]);
    expect(options.enabled).toBe(true);
  });

  it("does not run the query for an unusable market group id", () => {
    // Consumers pass 0 for "no market group" (unpublished / non-market types).
    renderHook(() => useMarketGroup(0));

    const options = optionsPassedToUseQuery();
    expect(options.enabled).toBe(false);
  });
});

describe("useSdeAgent", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue(querySuccess(null));
  });

  it("looks the record up as the agent resource under the requested character id", () => {
    renderHook(() => useSdeAgent(3019494));

    const options = optionsPassedToUseQuery();
    expect(options.queryKey).toEqual(["sde", "agent", 3019494]);
    expect(options.enabled).toBe(true);
  });

  it("returns the query result untouched for a character that is an agent", () => {
    const agent = {
      characterId: 3019494,
      agentTypeId: 2,
      agentDivisionId: 22,
      agentDivisionName: "Distribution",
      isLocator: false,
      level: 1,
      stationId: 60000004,
      corporationId: 1000002,
      isResearchAgent: false,
      researchSkills: [],
      agentInSpace: null,
    };
    const query = querySuccess(agent);
    mockUseQuery.mockReturnValue(query);

    const { result } = renderHook(() => useSdeAgent(3019494));

    expect(result.current).toBe(query);
    expect(result.current.data).toBe(agent);
  });

  it("reports null for a character that is not an agent", () => {
    // The API answers a missing Agent row with 404 -> null, which is how
    // callers tell a player character apart from an agent.
    mockUseQuery.mockReturnValue(querySuccess(null));

    const { result } = renderHook(() => useSdeAgent(90000001));

    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("does not run the query for an unusable character id", () => {
    renderHook(() => useSdeAgent(0));

    const options = optionsPassedToUseQuery();
    expect(options.enabled).toBe(false);
  });
});
