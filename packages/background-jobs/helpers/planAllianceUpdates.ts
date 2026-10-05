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
  /**
   * Every alliance any of the above touches: added, changed or closed, or one
   * a corporation joined or left. Their cached pages are now stale.
   */
  affectedAllianceIds: number[];
}

const sameAlliance = (a: AllianceRow, b: AllianceRow) =>
  a.creatorCorporationId === b.creatorCorporationId &&
  a.dateFounded.getTime() === b.dateFounded.getTime() &&
  a.executorCorporationId === b.executorCorporationId &&
  a.factionId === b.factionId &&
  a.name === b.name &&
  a.ticker === b.ticker &&
  a.isDeleted === b.isDeleted;

/** Splits ESI's alliances into those the database lacks and those it has wrong. */
const diffAlliances = (
  esiAlliances: AllianceRow[],
  dbAlliances: AllianceRow[],
) => {
  const dbAllianceById = new Map(dbAlliances.map((a) => [a.allianceId, a]));
  const newAlliances: AllianceRow[] = [];
  const changedAlliances: AllianceRow[] = [];
  for (const alliance of esiAlliances) {
    const existing = dbAllianceById.get(alliance.allianceId);
    if (!existing) newAlliances.push(alliance);
    else if (!sameAlliance(existing, alliance)) changedAlliances.push(alliance);
  }
  return { newAlliances, changedAlliances };
};

/** Where ESI says each corporation is now: corporationId → allianceId. */
const indexMemberships = (esiMemberCorporations: Map<number, number[]>) =>
  new Map(
    [...esiMemberCorporations].flatMap(([allianceId, corporationIds]) =>
      corporationIds.map(
        (corporationId) => [corporationId, allianceId] as const,
      ),
    ),
  );

/**
 * Groups known corporations whose alliance differs from ESI's by their new
 * alliance, and records both ends of every move in `affectedAllianceIds`.
 */
const planCorporationMoves = (
  dbCorporations: CorporationMembershipRow[],
  allianceOfCorporation: Map<number, number>,
  affectedAllianceIds: Set<number>,
) => {
  const corporationMoves = new Map<number | null, number[]>();
  for (const { corporationId, allianceId } of dbCorporations) {
    const target = allianceOfCorporation.get(corporationId) ?? null;
    if (target === allianceId) continue;
    if (allianceId !== null) affectedAllianceIds.add(allianceId);
    if (target !== null) affectedAllianceIds.add(target);
    const bucket = corporationMoves.get(target);
    if (bucket) bucket.push(corporationId);
    else corporationMoves.set(target, [corporationId]);
  }
  return corporationMoves;
};

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
  const { newAlliances, changedAlliances } = diffAlliances(
    esiAlliances,
    dbAlliances,
  );

  const esiAllianceIds = new Set(esiAlliances.map((a) => a.allianceId));
  const closedAllianceIds = dbAlliances
    .filter((a) => !a.isDeleted && !esiAllianceIds.has(a.allianceId))
    .map((a) => a.allianceId);

  const affectedAllianceIds = new Set<number>([
    ...newAlliances.map((a) => a.allianceId),
    ...changedAlliances.map((a) => a.allianceId),
    ...closedAllianceIds,
  ]);

  const allianceOfCorporation = indexMemberships(esiMemberCorporations);
  const corporationMoves = planCorporationMoves(
    dbCorporations,
    allianceOfCorporation,
    affectedAllianceIds,
  );

  const dbCorporationIds = new Set(dbCorporations.map((c) => c.corporationId));
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
    affectedAllianceIds: [...affectedAllianceIds],
  };
};
