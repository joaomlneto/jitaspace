/**
 * BPTC block decoders — **BC7** (DXGI `BC7`, LDR RGBA) and **BC6H** (DXGI
 * `BC6H`, HDR RGB). These are the two formats `bc.ts` deliberately leaves out;
 * EVE uses BC7 widely (albedo/decals) and BC6H for HDR cube maps.
 *
 * Both follow the Khronos `texture_compression_bptc` / D3D11 BC6H-BC7 spec:
 * 16-byte blocks, 4x4 texels, read **LSB-first** as a 128-bit little-endian
 * value. They share the partition and anchor tables below.
 *
 * BC7 decodes to exact RGBA8. BC6H is HDR (half-float RGB); since the preview
 * pipeline is 8-bit PNG, {@link decodeBC6H} tone-maps the decoded radiance to
 * sRGB8 (see {@link tonemap}).
 */

/** LSB-first bit reader over a 16-byte BPTC block. */
class BlockReader {
  private readonly data: Uint8Array;
  private readonly base: number;
  private pos = 0;

  constructor(data: Uint8Array, base: number) {
    this.data = data;
    this.base = base;
  }

  /** Read `n` bits (n ≤ 25) LSB-first; returns an unsigned integer. */
  read(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const byte = this.data[this.base + (this.pos >> 3)] ?? 0;
      v |= ((byte >> (this.pos & 7)) & 1) << i;
      this.pos++;
    }
    return v >>> 0;
  }

  /** Read `n` bits LSB-first, then reverse them (BC6H's reversed high-bit fields). */
  readReversed(n: number): number {
    let bits = this.read(n);
    let result = 0;
    for (let i = 0; i < n; i++) {
      result = (result << 1) | (bits & 1);
      bits >>= 1;
    }
    return result;
  }
}

// 2-subset partition table: bit i (of 16) = subset (0/1) of texel i.
// prettier-ignore
const PARTITIONS_2 = [
  0xcccc, 0x8888, 0xeeee, 0xecc8, 0xc880, 0xfeec, 0xfec8, 0xec80,
  0xc800, 0xffec, 0xfe80, 0xe800, 0xffe8, 0xff00, 0xfff0, 0xf000,
  0xf710, 0x008e, 0x7100, 0x08ce, 0x008c, 0x7310, 0x3100, 0x8cce,
  0x088c, 0x3110, 0x6666, 0x366c, 0x17e8, 0x0ff0, 0x718e, 0x399c,
  0xaaaa, 0xf0f0, 0x5a5a, 0x33cc, 0x3c3c, 0x55aa, 0x9696, 0xa55a,
  0x73ce, 0x13c8, 0x324c, 0x3bdc, 0x6996, 0xc33c, 0x9966, 0x0660,
  0x0272, 0x04e4, 0x4e40, 0x2720, 0xc936, 0x936c, 0x39c6, 0x639c,
  0x9336, 0x9cc6, 0x817e, 0xe718, 0xccf0, 0x0fcc, 0x7744, 0xee22,
];

// 3-subset partition table: 2 bits per texel → subset (0/1/2) of texel i.
// prettier-ignore
const PARTITIONS_3 = [
  0xaa685050, 0x6a5a5040, 0x5a5a4200, 0x5450a0a8, 0xa5a50000, 0xa0a05050, 0x5555a0a0, 0x5a5a5050,
  0xaa550000, 0xaa555500, 0xaaaa5500, 0x90909090, 0x94949494, 0xa4a4a4a4, 0xa9a59450, 0x2a0a4250,
  0xa5945040, 0x0a425054, 0xa5a5a500, 0x55a0a0a0, 0xa8a85454, 0x6a6a4040, 0xa4a45000, 0x1a1a0500,
  0x0050a4a4, 0xaaa59090, 0x14696914, 0x69691400, 0xa08585a0, 0xaa821414, 0x50a4a450, 0x6a5a0200,
  0xa9a58000, 0x5090a0a8, 0xa8a09050, 0x24242424, 0x00aa5500, 0x24924924, 0x24499224, 0x50a50a50,
  0x500aa550, 0xaaaa4444, 0x66660000, 0xa5a0a5a0, 0x50a050a0, 0x69286928, 0x44aaaa44, 0x66666600,
  0xaa444444, 0x54a854a8, 0x95809580, 0x96969600, 0xa85454a8, 0x80959580, 0xaa141414, 0x96960000,
  0xaaaa1414, 0xa05050a0, 0xa0a5a5a0, 0x96000000, 0x40804080, 0xa9a8a9a8, 0xaaaaaa44, 0x2a4a5254,
];

