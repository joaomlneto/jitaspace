"""The logo's SVG model, a numpy renderer for it, and the SVG writer.

The model, bottom to top, everything clipped to the star:
  body    a linear gradient with NSTOP evenly spaced stops
  shapes  soft ellipses (radial gradients fading to transparent) and soft
          half-planes (linear-gradient opacity ramps), one colour each
  top     fixed bevel and rim polygons with their own gradients
  border  a black stroke around the star
Layers composite with straight-alpha "over" in sRGB, as browsers do, so the
renderer predicts what a browser draws closely enough to optimise against.
"""
import math

import numpy as np

S = 2                       # raster scale while fitting: px per user unit
W, H = 176 * S, 168 * S     # the logo is 176 x 168 user units
SS = 4                      # supersampling for polygon coverage
NSTOP = 24                  # body gradient stops

# The star: a regular pentagram (flat arm tops), fitted by least squares to the
# corners of the original PNG. No corner moved more than 2.4 units.
CX, CY, R = 88.0, 93.58, 88.92
K = math.cos(math.radians(72)) / math.cos(math.radians(36))   # inner / outer radius
STAR = [(round(CX + R * (1 if i % 2 == 0 else K) * math.cos(math.radians(-90 + 36 * i)), 3),
         round(CY + R * (1 if i % 2 == 0 else K) * math.sin(math.radians(-90 + 36 * i)), 3))
        for i in range(10)]

# The original PNG's star, as measured (lopsided by up to 2.4 units), and its centre.
SOURCE_STAR = [(88, 5), (109.5, 64.75), (172.2, 65.8), (121.3, 105.5), (139.4, 166), (88, 128.5),
               (35.8, 163.5), (53.9, 105.8), (4.3, 66.2), (66.6, 64.75)]
SOURCE_CENTRE = (87.90, 93.58)

# Bevels and rims, measured on the source PNG; fan_map moves them onto STAR.
SOURCE_TOP = [
    dict(id='bevelTop', pts=[(88, 5), (109.5, 64.75), (150, 64.8), (135, 65.5), (125, 66.5), (120, 67.75), (115, 68.5),
                              (110, 69.2), (103.6, 69.5), (101.5, 64.5), (88, 6.6)],
         grad=(9, 24, [(0, '#aeb3b9', 1), (1, '#fafeff', 1)])),
    dict(id='bevelLow', pts=[(117.3, 105.6), (121.3, 105.5), (139.4, 166), (137.6, 162), (132, 149), (127.5, 137),
                              (123.5, 125), (119.25, 112)],
         grad=(106, 166, [(0, '#fbfdfe', 1), (0.6, '#f5fafd', 1), (0.78, '#dfe8f0', 1), (0.9, '#ced7e1', 1), (1, '#b8c1cb', 1)])),
    dict(id='rimLeft', pts=[(8, 66.1), (66.6, 64.75), (65.6, 69.2), (30, 69.2), (12, 68.2)],
         grad=(64.75, 69.2, [(0, '#d2d5dc', 1), (0.5, '#c3c8cf', 1), (0.75, '#a9b0ba', 1), (0.85, '#7e8796', 0.6), (1, '#7e8796', 0)])),
    dict(id='rimRight', pts=[(140, 64.9), (172.2, 65.8), (165, 66.7), (140, 66.4)],
         grad=(0, 1, [(0, '#8c929c', 0.6), (1, '#8c929c', 0.6)])),
]


def fan_map(px, py, src, csrc, dst, cdst):
    """Piecewise-affine map over the fan of triangles (centre, v_i, v_i+1), extended outward per sector."""
    px = np.asarray(px, float); py = np.asarray(py, float)
    ox, oy = np.zeros_like(px), np.zeros_like(py); done = np.zeros(px.shape, bool)
    for i in range(10):
        a = np.subtract(src[i], csrc); b = np.subtract(src[(i + 1) % 10], csrc)
        det = a[0] * b[1] - a[1] * b[0]
        dx, dy = px - csrc[0], py - csrc[1]
        u = (dx * b[1] - dy * b[0]) / det; v = (a[0] * dy - a[1] * dx) / det
        m = (u >= -1e-9) & (v >= -1e-9) & ~done
        A = np.subtract(dst[i], cdst); B = np.subtract(dst[(i + 1) % 10], cdst)
        ox[m] = cdst[0] + u[m] * A[0] + v[m] * B[0]; oy[m] = cdst[1] + u[m] * A[1] + v[m] * B[1]
        done |= m
    return ox, oy


def top_layers():
    """SOURCE_TOP moved onto the symmetric star."""
    out = []
    for L in SOURCE_TOP:
        mx, my = fan_map([p[0] for p in L['pts']], [p[1] for p in L['pts']], SOURCE_STAR, SOURCE_CENTRE, STAR, (CX, CY))
        out.append(dict(L, pts=[(round(float(x), 2), round(float(y), 2)) for x, y in zip(mx, my)]))
    return out


