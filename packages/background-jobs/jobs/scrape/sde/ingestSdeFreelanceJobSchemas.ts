import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  loadSdeFiles,
  plainString,
} from "../../../helpers";

export interface IngestSdeFreelanceJobSchemasEventPayload {
  data: Record<string, never>;
}

interface FreelanceJobSchemaBody {
  title?: unknown;
  description?: unknown;
  iconID?: string;
  progressDescription?: unknown;
  rewardDescription?: unknown;
  targetDescription?: unknown;
  contentTags?: string[];
}

/**
 * freelanceJobSchemas.yaml is keyed by a group id; each group maps job-schema
 * names to their definition (the group id is also injected as a field by the
 * loader, so it is skipped). This feeds FreelanceJobSchema (the descriptive
 * fields) and FreelanceJobSchemaTag (the `contentTags`). The deep
 * `parameters` / contribution-tuning config is not modelled.
 */
export const ingestSdeFreelanceJobSchemas = defineJob<
  IngestSdeFreelanceJobSchemasEventPayload["data"]
>({
  id: "ingest-sde-freelance-job-schemas",
  name: "Ingest SDE Freelance Job Schemas",
  description:
    "Download the SDE and ingest freelanceJobSchemas.yaml into the FreelanceJobSchema and FreelanceJobSchemaTag tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["freelanceJobSchemas.yaml"]);
    const data = files["freelanceJobSchemas.yaml"];

    const schemas: Prisma.FreelanceJobSchemaCreateManyInput[] = [];
    const tags: Prisma.FreelanceJobSchemaTagCreateManyInput[] = [];
    for (const [groupKey, group] of Object.entries(data)) {
      const freelanceJobSchemaGroupId = Number(groupKey);
      for (const [name, body] of Object.entries(
        group as Record<string, unknown>,
      )) {
        // The loader injects the group id as a sibling field; skip it.
        if (name === "freelanceJobSchemaGroupID") continue;
        const schema = body as FreelanceJobSchemaBody;
        schemas.push({
          freelanceJobSchemaGroupId,
          name,
          title: enString(schema.title),
          description: enString(schema.description),
          iconId: plainString(schema.iconID),
          progressDescription: enString(schema.progressDescription),
          rewardDescription: enString(schema.rewardDescription),
          targetDescription: enString(schema.targetDescription),
          isDeleted: false,
        });
        for (const tag of schema.contentTags ?? []) {
          tags.push({ freelanceJobSchemaGroupId, name, tag, isDeleted: false });
        }
      }
    }

    const scopeIds = Object.keys(data).map(Number);

    // FK order: FreelanceJobSchema before its tags.
    const freelanceJobSchemas = await ingestSdeCompositeTable({
      delegate: prisma.freelanceJobSchema,
      rows: schemas,
      keyFields: ["freelanceJobSchemaGroupId", "name"],
      scopeField: "freelanceJobSchemaGroupId",
      scopeIds,
    });
    const freelanceJobSchemaTags = await ingestSdeCompositeTable({
      delegate: prisma.freelanceJobSchemaTag,
      rows: tags,
      keyFields: ["freelanceJobSchemaGroupId", "name", "tag"],
      scopeField: "freelanceJobSchemaGroupId",
      scopeIds,
    });

    return {
      stats: { freelanceJobSchemas, freelanceJobSchemaTags },
      elapsed: performance.now() - start,
    };
  },
});
