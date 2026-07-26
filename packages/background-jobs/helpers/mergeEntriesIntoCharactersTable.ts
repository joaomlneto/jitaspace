import pLimit from "p-limit";

import type { GetCharactersDetailQueryResponse } from "@jitaspace/esi-client";

import type { Character } from "../db";
import { MAX_DB_PARALLELISM } from "../config";
import { prisma } from "../db";
import { excludeObjectKeys, updateTable } from "../utils";

export const convertEsiCharacterToDomain = (
  character: GetCharactersDetailQueryResponse & { characterId: number },
): Omit<Character, "updatedAt" | "createdAt"> => ({
  characterId: character.characterId,
  birthday: new Date(character.birthday),
  bloodlineId: character.bloodline_id,
  corporationId: character.corporation_id,
  description: character.description ?? null,
  factionId: character.faction_id ?? null,
  gender: character.gender,
  name: character.name,
  raceId: character.race_id,
  securityStatus: character.security_status ?? null,
  title: character.corporation_title ?? null,
  isDeleted: false,
});

export const mergeEsiEntriesIntoCharactersTable = (
  characters: (GetCharactersDetailQueryResponse & {
    characterId: number;
  })[],
) =>
  mergeEntriesIntoCharactersTable(characters.map(convertEsiCharacterToDomain));

export const mergeEntriesIntoCharactersTable = (
  characters: Omit<Character, "updatedAt" | "createdAt">[],
  limit = pLimit(MAX_DB_PARALLELISM),
) =>
  updateTable({
    fetchLocalEntries: async () =>
      prisma.character
        .findMany({
          where: {
            characterId: {
              in: characters.map((character) => character.characterId),
            },
          },
        })
        .then((entries) =>
          entries.map((entry) =>
            excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
          ),
        ),
    fetchRemoteEntries: () => Promise.resolve(characters),
    batchCreate: (entries) =>
      limit(() =>
        prisma.character.createMany({
          data: entries,
        }),
      ),
    batchDelete: (entries) =>
      prisma.character.updateMany({
        data: {
          isDeleted: true,
        },
        where: {
          characterId: {
            in: entries.map((entry) => entry.characterId),
          },
        },
      }),
    batchUpdate: (entries) =>
      Promise.all(
        entries.map((entry) =>
          limit(async () =>
            prisma.character.update({
              data: entry,
              where: { characterId: entry.characterId },
            }),
          ),
        ),
      ),
    idAccessor: (e) => e.characterId,
  });
