import { Suspense } from "react";
import { connection } from "next/server";

import type { MilitaryCampaignsSnapshot } from "./esi";
import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
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

async function MilitaryCampaignsContent() {
  const snapshot = await loadMilitaryCampaigns();
  return <MilitaryCampaignsPage snapshot={snapshot} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MilitaryCampaignsContent />
    </Suspense>
  );
}
