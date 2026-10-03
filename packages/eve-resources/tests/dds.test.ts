import { describe, expect, it } from "@jest/globals";

import type { DdsInfo } from "../src/decode/dds";
import { tonemapToSrgb8 } from "../src/decode/bptc";
import { decodeDds, parseDdsHeader } from "../src/decode/dds";

// Synthetic DDS builder — header fields at their real offsets + raw pixel data.

interface DdsOpts {
  width: number;
  height: number;
  mips?: number;
  fourCC?: string;
  pfFlags?: number;
  bitCount?: number;
  masks?: { r?: number; g?: number; b?: number; a?: number };
  caps2?: number;
  dx10?: { dxgiFormat: number; miscFlag?: number };
  data: number[];
}

function buildDds(o: DdsOpts): Uint8Array {
  const headerLen = 128 + (o.dx10 ? 20 : 0);
  const buf = new Uint8Array(headerLen + o.data.length);
  const v = new DataView(buf.buffer);
  v.setUint32(0, 0x20534444, true); // "DDS "
  v.setUint32(4, 124, true);
  v.setUint32(8, 0x1007, true); // flags
  v.setUint32(12, o.height, true);
  v.setUint32(16, o.width, true);
  v.setUint32(28, o.mips ?? 1, true);
  v.setUint32(76, 32, true);
  const cc = o.dx10 ? "DX10" : (o.fourCC ?? "");
  // A FourCC pixel format always sets DDPF_FOURCC (0x4), as real files do.
  v.setUint32(80, (o.pfFlags ?? 0) | (cc ? 0x4 : 0), true);
  for (let i = 0; i < cc.length; i++) v.setUint8(84 + i, cc.charCodeAt(i));
  v.setUint32(88, o.bitCount ?? 0, true);
  v.setUint32(92, o.masks?.r ?? 0, true);
  v.setUint32(96, o.masks?.g ?? 0, true);
  v.setUint32(100, o.masks?.b ?? 0, true);
  v.setUint32(104, o.masks?.a ?? 0, true);
  v.setUint32(112, o.caps2 ?? 0, true);
  if (o.dx10) {
    v.setUint32(128, o.dx10.dxgiFormat, true);
    v.setUint32(132, 3, true); // resourceDimension TEXTURE2D
    v.setUint32(136, o.dx10.miscFlag ?? 0, true);
    v.setUint32(140, 1, true); // arraySize
  }
  buf.set(o.data, headerLen);
  return buf;
}

const u16 = (n: number): number[] => [n & 0xff, (n >>> 8) & 0xff];
const u32 = (n: number): number[] => [
  n & 0xff,
  (n >>> 8) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 24) & 0xff,
];
const f32 = (n: number): number[] => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setFloat32(0, n, true);
  return [...b];
};
// Exact half-float bit patterns for representable values.
const H0 = 0x0000;
const H5 = 0x3800;
const H1 = 0x3c00;

const DDPF_ALPHAPIXELS = 0x1;
const DDPF_ALPHA = 0x2;
const DDPF_RGB = 0x40;
const DDPF_LUMINANCE = 0x20000;

function header(dds: Uint8Array): DdsInfo {
  const info = parseDdsHeader(dds);
  if (!info) throw new Error("not a DDS file");
  return info;
}
function decodeOk(dds: Uint8Array): {
  width: number;
  height: number;
  rgba: Uint8Array;
  format: string;
} {
  const res = decodeDds(dds);
  if (!res.ok) throw new Error(`decode failed: ${res.reason}`);
  return res;
}

