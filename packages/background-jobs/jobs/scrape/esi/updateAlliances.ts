import pLimit from "p-limit";

import {
  getAlliances,
  getAlliancesAllianceId,
  getAlliancesAllianceIdCorporations,
} from "@jitaspace/esi-client";

import type { AllianceRow } from "../../../helpers/planAllianceUpdates.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { planAllianceUpdates } from "../../../helpers/planAllianceUpdates.ts";

// Neither /alliances/{id} nor /alliances/{id}/corporations is in an ESI
// rate-limit group, so only the error limit applies. 20 in flight fetched all
// ~3,650 alliances (both endpoints) in ~20s with no errors (2026-10-05).
const ESI_CONCURRENCY = 20;

// The reference helper fetches corporations (and their CEOs) one at a time, so
// a first run against a stale table could otherwise blow the run's time budget.
// Whatever is left over is picked up by the next hourly run.
const MAX_NEW_CORPORATIONS_PER_RUN = 250;

export interface UpdateAlliancesEventPayload {
  data: Record<string, never>;
}

export const updateAlliances = defineJob<UpdateAlliancesEventPayload["data"]>({
  id: "esi-update-alliances",
  name: "Update alliances from ESI",
  trigger: { type: "cron", cron: "TZ=UTC 45 * * * *" },
  singleton: true,
  retries: 0,
  description:
    "Refresh every open alliance and its member corporations from ESI, and mark closed alliances",
  handler: async (ctx) => {
    const startedAt = performance.now();
    const limit = pLimit(ESI_CONCURRENCY);

    // ESI only lists open alliances, so closed ones are never fetched.
    const allianceIds = await getAlliances().then((res) => res.data);

    const esiAlliances: AllianceRow[] = await Promise.all(
      allianceIds.map((allianceId) =>
        limit(async () => {
          const { data } = await getAlliancesAllianceId(allianceId);
          return {
            allianceId,
            creatorCorporationId: data.creator_corporation_id,
            dateFounded: new Date(data.date_founded),
            executorCorporationId: data.executor_corporation_id ?? null,
            factionId: data.faction_id ?? null,
            name: data.name,
            ticker: data.ticker,
            isDeleted: false,
          };
        }),
      ),
    );

    const esiMemberCorporations = new Map<number, number[]>(
      await Promise.all(
        allianceIds.map((allianceId) =>
          limit(async () => {
            const { data } =
              await getAlliancesAllianceIdCorporations(allianceId);
            return [allianceId, data] as const;
          }),
        ),
      ),
    );
    const esiElapsedMs = performance.now() - startedAt;

    const memberCorporationIds = [...esiMemberCorporations.values()].flat();
    const [dbAlliances, dbCorporations] = await Promise.all([
      prisma.alliance.findMany({
        select: {
          allianceId: true,
          creatorCorporationId: true,
          dateFounded: true,
          executorCorporationId: true,
          factionId: true,
          name: true,
          ticker: true,
          isDeleted: true,
        },
      }),
      prisma.corporation.findMany({
        select: { corporationId: true, allianceId: true },
        where: {
          OR: [
            { allianceId: { not: null } },
            { corporationId: { in: memberCorporationIds } },
          ],
        },
      }),
    ]);

    const plan = planAllianceUpdates({
      esiAlliances,
      esiMemberCorporations,
      dbAlliances,
      dbCorporations,
    });

    // 1. New alliances, plus the corporations they and their members need.
    const corporationsToCreate = plan.missingCorporationIds.slice(
      0,
      MAX_NEW_CORPORATIONS_PER_RUN,
    );
    if (plan.newAlliances.length > 0 || corporationsToCreate.length > 0) {
      await createCorpAndItsRefRecords({
        alliances: plan.newAlliances,
        missingCorporationIds: new Set(corporationsToCreate),
      });
    }

    // 2. Alliances whose details changed (executor, name, ticker, faction…).
    for (const { allianceId, ...data } of plan.changedAlliances) {
      await prisma.alliance.update({ where: { allianceId }, data });
    }

    // 3. Alliances ESI no longer lists have closed.
    if (plan.closedAllianceIds.length > 0) {
      await prisma.alliance.updateMany({
        where: { allianceId: { in: plan.closedAllianceIds } },
        data: { isDeleted: true },
      });
    }

    // 4. Corporations that joined, left or switched alliances.
    let corporationsMoved = 0;
    for (const [allianceId, corporationIds] of plan.corporationMoves) {
      const { count } = await prisma.corporation.updateMany({
        where: { corporationId: { in: corporationIds } },
        data: { allianceId },
      });
      corporationsMoved += count;
    }

    const stats = {
      alliances: {
        open: allianceIds.length,
        added: plan.newAlliances.length,
        updated: plan.changedAlliances.length,
        closed: plan.closedAllianceIds.length,
      },
      corporations: {
        members: memberCorporationIds.length,
        added: corporationsToCreate.length,
        deferred:
          plan.missingCorporationIds.length - corporationsToCreate.length,
        moved: corporationsMoved,
      },
      elapsedMs: {
        esi: Math.round(esiElapsedMs),
        total: Math.round(performance.now() - startedAt),
      },
    };
    ctx.logger.info("Alliance update finished", stats);
    return { stats };
  },
});
