import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { WarRoom } from "~/components/Wars/WarRoom";
import { pageMetadata } from "~/lib/metadata";
import { getWarRoomData } from "./data";

export const metadata = pageMetadata({
  title: "Active Wars",
  description:
    "Live list of active wars in EVE Online — track ongoing conflicts between corporations and alliances.",
  path: "/active-wars",
  badge: "Wars",
});

async function ActiveWarsContent() {
  let data;
  try {
    data = await getWarRoomData();
  } catch {
    notFound();
  }

  // nuqs's React adapter, not the app-wide Next one. The war list keeps its
  // filters in the URL, and the Next adapter reads them through
  // `useSearchParams()`, which leaves the list out of this ISR page's cached
  // HTML. The React adapter renders the default view on the server and reads
  // `location.search` once hydrated.
  return (
    <NuqsAdapter>
      <WarRoom data={data} />
    </NuqsAdapter>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActiveWarsContent />
    </Suspense>
  );
}
