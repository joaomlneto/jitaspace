/**
 * Generates the site-wide static OpenGraph/Twitter card at
 * `app/opengraph-image.jpg`.
 *
 * The card is a fixed brand image ("Jita — EVE Online Tools" over the station
 * backdrop), so there is no reason to render it per-request. We render it once
 * here and commit the result; Next.js then serves it as a static asset via the
 * `opengraph-image` file convention (no `@vercel/og` at runtime, no serverless
 * function, no file-tracing of the native module).
 *
 * `@vercel/og` is a dev-only dependency used solely by this script; `sharp` is
 * already a runtime dependency (Next.js image optimization).
 *
 * Regenerate after changing the design or the source images:
 *   pnpm --filter @jitaspace/web generate:og
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { ImageResponse } from "@vercel/og";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");
const outFile = join(here, "..", "app", "opengraph-image.jpg");

const dataUri = (file, mime) =>
  `data:${mime};base64,${readFileSync(join(publicDir, file)).toString("base64")}`;

const background = dataUri("og-background.jpg", "image/jpeg");
const logo = dataUri("logo.png", "image/png");

const h = React.createElement;

const card = h(
  "div",
  {
    style: {
      backgroundImage: `linear-gradient(90deg, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0)), url('${background}')`,
      height: "100%",
      width: "100%",
      display: "flex",
      textAlign: "center",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      flexWrap: "nowrap",
    },
  },
  h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    h("img", { src: logo, alt: "Jita logo", height: 200, width: 232 }),
  ),
  h(
    "div",
    {
      style: {
        fontSize: 60,
        letterSpacing: "-0.025em",
        color: "white",
        marginTop: 30,
        padding: "0 120px",
        lineHeight: 1.4,
      },
    },
    "Jita",
  ),
  h(
    "div",
    {
      style: { fontSize: 32, color: "#aaa", padding: "0 120px" },
    },
    "EVE Online Tools",
  ),
);

const png = Buffer.from(
  await new ImageResponse(card, { width: 1200, height: 630 }).arrayBuffer(),
);

// @vercel/og only emits PNG; recompress to JPEG so the card is a fraction of
// the size (the backdrop is photographic and needs no transparency).
const jpg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
writeFileSync(outFile, jpg);

console.log(
  `Wrote ${outFile} (${(jpg.length / 1024).toFixed(0)} KB, from ${(png.length / 1024).toFixed(0)} KB PNG)`,
);
