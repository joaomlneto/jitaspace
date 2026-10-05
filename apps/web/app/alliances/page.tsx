import { cacheLife, cacheTag } from "next/cache";

import type { AllianceRow } from "./page.client";
import { ALLIANCES_CACHE_TAG } from "~/lib/alliancesCache";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import AlliancesPage from "./page.client";

export const metadata = pageMetadata({
  title: "Alliances",
  description:
    "Every open alliance in EVE Online — member corporations, pilot counts, sovereignty, executors and founding dates, refreshed hourly.",
  path: "/alliances",
  badge: "Alliances",
});

export default async function Page() {
  "use cache";
  // The `esi-update-alliances` job refreshes this data at :45 every hour, and
  // marks this tag stale when it changes anything.
  cacheTag(ALLIANCES_CACHE_TAG);
  cacheLife("hours");
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. See CLAUDE.md → "Never catch a database
  // error inside a `"use cache"` scope".
  const [alliances, membership, sovereignty] = await Promise.all([
    prisma.alliance.findMany({
      select: {
        allianceId: true,
        name: true,
        ticker: true,
        dateFounded: true,
        executorCorporationId: true,
        executorCorporation: { select: { name: true } },
        faction: { select: { name: true } },
      },
      where: { isDeleted: false },
    }),
    prisma.corporation.groupBy({
      by: ["allianceId"],
      where: { allianceId: { not: null } },
      _count: { corporationId: true },
      _sum: { memberCount: true },
    }),
    prisma.solarSystemSovereignty.groupBy({
      by: ["allianceId"],
      where: { allianceId: { not: null } },
      _count: { solarSystemId: true },
    }),
  ]);

  const membershipByAlliance = new Map(
    membership.map((entry) => [entry.allianceId, entry]),
  );

  const sovSystemsByAlliance = new Map(
    sovereignty.map((entry) => [entry.allianceId, entry._count.solarSystemId]),
  );

  const rows: AllianceRow[] = alliances.map((alliance) => {
    const members = membershipByAlliance.get(alliance.allianceId);
    return {
      allianceId: alliance.allianceId,
      name: alliance.name,
      ticker: alliance.ticker,
      dateFounded: alliance.dateFounded.toISOString(),
      executorCorporationId: alliance.executorCorporationId,
      executorName: alliance.executorCorporation?.name ?? null,
      factionName: alliance.faction?.name ?? null,
      corporations: members?._count.corporationId ?? 0,
      pilots: members?._sum.memberCount ?? 0,
      sovSystems: sovSystemsByAlliance.get(alliance.allianceId) ?? 0,
    };
  });

  return <AlliancesPage alliances={rows} />;
}
