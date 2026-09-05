import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import PageClient from "./page.client";

export const metadata = {
  title: "Compare Tool",
  description:
    "Compare EVE Online items side by side — attributes, stats and market prices for ships, modules and more.",
  // Self-canonical on purpose: the comparison lives entirely in `?types=`, and
  // the server HTML is the same empty tool for every value of it, so each
  // shared comparison URL is a duplicate rather than a document worth indexing.
  alternates: { canonical: "/compare" },
};

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
