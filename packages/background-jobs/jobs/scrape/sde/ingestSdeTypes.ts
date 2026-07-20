import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  loadSdeFiles,
  optionalNumber,
  requiredBoolean,
  requiredNumber,
} from "../../../helpers";

export interface IngestSdeTypesEventPayload {
  data: Record<string, never>;
}

export const ingestSdeTypes = defineJob<IngestSdeTypesEventPayload["data"]>({
  id: "ingest-sde-types",
  name: "Ingest SDE Types",
  description: "Download the SDE and ingest types.yaml into the Type table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 3600,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles([
      "types.yaml",
      "graphics.yaml",
      "icons.yaml",
      "marketGroups.yaml",
    ]);
    // The SDE has dangling type references (e.g. ~85 type graphicIDs are absent
    // from graphics.yaml), so drop any optional FK ref that isn't really there.
    const graphicIds = new Set(Object.keys(files["graphics.yaml"]).map(Number));
    const iconIds = new Set(Object.keys(files["icons.yaml"]).map(Number));
    const marketGroupIds = new Set(
      Object.keys(files["marketGroups.yaml"]).map(Number),
    );
    const present = (ids: Set<number>, value: number | null) =>
      value != null && ids.has(value) ? value : null;

    // `packagedVolume` is intentionally not set here — it is sourced from ESI,
    // so the diff leaves it untouched (see ingestSdeTable).
    const types = await ingestSdeTable({
      filename: "types.yaml",
      records: files["types.yaml"],
      idField: "typeId",
      delegate: prisma.type,
      toRow: (record, id): Prisma.TypeCreateManyInput => ({
        typeId: id,
        name: enString(record.name) ?? "",
        description: enString(record.description) ?? "",
        groupId: requiredNumber(record.groupID),
        published: requiredBoolean(record.published),
        capacity: optionalNumber(record.capacity),
        mass: optionalNumber(record.mass),
        volume: optionalNumber(record.volume),
        radius: optionalNumber(record.radius),
        portionSize: optionalNumber(record.portionSize),
        graphicId: present(graphicIds, optionalNumber(record.graphicID)),
        iconId: present(iconIds, optionalNumber(record.iconID)),
        marketGroupId: present(
          marketGroupIds,
          optionalNumber(record.marketGroupID),
        ),
        isDeleted: false,
      }),
    });
    return { stats: { types }, elapsed: performance.now() - start };
  },
});
