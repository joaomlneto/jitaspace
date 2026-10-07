import { getIncursions } from "@jitaspace/esi-client";

import type { IncursionEventDraft } from "../../../helpers/planIncursionUpdates.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  isObservedFromStart,
  planIncursionUpdates,
  RESUME_WINDOW_MS,
  toIncursionSnapshot,
} from "../../../helpers/planIncursionUpdates.ts";

/** A hung ESI request fails fast, so a retry runs before the next poll. */
const ESI_TIMEOUT_MS = 30_000;

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
    const esiIncursions = (
      await getIncursions(undefined, {
        signal: AbortSignal.timeout(ESI_TIMEOUT_MS),
      })
    ).data.map(toIncursionSnapshot);
    const now = new Date();

    const result = await prisma.$transaction(
      async (tx) => {
        // One query at a time: a transaction holds a single connection.
        const trackedRows = await tx.incursion.findMany({
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
        });
        // The previous poll that listed anything. After a gap (or on the
        // first poll ever) a new incursion may have spawned unseen, so its
        // `firstSeenAt` is not its start.
        const previousPoll = await tx.incursion.aggregate({
          _max: { lastSeenAt: true },
          where: { source: "esi" },
        });
        const observedFromStart = isObservedFromStart(
          previousPoll._max.lastSeenAt,
          now,
        );

        // The columns only an imported incursion leaves null are always set
        // on ours; one that is not cannot be matched, so say so.
        const complete = trackedRows.filter(
          (
            row,
          ): row is typeof row & {
            stagingSolarSystemId: number;
            influence: number;
            hasBoss: boolean;
          } =>
            row.stagingSolarSystemId !== null &&
            row.influence !== null &&
            row.hasBoss !== null,
        );
        if (complete.length < trackedRows.length) {
          ctx.logger.warn("Skipped incursions missing ESI's fields", {
            incursionIds: trackedRows
              .map((row) => row.incursionId)
              .filter((id) => !complete.some((row) => row.incursionId === id)),
          });
        }

        const plan = planIncursionUpdates({
          esiIncursions,
          tracked: complete.map(({ infestedSolarSystems, ...row }) => ({
            ...row,
            infestedSolarSystemIds: infestedSolarSystems
              .map((system) => system.solarSystemId)
              .sort((a, b) => a - b),
          })),
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

        // The writes below run one at a time on purpose: the transaction holds
        // a single connection, and concurrent queries on it are what pg
        // deprecates. A poll touches about five incursions.
        for (const { snapshot, stateTimestamps, events } of plan.created) {
          const { infestedSolarSystemIds, ...columns } = snapshot;
          const data = {
            ...columns,
            ...stateTimestamps,
            stagingSovereigntyAllianceId:
              stagingSovereignty.get(columns.stagingSolarSystemId)
                ?.allianceId ?? null,
            stagingSovereigntyFactionId:
              stagingSovereignty.get(columns.stagingSolarSystemId)?.factionId ??
              null,
            firstSeenAt: now,
            lastSeenAt: now,
            isObservedFromStart: observedFromStart,
            infestedSolarSystems: {
              create: infestedSolarSystemIds.map((solarSystemId) => ({
                solarSystemId,
              })),
            },
            events: { create: toEventRows(events) },
          };
          await tx.incursion.create({ data }); // NOSONAR: one at a time, see above
        }

        // Unchanged incursions only need to be marked as still listed.
        const isUnchanged = (match: (typeof plan.matched)[number]) =>
          match.events.length === 0 && !match.typeChanged;
        const unchangedIds = plan.matched
          .filter(isUnchanged)
          .map((match) => match.incursionId);
        if (unchangedIds.length > 0) {
          await tx.incursion.updateMany({
            where: { incursionId: { in: unchangedIds } },
            data: { lastSeenAt: now },
          });
        }

        for (const match of plan.matched) {
          if (isUnchanged(match)) continue;
          const { infestedSolarSystemIds: _, ...columns } = match.snapshot;
          const data = {
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
          };
          const where = { incursionId: match.incursionId };
          await tx.incursion.update({ where, data }); // NOSONAR: one at a time, see above
        }

        for (const { incursionId, events } of plan.ended) {
          const data = {
            endedAt: now,
            events: { create: toEventRows(events) },
          };
          await tx.incursion.update({ where: { incursionId }, data }); // NOSONAR: one at a time, see above
        }

        return plan;
      },
      // Prisma's 5s default is tight for a remote database: a run with
      // several changes makes a few dozen round trips.
      { maxWait: 10_000, timeout: 30_000 },
    );

    if (result.emptyResponseIgnored) {
      ctx.logger.warn(
        "ESI listed no incursions while some are active; ignored it as a failed response",
      );
    }
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
