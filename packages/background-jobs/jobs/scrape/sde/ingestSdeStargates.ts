import { defineJob } from "../../../core";
import { Prisma, prisma } from "../../../db";
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
    // sets this column).
    //
    // Written as chunked bulk UPDATEs rather than concurrent per-row updates.
    // Stargates are mutually-referencing PAIRS (A's destination is B while B's is
    // A), and PostgreSQL takes a FOR KEY SHARE lock on the FK-referenced row on
    // top of the row being written — so two concurrent single-row updates on a
    // pair each hold what the other needs and PostgreSQL aborts one with
    // "deadlock detected" (40P01). Pair members are adjacent in SDE order, so any
    // real concurrency hits this on a cold table. A single statement is one
    // transaction and cannot deadlock against itself.
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
    // 2 bind params per row, so 10k rows/statement stays far under PostgreSQL's
    // 65535-parameter wire limit (same reasoning as `ingestSdeCompositeTable`).
    const BACKFILL_CHUNK_ROWS = 10_000;
    // `@updatedAt` is applied by Prisma Client, not the database, so a raw
    // UPDATE has to set it explicitly to match the per-row update it replaces.
    const now = new Date();
    for (
      let offset = 0;
      offset < toBackfill.length;
      offset += BACKFILL_CHUNK_ROWS
    ) {
      const chunk = toBackfill.slice(offset, offset + BACKFILL_CHUNK_ROWS);
      await prisma.$executeRaw`
        UPDATE "Stargate" AS s
        SET "destinationStargateId" = v."destinationStargateId",
            "updatedAt" = ${now}
        FROM (VALUES ${Prisma.join(
          chunk.map(
            (entry) =>
              Prisma.sql`(${entry.stargateId}::int, ${entry.destinationStargateId}::int)`,
          ),
        )}) AS v("stargateId", "destinationStargateId")
        WHERE s."stargateId" = v."stargateId"`;
    }

    return {
      stats: { stargates, destinationsBackfilled: toBackfill.length },
      elapsed: performance.now() - start,
    };
  },
});
