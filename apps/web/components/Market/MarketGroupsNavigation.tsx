import { cacheLife } from "next/cache";

import type { MarketGroupIndex } from "./MarketGroupNavLink";
import { prisma } from "~/lib/db";
import { MarketGroupNavLink } from "./MarketGroupNavLink";

export async function MarketGroupsNavigation() {
  "use cache";
  // Load the whole market tree (groups + their types) up front so expanding a
  // group is instant — no per-group loading spinner. This is one large read of
  // the Type table (Prisma resolves the `types` relation as
  // `SELECT ... FROM "Type" WHERE "marketGroupId" IN (…all groups…)`), so it
  // MUST stay cached: at "hours" it re-ran ~24×/day per region (and on every
  // deploy) and became ~30% of the database's request-unit usage. The market
  // taxonomy only moves when a new SDE build is ingested (rare), so cache it for
  // a day. NB: if this payload ever exceeds the platform's per-entry data-cache
  // limit it silently won't be stored and the query runs per request again —
  // watch the DB's top statements after deploying.
  cacheLife("days");

  const marketGroups = await prisma.marketGroup.findMany({
    select: {
      marketGroupId: true,
      name: true,
      parentMarketGroupId: true,
      children: {
        select: {
          marketGroupId: true,
        },
      },
      types: {
        select: {
          typeId: true,
          name: true,
        },
      },
      // Bundling the icon here is what keeps the sidebar request-free: rendering
      // it client-side used to cost two SDE lookups per group (the group, then
      // its icon) plus an ESI market group call, i.e. ~3 requests per visible
      // NavLink on load and on every expand.
      icon: {
        select: {
          iconFile: true,
        },
      },
    },
  });

  const marketGroupsIndex: MarketGroupIndex = {};
  marketGroups.forEach(
    (marketGroup) =>
      (marketGroupsIndex[marketGroup.marketGroupId] = {
        name: marketGroup.name,
        parentMarketGroupId: marketGroup.parentMarketGroupId,
        childrenMarketGroupIds: marketGroup.children.map(
          (childMarketGroup) => childMarketGroup.marketGroupId,
        ),
        types: marketGroup.types,
        iconFile: marketGroup.icon?.iconFile ?? null,
      }),
  );

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
