import { NuqsAdapter } from "nuqs/adapters/react";

import { pageMetadata } from "~/lib/metadata";
import { readMercenaryTacticalOperationKinds } from "./data";
import MercenaryTacticalOperationsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Mercenary Tactical Operations",
  description:
    "See the Mercenary Tactical Operations your EVE Online characters' Mercenary Dens are offering, with their status, expiry and rewards.",
  path: "/mercenary-tactical-operations",
  badge: "Mercenary Tactical Operations",
});

export default async function Page() {
  // SDE data only, read at build time; the operations themselves are the
  // logged-in characters', so they are fetched in the browser.
  const kinds = await readMercenaryTacticalOperationKinds();

  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which would leave only a Suspense fallback in the
  // prerendered HTML. The React adapter reads the filters after hydration, so
  // the heading, the filters and the table's skeleton are in the first paint.
  return (
    <NuqsAdapter>
      <MercenaryTacticalOperationsPage kinds={kinds} />
    </NuqsAdapter>
  );
}
