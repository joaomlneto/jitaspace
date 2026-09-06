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
  // it for a day. Caching is not a guarantee though — the entry is per-region
  // and dies on every deploy, and this statement still reached ~12% of database
  // usage while nominally cached for a day, so treat the covering index (not
  // cacheLife) as what actually bounds the cost. The serialized index is ~1.3
  // MiB; if a payload ever grows past what the platform will store it silently
  // won't be, so watch the DB's top statements after deploying.
  cacheLife("days");

  // Two flat reads, assembled by buildMarketGroupIndex, rather than one
  // `findMany` with nested `children`/`types` relations. Prisma resolves each
  // nested relation as its own `WHERE <fk> IN (…every one of the ~2100 market
  // group ids…)` statement, so `children` costs a whole round trip for edges
  // `parentMarketGroupId` already gives us — that round trip is what this saves.
  //
  // It is NOT what fixed the full scan, and the IN list was never the problem:
  // measured on the production cluster, `marketGroupId IN (…2111 ids…)` plans a
  // perfectly good constrained index scan. What tips Type@Type_pkey into a FULL
  // SCAN is projecting `name` while no index covers it — see the index comment
  // on Type.marketGroupId in schema.prisma. Both predicates behave identically
  // either side of that: uncovered, both full-scan; covered, both scan the index.
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
