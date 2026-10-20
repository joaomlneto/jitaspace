// Generates every raster copy of the logo from the two SVGs in public/:
//
//   logo.svg        the detailed star, for anything shown larger than ~48px
//   logo-small.svg  8 shading shapes instead of 100 and a thicker border, for
//                   favicons and other small sizes
//
// Outputs: public/logo.png and logo-1080p.png, the web-app manifest icons
// (public/icons/), app/apple-icon.png, the favicons (public/favicon-*.png and
// favicon.ico), and the icon server's copies (apps/icon-server/public/).
// The iOS splash screens are made from public/icons/icon-512.png by
// generate-ios-splash.mjs; run it after this script.
//
// Each image is framed by rewriting the SVG's viewBox rather than by resizing
// and compositing a raster, so the star lands on exact coordinates.
//
// Run: node scripts/generate-logo-assets.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const webDir = join(here, "..");
const publicDir = join(webDir, "public");
const iconServerPublicDir = join(webDir, "..", "icon-server", "public");

const detailed = await readFile(join(publicDir, "logo.svg"), "utf8");
const small = await readFile(join(publicDir, "logo-small.svg"), "utf8");

// The star is a regular pentagram inscribed in this circle (see logo.svg).
const STAR = { cx: 88, cy: 93.58, r: 88.92 };
// Background of the installed app's title bar and splash (app/manifest.ts).
const DARK_BACKGROUND = "#04070c";

/** @typedef {[x: number, y: number, width: number, height: number]} ViewBox */

/**
 * Re-frames an SVG: `viewBox` is in the logo's user units, and the output is
 * `width` x `height` pixels, optionally over a solid background.
 *
 * @param {string} svg
 * @param {ViewBox} viewBox
 * @param {number} width
 * @param {number} height
 * @param {string} [background]
 * @returns {string}
 */
function frame(svg, viewBox, width, height, background) {
  const [x, y, w, h] = viewBox;
  let out = svg.replace(
    /viewBox="[^"]+" width="[^"]+" height="[^"]+"/,
    `viewBox="${x} ${y} ${w} ${h}" width="${width}" height="${height}"`,
  );
  if (background) {
    out = out.replace(
      /(<svg[^>]*>)/,
      `$1<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${background}"/>`,
    );
  }
  return out;
}

/**
 * A square framing with the star's circumscribed circle at `fraction` of the side.
 *
 * @param {number} fraction
 * @returns {ViewBox}
 */
function squareAroundStar(fraction) {
  const side = (2 * STAR.r) / fraction;
  return [STAR.cx - side / 2, STAR.cy - side / 2, side, side];
}

/**
 * A square framing around the star's bounding box (border included), with a margin.
 *
 * @param {number} margin
 * @returns {ViewBox}
 */
function squareAroundBox(margin) {
  // Covers both borders: logo.svg's thin, mitred one spans x 1.9-174.1 and
  // y 3.0-166.8; logo-small.svg's thick, round-joined one x 0.7-175.3 and
  // y 1.9-168.3.
  const box = { x: 0.6, y: 1.9, w: 174.8, h: 166.4 };
  const side = Math.max(box.w, box.h) * (1 + 2 * margin);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return [cx - side / 2, cy - side / 2, side, side];
}

/**
 * @param {string} svg
 * @param {string} file
 */
async function render(svg, file) {
  await sharp(Buffer.from(svg), { density: 72 })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log("wrote", relative(webDir, file));
}

/**
 * @param {string} svg
 * @returns {Promise<Buffer>}
 */
async function renderBuffer(svg) {
  return sharp(Buffer.from(svg), { density: 72 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// The logo at its own size and at 1080px tall, transparent.
await render(detailed, join(publicDir, "logo.png"));
await render(
  frame(detailed, [0, 0, 176, 168], 1132, 1080),
  join(publicDir, "logo-1080p.png"),
);

// Manifest icons: "any" are transparent and fill the square; "maskable" sit on
// the app background with the star inside the 80% safe-zone circle.
for (const size of [192, 512]) {
  await render(
    frame(detailed, squareAroundBox(0.02), size, size),
    join(publicDir, "icons", `icon-${size}.png`),
  );
  await render(
    frame(detailed, squareAroundStar(0.76), size, size, DARK_BACKGROUND),
    join(publicDir, "icons", `icon-${size}-maskable.png`),
  );
}

// iOS home screen: opaque (iOS fills transparency with black) and inset, since
// iOS rounds the corners off.
await render(
  frame(detailed, squareAroundStar(0.8), 180, 180, DARK_BACKGROUND),
  join(webDir, "app", "apple-icon.png"),
);

// Favicons, from the small logo.
const favicons = await Promise.all(
  [16, 32, 48].map(async (size) => ({
    size,
    png: await renderBuffer(frame(small, squareAroundBox(0), size, size)),
  })),
);
/** @param {number} size */
const favicon = (size) => {
  const found = favicons.find((f) => f.size === size);
  if (!found) throw new Error(`no ${size}px favicon`);
  return found.png;
};
await writeFile(join(publicDir, "favicon-16x16.png"), favicon(16));
await writeFile(join(publicDir, "favicon-32x32.png"), favicon(32));
// An .ico holding PNG images (supported by every browser and by Windows since
// Vista): a 6-byte header, a 16-byte entry per image, then the PNGs.
const header = Buffer.alloc(6 + 16 * favicons.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(favicons.length, 4);
let offset = header.length;
favicons.forEach(({ size, png }, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size % 256, entry);
  header.writeUInt8(size % 256, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile(
  join(publicDir, "favicon.ico"),
  Buffer.concat([header, ...favicons.map((f) => f.png)]),
);
console.log("wrote public/favicon-16x16.png, favicon-32x32.png, favicon.ico");

// The round sticker (scripts/logo/sticker.py), at 3000px for print: 1000dpi
// for a 3" sticker.
await render(
  frame(
    await readFile(join(here, "logo", "sticker-round.svg"), "utf8"),
    [0, 0, 1000, 1000],
    3000,
    3000,
  ),
  join(here, "logo", "sticker-round.png"),
);

// The icon server (icons.jita.space) shows the logo on its index page.
await render(detailed, join(iconServerPublicDir, "logo.png"));
await writeFile(join(iconServerPublicDir, "favicon.png"), favicon(32));
console.log(
  "wrote",
  relative(webDir, join(iconServerPublicDir, "favicon.png")),
);
