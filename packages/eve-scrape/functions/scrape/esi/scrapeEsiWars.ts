import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import { getWars, getWarsWarId } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { BatchStepResult, CrudStatistics } from "../../../types";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeWarsEventPayload = {
  data: {
    batchSize?: number;
    /**
     * Whether to fetch all pages of wars. If set to true, it will fetch all
     * wars in one go, which is ideal for bootstrapping a new database.
     * For regular updates, it is recommended to set this to false (default).
     */
    fetchAllPages?: boolean;
    /**
     * Maximum war ID to fetch. If not provided, it will fetch all wars.
     */
    maxWarId?: number;
    /**
     * Whether to skip updating existing wars in the database.
     */
    skipExisting?: boolean;
    /**
     * Whether to skip wars that are already finished.
     * True by default. Wars that are finished are read-only and
     * should not be updated.
     */
    skipFinished?: boolean;
  };
};

type StatsKey = "wars";

export const scrapeEsiWars = client.createFunction(
  {
    id: "scrape-esi-wars",
    name: "Scrape Wars",
    concurrency: {
      limit: 1,
    },
    retries: 3,
    description: "Fetches wars from ESI",
  },
  { event: "scrape/esi/wars" },
  async ({ step, event, logger }) => {
    const batchSize = event.data.batchSize ?? 100;
    const fetchAllPages = event.data.fetchAllPages ?? false;
    const maxWarId = event.data.maxWarId;
    const skipExisting = event.data.skipExisting ?? false;
    const skipFinished = event.data.skipFinished ?? true;

    // Get all War IDs in ESI
    const batches = await step.run("Fetch War IDs", async () => {
      const warIds = await getWars({ max_war_id: maxWarId }).then(
        (res) => res.data,
      );

      // find which ones are already in the database and are finished
      const existingWars = skipExisting
        ? await prisma.war.findMany({
            select: { warId: true, finishedDate: true },
            where: {
              warId: {
                in: warIds,
              },
            },
          })
        : [];

      const remainingWarIds = warIds.filter(
        (warId) =>
          !existingWars.some((war) => war.warId === warId) &&
          (!skipFinished ||
            !existingWars.some(
              (war) => war.warId === warId && war.finishedDate !== null,
            )),
      );

      remainingWarIds.sort((a, b) => a - b);
      const numBatches = Math.ceil(remainingWarIds.length / batchSize);
      const batchTypeIds = (batchIndex: number) =>
        remainingWarIds.slice(
          batchIndex * batchSize,
          (batchIndex + 1) * batchSize,
        );
      return [...Array(numBatches).keys()].map((batchId) =>
        batchTypeIds(batchId),
      );
    });

    let results: BatchStepResult<StatsKey>[] = [];
    const limit = pLimit(1);

    // update types in batches
    for (let i = 0; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();
          const thisBatchWarIds = batches[i]!;

          const fetchRemoteEntries = async () =>
            Promise.all(
              thisBatchWarIds.map((warId) =>
                limit(async () =>
                  getWarsWarId(warId)
                    .then((res) => res.data)
                    .then((war) => ({
                      warId: warId,
                      declaredDate: war.declared,
                      finishedDate: war.finished ?? null,
                      retracted: war.retracted ?? null,
                      startedDate: war.started,
                      isMutual: war.mutual,
                      isOpenForAllies: war.open_for_allies,
                      aggressorAllianceId: war.aggressor.alliance_id ?? null,
                      aggressorCorporationId:
                        war.aggressor.corporation_id ?? null,
                      aggressorIskDestroyed:
                        war.aggressor.isk_destroyed ?? null,
                      aggressorShipsKilled: war.aggressor.ships_killed ?? null,
                      defenderAllianceId: war.defender.alliance_id ?? null,
                      defenderCorporationId:
                        war.defender.corporation_id ?? null,
                      defenderIskDestroyed: war.defender.isk_destroyed ?? null,
                      defenderShipsKilled: war.defender.ships_killed ?? null,
                      allianceAllies:
                        war.allies
                          ?.filter((ally) => ally.alliance_id)
                          .map((ally) => ({
                            allianceId: ally.alliance_id,
                          })) ?? [],
                      corporationAllies:
                        war.allies
                          ?.filter((ally) => ally.corporation_id)
                          .map((ally) => ({
                            corporationId: ally.corporation_id,
                          })) ?? [],
                    })),
                ),
              ),
            );

          const remoteEntries = await fetchRemoteEntries();

          await createCorpAndItsRefRecords({
            missingAllianceIds: new Set(
              remoteEntries
                .map((war) => [
                  war.aggressorAllianceId,
                  war.defenderAllianceId,
                  ...war.allianceAllies.map((ally) => ally.allianceId),
                ])
                .flat()
                .filter((id) => id != null),
            ),
            missingCorporationIds: new Set(
              remoteEntries
                .map((war) => [
                  war.aggressorCorporationId,
                  war.defenderCorporationId,
                  ...war.corporationAllies.map((ally) => ally.corporationId),
                ])
                .flat()
                .filter((id) => id != null),
            ),
          });

          console.log({ remoteEntries });
          logger.info({ remoteEntries });

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
                  entries.map((entry) =>
                    excludeObjectKeys(entry, ["updatedAt"]),
                  ),
                ),
            fetchRemoteEntries: async () =>
              Promise.all(
                thisBatchWarIds.map((warId) =>
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

          return {
            stats: {
              wars: {
                created: 0,
                deleted: 0,
                modified: 0,
                equal: 0,
              },
            },
            elapsed: performance.now() - stepStartTime,
          };
        },
      );
      results.push(result);
    }

    const totals: BatchStepResult<StatsKey> = {
      stats: {
        wars: {
          created: 0,
          deleted: 0,
          modified: 0,
          equal: 0,
        },
      },
      elapsed: 0,
    };
    results.forEach((stepResult) => {
      Object.entries(stepResult.stats).forEach(([category, value]) => {
        Object.keys(value).forEach(
          (op) =>
            (totals.stats[category as StatsKey][op as keyof CrudStatistics] +=
              stepResult.stats[category as StatsKey][
                op as keyof CrudStatistics
              ]),
        );
      });
      totals.elapsed += stepResult.elapsed;
    });

    // Check if we need to recurse to fetch all pages
    if (fetchAllPages) {
      const nextMaxWarId = Math.min(...batches.flat());
      await step.sendEvent(`Scrape Wars < ${nextMaxWarId}`, {
        name: "scrape/esi/wars",
        data: {
          maxWarId: nextMaxWarId,
          fetchAllPages: true, // Continue fetching all pages
        },
      });
    }

    await step.sendEvent("Function Finished", {
      name: "scrape/esi/wars.finished",
      data: {},
    });

    return totals;
  },
);
