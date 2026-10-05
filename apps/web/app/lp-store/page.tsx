import { cacheLife } from "next/cache";

import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
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
  cacheLife("days");
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
  const corporationIds = (
    await prisma.loyaltyStoreOffer.groupBy({
      by: ["corporationId"],
    })
  ).map(({ corporationId }) => corporationId);

  const corporations = await prisma.corporation.findMany({
    select: {
      corporationId: true,
      name: true,
      faction: { select: { factionId: true, name: true } },
    },
    where: {
      corporationId: { in: corporationIds },
    },
  });

  return <LPStorePage groups={groupCorporationsByFaction(corporations)} />;
}
