import { decodeBC1, decodeBC2, decodeBC3, decodeBC4, decodeBC5 } from "./bc";
import { decodeBC6H, decodeBC7, halfToFloat, tonemapToSrgb8 } from "./bptc";

/**
 * Parsed DDS (DirectDraw Surface) header metadata. EVE ships ~30k `.dds`
 * textures across block-compressed, plain-integer, float/HDR, and cubemap forms.
 */
export interface DdsInfo {
  width: number;
  height: number;
  mipMapCount: number;
  /** FourCC of the legacy pixel format, e.g. `DXT5`, `ATI1`, `DX10`, or `""`. */
  fourCC: string;
  /** Human-readable resolved format, e.g. `BC7`, `RGBA16F`, `uncompressed`. */
  format: string;
  /** A cubemap (6 faces); {@link decodeDds} lays the faces out as a strip. */
  cubemap: boolean;
  /** Number of surfaces per mip chain (6 for a cubemap, else 1). */
  faceCount: number;
  /** Whether {@link decodeDds} can turn this format into pixels. */
  decodable: boolean;
}

// "DDS " little-endian.
const DDS_MAGIC = 0x20534444;
const DDPF_ALPHAPIXELS = 0x1;
const DDPF_ALPHA = 0x2;
const DDPF_FOURCC = 0x4;
const DDPF_RGB = 0x40;
const DDPF_LUMINANCE = 0x20000;
const DDSCAPS2_CUBEMAP = 0x200;
const DX10_MISC_CUBEMAP = 0x4;

interface ChannelMasks {
  r: number;
  g: number;
  b: number;
  a: number;
}
type FloatLayout =
  | "f16x1"
  | "f16x2"
  | "f16x3"
  | "f16x4"
  | "f32x1"
  | "f32x2"
  | "f32x3"
  | "f32x4"
  | "r11g11b10";

type Surface =
  | { kind: "bc"; name: string; signed: boolean; blockBytes: number }
  | {
      kind: "int";
      bytesPerPixel: number;
      masks: ChannelMasks;
      luminance: boolean;
    }
  | { kind: "float"; bytesPerPixel: number; layout: FloatLayout };

function readFourCC(view: DataView): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    const c = view.getUint8(84 + i);
    if (c) s += String.fromCharCode(c);
  }
  return s.trim();
}

const bc = (name: string, signed = false): Surface => ({
  kind: "bc",
  name,
  signed,
  blockBytes: name === "BC1" || name === "BC4" ? 8 : 16,
});
const FLOAT_CHANNEL_BYTES: Record<FloatLayout, number> = {
  f16x1: 2,
  f16x2: 4,
  f16x3: 6,
  f16x4: 8,
  f32x1: 4,
  f32x2: 8,
  f32x3: 12,
  f32x4: 16,
  r11g11b10: 4,
};
const flt = (layout: FloatLayout): Surface => ({
  kind: "float",
  bytesPerPixel: FLOAT_CHANNEL_BYTES[layout],
  layout,
});
const int = (
  bytesPerPixel: number,
  masks: ChannelMasks,
  luminance = false,
): Surface => ({ kind: "int", bytesPerPixel, masks, luminance });

/** DX10 `DXGI_FORMAT` → surface descriptor (or `null` if unsupported). */
function classifyDxgi(d: number): Surface | null {
  if (d >= 70 && d <= 73) return bc("BC1");
  if (d >= 74 && d <= 76) return bc("BC2");
  if (d >= 77 && d <= 79) return bc("BC3");
  if (d >= 80 && d <= 82) return bc("BC4");
  if (d >= 83 && d <= 85) return bc("BC5");
  if (d === 95 || d === 96) return bc("BC6H", d === 96);
  if (d === 98 || d === 99) return bc("BC7");
  // Float.
  if (d === 2) return flt("f32x4");
  if (d === 6) return flt("f32x3");
  if (d === 10) return flt("f16x4");
  if (d === 16) return flt("f32x2");
  if (d === 26) return flt("r11g11b10");
  if (d === 34) return flt("f16x2");
  if (d === 41) return flt("f32x1");
  if (d === 54) return flt("f16x1");
  // Integer.
  if (d === 28 || d === 29) {
    return int(4, { r: 0xff, g: 0xff00, b: 0xff0000, a: 0xff000000 });
  }
  if (d === 87 || d === 91) {
    return int(4, { r: 0xff0000, g: 0xff00, b: 0xff, a: 0xff000000 });
  }
  if (d === 24) {
    return int(4, { r: 0x3ff, g: 0xffc00, b: 0x3ff00000, a: 0xc0000000 });
  }
  if (d === 49) return int(2, { r: 0xff, g: 0xff00, b: 0, a: 0 });
  if (d === 61) return int(1, { r: 0xff, g: 0, b: 0, a: 0 }, true);
  if (d === 56) return int(2, { r: 0xffff, g: 0, b: 0, a: 0 }, true);
  return null;
}