// Anchor texel index of the 2nd subset (2-subset partitions).
// prettier-ignore
const ANCHOR_2 = [
  15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15,
  15,  2,  8,  2,  2,  8,  8, 15,  2,  8,  2,  2,  8,  8,  2,  2,
  15, 15,  6,  8,  2,  8, 15, 15,  2,  8,  2,  2,  2, 15, 15,  6,
   6,  2,  6,  8, 15, 15,  2,  2, 15, 15, 15, 15, 15,  2,  2, 15,
];

// Anchor texel indices of the 2nd and 3rd subsets (3-subset partitions).
// prettier-ignore
const ANCHOR_3_1 = [
   3,  3, 15, 15,  8,  3, 15, 15,  8,  8,  6,  6,  6,  5,  3,  3,
   3,  3,  8, 15,  3,  3,  6, 10,  5,  8,  8,  6,  8,  5, 15, 15,
   8, 15,  3,  5,  6, 10,  8, 15, 15,  3, 15,  5, 15, 15, 15, 15,
   3, 15,  5,  5,  5,  8,  5, 10,  5, 10,  8, 13, 15, 12,  3,  3,
];
// prettier-ignore
const ANCHOR_3_2 = [
  15,  8,  8,  3, 15, 15,  3,  8, 15, 15, 15, 15, 15, 15, 15,  8,
  15,  8, 15,  3, 15,  8, 15,  8,  3, 15,  6, 10, 15, 15, 10,  8,
  15,  3, 15, 10, 10,  8,  9, 10,  6, 15,  8, 15,  3,  6,  6,  8,
  15,  3, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15,  3, 15, 15,  8,
];

const WEIGHTS_2 = [0, 21, 43, 64];
const WEIGHTS_3 = [0, 9, 18, 27, 37, 46, 55, 64];
const WEIGHTS_4 = [0, 4, 9, 13, 17, 21, 26, 30, 34, 38, 43, 47, 51, 55, 60, 64];

function weightsFor(bits: number): number[] {
  return bits === 2 ? WEIGHTS_2 : bits === 3 ? WEIGHTS_3 : WEIGHTS_4;
}

function interpolate(a: number, b: number, weight: number): number {
  return (a * (64 - weight) + b * weight + 32) >> 6;
}

/** Replicate an `bits`-bit value up to 8 bits (BPTC endpoint expansion). */
function expandTo8(value: number, bits: number): number {
  if (bits >= 8) return value & 0xff;
  return ((value << (8 - bits)) | (value >> (2 * bits - 8))) & 0xff;
}

function subsetOf(
  numSubsets: number,
  partition: number,
  texel: number,
): number {
  if (numSubsets === 1) return 0;
  if (numSubsets === 2) return ((PARTITIONS_2[partition] ?? 0) >> texel) & 1;
  return ((PARTITIONS_3[partition] ?? 0) >> (2 * texel)) & 3;
}

function anchorsFor(numSubsets: number, partition: number): number[] {
  if (numSubsets === 1) return [0];
  if (numSubsets === 2) return [0, ANCHOR_2[partition] ?? 0];
  return [0, ANCHOR_3_1[partition] ?? 0, ANCHOR_3_2[partition] ?? 0];
}

// ---------------------------------------------------------------------------
// BC7
// ---------------------------------------------------------------------------

interface Bc7Mode {
  ns: number; // subsets
  pb: number; // partition bits
  rb: number; // rotation bits
  isb: number; // index-selection bits
  cb: number; // color endpoint precision
  ab: number; // alpha endpoint precision (0 → opaque)
  epb: number; // per-endpoint p-bits
  spb: number; // shared (per-subset) p-bits
  ib: number; // primary index bits
  ib2: number; // secondary index bits (modes 4/5)
}

