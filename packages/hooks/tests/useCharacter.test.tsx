import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// useCharacter merges the public ESI character record with SDE agent data. The
// generated @jitaspace/esi-client and @jitaspace/sde-client clients aren't built
// in this workspace, and @swc/jest does not hoist jest.mock above imports, so
// every dependency is mocked here and the hook under test is required lazily.

const mockUseEsiCharacter = jest.fn();
const mockUseSdeAgent = jest.fn();
const mockUseGetAllNpcCharacterIds = jest.fn();
const mockUseGetAllAgentInSpaceIds = jest.fn();
const mockUseGetAgentInSpaceById = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  CharactersDetailGenderEnum: { male: "male", female: "female" },
}));

jest.mock("@jitaspace/esi-metadata", () => ({
  __esModule: true,
  isIdInRanges: () => false,
  npcCharacterIdRanges: [],
}));

jest.mock("@jitaspace/sde-client", () => ({
  __esModule: true,
  useGetAllNpcCharacterIds: (...args: unknown[]) =>
    mockUseGetAllNpcCharacterIds(...args),
  useGetAllAgentInSpaceIds: (...args: unknown[]) =>
    mockUseGetAllAgentInSpaceIds(...args),
  useGetAgentInSpaceById: (...args: unknown[]) =>
    mockUseGetAgentInSpaceById(...args),
}));

jest.mock("../src/hooks/character/useEsiCharacter", () => ({
  __esModule: true,
  useEsiCharacter: (...args: unknown[]) => mockUseEsiCharacter(...args),
}));

jest.mock("../src/hooks/character/useSdeAgent", () => ({
  __esModule: true,
  useSdeAgent: (...args: unknown[]) => mockUseSdeAgent(...args),
}));

const { useCharacter } =
  require("../src/hooks/character/useCharacter") as typeof import("../src/hooks/character/useCharacter");

const CHARACTER_ID = 30000142;

// A public ESI character record carrying every optional biography field.
const esiCharacterDetail = {
  bloodline_id: 1,
  corporation_id: 1000035,
  alliance_id: 99000001,
  gender: "male",
  name: "Test Character",
  race_id: 1,
  birthday: "2003-05-06T00:00:00Z",
  description: "A short biography",
  faction_id: 500001,
  security_status: 4.2,
  corporation_title: "Fleet Commander",
};

function querySuccess<T>(data: T) {
  return { data, error: null, isError: false, isLoading: false };
}

function queryIdle() {
  return { data: undefined, error: null, isError: false, isLoading: false };
}

describe("useCharacter", () => {
  it("propagates the ESI description, faction, security status and title for a player", () => {
    mockUseEsiCharacter.mockReturnValue(
      querySuccess({ data: esiCharacterDetail }),
    );
    mockUseGetAllNpcCharacterIds.mockReturnValue(querySuccess({ data: [] }));
    mockUseSdeAgent.mockReturnValue(queryIdle());
    mockUseGetAllAgentInSpaceIds.mockReturnValue(querySuccess({ data: [] }));
    mockUseGetAgentInSpaceById.mockReturnValue(queryIdle());

    const { result } = renderHook(() => useCharacter(CHARACTER_ID));

    expect(result.current.data?.type).toBe("player");
    expect(result.current.data?.description).toBe("A short biography");
    expect(result.current.data?.factionId).toBe(500001);
    expect(result.current.data?.securityStatus).toBe(4.2);
    expect(result.current.data?.title).toBe("Fleet Commander");
  });

  it("propagates the ESI biography fields for an agent", () => {
    mockUseEsiCharacter.mockReturnValue(
      querySuccess({ data: esiCharacterDetail }),
    );
    // The character id is a known NPC agent -> the agent branch is taken.
    mockUseGetAllNpcCharacterIds.mockReturnValue(
      querySuccess({ data: [CHARACTER_ID] }),
    );
    mockUseSdeAgent.mockReturnValue(
      querySuccess({
        data: {
          agent: {
            agentTypeID: 3,
            divisionID: 22,
            isLocator: true,
            level: 4,
          },
          corporationID: 1000035,
          locationID: 60000001,
          skills: [],
        },
      }),
    );
    mockUseGetAllAgentInSpaceIds.mockReturnValue(querySuccess({ data: [] }));
    mockUseGetAgentInSpaceById.mockReturnValue(queryIdle());

    const { result } = renderHook(() => useCharacter(CHARACTER_ID));

    expect(result.current.data?.type).toBe("agent");
    expect(result.current.data?.description).toBe("A short biography");
    expect(result.current.data?.factionId).toBe(500001);
    expect(result.current.data?.securityStatus).toBe(4.2);
    expect(result.current.data?.title).toBe("Fleet Commander");
  });

  it("leaves the biography fields undefined when ESI omits them", () => {
    // A record without any of the optional biography fields.
    const minimal = {
      bloodline_id: esiCharacterDetail.bloodline_id,
      corporation_id: esiCharacterDetail.corporation_id,
      alliance_id: esiCharacterDetail.alliance_id,
      gender: esiCharacterDetail.gender,
      name: esiCharacterDetail.name,
      race_id: esiCharacterDetail.race_id,
      birthday: esiCharacterDetail.birthday,
    };
    mockUseEsiCharacter.mockReturnValue(querySuccess({ data: minimal }));
    mockUseGetAllNpcCharacterIds.mockReturnValue(querySuccess({ data: [] }));
    mockUseSdeAgent.mockReturnValue(queryIdle());
    mockUseGetAllAgentInSpaceIds.mockReturnValue(querySuccess({ data: [] }));
    mockUseGetAgentInSpaceById.mockReturnValue(queryIdle());

    const { result } = renderHook(() => useCharacter(CHARACTER_ID));

    expect(result.current.data?.type).toBe("player");
    expect(result.current.data?.description).toBeUndefined();
    expect(result.current.data?.factionId).toBeUndefined();
    expect(result.current.data?.securityStatus).toBeUndefined();
    expect(result.current.data?.title).toBeUndefined();
  });
});
