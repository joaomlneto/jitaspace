import type { MetadataRoute } from "next";

// Stable identity + entry point for the installed PWA. Keeping `id` and
// `start_url` identical (and distinct from "/") lets the browser treat the
// installed app as a single, stable instance.
const PWA_ENTRY = "/?source=pwa";

// Matches the app's dark header background (eve theme `black`) so the native
// title bar (window-controls-overlay) and splash screen blend with the UI.
const DARK_HEADER_BACKGROUND = "#04070c";

// Jump-list entries shown when right-clicking the installed app icon (desktop)
// or long-pressing it (Android). Tagged so their usage is distinguishable from
// regular navigation in analytics. Kept to a focused, high-frequency set — the
// OS only surfaces a handful. Icons are intentionally omitted for now; see
// scripts/generate-shortcut-icons (text-only renders fine without them).
const SHORTCUT_SOURCE = "?source=pwa-shortcut";
const shortcuts: MetadataRoute.Manifest["shortcuts"] = [
  {
    name: "Search",
    short_name: "Search",
    description: "Search characters, corporations, items and tools",
    url: `/search${SHORTCUT_SOURCE}`,
  },
  {
    name: "EveMail",
    description: "Read your in-game mail",
    url: `/mail${SHORTCUT_SOURCE}`,
  },
  {
    name: "Skills",
    description: "Check your skill queue",
    url: `/skills${SHORTCUT_SOURCE}`,
  },
  {
    name: "Wallet",
    description: "View your wallet balance and transactions",
    url: `/wallet/character${SHORTCUT_SOURCE}`,
  },
  {
    name: "Assets",
    description: "Browse your assets",
    url: `/assets/character${SHORTCUT_SOURCE}`,
  },
  {
    name: "Market",
    description: "Browse the EVE Online market",
    url: `/market${SHORTCUT_SOURCE}`,
  },
  {
    name: "Map",
    description: "Explore the New Eden map",
    url: `/regions${SHORTCUT_SOURCE}`,
  },
];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: PWA_ENTRY,
    name: "Jita",
    short_name: "Jita",
    description: "EVE Online Tools and Resources",
    start_url: PWA_ENTRY,
    display: "standalone",
    // Prefer the native title bar on desktop (Chrome/Edge) and fall back to a
    // regular standalone window where window-controls-overlay isn't supported.
    display_override: ["window-controls-overlay", "standalone"],
    background_color: DARK_HEADER_BACKGROUND,
    theme_color: DARK_HEADER_BACKGROUND,
    icons: [
      {
        src: "/logo-192-upscaled.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-512-upscaled.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Maskable variants for Android adaptive icons. Generated from the logo
      // padded into the ~80% safe zone over the dark background; refine at
      // https://maskable.app if the mask crops anything important.
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Install prompts on desktop/mobile show these. Currently branded
    // placeholders at the declared dimensions — replace with real screen
    // captures of the running app at apps/web/public/screenshots/.
    screenshots: [
      {
        src: "/screenshots/desktop-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Jita on desktop",
      },
      {
        src: "/screenshots/mobile-narrow.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "Jita on mobile",
      },
    ],
    shortcuts,
  };
}
