import { Suspense } from "react";
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

// A static page, prerendered from the same day-cached index as `/history`
// (see its page.tsx). Uncaught for the same reason: a failed read must not cache
// an empty picker.
async function CompareData() {
  const index = await getCachedHistoryIndex();
  const builds = index.builds.map((b) => ({ build: b.build, date: b.date }));
  return <CompareBuildsClient builds={builds} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <CompareData />
    </Suspense>
  );
}
