import type { NewsItem } from "~/config/news";
import type { LatestChangedBuild } from "~/lib/history";

/**
 * Hero art for the patch-notes card: Jita 4-4, the station the app is named
 * after. Deliberately generic — unlike the curated expansion banners, this card
 * is regenerated for every EVE build, so it can't carry release-specific key
 * art. Downscaled and recompressed from `/jita-wallpaper.jpeg` (2.4 MB → 65 KB)
 * because `NewsBannerCard` paints it as a CSS background, which `next/image`
 * never gets to optimise.
 */
export const PATCH_NOTES_BANNER_IMAGE = "/wallpapers/jita-4-4-banner.jpeg";

/**
 * Renders the latest recorded diff as a {@link NewsItem}, so the generated
 * patch-notes card is built by the same component as the hand-written
 * announcements and sits in the same carousel.
 *
 * The count is formatted in a pinned locale rather than the ambient one: this
 * card is server-rendered and then hydrated, and a Node/browser disagreement
 * over digit grouping ("2,024" vs "2.024") would be a hydration mismatch.
 *
 * The `id` embeds the build number so it is stable per build and never collides
 * with a curated item's id — but note that dismissal is NOT keyed on it (see
 * `useDismissedPatchNotes`), so it is only an identity for React and the card's
 * close-button label.
 */
export function patchNotesNewsItem(latest: LatestChangedBuild): NewsItem {
  const count = latest.changeCount.toLocaleString("en-US");
  const noun = latest.changeCount === 1 ? "change" : "changes";
  // The generated sentence says what actually changed; the static one can only
  // count. Prefer it whenever the summarizer has written one — the count is on
  // the card either way, via the date badge and the diff link.
  const message =
    latest.summary ??
    `${count} ${noun} to EVE's static data — items, attributes, blueprints, SKINs and everything else the client ships.`;
  return {
    id: `patch-notes-${latest.build}`,
    title: `Patch Notes: Build ${latest.build}`,
    message,
    ...(latest.date ? { date: latest.date } : {}),
    color: "blue",
    image: PATCH_NOTES_BANNER_IMAGE,
    link: {
      label: "See what changed",
      href: `/history/build/${latest.build}`,
    },
  };
}