# ---------------------------------------------------------------- rasterising
def grid(ss=1):
    o = (np.arange(ss) + 0.5) / ss
    xs = (np.arange(W)[:, None] + o[None, :]).reshape(-1) / S
    ys = (np.arange(H)[:, None] + o[None, :]).reshape(-1) / S
    return np.meshgrid(xs, ys)

X, Y = grid(1)


def poly_cover(pts):
    """Fraction of each pixel inside the polygon (even-odd rule, supersampled)."""
    gx, gy = grid(SS)
    inside = np.zeros(gx.shape, bool)
    for i in range(len(pts)):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % len(pts)]
        cond = (y1 > gy) != (y2 > gy)
        xint = (x2 - x1) * (gy - y1) / ((y2 - y1) if y2 != y1 else 1e-9) + x1
        inside ^= cond & (gx < xint)
    return inside.reshape(H, SS, W, SS).mean(axis=(1, 3))


def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def vgrad(y1, y2, stops):
    """A vertical gradient: stops are [(offset, '#hex', opacity)]."""
    t = np.clip((Y - y1) / (y2 - y1), 0, 1)
    offs = [s[0] for s in stops]
    col = np.stack([np.interp(t, offs, [hexrgb(s[1])[c] for s in stops]) for c in range(3)], -1)
    return col, np.interp(t, offs, [s[2] for s in stops])


def top_stack(star, layers):
    """The top layers as (transmittance, premultiplied colour): final = below * Tm + P."""
    Tm = np.ones((H, W)); P = np.zeros((H, W, 3))
    for L in layers:
        col, op = vgrad(*L['grad'])
        a = poly_cover(L['pts']) * star * op
        P = P * (1 - a)[..., None] + col * a[..., None]; Tm *= (1 - a)
    return Tm, P


# ---------------------------------------------------------------- shapes
PROFILE_R = np.array([0, .2, .4, .6, .8, 1.0])          # radial falloff, ~(1 - r^2)^2,
PROFILE_V = np.array([1, .92, .71, .41, .13, 0.0])      # as SVG gradient stops


def shape_alpha(p):
    """Opacity field (H, W) of a shape, before the star clip."""
    if p['t'] == 'e':
        c, s = math.cos(p['rot']), math.sin(p['rot'])
        dx, dy = X - p['cx'], Y - p['cy']
        u = (dx * c + dy * s) / p['rx']; v = (-dx * s + dy * c) / p['ry']
        r = np.sqrt(u * u + v * v)
        return p['a'] * np.where(r < 1, np.interp(r, PROFILE_R, PROFILE_V), 0)
    dx, dy = p['x2'] - p['x1'], p['y2'] - p['y1']
    t = np.clip(((X - p['x1']) * dx + (Y - p['y1']) * dy) / (dx * dx + dy * dy + 1e-9), 0, 1)
    return p['a'] * t


def random_shape(rng):
    if rng.random() < 0.6:
        return dict(t='e', cx=rng.uniform(10, 166), cy=rng.uniform(10, 160), rx=rng.uniform(3, 40), ry=rng.uniform(3, 40),
                    rot=rng.uniform(0, math.pi), a=rng.choice([0.3, 0.5, 0.7, 0.9]), c=[128, 128, 128])
    x1, y1 = rng.uniform(10, 166), rng.uniform(10, 160); ang = rng.uniform(0, 2 * math.pi); L = rng.uniform(3, 50)
    return dict(t='h', x1=x1, y1=y1, x2=x1 + L * math.cos(ang), y2=y1 + L * math.sin(ang),
                a=rng.choice([0.3, 0.5, 0.7, 0.9]), c=[128, 128, 128])


def mutate(p, rng):
    q = dict(p); k = rng.integers(0, 6)
    if q['t'] == 'e':
        if k == 0: q['cx'] += rng.normal(0, 3)
        elif k == 1: q['cy'] += rng.normal(0, 3)
        elif k == 2: q['rx'] = max(1.5, q['rx'] * math.exp(rng.normal(0, .15)))
        elif k == 3: q['ry'] = max(1.5, q['ry'] * math.exp(rng.normal(0, .15)))
        elif k == 4: q['rot'] += rng.normal(0, .2)
        else: q['a'] = float(np.clip(q['a'] + rng.normal(0, .1), 0.05, 1))
    else:
        if k == 0: q['x1'] += rng.normal(0, 3)
        elif k == 1: q['y1'] += rng.normal(0, 3)
        elif k == 2: q['x2'] += rng.normal(0, 3)
        elif k == 3: q['y2'] += rng.normal(0, 3)
        else: q['a'] = float(np.clip(q['a'] + rng.normal(0, .1), 0.05, 1))
    return q


# ---------------------------------------------------------------- body gradient
def body_frame(phi):
    """Gradient endpoints spanning the star along direction phi."""
    ux, uy = math.cos(phi), math.sin(phi)
    proj = [(x - 88) * ux + (y - 90) * uy for x, y in STAR]
    lo, hi = min(proj), max(proj)
    return (88 + lo * ux, 90 + lo * uy, 88 + hi * ux, 90 + hi * uy)


