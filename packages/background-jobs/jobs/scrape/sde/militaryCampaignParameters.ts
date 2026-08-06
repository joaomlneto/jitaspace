import type { Prisma } from "../../../db";

/**
 * Pure transforms for militaryCampaignObjectives.yaml's nested
 * `contributionMethodConfiguration`.
 *
 * Kept in its own module with a type-only `Prisma` import so it pulls in no
 * runtime dependencies: the ingest job's own module reaches p-limit and the
 * zod-checked env through `../../../helpers`, which Jest cannot load without
 * mocks. This keeps the matcher logic — the fiddliest part of the campaign
 * ingest — directly unit-testable.
 */

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