/** Legacy `D3DFMT` float FourCC codes (stored as a numeric FourCC). */
function classifyLegacyFloat(fourCC: string): Surface | null {
  switch (fourCC.charCodeAt(0)) {
    case 111:
      return flt("f16x1");
    case 112:
      return flt("f16x2");
    case 113:
      return flt("f16x4");
    case 114:
      return flt("f32x1");
    case 115:
      return flt("f32x2");
    case 116:
      return flt("f32x4");
    default:
      return null;
  }
}

function classifyFourCC(view: DataView, fourCC: string): Surface | null {
  switch (fourCC) {
    case "DXT1":
      return bc("BC1");
    case "DXT2":
    case "DXT3":
      return bc("BC2");
    case "DXT4":
    case "DXT5":
      return bc("BC3");
    case "ATI1":
    case "BC4U":
      return bc("BC4");
    case "BC4S":
      return bc("BC4", true);
    case "ATI2":
    case "BC5U":
      return bc("BC5");
    case "BC5S":
      return bc("BC5", true);
    case "DX10":
      return classifyDxgi(view.getUint32(128, true));
    default:
      return classifyLegacyFloat(fourCC);
  }
}

/** Default channel masks for a maskless integer surface, by bit depth. */
function defaultMasks(bitCount: number): ChannelMasks | null {
  if (bitCount === 32) {
    return { r: 0xff0000, g: 0xff00, b: 0xff, a: 0xff000000 };
  }
  if (bitCount === 24) return { r: 0xff0000, g: 0xff00, b: 0xff, a: 0 };
  if (bitCount === 16) return { r: 0xf800, g: 0x7e0, b: 0x1f, a: 0 };
  return null;
}

/** Classify the on-disk pixel format into a decodable surface descriptor. */
function classifySurface(view: DataView): Surface | null {
  const flags = view.getUint32(80, true);
  const fourCC = readFourCC(view);
  if (flags & DDPF_FOURCC) return classifyFourCC(view, fourCC);

  const bitCount = view.getUint32(88, true);
  const bytesPerPixel = Math.max(1, bitCount >> 3);
  // Alpha-only (A8): present its alpha as grayscale.
  if (flags & DDPF_ALPHA && !(flags & DDPF_RGB)) {
    const aMask = view.getUint32(104, true) || 0xff;
    return int(bytesPerPixel, { r: aMask, g: 0, b: 0, a: 0 }, true);
  }
  if (!(flags & (DDPF_RGB | DDPF_LUMINANCE))) return null;

  const luminance = (flags & DDPF_LUMINANCE) !== 0;
  let masks: ChannelMasks = {
    r: view.getUint32(92, true),
    g: view.getUint32(96, true),
    b: view.getUint32(100, true),
    a:
      (flags & DDPF_ALPHAPIXELS) | (flags & DDPF_ALPHA)
        ? view.getUint32(104, true)
        : 0,
  };
  if (!masks.r && !masks.g && !masks.b) {
    const fallback = luminance
      ? { r: (1 << bitCount) - 1, g: 0, b: 0, a: 0 }
      : defaultMasks(bitCount);
    if (!fallback) return null;
    masks = fallback;
  }
  return int(bytesPerPixel, masks, luminance && !masks.g && !masks.b);
}

function formatLabel(
  surface: Surface | null,
  fourCC: string,
  view: DataView,
): string {
  if (!surface) {
    if (fourCC === "DX10") return `dxgi-${view.getUint32(128, true)}`;
    return fourCC || "unknown";
  }
  if (surface.kind === "bc") return surface.name;
  if (surface.kind === "int") return "uncompressed";
  const names: Record<FloatLayout, string> = {
    f16x1: "R16F",
    f16x2: "RG16F",
    f16x3: "RGB16F",
    f16x4: "RGBA16F",
    f32x1: "R32F",
    f32x2: "RG32F",
    f32x3: "RGB32F",
    f32x4: "RGBA32F",
    r11g11b10: "R11G11B10F",
  };
  return names[surface.layout];
}

