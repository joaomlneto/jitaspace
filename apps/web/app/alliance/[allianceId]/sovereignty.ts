import type { AllianceSovereigntySystem } from "./types";

export interface SovereigntyRegion {
  regionId: number | null;
  regionName: string | null;
  systems: number;
  constellations: number;
  hasCapital: boolean;
}

export interface SovereigntySummary {
  systems: number;
  regions: SovereigntyRegion[];
  constellations: number;
  capital: AllianceSovereigntySystem | null;
  hubs: number;
  averageAdm: number | null;
  maxAdm: number | null;
  /** The longest-held claim. */
  oldestClaim: AllianceSovereigntySystem | null;
}

export function summarizeSovereignty(
  systems: AllianceSovereigntySystem[],
): SovereigntySummary {
  const regions = new Map<
    number | null,
    SovereigntyRegion & { constellationIds: Set<number> }
  >();
  for (const system of systems) {
    const region = regions.get(system.regionId) ?? {
      regionId: system.regionId,
      regionName: system.regionName,
      systems: 0,
      constellations: 0,
      hasCapital: false,
      constellationIds: new Set<number>(),
    };
    region.systems += 1;
    region.constellationIds.add(system.constellationId);
    region.constellations = region.constellationIds.size;
    region.hasCapital ||= system.isCapitalSystem;
    regions.set(system.regionId, region);
  }

  const adms = systems.flatMap((system) =>
    system.activityDefenseMultiplier === null
      ? []
      : [system.activityDefenseMultiplier],
  );
  const claimed = systems
    .filter(
      (
        system,
      ): system is AllianceSovereigntySystem & {
        claimedSince: string;
      } => system.claimedSince !== null,
    )
    .sort((a, b) => a.claimedSince.localeCompare(b.claimedSince));

  return {
    systems: systems.length,
    regions: [...regions.values()]
      .map(({ constellationIds: _, ...region }) => region)
      .sort(
        (a, b) =>
          b.systems - a.systems ||
          (a.regionName ?? "").localeCompare(b.regionName ?? ""),
      ),
    constellations: new Set(systems.map((system) => system.constellationId))
      .size,
    capital: systems.find((system) => system.isCapitalSystem) ?? null,
    hubs: systems.filter((system) => system.sovereigntyHubId !== null).length,
    averageAdm:
      adms.length > 0
        ? adms.reduce((sum, adm) => sum + adm, 0) / adms.length
        : null,
    maxAdm: adms.length > 0 ? Math.max(...adms) : null,
    oldestClaim: claimed[0] ?? null,
  };
}
