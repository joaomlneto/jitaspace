// Generates the iOS apple-touch-startup-image splash screens referenced by the
// SPLASH_SCREENS list in app/layout.tsx.
//
// Each image is the app logo centered on the dark theme background, sized to
// the device's physical resolution (portrait). Landscape launches fall back to
// the manifest background_color, so only portrait images are produced.
//
// Requires sharp:  pnpm add -D sharp
// Run:            node scripts/generate-ios-splash.mjs

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");
const outDir = join(publicDir, "splash");
const logo = join(publicDir, "logo-512-upscaled.png");

const BACKGROUND = { r: 4, g: 7, b: 12, alpha: 1 }; // #04070c

// name + physical (portrait) pixel dimensions. Keep in sync with SPLASH_SCREENS.
const devices = [
  { name: "iphone-se", w: 750, h: 1334 },
  { name: "iphone-8plus", w: 1242, h: 2208 },
  { name: "iphone-xr", w: 828, h: 1792 },
  { name: "iphone-x", w: 1125, h: 2436 },
  { name: "iphone-xsmax", w: 1242, h: 2688 },
  { name: "iphone-12", w: 1170, h: 2532 },
  { name: "iphone-14plus", w: 1284, h: 2778 },
  { name: "iphone-15pro", w: 1179, h: 2556 },
  { name: "iphone-15promax", w: 1290, h: 2796 },
  { name: "ipad-10", w: 1620, h: 2160 },
  { name: "ipad-pro11", w: 1668, h: 2388 },
  { name: "ipad-pro12", w: 2048, h: 2732 },
];

await mkdir(outDir, { recursive: true });

for (const { name, w, h } of devices) {
  const side = Math.round(Math.min(w, h) * 0.3);
  const resizedLogo = await sharp(logo).resize(side, side).png().toBuffer();

  await sharp({
    create: { width: w, height: h, channels: 4, background: BACKGROUND },
  })
    .composite([{ input: resizedLogo, gravity: "centre" }])
    .png()
    .toFile(join(outDir, `${name}.png`));
}

console.log(`Generated ${devices.length} splash screens in ${outDir}`);