describe("parseDdsHeader", () => {
  it("returns null for non-DDS / too-short input", () => {
    expect(parseDdsHeader(new Uint8Array(8))).toBeNull();
    expect(
      parseDdsHeader(new TextEncoder().encode("not a dds file......")),
    ).toBeNull();
  });

  it("reports dimensions, format, and decodable", () => {
    const info = header(
      buildDds({
        width: 4,
        height: 2,
        fourCC: "DXT1",
        pfFlags: 0x4,
        data: Array<number>(8).fill(0),
      }),
    );
    expect(info).toMatchObject({
      width: 4,
      height: 2,
      format: "BC1",
      decodable: true,
      cubemap: false,
      faceCount: 1,
    });
  });

  it("marks unknown DXGI formats undecodable", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      dx10: { dxgiFormat: 999 },
      data: Array<number>(4).fill(0),
    });
    expect(header(dds).decodable).toBe(false);
    expect(header(dds).format).toBe("dxgi-999");
    expect(decodeDds(dds).ok).toBe(false);
  });
});

describe("uncompressed integer formats", () => {
  it("decodes 24bpp R8G8B8 (the cubemap-blur case's pixel format)", () => {
    const px = (r: number, g: number, b: number) => [b, g, r]; // stored little-endian
    const dds = buildDds({
      width: 2,
      height: 1,
      pfFlags: DDPF_RGB,
      bitCount: 24,
      masks: { r: 0xff0000, g: 0xff00, b: 0xff },
      data: [...px(10, 20, 30), ...px(200, 100, 50)],
    });
    expect([...decodeOk(dds).rgba]).toEqual([
      10, 20, 30, 255, 200, 100, 50, 255,
    ]);
  });

  it("decodes 32bpp A8R8G8B8 with alpha", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      pfFlags: DDPF_RGB | DDPF_ALPHAPIXELS,
      bitCount: 32,
      masks: { r: 0xff0000, g: 0xff00, b: 0xff, a: 0xff000000 },
      data: u32(((128 << 24) | (10 << 16) | (20 << 8) | 30) >>> 0),
    });
    expect([...decodeOk(dds).rgba]).toEqual([10, 20, 30, 128]);
  });

  it("decodes 16bpp R5G6B5 (scaling channels up to 8-bit)", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      pfFlags: DDPF_RGB,
      bitCount: 16,
      masks: { r: 0xf800, g: 0x7e0, b: 0x1f },
      data: u16((31 << 11) | (0 << 5) | 31),
    });
    expect([...decodeOk(dds).rgba]).toEqual([255, 0, 255, 255]);
  });

  it("decodes 8bpp luminance (L8) as grayscale", () => {
    const dds = buildDds({
      width: 2,
      height: 1,
      pfFlags: DDPF_LUMINANCE,
      bitCount: 8,
      masks: { r: 0xff },
      data: [40, 200],
    });
    expect([...decodeOk(dds).rgba]).toEqual([
      40, 40, 40, 255, 200, 200, 200, 255,
    ]);
  });

  it("decodes 8bpp alpha-only (A8)", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      pfFlags: DDPF_ALPHA,
      bitCount: 8,
      masks: { a: 0xff },
      data: [123],
    });
    expect([...decodeOk(dds).rgba]).toEqual([123, 123, 123, 255]);
  });

  it("synthesizes masks for a maskless 24bpp surface", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      pfFlags: DDPF_RGB,
      bitCount: 24,
      data: [30, 20, 10], // [B,G,R] under the default R8G8B8 masks
    });
    expect([...decodeOk(dds).rgba]).toEqual([10, 20, 30, 255]);
  });

  it("decodes DX10 R8G8B8A8_UNORM (synthesized masks)", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      dx10: { dxgiFormat: 28 },
      data: u32(((200 << 24) | (30 << 16) | (20 << 8) | 10) >>> 0),
    });
    expect([...decodeOk(dds).rgba]).toEqual([10, 20, 30, 200]);
  });
});

