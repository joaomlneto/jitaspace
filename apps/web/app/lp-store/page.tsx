import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";
import { groupCorporationsByFaction } from "./groups";
import LPStorePage from "./page.client";

export const metadata = pageMetadata({
  title: "LP Store",
  description:
    "Browse EVE Online Loyalty Point store offers — find what you can buy with LP from NPC corporations.",
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
    // The corporations that have at least one LP store offer.
    where: { LoyaltyStoreOffer: { some: {} } },
  });

  return <LPStorePage groups={groupCorporationsByFaction(corporations)} />;
}
