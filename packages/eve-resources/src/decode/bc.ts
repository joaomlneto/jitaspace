/**
 * Block-compression (BCn / DXTn / S3TC) decoders. Each decodes the top mip
 * level of a tightly-packed block stream into RGBA8 pixels.
 *
 * Algorithms follow the canonical S3TC/RGTC definitions (Khronos
 * `EXT_texture_compression_s3tc` / `..._rgtc`). The BPTC formats (BC6H and BC7)
 * are larger and live in their own module — see `bptc.ts`.
 */

function rgb565(value: number): [number, number, number] {
  const r5 = (value >> 11) & 0x1f;
  const g6 = (value >> 5) & 0x3f;
  const b5 = value & 0x1f;
  return [(r5 << 3) | (r5 >> 2), (g6 << 2) | (g6 >> 4), (b5 << 3) | (b5 >> 2)];
}

/** Decode one 4x4 color block (BC1/BC2/BC3 share this layout). */
function decodeColorBlock(
  view: DataView,
  off: number,
  out: Uint8Array,
  bx: number,
  by: number,
  width: number,
  height: number,
  bc1Alpha: boolean,
): void {
  const c0 = view.getUint16(off, true);
  const c1 = view.getUint16(off + 2, true);
  const [r0, g0, b0] = rgb565(c0);
  const [r1, g1, b1] = rgb565(c1);
  const lookup = view.getUint32(off + 4, true);

  const pr = [r0, r1, 0, 0];
  const pg = [g0, g1, 0, 0];
  const pb = [b0, b1, 0, 0];
  const pa = [255, 255, 255, 255];

  if (c0 > c1 || !bc1Alpha) {
    pr[2] = (2 * r0 + r1) / 3;
    pg[2] = (2 * g0 + g1) / 3;
    pb[2] = (2 * b0 + b1) / 3;
    pr[3] = (r0 + 2 * r1) / 3;
    pg[3] = (g0 + 2 * g1) / 3;
    pb[3] = (b0 + 2 * b1) / 3;
  } else {
    pr[2] = (r0 + r1) / 2;
    pg[2] = (g0 + g1) / 2;
    pb[2] = (b0 + b1) / 2;
    pr[3] = 0;
    pg[3] = 0;
    pb[3] = 0;
    pa[3] = 0;
  }

  for (let py = 0; py < 4; py++) {
    for (let px = 0; px < 4; px++) {
      const x = bx + px;
      const y = by + py;
      if (x >= width || y >= height) continue;
      const code = (lookup >>> (2 * (py * 4 + px))) & 0x3;
      const di = (y * width + x) * 4;
      out[di] = (pr[code] ?? 0) | 0;
      out[di + 1] = (pg[code] ?? 0) | 0;
      out[di + 2] = (pb[code] ?? 0) | 0;
      out[di + 3] = pa[code] ?? 255;
    }
  }
}

/** Decode one 4x4 interpolated single-channel block (BC3 alpha / BC4 / BC5). */
function decodeChannelBlock(
  view: DataView,
  off: number,
  out: Uint8Array,
  bx: number,
  by: number,
  width: number,
  height: number,
  channel: number,
): void {
  const e0 = view.getUint8(off);
  const e1 = view.getUint8(off + 1);
  const palette = new Array<number>(8);
  palette[0] = e0;
  palette[1] = e1;
  if (e0 > e1) {
    for (let c = 2; c < 8; c++) palette[c] = ((8 - c) * e0 + (c - 1) * e1) / 7;
  } else {
    for (let c = 2; c < 6; c++) palette[c] = ((6 - c) * e0 + (c - 1) * e1) / 5;
    palette[6] = 0;
    palette[7] = 255;
  }

  // 16 x 3-bit indices packed little-endian across 6 bytes.
  let bits = 0n;
  for (let i = 5; i >= 0; i--)
    bits = (bits << 8n) | BigInt(view.getUint8(off + 2 + i));

  for (let py = 0; py < 4; py++) {
    for (let px = 0; px < 4; px++) {
      const x = bx + px;
      const y = by + py;
      if (x >= width || y >= height) continue;
      const code = Number((bits >> BigInt(3 * (py * 4 + px))) & 0x7n);
      out[(y * width + x) * 4 + channel] = (palette[code] ?? 0) | 0;
    }
  }
}

function eachBlock(
  width: number,
  height: number,
  blockBytes: number,
  fn: (off: number, bx: number, by: number) => void,
): void {
  let off = 0;
  for (let by = 0; by < height; by += 4) {
    for (let bx = 0; bx < width; bx += 4) {
      fn(off, bx, by);
      off += blockBytes;
    }
  }
}

function viewOf(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

export function decodeBC1(
  data: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const view = viewOf(data);
  eachBlock(width, height, 8, (off, bx, by) =>
    decodeColorBlock(view, off, out, bx, by, width, height, true),
  );
  return out;
}

export function decodeBC2(
  data: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const view = viewOf(data);
  eachBlock(width, height, 16, (off, bx, by) => {
    // 8 bytes of explicit 4-bit alpha, then the color block.
    let abits = 0n;
    for (let i = 7; i >= 0; i--)
      abits = (abits << 8n) | BigInt(view.getUint8(off + i));
    decodeColorBlock(view, off + 8, out, bx, by, width, height, false);
    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < 4; px++) {
        const x = bx + px;
        const y = by + py;
        if (x >= width || y >= height) continue;
        const a4 = Number((abits >> BigInt(4 * (py * 4 + px))) & 0xfn);
        out[(y * width + x) * 4 + 3] = (a4 << 4) | a4;
      }
    }
  });
  return out;
}

export function decodeBC3(
  data: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const view = viewOf(data);
  eachBlock(width, height, 16, (off, bx, by) => {
    decodeChannelBlock(view, off, out, bx, by, width, height, 3); // alpha
    decodeColorBlock(view, off + 8, out, bx, by, width, height, false);
  });
  return out;
}

export function decodeBC4(
  data: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const view = viewOf(data);
  eachBlock(width, height, 8, (off, bx, by) =>
    decodeChannelBlock(view, off, out, bx, by, width, height, 0),
  );
  // Single channel → present as opaque grayscale.
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const v = out[o] ?? 0;
    out[o + 1] = v;
    out[o + 2] = v;
    out[o + 3] = 255;
  }
  return out;
}

export function decodeBC5(
  data: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const view = viewOf(data);
  eachBlock(width, height, 16, (off, bx, by) => {
    decodeChannelBlock(view, off, out, bx, by, width, height, 0); // R
    decodeChannelBlock(view, off + 8, out, bx, by, width, height, 1); // G
  });
  // Two-channel data is almost always a tangent-space normal map; reconstruct
  // the Z component into blue for a recognizable preview.
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const nx = ((out[o] ?? 0) / 255) * 2 - 1;
    const ny = ((out[o + 1] ?? 0) / 255) * 2 - 1;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    out[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    out[o + 3] = 255;
  }
  return out;
}
