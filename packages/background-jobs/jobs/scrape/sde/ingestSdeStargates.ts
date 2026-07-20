import pLimit from "p-limit";

import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
  requiredNumber,
  solarSystemNames,
} from "../../../helpers";

export interface IngestSdeStargatesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeStargates = defineJob<
  IngestSdeStargatesEventPayload["data"]
>({
  id: "ingest-sde-stargates",
  name: "Ingest SDE Stargates",
  description:
    "Download the SDE and ingest mapStargates.yaml into the Stargate table (name = 'Stargate (<destination system>)').",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "mapSolarSystems.yaml",
      "mapStargates.yaml",
    ]);
    const systemNames = solarSystemNames(files["mapSolarSystems.yaml"]);

    // Pass 1: ingest every column EXCEPT the self-referential destinationStargateId.
    // Stargates reference each other (a gate and its destination point both ways, so
    // the graph is cyclic), and Prisma sub-batches `createMany` to respect the
    // bind-param limit — so a gate whose destination lands in a later INSERT batch
    // violates the self-FK on insert, and no insert order can satisfy a cycle.
    // Leaving `destinationStargateId` off the row keeps it out of the managed
    // column set (so it defaults to NULL on create and is never touched here); it's
    // backfilled in pass 2 once every stargate row exists.
    const stargates = await ingestSdeTable({
      filename: "mapStargates.yaml",
      records: files["mapStargates.yaml"],
      idField: "stargateId",
      delegate: prisma.stargate,
      toRow: (record, id): Prisma.StargateCreateManyInput => {
        const destination = (record.destination ?? {}) as Record<
          string,
          unknown
        >;
        const destinationSystem = systemNames.get(
          requiredNumber(destination.solarSystemID),
        );
        return {
          stargateId: id,
          name: `Stargate (${destinationSystem ?? ""})`,
          solarSystemId: requiredNumber(record.solarSystemID),
          typeId: requiredNumber(record.typeID),
          isDeleted: false,
        };
      },
    });

    // Pass 2: backfill destinationStargateId now that every stargate row exists, so
    // the self-FK is always satisfiable. Diffed against the current values so
    // re-runs are no-ops and so it coexists with `scrapeEsiStargates` (which also
    // sets this column); concurrency-bounded individual updates (each is one row).
    const desired = Object.entries(files["mapStargates.yaml"]).map(
      ([key, record]) => {
        const destination = ((record as Record<string, unknown>).destination ??
          {}) as Record<string, unknown>;
        return {
          stargateId: Number(key),
          destinationStargateId: optionalNumber(destination.stargateID),
        };
      },
    );
    const current = new Map(
      (
        await prisma.stargate.findMany({
          select: { stargateId: true, destinationStargateId: true },
        })
      ).map((row) => [row.stargateId, row.destinationStargateId]),
    );
    const toBackfill = desired.filter(
      (entry) => current.get(entry.stargateId) !== entry.destinationStargateId,
    );
    const limit = pLimit(20);
    await Promise.all(
      toBackfill.map((entry) =>
        limit(() =>
          prisma.stargate.update({
            where: { stargateId: entry.stargateId },
            data: { destinationStargateId: entry.destinationStargateId },
          }),
        ),
      ),
    );

    return {
      stats: { stargates, destinationsBackfilled: toBackfill.length },
      elapsed: performance.now() - start,
    };
  },
});
