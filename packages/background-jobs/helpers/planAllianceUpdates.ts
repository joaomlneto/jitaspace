/**
 * Pure diff between what ESI says about every open alliance and what the
 * database holds, used by the hourly `esi-update-alliances` job. Kept free of
 * ESI/Prisma imports so it can be unit-tested directly.
 */

export interface AllianceRow {
  allianceId: number;
  creatorCorporationId: number;
  dateFounded: Date;
  executorCorporationId: number | null;
  factionId: number | null;
  name: string;
  ticker: string;
  isDeleted: boolean;
}

export interface CorporationMembershipRow {
  corporationId: number;
  allianceId: number | null;
}

export interface AllianceUpdatePlan {
  /** Open in ESI, absent from the database. */
  newAlliances: AllianceRow[];
  /** In the database, but a field differs (or it was marked closed). */
  changedAlliances: AllianceRow[];
  /** Not closed in the database, but no longer listed by ESI. */
  closedAllianceIds: number[];
  /**
   * Member corporations the database does not know yet. Executors of new or
   * changed alliances come first, since the alliance row references them.
   */
  missingCorporationIds: number[];
  /**
   * Known corporations whose alliance changed, grouped by their new alliance
   * (`null` = left their alliance, or it closed).
   */
  corporationMoves: Map<number | null, number[]>;
}

const sameAlliance = (a: AllianceRow, b: AllianceRow) =>
  a.creatorCorporationId === b.creatorCorporationId &&
  a.dateFounded.getTime() === b.dateFounded.getTime() &&
  a.executorCorporationId === b.executorCorporationId &&
  a.factionId === b.factionId &&
  a.name === b.name &&
  a.ticker === b.ticker &&
  a.isDeleted === b.isDeleted;

export const planAllianceUpdates = ({
  esiAlliances,
  esiMemberCorporations,
  dbAlliances,
  dbCorporations,
}: {
  /** Every alliance ESI lists (i.e. every open alliance). */
  esiAlliances: AllianceRow[];
  /** allianceId → its member corporation IDs, per ESI. */
  esiMemberCorporations: Map<number, number[]>;
  /** Every alliance row in the database, closed ones included. */
  dbAlliances: AllianceRow[];
  /**
   * Every database corporation that is either in an alliance or listed as a
   * member by ESI. Corporations outside both sets need no change.
   */
  dbCorporations: CorporationMembershipRow[];
}): AllianceUpdatePlan => {
  const dbAllianceById = new Map(dbAlliances.map((a) => [a.allianceId, a]));
  const esiAllianceIds = new Set(esiAlliances.map((a) => a.allianceId));

  const newAlliances: AllianceRow[] = [];
  const changedAlliances: AllianceRow[] = [];
  for (const alliance of esiAlliances) {
    const existing = dbAllianceById.get(alliance.allianceId);
    if (!existing) newAlliances.push(alliance);
    else if (!sameAlliance(existing, alliance)) changedAlliances.push(alliance);
  }

  const closedAllianceIds = dbAlliances
    .filter((a) => !a.isDeleted && !esiAllianceIds.has(a.allianceId))
    .map((a) => a.allianceId);

  // Where ESI says each corporation is now.
  const allianceOfCorporation = new Map<number, number>();
  for (const [allianceId, corporationIds] of esiMemberCorporations) {
    for (const corporationId of corporationIds) {
      allianceOfCorporation.set(corporationId, allianceId);
    }
  }

  const dbCorporationIds = new Set<number>();
  const corporationMoves = new Map<number | null, number[]>();
  for (const { corporationId, allianceId } of dbCorporations) {
    dbCorporationIds.add(corporationId);
    const target = allianceOfCorporation.get(corporationId) ?? null;
    if (target === allianceId) continue;
    const bucket = corporationMoves.get(target);
    if (bucket) bucket.push(corporationId);
    else corporationMoves.set(target, [corporationId]);
  }

  const executorIds = [...newAlliances, ...changedAlliances]
    .map((a) => a.executorCorporationId)
    .filter((id): id is number => id !== null);
  const missingCorporationIds = [
    ...new Set([...executorIds, ...allianceOfCorporation.keys()]),
  ].filter((id) => !dbCorporationIds.has(id));

  return {
    newAlliances,
    changedAlliances,
    closedAllianceIds,
    missingCorporationIds,
    corporationMoves,
  };
};
