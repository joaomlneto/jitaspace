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
}));

const { useAuthStore } =
  require("../src/hooks/auth/useAuthStore") as typeof import("../src/hooks/auth/useAuthStore");
const { useEsiSubjects } =
  require("../src/hooks/auth/useEsiSubjects") as typeof import("../src/hooks/auth/useEsiSubjects");

const ASSETS_SCOPE = "esi-assets.read_corporation_assets.v1";
const MAIL_SCOPE = "esi-mail.read_mail.v1";

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

describe("useEsiSubjects — character kind", () => {
  it("yields one subject per character, each signing for itself", () => {
    login(
      character({ characterId: 100, scopes: [MAIL_SCOPE] }),
      character({ characterId: 101, scopes: [MAIL_SCOPE] }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "character", scopes: [MAIL_SCOPE] }),
    );

    expect(result.current).toEqual([
      {
        id: 100,
        characterId: 100,
        authHeaders: { Authorization: "Bearer token-100" },
      },
      {
        id: 101,
        characterId: 101,
        authHeaders: { Authorization: "Bearer token-101" },
      },
    ]);
  });

  it("requires no scopes when none are given", () => {
    login(
      character({ characterId: 100 }),
      character({ characterId: 101, scopes: [MAIL_SCOPE] }),
    );

    const { result } = renderHook(() => useEsiSubjects({ kind: "character" }));

    expect(result.current.map((s) => s.id)).toEqual([100, 101]);
  });

  it("excludes characters missing the required scope", () => {
    login(
      character({ characterId: 100, scopes: [MAIL_SCOPE] }),
      character({ characterId: 101, scopes: [] }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "character", scopes: [MAIL_SCOPE] }),
    );

    expect(result.current.map((s) => s.id)).toEqual([100]);
  });
});

describe("useEsiSubjects — corporation kind", () => {
  it("deduplicates characters in the same corporation", () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        scopes: [ASSETS_SCOPE],
      }),
      character({
        characterId: 101,
        corporationId: 1000,
        scopes: [ASSETS_SCOPE],
      }),
      character({
        characterId: 102,
        corporationId: 2000,
        scopes: [ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "corporation", scopes: [ASSETS_SCOPE] }),
    );

    expect(result.current.map((s) => s.id)).toEqual([1000, 2000]);
  });

  it("signs each corporation with a character that belongs to it", () => {
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        scopes: [ASSETS_SCOPE],
      }),
      character({
        characterId: 101,
        corporationId: 2000,
        scopes: [ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "corporation", scopes: [ASSETS_SCOPE] }),
    );

    expect(
      result.current.map((s) => [s.id, s.characterId, s.authHeaders]),
    ).toEqual([
      [1000, 100, { Authorization: "Bearer token-100" }],
      [2000, 101, { Authorization: "Bearer token-101" }],
    ]);
  });
});

describe("useEsiSubjects — unusable characters", () => {
  it("skips a corporationId of 0 left behind by a failed affiliation lookup", () => {
    // useAuthStore.addCharacter falls back to corporationId 0 when the
    // affiliation call fails. 0 is not a corporation: querying it would send an
    // authenticated GET /corporations/0/... and fail the whole aggregate.
    login(
      character({ characterId: 100, corporationId: 0, scopes: [ASSETS_SCOPE] }),
      character({
        characterId: 101,
        corporationId: 2000,
        scopes: [ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "corporation", scopes: [ASSETS_SCOPE] }),
    );

    expect(result.current.map((s) => s.id)).toEqual([2000]);
  });

  it("skips characters whose session has expired", () => {
    login(
      character({
        characterId: 100,
        sessionExpired: true,
        scopes: [MAIL_SCOPE],
      }),
      character({ characterId: 101, scopes: [MAIL_SCOPE] }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "character", scopes: [MAIL_SCOPE] }),
    );

    expect(result.current.map((s) => s.id)).toEqual([101]);
  });

  it("does not let an expired character win the corporation dedup", () => {
    // The expired character sorts first, so without the filter it would claim
    // corporation 1000 and make it unreachable despite a live token existing.
    login(
      character({
        characterId: 100,
        corporationId: 1000,
        sessionExpired: true,
        scopes: [ASSETS_SCOPE],
      }),
      character({
        characterId: 101,
        corporationId: 1000,
        scopes: [ASSETS_SCOPE],
      }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "corporation", scopes: [ASSETS_SCOPE] }),
    );

    expect(result.current.map((s) => [s.id, s.characterId])).toEqual([
      [1000, 101],
    ]);
  });
});

describe("useEsiSubjects — alliance kind", () => {
  it("deduplicates and skips characters with no alliance", () => {
    login(
      character({ characterId: 100, allianceId: 500, scopes: [MAIL_SCOPE] }),
      character({ characterId: 101, allianceId: 500, scopes: [MAIL_SCOPE] }),
      character({ characterId: 102, scopes: [MAIL_SCOPE] }),
    );

    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "alliance", scopes: [MAIL_SCOPE] }),
    );

    expect(result.current.map((s) => [s.id, s.characterId])).toEqual([
      [500, 100],
    ]);
  });
});

describe("useEsiSubjects — stability", () => {
  it("returns a stable reference across re-renders", () => {
    login(character({ characterId: 100, scopes: [MAIL_SCOPE] }));

    const { result, rerender } = renderHook(() =>
      useEsiSubjects({ kind: "character", scopes: [MAIL_SCOPE] }),
    );
    const first = result.current;
    rerender();

    // A fresh array every render would rebuild the query list on each pass.
    expect(result.current).toBe(first);
  });

  it("returns no subjects when nobody is logged in", () => {
    const { result } = renderHook(() =>
      useEsiSubjects({ kind: "character", scopes: [MAIL_SCOPE] }),
    );

    expect(result.current).toEqual([]);
  });
});
