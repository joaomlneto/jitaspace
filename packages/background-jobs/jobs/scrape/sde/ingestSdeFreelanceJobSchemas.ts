import type { Prisma } from "../../../db";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  enString,
  ingestSdeCompositeTable,
  loadSdeFiles,
  optionalBoolean,
  optionalNumber,
  plainString,
  subRecord,
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
  maxContributionsPerParticipant?: unknown;
  contributionMultiplier?: unknown;
  maxProgressPerContribution?: unknown;
  parameters?: Record<string, Record<string, unknown>>;
}

/**
 * The body of one `parameters.<key>.<kind>` entry. Which fields are present
 * depends on the kind, so every one is optional and the columns a kind does not
 * use stay null.
 */
interface FreelanceJobParameterBody {
  // Shared by all three kinds (`unsetDescription` only by matcher).
  title?: unknown;
  description?: unknown;
  unsetDescription?: unknown;
  iconID?: string;
  // matcher
  acceptedValueTypes?: string[];
  type?: string;
  maxEntries?: number;
  optional?: boolean;
  // boolean
  choiceLabel?: unknown;
  optionTrue?: unknown;
  optionFalse?: unknown;
  default?: boolean;
  // itemDelivery
  deliveryLocation?: unknown;
  inventoryType?: unknown;
}

const PARAMETER_KINDS = ["matcher", "boolean", "itemDelivery"] as const;
type ParameterKind = (typeof PARAMETER_KINDS)[number];
const isParameterKind = (name: string): name is ParameterKind =>
  (PARAMETER_KINDS as readonly string[]).includes(name);

/**
 * freelanceJobSchemas.yaml is keyed by a group id; each group maps job-schema
 * names to their definition (the group id is also injected as a field by the
 * loader, so it is skipped). This feeds FreelanceJobSchema (the descriptive
 * fields plus the contribution-tuning labels), FreelanceJobSchemaTag (the
 * `contentTags`), FreelanceJobSchemaParameter (the fields a job poster fills
 * in) and FreelanceJobSchemaParameterValueType (what a matcher parameter
 * accepts).
 *
 * Each `parameters.<key>` holds exactly one kind key — matcher, boolean or
 * itemDelivery — whose body carries a different set of fields. An unrecognised
 * kind is skipped rather than failing the run, the same way `ingestSdeIndustry`
 * treats a new activity/bucket key.
 */
export const ingestSdeFreelanceJobSchemas = defineJob<
  IngestSdeFreelanceJobSchemasEventPayload["data"]
