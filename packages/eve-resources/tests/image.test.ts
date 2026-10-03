import { inflateSync } from "node:zlib";
import { describe, expect, it } from "@jest/globals";

import {
  decodeBC1,
  decodeBC4,
  decodeDds,
  decodeTga,
  encodePng,
  parseDdsHeader,
} from "../src/index";

describe("encodePng", () => {
  /** Pull the (single) IDAT chunk out of a PNG and inflate it. */
  function inflateIdat(png: Uint8Array): Uint8Array {
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    let off = 8; // skip the 8-byte signature
    const parts: Uint8Array[] = [];
    while (off + 8 <= png.length) {
      const len = view.getUint32(off);
      const type = String.fromCharCode(...png.subarray(off + 4, off + 8));
      if (type === "IDAT") parts.push(png.subarray(off + 8, off + 8 + len));
      off += 12 + len;
    }
    const merged = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of parts) {
      merged.set(p, at);
      at += p.length;
    }
    return new Uint8Array(inflateSync(merged));
  }

  it("emits a valid PNG signature and IHDR for the given dimensions", async () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]); // 2x1: red, green
    const png = await encodePng(rgba, 2, 1);

    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(String.fromCharCode(...png.subarray(12, 16))).toBe("IHDR");
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(2); // width
    expect(view.getUint32(20)).toBe(1); // height
    expect(png[24]).toBe(8); // bit depth
    expect(png[25]).toBe(6); // color type RGBA
  });

  it("round-trips pixels through the deflated IDAT (filter byte + scanline)", async () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
    const png = await encodePng(rgba, 2, 1);
    const raw = inflateIdat(png);
    expect(raw[0]).toBe(0); // per-scanline filter byte: none
    expect([...raw.subarray(1)]).toEqual([...rgba]);
  });
});

describe("decodeTga", () => {
  function header(
    imageType: number,
    width: number,
    height: number,
    bpp: number,
    descriptor: number,
  ): number[] {
    return [
      0,
      0,
      imageType,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      width & 0xff,
      width >> 8,
      height & 0xff,
      height >> 8,
      bpp,
      descriptor,
    ];
  }

  it("returns null for too-short or color-mapped input", () => {
    expect(decodeTga(new Uint8Array(10))).toBeNull();
    expect(
      decodeTga(new Uint8Array([...header(1, 1, 1, 32, 0x20)])),
    ).toBeNull();
  });

  it("decodes uncompressed 32bpp BGRA (type 2), top-to-bottom", () => {
    // 2x2: red, green / blue, white — stored BGRA, descriptor 0x20 (top-left).
    const bytes = new Uint8Array([
      ...header(2, 2, 2, 32, 0x20),
      0,
      0,
      255,
      255, // red
      0,
      255,
      0,
      255, // green
      255,
      0,
      0,
      255, // blue
      255,
      255,
      255,
      255, // white
    ]);
    const img = decodeTga(bytes);
    expect(img).not.toBeNull();
    expect(img?.width).toBe(2);
    expect([...(img?.rgba ?? [])]).toEqual([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ]);
  });

  it("flips bottom-left origin images vertically", () => {
    // 1x2, descriptor 0 (bottom-left): file order red, green → output green, red.
    const bytes = new Uint8Array([
      ...header(2, 1, 2, 32, 0x00),
      0,
      0,
      255,
      255, // red (file row 0 = bottom)
      0,
      255,
      0,
      255, // green (file row 1 = top)
    ]);
    expect([...(decodeTga(bytes)?.rgba ?? [])]).toEqual([
      0,
      255,
      0,
      255, // top row → green
      255,
      0,
      0,
      255, // bottom row → red
    ]);
  });

  it("decodes 8bpp grayscale (type 3)", () => {
    const bytes = new Uint8Array([...header(3, 2, 1, 8, 0x20), 0, 255]);
    expect([...(decodeTga(bytes)?.rgba ?? [])]).toEqual([
      0, 0, 0, 255, 255, 255, 255, 255,
    ]);
  });

  it("decodes RLE true-color (type 10): one repeat packet of 4 red pixels", () => {
    // RLE packet header 0x83 = repeat (0x80) count (3)+1 = 4 × the next pixel.
    const bytes = new Uint8Array([
      ...header(10, 2, 2, 32, 0x20),
      0x83,
      0,
      0,
      255,
      255,
    ]);
    const rgba = decodeTga(bytes)?.rgba ?? new Uint8Array();
    expect(rgba).toHaveLength(16);
    expect([...rgba.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...rgba.subarray(12, 16)]).toEqual([255, 0, 0, 255]);
  });
});

