import type { AllianceCorporation } from "./types";

/**
 * One member corporation as the page lists it. Rows from our database carry
 * every field; a corporation ESI lists that the hourly job has not stored yet
 * carries only its id, and the table names it from ESI.
 */
export interface CorporationRow {
  corporationId: number;
  name: string | null;
  ticker: string | null;
  memberCount: number | null;
  /** The corporation's share of the alliance's pilots (0–1). */
  share: number | null;
  ceoId: number | null;
  ceoName: string | null;
  dateFounded: string | null;
  taxRate: number | null;
  warEligible: boolean | null;
  enlistedFactionId: number | null;
  homeStationId: number | null;
  homeStationName: string | null;
  url: string | null;
  isExecutor: boolean;
  isCreator: boolean;
}

export function buildCorporationRows({
  corporations,
  esiMemberIds,
  executorCorporationId,
  creatorCorporationId,
}: {
  corporations: AllianceCorporation[];
  /** ESI's member list, when it has loaded. */
  esiMemberIds: number[] | undefined;
  executorCorporationId: number | null | undefined;
  creatorCorporationId: number | null | undefined;
}): CorporationRow[] {
  const pilots = corporations.reduce(
    (sum, corporation) => sum + corporation.memberCount,
    0,
  );
  const flags = (corporationId: number) => ({
    isExecutor: corporationId === executorCorporationId,
    isCreator: corporationId === creatorCorporationId,
  });

  const rows: CorporationRow[] = corporations.map((corporation) => ({
    ...corporation,
    share: pilots > 0 ? corporation.memberCount / pilots : null,
    ...flags(corporation.corporationId),
  }));

  const stored = new Set(corporations.map((c) => c.corporationId));
  for (const corporationId of esiMemberIds ?? []) {
    if (stored.has(corporationId)) continue;
    rows.push({
      corporationId,
      name: null,
      ticker: null,
      memberCount: null,
      share: null,
      ceoId: null,
      ceoName: null,
      dateFounded: null,
      taxRate: null,
      warEligible: null,
      enlistedFactionId: null,
      homeStationId: null,
      homeStationName: null,
      url: null,
      ...flags(corporationId),
    });
  }
  return rows;
}

export interface CorporationSummary {
  corporations: number;
  pilots: number;
  averagePilots: number | null;
  largest: CorporationRow | null;
  executorShare: number | null;
  warEligible: number;
  /** Tax rate averaged over pilots, not corporations (0–1). */
  pilotWeightedTaxRate: number | null;
  oldest: CorporationRow | null;
  newest: CorporationRow | null;
  enlisted: number;
}

export function summarizeCorporations(
  rows: CorporationRow[],
): CorporationSummary {
  const known = rows.filter(
    (row): row is CorporationRow & { memberCount: number } =>
      row.memberCount !== null,
  );
  const pilots = known.reduce((sum, row) => sum + row.memberCount, 0);
  const taxed = known.filter((row) => row.taxRate !== null);
  const taxedPilots = taxed.reduce((sum, row) => sum + row.memberCount, 0);
  const founded = rows
    .filter((row): row is CorporationRow & { dateFounded: string } =>
      Boolean(row.dateFounded),
    )
    .sort((a, b) => a.dateFounded.localeCompare(b.dateFounded));
  const largest = known.reduce<(typeof known)[number] | null>(
    (best, row) =>
      best === null || row.memberCount > best.memberCount ? row : best,
    null,
  );
  const executor = rows.find((row) => row.isExecutor);

  return {
    corporations: rows.length,
    pilots,
    averagePilots: known.length > 0 ? pilots / known.length : null,
    largest,
    executorShare: executor?.share ?? null,
    warEligible: rows.filter((row) => row.warEligible === true).length,
    pilotWeightedTaxRate:
      taxedPilots > 0
        ? taxed.reduce(
            (sum, row) => sum + (row.taxRate ?? 0) * row.memberCount,
            0,
          ) / taxedPilots
        : null,
    oldest: founded[0] ?? null,
    newest: founded.at(-1) ?? null,
    enlisted: rows.filter((row) => row.enlistedFactionId !== null).length,
  };
}
