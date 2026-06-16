import pLimit from "p-limit";

import type { GetWarsWarId200 } from "@jitaspace/esi-client";
import { getWarsWarId } from "@jitaspace/esi-client";

import type { War } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";
import { drainQueue } from "./drainQueue";

export interface ProcessRedisWarsQueueEventPayload {
  data: {
    recursive?: boolean;
  };
}

type Limit = ReturnType<typeof pLimit>;
type WarEntry = Omit<War, "updatedAt" | "createdAt">;

const buildWarEntry = (warId: number, war: GetWarsWarId200) => ({
  warId: warId,
  declaredDate: new Date(war.declared),
  finishedDate: war.finished ? new Date(war.finished) : null,
  retractedDate: war.retracted ? new Date(war.retracted) : null,
  startedDate: war.started ? new Date(war.started) : null,
  isMutual: war.mutual,
  isOpenForAllies: war.open_for_allies,
  aggressorAllianceId: war.aggressor.alliance_id ?? null,
  aggressorCorporationId: war.aggressor.corporation_id ?? null,
  aggressorIskDestroyed: war.aggressor.isk_destroyed,
  aggressorShipsKilled: war.aggressor.ships_killed ?? null,
  defenderAllianceId: war.defender.alliance_id ?? null,
  defenderCorporationId: war.defender.corporation_id ?? null,
  defenderIskDestroyed: war.defender.isk_destroyed,
  defenderShipsKilled: war.defender.ships_killed ?? null,
  isDeleted: false,
});

const fetchLocalWars = (warIds: number[]) =>
  prisma.war
    .findMany({
      select: {
        warId: true,
        declaredDate: true,
        finishedDate: true,
        retractedDate: true,
        startedDate: true,
        isMutual: true,
        isOpenForAllies: true,
        aggressorAllianceId: true,
        aggressorCorporationId: true,
        aggressorIskDestroyed: true,
        aggressorShipsKilled: true,
        defenderAllianceId: true,
        defenderCorporationId: true,
        defenderIskDestroyed: true,
        defenderShipsKilled: true,
        updatedAt: true,
        isDeleted: true,
      },
      where: {
        warId: {
          in: warIds,
        },
      },
    })
    .then((entries) =>
      entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
    );

const fetchRemoteWar = (
  limit: Limit,
  wars: Record<number, WarEntry>,
  warId: number,
) => {
  const cached = wars[warId];
  if (cached != null) return Promise.resolve(cached);
  return limit(() =>
    getWarsWarId(warId)
      .then((res) => res.data)
      .then((war) => buildWarEntry(warId, war)),
  );
};

const updateWar = (limit: Limit, entry: WarEntry) =>
  limit(() =>
    prisma.war.update({
      data: entry,
      where: { warId: entry.warId },
    }),
  );

export const processRedisWars = defineJob<
  ProcessRedisWarsQueueEventPayload["data"]
>({
  id: "process-redis-wars",
  name: "Process Wars from Redis Queue",
  trigger: { type: "event" },
  concurrencyLimit: 5,
  retries: 3,
  handler: async (ctx) => {
    const limit = pLimit(1);

    const processed = await drainQueue<GetWarsWarId200[]>(
      "wars",
      async (job) => {
        const remoteEntries = job.data;

        const thisBatchWarIds = remoteEntries.map((war) => war.id);

        const wars: Record<number, WarEntry> = {};
        remoteEntries.forEach((war) => {
          wars[war.id] = buildWarEntry(war.id, war);
        });

        await createCorpAndItsRefRecords({ wars: Object.values(wars) });

        await updateTable({
          fetchLocalEntries: async () => fetchLocalWars(thisBatchWarIds),
          fetchRemoteEntries: async () =>
            Promise.all(
              thisBatchWarIds.map((warId) =>
                fetchRemoteWar(limit, wars, warId),
              ),
            ),
          batchCreate: (entries) =>
            limit(() =>
              prisma.war.createMany({
                data: entries,
              }),
            ),
          batchDelete: (entries) =>
            prisma.war.updateMany({
              data: {
                isDeleted: true,
              },
              where: {
                warId: {
                  in: entries.map((war) => war.warId),
                },
              },
            }),
          batchUpdate: (entries) =>
            Promise.all(entries.map((entry) => updateWar(limit, entry))),
          idAccessor: (e) => e.warId,
        });
      },
    );

    ctx.logger.info(`Processed ${processed} war batch(es) from queue.`);
    return { processed };
  },
});
