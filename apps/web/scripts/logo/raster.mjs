// Rasterises an image of the logo for the fitting scripts, which read PNGs:
//
//   node scripts/logo/raster.mjs <in.png|in.svg> <out.png> <width> <height>
//
// A PNG is resized; an SVG is drawn by librsvg, the renderer that also makes
// the app's PNG icons (generate-logo-assets.mjs), then resized to the exact
// size. Both use the same cubic kernel.

import sharp from "sharp";

const [source, target, widthArg, heightArg] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
if (!source || !target || !(width > 0) || !(height > 0)) {
  console.error(
    "usage: node raster.mjs <in.png|in.svg> <out.png> <width> <height>",
  );
  process.exit(1);
}

// The logo is 168 units tall, and librsvg draws 1 unit per pixel at 72 dpi.
const options = source.endsWith(".svg") ? { density: (72 * height) / 168 } : {};
await sharp(source, options)
  .ensureAlpha()
  .resize({ width, height, fit: "fill", kernel: "cubic" })
  .png({ compressionLevel: 9 })
  .toFile(target);
console.log("wrote", target);
