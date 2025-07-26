/**
 * Thanks to Karbowiak for the original code that this is based on!
 */
import pLimit from "p-limit";

import { prisma, War } from "@jitaspace/db";
import { getWarsWarId, GetWarsWarId200 } from "@jitaspace/esi-client";
import { kv } from "@jitaspace/kv";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ProcessRedisWarsQueueEventPayload = {
  data: {
    recursive?: boolean;
  };
};

type StatsKey = "wars";
export type EveRefWarSchema = Omit<GetWarsWarId200, "id"> & {
  war_id: number; // war_id
  http_last_modified: string;
};
export const processRedisWars = client.createFunction(
  {
    id: "process-redis-wars",
    name: "Process Wars from Redis Queue",
    concurrency: {
      limit: 5,
    },
    retries: 3,
  },
  { event: "process/redis/wars" },
  async ({ event, step, logger }) => {
    const recursive = event.data.recursive ?? false;
    const limit = pLimit(1);

    await kv.queues.war.process(async (job, done) => {
      const stepStartTime = performance.now();

      const remoteEntries = job.data;

      console.log("example entry:", remoteEntries[0]);

      const thisBatchWarIds = remoteEntries.map((war) => war.id);

      const wars: Record<number, Omit<War, "updatedAt">> = {};
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
          /*
            allianceAllies:
              war.allies
                ?.filter((ally) => ally.alliance_id)
                .map((ally) => ally.alliance_id!)
                .map((allyAllianceId) => ({
                  warId,
                  allianceId: allyAllianceId,
                })) ?? [],
            corporationAllies:
              war.allies
                ?.filter((ally) => ally.corporation_id)
                .map((ally) => ally.corporation_id!)
                .map((allyCorporationId) => ({
                  warId,
                  corporationId: allyCorporationId,
                })) ?? [],*/
          isDeleted: false,
        };
      });

      await createCorpAndItsRefRecords({
        missingAllianceIds: new Set(
          remoteEntries
            .map((war) => [
              war.aggressor?.alliance_id ?? null,
              war.defender?.alliance_id ?? null,
              ...(war.allies ?? [])?.map((ally) => ally.alliance_id),
            ])
            .flat()
            .filter((id) => id != null),
        ),
        missingCorporationIds: new Set(
          remoteEntries
            .map((war) => [
              war.aggressor?.corporation_id,
              war.defender?.corporation_id,
              ...(war.allies ?? [])?.map((ally) => ally.corporation_id),
            ])
            .flat()
            .filter((id) => id != null),
        ),
      });

      const warChanges = await updateTable({
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
                      aggressorShipsKilled: war.aggressor.ships_killed ?? null,
                      defenderAllianceId: war.defender.alliance_id ?? null,
                      defenderCorporationId:
                        war.defender.corporation_id ?? null,
                      defenderIskDestroyed: war.defender.isk_destroyed,
                      defenderShipsKilled: war.defender.ships_killed ?? null,
                      /*
                        allianceAllies:
                          war.allies
                            ?.filter((ally) => ally.alliance_id)
                            .map((ally) => ally.alliance_id!)
                            .map((allyAllianceId) => ({
                              warId,
                              allianceId: allyAllianceId,
                            })) ?? [],
                        corporationAllies:
                          war.allies
                            ?.filter((ally) => ally.corporation_id)
                            .map((ally) => ally.corporation_id!)
                            .map((allyCorporationId) => ({
                              warId,
                              corporationId: allyCorporationId,
                            })) ?? [],*/
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

      done();
    });

    return "done?";
  },
);
