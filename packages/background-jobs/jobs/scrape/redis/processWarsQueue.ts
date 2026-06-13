import pLimit from "p-limit";

import type { GetWarsWarId200 } from "@jitaspace/esi-client";
import { getWarsWarId } from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import type { War } from "../../../db";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";
import { drainQueue } from "./drainQueue";

export interface ProcessRedisWarsQueueEventPayload {
  data: {
    recursive?: boolean;
  };
}

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

        const wars: Record<number, Omit<War, "updatedAt" | "createdAt">> = {};
        remoteEntries.forEach((war) => {
          wars[war.id] = {
            warId: war.id,
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
          };
        });

        await createCorpAndItsRefRecords({ wars: Object.values(wars) });

        await updateTable({
          fetchLocalEntries: async () =>
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
                    in: thisBatchWarIds,
                  },
                },
              })
              .then((entries) =>
                entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
              ),
          fetchRemoteEntries: async () =>
            Promise.all(
              thisBatchWarIds.map(
                (warId) =>
                  wars[warId] ??
                  limit(async () =>
                    getWarsWarId(warId)
                      .then((res) => res.data)
                      .then((war) => ({
                        warId: warId,
                        declaredDate: new Date(war.declared),
                        finishedDate: war.finished
                          ? new Date(war.finished)
                          : null,
                        retractedDate: war.retracted
                          ? new Date(war.retracted)
                          : null,
                        startedDate: war.started ? new Date(war.started) : null,
                        isMutual: war.mutual,
                        isOpenForAllies: war.open_for_allies,
                        aggressorAllianceId: war.aggressor.alliance_id ?? null,
                        aggressorCorporationId:
                          war.aggressor.corporation_id ?? null,
                        aggressorIskDestroyed: war.aggressor.isk_destroyed,
                        aggressorShipsKilled:
                          war.aggressor.ships_killed ?? null,
                        defenderAllianceId: war.defender.alliance_id ?? null,
                        defenderCorporationId:
                          war.defender.corporation_id ?? null,
                        defenderIskDestroyed: war.defender.isk_destroyed,
                        defenderShipsKilled: war.defender.ships_killed ?? null,
                        isDeleted: false,
                      })),
                  ),
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
            Promise.all(
              entries.map((entry) =>
                limit(async () =>
                  prisma.war.update({
                    data: entry,
                    where: { warId: entry.warId },
                  }),
                ),
              ),
            ),
          idAccessor: (e) => e.warId,
        });
      },
    );

    ctx.logger.info(`Processed ${processed} war batch(es) from queue.`);
    return { processed };
  },
});
