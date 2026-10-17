import type { IncursionSiteRole } from "./siteRoles";
import type { IncursionLayout } from "./types";

/**
 * One layout per constellation that has a mapped site or has had an
 * incursion: its sites by type, its latest staging system, and how often and
 * how recently incursions spawned there.
 */
export function buildIncursionLayouts({
  incursions,
  systems,
  roles,
}: {
  /** Most recent first. */
  incursions: readonly {
    constellationId: number;
    stagingSolarSystemId: number | null;
    firstSeenAt: Date;
  }[];
  /** At least every system in `roles`. */
  systems: readonly {
    solarSystemId: number;
    name: string;
    constellationId: number;
  }[];
  roles: ReadonlyMap<number, IncursionSiteRole>;
}): IncursionLayout[] {
  const layouts = new Map<number, IncursionLayout>();
  const layoutOf = (constellationId: number) => {
    let layout = layouts.get(constellationId);
    if (!layout) {
      layout = {
        constellationId,
        stagingSolarSystemId: null,
        vanguard: [],
        assault: [],
        headquarters: [],
        incursionCount: 0,
        lastSeenAt: null,
      };
      layouts.set(constellationId, layout);
    }
    return layout;
  };

  for (const incursion of incursions) {
    const layout = layoutOf(incursion.constellationId);
    layout.incursionCount += 1;
    layout.lastSeenAt ??= incursion.firstSeenAt.toISOString();
    layout.stagingSolarSystemId ??= incursion.stagingSolarSystemId;
  }

  const byName = [...systems].sort((a, b) => a.name.localeCompare(b.name));
  for (const system of byName) {
    const role = roles.get(system.solarSystemId);
    if (role) layoutOf(system.constellationId)[role].push(system.solarSystemId);
  }

  return [...layouts.values()];
}
