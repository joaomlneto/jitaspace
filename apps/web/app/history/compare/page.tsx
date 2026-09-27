import { Suspense } from "react";
import { connection } from "next/server";
import { Loader } from "@mantine/core";

import { getCachedHistoryIndex } from "~/lib/history-cache";
import { pageMetadata } from "~/lib/metadata";
import CompareBuildsClient from "./page.client";

export const metadata = pageMetadata({
  title: "Compare Builds — Change History",
  description:
    "Compare two EVE Online client builds and see how the static data changed between them.",
  path: "/history/compare",
  badge: "Change History",
});

// The build picker is seeded from the day-cached index. `connection()` marks the
// read as request-time so it stays out of the build-time prerender (which would
// hit the unprovisioned history DB → ECONNREFUSED), matching the /history page.
async function CompareData() {
  await connection();
  let builds: { build: number; date: string | null }[] = [];
  try {
    const index = await getCachedHistoryIndex();
    builds = index.builds.map((b) => ({ build: b.build, date: b.date }));
  } catch {
    builds = []; // DB unreachable ⇒ render with an empty picker rather than crash
  }
  return <CompareBuildsClient builds={builds} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <CompareData />
    </Suspense>
  );
}
