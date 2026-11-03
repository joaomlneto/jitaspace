import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import { readOpenContractsOverview } from "./data";
import ContractsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Contracts",
  description:
    "Browse EVE Online's public contracts — item exchanges, auctions and courier jobs — by region, item and price, next to your own open contracts.",
  path: "/contracts",
  badge: "Contracts",
});

async function ContractsContent() {
  // Uncaught: the overview is cached hourly, so a database failure must throw
  // rather than store an empty browser. The contracts themselves load in the
  // browser from `/api/contracts`.
  const overview = await readOpenContractsOverview();

  // nuqs's React adapter, not the app-wide Next one, so the filters stay in
  // this prerendered page's cached HTML (apps/web/CLAUDE.md → "URL-synced
  // filter state").
  return (
    <NuqsAdapter>
      <ContractsPage overview={overview} />
    </NuqsAdapter>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContractsContent />
    </Suspense>
  );
}
