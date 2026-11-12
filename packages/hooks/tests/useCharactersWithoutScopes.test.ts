import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";

import type { ESIScope } from "@jitaspace/esi-metadata";

import type * as AuthStoreModule from "../src/hooks/auth/useAuthStore";
import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";
import type * as HookModule from "../src/hooks/auth/useCharactersWithoutScopes";

// @swc/jest does not hoist jest.mock above imports, so the hook and the store it
// pulls in are required lazily below, after these mocks are registered. The
// generated ESI client is replaced so axios never loads in the test environment.
jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof AuthStoreModule;
const { useCharactersWithoutScopes } =
  require("../src/hooks/auth/useCharactersWithoutScopes") as typeof HookModule;

const PLANETS: ESIScope = "esi-planets.manage_planets.v1";
const SKILLS: ESIScope = "esi-skills.read_skills.v1";

const character = (
  characterId: number,
  scp: ESIScope[] | ESIScope,
  sessionExpired?: boolean,
): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId: 0,
  corporationRoles: [],
  sessionExpired,
  accessTokenPayload: {
    // A lone scope arrives as a string; the type does not say so.
    scp: scp as ESIScope[],
    sub: `CHARACTER:EVE:${characterId}`,
    name: `Pilot ${characterId}`,
    jti: "",
    kid: "",
    azp: "",
    tenant: "",
    tier: "",
    region: "",
    aud: "",
    owner: "",
    exp: 0,
    iat: 0,
    iss: "",
  },
});

const login = (...sessions: CharacterSsoSession[]) => {
  useAuthStore.setState({
    characters: Object.fromEntries(sessions.map((s) => [s.characterId, s])),
    selectedCharacter: sessions[0]?.characterId ?? null,
  });
};

const SCOPES = [PLANETS];

beforeEach(() => {
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
});

describe("useCharactersWithoutScopes", () => {
  it("lists the characters that have not granted every scope", () => {
    login(character(1, [PLANETS, SKILLS]), character(2, [SKILLS]));

    const { result } = renderHook(() => useCharactersWithoutScopes(SCOPES));

    expect(result.current).toEqual([
      {
        characterId: 2,
        name: "Pilot 2",
        grantedScopes: [SKILLS],
        sessionExpired: false,
      },
    ]);
  });

  it("lists a character whose session ended, even with the scopes", () => {
    login(character(1, [PLANETS], true));

    const { result } = renderHook(() => useCharactersWithoutScopes(SCOPES));

    expect(result.current).toEqual([
      expect.objectContaining({ characterId: 1, sessionExpired: true }),
    ]);
  });

  it("reads a lone scope written as a string, without splitting it", () => {
    login(character(1, PLANETS), character(2, SKILLS));

    const { result } = renderHook(() => useCharactersWithoutScopes(SCOPES));

    // Character 1 has it (a substring match on "PLANETS" would agree, but not
    // for the reason that matters); character 2's granted scopes stay whole.
    expect(result.current.map((entry) => entry.characterId)).toEqual([2]);
    expect(result.current[0]?.grantedScopes).toEqual([SKILLS]);
  });

  it("keeps its result stable across renders that change nothing", () => {
    login(character(1, [SKILLS]));

    const { result, rerender } = renderHook(() =>
      useCharactersWithoutScopes(SCOPES),
    );
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });

  it("follows the store as characters sign in with the scope", () => {
    login(character(1, [SKILLS]));
    const { result } = renderHook(() => useCharactersWithoutScopes(SCOPES));
    expect(result.current).toHaveLength(1);

    act(() => {
      login(character(1, [SKILLS, PLANETS]));
    });

    expect(result.current).toEqual([]);
  });
});
