import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "@jest/globals";

import {
  decodeBC6H,
  decodeBC7,
  decodeDds,
  halfToFloat,
  parseDdsHeader,
  tonemapToSrgb8,
} from "../src/decode";

/** LSB-first bit packer — the inverse of the BPTC block reader. */
class BitPacker {
  readonly bytes = new Uint8Array(16);
  private pos = 0;
  push(value: number, n: number): void {
    for (let i = 0; i < n; i++) {
      if ((value >> i) & 1) {
        const bi = this.pos >> 3;
        this.bytes[bi] = (this.bytes[bi] ?? 0) | (1 << (this.pos & 7));
      }
      this.pos++;
    }
  }
}

/** Wrap a single 16-byte block in a minimal DX10 DDS header of `format`. */
function ddsDx10(
  dxgiFormat: number,
  width: number,
  height: number,
  block: Uint8Array,
): Uint8Array {
  const bytes = new Uint8Array(148 + block.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x20534444, true); // "DDS "
  view.setUint32(12, height, true);
  view.setUint32(16, width, true);
  view.setUint32(80, 0x4, true); // DDPF_FOURCC
  bytes.set([0x44, 0x58, 0x31, 0x30], 84); // "DX10"
  view.setUint32(128, dxgiFormat, true);
  bytes.set(block, 148);
  return bytes;
}

