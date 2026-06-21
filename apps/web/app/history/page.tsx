import { Suspense } from "react";
import { Loader } from "@mantine/core";

import type { HistoryIndex } from "~/lib/history";
import { getCachedHistoryIndex } from "~/lib/history-cache";
import HistoryIndexClient from "./page.client";

export const metadata = {
  title: "Type Change History",
  description:
    "Browse how EVE Online item types have changed across client builds over time.",
};

async function HistoryIndexContent() {
  // Read the day-cached index on the server and seed it into the client so the
  // page renders without a client-side fetch round-trip. On a cold/unavailable
  // history DB, fall back to the client's own fetch + empty state.
  let initialData: HistoryIndex | undefined;
  try {
    initialData = await getCachedHistoryIndex();
  } catch {
    initialData = undefined;
  }
  return <HistoryIndexClient initialData={initialData} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <HistoryIndexContent />
    </Suspense>
  );
}
