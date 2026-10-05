import type { MarketTree } from "~/lib/marketTree";
import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";
import { buildMarketGroupIndex } from "./buildMarketGroupIndex";

export type { MarketTree } from "~/lib/marketTree";

/**
 * Read the whole market tree (groups + their types) so expanding a group in the
 * sidebar is instant — no per-group loading spinner.
 *
 * That is ~19.7k type rows, so this must run as rarely as possible. It used to
 * run inside the market layout, where even `"use cache"` did not hold it: on
 * Vercel a plain `"use cache"` entry is per-instance memory, and
 * `/market/[typeId]` renders per request, so every fresh instance re-read the
 * tree (166 times in one hour on 2026-09-30, the cluster's top statement by
 * runtime) and every market page shipped the ~1.3 MiB tree in its payload.
 *
 * It is now read only by the `/api/market-tree` route handler, which Next
 * prerenders at build and the CDN serves until the next SDE ingest revalidates
 * the `sde` tag. Keep it there: calling this from a page brings both costs back.
 */
export async function readMarketTree(): Promise<MarketTree> {
  "use cache";
  cacheSdeRead();

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

  const rootMarketGroupIds = marketGroups
    .filter((marketGroup) => marketGroup.parentMarketGroupId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((marketGroup) => marketGroup.marketGroupId);

  return {
    rootMarketGroupIds,
    marketGroups: buildMarketGroupIndex(marketGroups, types),
  };
}
