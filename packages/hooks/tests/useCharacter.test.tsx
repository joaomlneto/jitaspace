import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// useCharacter merges the public ESI character record with the agent data its
// caller resolved on the server (only the SDE knows that half, and it lives in
// our database). The generated @jitaspace/esi-client isn't built in this
// workspace, and @swc/jest does not hoist jest.mock above imports, so the
// dependencies are mocked here and the hook under test is required lazily.

const mockUseEsiCharacter = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  CharactersDetailGenderEnum: { male: "male", female: "female" },
}));

jest.mock("@jitaspace/esi-metadata", () => ({
  __esModule: true,
  isIdInRanges: () => false,
  npcCharacterIdRanges: [],
}));

jest.mock("../src/hooks/character/useEsiCharacter", () => ({
  __esModule: true,
  useEsiCharacter: (...args: unknown[]) => mockUseEsiCharacter(...args),
}));

const { useCharacter } =
  require("../src/hooks/character/useCharacter") as typeof import("../src/hooks/character/useCharacter");

type CharacterAgentData = Parameters<typeof useCharacter>[1];

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

/** The server-resolved agent half, as page.tsx reads it out of the database. */
const agentData: NonNullable<CharacterAgentData> = {
  agentTypeId: 3,
  agentDivisionId: 22,
  corporationId: 1000035,
  isLocator: true,
  level: 4,
  locationId: 60000001,
  isResearchAgent: false,
  researchSkills: [],
  inSpace: null,
};

function querySuccess<T>(data: T) {
  return { data, error: null, isError: false, isLoading: false };
}

describe("useCharacter", () => {
  it("propagates the ESI description, faction, security status and title for a player", () => {
    mockUseEsiCharacter.mockReturnValue(
      querySuccess({ data: esiCharacterDetail }),
    );

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

    // Passing agent data is what selects the agent branch.
    const { result } = renderHook(() => useCharacter(CHARACTER_ID, agentData));

    expect(result.current.data?.type).toBe("agent");
    expect(result.current.data?.description).toBe("A short biography");
    expect(result.current.data?.factionId).toBe(500001);
    expect(result.current.data?.securityStatus).toBe(4.2);
    expect(result.current.data?.title).toBe("Fleet Commander");
  });

  it("carries the server-resolved agent fields onto the agent character", () => {
    mockUseEsiCharacter.mockReturnValue(
      querySuccess({ data: esiCharacterDetail }),
    );

    const { result } = renderHook(() =>
      useCharacter(CHARACTER_ID, {
        ...agentData,
        isResearchAgent: true,
        researchSkills: [11487, 11488],
        inSpace: {
          dungeonId: 1,
          solarSystemId: 30000142,
          spawnPointId: 2,
          typeId: 3,
        },
      }),
    );

    const character = result.current.data;
    expect(character?.type).toBe("agent");
    if (character?.type !== "agent") throw new Error("expected an agent");
    expect(character.agentTypeId).toBe(3);
    expect(character.agentDivisionId).toBe(22);
    expect(character.level).toBe(4);
    expect(character.isLocator).toBe(true);
    expect(character.locationId).toBe(60000001);
    // The corporation comes from the agent record, not the ESI record.
    expect(character.corporationId).toBe(1000035);
    expect(character.isResearchAgent).toBe(true);
    expect(character.researchSkills).toEqual([11487, 11488]);
    expect(character.isInSpace).toBe(true);
    if (!character.isInSpace) throw new Error("expected an agent in space");
    expect(character.solarSystemId).toBe(30000142);
    expect(character.typeId).toBe(3);
  });

  it("treats a character with no agent record as a player", () => {
    mockUseEsiCharacter.mockReturnValue(
      querySuccess({ data: esiCharacterDetail }),
    );

    const { result } = renderHook(() => useCharacter(CHARACTER_ID, null));

    expect(result.current.data?.type).toBe("player");
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

    const { result } = renderHook(() => useCharacter(CHARACTER_ID));

    expect(result.current.data?.type).toBe("player");
    expect(result.current.data?.description).toBeUndefined();
    expect(result.current.data?.factionId).toBeUndefined();
    expect(result.current.data?.securityStatus).toBeUndefined();
    expect(result.current.data?.title).toBeUndefined();
  });
});
