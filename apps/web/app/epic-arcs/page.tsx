import type { EpicArcRow } from "./page.client";
import {
  buildEpicArcs,
  epicArcAgentIds,
  epicArcFactionIds,
  readEpicArcRows,
} from "~/lib/epicArcData";
import { epicArcAgents, epicArcShape } from "~/lib/epicArcs";
import { pageMetadata } from "~/lib/metadata";
import { readAgentRefs, readFactionRefs } from "~/lib/missionRefs";
import { cacheSdeRead } from "~/lib/sdeCache";
import EpicArcsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Epic Arcs",
  description:
    "Browse EVE Online's epic arcs — the branching mission chains of the Sisters of EVE, the empires and the pirate factions — with their agents, choices and endings.",
  path: "/epic-arcs",
  badge: "Epic Arcs",
});

export default async function Page() {
  "use cache";
  cacheSdeRead();
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. See CLAUDE.md → "Never catch a database
  // error inside a `"use cache"` scope".
  const rows = await readEpicArcRows();
  const [agents, factions] = await Promise.all([
    readAgentRefs(epicArcAgentIds(rows)),
    readFactionRefs(epicArcFactionIds(rows)),
  ]);

  // Summaries only: the steps themselves stay on each arc's own page.
  const arcs = buildEpicArcs(rows, agents, factions).map((arc): EpicArcRow => {
    const shape = epicArcShape(arc.steps);
    const start = arc.steps.find((step) => step.missionId === shape.starts[0]);
    return {
      epicArcId: arc.epicArcId,
      name: arc.name,
      iconId: arc.iconId,
      factionId: arc.faction?.factionId ?? null,
      factionName: arc.faction?.name ?? null,
      arcRestartInterval: arc.arcRestartInterval,
      missionCount: arc.steps.length,
      agentCount: epicArcAgents(arc.steps).length,
      chapterCount: arc.steps.filter((step) => step.chapterTitle).length,
      choiceCount: shape.branchPoints.length,
      endingCount: shape.endings.length,
      totalIsk: arc.steps.reduce((sum, step) => sum + (step.rewardIsk ?? 0), 0),
      startAgent: start?.agent ?? null,
    };
  });

  return <EpicArcsPage arcs={arcs} />;
}