describe("float / HDR formats", () => {
  it("decodes RGBA16F (DX10) tone-mapped to sRGB", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      dx10: { dxgiFormat: 10 },
      data: [...u16(H1), ...u16(H5), ...u16(H0), ...u16(H1)],
    });
    const res = decodeOk(dds);
    expect([...res.rgba]).toEqual([
      tonemapToSrgb8(1),
      tonemapToSrgb8(0.5),
      tonemapToSrgb8(0),
      255,
    ]);
    expect(res.format).toBe("RGBA16F");
  });

  it("decodes R32F (DX10) as grayscale", () => {
    const res = decodeOk(
      buildDds({
        width: 1,
        height: 1,
        dx10: { dxgiFormat: 41 },
        data: f32(0.5),
      }),
    );
    const g = tonemapToSrgb8(0.5);
    expect([...res.rgba]).toEqual([g, g, g, 255]);
  });

  it("decodes RGBA32F (DX10)", () => {
    const res = decodeOk(
      buildDds({
        width: 1,
        height: 1,
        dx10: { dxgiFormat: 2 },
        data: [...f32(0.25), ...f32(1), ...f32(0), ...f32(1)],
      }),
    );
    expect([...res.rgba]).toEqual([
      tonemapToSrgb8(0.25),
      tonemapToSrgb8(1),
      tonemapToSrgb8(0),
      255,
    ]);
  });

  it("decodes R11G11B10 packed float", () => {
    // R = 1.0 (11-bit: exp 15, mant 0 -> 15<<6 = 960); G,B = 0.
    const res = decodeOk(
      buildDds({
        width: 1,
        height: 1,
        dx10: { dxgiFormat: 26 },
        data: u32(960),
      }),
    );
    expect([...res.rgba]).toEqual([tonemapToSrgb8(1), 0, 0, 255]);
  });

  it("decodes a legacy D3DFMT float FourCC (A16B16G16R16F = 113)", () => {
    const dds = buildDds({
      width: 1,
      height: 1,
      fourCC: String.fromCharCode(113),
      pfFlags: 0x4,
      data: [...u16(H1), ...u16(H0), ...u16(H0), ...u16(H1)],
    });
    expect(decodeOk(dds).format).toBe("RGBA16F");
  });
});

describe("cubemaps", () => {
  it("lays six 24bpp faces out as a horizontal strip", () => {
    const faceW = 2;
    const faceH = 2;
    const data: number[] = [];
    for (let f = 0; f < 6; f++) {
      for (let p = 0; p < faceW * faceH; p++) data.push(0, 0, (f + 1) * 10); // [B,G,R]
    }
    const dds = buildDds({
      width: faceW,
      height: faceH,
      pfFlags: DDPF_RGB,
      bitCount: 24,
      masks: { r: 0xff0000, g: 0xff00, b: 0xff },
      caps2: 0xfe00, // CUBEMAP + all six face bits
      data,
    });
    expect(header(dds)).toMatchObject({ cubemap: true, faceCount: 6 });

    const res = decodeOk(dds);
    expect(res.width).toBe(faceW * 6);
    expect(res.height).toBe(faceH);
    expect(res.format).toMatch(/cubemap/);
    for (let f = 0; f < 6; f++) {
      expect(res.rgba[f * faceW * 4]).toBe((f + 1) * 10); // each face's red
    }
  });

  it("handles a BC1 cubemap (block-compressed faces) without throwing", () => {
    const data: number[] = [];
    for (let f = 0; f < 6; f++) data.push(...Array<number>(8).fill(0)); // one BC1 block/face
    const res = decodeOk(
      buildDds({
        width: 4,
        height: 4,
        fourCC: "DXT1",
        pfFlags: 0x4,
        caps2: 0xfe00,
        data,
      }),
    );
    expect(res.width).toBe(24);
  });
});

describe("block-compressed sanity (refactor didn't break BC)", () => {
  it("decodes a BC1 surface to the right dimensions", () => {
    const res = decodeOk(
      buildDds({
        width: 4,
        height: 4,
        fourCC: "DXT1",
        pfFlags: 0x4,
        data: Array<number>(8).fill(0),
      }),
    );
    expect(res.rgba.length).toBe(4 * 4 * 4);
  });
});
