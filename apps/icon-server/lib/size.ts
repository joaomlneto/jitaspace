import type { H3Event } from "h3";
import { getQuery } from "h3";
import sharp from "sharp";

/**
 * The requested `?size=`, or `null` when absent/invalid. Matches the official
 * image server: a power of two in [32, 1024]. Anything else is ignored (we serve
 * the native size) rather than erroring.
 */
export function parseSize(event: H3Event): number | null {
  const raw = getQuery(event).size;
  const size = typeof raw === "string" ? Number(raw) : NaN;
  const valid =
    Number.isInteger(size) &&
    size >= 32 &&
    size <= 1024 &&
    (size & (size - 1)) === 0;
  return valid ? size : null;
}

/**
 * Resize image bytes to fit a `size`×`size` box (aspect preserved, no crop) and
 * re-encode as PNG. Icons are square, so this yields exactly `size`×`size`.
 */
export async function resizeToPng(
  bytes: Buffer,
  size: number,
): Promise<Buffer> {
  return sharp(bytes).resize(size, size, { fit: "inside" }).png().toBuffer();
}

/**
 * Resize image bytes to a `size`×`size` JPEG — used for renders, which the image
 * server serves as JPEG (and which have no transparency to preserve).
 */
export async function resizeToJpeg(
  bytes: Buffer,
  size: number,
): Promise<Buffer> {
  return sharp(bytes).resize(size, size, { fit: "inside" }).jpeg().toBuffer();
}
