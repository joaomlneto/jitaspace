import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// @swc/jest does not hoist jest.mock above imports, so the store is required
// lazily below, after these mocks are registered. We replace the generated ESI
// client (so axios never loads) and the access-token decoder.
jest.mock("@jitaspace/auth-utils", () => ({
  __esModule: true,
  getEveSsoAccessTokenPayload: jest.fn(),
}));
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
}));

interface Payload {
  sub: string;
  exp: number;
}
interface Affiliation {
  character_id: number;
  corporation_id: number;
  alliance_id?: number;
}

const { getEveSsoAccessTokenPayload: mockGetPayload } =
  require("@jitaspace/auth-utils") as {
    getEveSsoAccessTokenPayload: jest.MockedFunction<
      (token: string | undefined) => Payload | null
    >;
  };
const { postCharactersAffiliation: mockAffiliation } =
  require("@jitaspace/esi-client") as {
    postCharactersAffiliation: jest.MockedFunction<
      (ids: number[]) => Promise<{ data: Affiliation[] }>
    >;
  };

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");

const CHARACTER_ID = 123;
const SUB = `CHARACTER:EVE:${CHARACTER_ID}`;

const expirationOf = (exp: number) => new Date(exp * 1000).toString();

describe("useAuthStore.addCharacter", () => {
  beforeEach(() => {
    mockGetPayload.mockReset();
    mockAffiliation.mockReset();
    useAuthStore.setState({ characters: {}, selectedCharacter: null });
  });

  it("stores the character with freshly-fetched affiliation on success", async () => {
    mockGetPayload.mockReturnValue({ sub: SUB, exp: 1_000_000_000 });
    mockAffiliation.mockResolvedValue({
      data: [{ character_id: CHARACTER_ID, corporation_id: 98, alliance_id: 99 }],
    });

    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT1", refreshToken: "RT1" });

    const character = useAuthStore.getState().characters[CHARACTER_ID];
    expect(character?.refreshToken).toBe("RT1");
    expect(character?.corporationId).toBe(98);
    expect(character?.allianceId).toBe(99);
    expect(useAuthStore.getState().selectedCharacter).toBe(CHARACTER_ID);
  });

  it("still persists the refreshed token (and advances expiry) when affiliation fails", async () => {
    // Seed an existing session with a known corporation.
    mockGetPayload.mockReturnValueOnce({ sub: SUB, exp: 1_000_000_000 });
    mockAffiliation.mockResolvedValueOnce({
      data: [{ character_id: CHARACTER_ID, corporation_id: 98, alliance_id: 99 }],
    });
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT1", refreshToken: "RT1" });

    // A later refresh whose affiliation lookup throws must NOT be discarded:
    // the rotated refresh token and advanced expiry have to survive.
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockGetPayload.mockReturnValueOnce({ sub: SUB, exp: 2_000_000_000 });
    mockAffiliation.mockRejectedValueOnce(new Error("ESI down"));
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT2", refreshToken: "RT2" });

    const character = useAuthStore.getState().characters[CHARACTER_ID];
    expect(character?.refreshToken).toBe("RT2"); // rotated token persisted
    expect(character?.accessTokenExpirationDate).toBe(
      expirationOf(2_000_000_000),
    ); // anchor advanced -> no false "too old"
    expect(character?.corporationId).toBe(98); // prior affiliation preserved
    consoleError.mockRestore();
  });

  it("does not add a character when the access token cannot be decoded", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockGetPayload.mockReturnValueOnce(null);

    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "BAD", refreshToken: "X" });

    expect(Object.keys(useAuthStore.getState().characters)).toHaveLength(0);
    expect(mockAffiliation).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("flags a character's session as expired without removing it", async () => {
    mockGetPayload.mockReturnValueOnce({ sub: SUB, exp: 1_000_000_000 });
    mockAffiliation.mockResolvedValueOnce({
      data: [{ character_id: CHARACTER_ID, corporation_id: 98 }],
    });
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT1", refreshToken: "RT1" });

    useAuthStore.getState().markCharacterSessionExpired(CHARACTER_ID);

    const character = useAuthStore.getState().characters[CHARACTER_ID];
    expect(character).toBeDefined(); // kept, not removed
    expect(character?.sessionExpired).toBe(true);
  });

  it("clears the session-expired flag when the character re-authenticates", async () => {
    mockGetPayload.mockReturnValueOnce({ sub: SUB, exp: 1_000_000_000 });
    mockAffiliation.mockResolvedValueOnce({
      data: [{ character_id: CHARACTER_ID, corporation_id: 98 }],
    });
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT1", refreshToken: "RT1" });
    useAuthStore.getState().markCharacterSessionExpired(CHARACTER_ID);
    expect(
      useAuthStore.getState().characters[CHARACTER_ID]?.sessionExpired,
    ).toBe(true);

    // Re-authentication (a fresh successful add) revives the session.
    mockGetPayload.mockReturnValueOnce({ sub: SUB, exp: 2_000_000_000 });
    mockAffiliation.mockResolvedValueOnce({
      data: [{ character_id: CHARACTER_ID, corporation_id: 98 }],
    });
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT2", refreshToken: "RT2" });

    expect(
      useAuthStore.getState().characters[CHARACTER_ID]?.sessionExpired,
    ).toBe(false);
  });
});
