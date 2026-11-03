import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/react";

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
  // Everything is fetched in the browser, so the static HTML is the page's
  // own shell: heading, source bar and skeleton rows. The React nuqs adapter
  // keeps it there: the app-wide Next adapter reads useSearchParams, which
  // would drop the page out of the prerender and leave only the fallback,
  // swapped for the page (and shifting it) once the browser renders it. This
  // one reads `?sources=` after hydration.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NuqsAdapter>
        <FreelanceMinePage />
      </NuqsAdapter>
    </Suspense>
  );
}
