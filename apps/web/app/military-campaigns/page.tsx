import { Suspense } from "react";
import { connection } from "next/server";

import type { MilitaryCampaignsSdeInfo } from "./data";
import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import { readMilitaryCampaignsSdeInfo } from "./data";
import { readMilitaryCampaigns } from "./esi";
import MilitaryCampaignsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Military Campaigns",
  description:
    "Every EVE Online military campaign and its objectives — progress, participants and state — alongside what your own characters have contributed.",
  path: "/military-campaigns",
  badge: "Campaigns",
});

/**
 * The names, issuers and targets, from our database. The cached read throws;
 * this uncached caller degrades instead, rendering every campaign by UUID and
 * calling `connection()`, so that render is request-time and never stored.
 * (The ESI read handles its own failures; see `readMilitaryCampaigns`.)
 */
async function loadMilitaryCampaignsSdeInfo(): Promise<MilitaryCampaignsSdeInfo | null> {
  try {
    return await readMilitaryCampaignsSdeInfo();
  } catch {
    await connection();
    return null;
  }
}

async function MilitaryCampaignsContent() {
  const [snapshot, sdeInfo] = await Promise.all([
    readMilitaryCampaigns(),
    loadMilitaryCampaignsSdeInfo(),
  ]);
  return <MilitaryCampaignsPage snapshot={snapshot} sdeInfo={sdeInfo} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MilitaryCampaignsContent />
    </Suspense>
  );
}
