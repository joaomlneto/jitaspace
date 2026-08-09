import { describe, expect, it, jest } from "@jest/globals";

import type { CharactersCharacterIdRolesGetRolesEnum } from "@jitaspace/esi-client";

import type { CharacterSsoSession } from "../src/hooks/auth/useAuthStore";

// The generated ESI client is replaced so axios never loads in the test
// environment; @swc/jest does not hoist jest.mock, so the module under test is
// required lazily below.
jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  postCharactersAffiliation: jest.fn(),
  getCharactersCharacterIdRoles: jest.fn(),
}));

const { characterHasAcceptedRole } =
  require("../src/hooks/auth/characterHasAcceptedRole") as typeof import("../src/hooks/auth/characterHasAcceptedRole");

const character = (
  corporationRoles: CharactersCharacterIdRolesGetRolesEnum[],
): CharacterSsoSession =>
  ({
    characterId: 100,
    corporationId: 1000,
    corporationRoles,
  }) as CharacterSsoSession;

describe("characterHasAcceptedRole", () => {
  it("accepts any character when no roles are listed", () => {
    // The empty case must short-circuit: [].some() is false, which would match
    // nobody and break every call site that passes no roles.
    expect(characterHasAcceptedRole(character([]), undefined)).toBe(true);
    expect(characterHasAcceptedRole(character([]), [])).toBe(true);
  });

  it("accepts a character holding one of the accepted roles", () => {
    expect(
      characterHasAcceptedRole(character(["Director"]), ["Director"]),
    ).toBe(true);
  });

  it("accepts a character holding either of two accepted roles", () => {
    // Corporation wallets take Accountant OR Junior_Accountant; requiring both
    // would exclude essentially every character those routes exist to serve.
    const accepted: CharactersCharacterIdRolesGetRolesEnum[] = [
      "Accountant",
      "Junior_Accountant",
    ];

    expect(characterHasAcceptedRole(character(["Accountant"]), accepted)).toBe(
      true,
    );
    expect(
      characterHasAcceptedRole(character(["Junior_Accountant"]), accepted),
    ).toBe(true);
  });

  it("rejects a character holding none of them", () => {
    expect(
      characterHasAcceptedRole(character(["Accountant"]), ["Director"]),
    ).toBe(false);
  });

  it("rejects a character whose roles have never been read", () => {
    // Reading roles needs esi-characters.read_corporation_roles.v1, which is
    // deliberately not forced on anyone: without it the list stays empty and
    // the character simply authorises nothing role-gated.
    expect(characterHasAcceptedRole(character([]), ["Director"])).toBe(false);
  });
});
