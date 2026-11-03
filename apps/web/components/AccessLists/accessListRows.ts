import type {
  AccessListAccess,
  AccessListWithCharacters,
} from "@jitaspace/hooks";

export type AccessListMemberKind = "character" | "corporation" | "alliance";

/** One entry of an access list's membership, whatever kind of entity. */
export interface AccessListMember {
  entityId: number;
  kind: AccessListMemberKind;
  access: AccessListAccess;
}

/** One of the user's characters that manages a list, and how. */
export interface AccessListManager {
  characterId: number;
  /**
   * The character's own entry in the list. ESI only lists a list for its
   * Managers and Admins, so this is one of those — unless the membership read
   * after the listing no longer names the character.
   */
  access?: AccessListAccess;
}

export interface AccessListRow {
  id: number;
  name: string;
  description: string;
  allowEveryone: boolean;
  managers: AccessListManager[];
  /** The managers' roles, each once, for the role filter. */
  managerRoles: AccessListAccess[];
  members: AccessListMember[];
  /** Members that are let in: Allowed, Managers and Admins. */
  allowedCount: number;
  blockedCount: number;
  characterCount: number;
  corporationCount: number;
  allianceCount: number;
}

/** Strongest first, which is also the order the roles sort in. */
export const ACCESS_ORDER: readonly AccessListAccess[] = [
  "Admin",
  "Manager",
  "Allowed",
  "Blocked",
  "Unspecified",
];

export const accessRank = (access: AccessListAccess | undefined) => {
  const rank = access === undefined ? -1 : ACCESS_ORDER.indexOf(access);
  return rank === -1 ? ACCESS_ORDER.length : rank;
};

const GRANTS_ACCESS = new Set<AccessListAccess>([
  "Admin",
  "Manager",
  "Allowed",
]);

/** Every membership entry of a list, flattened: characters, corporations, alliances. */
export function accessListMembers(
  list: Pick<AccessListWithCharacters, "membership">,
): AccessListMember[] {
  const { characters, corporations, alliances } = list.membership;
  return [
    ...characters.map((entry) => ({
      entityId: entry.character_id,
      kind: "character" as const,
      access: entry.access,
    })),
    ...corporations.map((entry) => ({
      entityId: entry.corporation_id,
      kind: "corporation" as const,
      access: entry.access,
    })),
    ...alliances.map((entry) => ({
      entityId: entry.alliance_id,
      kind: "alliance" as const,
      access: entry.access,
    })),
  ];
}

export function toAccessListRow(list: AccessListWithCharacters): AccessListRow {
  const members = accessListMembers(list);
  const characterAccess = new Map(
    list.membership.characters.map((entry) => [
      entry.character_id,
      entry.access,
    ]),
  );
  const managers = list.characterIds
    .map((characterId) => ({
      characterId,
      access: characterAccess.get(characterId),
    }))
    .sort((a, b) => accessRank(a.access) - accessRank(b.access));

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    allowEveryone: list.membership.allow_everyone,
    managers,
    managerRoles: [
      ...new Set(managers.flatMap((manager) => manager.access ?? [])),
    ],
    members,
    allowedCount: members.filter((member) => GRANTS_ACCESS.has(member.access))
      .length,
    blockedCount: members.filter((member) => member.access === "Blocked")
      .length,
    characterCount: list.membership.characters.length,
    corporationCount: list.membership.corporations.length,
    allianceCount: list.membership.alliances.length,
  };
}

/**
 * The characters whose lists are shown. `null` (no `?characters=`) means all
 * of them; ids this browser cannot read (a shared link, or a character since
 * signed out) are dropped; and with a single character there is nothing to
 * choose, so a stale selection cannot hide its lists.
 */
export function activeCharacterIds(
  selected: readonly number[] | null,
  available: readonly number[],
): Set<number> {
  if (selected === null || available.length <= 1) return new Set(available);
  const known = new Set(available);
  return new Set(selected.filter((id) => known.has(id)));
}

/**
 * The `?characters=` value for a new chip selection: `null`, which leaves a
 * clean URL, once every character is selected.
 */
export function nextCharacterSelection(
  selected: readonly number[],
  available: readonly number[],
): number[] | null {
  const known = new Set(available);
  const next = [...new Set(selected.filter((id) => known.has(id)))];
  return next.length === known.size ? null : next;
}

/** The rows any of the given characters manages. */
export function rowsManagedBy(
  rows: readonly AccessListRow[],
  characterIds: ReadonlySet<number>,
): AccessListRow[] {
  return rows.filter((row) =>
    row.managers.some((manager) => characterIds.has(manager.characterId)),
  );
}
