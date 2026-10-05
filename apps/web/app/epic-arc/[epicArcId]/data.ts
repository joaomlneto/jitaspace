import type { EpicArc } from "~/lib/epicArcs";
import {
  buildEpicArcs,
  epicArcAgentIds,
  epicArcFactionIds,
  readEpicArcRows,
} from "~/lib/epicArcData";
import { readAgentRefs, readFactionRefs } from "~/lib/missionRefs";
import { cacheSdeRead } from "~/lib/sdeCache";

/**
 * One epic arc with every step resolved, or `null` when there is no such arc.
 *
 * Throws on a database failure rather than returning `null`: a `null` here is
 * a cached 404 (see CLAUDE.md → "Never catch a database error inside a
 * `"use cache"` scope").
 */
export async function getEpicArc(epicArcId: number): Promise<EpicArc | null> {
  "use cache";
  cacheSdeRead();

  const rows = await readEpicArcRows([epicArcId]);
  if (rows.arcs.length === 0) return null;

  const [agents, factions] = await Promise.all([
    readAgentRefs(epicArcAgentIds(rows)),
    readFactionRefs(epicArcFactionIds(rows)),
  ]);
  const [arc] = buildEpicArcs(rows, agents, factions);
  return arc ?? null;
}
