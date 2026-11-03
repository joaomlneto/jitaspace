import { Suspense } from "react";
import { connection } from "next/server";

import type { MilitaryCampaignsSdeInfo } from "./data";
import type { MilitaryCampaignsSnapshot } from "./esi";
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
 * The cached read throws; this uncached caller degrades instead. A failure
 * renders the page without the public half and calls `connection()`, so that
 * render is request-time and never stored in place of the real list.
 */
async function loadMilitaryCampaigns(): Promise<MilitaryCampaignsSnapshot | null> {
  try {
    return await readMilitaryCampaigns();
  } catch {
    await connection();
    return null;
  }
}

/**
 * The names, issuers and targets, from our database. Same split as the ESI
 * read: without them the page still lists every campaign, by UUID.
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
    loadMilitaryCampaigns(),
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
