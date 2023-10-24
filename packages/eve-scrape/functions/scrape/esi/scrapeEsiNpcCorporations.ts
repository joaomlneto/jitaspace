import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getCharactersCharacterId,
  getCorporationsCorporationId,
  getCorporationsNpccorps,
} from "@jitaspace/esi-client";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeNpcCorporationsEventPayload = {
  data: {};
};

export const scrapeEsiNpcCorporations = client.createFunction(
  {
    id: "scrape-esi-npc-corporations",
    name: "Scrape NPC Corporations",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/npc-corporations" },

  async ({ step }) => {
    const stepStartTime = performance.now();

    // Get all NPC Corporation IDs in ESI
    const corporationIds = await getCorporationsNpccorps().then(
      (res) => res.data,
    );
    corporationIds.sort((a, b) => a - b);

    const limit = pLimit(20);

    const npcCorporations = await Promise.all(
      corporationIds.map((corporationId) =>
        limit(async () =>
          getCorporationsCorporationId(corporationId).then((res) => ({
            corporationId,
            ...res.data,
            // https://github.com/esi/esi-issues/issues/453
            ceo_id: res.data.ceo_id == 1 ? null : res.data.ceo_id,
            // https://github.com/esi/esi-issues/issues/1360
            creator_id: res.data.creator_id == 1 ? null : res.data.creator_id,
          })),
        ),
      ),
    );

    const ceoIds = npcCorporations
      .map((corporation) => corporation.ceo_id)
      // filter null records
      .filter((ceoId) => ceoId) as number[]; // FIXME: should not need typecast
    const creatorIds = npcCorporations
      .map((corporation) => corporation.creator_id)
      // filter null records
      .filter((creatorId) => creatorId) as number[]; // FIXME: should not need typecast

    const characterIds = [...new Set([...ceoIds, ...creatorIds])];

    const characters = await Promise.all(
      characterIds.map((characterId) =>
        limit(async () =>
          getCharactersCharacterId(characterId).then((res) => ({
            characterId,
            ...res.data,
          })),
        ),
      ),
    );

    // bootstrap missing corporationIds
    const corporationIdsInDb = await prisma.corporation.createMany({
      data: npcCorporations.map((corporation) => ({
        corporationId: corporation.corporationId,
        memberCount: corporation.member_count,
        name: corporation.name,
        taxRate: corporation.tax_rate,
        ticker: corporation.ticker,
      })),
      skipDuplicates: true,
    });

    /**
     * NPC Corporation CEOs
     */
    const characterChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.character
          .findMany({
            where: {
              characterId: {
                in: ceoIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        characters.map((character) => ({
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
          title: character.title ?? null,
          isDeleted: false,
        })),
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

    /**
     * NPC Corporations
     */
    const npcCorporationChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.corporation
          .findMany({
            where: {
              corporationId: {
                in: corporationIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        npcCorporations.map((corporation) => ({
          corporationId: corporation.corporationId,
          allianceId: corporation.alliance_id ?? null,
          ceoId: corporation.ceo_id,
          creatorId: corporation.creator_id,
          dateFounded: corporation.date_founded
            ? new Date(corporation.date_founded)
            : null,
          description: corporation.description ?? null,
          factionId: corporation.faction_id ?? null,
          homeStationId: corporation.home_station_id ?? null,
          memberCount: corporation.member_count,
          name: corporation.name,
          shares: corporation.shares ? BigInt(corporation.shares) : null,
          taxRate: corporation.tax_rate ?? null,
          ticker: corporation.ticker,
          url: corporation.url ?? null,
          warEligible: corporation.war_eligible ?? null,
          isDeleted: false,
        })),
      batchCreate: (entries) =>
        limit(() =>
          prisma.corporation.createMany({
            data: entries,
          }),
        ),
      batchDelete: (entries) =>
        prisma.corporation.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            corporationId: {
              in: entries.map((entry) => entry.corporationId),
            },
          },
        }),
      batchUpdate: (entries) => {
        console.log("updating", entries);
        return Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.corporation.update({
                data: entry,
                where: { corporationId: entry.corporationId },
              }),
            ),
          ),
        );
      },
      idAccessor: (e) => e.corporationId,
    });

    // scrape NPC Corporations' Loyalty Point Store Offers
    await step.sendEvent("fetch-esi-loyalty-store-offers", {
      name: "scrape/esi/loyalty-store-offers",
      data: {
        corporationIds,
      },
    });

    return {
      stats: {
        characterChanges,
        npcCorporationChanges,
      },
      elapsed: performance.now() - stepStartTime,
    };
  },
);