/** Parse a DDS header, or `null` if the bytes are not a DDS file. */
export function parseDdsHeader(bytes: Uint8Array): DdsInfo | null {
  if (bytes.length < 128) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== DDS_MAGIC) return null;

  const height = view.getUint32(12, true);
  const width = view.getUint32(16, true);
  const mipMapCount = view.getUint32(28, true);
  const fourCC = readFourCC(view);
  const surface = classifySurface(view);

  let cubemap = (view.getUint32(112, true) & DDSCAPS2_CUBEMAP) !== 0;
  if (fourCC === "DX10" && bytes.length >= 144) {
    cubemap ||= (view.getUint32(136, true) & DX10_MISC_CUBEMAP) !== 0;
  }

  return {
    width,
    height,
    mipMapCount,
    fourCC,
    format: formatLabel(surface, fourCC, view),
    cubemap,
    faceCount: cubemap ? 6 : 1,
    decodable: surface !== null,
  };
}

export type DdsDecodeResult =
  | {
      ok: true;
      width: number;
      height: number;
      rgba: Uint8Array;
      format: string;
    }
  | { ok: false; format: string; reason: string; info: DdsInfo | null };

function trailingZeros(mask: number): number {
  if (mask === 0) return 0;
  return Math.log2(mask & -mask) | 0;
}

/** Extract one channel (any contiguous mask) and scale it to 8-bit. */
function channel8(pixel: number, mask: number): number {
  if (mask === 0) return 0;
  const shift = trailingZeros(mask);
  const max = mask / 2 ** shift; // contiguous mask → (1 << bits) - 1
  const raw = Math.floor(pixel / 2 ** shift) % (max + 1);
  return Math.round((raw * 255) / max);
}

function readUintLE(view: DataView, offset: number, bytes: number): number {
  let value = 0;
  let scale = 1;
  for (let i = 0; i < bytes; i++) {
    value += view.getUint8(offset + i) * scale;
    scale *= 256;
  }
  return value;
}

function decodeIntSurface(
  view: DataView,
  offset: number,
  width: number,
  height: number,
  s: Extract<Surface, { kind: "int" }>,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const bpp = s.bytesPerPixel;
  for (let i = 0; i < width * height; i++) {
    const at = offset + i * bpp;
    const px = bpp === 4 ? view.getUint32(at, true) : readUintLE(view, at, bpp);
    const o = i * 4;
    const r = channel8(px, s.masks.r);
    if (s.luminance) {
      out[o] = out[o + 1] = out[o + 2] = r;
    } else {
      out[o] = r;
      out[o + 1] = channel8(px, s.masks.g);
      out[o + 2] = channel8(px, s.masks.b);
    }
    out[o + 3] = s.masks.a ? channel8(px, s.masks.a) : 255;
  }
  return out;
}

function unpackMiniFloat(
  bits: number,
  mantBits: number,
  expBits: number,
): number {
  const mantMax = 2 ** mantBits;
  const bias = 2 ** (expBits - 1) - 1;
  const exp = Math.floor(bits / mantMax) % 2 ** expBits;
  const mant = bits % mantMax;
  if (exp === 0) return mant === 0 ? 0 : (mant / mantMax) * 2 ** (1 - bias);
  if (exp === 2 ** expBits - 1) return mant ? NaN : Infinity;
  return (1 + mant / mantMax) * 2 ** (exp - bias);
}

function readFloatPixel(
  view: DataView,
  at: number,
  layout: FloatLayout,
): [number, number, number, number] {
  if (layout === "r11g11b10") {
    const u = view.getUint32(at, true);
    return [
      unpackMiniFloat(u & 0x7ff, 6, 5),
      unpackMiniFloat((u >>> 11) & 0x7ff, 6, 5),
      unpackMiniFloat((u >>> 22) & 0x3ff, 5, 5),
      1,
    ];
  }
  const half = layout.startsWith("f16");
  const size = half ? 2 : 4;
  const channels = Number(layout[layout.length - 1]);
  const read = (c: number): number => {
    const o = at + c * size;
    return half
      ? halfToFloat(view.getUint16(o, true))
      : view.getFloat32(o, true);
  };
  const c0 = read(0);
  if (channels === 1) return [c0, c0, c0, 1];
  if (channels === 2) return [c0, read(1), 0, 1];
  if (channels === 3) return [c0, read(1), read(2), 1];
  return [c0, read(1), read(2), read(3)];
}

