import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import ContractsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Contracts",
  description:
    "Browse EVE Online's public contracts — item exchanges, auctions and courier jobs — by region, item and price, next to your own open contracts.",
  path: "/contracts",
  badge: "Contracts",
});

function ContractsContent() {
  // nuqs's React adapter, not the app-wide Next one, so the filters stay in
  // this prerendered page's cached HTML (apps/web/CLAUDE.md → "URL-synced
  // filter state"). The page reads no data on the server: the open contracts
  // load in the browser from `/api/contracts/open/[shard]`.
  return (
    <NuqsAdapter>
      <ContractsPage />
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
