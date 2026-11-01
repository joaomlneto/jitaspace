import type { CustomsOffice, EsiSubjectItem } from "@jitaspace/hooks";

export type CustomsOfficeRow = EsiSubjectItem<CustomsOffice>;

export const STANDING_LEVELS = [
  "terrible",
  "bad",
  "neutral",
  "good",
  "excellent",
] as const;
export type StandingLevel = (typeof STANDING_LEVELS)[number];

export const STANDING_LEVEL_LABELS: Record<StandingLevel, string> = {
  terrible: "Terrible",
  bad: "Bad",
  neutral: "Neutral",
  good: "Good",
  excellent: "Excellent",
};

const STANDING_TAX_FIELD = {
  terrible: "terrible_standing_tax_rate",
  bad: "bad_standing_tax_rate",
  neutral: "neutral_standing_tax_rate",
  good: "good_standing_tax_rate",
  excellent: "excellent_standing_tax_rate",
} as const satisfies Record<StandingLevel, keyof CustomsOffice>;

/** The tax charged at a standing level, if that level may use the office. */
export const standingTaxRate = (
  office: CustomsOffice,
  level: StandingLevel,
): number | undefined =>
  office.allow_access_with_standings
    ? office[STANDING_TAX_FIELD[level]]
    : undefined;

/** Who besides the owner may use the office, in words. */
export function accessSummary(office: CustomsOffice): string {
  const parts = ["Corporation"];
  if (office.allow_alliance_access) parts.push("alliance");
  if (office.allow_access_with_standings && office.standing_level) {
    parts.push(
      `${STANDING_LEVEL_LABELS[office.standing_level].toLowerCase()} standing or better`,
    );
  }
  return parts.join(", ");
}

/** The daily hour range in which a reinforced office comes out, e.g. "18:00–20:00". */
export const reinforceWindow = (office: CustomsOffice) =>
  `${String(office.reinforce_exit_start).padStart(2, "0")}:00–${String(office.reinforce_exit_end).padStart(2, "0")}:00`;

/** Headline numbers for the customs offices shown. */
export function customsOfficeTotals(rows: readonly CustomsOfficeRow[]) {
  const corporationRates = rows
    .map((row) => row.corporation_tax_rate)
    .filter((rate): rate is number => rate !== undefined);
  return {
    offices: rows.length,
    systems: new Set(rows.map((row) => row.system_id)).size,
    corporations: new Set(rows.map((row) => row.subjectId)).size,
    allianceAccess: rows.filter((row) => row.allow_alliance_access).length,
    standingAccess: rows.filter((row) => row.allow_access_with_standings)
      .length,
    averageCorporationTax:
      corporationRates.length === 0
        ? undefined
        : corporationRates.reduce((sum, rate) => sum + rate, 0) /
          corporationRates.length,
  };
}
