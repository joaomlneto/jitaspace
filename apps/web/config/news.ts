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
  {
    // 1. EVE expansion note (replace `image` with the real expansion key art).
    id: "expansion-revenant",
    title: "EVE expansion: Revenant",
    message:
      "New ships, modules and dogma attributes are live — browse the updated items in JitaSpace.",
    date: "2026-06-04",
    color: "red",
    image: "https://images.evetech.net/types/671/render?size=512",
    link: { label: "See what changed", href: "/categories" },
  },
  {
    // 2. New feature.
    id: "lp-store-launch",
    title: "New tool: LP Store browser",
    message:
      "Browse and compare loyalty point store offers across every corporation.",
    date: "2026-06-01",
    color: "violet",
    image: "https://images.evetech.net/types/587/render?size=512",
    link: { label: "Open LP Store", href: "/lp-store" },
  },
  {
    // 2. New feature.
    id: "ship-scanner-launch",
    title: "New tool: Ship Scanner",
    message:
      "Paste a ship scan result to identify the fitting and modules instantly.",
    date: "2026-05-28",
    color: "teal",
    image: "https://images.evetech.net/types/11567/render?size=512",
    link: { label: "Try Ship Scanner", href: "/ship-scanner" },
  },
  {
    // 2. Fix / improvement.
    id: "market-improvements",
    title: "Faster market browser",
    message:
      "Regional market data now loads quicker, with clearer buy and sell breakdowns.",
    date: "2026-05-20",
    color: "green",
    image: "https://images.evetech.net/types/638/render?size=512",
    link: { label: "Open Market", href: "/market" },
  },
  {
    // 3. Support reminder (no image -> renders as a solid accent banner).
    id: "support-jitaspace",
    title: "Enjoying JitaSpace?",
    message:
      "JitaSpace is free and ad-light. If it's useful to you, consider supporting development.",
    date: "2026-05-15",
    color: "pink",
    link: { label: "Support the project", href: "/about" },
  },
  {
    // 2. Developer-facing feature (external link).
    id: "sde-openapi",
    title: "An OpenAPI for the SDE",
    message:
      "Integrate the EVE Static Data Export into your apps — no database required.",
    date: "2026-04-10",
    color: "blue",
    image: "https://images.evetech.net/types/24692/render?size=512",
    link: { label: "Learn more", href: "https://sde.jita.space", external: true },
  },
  {
    // 1. Operational notice (no image, no link).
    id: "esi-maintenance-2026-06",
    title: "Scheduled ESI maintenance",
    message:
      "Some character data may be temporarily unavailable on Saturday at 14:00 EVE.",
    date: "2026-06-05",
    color: "orange",
  },
];
