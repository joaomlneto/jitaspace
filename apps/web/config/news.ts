import { CSM_21_RED } from "./csm";

export interface NewsItem {
  /** Stable, unique id — used to remember dismissal in localStorage. Never reuse. */
  id: string;
  /** Short headline. */
  title: string;
  /** One or two lines of supporting text. Keep it brief. */
  message: string;
  /** ISO date (YYYY-MM-DD). Shown as a short label. */
  date?: string;
  /** Mantine color name or CSS color used for the accent badge and CTA button. */
  color?: string;
  /** Optional hero image URL. Drives the "flashiness" of the banner layout. */
  image?: string;
  /** Optional call-to-action link. */
  link?: {
    label: string;
    href: string;
    /** Open in a new tab (external links). */
    external?: boolean;
  };
  /**
   * ISO datetime before which the item stays hidden (scheduled publish time).
   * Lets you prepare an announcement ahead of launch — it becomes visible once
   * this moment passes (evaluated against the visitor's local clock).
   */
  publishAt?: string;
  /** ISO datetime after which the item is hidden automatically. */
  expiresAt?: string;
  /**
   * Cards with a higher priority come first, whatever their publish dates;
   * within a priority the newest is first. Defaults to 0.
   */
  priority?: number;
}

/**
 * News / update items shown at the top of the home page.
 *
 * The carousel shows them by `priority`, then newest first by publish date
 * (`publishAt`, else `date`), so their order here does not matter. Add an entry to publish; remove
 * it (or set `expiresAt`) to retire it. Each `id` must be unique and stable — it is the key used to
 * remember that a user has dismissed the item.
 *
 * The three content categories this is built for:
 *  1. EVE expansion / patch notes — wide key art + a link deep into the app.
 *  2. New features / fixes in JitaSpace — screenshot or ship render + a link.
 *  3. A recurring "support the project" reminder — no image needed.
 */
export const newsItems: NewsItem[] = [
  {
    // CSM 21 election — shown only while the ballot is open: 22 Oct to 3 Nov
    // 2026, downtime (11:00 UTC) to downtime. Ahead of every other card.
    id: "csm-21-voting-open",
    title: "CSM 21 voting is open",
    message:
      "Meet the 53 candidates for the Council of Stellar Management, read their pitches and watch their interviews. Voting closes on 3 November.",
    date: "2026-10-22",
    publishAt: "2026-10-22T11:00:00Z",
    expiresAt: "2026-11-03T11:00:00Z",
    priority: 100,
    color: CSM_21_RED,
    // A 1280x720 WebP of the unbranded key art.
    image: "/wallpapers/2026-csm-21/csm-21-nologo-banner.webp",
    link: {
      label: "Meet the candidates",
      href: "/csm",
    },
  },
  {
    // Seasonal event — shown only while it runs: 6 Oct to 3 Nov 2026, downtime
    // (11:00 UTC) to downtime.
    id: "event-crimson-harvest-2026",
    title: "Crimson Harvest",
    message:
      "Side with the Blood Raiders or the Order of St. Tetrimon and earn exclusive SKINs and an Akoman blueprint. Runs until 3 November.",
    date: "2026-10-06",
    publishAt: "2026-10-06T11:00:00Z",
    expiresAt: "2026-11-03T11:00:00Z",
    // The Crimson Harvest theme's crimson.7. Its crimson.6 (#f01408) takes
    // neither dark nor light text at 4.5:1 when the badge and button are
    // filled; this takes light text at 5.6:1.
    color: "#c80e05",
    // A 1280x720 WebP (79 KB) of the event key art: the card is never wider
    // than ~520 CSS px, and the art's grain compresses poorly at 1600 px.
    image:
      "/wallpapers/2026-crimson-harvest/crimson-harvest-nologo-banner.webp",
    link: {
      label: "Read about the event",
      href: "https://www.eveonline.com/news/view/crimson-harvest-the-bloodgates-are-open",
      external: true,
    },
  },
  {
    // EVE expansion — scheduled: stays hidden until it goes live (9 Jun 2026, 11:00 UTC).
    id: "expansion-cradle-of-war",
    title: "EVE Expansion: Cradle of War",
    message:
      "Military Campaigns, Titles & Achievements, Exordium Starter Space, new Epic Arc, 4 new Command Carriers, 4 new Navy Destroyers.",
    date: "2026-06-09",
    publishAt: "2026-06-09T11:00:00Z",
    color: "#e6923f", // rgb(230, 146, 63)
    // A 1600x900 WebP (52 KB) of the 4K key art (504 KB): the card is never
    // wider than ~520 CSS px, so the original is ~7x more pixels than it can show.
    image:
      "/wallpapers/2026-cradle-of-war/cradle-of-war-nologo-compressed-banner.webp",
    link: {
      label: "Read the expansion notes",
      href: "https://www.eveonline.com/news/view/the-cradle-of-war-expansion-is-here",
      external: true,
    },
  },
];