function decodeFloatSurface(
  view: DataView,
  offset: number,
  width: number,
  height: number,
  s: Extract<Surface, { kind: "float" }>,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const [r, g, b, a] = readFloatPixel(
      view,
      offset + i * s.bytesPerPixel,
      s.layout,
    );
    const o = i * 4;
    out[o] = tonemapToSrgb8(r);
    out[o + 1] = tonemapToSrgb8(g);
    out[o + 2] = tonemapToSrgb8(b);
    out[o + 3] = Math.max(
      0,
      Math.min(255, Math.round((Number.isFinite(a) ? a : 1) * 255)),
    );
  }
  return out;
}

const BC_DECODERS: Record<
  string,
  (d: Uint8Array, w: number, h: number) => Uint8Array
> = {
  BC1: decodeBC1,
  BC2: decodeBC2,
  BC3: decodeBC3,
  BC4: decodeBC4,
  BC5: decodeBC5,
  BC7: decodeBC7,
};

/** Decode a single surface (one cubemap face / the top mip) to RGBA8. */
function decodeSurface(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  width: number,
  height: number,
  s: Surface,
): Uint8Array | null {
  if (s.kind === "int") return decodeIntSurface(view, offset, width, height, s);
  if (s.kind === "float")
    return decodeFloatSurface(view, offset, width, height, s);
  const data = bytes.subarray(offset);
  if (s.name === "BC6H") return decodeBC6H(data, width, height, s.signed);
  const decoder = BC_DECODERS[s.name];
  return decoder ? decoder(data, width, height) : null;
}

/** Byte size of one surface (a face's full mip chain) for offset arithmetic. */
function faceByteSize(
  s: Surface,
  width: number,
  height: number,
  mips: number,
): number {
  let total = 0;
  for (let level = 0; level < mips; level++) {
    const w = Math.max(1, width >> level);
    const h = Math.max(1, height >> level);
    if (s.kind === "bc") {
      total += Math.ceil(w / 4) * Math.ceil(h / 4) * s.blockBytes;
    } else {
      total += w * h * s.bytesPerPixel;
    }
  }
  return total;
}

/**
 * Decode a DDS texture's top mip to RGBA8. Handles block-compressed (BC1–BC7,
 * BC6H), plain-integer (any bit depth, via the pixel-format masks; luminance and
 * alpha-only included), and float/HDR formats (R16F…RGBA32F, R11G11B10,
 * tone-mapped to sRGB). Cubemaps decode all six faces into a horizontal strip.
 */
export function decodeDds(bytes: Uint8Array): DdsDecodeResult {
  const info = parseDdsHeader(bytes);
  if (!info)
    return { ok: false, format: "", reason: "Not a DDS file", info: null };

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const surface = classifySurface(view);
  if (!surface) {
    return {
      ok: false,
      format: info.format,
      reason: `Unsupported DDS format: ${info.format}`,
      info,
    };
  }

  const dataOffset = 128 + (info.fourCC === "DX10" ? 20 : 0);
  const { width, height } = info;
  const mips = Math.max(1, info.mipMapCount || 1);

  try {
    if (!info.cubemap) {
      const rgba = decodeSurface(
        bytes,
        view,
        dataOffset,
        width,
        height,
        surface,
      );
      if (!rgba)
        return {
          ok: false,
          format: info.format,
          reason: `Could not decode ${info.format}`,
          info,
        };
      return { ok: true, width, height, rgba, format: info.format };
    }

    // Cubemap: lay the six faces out left-to-right as a single strip.
    const faceSize = faceByteSize(surface, width, height, mips);
    const stripWidth = width * info.faceCount;
    const rgba = new Uint8Array(stripWidth * height * 4);
    for (let face = 0; face < info.faceCount; face++) {
      const faceRgba = decodeSurface(
        bytes,
        view,
        dataOffset + face * faceSize,
        width,
        height,
        surface,
      );
      if (!faceRgba) {
        return {
          ok: false,
          format: info.format,
          reason: `Could not decode ${info.format}`,
          info,
        };
      }
      const rowBytes = width * 4;
      for (let y = 0; y < height; y++) {
        const dst = (y * stripWidth + face * width) * 4;
        rgba.set(faceRgba.subarray(y * rowBytes, y * rowBytes + rowBytes), dst);
      }
    }
    return {
      ok: true,
      width: stripWidth,
      height,
      rgba,
      format: `${info.format} cubemap`,
    };
  } catch (error) {
    return {
      ok: false,
      format: info.format,
      reason: (error as Error).message,
      info,
    };
  }
}