// prettier-ignore
const BC7_MODES: Bc7Mode[] = [
  { ns: 3, pb: 4, rb: 0, isb: 0, cb: 4, ab: 0, epb: 1, spb: 0, ib: 3, ib2: 0 },
  { ns: 2, pb: 6, rb: 0, isb: 0, cb: 6, ab: 0, epb: 0, spb: 1, ib: 3, ib2: 0 },
  { ns: 3, pb: 6, rb: 0, isb: 0, cb: 5, ab: 0, epb: 0, spb: 0, ib: 2, ib2: 0 },
  { ns: 2, pb: 6, rb: 0, isb: 0, cb: 7, ab: 0, epb: 1, spb: 0, ib: 2, ib2: 0 },
  { ns: 1, pb: 0, rb: 2, isb: 1, cb: 5, ab: 6, epb: 0, spb: 0, ib: 2, ib2: 3 },
  { ns: 1, pb: 0, rb: 2, isb: 0, cb: 7, ab: 8, epb: 0, spb: 0, ib: 2, ib2: 2 },
  { ns: 1, pb: 0, rb: 0, isb: 0, cb: 7, ab: 7, epb: 1, spb: 0, ib: 4, ib2: 0 },
  { ns: 2, pb: 6, rb: 0, isb: 0, cb: 5, ab: 5, epb: 1, spb: 0, ib: 2, ib2: 0 },
];

function decodeBlockBC7(
  data: Uint8Array,
  base: number,
  out: Uint8Array,
  bx: number,
  by: number,
  width: number,
  height: number,
): void {
  const br = new BlockReader(data, base);
  let mode = 0;
  while (mode < 8 && br.read(1) === 0) mode++;
  if (mode === 8) return; // reserved mode → leave block black/transparent

  const m = BC7_MODES[mode];
  if (!m) return;
  const partition = m.pb ? br.read(m.pb) : 0;
  const rotation = m.rb ? br.read(m.rb) : 0;
  const indexSel = m.isb ? br.read(m.isb) : 0;
  const ne = 2 * m.ns;

  const r = new Array<number>(ne);
  const g = new Array<number>(ne);
  const b = new Array<number>(ne);
  const a = new Array<number>(ne).fill(255);
  for (let i = 0; i < ne; i++) r[i] = br.read(m.cb);
  for (let i = 0; i < ne; i++) g[i] = br.read(m.cb);
  for (let i = 0; i < ne; i++) b[i] = br.read(m.cb);
  if (m.ab) for (let i = 0; i < ne; i++) a[i] = br.read(m.ab);

  let cbits = m.cb;
  let abits = m.ab;
  if (m.epb) {
    cbits++;
    if (m.ab) abits++;
    for (let i = 0; i < ne; i++) {
      const p = br.read(1);
      r[i] = ((r[i] ?? 0) << 1) | p;
      g[i] = ((g[i] ?? 0) << 1) | p;
      b[i] = ((b[i] ?? 0) << 1) | p;
      if (m.ab) a[i] = ((a[i] ?? 0) << 1) | p;
    }
  } else if (m.spb) {
    cbits++;
    if (m.ab) abits++;
    for (let s = 0; s < m.ns; s++) {
      const p = br.read(1);
      for (const i of [2 * s, 2 * s + 1]) {
        r[i] = ((r[i] ?? 0) << 1) | p;
        g[i] = ((g[i] ?? 0) << 1) | p;
        b[i] = ((b[i] ?? 0) << 1) | p;
        if (m.ab) a[i] = ((a[i] ?? 0) << 1) | p;
      }
    }
  }
  for (let i = 0; i < ne; i++) {
    r[i] = expandTo8(r[i] ?? 0, cbits);
    g[i] = expandTo8(g[i] ?? 0, cbits);
    b[i] = expandTo8(b[i] ?? 0, cbits);
    a[i] = m.ab ? expandTo8(a[i] ?? 0, abits) : 255;
  }

  const anchors = anchorsFor(m.ns, partition);
  const colorIdx = new Array<number>(16);
  const alphaIdx = new Array<number>(16);
  for (let p = 0; p < 16; p++) {
    const s = subsetOf(m.ns, partition, p);
    const bits = anchors[s] === p ? m.ib - 1 : m.ib;
    colorIdx[p] = br.read(bits);
  }
  if (m.ib2) {
    for (let p = 0; p < 16; p++) {
      const bits = p === 0 ? m.ib2 - 1 : m.ib2; // ns === 1 → anchor is texel 0
      alphaIdx[p] = br.read(bits);
    }
  }

  const cW = weightsFor(m.ib);
  const cW2 = m.ib2 ? weightsFor(m.ib2) : cW;
  for (let p = 0; p < 16; p++) {
    const x = bx + (p & 3);
    const y = by + (p >> 2);
    if (x >= width || y >= height) continue;
    const s = subsetOf(m.ns, partition, p);
    const e0 = 2 * s;
    const e1 = 2 * s + 1;

    // Index/weight tables for color vs alpha (modes 4/5 split them).
    let ci = colorIdx[p] ?? 0;
    let cw = cW;
    let ai = ci;
    let aw = cW;
    if (m.ib2) {
      if (indexSel) {
        ci = alphaIdx[p] ?? 0;
        cw = cW2;
        ai = colorIdx[p] ?? 0;
        aw = cW;
      } else {
        ai = alphaIdx[p] ?? 0;
        aw = cW2;
      }
    }

    let R = interpolate(r[e0] ?? 0, r[e1] ?? 0, cw[ci] ?? 0);
    let G = interpolate(g[e0] ?? 0, g[e1] ?? 0, cw[ci] ?? 0);
    let B = interpolate(b[e0] ?? 0, b[e1] ?? 0, cw[ci] ?? 0);
    let A = m.ab ? interpolate(a[e0] ?? 0, a[e1] ?? 0, aw[ai] ?? 0) : 255;

    if (rotation === 1) [R, A] = [A, R];
    else if (rotation === 2) [G, A] = [A, G];
    else if (rotation === 3) [B, A] = [A, B];

    const di = (y * width + x) * 4;
    out[di] = R;
    out[di + 1] = G;
    out[di + 2] = B;
    out[di + 3] = A;
  }
}

