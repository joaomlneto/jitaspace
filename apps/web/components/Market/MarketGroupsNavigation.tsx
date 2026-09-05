import { cacheLife } from "next/cache";

import { prisma } from "~/lib/db";
import { buildMarketGroupIndex } from "./buildMarketGroupIndex";
import { MarketGroupNavLink } from "./MarketGroupNavLink";

export async function MarketGroupsNavigation() {
  "use cache";
  // Load the whole market tree (groups + their types) up front so expanding a
  // group is instant — no per-group loading spinner. That is ~19.7k type rows,
  // so it MUST stay cached: at "hours" it re-ran ~24×/day per region (and on
  // every deploy) and became ~30% of the database's request-unit usage. The
  // market taxonomy only moves when a new SDE build is ingested (rare), so cache
  // it for a day. NB: if this payload ever exceeds the platform's per-entry
  // data-cache limit it silently won't be stored and the queries run per request
  // again — watch the DB's top statements after deploying. (Serialized index is
  // ~1.3 MiB today, against a 2 MiB limit.)
  cacheLife("days");

  // Two flat reads, assembled by buildMarketGroupIndex, rather than one
  // `findMany` with nested `children`/`types` relations. Prisma resolves each
  // nested relation as its own `WHERE <fk> IN (…every one of the 2109 market
  // group ids…)` statement, and CockroachDB will not plan a constrained scan
  // against an IN list that large — the types query in particular degraded into
  // a FULL SCAN of Type@Type_pkey (52k rows / 18 MiB / ~1400 RUs a go).
  // Filtering on `IS NOT NULL` instead gives the planner a single span over the
  // covering (marketGroupId, name) index, and the parent/child edges are already
  // implied by `parentMarketGroupId`, so the `children` round trip is pure waste.
  const [marketGroups, types] = await Promise.all([
    prisma.marketGroup.findMany({
      select: {
        marketGroupId: true,
        name: true,
        parentMarketGroupId: true,
        // Bundling the icon id here is what keeps the sidebar request-free:
        // resolving it client-side used to cost two SDE lookups per group (the
        // group, then its icon) plus an ESI market group call, i.e. ~3 requests
        // per visible NavLink on load and on every expand. The icon server
        // addresses images by icon id, so the id alone is enough — no join.
        iconId: true,
      },
    }),
    prisma.type.findMany({
      where: { marketGroupId: { not: null } },
      select: { typeId: true, name: true, marketGroupId: true },
    }),
  ]);

  const marketGroupsIndex = buildMarketGroupIndex(marketGroups, types);

  const rootMarketGroupIds = marketGroups
    .filter((marketGroup) => marketGroup.parentMarketGroupId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((marketGroup) => marketGroup.marketGroupId);

  return (
    <>
      {rootMarketGroupIds.map((marketGroupId) => (
        <MarketGroupNavLink
          marketGroups={marketGroupsIndex}
          marketGroupId={marketGroupId}
          key={marketGroupId}
        />
      ))}
    </>
  );
}