def body_weights(frame):
    x1, y1, x2, y2 = frame
    dx, dy = x2 - x1, y2 - y1
    t = np.clip(((X - x1) * dx + (Y - y1) * dy) / (dx * dx + dy * dy), 0, 1) * (NSTOP - 1)
    k = np.minimum(t.astype(int), NSTOP - 2)
    return k, t - k


def body_render(frame, stops):
    k, f = body_weights(frame)
    return stops[k] * (1 - f)[..., None] + stops[k + 1] * f[..., None]


def solve_body(frame, Tr, B, Wt, T, lam=50.0):
    """Stops minimising sum Wt (Tr * body + B - T)^2, plus a curvature penalty; per channel."""
    k, f = body_weights(frame)
    m = Wt > 0
    kk, ff, tr, w = k[m], f[m], Tr[m], Wt[m]
    A = np.zeros((NSTOP, NSTOP)); rhs = np.zeros((NSTOP, 3))
    a0 = tr * (1 - ff); a1 = tr * ff
    tgt = T[m] - B[m]
    for ia, wa in ((kk, a0), (kk + 1, a1)):
        for ib, wb in ((kk, a0), (kk + 1, a1)):
            np.add.at(A, (ia, ib), w * wa * wb)
        np.add.at(rhs, ia, (w * wa)[:, None] * tgt)
    D = np.diff(np.eye(NSTOP), 2, axis=0)
    A += lam * D.T @ D + 1e-6 * np.eye(NSTOP)
    return np.clip(np.linalg.solve(A, rhs), 0, 255)


# ---------------------------------------------------------------- SVG
def write_svg(frame, stops, shapes, layers, comment, border_width, border_join):
    f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
    hx = lambda c: '#%02x%02x%02x' % tuple(int(round(min(255, max(0, v)))) for v in c)
    pts = lambda P: ' L'.join('%s %s' % (f(x), f(y)) for x, y in P)
    o = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 168" width="176" height="168" role="img" aria-label="JitaSpace">',
         '  <title>JitaSpace</title>']
    if len(comment) == 1:
        o.append('  <!-- %s -->' % comment[0])
    else:
        o.append('  <!-- %s' % comment[0])
        o += ['       %s' % line for line in comment[1:-1]]
        o.append('       %s -->' % comment[-1])
    o += ['  <defs>', '    <path id="star" d="M%s Z"/>' % pts(STAR),
          '    <clipPath id="clip"><use href="#star"/></clipPath>',
          '    <linearGradient id="body" gradientUnits="userSpaceOnUse" x1="%s" y1="%s" x2="%s" y2="%s">' % tuple(map(f, frame))]
    for i, s in enumerate(stops):
        o.append('      <stop offset="%s" stop-color="%s"/>' % (f(i / (NSTOP - 1)), hx(s)))
    o.append('    </linearGradient>')
    op = lambda v: ('%.3f' % v).rstrip('0').rstrip('.') or '0'
    for i, p in enumerate(shapes):
        c = hx(p['c'])
        if p['t'] == 'e':
            o.append('    <radialGradient id="g%d">' % i)
            for r, v in zip(PROFILE_R, PROFILE_V):
                o.append('      <stop offset="%s" stop-color="%s" stop-opacity="%s"/>' % (f(r), c, op(p['a'] * v)))
            o.append('    </radialGradient>')
        else:
            o.append('    <linearGradient id="g%d" gradientUnits="userSpaceOnUse" x1="%s" y1="%s" x2="%s" y2="%s">'
                     % (i, f(p['x1']), f(p['y1']), f(p['x2']), f(p['y2'])))
            o.append('      <stop offset="0" stop-color="%s" stop-opacity="0"/>' % c)
            o.append('      <stop offset="1" stop-color="%s" stop-opacity="%s"/>' % (c, op(p['a'])))
            o.append('    </linearGradient>')
    for L in layers:
        y1, y2, st = L['grad']
        o.append('    <linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="0" y1="%s" x2="0" y2="%s">' % (L['id'], f(y1), f(y2)))
        for off, c, a in st:
            o.append('      <stop offset="%s" stop-color="%s"%s/>' % (f(off), c, '' if a == 1 else ' stop-opacity="%s"' % f(a)))
        o.append('    </linearGradient>')
    o += ['  </defs>', '  <use href="#star" fill="url(#body)"/>', '  <g clip-path="url(#clip)">']
    for i, p in enumerate(shapes):
        if p['t'] == 'e':
            o.append('    <ellipse cx="0" cy="0" rx="%s" ry="%s" transform="translate(%s %s) rotate(%s)" fill="url(#g%d)"/>'
                     % (f(p['rx']), f(p['ry']), f(p['cx']), f(p['cy']), f(math.degrees(p['rot'])), i))
        else:
            o.append('    <rect width="176" height="168" fill="url(#g%d)"/>' % i)
    for L in layers:
        o.append('    <path d="M%s Z" fill="url(#%s)"/>' % (pts(L['pts']), L['id']))
    o += ['  </g>',
          '  <use href="#star" fill="none" stroke="#000" stroke-width="%s" stroke-linejoin="%s"/>' % (f(border_width), border_join),
          '</svg>']
    return '\n'.join(o) + '\n'
