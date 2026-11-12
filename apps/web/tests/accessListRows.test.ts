import { describe, expect, it } from "@jest/globals";

import type { AccessListWithCharacters } from "@jitaspace/hooks";

import {
  accessListMembers,
  accessRank,
  activeCharacterIds,
  nextCharacterSelection,
  rowsManagedBy,
  toAccessListRow,
} from "~/components/AccessLists/accessListRows";

const ALICE = 90000001;
const BOB = 90000002;
const CAROL = 90000003;

const list = (
  over: Partial<AccessListWithCharacters> = {},
): AccessListWithCharacters => ({
  id: 1,
  name: "Home",
  description: "Our citadels",
  characterIds: [ALICE],
  membership: {
    allow_everyone: false,
    characters: [
      { character_id: ALICE, access: "Manager" },
      { character_id: BOB, access: "Admin" },
      { character_id: CAROL, access: "Blocked" },
    ],
    corporations: [{ corporation_id: 98000001, access: "Allowed" }],
    alliances: [
      { alliance_id: 99000001, access: "Allowed" },
      { alliance_id: 99000002, access: "Unspecified" },
    ],
  },
  ...over,
});

describe("accessListMembers", () => {
  it("flattens characters, corporations and alliances, tagged by kind", () => {
    expect(accessListMembers(list())).toEqual([
      { entityId: ALICE, kind: "character", access: "Manager" },
      { entityId: BOB, kind: "character", access: "Admin" },
      { entityId: CAROL, kind: "character", access: "Blocked" },
      { entityId: 98000001, kind: "corporation", access: "Allowed" },
      { entityId: 99000001, kind: "alliance", access: "Allowed" },
      { entityId: 99000002, kind: "alliance", access: "Unspecified" },
    ]);
  });
});

describe("toAccessListRow", () => {
  it("counts who is let in and who is blocked", () => {
    const row = toAccessListRow(list());

    // Admins and Managers are let in too; Unspecified grants nothing.
    expect(row.allowedCount).toBe(4);
    expect(row.blockedCount).toBe(1);
    expect(row.characterCount).toBe(3);
    expect(row.corporationCount).toBe(1);
    expect(row.allianceCount).toBe(2);
    expect(row.allowEveryone).toBe(false);
    expect(row.members).toHaveLength(6);
  });

  it("takes each managing character's role from the membership, strongest first", () => {
    const row = toAccessListRow(list({ characterIds: [ALICE, BOB] }));

    expect(row.managers).toEqual([
      { characterId: BOB, access: "Admin" },
      { characterId: ALICE, access: "Manager" },
    ]);
    expect(row.managerRoles).toEqual(["Admin", "Manager"]);
  });

  it("keeps a manager the membership no longer names, without a role", () => {
    const row = toAccessListRow(list({ characterIds: [12345, ALICE] }));

    expect(row.managers).toEqual([
      { characterId: ALICE, access: "Manager" },
      { characterId: 12345, access: undefined },
    ]);
    expect(row.managerRoles).toEqual(["Manager"]);
  });

  it("lists each role once", () => {
    const row = toAccessListRow(
      list({
        characterIds: [ALICE, BOB],
        membership: {
          allow_everyone: true,
          characters: [
            { character_id: ALICE, access: "Manager" },
            { character_id: BOB, access: "Manager" },
          ],
          corporations: [],
          alliances: [],
        },
      }),
    );

    expect(row.managerRoles).toEqual(["Manager"]);
    expect(row.allowEveryone).toBe(true);
  });
});

describe("accessRank", () => {
  it("orders roles strongest first, with unknown roles last", () => {
    expect(
      (["Blocked", "Admin", undefined, "Allowed", "Manager"] as const)
        .slice()
        .sort((a, b) => accessRank(a) - accessRank(b)),
    ).toEqual(["Admin", "Manager", "Allowed", "Blocked", undefined]);
  });
});

describe("activeCharacterIds", () => {
  it("selects every character when there is no selection", () => {
    expect(activeCharacterIds(null, [ALICE, BOB])).toEqual(
      new Set([ALICE, BOB]),
    );
  });

  it("drops characters this browser cannot read", () => {
    expect(activeCharacterIds([BOB, 12345], [ALICE, BOB])).toEqual(
      new Set([BOB]),
    );
  });

  it("keeps an empty selection empty", () => {
    expect(activeCharacterIds([], [ALICE, BOB])).toEqual(new Set());
  });

  it("ignores the selection with a single character", () => {
    expect(activeCharacterIds([12345], [ALICE])).toEqual(new Set([ALICE]));
  });
});

describe("nextCharacterSelection", () => {
  it("clears the URL once every character is selected", () => {
    expect(nextCharacterSelection([BOB, ALICE], [ALICE, BOB])).toBeNull();
  });

  it("keeps a partial selection, minus unknown and repeated ids", () => {
    expect(
      nextCharacterSelection([BOB, BOB, 12345], [ALICE, BOB, CAROL]),
    ).toEqual([BOB]);
  });

  it("does not let an unknown id stand in for a deselected character", () => {
    expect(nextCharacterSelection([ALICE, 12345], [ALICE, BOB])).toEqual([
      ALICE,
    ]);
  });
});

describe("rowsManagedBy", () => {
  it("keeps the lists any of the characters manages", () => {
    const rows = [
      toAccessListRow(list({ id: 1, characterIds: [ALICE] })),
      toAccessListRow(list({ id: 2, characterIds: [BOB] })),
      toAccessListRow(list({ id: 3, characterIds: [ALICE, BOB] })),
    ];

    expect(rowsManagedBy(rows, new Set([BOB])).map((row) => row.id)).toEqual([
      2, 3,
    ]);
    expect(rowsManagedBy(rows, new Set())).toEqual([]);
  });
});
