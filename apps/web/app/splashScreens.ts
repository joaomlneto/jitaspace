// iOS doesn't read the manifest's splash config — it needs an
// apple-touch-startup-image per device resolution. The images are generated
// into public/splash/ by scripts/generate-ios-splash.mjs. Kept here (rather
// than inline in layout.tsx) so the link-building logic is unit-testable.

export interface SplashScreen {
  /** Basename of the generated image in /public/splash. */
  name: string;
  /** Device width in CSS pixels. */
  width: number;
  /** Device height in CSS pixels. */
  height: number;
  /** Device pixel ratio. */
  ratio: number;
}

export const splashScreens: SplashScreen[] = [
  { name: "iphone-se", width: 375, height: 667, ratio: 2 },
  { name: "iphone-8plus", width: 414, height: 736, ratio: 3 },
  { name: "iphone-xr", width: 414, height: 896, ratio: 2 },
  { name: "iphone-x", width: 375, height: 812, ratio: 3 },
  { name: "iphone-xsmax", width: 414, height: 896, ratio: 3 },
  { name: "iphone-12", width: 390, height: 844, ratio: 3 },
  { name: "iphone-14plus", width: 428, height: 926, ratio: 3 },
  { name: "iphone-15pro", width: 393, height: 852, ratio: 3 },
  { name: "iphone-15promax", width: 430, height: 932, ratio: 3 },
  { name: "ipad-10", width: 810, height: 1080, ratio: 2 },
  { name: "ipad-pro11", width: 834, height: 1194, ratio: 2 },
  { name: "ipad-pro12", width: 1024, height: 1366, ratio: 2 },
];

/** Builds the href + media query for an `apple-touch-startup-image` link. */
export function splashScreenLink(screen: SplashScreen): {
  href: string;
  media: string;
} {
  return {
    href: `/splash/${screen.name}.png`,
    media:
      `screen and (device-width: ${screen.width}px) ` +
      `and (device-height: ${screen.height}px) ` +
      `and (-webkit-device-pixel-ratio: ${screen.ratio}) ` +
      `and (orientation: portrait)`,
  };
}
