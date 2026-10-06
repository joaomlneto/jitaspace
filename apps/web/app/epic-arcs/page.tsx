import type { EpicArcRow } from "./page.client";
import {
  buildEpicArcs,
  epicArcAgentIds,
  epicArcFactionIds,
  readEpicArcRows,
} from "~/lib/epicArcData";
import { epicArcSummary } from "~/lib/epicArcs";
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
    const summary = epicArcSummary(arc);
    // Every agent an arc can begin with: two arcs offer four starts.
    const startAgents = [
      ...new Map(
        summary.starts.flatMap((step) =>
          step.agent ? [[step.agent.characterId, step.agent] as const] : [],
        ),
      ).values(),
    ];
    return {
      epicArcId: arc.epicArcId,
      name: arc.name,
      iconId: arc.iconId,
      factionId: arc.faction?.factionId ?? null,
      factionName: arc.faction?.name ?? null,
      arcRestartInterval: arc.arcRestartInterval,
      missionCount: summary.missionCount,
      agentCount: summary.agentCount,
      chapterCount: summary.chapterCount,
      choiceCount: summary.choiceCount,
      endingCount: summary.endingCount,
      totalIsk: summary.totalIsk,
      startAgents,
    };
  });

  return <EpicArcsPage arcs={arcs} />;
}
