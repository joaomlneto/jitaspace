import type { Prisma } from "../../../db";
// Imported from the module rather than the `helpers` barrel: sdeFields has no
// runtime dependencies of its own, so this module stays unit-testable without
// mocking p-limit or the zod-checked env (see ./missionTransforms).
import { optionalNumber, requiredNumber } from "../../../helpers/sdeFields";

/**
 * The nested collections of an `npcCorporations.yaml` record, each of which
 * becomes its own child table. Only the shapes this module reads are declared.
 */
export interface NpcCorporationRecord {
  allowedMemberRaces?: number[];
  lpOfferTables?: number[];
  divisions?: Record<
    string,
    { divisionNumber?: number; leaderID?: number; size?: number }
  >;
  investors?: Record<string, number>;
  corporationTrades?: Record<string, number>;
  exchangeRates?: Record<string, number>;
}

export interface NpcCorporationChildRows {
  allowedRaces: Prisma.NpcCorporationAllowedRaceCreateManyInput[];
  lpOfferTables: Prisma.NpcCorporationLpOfferTableCreateManyInput[];
  divisions: Prisma.NpcCorporationDivisionSlotCreateManyInput[];
  investors: Prisma.NpcCorporationInvestorCreateManyInput[];
  trades: Prisma.NpcCorporationTradeCreateManyInput[];
  exchangeRates: Prisma.NpcCorporationExchangeRateCreateManyInput[];
}

/**
 * Fan one corporation's nested collections out into child-table rows.
 *
 * `investors` and `exchangeRates` both point at *another* corporation, so each
 * is dropped unless that corporation exists in `existingCorporationIds` —
 * `npcCorporations.yaml` references corporations the ESI scrapers may not have
 * fetched yet, and an unguarded row would fail the foreign key.
 */
export function toNpcCorporationChildRows(
  corporationId: number,
  record: NpcCorporationRecord,
  existingCorporationIds: ReadonlySet<number>,
): NpcCorporationChildRows {
  const rows: NpcCorporationChildRows = {
    allowedRaces: [],
    lpOfferTables: [],
    divisions: [],
    investors: [],
    trades: [],
    exchangeRates: [],
  };

  for (const raceId of record.allowedMemberRaces ?? []) {
    rows.allowedRaces.push({
      corporationId,
      raceId: requiredNumber(raceId),
      isDeleted: false,
    });
  }

  for (const lpOfferTableId of record.lpOfferTables ?? []) {
    rows.lpOfferTables.push({
      corporationId,
      lpOfferTableId: requiredNumber(lpOfferTableId),
      isDeleted: false,
    });
  }

  for (const [divisionKey, division] of Object.entries(
    record.divisions ?? {},
  )) {
    rows.divisions.push({
      corporationId,
      npcCorporationDivisionId: requiredNumber(divisionKey),
      divisionNumber: optionalNumber(division.divisionNumber),
      leaderId: optionalNumber(division.leaderID),
      size: optionalNumber(division.size),
      isDeleted: false,
    });
  }

  for (const [investorKey, shares] of Object.entries(record.investors ?? {})) {
    const investorCorporationId = requiredNumber(investorKey);
    if (!existingCorporationIds.has(investorCorporationId)) continue;
    rows.investors.push({
      corporationId,
      investorCorporationId,
      shares: requiredNumber(shares),
      isDeleted: false,
    });
  }

  for (const [typeKey, value] of Object.entries(
    record.corporationTrades ?? {},
  )) {
    rows.trades.push({
      corporationId,
      typeId: requiredNumber(typeKey),
      value: requiredNumber(value),
      isDeleted: false,
    });
  }

  for (const [otherKey, rate] of Object.entries(record.exchangeRates ?? {})) {
    const otherCorporationId = requiredNumber(otherKey);
    if (!existingCorporationIds.has(otherCorporationId)) continue;
    rows.exchangeRates.push({
      corporationId,
      otherCorporationId,
      rate: requiredNumber(rate),
      isDeleted: false,
    });
  }

  return rows;
}

/** Merge per-corporation child rows into one set of arrays, in input order. */
export function mergeNpcCorporationChildRows(
  batches: NpcCorporationChildRows[],
): NpcCorporationChildRows {
  return {
    allowedRaces: batches.flatMap((batch) => batch.allowedRaces),
    lpOfferTables: batches.flatMap((batch) => batch.lpOfferTables),
    divisions: batches.flatMap((batch) => batch.divisions),
    investors: batches.flatMap((batch) => batch.investors),
    trades: batches.flatMap((batch) => batch.trades),
    exchangeRates: batches.flatMap((batch) => batch.exchangeRates),
  };
}
