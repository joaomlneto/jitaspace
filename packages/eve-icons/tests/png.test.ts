/**
 * @jest-environment node
 */
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "@jest/globals";

import { readPng, stripMetadata } from "../scripts/png";

type Pixel = number[];

function crcTable() {
  return Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
}
const CRC = crcTable();

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  let crc = 0xffffffff;
  for (const byte of out.subarray(4, 8 + data.length)) {
    crc = CRC[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
  return out;
}

/** Apply PNG filter `type` to one scanline, given the previous raw one. */
function filterRow(row: number[], prev: number[], bpp: number, type: number) {
  return row.map((value, x) => {
    const left = x >= bpp ? row[x - bpp]! : 0;
    const up = prev[x] ?? 0;
    const upLeft = x >= bpp ? (prev[x - bpp] ?? 0) : 0;
    let predictor = 0;
    if (type === 1) predictor = left;
    else if (type === 2) predictor = up;
    else if (type === 3) predictor = (left + up) >> 1;
    else if (type === 4) {
      const estimate = left + up - upLeft;
      const dl = Math.abs(estimate - left);
      const du = Math.abs(estimate - up);
      const dul = Math.abs(estimate - upLeft);
      predictor = dl <= du && dl <= dul ? left : du <= dul ? up : upLeft;
    }
    return (value - predictor + 256) & 0xff;
  });
}

/** Encode a hand-made image; row `y` uses filter `y % 5`. */
function png(
  rows: Pixel[][],
  {
    colorType = 6,
    bitDepth = 8,
    interlace = 0,
    plte,
    trns,
    extra = [],
  }: {
    colorType?: number;
    bitDepth?: number;
    interlace?: number;
    plte?: number[];
    trns?: number[];
    /** Additional chunks, written after IHDR. */
    extra?: [string, string][];
  } = {},
): Uint8Array {
  const width = rows[0]!.length;
  const height = rows.length;
  const bpp = rows[0]![0]!.length;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[12] = interlace;
  let prev: number[] = [];
  const raw: number[] = [];
  rows.forEach((row, y) => {
    const flat = row.flat();
    raw.push(y % 5, ...filterRow(flat, prev, bpp, y % 5));
    prev = flat;
  });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    ...extra.map(([type, data]) => chunk(type, Buffer.from(data, "latin1"))),
    ...(plte ? [chunk("PLTE", Uint8Array.from(plte))] : []),
    ...(trns ? [chunk("tRNS", Uint8Array.from(trns))] : []),
    chunk("IDAT", deflateSync(Uint8Array.from(raw))),
    chunk("IEND", new Uint8Array()),
  ]);
}

const W: Pixel = [255, 255, 255, 255];
const T: Pixel = [0, 0, 0, 0];
const R: Pixel = [255, 0, 0, 255];

/** 6×5 white glyph on a transparent ground: every filter type appears once. */
const glyph = [
  [T, W, W, W, W, T],
  [W, T, T, T, T, W],
  [W, T, W, W, T, W],
  [W, T, T, T, T, W],
  [T, W, W, W, W, T],
];

describe("readPng", () => {
  it("reads the dimensions", () => {
    const info = readPng(png(glyph));
    expect(info.width).toBe(6);
    expect(info.height).toBe(5);
  });

  it("recognises a single-colour glyph through every filter type", () => {
    expect(readPng(png(glyph)).monochrome).toBe(true);
  });

  it("rejects a glyph with a second colour", () => {
    const twoTone = glyph.map((row, y) =>
      y === 2 ? row.map((px) => (px === W ? R : px)) : row,
    );
    expect(readPng(png(twoTone)).monochrome).toBe(false);
  });

  it("ignores near-transparent pixels", () => {
    const faint: Pixel = [255, 0, 0, 40];
    const withHalo = glyph.map((row) =>
      row.map((px) => (px === T ? faint : px)),
    );
    expect(readPng(png(withHalo)).monochrome).toBe(true);
  });

  it("treats a fully transparent image as not tintable", () => {
    expect(readPng(png([[T, T]])).monochrome).toBe(false);
  });

  it("reads RGB, grey and grey+alpha images", () => {
    expect(
      readPng(
        png(
          [
            [
              [10, 10, 10],
              [10, 10, 10],
            ],
          ],
          { colorType: 2 },
        ),
      ),
    ).toMatchObject({ width: 2, monochrome: true });
    expect(readPng(png([[[7], [7]]], { colorType: 0 })).monochrome).toBe(true);
    expect(
      readPng(
        png(
          [
            [
              [200, 255],
              [0, 0],
              [10, 255],
            ],
          ],
          { colorType: 4 },
        ),
      ).monochrome,
    ).toBe(false);
  });

  it("reads palette images with transparency", () => {
    const info = readPng(
      png([[[0], [1], [1]]], {
        colorType: 3,
        plte: [0, 0, 0, 255, 255, 255],
        trns: [0],
      }),
    );
    expect(info.monochrome).toBe(true);
  });

  it("gives up on formats it does not decode", () => {
    expect(readPng(png(glyph, { interlace: 1 }))).toEqual({
      width: 6,
      height: 5,
      monochrome: false,
    });
  });

  it("throws on something that is not a PNG", () => {
    expect(() => readPng(Uint8Array.from([1, 2, 3]))).toThrow("Not a PNG");
  });
});

/** The chunk types in a PNG, in order. */
function chunkTypes(bytes: Uint8Array): string[] {
  const buffer = Buffer.from(bytes);
  const types: string[] = [];
  for (let offset = 8; offset < buffer.length; ) {
    types.push(buffer.toString("latin1", offset + 4, offset + 8));
    offset += 12 + buffer.readUInt32BE(offset);
  }
  return types;
}

describe("stripMetadata", () => {
  const original = png(glyph, {
    extra: [
      ["iTXt", "XML:com.adobe.xmp\0\0\0\0\0<x:xmpmeta/>"],
      ["tEXt", "Software\0Adobe ImageReady"],
      ["gAMA", "\0\0\xb1\x8f"],
      ["pHYs", "\0\0\x0b\x13\0\0\x0b\x13\x01"],
      ["sRGB", "\0"],
    ],
  });

  it("drops text and bookkeeping chunks but keeps colour information", () => {
    expect(chunkTypes(original)).toEqual([
      "IHDR",
      "iTXt",
      "tEXt",
      "gAMA",
      "pHYs",
      "sRGB",
      "IDAT",
      "IEND",
    ]);
    expect(chunkTypes(stripMetadata(original))).toEqual([
      "IHDR",
      "gAMA",
      "sRGB",
      "IDAT",
      "IEND",
    ]);
  });

  it("leaves the image itself unchanged", () => {
    expect(readPng(stripMetadata(original))).toEqual(readPng(original));
  });
});
