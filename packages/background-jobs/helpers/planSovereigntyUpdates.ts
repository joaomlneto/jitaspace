/**
 * Pure diff between ESI's sovereignty claims and the SolarSystemSovereignty
 * table, used by the hourly `esi-update-alliances` job. Kept free of
 * ESI/Prisma runtime imports so it can be unit-tested directly.
 */
import type { SovereigntySystemsSolarsystem } from "@jitaspace/esi-client";

/** A SolarSystemSovereignty row, minus its timestamps. */
export interface SovereigntyRow {
  solarSystemId: number;
  isUnclaimed: boolean;
  factionId: number | null;
  allianceId: number | null;
  corporationId: number | null;
  claimedSince: Date | null;
  isCapitalSystem: boolean | null;
  sovereigntyHubId: bigint | null;
  vulnerabilityWindowStart: Date | null;
  vulnerabilityWindowEnd: Date | null;
  activityDefenseMultiplier: number | null;
  militaryLevel: number | null;
  industrialLevel: number | null;
  strategicLevel: number | null;
}

export interface SovereigntyUpdatePlan {
  /** Listed by ESI, absent from the database. */
  created: SovereigntyRow[];
  /** In the database, but any field differs. */
  changed: SovereigntyRow[];
  /** In the database, but ESI no longer lists the system. */
  removedSolarSystemIds: number[];
  /**
   * Listed by ESI but not writable: the solar system is not in our SDE tables
   * yet, or the holding alliance or faction is not in its table.
   */
  skipped: SovereigntyRow[];
  /**
   * Alliances that gained or lost a system. Only a change of holder counts:
   * vulnerability windows and development move every day and do not change
   * what any cached page shows about the alliance.
   */
  affectedAllianceIds: number[];
}

const toDate = (value: string | undefined) =>
  value === undefined ? null : new Date(value);

/** Flattens one ESI claim into a row, keeping every field ESI returns. */
export const toSovereigntyRow = (
  system: SovereigntySystemsSolarsystem,
): SovereigntyRow => {
  const { claim } = system;
  const alliance = "alliance" in claim ? claim.alliance : undefined;
  const faction = "faction" in claim ? claim.faction : undefined;
  const window = alliance?.sovereignty_hub.vulnerability_window;
  return {
    solarSystemId: system.solar_system_id,
    isUnclaimed: "unclaimed" in claim && claim.unclaimed === true,
    factionId: faction?.faction_id ?? null,
    allianceId: alliance?.alliance_id ?? null,
    corporationId: alliance?.corporation_id ?? null,
    claimedSince: toDate(alliance?.claimed_since),
    isCapitalSystem: alliance?.is_capital_system ?? null,
    sovereigntyHubId:
      alliance === undefined ? null : BigInt(alliance.sovereignty_hub.id),
    vulnerabilityWindowStart: toDate(window?.start),
    vulnerabilityWindowEnd: toDate(window?.end),
    activityDefenseMultiplier:
      alliance?.development.activity_defense_multiplier ?? null,
    militaryLevel: alliance?.development.military_level ?? null,
    industrialLevel: alliance?.development.industrial_level ?? null,
    strategicLevel: alliance?.development.strategic_level ?? null,
  };
};

const sameDate = (a: Date | null, b: Date | null) =>
  a === null || b === null ? a === b : a.getTime() === b.getTime();

const sameSovereignty = (a: SovereigntyRow, b: SovereigntyRow) =>
  a.isUnclaimed === b.isUnclaimed &&
  a.factionId === b.factionId &&
  a.allianceId === b.allianceId &&
  a.corporationId === b.corporationId &&
  sameDate(a.claimedSince, b.claimedSince) &&
  a.isCapitalSystem === b.isCapitalSystem &&
  a.sovereigntyHubId === b.sovereigntyHubId &&
  sameDate(a.vulnerabilityWindowStart, b.vulnerabilityWindowStart) &&
  sameDate(a.vulnerabilityWindowEnd, b.vulnerabilityWindowEnd) &&
  a.activityDefenseMultiplier === b.activityDefenseMultiplier &&
  a.militaryLevel === b.militaryLevel &&
  a.industrialLevel === b.industrialLevel &&
  a.strategicLevel === b.strategicLevel;

const addHolder = (ids: Set<number>, allianceId: number | null) => {
  if (allianceId !== null) ids.add(allianceId);
};

export const planSovereigntyUpdates = ({
  esiSystems,
  dbSystems,
  knownSolarSystemIds,
  knownAllianceIds,
  knownFactionIds,
}: {
  /** Every system ESI lists, as rows. */
  esiSystems: SovereigntyRow[];
  /** Every SolarSystemSovereignty row in the database. */
  dbSystems: SovereigntyRow[];
  /** Solar systems present in our SDE tables. */
  knownSolarSystemIds: Set<number>;
  /** Alliances present in the Alliance table. */
  knownAllianceIds: Set<number>;
  /** Factions present in the Faction table. */
  knownFactionIds: Set<number>;
}): SovereigntyUpdatePlan => {
  const dbBySystem = new Map(dbSystems.map((row) => [row.solarSystemId, row]));
  const created: SovereigntyRow[] = [];
  const changed: SovereigntyRow[] = [];
  const skipped: SovereigntyRow[] = [];
  const affected = new Set<number>();

  for (const row of esiSystems) {
    const writable =
      knownSolarSystemIds.has(row.solarSystemId) &&
      (row.allianceId === null || knownAllianceIds.has(row.allianceId)) &&
      (row.factionId === null || knownFactionIds.has(row.factionId));
    const existing = dbBySystem.get(row.solarSystemId);
    if (!writable) {
      skipped.push(row);
    } else if (!existing) {
      created.push(row);
      addHolder(affected, row.allianceId);
    } else if (!sameSovereignty(existing, row)) {
      changed.push(row);
      if (existing.allianceId !== row.allianceId) {
        addHolder(affected, existing.allianceId);
        addHolder(affected, row.allianceId);
      }
    }
  }

  const listed = new Set(esiSystems.map((row) => row.solarSystemId));
  const removed = dbSystems.filter((row) => !listed.has(row.solarSystemId));
  for (const row of removed) addHolder(affected, row.allianceId);

  return {
    created,
    changed,
    removedSolarSystemIds: removed.map((row) => row.solarSystemId),
    skipped,
    affectedAllianceIds: [...affected],
  };
};
