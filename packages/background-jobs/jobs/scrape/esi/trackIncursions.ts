import { getIncursions } from "@jitaspace/esi-client";

import type { IncursionEventDraft } from "../../../helpers/planIncursionUpdates.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  planIncursionUpdates,
  RESUME_WINDOW_MS,
  toIncursionSnapshot,
} from "../../../helpers/planIncursionUpdates.ts";

export interface TrackIncursionsEventPayload {
  data: Record<string, never>;
}

export const trackIncursions = defineJob<TrackIncursionsEventPayload["data"]>({
  id: "esi-track-incursions",
  name: "Track incursions from ESI",
  // ESI caches GET /incursions for 300s, so polling more often sees nothing
  // new. One request per run against the incursion group's 150 per 15 minutes.
  trigger: { type: "cron", cron: "TZ=UTC */5 * * * *" },
  singleton: true,
  // The run is one transaction, so a retry starts clean. Retrying covers an
  // ESI blip or a CockroachDB serialization restart without a 5-minute gap.
  retries: 2,
  description:
    "Poll ESI's active incursions, record what changed since the last poll, and keep ended incursions as history",
  handler: async (ctx) => {
    const esiIncursions = (await getIncursions()).data.map(toIncursionSnapshot);
    const now = new Date();

    const result = await prisma.$transaction(
      async (tx) => {
        const [trackedRows, everTracked] = await Promise.all([
          tx.incursion.findMany({
            include: {
              infestedSolarSystems: { select: { solarSystemId: true } },
            },
            // Only ours: imported incursions all ended years ago.
            where: {
              source: "esi",
              OR: [
                { endedAt: null },
                {
                  endedAt: { gte: new Date(now.getTime() - RESUME_WINDOW_MS) },
                },
              ],
            },
          }),
          tx.incursion.count({ where: { source: "esi" } }),
        ]);
        // On the very first run every incursion is already under way, so its
        // `firstSeenAt` is when tracking began, not when it spawned.
        const isObservedFromStart = everTracked > 0;

        const plan = planIncursionUpdates({
          esiIncursions,
          // The columns only an imported incursion leaves null are always
          // set on ours.
          tracked: trackedRows.flatMap(({ infestedSolarSystems, ...row }) =>
            row.stagingSolarSystemId === null ||
            row.influence === null ||
            row.hasBoss === null
              ? []
              : [
                  {
                    ...row,
                    stagingSolarSystemId: row.stagingSolarSystemId,
                    influence: row.influence,
                    hasBoss: row.hasBoss,
                    infestedSolarSystemIds: infestedSolarSystems
                      .map((system) => system.solarSystemId)
                      .sort((a, b) => a - b),
                  },
                ],
          ),
          now,
        });

        const toEventRows = (events: IncursionEventDraft[]) =>
          events.map((event) => ({ ...event, observedAt: now }));

        // Who holds each new incursion's staging system now, kept with it so
        // its history does not change when the sovereignty does.
        const stagingSovereignty = new Map(
          (plan.created.length === 0
            ? []
            : await tx.solarSystemSovereignty.findMany({
                select: {
                  solarSystemId: true,
                  allianceId: true,
                  factionId: true,
                },
                where: {
                  solarSystemId: {
                    in: plan.created.map(
                      (c) => c.snapshot.stagingSolarSystemId,
                    ),
                  },
                },
              })
          ).map((row) => [row.solarSystemId, row]),
        );

        for (const { snapshot, stateTimestamps, events } of plan.created) {
          const { infestedSolarSystemIds, ...columns } = snapshot;
          await tx.incursion.create({
            data: {
              ...columns,
              ...stateTimestamps,
              stagingSovereigntyAllianceId:
                stagingSovereignty.get(columns.stagingSolarSystemId)
                  ?.allianceId ?? null,
              stagingSovereigntyFactionId:
                stagingSovereignty.get(columns.stagingSolarSystemId)
                  ?.factionId ?? null,
              firstSeenAt: now,
              lastSeenAt: now,
              isObservedFromStart,
              infestedSolarSystems: {
                create: infestedSolarSystemIds.map((solarSystemId) => ({
                  solarSystemId,
                })),
              },
              events: { create: toEventRows(events) },
            },
          });
        }

        // Unchanged incursions only need to be marked as still listed.
        const unchangedIds = plan.matched
          .filter((match) => match.events.length === 0)
          .map((match) => match.incursionId);
        if (unchangedIds.length > 0) {
          await tx.incursion.updateMany({
            where: { incursionId: { in: unchangedIds } },
            data: { lastSeenAt: now },
          });
        }

        for (const match of plan.matched) {
          if (match.events.length === 0) continue;
          const { infestedSolarSystemIds: _, ...columns } = match.snapshot;
          await tx.incursion.update({
            where: { incursionId: match.incursionId },
            data: {
              ...columns,
              ...match.stateTimestamps,
              lastSeenAt: now,
              ...(match.resumed ? { endedAt: null } : {}),
              infestedSolarSystems: {
                create: match.addedSolarSystemIds.map((solarSystemId) => ({
                  solarSystemId,
                })),
                deleteMany: {
                  solarSystemId: { in: match.removedSolarSystemIds },
                },
              },
              events: { create: toEventRows(match.events) },
            },
          });
        }

        for (const { incursionId, events } of plan.ended) {
          await tx.incursion.update({
            where: { incursionId },
            data: {
              endedAt: now,
              events: { create: toEventRows(events) },
            },
          });
        }

        return plan;
      },
      // Prisma's 5s default is tight for a remote database: a run with
      // several changes makes a few dozen round trips.
      { maxWait: 10_000, timeout: 30_000 },
    );

    if (result.duplicates.length > 0) {
      ctx.logger.warn("ESI listed a constellation twice; kept the first", {
        duplicates: result.duplicates,
      });
    }

    const changed = result.matched.filter((m) => m.events.length > 0);
    return {
      stats: {
        active: esiIncursions.length - result.duplicates.length,
        appeared: result.created.length,
        changed: changed.length,
        resumed: result.matched.filter((m) => m.resumed).length,
        ended: result.ended.length,
        events:
          result.created.length +
          changed.reduce((sum, m) => sum + m.events.length, 0) +
          result.ended.length,
      },
    };
  },
});
