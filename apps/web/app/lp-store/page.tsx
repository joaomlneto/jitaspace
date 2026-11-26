import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";
import { groupCorporationsByFaction } from "./groups";
import LPStorePage from "./page.client";

export const metadata = pageMetadata({
  // Worded for what people type into a search engine: "eve online lp store",
  // "lp store calculator", "isk per lp". The table on each store works out the
  // ISK per LP, which the old title ("LP Store") never said.
  title: "EVE Online LP Store and ISK per LP Calculator",
  description:
    "Every EVE Online Loyalty Point store in one place. Pick an NPC corporation to see its LP offers with Jita prices, profit and ISK per LP.",
  path: "/lp-store",
  badge: "Loyalty Points",
});

export default async function Page() {
  "use cache";
  // Two sources, two refresh paths. Which corporations have offers comes from
  // the LP store tables, which the SDE ingest does not write, so the page keeps
  // a daily `cacheLife` rather than `cacheSdeRead()`'s month. Their factions
  // and faction names do come from the ingest, so the `sde` tag also drops the
  // page as soon as a new build lands (or `revalidate-sde-cache` is run).
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
  const corporations = await prisma.corporation.findMany({
    select: {
      corporationId: true,
      name: true,
      faction: { select: { factionId: true, name: true } },
    },
    // The corporations that have at least one LP store offer still on sale.
    where: { LoyaltyStoreOffer: { some: { isDeleted: false } } },
  });

  return <LPStorePage groups={groupCorporationsByFaction(corporations)} />;
}
