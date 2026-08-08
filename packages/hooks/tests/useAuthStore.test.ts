import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { ESIScope } from "@jitaspace/esi-metadata";

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
  getCharactersCharacterIdRoles: jest.fn(),
}));

interface Payload {
  sub: string;
  exp: number;
  scp: ESIScope[];
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
const {
  postCharactersAffiliation: mockAffiliation,
  getCharactersCharacterIdRoles: mockRoles,
} = require("@jitaspace/esi-client") as {
  postCharactersAffiliation: jest.MockedFunction<
    (ids: number[]) => Promise<{ data: Affiliation[] }>
  >;
  getCharactersCharacterIdRoles: jest.MockedFunction<
    (
      characterId: number,
      headers?: Record<string, string>,
    ) => Promise<{ data: { roles?: string[] } }>
  >;
};

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");

const CHARACTER_ID = 123;
const SUB = `CHARACTER:EVE:${CHARACTER_ID}`;
const ROLES_SCOPE: ESIScope = "esi-characters.read_corporation_roles.v1";

const expirationOf = (exp: number) => new Date(exp * 1000).toString();

const payload = (exp: number, scp: ESIScope[] = []): Payload => ({
  sub: SUB,
  exp,
  scp,
});

/** Seed a stored session by running a successful `addCharacter`. */
const seedCharacter = async ({
  exp = 1_000_000_000,
  scopes = [],
  corporationId = 98,
  allianceId = 99,
  roles = [],
}: {
  exp?: number;
  scopes?: ESIScope[];
  corporationId?: number;
  allianceId?: number;
  roles?: string[];
} = {}) => {
  mockGetPayload.mockReturnValueOnce(payload(exp, scopes));
  mockAffiliation.mockResolvedValueOnce({
    data: [
      {
        character_id: CHARACTER_ID,
        corporation_id: corporationId,
        alliance_id: allianceId,
      },
    ],
  });
  mockRoles.mockResolvedValueOnce({ data: { roles } });
  await useAuthStore
    .getState()
    .addCharacter({ accessToken: "AT1", refreshToken: "RT1" });
};

const storedCharacter = () => useAuthStore.getState().characters[CHARACTER_ID];

describe("useAuthStore.addCharacter", () => {
  beforeEach(() => {
    mockGetPayload.mockReset();
    mockAffiliation.mockReset();
    mockRoles.mockReset();
    useAuthStore.setState({ characters: {}, selectedCharacter: null });
  });

  it("stores the character with freshly-fetched affiliation on success", async () => {
    await seedCharacter();

    const character = storedCharacter();
    expect(character?.refreshToken).toBe("RT1");
    expect(character?.corporationId).toBe(98);
    expect(character?.allianceId).toBe(99);
    expect(useAuthStore.getState().selectedCharacter).toBe(CHARACTER_ID);
  });

  it("still persists the refreshed token (and advances expiry) when affiliation fails", async () => {
    // Seed an existing session with a known corporation.
    await seedCharacter();

    // A later refresh whose affiliation lookup throws must NOT be discarded:
    // the rotated refresh token and advanced expiry have to survive. Expire the
    // cached affiliation first, otherwise the refresh would skip the lookup.
    useAuthStore.setState((state) => ({
      characters: {
        ...state.characters,
        [CHARACTER_ID]: {
          ...state.characters[CHARACTER_ID]!,
          affiliationExpiresOn: Date.now() - 1,
        },
      },
    }));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockGetPayload.mockReturnValueOnce(payload(2_000_000_000));
    mockAffiliation.mockRejectedValueOnce(new Error("ESI down"));
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT2", refreshToken: "RT2" });

    const character = storedCharacter();
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
    await seedCharacter();

    useAuthStore.getState().markCharacterSessionExpired(CHARACTER_ID);

    const character = storedCharacter();
    expect(character).toBeDefined(); // kept, not removed
    expect(character?.sessionExpired).toBe(true);
  });

  it("is a no-op (no new state) when the session is already flagged expired", async () => {
    await seedCharacter();

    useAuthStore.getState().markCharacterSessionExpired(CHARACTER_ID);
    const charactersAfterFirst = useAuthStore.getState().characters;

    // Flagging an already-expired session must NOT allocate a new `characters`
    // object, otherwise the refresh effect (keyed on its identity) re-runs and
    // re-attempts the doomed refresh in a tight loop.
    useAuthStore.getState().markCharacterSessionExpired(CHARACTER_ID);
    const charactersAfterSecond = useAuthStore.getState().characters;

    expect(charactersAfterSecond).toBe(charactersAfterFirst); // same reference
    expect(charactersAfterSecond[CHARACTER_ID]?.sessionExpired).toBe(true);
  });

  it("clears the session-expired flag when the character re-authenticates", async () => {
    await seedCharacter();
    useAuthStore.getState().markCharacterSessionExpired(CHARACTER_ID);
    expect(storedCharacter()?.sessionExpired).toBe(true);

    // Re-authentication (a fresh successful add) revives the session.
    mockGetPayload.mockReturnValueOnce(payload(2_000_000_000));
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT2", refreshToken: "RT2" });

    expect(storedCharacter()?.sessionExpired).toBe(false);
  });
});

describe("useAuthStore — corporation roles", () => {
  beforeEach(() => {
    mockGetPayload.mockReset();
    mockAffiliation.mockReset();
    mockRoles.mockReset();
    useAuthStore.setState({ characters: {}, selectedCharacter: null });
  });

  it("reads the character's roles when the scope was granted", async () => {
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });

    expect(mockRoles).toHaveBeenCalledWith(CHARACTER_ID, {
      Authorization: "Bearer AT1",
    });
    expect(storedCharacter()?.corporationRoles).toEqual(["Director"]);
    // The expiry stamp is what marks the roles as *known* to useAccessToken.
    expect(storedCharacter()?.corporationRolesExpireOn).toBeGreaterThan(
      Date.now(),
    );
  });

