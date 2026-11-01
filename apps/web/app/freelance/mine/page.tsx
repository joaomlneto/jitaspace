import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import FreelanceMinePage from "./page.client";

export const metadata = pageMetadata({
  title: "Your Freelance Jobs",
  description:
    "The EVE Online freelance jobs your characters are working on and the ones your corporations have posted, in one list.",
  path: "/freelance/mine",
  badge: "Freelance Jobs",
});

export default function Page() {
  // The source selection lives in the URL via nuqs, which reads
  // useSearchParams internally — without a Suspense boundary the route
  // silently drops out of static prerendering under cacheComponents.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FreelanceMinePage />
    </Suspense>
  );
}
