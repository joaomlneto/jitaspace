import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "@jest/globals";

import { decodeBC7, decodeDds, parseDdsHeader } from "../src/decode";

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
