import { prisma } from "@jitaspace/db";
import { getWars, getWarsWarId } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export type UpdateActiveWarsEventPayload = {
  data: {};
};

export const updateWars = client.createFunction(
  {
    id: "esi-update-wars",
    name: "Update wars from ESI",
    concurrency: {
      limit: 1,
    },
    retries: 5,
    description: "Fetch new wars and update active wars' state from ESI",
  },
  { cron: "TZ=UTC 30 * * * *" },
  async ({ step, event, logger }) => {
    const now = new Date();

    // get latest war IDs from ESI
    const latestWars = await getWars().then((res) => res.data);

    // filter out war IDs that are already in the database
    const existingWarIds = (
      await prisma.war.findMany({
        select: { warId: true },
        where: {
          warId: {
            in: latestWars,
          },
        },
      })
    ).map((war) => war.warId);

    // compute war IDs that are not in the database
    const missingWarIds = latestWars.filter(
      (warId) => !existingWarIds.includes(warId),
    );

    // compute war IDs that are already in the database, but may need to be updated
    const activeWars = (
      await prisma.war.findMany({
        select: { warId: true },
        where: {
          OR: [
            {
              finishedDate: { gte: now }, // Finished in the past
            },
            {
              finishedDate: { equals: null }, // Not finished yet
            },
          ],
        },
      })
    ).map((war) => war.warId);

    const warIds = [...new Set([...missingWarIds, ...activeWars])];

    const fetchRemoteEntries = async () => {
      const entries = [];
      for (let index = 0; index < warIds.length; index += 1) {
        const warId = warIds[index]!;
        const war = await getWarsWarId(warId).then((res) => res.data);
        entries.push({
          warId: warId,
          declaredDate: war.declared,
          finishedDate: war.finished ?? null,
          retracted: war.retracted ?? null,
          startedDate: war.started,
          isMutual: war.mutual,
          isOpenForAllies: war.open_for_allies,
          aggressorAllianceId: war.aggressor.alliance_id ?? null,
          aggressorCorporationId: war.aggressor.corporation_id ?? null,
          aggressorIskDestroyed: war.aggressor.isk_destroyed ?? null,
          aggressorShipsKilled: war.aggressor.ships_killed ?? null,
          defenderAllianceId: war.defender.alliance_id ?? null,
          defenderCorporationId: war.defender.corporation_id ?? null,
          defenderIskDestroyed: war.defender.isk_destroyed ?? null,
          defenderShipsKilled: war.defender.ships_killed ?? null,
          allianceAllies:
            war.allies
              ?.filter((ally) => ally.alliance_id)
              .map((ally) => ({
                allianceId: ally.alliance_id!,
              })) ?? [],
          corporationAllies:
            war.allies
              ?.filter((ally) => ally.corporation_id)
              .map((ally) => ({
                corporationId: ally.corporation_id!,
              })) ?? [],
        });
        if (index < warIds.length - 1) {
          await delay(500);
        }
      }
      return entries;
    };

    const remoteEntries = await fetchRemoteEntries();

    await createCorpAndItsRefRecords({
      missingWarIds: new Set(remoteEntries.map((war) => war.warId)),
    });

    console.log({ remoteEntries });
    logger.info({ remoteEntries });

    for (const entry of remoteEntries) {
      prisma.war.upsert({
        where: { warId: entry.warId },
        update: {
          ...entry,
          allianceAllies: {
            create: entry.allianceAllies,
          },
          corporationAllies: {
            create: entry.corporationAllies,
          },
          updatedAt: now,
        },
        create: {
          ...entry,
          allianceAllies: {
            create: entry.allianceAllies,
          },
          corporationAllies: {
            create: entry.corporationAllies,
          },
          updatedAt: now,
        },
      });
    }

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
                in: warIds,
              },
            },
          })
          .then((entries) =>
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () => {
        const entries = [];
        for (let index = 0; index < warIds.length; index += 1) {
          const warId = warIds[index]!;
          const war = await getWarsWarId(warId).then((res) => res.data);
          entries.push({
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
          });
          if (index < warIds.length - 1) {
            await delay(500);
          }
        }
        return entries;
      },
      batchCreate: (entries) =>
        prisma.war.createMany({
          data: entries,
        }),
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
      batchUpdate: async (entries) => {
        for (const entry of entries) {
          await prisma.war.update({
            data: entry,
            where: { warId: entry.warId },
          });
        }
      },
      idAccessor: (e) => e.warId,
    });

    await step.sendEvent("Function Finished", {
      name: "scrape/esi/wars.finished",
      data: {},
    });

    return {
      stats: {
        wars: warChanges,
      },
      warIds,
    };
  },
);