>({
  id: "ingest-sde-freelance-job-schemas",
  name: "Ingest SDE Freelance Job Schemas",
  description:
    "Download the SDE and ingest freelanceJobSchemas.yaml into the FreelanceJobSchema, FreelanceJobSchemaTag, FreelanceJobSchemaParameter and FreelanceJobSchemaParameterValueType tables.",
  trigger: { type: "event" },
  singleton: true,
  maxDurationSeconds: 1800,
  handler: async () => {
    const start = performance.now();
    const files = await loadSdeFiles(["freelanceJobSchemas.yaml"]);
    const data = files["freelanceJobSchemas.yaml"];

    const schemas: Prisma.FreelanceJobSchemaCreateManyInput[] = [];
    const tags: Prisma.FreelanceJobSchemaTagCreateManyInput[] = [];
    const parameters: Prisma.FreelanceJobSchemaParameterCreateManyInput[] = [];
    const valueTypes: Prisma.FreelanceJobSchemaParameterValueTypeCreateManyInput[] =
      [];
    for (const [groupKey, group] of Object.entries(data)) {
      const freelanceJobSchemaGroupId = Number(groupKey);
      for (const [name, body] of Object.entries(
        group as Record<string, unknown>,
      )) {
        // The loader injects the group id as a sibling field; skip it.
        if (name === "freelanceJobSchemaGroupID") continue;
        const schema = body as FreelanceJobSchemaBody;
        const maxContributions = subRecord(
          schema.maxContributionsPerParticipant,
        );
        const multiplier = subRecord(schema.contributionMultiplier);
        const maxProgress = subRecord(schema.maxProgressPerContribution);
        schemas.push({
          freelanceJobSchemaGroupId,
          name,
          title: enString(schema.title),
          description: enString(schema.description),
          iconId: plainString(schema.iconID),
          progressDescription: enString(schema.progressDescription),
          rewardDescription: enString(schema.rewardDescription),
          targetDescription: enString(schema.targetDescription),
          maxContributionsTitle: enString(maxContributions.title),
          maxContributionsDescription: enString(maxContributions.description),
          maxContributionsUnsetDescription: enString(
            maxContributions.unsetDescription,
          ),
          maxContributionsIconId: plainString(maxContributions.iconID),
          // Both are labelled descriptors in the SDE, not scalars, and both
          // appear on the ShipInsurance schema only. The multiplier carries a
          // default plus min/max bounds; maxProgressPerContribution carries no
          // number at all, which is why it has labels here and no Float column.
          contributionMultiplier: optionalNumber(multiplier.defaultValue),
          contributionMultiplierMin: optionalNumber(multiplier.minValue),
          contributionMultiplierMax: optionalNumber(multiplier.maxValue),
          contributionMultiplierTitle: enString(multiplier.title),
          contributionMultiplierDescription: enString(multiplier.description),
          contributionMultiplierUnsetDescription: enString(
            multiplier.unsetDescription,
          ),
          contributionMultiplierIconId: plainString(multiplier.iconID),
          maxProgressTitle: enString(maxProgress.title),
          maxProgressDescription: enString(maxProgress.description),
          maxProgressUnsetDescription: enString(maxProgress.unsetDescription),
          maxProgressIconId: plainString(maxProgress.iconID),
          isDeleted: false,
        });
        for (const tag of schema.contentTags ?? []) {
          tags.push({ freelanceJobSchemaGroupId, name, tag, isDeleted: false });
        }
        for (const [paramKey, param] of Object.entries(
          schema.parameters ?? {},
        )) {
          for (const [kind, rawBody] of Object.entries(param)) {
            if (!isParameterKind(kind)) continue;
            const paramBody = rawBody as FreelanceJobParameterBody;
            const booleanDefault = optionalBoolean(paramBody.default);
            parameters.push({
              freelanceJobSchemaGroupId,
              name,
              paramKey,
              kind,
              title: enString(paramBody.title),
              description: enString(paramBody.description),
              unsetDescription: enString(paramBody.unsetDescription),
              iconId: plainString(paramBody.iconID),
              // matcher
              type: plainString(paramBody.type),
              maxEntries: optionalNumber(paramBody.maxEntries),
              optional: optionalBoolean(paramBody.optional),
              // boolean. `optionTrue`/`optionFalse` are `{ title, description }`
              // pairs, so the columns carry the option's English title.
              choiceLabel: enString(paramBody.choiceLabel),
              optionTrue: enString(subRecord(paramBody.optionTrue).title),
              optionFalse: enString(subRecord(paramBody.optionFalse).title),
              defaultValue:
                booleanDefault === null ? null : String(booleanDefault),
              // itemDelivery. Both are nested matcher-shaped sub-parameters, so
              // the columns carry their English titles ("Destination", "Item
              // Type or Group"); their own acceptedValueTypes have no column.
              deliveryLocation: enString(
                subRecord(paramBody.deliveryLocation).title,
              ),
              inventoryType: enString(subRecord(paramBody.inventoryType).title),
              isDeleted: false,
            });
            for (const valueType of paramBody.acceptedValueTypes ?? []) {
              valueTypes.push({
                freelanceJobSchemaGroupId,
                name,
                paramKey,
                valueType,
                isDeleted: false,
              });
            }
          }
        }
      }
    }

    const scopeIds = Object.keys(data).map(Number);

    // FK order: FreelanceJobSchema, then its tags and parameters, then the
    // parameters' accepted value types.
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
    const freelanceJobSchemaParameters = await ingestSdeCompositeTable({
      delegate: prisma.freelanceJobSchemaParameter,
      rows: parameters,
      keyFields: ["freelanceJobSchemaGroupId", "name", "paramKey"],
      scopeField: "freelanceJobSchemaGroupId",
      scopeIds,
    });
    const freelanceJobSchemaParameterValueTypes = await ingestSdeCompositeTable(
      {
        delegate: prisma.freelanceJobSchemaParameterValueType,
        rows: valueTypes,
        keyFields: [
          "freelanceJobSchemaGroupId",
          "name",
          "paramKey",
          "valueType",
        ],
        scopeField: "freelanceJobSchemaGroupId",
        scopeIds,
      },
    );

    return {
      stats: {
        freelanceJobSchemas,
        freelanceJobSchemaTags,
        freelanceJobSchemaParameters,
        freelanceJobSchemaParameterValueTypes,
      },
      elapsed: performance.now() - start,
    };
  },
});