  it("does not ask for roles the token cannot read", async () => {
    // Without esi-characters.read_corporation_roles.v1 the request is a
    // guaranteed 403, so it must not be sent — and the roles stay *unknown*
    // (no expiry stamp) rather than being recorded as "holds nothing".
    await seedCharacter();

    expect(mockRoles).not.toHaveBeenCalled();
    expect(storedCharacter()?.corporationRoles).toEqual([]);
    expect(storedCharacter()?.corporationRolesExpireOn).toBeUndefined();
  });

  it("leaves the roles unknown when the very first lookup fails", async () => {
    // Stamping an expiry here would record an empty default as fact, and
    // useAccessToken would read that as "holds no roles" — locking a Director
    // out of corporation assets over a transient ESI blip.
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockGetPayload.mockReturnValueOnce(payload(1_000_000_000, [ROLES_SCOPE]));
    mockAffiliation.mockResolvedValueOnce({
      data: [{ character_id: CHARACTER_ID, corporation_id: 98 }],
    });
    mockRoles.mockRejectedValueOnce(new Error("ESI down"));

    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT1", refreshToken: "RT1" });

    expect(storedCharacter()?.corporationRolesExpireOn).toBeUndefined();
    consoleError.mockRestore();
  });

  it("keeps the previously-read roles when the lookup fails", async () => {
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });

    // Expire the cache and let the next read fail: dropping to [] here would
    // make useAccessToken stop handing out the Director's token.
    useAuthStore.setState((state) => ({
      characters: {
        ...state.characters,
        [CHARACTER_ID]: {
          ...state.characters[CHARACTER_ID]!,
          corporationRolesExpireOn: Date.now() - 1,
        },
      },
    }));
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockGetPayload.mockReturnValueOnce(payload(2_000_000_000, [ROLES_SCOPE]));
    mockRoles.mockRejectedValueOnce(new Error("ESI down"));
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT2", refreshToken: "RT2" });

    expect(storedCharacter()?.corporationRoles).toEqual(["Director"]);
    consoleError.mockRestore();
  });

  it("serves cached roles and affiliation until they expire", async () => {
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });
    expect(mockRoles).toHaveBeenCalledTimes(1);
    expect(mockAffiliation).toHaveBeenCalledTimes(1);

    // addCharacter runs on every token refresh (~every 20 minutes) while ESI
    // caches both answers for an hour, so a refresh inside the window must not
    // re-request either one.
    mockGetPayload.mockReturnValueOnce(payload(2_000_000_000, [ROLES_SCOPE]));
    await useAuthStore
      .getState()
      .addCharacter({ accessToken: "AT2", refreshToken: "RT2" });

    expect(mockRoles).toHaveBeenCalledTimes(1);
    expect(mockAffiliation).toHaveBeenCalledTimes(1);
    expect(storedCharacter()?.accessToken).toBe("AT2"); // token still updated
  });
});

