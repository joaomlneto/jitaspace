"""Round sticker artwork: the logo with the site's URL along the bottom edge.

  python3 sticker.py --out sticker-round.svg

The text is converted to outlines, so the file prints the same without the font
installed. The default font is Arial, as shipped with macOS; pass --font to use
another TrueType (.ttf, glyf outlines) font.
"""
import argparse
import math
import os
import re
import struct

HERE = os.path.dirname(os.path.abspath(__file__))

SIZE = 1000             # artboard; the sticker is the circle inscribed in it
STAR_R = 390            # the star's circumscribed radius on the sticker
STAR_CY = 445           # where the star's centre sits (the artboard centre is 500)
CAP_HEIGHT = 44         # height of the URL's capitals
BASELINE_R = 425        # the URL's baseline, as a radius from the centre
TRACKING = 0.04         # extra letter spacing, in ems


class Font:
    """Just enough of a TrueType font to outline text: cmap, metrics and glyf."""

    def __init__(self, path):
        self.d = d = open(path, 'rb').read()
        n = struct.unpack('>H', d[4:6])[0]
        self.t = {d[12 + 16 * i:16 + 16 * i].decode('latin-1'): struct.unpack('>II', d[20 + 16 * i:28 + 16 * i]) for i in range(n)}
        head = self.t['head'][0]
        self.upm = struct.unpack('>H', d[head + 18:head + 20])[0]
        self.long_loca = struct.unpack('>h', d[head + 50:head + 52])[0] == 1
        self.n_hmetrics = struct.unpack('>H', d[self.t['hhea'][0] + 34:self.t['hhea'][0] + 36])[0]
        self.cap = None
        os2 = self.t.get('OS/2')
        if os2 and struct.unpack('>H', d[os2[0]:os2[0] + 2])[0] >= 2:
            self.cap = struct.unpack('>h', d[os2[0] + 88:os2[0] + 90])[0]
        self.cmap = self._cmap()

    def _cmap(self):
        d, base = self.d, self.t['cmap'][0]
        for i in range(struct.unpack('>H', d[base + 2:base + 4])[0]):
            pid, eid, off = struct.unpack('>HHI', d[base + 4 + 8 * i:base + 12 + 8 * i])
            sub = base + off
            if (pid, eid) in ((3, 1), (0, 3)) and struct.unpack('>H', d[sub:sub + 2])[0] == 4:
                segx2 = struct.unpack('>H', d[sub + 6:sub + 8])[0]; seg = segx2 // 2
                arr = lambda o: struct.unpack('>%dH' % seg, d[sub + o:sub + o + segx2])
                ends, starts = arr(14), arr(16 + segx2)
                deltas = struct.unpack('>%dh' % seg, d[sub + 16 + 2 * segx2:sub + 16 + 3 * segx2])
                ro_at = sub + 16 + 3 * segx2
                ranges = arr(16 + 3 * segx2)
                m = {}
                for s in range(seg):
                    for c in range(starts[s], ends[s] + 1):
                        if c == 0xFFFF: continue
                        if ranges[s] == 0:
                            g = (c + deltas[s]) & 0xFFFF
                        else:
                            at = ro_at + 2 * s + ranges[s] + 2 * (c - starts[s])
                            g = struct.unpack('>H', d[at:at + 2])[0]
                            g = (g + deltas[s]) & 0xFFFF if g else 0
                        m[c] = g
                return m
        raise ValueError('no Unicode BMP cmap (format 4)')

    def advance(self, g):
        hm = self.t['hmtx'][0]
        i = min(g, self.n_hmetrics - 1)
        return struct.unpack('>H', self.d[hm + 4 * i:hm + 4 * i + 2])[0]

    def _loca(self, g):
        loca = self.t['loca'][0]
        if self.long_loca:
            return struct.unpack('>II', self.d[loca + 4 * g:loca + 4 * g + 8])
        a, b = struct.unpack('>HH', self.d[loca + 2 * g:loca + 2 * g + 4])
        return a * 2, b * 2

    def contours(self, g):
        """Glyph outline as a list of contours of (x, y, on_curve), in font units, y up."""
        start, end = self._loca(g)
        if start == end: return []
        d, p = self.d, self.t['glyf'][0] + start
        nc = struct.unpack('>h', d[p:p + 2])[0]
        if nc < 0:                                          # composite glyph
            out, q = [], p + 10
            while True:
                flags, gi = struct.unpack('>HH', d[q:q + 4]); q += 4
                if flags & 1: dx, dy = struct.unpack('>hh', d[q:q + 4]); q += 4
                else: dx, dy = struct.unpack('>bb', d[q:q + 2]); q += 2
                if flags & 0x8: q += 2
                elif flags & 0x40: q += 4
                elif flags & 0x80: q += 8
                out += [[(x + dx, y + dy, on) for x, y, on in c] for c in self.contours(gi)]
                if not flags & 0x20: return out
        ends = struct.unpack('>%dH' % nc, d[p + 10:p + 10 + 2 * nc])
        q = p + 10 + 2 * nc
        q += 2 + struct.unpack('>H', d[q:q + 2])[0]         # skip instructions
        n = ends[-1] + 1; flags = []
        while len(flags) < n:
            f = d[q]; q += 1; flags.append(f)
            if f & 8:
                r = d[q]; q += 1; flags += [f] * r
        xs, ys = [], []
        for coords, short, same in ((xs, 2, 16), (ys, 4, 32)):
            v = 0
            for f in flags:
                if f & short:
                    dv = d[q]; q += 1; v += dv if f & same else -dv
                elif not f & same:
                    v += struct.unpack('>h', d[q:q + 2])[0]; q += 2
                coords.append(v)
        pts = [(xs[i], ys[i], bool(flags[i] & 1)) for i in range(n)]
        out, s = [], 0
        for e in ends:
            out.append(pts[s:e + 1]); s = e + 1
        return out


