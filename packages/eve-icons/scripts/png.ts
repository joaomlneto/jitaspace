import { inflateSync } from "node:zlib";

export interface PngInfo {
  width: number;
  height: number;
  /**
   * Whether every visible pixel is (nearly) the same colour, so the image's
   * shape lives entirely in its alpha channel and it can be re-coloured with a
   * CSS mask without losing detail. `false` whenever it cannot be decided
   * (16-bit, sub-byte or interlaced images).
   */
  monochrome: boolean;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Pixels at or below this alpha are treated as background. */
const VISIBLE_ALPHA = 64;
/** Largest per-channel distance from the mean colour still counted as "the same". */
const CHANNEL_TOLERANCE = 40;
/** Share of visible pixels that must match the mean colour. */
const MONOCHROME_SHARE = 0.97;

const CHANNELS: Partial<Record<number, number>> = {
  0: 1, // greyscale
  2: 3, // RGB
  3: 1, // palette
  4: 2, // greyscale + alpha
  6: 4, // RGBA
};

/** Read a PNG's dimensions and decide whether it is a single-colour glyph. */
export function readPng(bytes: Uint8Array): PngInfo {
  if (!SIGNATURE.every((byte, i) => bytes[i] === byte)) {
    throw new Error("Not a PNG file");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette: Uint8Array | undefined;
  let transparency: Uint8Array | undefined;
  const data: Uint8Array[] = [];

  for (let offset = 8; offset + 8 <= bytes.length; ) {
    const length = view.getUint32(offset);
    const type = String.fromCodePoint(
      ...bytes.subarray(offset + 4, offset + 8),
    );
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      bitDepth = chunk[8] ?? 0;
      colorType = chunk[9] ?? 0;
      interlace = chunk[12] ?? 0;
    } else if (type === "PLTE") palette = chunk;
    else if (type === "tRNS") transparency = chunk;
    else if (type === "IDAT") data.push(chunk);
    else if (type === "IEND") break;
    offset += 12 + length;
  }

  const channels = CHANNELS[colorType];
  if (bitDepth !== 8 || interlace !== 0 || channels === undefined) {
    return { width, height, monochrome: false };
  }

  const pixels = unfilter(
    inflateSync(Buffer.concat(data)),
    width,
    height,
    channels,
  );
  const at = (i: number) => pixels[i] ?? 0;
  const rgba = (i: number): [number, number, number, number] => {
    const p = i * channels;
    switch (colorType) {
      case 6:
        return [at(p), at(p + 1), at(p + 2), at(p + 3)];
      case 2:
        return [at(p), at(p + 1), at(p + 2), 255];
      case 4:
        return [at(p), at(p), at(p), at(p + 1)];
      case 0:
        return [at(p), at(p), at(p), 255];
      default: {
        const index = at(p);
        return [
          palette?.[index * 3] ?? 0,
          palette?.[index * 3 + 1] ?? 0,
          palette?.[index * 3 + 2] ?? 0,
          transparency?.[index] ?? 255,
        ];
      }
    }
  };

  const visible: [number, number, number][] = [];
  for (let i = 0; i < width * height; i++) {
    const [r, g, b, a] = rgba(i);
    if (a > VISIBLE_ALPHA) visible.push([r, g, b]);
  }
  if (visible.length === 0) return { width, height, monochrome: false };

  const mean = [0, 1, 2].map(
    (c) => visible.reduce((sum, px) => sum + (px[c] ?? 0), 0) / visible.length,
  );
  const matching = visible.filter((px) =>
    px.every(
      (value, c) => Math.abs(value - (mean[c] ?? 0)) < CHANNEL_TOLERANCE,
    ),
  ).length;

  return {
    width,
    height,
    monochrome: matching / visible.length > MONOCHROME_SHARE,
  };
}

/** The Paeth predictor: whichever neighbour is closest to `left + up - upLeft`. */
function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const dl = Math.abs(estimate - left);
  const du = Math.abs(estimate - up);
  const dul = Math.abs(estimate - upLeft);
  if (dl <= du && dl <= dul) return left;
  if (du <= dul) return up;
  return upLeft;
}

/** The value PNG filter `filter` predicted for a sample from its neighbours. */
function predict(
  filter: number | undefined,
  left: number,
  up: number,
  upLeft: number,
): number {
  switch (filter) {
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return (left + up) >> 1;
    case 4:
      return paeth(left, up, upLeft);
    default:
      return 0;
  }
}

/** Undo PNG's per-scanline filters (filter types 0–4), returning raw samples. */
function unfilter(
  raw: Uint8Array,
  width: number,
  height: number,
  bpp: number,
): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    const prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? (out[row + x - bpp] ?? 0) : 0;
      const up = y > 0 ? (out[prev + x] ?? 0) : 0;
      const upLeft = x >= bpp && y > 0 ? (out[prev + x - bpp] ?? 0) : 0;
      out[row + x] =
        ((raw[src + x] ?? 0) + predict(filter, left, up, upLeft)) & 0xff;
    }
  }
  return out;
}

/**
 * Ancillary chunks that carry only text or bookkeeping (XMP and other text
 * metadata, physical DPI, last-modified time) and never change how a browser
 * draws the image. Colour-management chunks (`iCCP`, `gAMA`, `sRGB`, `cHRM`)
 * are deliberately kept.
 */
const NON_RENDERING_CHUNKS = new Set(["iTXt", "tEXt", "zTXt", "tIME", "pHYs"]);

/**
 * Drop {@link NON_RENDERING_CHUNKS} from a PNG. The pixels and colour
 * information are untouched; about a quarter of the client's icon bytes are
 * Adobe XMP metadata, which would otherwise be inlined into every page.
 */
export function stripMetadata(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kept: Uint8Array[] = [bytes.subarray(0, 8)];
  for (let offset = 8; offset + 8 <= bytes.length; ) {
    const length = view.getUint32(offset);
    const type = String.fromCodePoint(
      ...bytes.subarray(offset + 4, offset + 8),
    );
    const end = offset + 12 + length;
    if (!NON_RENDERING_CHUNKS.has(type)) kept.push(bytes.subarray(offset, end));
    offset = end;
  }
  return Buffer.concat(kept);
}
