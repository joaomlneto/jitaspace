import { Suspense } from "react";
import { Loader } from "@mantine/core";

import HistoryIndexClient from "./page.client";

export const metadata = {
  title: "Type Change History",
  description:
    "Browse how EVE Online item types have changed across client builds over time.",
};

// `/history` is a static shell: the interactive client fetches the index via the
// `getHistoryIndex` server action, which delegates to the day-cached
// `getCachedHistoryIndex`. We deliberately do NOT server-fetch here — with
// `cacheComponents` that would prerender the page at build time and hit the
// history DB, which isn't provisioned during the CI build (ECONNREFUSED). The
// cache still applies at runtime, shared across all visitors.
export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <HistoryIndexClient />
    </Suspense>
  );
}
