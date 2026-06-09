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
}

/**
 * News / update items shown at the top of the home page.
 *
 * Newest first. Add an entry to publish; remove it (or set `expiresAt`) to
 * retire it. Each `id` must be unique and stable — it is the key used to
 * remember that a user has dismissed the item.
 *
 * The three content categories this is built for:
 *  1. EVE expansion / patch notes — wide key art + a link deep into the app.
 *  2. New features / fixes in JitaSpace — screenshot or ship render + a link.
 *  3. A recurring "support the project" reminder — no image needed.
 */
export const newsItems: NewsItem[] = [
  {
    // EVE expansion — scheduled: stays hidden until it goes live (9 Jun 2026, 11:00 UTC).
    id: "expansion-cradle-of-war",
    title: "EVE Expansion: Cradle of War",
    message:
      "Military Campaigns, Titles & Achievements, Exordium Starter Space, new Epic Arc, 4 new Command Carriers, 4 new Navy Destroyers.",
    date: "2026-06-09",
    publishAt: "2026-06-09T11:00:00Z",
    color: "#e6923f", // rgb(230, 146, 63)
    image:
      "/wallpapers/2026-cradle-of-war/cradle-of-war-nologo-compressed.jpeg",
    link: {
      label: "Read the expansion notes",
      href: "https://www.eveonline.com/news/view/cradle-of-war-expansion-notes",
      external: true,
    },
  },
];
