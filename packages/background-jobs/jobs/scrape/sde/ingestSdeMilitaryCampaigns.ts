import type { Prisma } from "../../../db";
import type { ContributionParameter } from "./militaryCampaignParameters";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  loadSdeFiles,
  optionalNumber,
  plainString,
} from "../../../helpers";
import { flattenContributionParameters } from "./militaryCampaignParameters";

export interface IngestSdeMilitaryCampaignsEventPayload {
  data: Record<string, never>;
}

/**
 * Both military-campaign files are keyed by UUID, so these jobs build rows by
 * hand and use ingestSdeCompositeTable — ingestSdeTable coerces the map key with
 * `Number()` and only supports integer primary keys.
 */

/** Annotation values are either a plain string or a localized object. */
const annotationValue = (value: unknown): string | null =>
  plainString(value) ?? enString(value) ?? null;

/** Build the flat MilitaryCampaignObjective row for one SDE record. */
function toObjectiveRow(
  militaryCampaignObjectiveId: string,
  militaryCampaignId: string,
  record: Record<string, unknown>,
): Prisma.MilitaryCampaignObjectiveCreateManyInput {
  const issuer = (record.issuer ?? {}) as Record<string, unknown>;
  const rewards = (record.rewards ?? {}) as Record<string, unknown>;
  const reward = (key: string) =>
    (rewards[key] ?? {}) as Record<string, unknown>;
  const issuerOf = (r: Record<string, unknown>) =>
    optionalNumber(((r.issuer ?? {}) as Record<string, unknown>).corporationID);
  const isk = reward("isk");
  const lp = reward("lp");
  const standing = reward("standing");
  const annotations = (record.annotations ?? {}) as Record<string, unknown>;
  const method = (record.contributionMethodConfiguration ?? {}) as Record<
    string,
    unknown
  >;

  return {
    militaryCampaignObjectiveId,
    title: enString(record.title) ?? "",
    subtitle: enString(record.subtitle),
    militaryCampaignId,
    careerPath: plainString(record.careerPath),
    targetProgress: optionalNumber(record.targetProgress),
    maxProgressPerParticipant: optionalNumber(record.maxProgressPerParticipant),
    presentingCharacterId: optionalNumber(record.presentingCharacterID),
    issuerCorporationId: optionalNumber(issuer.corporationID),
    iskAmountPerInterval: optionalNumber(isk.amountPerInterval),
    iskProgressInterval: optionalNumber(isk.progressInterval),
    iskIssuerCorporationId: issuerOf(isk),
    lpAmountPerInterval: optionalNumber(lp.amountPerInterval),
    lpProgressInterval: optionalNumber(lp.progressInterval),
    lpIssuerCorporationId: issuerOf(lp),
    standingGainPercentPerInterval: optionalNumber(
      standing.gainPercentPerInterval,
    ),
    standingProgressInterval: optionalNumber(standing.progressInterval),
    standingIssuerCorporationId: issuerOf(standing),
    requiredEnlistmentWithFactionId: optionalNumber(
      annotations.requiredEnlistmentWithFactionID,
    ),
    restrictionTooltip: enString(annotations.restrictionTooltip),
    warning1: enString(annotations.warning1),
    warning2: enString(annotations.warning2),
    contributionMethodName: plainString(method.name),
    isDeleted: false,
  };
}

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
      const issuer = (record.issuer ?? {}) as Record<string, unknown>;
      campaigns.push({
        militaryCampaignId,
        title: enString(record.title) ?? "",
        subtitle: enString(record.subtitle),
        targetProgress: optionalNumber(record.targetProgress),
        issuerFactionId: optionalNumber(issuer.factionID),
        isDeleted: false,
      });
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
    const files = await loadSdeFiles([
      "militaryCampaignObjectives.yaml",
      "militaryCampaigns.yaml",
    ]);
    const data = files["militaryCampaignObjectives.yaml"];
    const campaignIds = new Set(Object.keys(files["militaryCampaigns.yaml"]));

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
