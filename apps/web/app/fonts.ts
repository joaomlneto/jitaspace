import { JetBrains_Mono, Rajdhani } from "next/font/google";

/**
 * Web fonts for the EVE v2 theme (`themes/eve-v2.ts`), self-hosted by
 * next/font — the CSP's `font-src 'self'` would block Google's own CDN. Each
 * exposes a CSS variable the theme's font stacks start with; the root layout
 * puts the variables on <html>.
 *
 * `preload: false` because only EVE v2 uses them: a browser fetches an
 * @font-face file only once text actually renders in that family, so the other
 * themes download nothing, whereas a preload would fetch them for everyone.
 */
export const rajdhani = Rajdhani({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--font-rajdhani",
});

export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono",
});