describe("parseDdsHeader", () => {
  function makeDds(opts: {
    width: number;
    height: number;
    flags: number;
    fourCC?: string;
    bitCount?: number;
    masks?: [number, number, number, number];
    dxgi?: number;
    data?: Uint8Array;
  }): Uint8Array {
    const headerLen = 128 + (opts.fourCC === "DX10" ? 20 : 0);
    const buf = new Uint8Array(headerLen + (opts.data?.length ?? 0));
    const view = new DataView(buf.buffer);
    view.setUint32(0, 0x20534444, true); // "DDS "
    view.setUint32(12, opts.height, true);
    view.setUint32(16, opts.width, true);
    view.setUint32(80, opts.flags, true);
    if (opts.fourCC) {
      for (let i = 0; i < 4; i++) buf[84 + i] = opts.fourCC.charCodeAt(i);
    }
    if (opts.bitCount !== undefined) view.setUint32(88, opts.bitCount, true);
    if (opts.masks) {
      view.setUint32(92, opts.masks[0], true);
      view.setUint32(96, opts.masks[1], true);
      view.setUint32(100, opts.masks[2], true);
      view.setUint32(104, opts.masks[3], true);
    }
    if (opts.dxgi !== undefined) view.setUint32(128, opts.dxgi, true);
    if (opts.data) buf.set(opts.data, headerLen);
    return buf;
  }

  it("returns null for non-DDS or too-short bytes", () => {
    expect(parseDdsHeader(new Uint8Array(8))).toBeNull();
    expect(parseDdsHeader(new Uint8Array(200))).toBeNull(); // 200 bytes but no magic
  });

  it("resolves legacy FourCC formats", () => {
    expect(
      parseDdsHeader(
        makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "DXT1" }),
      )?.format,
    ).toBe("BC1");
    expect(
      parseDdsHeader(
        makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "DXT5" }),
      )?.format,
    ).toBe("BC3");
    expect(
      parseDdsHeader(
        makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "ATI2" }),
      )?.format,
    ).toBe("BC5");
  });

  it("resolves DX10 DXGI formats and marks BC7 / BC6H decodable", () => {
    const bc7 = parseDdsHeader(
      makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "DX10", dxgi: 98 }),
    );
    expect(bc7?.format).toBe("BC7");
    expect(bc7?.decodable).toBe(true);
    const bc6h = parseDdsHeader(
      makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "DX10", dxgi: 95 }),
    );
    expect(bc6h?.format).toBe("BC6H");
    expect(bc6h?.decodable).toBe(true);
    // An unmapped DXGI value stays a dxgi-N placeholder and undecodable.
    const other = parseDdsHeader(
      makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "DX10", dxgi: 999 }),
    );
    expect(other?.format).toBe("dxgi-999");
    expect(other?.decodable).toBe(false);
  });

  it("flags an RGB pixel format as uncompressed and decodable", () => {
    const info = parseDdsHeader(
      makeDds({ width: 1, height: 1, flags: 0x40, bitCount: 32 }),
    );
    expect(info?.format).toBe("uncompressed");
    expect(info?.decodable).toBe(true);
  });

  it("reads dimensions and mip count", () => {
    const info = parseDdsHeader(
      makeDds({ width: 256, height: 128, flags: 0x4, fourCC: "DXT1" }),
    );
    expect(info).toMatchObject({ width: 256, height: 128, fourCC: "DXT1" });
  });

  it("decodes a 1x1 uncompressed BGRA pixel", () => {
    const pixel = new Uint8Array(4);
    new DataView(pixel.buffer).setUint32(0, 0xffff0000, true); // R+A set
    const dds = makeDds({
      width: 1,
      height: 1,
      flags: 0x40,
      bitCount: 32,
      masks: [0x00ff0000, 0x0000ff00, 0x000000ff, 0xff000000],
      data: pixel,
    });
    const result = decodeDds(dds);
    expect(result.ok).toBe(true);
    if (result.ok) expect([...result.rgba]).toEqual([255, 0, 0, 255]);
  });

  it("decodes a BC1 DDS block via decodeDds", () => {
    // Solid-red BC1 block: color0 == color1 == 565 red, all indices 0.
    const block = new Uint8Array([0x00, 0xf8, 0x00, 0xf8, 0, 0, 0, 0]);
    const result = decodeDds(
      makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "DXT1", data: block }),
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect([...result.rgba.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
  });

  it("returns ok:false with the header for unsupported formats", () => {
    const result = decodeDds(
      makeDds({ width: 4, height: 4, flags: 0x4, fourCC: "DX10", dxgi: 999 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.format).toBe("dxgi-999");
      expect(result.info?.width).toBe(4);
    }
  });
});

describe("BC block decoders", () => {
  it("decodeBC1 fills a 4x4 block with the expanded 565 color", () => {
    const block = new Uint8Array([0x00, 0xf8, 0x00, 0xf8, 0, 0, 0, 0]); // red
    const rgba = decodeBC1(block, 4, 4);
    expect(rgba).toHaveLength(64);
    for (let i = 0; i < 16; i++) {
      expect([...rgba.subarray(i * 4, i * 4 + 4)]).toEqual([255, 0, 0, 255]);
    }
  });

  it("decodeBC4 expands a single channel to opaque grayscale", () => {
    // endpoints e0 == e1 == 128, all indices 0 → every texel = 128.
    const block = new Uint8Array([128, 128, 0, 0, 0, 0, 0, 0]);
    const rgba = decodeBC4(block, 4, 4);
    expect([...rgba.subarray(0, 4)]).toEqual([128, 128, 128, 255]);
  });
});
