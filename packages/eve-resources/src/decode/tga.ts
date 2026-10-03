/**
 * Decode a TGA (Targa) image to RGBA8. Handles the common variants:
 * uncompressed/RLE true-color (types 2/10, 24 or 32 bpp) and grayscale
 * (types 3/11, 8 bpp). Color-mapped images (types 1/9) are not supported.
 */
export interface DecodedImage {
  width: number;
  height: number;
  rgba: Uint8Array;
}

export function decodeTga(bytes: Uint8Array): DecodedImage | null {
  if (bytes.length < 18) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const idLength = view.getUint8(0);
  const colorMapType = view.getUint8(1);
  const imageType = view.getUint8(2);
  const width = view.getUint16(12, true);
  const height = view.getUint16(14, true);
  const bpp = view.getUint8(16);
  const descriptor = view.getUint8(17);
  const topToBottom = (descriptor & 0x20) !== 0;

  const rle = imageType === 10 || imageType === 11;
  const trueColor = imageType === 2 || imageType === 10;
  const grayscale = imageType === 3 || imageType === 11;
  if (colorMapType !== 0 || (!trueColor && !grayscale)) return null;

  const channels = bpp >> 3;
  if (trueColor && channels !== 3 && channels !== 4) return null;
  if (grayscale && channels !== 1) return null;
  if (width <= 0 || height <= 0) return null;

  const total = width * height;
  const out = new Uint8Array(total * 4);

  // TGA true-color is stored BGR(A); the default origin is bottom-left.
  const readPixel = (off: number): [number, number, number, number] => {
    if (grayscale) {
      const v = bytes[off] ?? 0;
      return [v, v, v, 255];
    }
    return [
      bytes[off + 2] ?? 0, // R
      bytes[off + 1] ?? 0, // G
      bytes[off] ?? 0, // B
      channels === 4 ? (bytes[off + 3] ?? 255) : 255,
    ];
  };
  const writePixel = (
    pixel: number,
    rgba: [number, number, number, number],
  ) => {
    const x = pixel % width;
    const fileRow = Math.floor(pixel / width);
    const row = topToBottom ? fileRow : height - 1 - fileRow;
    const o = (row * width + x) * 4;
    out[o] = rgba[0];
    out[o + 1] = rgba[1];
    out[o + 2] = rgba[2];
    out[o + 3] = rgba[3];
  };

  let p = 18 + idLength; // skip the (optional) image-ID field; no color map (type 0)
  let pixel = 0;

  if (!rle) {
    for (; pixel < total && p + channels <= bytes.length; pixel++) {
      writePixel(pixel, readPixel(p));
      p += channels;
    }
  } else {
    while (pixel < total && p < bytes.length) {
      const header = bytes[p++] ?? 0;
      const count = (header & 0x7f) + 1;
      if (header & 0x80) {
        // RLE packet: one pixel repeated `count` times.
        const rgba = readPixel(p);
        p += channels;
        for (let k = 0; k < count && pixel < total; k++)
          writePixel(pixel++, rgba);
      } else {
        // Raw packet: `count` literal pixels.
        for (let k = 0; k < count && pixel < total; k++) {
          writePixel(pixel++, readPixel(p));
          p += channels;
        }
      }
    }
  }

  return { width, height, rgba: out };
}