describe("useAuthStore.refreshStaleCharacterData", () => {
  beforeEach(() => {
    mockGetPayload.mockReset();
    mockAffiliation.mockReset();
    mockRoles.mockReset();
    useAuthStore.setState({ characters: {}, selectedCharacter: null });
  });

  /** Force everything cached on the stored character to be stale. */
  const expireCaches = () =>
    useAuthStore.setState((state) => ({
      characters: {
        ...state.characters,
        [CHARACTER_ID]: {
          ...state.characters[CHARACTER_ID]!,
          affiliationExpiresOn: Date.now() - 1,
          corporationRolesExpireOn: Date.now() - 1,
        },
      },
    }));

  it("does nothing — and leaves the store untouched — when nothing is stale", async () => {
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });
    const before = useAuthStore.getState().characters;

    await useAuthStore.getState().refreshStaleCharacterData();

    expect(mockAffiliation).toHaveBeenCalledTimes(1); // the seeding call only
    expect(mockRoles).toHaveBeenCalledTimes(1);
    // Same reference: the token-refresh effect is keyed on this identity, so a
    // no-op sweep must not re-arm it every tick.
    expect(useAuthStore.getState().characters).toBe(before);
  });

  it("picks up a corporation change once the affiliation cache expires", async () => {
    // The whole point: a character who switched corporation kept matching the
    // old one in useAccessToken until they re-authenticated.
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });
    expireCaches();

    mockAffiliation.mockResolvedValueOnce({
      data: [{ character_id: CHARACTER_ID, corporation_id: 4242 }],
    });
    mockRoles.mockResolvedValueOnce({ data: { roles: ["Accountant"] } });
    await useAuthStore.getState().refreshStaleCharacterData();

    expect(mockAffiliation).toHaveBeenCalledWith([CHARACTER_ID]);
    expect(storedCharacter()?.corporationId).toBe(4242);
    // Left the alliance too: the stale ID must be cleared, not kept.
    expect(storedCharacter()?.allianceId).toBeUndefined();
    expect(storedCharacter()?.corporationRoles).toEqual(["Accountant"]);
  });

  it("skips characters whose session EVE will not renew", async () => {
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });
    expireCaches();
    useAuthStore.getState().markCharacterSessionExpired(CHARACTER_ID);

    await useAuthStore.getState().refreshStaleCharacterData();

    expect(mockAffiliation).toHaveBeenCalledTimes(1); // the seeding call only
    expect(mockRoles).toHaveBeenCalledTimes(1);
  });

  it("re-arms a shorter retry when a read fails", async () => {
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });
    expireCaches();

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockAffiliation.mockRejectedValueOnce(new Error("ESI down"));
    mockRoles.mockRejectedValueOnce(new Error("ESI down"));
    const failedAt = Date.now();
    await useAuthStore.getState().refreshStaleCharacterData();

    // Retried well before the hour-long cache TTL, but not on the very next
    // tick — a persistently failing endpoint must not be hammered.
    const character = storedCharacter();
    expect(character?.affiliationExpiresOn).toBeGreaterThan(failedAt);
    expect(character?.affiliationExpiresOn).toBeLessThan(
      failedAt + 10 * 60 * 1000,
    );
    expect(character?.corporationRolesExpireOn).toBeLessThan(
      failedAt + 10 * 60 * 1000,
    );
    // The last known values survive the failure.
    expect(character?.corporationId).toBe(98);
    expect(character?.corporationRoles).toEqual(["Director"]);
    consoleError.mockRestore();
  });

  it("does not start a second sweep while one is in flight", async () => {
    await seedCharacter({ scopes: [ROLES_SCOPE], roles: ["Director"] });
    expireCaches();

    // Expiry stamps are only written once the reads settle, so a sweep firing
    // meanwhile would see the same stale entries and duplicate every request.
    let releaseAffiliation: (value: { data: Affiliation[] }) => void = () =>
      undefined;
    mockAffiliation.mockReturnValueOnce(
      new Promise<{ data: Affiliation[] }>((resolve) => {
        releaseAffiliation = resolve;
      }),
    );
    mockRoles.mockResolvedValueOnce({ data: { roles: ["Director"] } });

    const first = useAuthStore.getState().refreshStaleCharacterData();
    await useAuthStore.getState().refreshStaleCharacterData();
    expect(mockAffiliation).toHaveBeenCalledTimes(2); // seeding + the first sweep

    releaseAffiliation({
      data: [{ character_id: CHARACTER_ID, corporation_id: 98 }],
    });
    await first;
  });
});
