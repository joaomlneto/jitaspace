import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

import type { ESIScope } from "@jitaspace/esi-metadata";

import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";

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
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");
const { useAccessToken } =
  require("../src/hooks/auth/useAccessToken") as typeof import("../src/hooks/auth/useAccessToken");

const MAIL_SCOPE = "esi-mail.read_mail.v1";
const CORP_ASSETS_SCOPE = "esi-assets.read_corporation_assets.v1";
const ALLIANCE_CONTACTS_SCOPE = "esi-alliances.read_contacts.v1";

const character = ({
  characterId,
  scopes = [],
  ...session
}: { characterId: number; scopes?: ESIScope[] } & Partial<
  Omit<CharacterSsoSession, "accessTokenPayload">
>): CharacterSsoSession => ({
  accessToken: `token-${characterId}`,
  accessTokenExpirationDate: new Date(0).toString(),
  refreshToken: `refresh-${characterId}`,
  characterId,
  corporationId: 0,
  corporationRoles: [],
  ...session,
  accessTokenPayload: {
    scp: scopes,
    sub: `CHARACTER:EVE:${characterId}`,
    name: `Character ${characterId}`,
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

const login = (...sessions: CharacterSsoSession[]) =>
  useAuthStore.setState({
    characters: Object.fromEntries(sessions.map((s) => [s.characterId, s])),
    selectedCharacter: sessions[0]?.characterId ?? null,
  });

beforeEach(() => {
  useAuthStore.setState({ characters: {}, selectedCharacter: null });
});

describe("useAccessToken — character filter", () => {
  it("returns the requested character's token", () => {
    login(character({ characterId: 100 }), character({ characterId: 101 }));

    const { result } = renderHook(() => useAccessToken({ characterId: 101 }));

    expect(result.current.accessToken).toBe("token-101");
    expect(result.current.authHeaders).toEqual({
      Authorization: "Bearer token-101",
    });
  });

  it("returns no token when the character lacks the required scope", () => {
    login(character({ characterId: 100 }));

    const { result } = renderHook(() =>
      useAccessToken({ characterId: 100, scopes: [MAIL_SCOPE] }),
    );

    expect(result.current.character).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.authHeaders).toEqual({});
  });
});

describe("useAccessToken — corporation filter", () => {
  it("picks a character that belongs to the requested corporation", () => {
    // Both characters hold the scope; only 101 is in corporation 2000. Before
    // corporationId was honoured this returned 100's token — another
    // corporation's data, or a 403.
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
      }),
      character({
        characterId: 101,
        corporationId: 2000,
        scopes: [CORP_ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({ corporationId: 2000, scopes: [CORP_ASSETS_SCOPE] }),
    );

    expect(result.current.character?.characterId).toBe(101);
    expect(result.current.accessToken).toBe("token-101");
  });

  it("returns no token when no logged-in character is in the corporation", () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({ corporationId: 2000, scopes: [CORP_ASSETS_SCOPE] }),
    );

    expect(result.current.accessToken).toBeNull();
  });
});

describe("useAccessToken — alliance filter", () => {
  it("picks a character that belongs to the requested alliance", () => {
    login(
      character({
        characterId: 100,
        allianceId: 500,
        scopes: [ALLIANCE_CONTACTS_SCOPE],
      }),
      character({
        characterId: 101,
        allianceId: 600,
        scopes: [ALLIANCE_CONTACTS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({ allianceId: 600, scopes: [ALLIANCE_CONTACTS_SCOPE] }),
    );

    expect(result.current.character?.characterId).toBe(101);
  });

  it("excludes characters that are in no alliance", () => {
    login(character({ characterId: 100, scopes: [ALLIANCE_CONTACTS_SCOPE] }));

    const { result } = renderHook(() =>
      useAccessToken({ allianceId: 600, scopes: [ALLIANCE_CONTACTS_SCOPE] }),
    );

    expect(result.current.accessToken).toBeNull();
  });
});

describe("useAccessToken — roles", () => {
  // `roles` is enforced against `corporationRoles` exactly as `scopes` is
  // enforced against the token's scp claim: no match, no token. The store only
  // fills `corporationRoles` in once it has read them from ESI, and
  // `corporationRolesExpireOn` marks when that happened.
  const rolesReadAt = Date.now() + 60 * 60 * 1000;

  it("picks the character that holds the required roles", () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        corporationRoles: ["Accountant"],
        corporationRolesExpireOn: rolesReadAt,
        scopes: [CORP_ASSETS_SCOPE],
      }),
      character({
        characterId: 101,
        corporationId: 1000,
        corporationRoles: ["Director"],
        corporationRolesExpireOn: rolesReadAt,
        scopes: [CORP_ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        roles: ["Director"],
      }),
    );

    expect(result.current.character?.characterId).toBe(101);
  });

  it("excludes a character whose roles fall short", () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        corporationRoles: ["Accountant"],
        corporationRolesExpireOn: rolesReadAt,
        scopes: [CORP_ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        roles: ["Director"],
      }),
    );

    expect(result.current.accessToken).toBeNull();
  });

  it("excludes a character whose roles have never been read", () => {
    // Reading roles needs the corporation-roles scope. A character that never
    // granted it has an empty role list, and an empty list matches no
    // requirement — the scope is deliberately not forced on anyone, so such a
    // character just holds no roles as far as this hook is concerned.
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        corporationRoles: [],
        scopes: [CORP_ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        roles: ["Director"],
      }),
    );

    expect(result.current.accessToken).toBeNull();
  });

  it("skips a character with unread roles in favour of a confirmed holder", () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        corporationRoles: [],
        scopes: [CORP_ASSETS_SCOPE],
      }),
      character({
        characterId: 101,
        corporationId: 1000,
        corporationRoles: ["Director"],
        corporationRolesExpireOn: rolesReadAt,
        scopes: [CORP_ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        roles: ["Director"],
      }),
    );

    expect(result.current.character?.characterId).toBe(101);
  });

  it("requires every listed role, not just one of them", () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        corporationRoles: ["Director"],
        corporationRolesExpireOn: rolesReadAt,
        scopes: [CORP_ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({
        corporationId: 1000,
        scopes: [CORP_ASSETS_SCOPE],
        roles: ["Director", "Accountant"],
      }),
    );

    expect(result.current.accessToken).toBeNull();
  });

  it("keeps the first match when no roles are required", () => {
    // Every other call site passes no roles; an empty requirement must stay
    // vacuously true rather than start demanding that roles have been read.
    login(
      character({ characterId: 100, corporationId: 1000 }),
      character({
        characterId: 101,
        corporationId: 1000,
        corporationRoles: ["Director"],
        corporationRolesExpireOn: rolesReadAt,
      }),
    );

    const { result } = renderHook(() =>
      useAccessToken({ corporationId: 1000 }),
    );

    expect(result.current.character?.characterId).toBe(100);
  });
});
