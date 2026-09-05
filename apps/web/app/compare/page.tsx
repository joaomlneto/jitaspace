import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import PageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Compare Tool",
  description:
    "Compare EVE Online items side by side — attributes, stats and market prices for ships, modules and more.",
  path: "/compare",
  badge: "Items",
});

// The client half reads the selected types from the URL via nuqs, which uses
// useSearchParams internally — without this boundary the whole route would drop
// out of static prerendering under cacheComponents.
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageClient />
    </Suspense>
  );
}
