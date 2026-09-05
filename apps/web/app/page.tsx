import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import type { LatestChangedBuild } from "~/lib/history";
import { NewsCarouselPlaceholder } from "~/components/News";
import { PatchNotesNewsCarousel } from "~/components/PatchNotes";
import { getLatestChangedBuild } from "~/lib/history-cache";
import HomePage from "./page.client";

export const metadata: Metadata = {
  // The root layout's title template ("%s | JitaSpace") would turn a plain
  // string into "JitaSpace | JitaSpace", so pin the home page's title.
  title: { absolute: "JitaSpace" },
  alternates: { canonical: "/" },
};

/**
 * The news carousel, with the latest EVE static-data diff read on the server and
 * appended as a generated card.
 *
 * `connection()` marks the read as request-time — the same opt-out `/history`
 * uses. Without it the day-cached `getLatestChangedBuild` would be resolved
 * during the build prerender, which hits the history database (unprovisioned in
 * CI ⇒ ECONNREFUSED) and, because the `catch` below sits outside the `"use cache"`
 * scope, would fail the build rather than degrade.
 */
async function NewsCarouselWithPatchNotes() {
  await connection();
  let latest: LatestChangedBuild | null = null;
  try {
    latest = await getLatestChangedBuild();
  } catch {
    latest = null; // history DB unreachable ⇒ just the curated cards, no crash
  }
  return <PatchNotesNewsCarousel latest={latest} />;
}

export default function Page() {
  return (
    <HomePage
      newsCarousel={
        // The placeholder is the carousel's own height reservation, so the
        // static shell holds the space open and the streamed-in carousel drops
        // into it rather than pushing the page down.
        <Suspense fallback={<NewsCarouselPlaceholder />}>
          <NewsCarouselWithPatchNotes />
        </Suspense>
      }
    />
  );
}
