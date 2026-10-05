import type { Prisma } from "../../../db";
import type { SDE_OWNED_CORPORATION_COLUMNS } from "../../../helpers/sdeOwnedColumns";
// Imported from the module rather than the `helpers` barrel: sdeFields has no
// runtime dependencies of its own, so this module stays unit-testable without
// mocking p-limit or the zod-checked env (see ./missionTransforms).
import {
  optionalBoolean,
  optionalNumber,
  plainString,
  present,
  requiredNumber,
} from "../../../helpers/sdeFields";

/**
 * The primary key plus exactly the SDE-owned columns — `ingestSdeTable` writes
 * only the columns `toRow` returns, so the ESI-owned required ones
 * (`name`, `memberCount`, `ticker`, `taxRate`) must stay out of this type.
 */
export type SdeCorporationRow = Pick<
  Prisma.CorporationCreateManyInput,
  "corporationId" | (typeof SDE_OWNED_CORPORATION_COLUMNS)[number]
>;

/**
 * The SDE-owned `Corporation` columns of one `npcCorporations.yaml` record.
 * `factionIds` holds the factions that exist in the database: `factionId` is a
 * foreign key, so a faction missing there lands as null instead of failing the
 * write.
 */
export function toSdeCorporationRow(
  record: Record<string, unknown>,
  id: number,
  factionIds: ReadonlySet<number>,
): SdeCorporationRow {
  return {
    corporationId: id,
    extent: plainString(record.extent),
    memberLimit: optionalNumber(record.memberLimit),
    minSecurity: optionalNumber(record.minSecurity),
    minimumJoinStanding: optionalNumber(record.minimumJoinStanding),
    initialPrice: optionalNumber(record.initialPrice),
    hasPlayerPersonnelManager: optionalBoolean(
      record.hasPlayerPersonnelManager,
    ),
    sendCharTerminationMessage: optionalBoolean(
      record.sendCharTerminationMessage,
    ),
    mainActivityId: optionalNumber(record.mainActivityID),
    secondaryActivityId: optionalNumber(record.secondaryActivityID),
    enemyId: optionalNumber(record.enemyID),
    friendId: optionalNumber(record.friendID),
    size: plainString(record.size),
    sizeFactor: optionalNumber(record.sizeFactor),
    isUnique: optionalBoolean(record.uniqueName),
    // CCP's own `deleted` marker, kept apart from the ingest's `isDeleted`
    // soft-delete flag (which this job does not own — the ESI scraper does).
    isDeletedByCcp: optionalBoolean(record.deleted),
    // Plain ids, not relations: nothing dangles today (0 of 261 / 257 / 252
    // miss mapSolarSystems.yaml / races.yaml / icons.yaml) and the columns
    // carry no FK, so no `present()` guard is needed.
    solarSystemId: optionalNumber(record.solarSystemID),
    raceId: optionalNumber(record.raceID),
    iconId: optionalNumber(record.iconID),
    // The corporation's own faction. ESI's `enlisted_faction_id` (Faction
    // Warfare) goes to `enlistedFactionId` instead.
    factionId: present(factionIds, optionalNumber(record.factionID)),
    // NOTE: no `name`, `memberCount`, `ticker`, `taxRate` or `ceoId` — those are
    // ESI-owned. Omitting them also keeps them out of ingestSdeTable's managed
    // key set, so the diff leaves them untouched.
  };
}

/** A corporation outside npcCorporations.yaml that still has a `factionId`. */
export interface LegacyFactionRow {
  corporationId: number;
  factionId: number | null;
  enlistedFactionId: number | null;
}

/**
 * Until ESI's 2026-08-18 rename, `factionId` held the Faction Warfare enlistment
 * ESI reports, for every corporation. Only an NPC corporation has a faction of
 * its own, so a `factionId` on any other row is that legacy enlistment. This
 * plans its move: into `enlistedFactionId`, grouped by faction, unless ESI has
 * already filled that column (its value is fresher); then `factionId` is
 * cleared on every row. Running the plan twice is harmless — a moved row keeps
 * its `enlistedFactionId` and is only cleared.
 */
export function planLegacyEnlistmentMoves(rows: readonly LegacyFactionRow[]): {
  moves: Map<number, number[]>;
  clear: number[];
} {
  const moves = new Map<number, number[]>();
  const clear: number[] = [];
  for (const { corporationId, factionId, enlistedFactionId } of rows) {
    if (factionId === null) continue;
    clear.push(corporationId);
    if (enlistedFactionId !== null) continue;
    const ids = moves.get(factionId) ?? [];
    ids.push(corporationId);
    moves.set(factionId, ids);
  }
  return { moves, clear };
}

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
