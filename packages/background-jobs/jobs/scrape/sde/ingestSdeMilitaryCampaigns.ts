import type { Prisma } from "../../../db";
import type { ContributionParameter } from "./militaryCampaignTransforms";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  ingestSdeCompositeTable,
  loadSdeFileKeys,
  loadSdeFiles,
  plainString,
} from "../../../helpers";
import {
  annotationValue,
  flattenContributionParameters,
  toCampaignRow,
  toObjectiveRow,
} from "./militaryCampaignTransforms";

export interface IngestSdeMilitaryCampaignsEventPayload {
  data: Record<string, never>;
}

/**
 * Both military-campaign files are keyed by UUID, so these jobs build rows by
 * hand and use ingestSdeCompositeTable — ingestSdeTable coerces the map key with
 * `Number()` and only supports integer primary keys.
 *
 * Every field-level transform lives in ./militaryCampaignTransforms so it can be
 * unit-tested without mocking p-limit and the env.
 */
export const ingestSdeMilitaryCampaigns = defineJob<
  IngestSdeMilitaryCampaignsEventPayload["data"]
>({
  id: "ingest-sde-military-campaigns",
  name: "Ingest SDE Military Campaigns",
  description:
    "Download the SDE and ingest militaryCampaigns.yaml into the MilitaryCampaign and MilitaryCampaignAnnotation tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["militaryCampaigns.yaml"]);
    const data = files["militaryCampaigns.yaml"];

    const campaigns: Prisma.MilitaryCampaignCreateManyInput[] = [];
    const annotations: Prisma.MilitaryCampaignAnnotationCreateManyInput[] = [];
    for (const [militaryCampaignId, value] of Object.entries(data)) {
      const record = value as Record<string, unknown>;
      campaigns.push(toCampaignRow(militaryCampaignId, record));
      for (const [key, raw] of Object.entries(
        (record.annotations ?? {}) as Record<string, unknown>,
      )) {
        const annotation = annotationValue(raw);
        if (annotation === null) continue;
        annotations.push({
          militaryCampaignId,
          key,
          value: annotation,
          isDeleted: false,
        });
      }
    }

    const scopeIds = Object.keys(data);
    const militaryCampaigns = await ingestSdeCompositeTable({
      delegate: prisma.militaryCampaign,
      rows: campaigns,
      keyFields: ["militaryCampaignId"],
      scopeField: "militaryCampaignId",
      scopeIds,
    });
    const militaryCampaignAnnotations = await ingestSdeCompositeTable({
      delegate: prisma.militaryCampaignAnnotation,
      rows: annotations,
      keyFields: ["militaryCampaignId", "key"],
      scopeField: "militaryCampaignId",
      scopeIds,
    });

    return {
      stats: { militaryCampaigns, militaryCampaignAnnotations },
      elapsed: performance.now() - start,
    };
  },
});

/**
 * militaryCampaignObjectives.yaml — the objectives inside a campaign. `rewards`
 * and `annotations` have a small fixed key set and are flattened; `contentTags`
 * and the three-level `contributionMethodConfiguration.parameters[].matcher`
 * become child tables, the matcher values keyed by ordinal (a matcher entry can
 * carry a `valueType` with no `values`).
 *
 * Objectives FK at MilitaryCampaign, so this runs after
 * ingest-sde-military-campaigns; objectives pointing at an unknown campaign are
 * dropped.
 */
export const ingestSdeMilitaryCampaignObjectives = defineJob<
  IngestSdeMilitaryCampaignsEventPayload["data"]
>({
  id: "ingest-sde-military-campaign-objectives",
  name: "Ingest SDE Military Campaign Objectives",
  description:
    "Download the SDE and ingest militaryCampaignObjectives.yaml into the MilitaryCampaignObjective, ...Tag, ...Parameter and ...ParameterValue tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["militaryCampaignObjectives.yaml"]);
    const data = files["militaryCampaignObjectives.yaml"];
    // UUID-keyed, so the raw string keys — and only the keys, so the campaign
    // records are not held alive for this job's duration.
    const campaignIds = await loadSdeFileKeys("militaryCampaigns.yaml");

    const objectives: Prisma.MilitaryCampaignObjectiveCreateManyInput[] = [];
    const tags: Prisma.MilitaryCampaignObjectiveTagCreateManyInput[] = [];
    const parameters: Prisma.MilitaryCampaignObjectiveParameterCreateManyInput[] =
      [];
    const parameterValues: Prisma.MilitaryCampaignObjectiveParameterValueCreateManyInput[] =
      [];

    for (const [militaryCampaignObjectiveId, value] of Object.entries(data)) {
      const record = value as Record<string, unknown>;
      const militaryCampaignId = plainString(record.campaignID) ?? "";
      if (!campaignIds.has(militaryCampaignId)) continue;

      objectives.push(
        toObjectiveRow(militaryCampaignObjectiveId, militaryCampaignId, record),
      );

      for (const tag of (record.contentTags ?? []) as string[]) {
        tags.push({
          militaryCampaignObjectiveId,
          tag: String(tag),
          isDeleted: false,
        });
      }

      const method = (record.contributionMethodConfiguration ?? {}) as Record<
        string,
        unknown
      >;
      const flattened = flattenContributionParameters(
        militaryCampaignObjectiveId,
        (method.parameters ?? []) as ContributionParameter[],
      );
      parameters.push(...flattened.parameters);
      parameterValues.push(...flattened.parameterValues);
    }

    const scopeIds = objectives.map((o) => o.militaryCampaignObjectiveId);
    const militaryCampaignObjectives = await ingestSdeCompositeTable({
      delegate: prisma.militaryCampaignObjective,
      rows: objectives,
      keyFields: ["militaryCampaignObjectiveId"],
      scopeField: "militaryCampaignObjectiveId",
      scopeIds,
    });
    const objectiveTags = await ingestSdeCompositeTable({
      delegate: prisma.militaryCampaignObjectiveTag,
      rows: tags,
      keyFields: ["militaryCampaignObjectiveId", "tag"],
      scopeField: "militaryCampaignObjectiveId",
      scopeIds,
    });
    const objectiveParameters = await ingestSdeCompositeTable({
      delegate: prisma.militaryCampaignObjectiveParameter,
      rows: parameters,
      keyFields: ["militaryCampaignObjectiveId", "paramKey"],
      scopeField: "militaryCampaignObjectiveId",
      scopeIds,
    });
    const objectiveParameterValues = await ingestSdeCompositeTable({
      delegate: prisma.militaryCampaignObjectiveParameterValue,
      rows: parameterValues,
      keyFields: [
        "militaryCampaignObjectiveId",
        "paramKey",
        "matcherIndex",
        "valueIndex",
      ],
      scopeField: "militaryCampaignObjectiveId",
      scopeIds,
    });

    return {
      stats: {
        militaryCampaignObjectives,
        objectiveTags,
        objectiveParameters,
        objectiveParameterValues,
      },
      elapsed: performance.now() - start,
    };
  },
});
