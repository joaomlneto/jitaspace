import { prisma, War } from "@jitaspace/db";
import { getWars, getWarsWarId } from "@jitaspace/esi-client";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

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
    singleton: {
      key: "esi-update-wars",
      mode: "skip",
    },
    retries: 0,
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
    const existingWarIdsSet = new Set(existingWarIds);
    const missingWarIds = latestWars.filter(
      (warId) => !existingWarIdsSet.has(warId),
    );

    // compute war IDs that are already in the database, but may need to be updated
    const warsToUpdate = (
      await prisma.war.findMany({
        select: { warId: true },
        where: {
          OR: [
            {
              finishedDate: { gte: now }, // Will finish in the future
            },
            {
              finishedDate: { equals: null }, // Not finished yet
            },
          ],
        },
      })
    ).map((war) => war.warId);

    await createCorpAndItsRefRecords({
      missingWarIds: new Set([...missingWarIds, ...warsToUpdate]),
    });

    for (let index = 0; index < warsToUpdate.length; index += 1) {
      const warId = warsToUpdate[index]!;
      const requestStartedAt = Date.now();
      await getWarsWarId(warId)
        .then(({ data: war }) => ({
          warId: warId,
          declaredDate: new Date(war.declared),
          finishedDate: war.finished ? new Date(war.finished) : null,
          retractedDate: war.retracted ? new Date(war.retracted) : null,
          startedDate: war.started ? new Date(war.started) : null,
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
          /*allianceAllies:
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
              })) ?? [],*/
        }))
        .then((war) =>
          prisma.war.update({
            where: { warId },
            data: war,
          }),
        );
      if (index < warsToUpdate.length - 1) {
        const elapsedMs = Date.now() - requestStartedAt;
        const remainingMs = 500 - elapsedMs;
        if (remainingMs > 0) {
          await delay(remainingMs);
        }
      }
    }

    await step.sendEvent("Function Finished", {
      name: "scrape/esi/wars.finished",
      data: {},
    });

    return {
      stats: {
        wars: {
          added: missingWarIds.length,
          updated: warsToUpdate.length,
        },
      },
      //warIds: warsToUpdate,
    };
  },
);
