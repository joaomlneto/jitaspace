import { Suspense } from "react";
import { Loader } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react";

import { getCachedHistoryIndex } from "~/lib/history-cache";
import { pageMetadata } from "~/lib/metadata";
import HistoryIndexClient from "./page.client";

export const metadata = pageMetadata({
  title: "Type Change History",
  description:
    "Browse how EVE Online item types have changed across client builds over time.",
  path: "/history",
  badge: "Change History",
});

// A static page: `next build` prerenders it from the day-cached
// `getCachedHistoryIndex`, and the page revalidates with that read, so a visit
// queries nothing and the browser fetches nothing. The CI build prerenders it
// against an empty history database (cypress.yml).
//
// Uncaught: a database failure while prerendering must fail the build (or the
// revalidation) rather than cache an empty index for a day.
async function HistoryData() {
  const index = await getCachedHistoryIndex();
  // nuqs's React adapter keeps the prerendered page complete; see
  // apps/web/CLAUDE.md → "URL-synced filter state".
  return (
    <NuqsAdapter>
      <HistoryIndexClient initialIndex={index} />
    </NuqsAdapter>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <HistoryData />
    </Suspense>
  );
}