def contour_path(c, tf):
    """A closed SVG path for one TrueType contour; tf maps font units to artboard coordinates."""
    if not any(on for _, _, on in c):                     # all off-curve: start at a midpoint
        c = [((c[0][0] + c[-1][0]) / 2, (c[0][1] + c[-1][1]) / 2, True)] + c
    k = next(i for i, (_, _, on) in enumerate(c) if on)
    c = c[k:] + c[:k]
    fmt = lambda pt: '%.2f %.2f' % tf(pt[0], pt[1])
    parts = ['M' + fmt(c[0])]
    i, n = 1, len(c)
    while i <= n:
        x, y, on = c[i % n]
        if on:
            parts.append('L' + fmt((x, y))); i += 1
        else:
            nx, ny, non = c[(i + 1) % n]
            end = (nx, ny) if non else ((x + nx) / 2, (y + ny) / 2)
            parts.append('Q' + fmt((x, y)) + ' ' + fmt(end))
            i += 2 if non else 1
    return ''.join(parts) + 'Z'


def text_on_arc(font, text):
    """Outlines for text along the bottom of the circle, upright, reading left to right."""
    cap = font.cap or 0.716 * font.upm
    scale = CAP_HEIGHT / cap
    glyphs = [font.cmap[ord(ch)] for ch in text]
    advances = [font.advance(g) * scale + TRACKING * font.upm * scale for g in glyphs]
    advances[-1] -= TRACKING * font.upm * scale
    mid_r = BASELINE_R - CAP_HEIGHT / 2          # space letters along the middle of the capitals
    total = sum(advances) / mid_r                # the angle the text spans
    paths, angle = [], -total / 2
    for g, adv in zip(glyphs, advances):
        # each glyph turns about its own centre, at angle phi from the bottom of the circle
        width = font.advance(g) * scale
        phi = angle + width / 2 / mid_r
        px = SIZE / 2 + BASELINE_R * math.sin(phi)
        py = SIZE / 2 + BASELINE_R * math.cos(phi)
        c, s = math.cos(-phi), math.sin(-phi)

        def tf(x, y, px=px, py=py, c=c, s=s, width=width):
            gx, gy = x * scale - width / 2, -y * scale      # glyph coordinates, baseline at y=0, y down
            return px + gx * c - gy * s, py + gx * s + gy * c
        paths += [contour_path(ct, tf) for ct in font.contours(g)]
        angle += adv / mid_r
    return ''.join(paths)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=os.path.join(HERE, 'sticker-round.svg'))
    ap.add_argument('--logo', default=os.path.join(HERE, '..', '..', 'public', 'logo.svg'))
    ap.add_argument('--font', default='/System/Library/Fonts/Supplemental/Arial.ttf')
    ap.add_argument('--text', default='WWW.JITA.SPACE')
    args = ap.parse_args()

    logo = open(args.logo).read()
    inner = re.search(r'<svg[^>]*>(.*)</svg>', logo, re.S).group(1)
    inner = re.sub(r'\s*<title>.*?</title>', '', inner)
    inner = re.sub(r'\s*<!--.*?-->', '', inner, flags=re.S)
    # place the logo so its star (centre 88,93.58, radius 88.92 in logo units) lands on STAR_R at (500, STAR_CY)
    k = STAR_R / 88.92
    x, y = SIZE / 2 - 88 * k, STAR_CY - 93.58 * k
    text = text_on_arc(Font(args.font), args.text)

    svg = '\n'.join([
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {0} {0}" width="{0}" height="{0}">'.format(SIZE),
        '  <title>JitaSpace sticker</title>',
        '  <!-- Round sticker: cut along the circle. The text is outlines, not a font.',
        '       Generated by scripts/logo/sticker.py from public/logo.svg. -->',
        '  <circle cx="500" cy="500" r="500" fill="#fff"/>',
        '  <svg x="%.2f" y="%.2f" width="%.2f" height="%.2f" viewBox="0 0 176 168">%s</svg>' % (x, y, 176 * k, 168 * k, inner.rstrip()),
        '  <path fill="#1a1a1a" d="%s"/>' % text,
        '</svg>', ''])
    open(args.out, 'w').write(svg)
    print('wrote', args.out)


if __name__ == '__main__':
    main()
