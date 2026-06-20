import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeTable,
  optionalBoolean,
  optionalNumber,
  plainString,
} from "../../../helpers";

export interface IngestSdeDogmaEffectsEventPayload {
  data: Record<string, never>;
}

export const ingestSdeDogmaEffects = defineJob<
  IngestSdeDogmaEffectsEventPayload["data"]
>({
  id: "ingest-sde-dogma-effects",
  name: "Ingest SDE Dogma Effects",
  description:
    "Download the SDE and ingest dogmaEffects.yaml into the DogmaEffect table.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    // dogmaEffects.yaml is a `noTransform` file: the id is the map key. `name` is
    // a plain string; `description`/`displayName` are localized. The per-effect
    // `modifierInfo` array is handled by scrape-sde-dogma-effect-modifiers.
    const dogmaEffects = await ingestSdeTable({
      filename: "dogmaEffects.yaml",
      idField: "effectId",
      delegate: prisma.dogmaEffect,
      toRow: (record, id): Prisma.DogmaEffectCreateManyInput => ({
        effectId: id,
        name: plainString(record.name),
        description: enString(record.description),
        displayName: enString(record.displayName),
        disallowAutoRepeat: optionalBoolean(record.disallowAutoRepeat),
        dischargeAttributeId: optionalNumber(record.dischargeAttributeID),
        durationAttributeId: optionalNumber(record.durationAttributeID),
        effectCategoryId: optionalNumber(record.effectCategoryID),
        electronicChance: optionalBoolean(record.electronicChance),
        falloffAttributeId: optionalNumber(record.falloffAttributeID),
        iconId: optionalNumber(record.iconID),
        isAssistance: optionalBoolean(record.isAssistance),
        isOffensive: optionalBoolean(record.isOffensive),
        isWarpSafe: optionalBoolean(record.isWarpSafe),
        published: optionalBoolean(record.published),
        rangeAttributeId: optionalNumber(record.rangeAttributeID),
        rangeChance: optionalBoolean(record.rangeChance),
        trackingSpeedAttributeId: optionalNumber(
          record.trackingSpeedAttributeID,
        ),
        isDeleted: false,
      }),
    });
    return { stats: { dogmaEffects }, elapsed: performance.now() - start };
  },
});
