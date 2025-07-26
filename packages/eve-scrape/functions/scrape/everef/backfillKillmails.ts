import pLimit from "p-limit";

import { GetKillmailsKillmailIdKillmailHash200 } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { BatchStepResult } from "../../../types";
import { downloadTarBz2FileAndParseJson } from "../../../utils/downloadFile.ts";

export type BackfillEveRefKillmailsEventPayload = {
  data: {
    url: string;
    batchSize?: number;
    skipBatches?: number;
  };
};

export type EveRefKillmailSchema = GetKillmailsKillmailIdKillmailHash200 & {
  http_last_modified: string;
};

type StatsKey = "killmails";

export const backfillEveRefKillmails = client.createFunction(
  {
    id: "backfill-everef-killmails",
    name: "Backfill Killmails from EVE Ref",
    concurrency: {
      limit: 2,
    },
    retries: 5,
  },
  { event: "backfill/everef/killmails" },
  async ({ event, step, logger }) => {
    const batchSize = event.data.batchSize ?? 50;
    const startBatch = event.data.skipBatches ?? 0;
    const url = event.data.url;

    if (!url) {
      throw new Error("No URL provided.");
    }

    const stepStartTime = performance.now();
    const limit = pLimit(1);

    // Retrieve and extract killmail archive file from EVE Ref
    const batches: {
      name: string;
      content: EveRefKillmailSchema[];
    }[][] = await step.run("Download and extract packages", async () => {
      const files = (await downloadTarBz2FileAndParseJson(url)) as {
        name: string;
        content: EveRefKillmailSchema[];
      }[];

      // Ensure no more than 1000 batches are created
      const boundedBatchSize = Math.max(batchSize, 1 + files.length / 1000);

      const numBatches = Math.ceil(files.length / boundedBatchSize);
      const batches = [...Array(numBatches).keys()].map((batchId) =>
        files.slice(batchId * batchSize, (batchId + 1) * batchSize),
      );
      return batches;
    });

    let results: BatchStepResult<StatsKey>[] = [];

    for (let i = startBatch; i < batches.length; i++) {
      const result = await step.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const stepStartTime = performance.now();

          const remoteEntries: EveRefKillmailSchema[] = batches[i]!.map(
            (file: { content: EveRefKillmailSchema[] }) => file.content,
          ).flat();

          const thisBatchKillmailIds = remoteEntries.map(
            (killmail) => killmail.killmail_id,
          );

          await createCorpAndItsRefRecords({
            missingAllianceIds: new Set(
              remoteEntries
                .map((killmail) => [
                  ...killmail.attackers.map((a) => a.alliance_id),
                  killmail.victim.alliance_id,
                ])
                .flat()
                .filter((id) => id != null),
            ),
            missingCharacterIds: new Set(
              remoteEntries
                .map((killmail) => [
                  ...killmail.attackers.map((a) => a.character_id),
                  killmail.victim.character_id,
                ])
                .flat()
                .filter((id) => id != null),
            ),
            missingCorporationIds: new Set(
              remoteEntries
                .map((killmail) => [
                  ...killmail.attackers.map((a) => a.corporation_id),
                  killmail.victim.alliance_id,
                ])
                .flat()
                .filter((id) => id != null),
            ),
            missingFactionIds: new Set(
              remoteEntries
                .map((killmail) => [
                  ...killmail.attackers.map((a) => a.faction_id),
                  killmail.victim.faction_id,
                ])
                .flat()
                .filter((id) => id != null),
            ),
          });

          // TODO: Fetch wars before inserting killmails

          /*
          const killmailChanges = await updateTable({
            fetchLocalEntries: async () =>
              prisma.killmail
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
                            })) ?? [],* /
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
          });*/

          return {
            stats: {
              killmails: {
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

    return {
      stats: {},
      elapsed: performance.now() - stepStartTime,
    };
  },
);