/** Decode a BC7 (DXGI BC7 UNORM) surface to RGBA8. */
export function decodeBC7(
  data: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  let off = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4) {
      decodeBlockBC7(data, off, out, bx, by, width, height);
      off += 16;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// BC6H (HDR RGB)
//
// Ported from iOrange/bcdec (`bcdec_bc6h_half`, public domain). BC6H stores RGB
// half-floats with no alpha; 14 modes pack the endpoint components in a
// mode-specific scattered bit layout (the per-mode reads below mirror the
// reference exactly). The decoded half-floats are tone-mapped to sRGB8 for the
// 8-bit preview pipeline.
// ---------------------------------------------------------------------------

// actual_bits_count[component W/dR/dG/dB][mode 0..13].
// prettier-ignore
const BC6H_BITS = [
  [10, 7, 11, 11, 11, 9, 8, 8, 8, 6, 10, 11, 12, 16], // W (base precision)
  [ 5, 6,  5,  4,  4, 5, 6, 5, 5, 6, 10,  9,  8,  4], // dR
  [ 5, 6,  4,  5,  4, 5, 5, 6, 5, 6, 10,  9,  8,  4], // dG
  [ 5, 6,  4,  4,  5, 5, 5, 5, 6, 6, 10,  9,  8,  4], // dB
];

// 32 two-region partition shapes (4x4). Value = subset (0/1); bit 0x80 flags
// the per-subset anchor texel (read with one fewer index bit).
// prettier-ignore
const BC6H_PARTITIONS = [
  [128, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 129],
  [128, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 129],
  [128, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 129],
  [128, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 129],
  [128, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 129],
  [128, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 129],
  [128, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 129],
  [128, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 129],
  [128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 129],
  [128, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 129],
  [128, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 129],
  [128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 129],
  [128, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 129],
  [128, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 129],
  [128, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 129],
  [128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 129],
  [128, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 129],
  [128, 1, 129, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [128, 0, 0, 0, 0, 0, 0, 0, 129, 0, 0, 0, 1, 1, 1, 0],
  [128, 1, 129, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  [128, 0, 129, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [128, 0, 0, 0, 1, 0, 0, 0, 129, 1, 0, 0, 1, 1, 1, 0],
  [128, 0, 0, 0, 0, 0, 0, 0, 129, 0, 0, 0, 1, 1, 0, 0],
  [128, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 129],
  [128, 0, 129, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  [128, 0, 0, 0, 1, 0, 0, 0, 129, 0, 0, 0, 1, 1, 0, 0],
  [128, 1, 129, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
  [128, 0, 129, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0],
  [128, 0, 0, 1, 0, 1, 1, 1, 129, 1, 1, 0, 1, 0, 0, 0],
  [128, 0, 0, 0, 1, 1, 1, 1, 129, 1, 1, 1, 0, 0, 0, 0],
  [128, 1, 129, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0],
  [128, 0, 129, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0],
];

const BC6H_WEIGHTS_3 = WEIGHTS_3;
const BC6H_WEIGHTS_4 = WEIGHTS_4;

function extendSign(value: number, bits: number): number {
  return (value << (32 - bits)) >> (32 - bits);
}

function transformInverse(
  value: number,
  base: number,
  bits: number,
  signed: boolean,
): number {
  let v = (value + base) & ((1 << bits) - 1);
  if (signed) v = extendSign(v, bits);
  return v;
}

/** Dequantize an endpoint component to a 16-bit magnitude (spec algorithm). */
function unquantize(value: number, bits: number, signed: boolean): number {
  if (!signed) {
    if (bits >= 15) return value;
    if (value === 0) return 0;
    if (value === (1 << bits) - 1) return 0xffff;
    return ((value << 16) + 0x8000) >> bits;
  }
  if (bits >= 16) return value;
  let s = false;
  let v = value;
  if (v < 0) {
    s = true;
    v = -v;
  }
  let unq: number;
  if (v === 0) unq = 0;
  else if (v >= (1 << (bits - 1)) - 1) unq = 0x7fff;
  else unq = ((v << 15) + 0x4000) >> (bits - 1);
  return s ? -unq : unq;
}

/** Scale a dequantized value into a half-float bit pattern. */
function finishUnquantize(value: number, signed: boolean): number {
  if (!signed) return ((value * 31) >> 6) & 0xffff;
  let v = value < 0 ? -((-value * 31) >> 5) : (value * 31) >> 5;
  let s = 0;
  if (v < 0) {
    s = 0x8000;
    v = -v;
  }
  return (s | v) & 0xffff;
}

/** IEEE half-float (16-bit) bit pattern → JS number. */
export function halfToFloat(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 0x1f;
  const mant = h & 0x3ff;
  if (exp === 0) return sign * mant * 2 ** -24;
  if (exp === 31) return mant ? NaN : sign * Infinity;
  return sign * (1 + mant / 1024) * 2 ** (exp - 15);
}

/** Tone-map a linear (HDR) radiance value to an 8-bit sRGB component. */
export function tonemapToSrgb8(linear: number): number {
  let c = linear > 0 && Number.isFinite(linear) ? linear : 0;
  c = c / (1 + c); // Reinhard
  const srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(srgb * 255)));
}

function decodeBlockBC6H(
  data: Uint8Array,
  base: number,
  signed: boolean,
  out: Uint8Array,
  bx: number,
  by: number,
  width: number,
  height: number,
): void {
  const br = new BlockReader(data, base);
  const r: [number, number, number, number] = [0, 0, 0, 0];
  const g: [number, number, number, number] = [0, 0, 0, 0];
  const b: [number, number, number, number] = [0, 0, 0, 0];
  let partition = 0;
  let mode = br.read(2);
  if (mode > 1) mode |= br.read(3) << 2;

  // Read the mode's scattered endpoint bits and remap to a 0..13 mode index.
  switch (mode) {
    case 0b00:
      g[2] |= br.read(1) << 4;
      b[2] |= br.read(1) << 4;
      b[3] |= br.read(1) << 4;
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(5);
      g[3] |= br.read(1) << 4;
      g[2] |= br.read(4);
      g[1] |= br.read(5);
      b[3] |= br.read(1);
      g[3] |= br.read(4);
      b[1] |= br.read(5);
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(4);
      r[2] |= br.read(5);
      b[3] |= br.read(1) << 2;
      r[3] |= br.read(5);
      b[3] |= br.read(1) << 3;
      partition = br.read(5);
      mode = 0;
      break;
    case 0b01:
      g[2] |= br.read(1) << 5;
      g[3] |= br.read(1) << 4;
      g[3] |= br.read(1) << 5;
      r[0] |= br.read(7);
      b[3] |= br.read(1);
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(1) << 4;
      g[0] |= br.read(7);
      b[2] |= br.read(1) << 5;
      b[3] |= br.read(1) << 2;
      g[2] |= br.read(1) << 4;
      b[0] |= br.read(7);
      b[3] |= br.read(1) << 3;
      b[3] |= br.read(1) << 5;
      b[3] |= br.read(1) << 4;
      r[1] |= br.read(6);
      g[2] |= br.read(4);
      g[1] |= br.read(6);
      g[3] |= br.read(4);
      b[1] |= br.read(6);
      b[2] |= br.read(4);
      r[2] |= br.read(6);
      r[3] |= br.read(6);
      partition = br.read(5);
      mode = 1;
      break;
    case 0b00010:
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(5);
      r[0] |= br.read(1) << 10;
      g[2] |= br.read(4);
      g[1] |= br.read(4);
      g[0] |= br.read(1) << 10;
      b[3] |= br.read(1);
      g[3] |= br.read(4);
      b[1] |= br.read(4);
      b[0] |= br.read(1) << 10;
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(4);
      r[2] |= br.read(5);
      b[3] |= br.read(1) << 2;
      r[3] |= br.read(5);
      b[3] |= br.read(1) << 3;
      partition = br.read(5);
      mode = 2;
      break;
    case 0b00110:
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(4);
      r[0] |= br.read(1) << 10;
      g[3] |= br.read(1) << 4;
      g[2] |= br.read(4);
      g[1] |= br.read(5);
      g[0] |= br.read(1) << 10;
      g[3] |= br.read(4);
      b[1] |= br.read(4);
      b[0] |= br.read(1) << 10;
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(4);
      r[2] |= br.read(4);
      b[3] |= br.read(1);
      b[3] |= br.read(1) << 2;
      r[3] |= br.read(4);
      g[2] |= br.read(1) << 4;
      b[3] |= br.read(1) << 3;
      partition = br.read(5);
      mode = 3;
      break;
    case 0b01010:
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(4);
      r[0] |= br.read(1) << 10;
      b[2] |= br.read(1) << 4;
      g[2] |= br.read(4);
      g[1] |= br.read(4);
      g[0] |= br.read(1) << 10;
      b[3] |= br.read(1);
      g[3] |= br.read(4);
      b[1] |= br.read(5);
      b[0] |= br.read(1) << 10;
      b[2] |= br.read(4);
      r[2] |= br.read(4);
      b[3] |= br.read(1) << 1;
      b[3] |= br.read(1) << 2;
      r[3] |= br.read(4);
      b[3] |= br.read(1) << 4;
      b[3] |= br.read(1) << 3;
      partition = br.read(5);
      mode = 4;
      break;
    case 0b01110:
      r[0] |= br.read(9);
      b[2] |= br.read(1) << 4;
      g[0] |= br.read(9);
      g[2] |= br.read(1) << 4;
      b[0] |= br.read(9);
      b[3] |= br.read(1) << 4;
      r[1] |= br.read(5);
      g[3] |= br.read(1) << 4;
      g[2] |= br.read(4);
      g[1] |= br.read(5);
      b[3] |= br.read(1);
      g[3] |= br.read(4);
      b[1] |= br.read(5);
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(4);
      r[2] |= br.read(5);
      b[3] |= br.read(1) << 2;
      r[3] |= br.read(5);
      b[3] |= br.read(1) << 3;
      partition = br.read(5);
      mode = 5;
      break;
    case 0b10010:
      r[0] |= br.read(8);
      g[3] |= br.read(1) << 4;
      b[2] |= br.read(1) << 4;
      g[0] |= br.read(8);
      b[3] |= br.read(1) << 2;
      g[2] |= br.read(1) << 4;
      b[0] |= br.read(8);
      b[3] |= br.read(1) << 3;
      b[3] |= br.read(1) << 4;
      r[1] |= br.read(6);
      g[2] |= br.read(4);
      g[1] |= br.read(5);
      b[3] |= br.read(1);
      g[3] |= br.read(4);
      b[1] |= br.read(5);
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(4);
      r[2] |= br.read(6);
      r[3] |= br.read(6);
      partition = br.read(5);
      mode = 6;
      break;
    case 0b10110:
      r[0] |= br.read(8);
      b[3] |= br.read(1);
      b[2] |= br.read(1) << 4;
      g[0] |= br.read(8);
      g[2] |= br.read(1) << 5;
      g[2] |= br.read(1) << 4;
      b[0] |= br.read(8);
      g[3] |= br.read(1) << 5;
      b[3] |= br.read(1) << 4;
      r[1] |= br.read(5);
      g[3] |= br.read(1) << 4;
      g[2] |= br.read(4);
      g[1] |= br.read(6);
      g[3] |= br.read(4);
      b[1] |= br.read(5);
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(4);
      r[2] |= br.read(5);
      b[3] |= br.read(1) << 2;
      r[3] |= br.read(5);
      b[3] |= br.read(1) << 3;
      partition = br.read(5);
      mode = 7;
      break;
    case 0b11010:
      r[0] |= br.read(8);
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(1) << 4;
      g[0] |= br.read(8);
      b[2] |= br.read(1) << 5;
      g[2] |= br.read(1) << 4;
      b[0] |= br.read(8);
      b[3] |= br.read(1) << 5;
      b[3] |= br.read(1) << 4;
      r[1] |= br.read(5);
      g[3] |= br.read(1) << 4;
      g[2] |= br.read(4);
      g[1] |= br.read(5);
      b[3] |= br.read(1);
      g[3] |= br.read(4);
      b[1] |= br.read(6);
      b[2] |= br.read(4);
      r[2] |= br.read(5);
      b[3] |= br.read(1) << 2;
      r[3] |= br.read(5);
      b[3] |= br.read(1) << 3;
      partition = br.read(5);
      mode = 8;
      break;
    case 0b11110:
      r[0] |= br.read(6);
      g[3] |= br.read(1) << 4;
      b[3] |= br.read(1);
      b[3] |= br.read(1) << 1;
      b[2] |= br.read(1) << 4;
      g[0] |= br.read(6);
      g[2] |= br.read(1) << 5;
      b[2] |= br.read(1) << 5;
      b[3] |= br.read(1) << 2;
      g[2] |= br.read(1) << 4;
      b[0] |= br.read(6);
      g[3] |= br.read(1) << 5;
      b[3] |= br.read(1) << 3;
      b[3] |= br.read(1) << 5;
      b[3] |= br.read(1) << 4;
      r[1] |= br.read(6);
      g[2] |= br.read(4);
      g[1] |= br.read(6);
      g[3] |= br.read(4);
      b[1] |= br.read(6);
      b[2] |= br.read(4);
      r[2] |= br.read(6);
      r[3] |= br.read(6);
      partition = br.read(5);
      mode = 9;
      break;
    case 0b00011:
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(10);
      g[1] |= br.read(10);
      b[1] |= br.read(10);
      mode = 10;
      break;
    case 0b00111:
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(9);
      r[0] |= br.read(1) << 10;
      g[1] |= br.read(9);
      g[0] |= br.read(1) << 10;
      b[1] |= br.read(9);
      b[0] |= br.read(1) << 10;
      mode = 11;
      break;
    case 0b01011:
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(8);
      r[0] |= br.readReversed(2) << 10;
      g[1] |= br.read(8);
      g[0] |= br.readReversed(2) << 10;
      b[1] |= br.read(8);
      b[0] |= br.readReversed(2) << 10;
      mode = 12;
      break;
    case 0b01111:
      r[0] |= br.read(10);
      g[0] |= br.read(10);
      b[0] |= br.read(10);
      r[1] |= br.read(4);
      r[0] |= br.readReversed(6) << 10;
      g[1] |= br.read(4);
      g[0] |= br.readReversed(6) << 10;
      b[1] |= br.read(4);
      b[0] |= br.readReversed(6) << 10;
      mode = 13;
      break;
    default:
      return; // reserved mode → leave block black
  }

  const numPartitions = mode >= 10 ? 0 : 1;
  const base0 = BC6H_BITS[0]?.[mode] ?? 0;
  if (signed) {
    r[0] = extendSign(r[0], base0);
    g[0] = extendSign(g[0], base0);
    b[0] = extendSign(b[0], base0);
  }
  const ne = (numPartitions + 1) * 2;
  if ((mode !== 9 && mode !== 10) || signed) {
    const rb = BC6H_BITS[1]?.[mode] ?? 0;
    const gb = BC6H_BITS[2]?.[mode] ?? 0;
    const bb = BC6H_BITS[3]?.[mode] ?? 0;
    for (let i = 1; i < ne; i++) {
      r[i] = extendSign(r[i] ?? 0, rb);
      g[i] = extendSign(g[i] ?? 0, gb);
      b[i] = extendSign(b[i] ?? 0, bb);
    }
  }
  if (mode !== 9 && mode !== 10) {
    for (let i = 1; i < ne; i++) {
      r[i] = transformInverse(r[i] ?? 0, r[0], base0, signed);
      g[i] = transformInverse(g[i] ?? 0, g[0], base0, signed);
      b[i] = transformInverse(b[i] ?? 0, b[0], base0, signed);
    }
  }
  for (let i = 0; i < ne; i++) {
    r[i] = unquantize(r[i] ?? 0, base0, signed);
    g[i] = unquantize(g[i] ?? 0, base0, signed);
    b[i] = unquantize(b[i] ?? 0, base0, signed);
  }

  const weights = mode >= 10 ? BC6H_WEIGHTS_4 : BC6H_WEIGHTS_3;
  const shape = mode >= 10 ? null : BC6H_PARTITIONS[partition];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const texel = i * 4 + j;
      let set = mode >= 10 ? (texel === 0 ? 128 : 0) : (shape?.[texel] ?? 0);
      let indexBits = mode >= 10 ? 4 : 3;
      if (set & 0x80) indexBits--;
      set &= 0x01;
      const index = br.read(indexBits);
      const e = set * 2;
      const rh = finishUnquantize(
        ((r[e] ?? 0) * (64 - (weights[index] ?? 0)) +
          (r[e + 1] ?? 0) * (weights[index] ?? 0) +
          32) >>
          6,
        signed,
      );
      const gh = finishUnquantize(
        ((g[e] ?? 0) * (64 - (weights[index] ?? 0)) +
          (g[e + 1] ?? 0) * (weights[index] ?? 0) +
          32) >>
          6,
        signed,
      );
      const bh = finishUnquantize(
        ((b[e] ?? 0) * (64 - (weights[index] ?? 0)) +
          (b[e + 1] ?? 0) * (weights[index] ?? 0) +
          32) >>
          6,
        signed,
      );
      const x = bx + j;
      const y = by + i;
      if (x >= width || y >= height) continue;
      const di = (y * width + x) * 4;
      out[di] = tonemapToSrgb8(halfToFloat(rh));
      out[di + 1] = tonemapToSrgb8(halfToFloat(gh));
      out[di + 2] = tonemapToSrgb8(halfToFloat(bh));
      out[di + 3] = 255;
    }
  }
}

/**
 * Decode a BC6H (DXGI BC6H_UF16/SF16) HDR surface to RGBA8, tone-mapping the
 * decoded half-float radiance to sRGB for display. `signed` selects SF16.
 */
export function decodeBC6H(
  data: Uint8Array,
  width: number,
  height: number,
  signed: boolean,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  let off = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4) {
      decodeBlockBC6H(data, off, signed, out, bx, by, width, height);
      off += 16;
    }
  }
  return out;
}
