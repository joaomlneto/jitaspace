import pLimit, { LimitFunction } from "p-limit";

import { Character, prisma } from "@jitaspace/db";
import { GetCharactersCharacterIdQueryResponse } from "@jitaspace/esi-client";

import { MAX_DB_PARALLELISM } from "../config";
import { excludeObjectKeys, updateTable } from "../utils";


export const convertEsiCharacterToDomain = (
  characterId: number,
  character: GetCharactersCharacterIdQueryResponse,
): Omit<Character, "updatedAt"> => ({
  characterId: characterId,
  birthday: new Date(character.birthday),
  bloodlineId: character.bloodline_id,
  corporationId: character.corporation_id,
  description: character.description ?? null,
  factionId: character.faction_id ?? null,
  gender: character.gender,
  name: character.name,
  raceId: character.race_id,
  securityStatus: character.security_status ?? null,
  title: character.title ?? null,
  isDeleted: false,
});

export const mergeEsiEntriesIntoCharactersTable = (
  characters: (GetCharactersCharacterIdQueryResponse & {
    characterId: number;
  })[],
  limit?: LimitFunction,
) =>
  mergeEntriesIntoCharactersTable(
    characters.map((character) =>
      convertEsiCharacterToDomain(character.characterId, character),
    ),
  );

export const mergeEntriesIntoCharactersTable = (
  characters: Omit<Character, "updatedAt">[],
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
          entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
        ),
    fetchRemoteEntries: async () => characters,
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
