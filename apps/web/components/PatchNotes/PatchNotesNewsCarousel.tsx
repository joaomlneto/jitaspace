"use client";

import type { UseDismissedPatchNotesOptions } from "./useDismissedPatchNotes";
import type { NewsCarouselProps } from "~/components/News";
import type { LatestChangedBuild } from "~/lib/history";
import { NewsCarousel } from "~/components/News";
import { patchNotesNewsItem } from "./patchNotesItem";
import { useDismissedPatchNotes } from "./useDismissedPatchNotes";

export interface PatchNotesNewsCarouselProps extends Omit<
  NewsCarouselProps,
  "extraItems" | "onDismissExtra"
> {
  /** Newest recorded diff, or `null` when the history DB has nothing yet. */
  latest: LatestChangedBuild | null;
  /** Override the patch-notes localStorage key (keeps tests independent). */
  patchNotesStorageKey?: UseDismissedPatchNotesOptions["storageKey"];
}

/**
 * The home page's news carousel, with the latest patch notes appended as a
 * generated card.
 *
 * It rides the carousel rather than sitting beside it so it looks like what it
 * is — another announcement — and so the carousel's existing height reservation
 * covers it too.
 *
 * Its dismissal is deliberately NOT the carousel's id-based one: hiding this
 * card should hide only the build that was on screen, and a build number
 * compares (see {@link useDismissedPatchNotes}) where an id set only accumulates.
 */
export function PatchNotesNewsCarousel({
  latest,
  patchNotesStorageKey,
  ...carouselProps
}: Readonly<PatchNotesNewsCarouselProps>) {
  const { visible, dismiss } = useDismissedPatchNotes({
    build: latest?.build ?? null,
    storageKey: patchNotesStorageKey,
  });

  return (
    <NewsCarousel
      {...carouselProps}
      extraItems={latest && visible ? [patchNotesNewsItem(latest)] : []}
      onDismissExtra={dismiss}
    />
  );
}
