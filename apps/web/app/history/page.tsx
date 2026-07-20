import { Suspense } from "react";
import { connection } from "next/server";
import { Loader } from "@mantine/core";

import type { HistoryIndex } from "~/lib/history";
import { getCachedHistoryIndex } from "~/lib/history-cache";
import HistoryIndexClient from "./page.client";

export const metadata = {
  title: "Type Change History",
  description:
    "Browse how EVE Online item types have changed across client builds over time.",
};

// Server-render the index from the day-cached `getCachedHistoryIndex` and pass it
// to the client as a prop — no client fetch and no per-visit DB query.
//
// `connection()` marks the read as request-time, which (a) is correct — the index
// is live data, not a build-time constant — and (b) keeps it out of the build-time
// prerender, which would hit the history DB (unprovisioned in CI → ECONNREFUSED).
// It is the `cacheComponents`-blessed dynamic opt-out; the `export const dynamic`
// / `revalidate` config knobs are disallowed under `cacheComponents`.
async function HistoryData() {
  await connection();
  let index: HistoryIndex | null = null;
  try {
    index = await getCachedHistoryIndex();
  } catch {
    index = null; // DB unreachable ⇒ render the empty state instead of crashing
  }
  return <HistoryIndexClient initialIndex={index} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <HistoryData />
    </Suspense>
  );
}
