import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import AccessListsPageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Access Lists",
  description:
    "Browse the EVE Online access lists your characters manage, and everyone each one allows or blocks.",
  path: "/access-lists",
  badge: "Access Lists",
});

export default function Page() {
  // Everything is fetched in the browser, so the static HTML is the page's
  // own shell: heading, intro and skeleton rows. The React nuqs adapter keeps
  // it there: the app-wide Next adapter reads useSearchParams, which would
  // drop the page out of the prerender and leave only the fallback, swapped
  // for the page (and shifting it) once the browser renders it. This one
  // reads `?characters=` and `?list=` after hydration.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NuqsAdapter>
        <AccessListsPageClient />
      </NuqsAdapter>
    </Suspense>
  );
}
