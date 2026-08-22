import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import type { LatestChangedBuild } from "~/lib/history";
import { LatestPatchNotesBanner } from "~/components/PatchNotes";
import { getLatestChangedBuild } from "~/lib/history-cache";
import HomePage from "./page.client";

export const metadata: Metadata = {
  // The root layout's title template ("%s | JitaSpace") would turn a plain
  // string into "JitaSpace | JitaSpace", so pin the home page's title.
  title: { absolute: "JitaSpace" },
};

/**
 * Latest EVE static-data diff, read on the server and handed to the client
 * banner.
 *
 * `connection()` marks the read as request-time — the same opt-out `/history`
 * uses. Without it the day-cached `getLatestChangedBuild` would be resolved
 * during the build prerender, which hits the history database (unprovisioned in
 * CI ⇒ ECONNREFUSED) and, because the `catch` below sits outside the `"use cache"`
 * scope, would fail the build rather than degrade.
 */
async function LatestPatchNotes() {
  await connection();
  let latest: LatestChangedBuild | null = null;
  try {
    latest = await getLatestChangedBuild();
  } catch {
    latest = null; // history DB unreachable ⇒ render nothing, don't crash the page
  }
  return <LatestPatchNotesBanner latest={latest} />;
}

export default function Page() {
  return (
    <HomePage
      banner={
        <Suspense fallback={null}>
          <LatestPatchNotes />
        </Suspense>
      }
    />
  );
}
