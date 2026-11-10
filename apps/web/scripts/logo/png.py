"""Minimal PNG reader (8-bit RGB/RGBA, non-interlaced), so the fit needs only numpy."""
import struct
import zlib

import numpy as np


def read_rgba(path):
    """Return an (h, w, 4) float array of straight-alpha RGBA in 0-255."""
    data = open(path, 'rb').read()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('%s is not a PNG' % path)
    pos, idat = 8, b''
    while pos < len(data):
        n = struct.unpack('>I', data[pos:pos + 4])[0]
        kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + n]
        if kind == b'IHDR':
            w, h, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', body)
            if depth != 8 or color not in (2, 6) or interlace:
                raise ValueError('only 8-bit, non-interlaced RGB/RGBA PNGs are supported')
        elif kind == b'IDAT':
            idat += body
        pos += 12 + n
    ch = 4 if color == 6 else 3
    stride = w * ch
    raw = np.frombuffer(zlib.decompress(idat), np.uint8).reshape(h, stride + 1)
    out = np.zeros((h, stride), np.int32)
    for y in range(h):
        f, line = raw[y, 0], raw[y, 1:].astype(np.int32)
        prev = out[y - 1] if y else np.zeros(stride, np.int32)
        if f == 0:
            cur = line
        elif f == 1:   # Sub: running sum per channel
            cur = line.copy()
            for x in range(ch, stride):
                cur[x] = (cur[x] + cur[x - ch]) & 255
        elif f == 2:   # Up
            cur = (line + prev) & 255
        elif f == 3:   # Average
            cur = line.copy()
            for x in range(stride):
                left = cur[x - ch] if x >= ch else 0
                cur[x] = (cur[x] + ((left + prev[x]) >> 1)) & 255
        elif f == 4:   # Paeth
            cur = line.copy()
            for x in range(stride):
                a = cur[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                cur[x] = (cur[x] + pred) & 255
        else:
            raise ValueError('bad PNG filter %d' % f)
        out[y] = cur
    img = out.reshape(h, w, ch).astype(np.float64)
    if ch == 3:
        img = np.dstack([img, np.full((h, w), 255.0)])
    return img
