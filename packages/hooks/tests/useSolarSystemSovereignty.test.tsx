import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// The generated @jitaspace/esi-client isn't built in this workspace, and
// @swc/jest does not hoist jest.mock above imports, so the client is mocked here
// and the hook under test is required lazily.

const mockUseGetSovereigntySystems = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetSovereigntySystems: (...args: unknown[]) =>
    mockUseGetSovereigntySystems(...args),
}));

const { useSolarSystemSovereignty } =
  require("../src/hooks/sovereignty/useSolarSystemSovereignty") as typeof import("../src/hooks/sovereignty/useSolarSystemSovereignty");
const { useSovereigntySystems } =
  require("../src/hooks/sovereignty/useSovereigntySystems") as typeof import("../src/hooks/sovereignty/useSovereigntySystems");

// Shaped exactly like a live GET /sovereignty/systems response: `claim` carries
// exactly one of faction / alliance / unclaimed.
const ALLIANCE_SYSTEM = {
  solar_system_id: 30000208,
  claim: {
    alliance: {
      alliance_id: 99003581,
      corporation_id: 98599770,
      claimed_since: "2020-10-08T00:38:16Z",
      sovereignty_hub: {
        id: 1034510825648,
        vulnerability_window: {
          start: "2026-07-17T09:30:00Z",
          end: "2026-07-17T12:30:00Z",
        },
      },
      is_capital_system: false,
      development: {
        activity_defense_multiplier: 6.0,
        military_level: 5,
        industrial_level: 5,
        strategic_level: 5,
      },
    },
  },
};

const FACTION_SYSTEM = {
  solar_system_id: 30000001,
  claim: { faction: { faction_id: 500007 } },
};

const UNCLAIMED_SYSTEM = {
  solar_system_id: 30000326,
  claim: { unclaimed: true },
};

function mockSystems() {
  mockUseGetSovereigntySystems.mockReturnValue({
    data: {
      data: {
        solar_systems: [ALLIANCE_SYSTEM, FACTION_SYSTEM, UNCLAIMED_SYSTEM],
      },
    },
  });
}

describe("useSolarSystemSovereignty", () => {
  it("flattens an alliance claim, keeping both the alliance and its holding corporation", () => {
    mockSystems();

    const { result } = renderHook(() => useSolarSystemSovereignty(30000208));

    expect(result.current).toEqual({
      system_id: 30000208,
      alliance_id: 99003581,
      corporation_id: 98599770,
    });
  });

  it("flattens a faction claim", () => {
    mockSystems();

    const { result } = renderHook(() => useSolarSystemSovereignty(30000001));

    expect(result.current).toEqual({
      system_id: 30000001,
      faction_id: 500007,
    });
  });

  it("reports an unclaimed system with no owner", () => {
    mockSystems();

    const { result } = renderHook(() => useSolarSystemSovereignty(30000326));

    expect(result.current).toEqual({ system_id: 30000326 });
    expect(result.current?.alliance_id).toBeUndefined();
    expect(result.current?.faction_id).toBeUndefined();
  });

  it("returns undefined for a system ESI reports no sovereignty for", () => {
    mockSystems();

    // Wormhole space is absent from the K-space-only listing.
    const { result } = renderHook(() => useSolarSystemSovereignty(31000001));

    expect(result.current).toBeUndefined();
  });

  it("returns undefined while the query has no data yet", () => {
    mockUseGetSovereigntySystems.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useSolarSystemSovereignty(30000208));

    expect(result.current).toBeUndefined();
  });
});

describe("useSovereigntySystems", () => {
  it("returns the raw sovereignty listing query", () => {
    mockSystems();

    const { result } = renderHook(() => useSovereigntySystems());

    expect(result.current.data?.data.solar_systems).toHaveLength(3);
  });
});