describe("BC7 decode (synthetic mode-6 block)", () => {
  // Mode 6: single subset, 7-bit RGBA endpoints + 1 p-bit each, 4-bit indices.
  // Endpoint 0 ≈ black, endpoint 1 = white; indices ramp 0→15 across the block.
  const p = new BitPacker();
  p.push(0b1000000, 7); // mode 6 (six 0s then a 1, LSB-first)
  p.push(0, 7);
  p.push(127, 7); // R0, R1
  p.push(0, 7);
  p.push(127, 7); // G0, G1
  p.push(0, 7);
  p.push(127, 7); // B0, B1
  p.push(127, 7);
  p.push(127, 7); // A0, A1
  p.push(1, 1);
  p.push(1, 1); // p-bits (LSB appended to each endpoint)
  p.push(0, 3); // texel 0 = anchor → index bits-1
  for (let i = 1; i < 16; i++) p.push(i, 4); // texels 1..15 index = i
  const rgba = decodeBC7(p.bytes, 4, 4);

  it("decodes the anchor texel to (near) the dark endpoint, fully opaque", () => {
    expect(rgba[0]).toBeLessThanOrEqual(4); // R
    expect(rgba[1]).toBeLessThanOrEqual(4); // G
    expect(rgba[2]).toBeLessThanOrEqual(4); // B
    expect(rgba[3]).toBe(255); // A
  });

  it("decodes the max-index texel to the white endpoint", () => {
    const o = 15 * 4; // texel 15
    expect(rgba[o]).toBe(255);
    expect(rgba[o + 1]).toBe(255);
    expect(rgba[o + 2]).toBe(255);
    expect(rgba[o + 3]).toBe(255);
  });

  it("produces a monotonically increasing gradient along the index ramp", () => {
    let prev = -1;
    for (let i = 0; i < 16; i++) {
      const v = rgba[i * 4] ?? 0;
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("is recognized as BC7 and decodable by the DDS dispatcher", () => {
    const dds = ddsDx10(98 /* BC7_UNORM */, 4, 4, p.bytes);
    const info = parseDdsHeader(dds);
    expect(info?.format).toBe("BC7");
    expect(info?.decodable).toBe(true);
    expect(decodeDds(dds).ok).toBe(true);
  });
});

/** RGBA of texel `i` in a decoded buffer. */
const texel = (rgba: Uint8Array, i: number): number[] => [
  ...rgba.subarray(i * 4, i * 4 + 4),
];

/** Every texel of a decoded surface, as RGBA tuples. */
const texels = (rgba: Uint8Array): number[][] =>
  Array.from({ length: rgba.length / 4 }, (_, i) => texel(rgba, i));

/**
 * A BC7 block in `mode` (its prefix is `mode` zero bits then a one, LSB-first)
 * with every remaining bit set to `fill`.
 */
function bc7Block(mode: number, fill: 0 | 1): Uint8Array {
  const block = new Uint8Array(16).fill(fill ? 0xff : 0);
  const prefixMask = (1 << (mode + 1)) - 1;
  block[0] = ((block[0] ?? 0) & ~prefixMask & 0xff) | (1 << mode);
  return block;
}

describe("BC7 decode — every mode", () => {
  const modes = [0, 1, 2, 3, 4, 5, 6, 7];

  it.each(modes)(
    "mode %i: all-ones endpoints decode to opaque white everywhere",
    (mode) => {
      // Equal endpoints make the indices irrelevant; max endpoints (plus p-bits)
      // expand to 255 in every channel, and swapping two 255s is a no-op.
      const rgba = decodeBC7(bc7Block(mode, 1), 4, 4);
      for (const t of texels(rgba)) expect(t).toEqual([255, 255, 255, 255]);
    },
  );

  it.each(modes)(
    "mode %i: all-zero endpoints decode to black, opaque only without alpha",
    (mode) => {
      // Modes 0–3 carry no alpha (always 255); modes 4–7 read alpha endpoints.
      const alpha = mode < 4 ? 255 : 0;
      const rgba = decodeBC7(bc7Block(mode, 0), 4, 4);
      for (const t of texels(rgba)) expect(t).toEqual([0, 0, 0, alpha]);
    },
  );

  it("leaves a reserved-mode block (no mode bit set) transparent black", () => {
    const rgba = decodeBC7(new Uint8Array(16), 4, 4);
    expect(rgba.every((v) => v === 0)).toBe(true);
  });

  describe("mode 5 rotation swaps alpha with one color channel", () => {
    // Mode 5: 2 rotation bits, 7-bit color + 8-bit alpha endpoints, no p-bits,
    // 2-bit color and alpha indices (all zero → endpoint 0 everywhere).
    function mode5(rotation: number): Uint8Array {
      const p = new BitPacker();
      p.push(1 << 5, 6);
      p.push(rotation, 2);
      for (const c of [127, 64, 32]) {
        p.push(c, 7);
        p.push(c, 7);
      }
      p.push(16, 8);
      p.push(16, 8);
      return p.bytes;
    }
    const [r, g, b, a] = texel(decodeBC7(mode5(0), 4, 4), 0);

    it("decodes distinct channels without rotation", () => {
      expect(new Set([r, g, b, a]).size).toBe(4);
    });

    it.each([
      [1, [a, g, b, r]],
      [2, [r, a, b, g]],
      [3, [r, g, a, b]],
    ])("rotation %i", (rotation, expected) => {
      const rgba = decodeBC7(mode5(rotation), 4, 4);
      for (const t of texels(rgba)) expect(t).toEqual(expected);
    });
  });

  describe("mode 4 index selection swaps the color and alpha index sets", () => {
    // Mode 4: rotation (2), index-selection (1), 5-bit color + 6-bit alpha
    // endpoints, then 2-bit primary and 3-bit secondary indices.
    function mode4(indexSel: number): Uint8Array {
      const p = new BitPacker();
      p.push(1 << 4, 5);
      p.push(0, 2);
      p.push(indexSel, 1);
      for (let c = 0; c < 3; c++) {
        p.push(0, 5);
        p.push(31, 5);
      }
      p.push(0, 6);
      p.push(63, 6);
      p.push(1, 1); // primary anchor texel (one bit fewer)
      for (let i = 1; i < 16; i++) p.push(3, 2); // primary = max
      // secondary indices stay 0
      return p.bytes;
    }

    it("primary indices drive color by default", () => {
      expect(texel(decodeBC7(mode4(0), 4, 4), 5)).toEqual([255, 255, 255, 0]);
    });

    it("primary indices drive alpha when the selection bit is set", () => {
      expect(texel(decodeBC7(mode4(1), 4, 4), 5)).toEqual([0, 0, 0, 255]);
    });
  });

  it("clips a block that overhangs a smaller surface", () => {
    const rgba = decodeBC7(bc7Block(6, 1), 2, 3);
    expect(rgba).toHaveLength(2 * 3 * 4);
    expect(rgba.every((v) => v === 255)).toBe(true);
  });

  it("decodes consecutive blocks left to right", () => {
    const data = new Uint8Array(32);
    data.set(bc7Block(6, 0), 0);
    data.set(bc7Block(6, 1), 16);
    const rgba = decodeBC7(data, 8, 4);
    expect(texel(rgba, 0)).toEqual([0, 0, 0, 0]);
    expect(texel(rgba, 4)).toEqual([255, 255, 255, 255]);
  });
});

/**
 * A BC6H block in `mode` (2 mode bits, then 3 more when the first two exceed
 * 1) with every remaining bit set to `fill`.
 */
function bc6hBlock(mode: number, fill: 0 | 1): Uint8Array {
  const block = new Uint8Array(16).fill(fill ? 0xff : 0);
  const modeBits = (mode & 3) > 1 ? 5 : 2;
  const mask = (1 << modeBits) - 1;
  block[0] = ((block[0] ?? 0) & ~mask & 0xff) | mode;
  return block;
}

describe("BC6H decode — every mode", () => {
  // The 14 valid mode codes (as read: 2 low bits, then 3 high bits).
  const modes = [
    0b00, 0b01, 0b00010, 0b00110, 0b01010, 0b01110, 0b10010, 0b10110, 0b11010,
    0b11110, 0b00011, 0b00111, 0b01011, 0b01111,
  ];

  it.each(
    modes.flatMap((mode) => [[mode, false] as const, [mode, true] as const]),
  )(
    "mode %i (signed=%s): zero endpoints decode to opaque black",
    (mode, signed) => {
      const rgba = decodeBC6H(bc6hBlock(mode, 0), 4, 4, signed);
      for (const t of texels(rgba)) expect(t).toEqual([0, 0, 0, 255]);
    },
  );

  it.each([0b10011, 0b10111, 0b11011, 0b11111])(
    "reserved mode %i leaves the block transparent black",
    (mode) => {
      const rgba = decodeBC6H(bc6hBlock(mode, 1), 4, 4, false);
      expect(rgba.every((v) => v === 0)).toBe(true);
    },
  );

  describe("mode 0b00011 (raw 10-bit endpoints, one region)", () => {
    it("unsigned max endpoints tone-map to white", () => {
      const rgba = decodeBC6H(bc6hBlock(0b00011, 1), 4, 4, false);
      for (const t of texels(rgba)) expect(t).toEqual([255, 255, 255, 255]);
    });

    it("signed all-ones endpoints are negative, which clamps to black", () => {
      const rgba = decodeBC6H(bc6hBlock(0b00011, 1), 4, 4, true);
      for (const t of texels(rgba)) expect(t).toEqual([0, 0, 0, 255]);
    });
  });

  it("every valid mode decodes to opaque texels", () => {
    for (const mode of modes) {
      for (const signed of [false, true]) {
        const rgba = decodeBC6H(bc6hBlock(mode, 1), 4, 4, signed);
        for (const t of texels(rgba)) expect(t[3]).toBe(255);
      }
    }
  });

  it("clips a block that overhangs a smaller surface", () => {
    const rgba = decodeBC6H(bc6hBlock(0b00011, 1), 3, 2, false);
    expect(rgba).toHaveLength(3 * 2 * 4);
    expect(rgba.every((v) => v === 255)).toBe(true);
  });

  it.each([
    [95, "BC6H_UF16"],
    [96, "BC6H_SF16"],
  ])("DDS dispatcher decodes DXGI format %i (%s)", (dxgi) => {
    const dds = ddsDx10(dxgi, 4, 4, bc6hBlock(0b00011, 1));
    expect(parseDdsHeader(dds)?.format).toBe("BC6H");
    const result = decodeDds(dds);
    expect(result.ok).toBe(true);
    if (result.ok) expect(texel(result.rgba, 0)[3]).toBe(255);
  });
});

describe("halfToFloat", () => {
  it.each([
    [0x0000, 0],
    [0x3c00, 1],
    [0xc000, -2],
    [0x7bff, 65504],
    [0x0001, 2 ** -24], // smallest subnormal
    [0x7c00, Infinity],
    [0xfc00, -Infinity],
  ])("0x%s → %s", (half, value) => {
    expect(halfToFloat(half)).toBe(value);
  });

  it("maps NaN bit patterns to NaN", () => {
    expect(halfToFloat(0x7e00)).toBeNaN();
  });
});

describe("tonemapToSrgb8", () => {
  it("maps zero, negatives and non-finite values to 0", () => {
    for (const v of [0, -1, NaN, Infinity, -Infinity]) {
      expect(tonemapToSrgb8(v)).toBe(0);
    }
  });

  it("uses the linear sRGB segment near black", () => {
    expect(tonemapToSrgb8(0.001)).toBe(
      Math.round(12.92 * (0.001 / 1.001) * 255),
    );
  });

  it("maps 1.0 (Reinhard 0.5) to sRGB 188 and saturates bright values", () => {
    expect(tonemapToSrgb8(1)).toBe(188);
    expect(tonemapToSrgb8(65504)).toBe(255);
  });

  it("is monotonic", () => {
    let prev = -1;
    for (const v of [0.01, 0.1, 0.5, 1, 2, 8, 100]) {
      const out = tonemapToSrgb8(v);
      expect(out).toBeGreaterThanOrEqual(prev);
      prev = out;
    }
  });
});

/**
 * End-to-end decode of *real* BC7 / BC6H EVE textures. Drop the matching `.dds`
 * into `tests/fixtures/` (gitignored) and these run; otherwise they're skipped.
 */
const fixtures = join(__dirname, "fixtures");
for (const { name, file } of [
  { name: "BC7", file: "BC7.dds" },
  { name: "BC6H", file: "BC6H.dds" },
]) {
  const path = join(fixtures, file);
  const run = existsSync(path) ? describe : describe.skip;
  run(`${name} decode (real EVE fixture: ${file})`, () => {
    // Read lazily in beforeAll: a describe.skip body still executes at collection
    // time, so a top-level readFileSync would throw ENOENT (failing the whole file)
    // whenever the gitignored fixture is absent, e.g. in CI.
    let bytes: Uint8Array;
    beforeAll(() => {
      bytes = new Uint8Array(readFileSync(path));
    });

    it(`parses as ${name}`, () => {
      expect(parseDdsHeader(bytes)?.format).toBe(name);
    });

    it("decodes to full RGBA8 with varied content", () => {
      const r = decodeDds(bytes);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.rgba.length).toBe(r.width * r.height * 4);
      const distinct = new Set<number>();
      let minAlpha = 255;
      let maxAlpha = 0;
      for (let i = 0; i < r.rgba.length; i += 4) {
        distinct.add(r.rgba[i] ?? 0);
        minAlpha = Math.min(minAlpha, r.rgba[i + 3] ?? 0);
        maxAlpha = Math.max(maxAlpha, r.rgba[i + 3] ?? 0);
      }
      expect(distinct.size).toBeGreaterThan(8); // not a flat fill
      if (name === "BC6H") {
        expect(minAlpha).toBe(255); // BC6H is RGB → always opaque
      } else {
        expect(maxAlpha).toBeGreaterThan(200); // BC7 decal has (near-)opaque regions
      }
    });
  });
}
