"""Brushed grain for the vector star (fit3d.py's output), drawn as vector strokes, not a noise filter.

Two tiling patterns of thin light and dark streaks, blended as an overlay. Being geometry,
the streaks average out when the logo is drawn small, where a noise filter aliases into
speckle. The face is brushed horizontally and each bevel along its own edge, plus a few
faint scratches and pits. The defaults were tuned so the grain's contrast, measured at
1 to 16 pixels apart, matches the 3D render's.

  python3 grain.py <in.svg> <out.svg>
"""
import argparse
import math
import random
import re

ap = argparse.ArgumentParser(description='Add brushed grain to the vector star.')
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--density', type=float, default=200, help='streaks per 1000 square units, per pattern')
ap.add_argument('--gain', type=float, default=0.35, help='streak opacity multiplier')
ap.add_argument('--bevel', type=float, default=0.6, help='grain strength on the bevels, relative to the face (0 = none)')
ap.add_argument('--wmed', type=float, default=0.5, help='median streak width, in logo units')
ap.add_argument('--lmed', type=float, default=14.0, help='median streak length, in logo units')
ap.add_argument('--white', type=float, default=1.0, help='opacity of light streaks relative to dark ones')
ap.add_argument('--scratches', type=int, default=24)
ap.add_argument('--pits', type=int, default=18)
ap.add_argument('--seed', type=int, default=7)
a = ap.parse_args()
with open(a.src) as src:
    svg = src.read()
rnd = random.Random(a.seed)
f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.') or '0'

def tile(pid, tw, th):
    """One pattern tile: needle-shaped streaks (thin rhombi, so their ends taper), one path per colour and opacity."""
    n = int(a.density * tw * th / 1000); groups = {}
    for _ in range(n):
        x, y = rnd.uniform(0, tw), rnd.uniform(0, th)
        ln = min(tw * 0.8, max(1.5, a.lmed * math.exp(rnd.gauss(0, 0.7))))
        w = min(1.2, max(0.12, a.wmed * math.exp(rnd.gauss(0, 0.5))))
        key = (rnd.random() < 0.5, rnd.choice([0.14, 0.26, 0.42]))
        segs = [(x, y)] + ([(x - tw, y)] if x + ln > tw else [])
        for sy in ([y + th] if y < w else []) + ([y - th] if y > th - w else []): segs += [(s[0], sy) for s in list(segs)]
        h, v = '%.1f' % (ln / 2), ('%.2f' % (w / 2)).lstrip('0')
        groups.setdefault(key, []).extend('M%.1f %sl%s-%s %s %s-%s %sz' % (sx, f(sy), h, v, h, v, h, v) for sx, sy in segs)
    o = ['    <pattern id="%s" patternUnits="userSpaceOnUse" width="%s" height="%s">' % (pid, f(tw), f(th))]
    for (white, op), d in sorted(groups.items()):
        o.append('      <path d="%s" fill="%s" fill-opacity="%s"/>' % (''.join(d), '#fff' if white else '#000', f(min(1, op * a.gain * (a.white if white else 1)))))
    o.append('    </pattern>')
    return o

defs = tile('brushA', 53, 31) + tile('brushB', 43, 37)
face = ['    <!-- brushed grain (vector streaks, overlay), scratches and pits -->',
        '    <g style="mix-blend-mode:overlay">',
        '      <rect width="176" height="168" fill="url(#brushA)"/>',
        '      <rect width="176" height="168" fill="url(#brushB)"/>',
        '    </g>']
marks = []
for _ in range(a.scratches):
    r, t = 62 * math.sqrt(rnd.random()), rnd.random() * 2 * math.pi
    x, y = 88 + r * math.cos(t), 93.58 + r * math.sin(t)
    ang, ln = rnd.gauss(0, 0.5) if rnd.random() < 0.5 else rnd.random() * math.pi, 2 + rnd.random() * 10
    dx, dy = math.cos(ang) * ln / 2, math.sin(ang) * ln / 2
    marks.append('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-opacity="%.2f" stroke-width="%.2f" stroke-linecap="round"/>' % (
        x - dx, y - dy, x + dx, y + dy, '#fff' if rnd.random() < 0.45 else '#141a22', 0.12 + 0.16 * rnd.random(), 0.12 + 0.18 * rnd.random()))
for _ in range(a.pits):
    r, t = 60 * math.sqrt(rnd.random()), rnd.random() * 2 * math.pi
    x, y, pr = 88 + r * math.cos(t), 93.58 + r * math.sin(t), 0.12 + 0.2 * rnd.random()
    marks.append('<circle cx="%.1f" cy="%.1f" r="%.2f" fill="#10151c" fill-opacity="%.2f"/>' % (x, y, pr, 0.15 + 0.15 * rnd.random()))
    marks.append('<path d="M%.2f %.2f a%.2f %.2f 0 0 0 %.2f 0" stroke="#fff" stroke-opacity="0.22" stroke-width="0.08"/>' % (x - pr, y + 0.1, pr, pr, 2 * pr))
face.append('    <g fill="none">%s</g>' % ''.join(marks))
bev = []
if a.bevel > 0:
    quads = re.findall(r'<path d="M([^"]+) Z" fill="url\(#b(\d)_0\)"/>', svg)
    assert len(quads) == 10, len(quads)
    bev.append('    <g opacity="%s" style="mix-blend-mode:overlay">' % f(a.bevel))
    for d, i in quads:
        p = [tuple(map(float, q.split())) for q in d.split(' L')]
        ang = math.degrees(math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]))
        defs.append('    <pattern id="brushE%s" href="#brush%s" patternTransform="rotate(%s)"/>' % (i, 'AB'[int(i) % 2], f(ang)))
        bev.append('      <path d="M%s Z" fill="url(#brushE%s)"/>' % (d, i))
    bev.append('    </g>')
assert svg.count('    <!-- bevels -->') == 1
svg = svg.replace('  </defs>', '\n'.join(defs) + '\n  </defs>', 1).replace('    <!-- bevels -->', '\n'.join(face) + '\n    <!-- bevels -->')
if bev:
    k = svg.rindex('  </g>'); svg = svg[:k] + '\n'.join(bev) + '\n' + svg[k:]
svg = svg.replace('ten bevels of four strips each, and a face shaded with a gradient and soft shapes.',
                  'ten bevels of four strips each, a face shaded with a gradient and soft shapes, and brushed grain drawn as strokes.')
assert '--' not in re.sub(r'<!--|-->', '', svg)
with open(a.out, 'w') as out:
    out.write(svg)
print('wrote', a.out, len(svg), 'bytes')
