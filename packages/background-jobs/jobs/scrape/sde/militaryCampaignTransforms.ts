import type { Prisma } from "../../../db";
// Reached directly rather than through `../../../helpers`: the field coercions
// live in a module of their own with no imports at all, while the barrel pulls
// in p-limit and the zod-checked env, which Jest cannot load without mocks.
import {
  enString,
  optionalBigInt,
  optionalNumber,
  plainString,
} from "../../../helpers/sdeFields";

/**
 * Pure transforms for militaryCampaigns.yaml and militaryCampaignObjectives.yaml.
 *
 * Kept in its own module so it stays free of runtime dependencies and is
 * directly unit-testable: everything that inspects these two files' shape lives
 * here, and the field-level bugs it now guards against were invisible to a
 * "rows created, second run equal" check.
 */

/**
 * Render one `annotations` entry as text.
 *
 * Annotation values are a plain string, a localized object, or — for
 * `mapFocusEntityID` — a bare number. Stringify any remaining primitive rather
 * than dropping it: the whole point of a key/value table is to survive CCP
 * adding keys, and returning null here silently lost `mapFocusEntityID` (a solar
 * system id in 3 of 4 campaigns and a region id in the fourth).
 */
export function annotationValue(value: unknown): string | null {
  const localized = enString(value);
  if (localized !== null) return localized;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return null;
}

/** One `contributionMethodConfiguration.parameters[]` entry. */
export interface ContributionParameter {
  key?: string;
  matcher?: { values?: { valueType?: string; values?: string[] }[] };
}

/**
 * Flatten an objective's contribution-method parameters into Parameter and
 * ParameterValue rows.
 *
 * Matcher values are keyed by ordinal (`matcherIndex`, `valueIndex`) rather than
 * by content, because a matcher entry can name a `valueType` with no `values`
 * (e.g. `{ valueType: "corporation" }`). Such an entry is emitted as a single row
 * with a null value so the `valueType` is not lost.
 */
export function flattenContributionParameters(
  militaryCampaignObjectiveId: string,
  parameters: ContributionParameter[],
): {
  parameters: Prisma.MilitaryCampaignObjectiveParameterCreateManyInput[];
  parameterValues: Prisma.MilitaryCampaignObjectiveParameterValueCreateManyInput[];
} {
  const paramRows: Prisma.MilitaryCampaignObjectiveParameterCreateManyInput[] =
    [];
  const valueRows: Prisma.MilitaryCampaignObjectiveParameterValueCreateManyInput[] =
    [];

  for (const param of parameters) {
    const paramKey = param.key;
    if (paramKey == null) continue;
    paramRows.push({
      militaryCampaignObjectiveId,
      paramKey,
      isDeleted: false,
    });
    for (const [matcherIndex, matcher] of (
      param.matcher?.values ?? []
    ).entries()) {
      const base = {
        militaryCampaignObjectiveId,
        paramKey,
        matcherIndex,
        valueType: matcher.valueType ?? "",
        isDeleted: false,
      };
      const values = matcher.values ?? [];
      if (values.length === 0) {
        valueRows.push({ ...base, valueIndex: 0, value: null });
        continue;
      }
      for (const [valueIndex, matcherValue] of values.entries()) {
        valueRows.push({ ...base, valueIndex, value: String(matcherValue) });
      }
    }
  }

  return { parameters: paramRows, parameterValues: valueRows };
}

/** `record.<key>` as a nested object, or `{}`. */
const obj = (value: unknown): Record<string, unknown> =>
  (value ?? {}) as Record<string, unknown>;

/**
 * Build the flat MilitaryCampaignObjective row for one SDE record.
 *
 * Note the asymmetry in `rewards.*.issuer`, which CCP does not document: `isk`
 * and `lp` carry `corporationID`, but `standing` carries **`factionID`** — in all
 * 94 objectives, with `corporationID` never present. Reading `corporationID` for
 * all three left the standing issuer null everywhere.
 */
export function toObjectiveRow(
  militaryCampaignObjectiveId: string,
  militaryCampaignId: string,
  record: Record<string, unknown>,
): Prisma.MilitaryCampaignObjectiveCreateManyInput {
  const rewards = obj(record.rewards);
  const isk = obj(rewards.isk);
  const lp = obj(rewards.lp);
  const standing = obj(rewards.standing);
  const annotations = obj(record.annotations);
  const method = obj(record.contributionMethodConfiguration);
  const issuerCorporationOf = (block: Record<string, unknown>) =>
    optionalNumber(obj(block.issuer).corporationID);

  return {
    militaryCampaignObjectiveId,
    title: enString(record.title) ?? "",
    subtitle: enString(record.subtitle),
    militaryCampaignId,
    careerPath: plainString(record.careerPath),
    targetProgress: optionalBigInt(record.targetProgress),
    maxProgressPerParticipant: optionalBigInt(record.maxProgressPerParticipant),
    presentingCharacterId: optionalNumber(record.presentingCharacterID),
    issuerCorporationId: optionalNumber(obj(record.issuer).corporationID),
    iskAmountPerInterval: optionalNumber(isk.amountPerInterval),
    iskProgressInterval: optionalBigInt(isk.progressInterval),
    iskIssuerCorporationId: issuerCorporationOf(isk),
    lpAmountPerInterval: optionalNumber(lp.amountPerInterval),
    lpProgressInterval: optionalBigInt(lp.progressInterval),
    lpIssuerCorporationId: issuerCorporationOf(lp),
    standingGainPercentPerInterval: optionalNumber(
      standing.gainPercentPerInterval,
    ),
    standingProgressInterval: optionalBigInt(standing.progressInterval),
    standingIssuerFactionId: optionalNumber(obj(standing.issuer).factionID),
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

/** Build the flat MilitaryCampaign row for one SDE record. */
export function toCampaignRow(
  militaryCampaignId: string,
  record: Record<string, unknown>,
): Prisma.MilitaryCampaignCreateManyInput {
  return {
    militaryCampaignId,
    title: enString(record.title) ?? "",
    subtitle: enString(record.subtitle),
    targetProgress: optionalBigInt(record.targetProgress),
    issuerFactionId: optionalNumber(obj(record.issuer).factionID),
    isDeleted: false,
  };
}
