"use client";

import Link from "next/link";
import { Alert, Button, Group, Text } from "@mantine/core";
import { IconArrowRight, IconFileDiff } from "@tabler/icons-react";

import type { UseDismissedPatchNotesOptions } from "./useDismissedPatchNotes";
import type { LatestChangedBuild } from "~/lib/history";
import { formatNewsDate } from "~/components/News/formatNewsDate";
import { useDismissedPatchNotes } from "./useDismissedPatchNotes";

export interface LatestPatchNotesBannerProps extends Omit<
  UseDismissedPatchNotesOptions,
  "build"
> {
  /** Newest recorded diff, or `null` when the history DB has nothing yet. */
  latest: LatestChangedBuild | null;
}

/**
 * One-line summary of a diff, e.g. `12,345 changes to EVE's static data on Aug
 * 14, 2026.` — built as a single string rather than as JSX text so the spacing
 * is explicit rather than at the mercy of JSX whitespace collapsing.
 *
 * The count is formatted in a pinned locale, not the ambient one: this banner is
 * server-rendered and then hydrated, and a Node/browser disagreement over digit
 * grouping ("12,345" vs "12.345") would be a hydration mismatch.
 */
export function describeDiff({
  changeCount,
  date,
}: LatestChangedBuild): string {
  const count = changeCount.toLocaleString("en-US");
  const noun = changeCount === 1 ? "change" : "changes";
  const when = date ? ` on ${formatNewsDate(date)}` : "";
  return `${count} ${noun} to EVE's static data${when}.`;
}

/**
 * Home-page banner announcing the most recent set of EVE static-data changes,
 * linking to that build's diff at `/history/build/{build}`.
 *
 * Hideable, but only until CCP ships another build: the dismissal records the
 * build number (see {@link useDismissedPatchNotes}), so a newer diff brings the
 * banner back without the user having to do anything.
 */
export function LatestPatchNotesBanner({
  latest,
  storageKey,
}: Readonly<LatestPatchNotesBannerProps>) {
  const { visible, mounted, dismiss } = useDismissedPatchNotes({
    build: latest?.build ?? null,
    storageKey,
  });

  if (!latest) return null;
  // Dismissed (and still the same build) ⇒ nothing to show.
  if (mounted && !visible) return null;

  // Before mount the dismissal isn't readable (localStorage), so render the real
  // banner but invisible. That reserves its exact height — no guessed pixel
  // constant — so the common case (not dismissed) hydrates with no layout shift.
  const reserving = !mounted;

  return (
    <Alert
      variant="light"
      color="blue"
      radius="md"
      icon={<IconFileDiff size={24} />}
      title={`Patch notes — EVE build ${latest.build}`}
      withCloseButton
      closeButtonLabel="Hide until the next build"
      onClose={dismiss}
      aria-hidden={reserving || undefined}
      style={reserving ? { visibility: "hidden" } : undefined}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm" c="dimmed">
          {describeDiff(latest)}
        </Text>
        <Button
          component={Link}
          href={`/history/build/${latest.build}`}
          size="xs"
          variant="light"
          rightSection={<IconArrowRight size={14} />}
        >
          View the diff
        </Button>
      </Group>
    </Alert>
  );
}
