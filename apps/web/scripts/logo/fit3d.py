"""Fits the vector logo to the 3D render of the star (source-3d.png, drawn by render3d.html).

The SVG is a regular five-pointed star with ten bevels, each drawn as four nested strips
with a gradient along the edge, over a face shaded by a gradient and soft shapes:

  - shapes are added one at a time where the error is largest, each scored on its
    bounding box, then nudged while that lowers the error (see model.py);
  - the strips get one gradient stop per pixel of the original logo along the edge;
  - then the target is corrected, round by round, so that the SVG shrunk onto the
    original logo's pixel grid matches the original's pixels and not only the render
    (back-projection of the low-resolution error, see lowres.py).

  python3 fit3d.py --out star.svg [--shapes 220] [--rounds 12] [--per-round 6] [--grain grain.npy]

--grain is what the grain layer (grain.py) adds at low resolution, measured by
`lowres.py grain`; the fit then leaves room for it. Deterministic: the same inputs
give the same file. About ten minutes.
"""
import argparse
import math
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lowres as Lr
import model as M
import png

ap = argparse.ArgumentParser(description='Fit the vector logo to the 3D render of the star.')
ap.add_argument('--out', required=True, help='the SVG to write')
ap.add_argument('--source', default=os.path.join(HERE, 'source-3d.png'), help='the 3D render, 704 x 672')
ap.add_argument('--shapes', type=int, default=220, help='shading shapes fitted to the render')
ap.add_argument('--rounds', type=int, default=12, help='correction rounds against the original logo')
ap.add_argument('--per-round', type=int, default=6, help='shapes added in each correction round')
ap.add_argument('--grain', help='what the grain layer adds at low resolution (.npy from lowres.py)')
args = ap.parse_args()
OUT, NSHAPES, ROUNDS, PER_ROUND = args.out, args.shapes, args.rounds, args.per_round
H, W, S = M.H, M.W, M.S
rng = np.random.default_rng(1)
t0 = time.time()
log = lambda *a: print('[%4.0fs]' % (time.time() - t0), *a, flush=True)

# ---- geometry of the 3D model (render3d.html and the shape render3d.py passes it), projected as the camera sees it
BEVEL, RISE, DOME, ROUND, FI = 0.08, 0.056, 0.06, 0.18, 0.34
R = M.R; D = (168 / R / 2) / math.tan(math.radians(14)); K = M.K
OUT_PTS = [((1 if i % 2 == 0 else K) * math.cos(math.radians(90 - 36 * i)), (1 if i % 2 == 0 else K) * math.sin(math.radians(90 - 36 * i))) for i in range(10)]
def inset(pts, d):
    n = len(pts); lines = []
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]; dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy)
        lines.append((a[0] + dy / l * d, a[1] - dx / l * d, dx, dy))
    out = []
    for i in range(n):
        p1x, p1y, d1x, d1y = lines[(i - 1) % n]; p2x, p2y, d2x, d2y = lines[i]
        det = d1x * d2y - d1y * d2x
        t = ((p2x - p1x) * d2y - (p2y - p1y) * d2x) / det
        out.append((p1x + d1x * t, p1y + d1y * t))
    return out
INNER = inset(OUT_PTS, BEVEL)
ramp = lambda u: (u if u < 1 - FI else u - (u - (1 - FI)) ** 2 / (2 * FI)) / (1 - FI / 2)
prof = lambda u: (1 - ROUND) * ramp(u) + ROUND * math.sqrt(1 - (1 - u) ** 2)
def corner(i, u):
    o, n = OUT_PTS[i], INNER[i]
    x, y = o[0] + (n[0] - o[0]) * u, o[1] + (n[1] - o[1]) * u
    z = (RISE + DOME * (1 - (n[0] ** 2 + n[1] ** 2))) * prof(u)
    k = D / (D - z)
    return (M.CX + x * k * R, M.CY - y * k * R)
CUTS, NB, STRIP_LAM = [0.0, 0.16, 0.42, 0.72], 15, 1.0

# ---- target: the 3D render at the fitting scale
raw = png.read_rgba(args.source)
assert raw.shape == (672, 704, 4), 'the render must be 704 x 672'
k4 = 4 // S
al = raw[..., 3:4] / 255
pre = (raw[..., :3] * al).reshape(H, k4, W, k4, 3).mean(axis=(1, 3)); al = al.reshape(H, k4, W, k4, 1).mean(axis=(1, 3))
T0 = np.where(al > 1e-3, pre / np.maximum(al, 1e-3), 255); Ta = al[..., 0]
star = M.poly_cover(M.STAR)

# ---- bevel strips: geometry once, colours whenever the target changes
STRIPS = []
for i in range(10):
    j = (i + 1) % 10
    polys = [[corner(i, u), corner(j, u), corner(j, 1.0), corner(i, 1.0)] for u in CUTS]
    covers = [M.poly_cover(p) * star for p in polys]
    a0, a1 = corner(i, 0.0), corner(j, 0.0); dx, dy = a1[0] - a0[0], a1[1] - a0[1]
    t = np.clip(((M.X - a0[0]) * dx + (M.Y - a0[1]) * dy) / (dx * dx + dy * dy), 0, 1) * (NB - 1)
    kk = np.minimum(t.astype(int), NB - 2); ff = t - kk
    for s, cov in enumerate(covers):
        excl = np.clip(cov - (covers[s + 1] if s + 1 < len(covers) else 0), 0, 1)
        STRIPS.append(dict(id='b%d_%d' % (i, s), pts=polys[s], a=a0, b=a1, cov=np.clip(cov, 0, 1), excl=excl, k=kk, f=ff, stops=None))
Dm = np.diff(np.eye(NB), 2, axis=0)
def solve_strips(T):
    Tm = np.ones((H, W)); P = np.zeros((H, W, 3))
    for st in STRIPS:
        w = st['excl'] * (Ta > 0.5); m = w > 0.02
        A = np.zeros((NB, NB)); rhs = np.zeros((NB, 3)); kk, ff, ww = st['k'][m], st['f'][m], w[m]
        for ia, wa in ((kk, 1 - ff), (kk + 1, ff)):
            for ib, wb in ((kk, 1 - ff), (kk + 1, ff)):
                np.add.at(A, (ia, ib), ww * wa * wb)
            np.add.at(rhs, ia, (ww * wa)[:, None] * T[m])
        st['stops'] = np.clip(np.linalg.solve(A + STRIP_LAM * Dm.T @ Dm + 1e-3 * np.eye(NB), rhs + 1e-3 * T[m].mean(axis=0)), 0, 255)
        col = st['stops'][st['k']] * (1 - st['f'])[..., None] + st['stops'][st['k'] + 1] * st['f'][..., None]
        c = st['cov']; P = P * (1 - c)[..., None] + col * c[..., None]; Tm = Tm * (1 - c)
    return Tm, P

# ---- state that follows the target
Wm = ((star > 0.999) & (Ta > 0.95)).astype(float)
def set_target(T):
    global Tm, P, Wt, Teff, Tcur
    Tcur = T; Tm, P = solve_strips(T)
    Wt = Wm * Tm ** 2
    Teff = np.where(Tm[..., None] > 0.02, (T - P) / np.maximum(Tm, 0.02)[..., None], T)
set_target(T0)
mae = lambda C: float((Wm[..., None] * np.abs(C * Tm[..., None] + P - Tcur)).sum() / (Wm.sum() * 3))
sse = lambda C: float((Wt[..., None] * (C - Teff) ** 2).sum())
def lowres_err(C, grain=False):
    e, n, d, m = Lr.strict(C * Tm[..., None] + P, star)
    if grain:
        d = d + GRAIN; e = float(np.sqrt((d[m] ** 2).mean()))
    return e, d, m

# ---- shapes
def bbox(p, pad=0.0):
    if p['t'] != 'e': return (slice(0, H), slice(0, W))
    r = max(p['rx'], p['ry']) + pad
    x0, x1 = max(0, int((p['cx'] - r) * S)), min(W, int((p['cx'] + r) * S) + 2)
    y0, y1 = max(0, int((p['cy'] - r) * S)), min(H, int((p['cy'] + r) * S) + 2)
    return (slice(y0, y1), slice(x0, x1)) if x1 > x0 and y1 > y0 else None
def inside(a, b):
    return a is not None and a[0].start >= b[0].start and a[0].stop <= b[0].stop and a[1].start >= b[1].start and a[1].stop <= b[1].stop
def alpha_of(p, sl):
    X, Y = M.X[sl], M.Y[sl]
    if p['t'] == 'e':
        c, s = math.cos(p['rot']), math.sin(p['rot']); dx, dy = X - p['cx'], Y - p['cy']
        u = (dx * c + dy * s) / p['rx']; v = (-dx * s + dy * c) / p['ry']; r = np.sqrt(u * u + v * v)
        return p['a'] * np.where(r < 1, np.interp(r, M.PROFILE_R, M.PROFILE_V), 0) * star[sl]
    dx, dy = p['x2'] - p['x1'], p['y2'] - p['y1']
    t = np.clip(((X - p['x1']) * dx + (Y - p['y1']) * dy) / (dx * dx + dy * dy + 1e-9), 0, 1)
    return p['a'] * t * star[sl]
FULL = (slice(0, H), slice(0, W))
def guided_shape(E):
    """A small ellipse centred where the current error is."""
    i = rng.choice(E.size, p=E.ravel() / E.sum()); y, x = divmod(int(i), W)
    return dict(t='e', cx=(x + rng.random()) / S, cy=(y + rng.random()) / S, rx=rng.uniform(1.5, 14), ry=rng.uniform(1.5, 14),
                rot=rng.uniform(0, math.pi), a=rng.choice([0.3, 0.5, 0.7, 0.9]), c=[128, 128, 128])

frame = stops = None; shapes = []
def suffix(alphas):
    n = len(shapes)
    TrA = np.ones((n + 1, H, W), np.float32); BA = np.zeros((n + 1, H, W, 3), np.float32)
    for i in range(n - 1, -1, -1):
        TrA[i] = TrA[i + 1] * (1 - alphas[i])
        BA[i] = BA[i + 1] + (TrA[i + 1] * alphas[i])[..., None] * np.array(shapes[i]['c'])
    return TrA, BA
def refit():
    global stops
    for _ in range(2):
        alphas = [alpha_of(p, FULL) for p in shapes]
        Tr = np.ones((H, W)); B = np.zeros((H, W, 3))
        for p, a in zip(shapes, alphas):
            Tr *= (1 - a); B = B * (1 - a)[..., None] + np.array(p['c']) * a[..., None]
        stops = M.solve_body(frame, Tr, B, Wt, Teff)
        TrA, BA = suffix(alphas)
        below = M.body_render(frame, stops)
        for i, (p, a) in enumerate(zip(shapes, alphas)):
            k = a * TrA[i + 1]; w = Wt * k * k
            if w.sum() > 1e-6:
                tgt = Teff - BA[i + 1] - below * ((1 - a) * TrA[i + 1])[..., None]
                p['c'] = list(np.clip((Wt[..., None] * k[..., None] * tgt).sum(axis=(0, 1)) / w.sum(), 0, 255))
            below = below * (1 - a)[..., None] + np.array(p['c']) * a[..., None]
def composite():
    C = M.body_render(frame, stops)
    for p in shapes:
        sl = bbox(p)
        if sl is None: continue
        a = alpha_of(p, sl)[..., None]; C[sl] = C[sl] * (1 - a) + np.array(p['c']) * a
    return C
def eval_on_top(p, C, E2):
    """Best colour for a new top shape and the change in error, both from its bounding box alone."""
    sl = bbox(p)
    if sl is None: return None, 0.0
    a = alpha_of(p, sl); w = Wt[sl]; den = (w * a * a).sum()
    if den < 1e-6: return None, 0.0
    m = a[..., None]; Cs, Ts = C[sl], Teff[sl]
    c = np.clip((w[..., None] * m * (Ts - Cs * (1 - m))).sum(axis=(0, 1)) / den, 0, 255)
    return c, float((w[..., None] * (Cs * (1 - m) + c * m - Ts) ** 2).sum() - E2[sl].sum())
def add_shapes(n, C, guided=0.6, tries=250):
    for _ in range(n):
        E2 = Wt * ((C - Teff) ** 2).sum(axis=2); E = E2 + 1e-9
        best = (0.0, None)
        for _ in range(tries):
            p = guided_shape(E) if rng.random() < guided else M.random_shape(rng)
            c, l = eval_on_top(p, C, E2)
            if c is not None and l < best[0]: p['c'] = list(c); best = (l, p)
        bl, bp = best
        if bp is None: continue
        stale = 0
        while stale < 120:
            q = M.mutate(bp, rng); c, l = eval_on_top(q, C, E2)
            if c is not None and l < bl: q['c'] = list(c); bl, bp, stale = l, q, 0
            else: stale += 1
        shapes.append(bp)
        sl = bbox(bp); a = alpha_of(bp, sl)[..., None]; C[sl] = C[sl] * (1 - a) + np.array(bp['c']) * a
    return C
def polish(sweeps):
    for sweep in range(sweeps):
        alphas = [alpha_of(p, FULL) for p in shapes]
        TrA, BA = suffix(alphas)
        below = M.body_render(frame, stops); moves = 0
        for i in range(len(shapes)):
            reg = bbox(shapes[i], pad=10.0)       # score inside a fixed window around the shape
            if reg is None: continue
            Tr1, B1, w0, Ts, bel = TrA[i + 1][reg], BA[i + 1][reg], Wt[reg], Teff[reg], below[reg]
            def score(q):
                a = alpha_of(q, reg); k = a * Tr1; w = w0 * k * k
                if w.sum() < 1e-6: return None, 1e18, a
                tgt = Ts - B1 - bel * ((1 - a) * Tr1)[..., None]
                c = np.clip((w0[..., None] * k[..., None] * tgt).sum(axis=(0, 1)) / w.sum(), 0, 255)
                return c, float((w0[..., None] * ((bel * (1 - a)[..., None] + c * a[..., None]) * Tr1[..., None] + B1 - Ts) ** 2).sum()), a
            c, bl, ba = score(shapes[i]); bp = shapes[i]
            for _ in range(40):
                q = M.mutate(bp, rng)
                if not inside(bbox(q), reg): continue
                c2, l, a2 = score(q)
                if c2 is not None and l < bl: q['c'] = list(c2); bl, bp, ba = l, q, a2; moves += 1
            shapes[i] = bp
            below[reg] = bel * (1 - ba)[..., None] + np.array(bp['c']) * ba[..., None]
        refit()
    return moves

def blur(a, sigma):
    r = int(3 * sigma + 1); k = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * sigma ** 2)); k /= k.sum()
    for ax in (0, 1):
        pad = [(0, 0)] * a.ndim; pad[ax] = (r, r); ap = np.pad(a, pad, mode='edge'); out = np.zeros_like(a)
        for i, kv in enumerate(k):
            sl = [slice(None)] * a.ndim; sl[ax] = slice(i, i + a.shape[ax]); out += kv * ap[tuple(sl)]
        a = out
    return a

GRAIN = np.load(args.grain) if args.grain else 0.0   # what the grain layer adds, at low res
corr = np.zeros((H, W, 3))
# 1. body gradient
best = None
for deg in range(0, 180, 3):
    fr = M.body_frame(math.radians(deg))
    st = M.solve_body(fr, np.ones((H, W)), np.zeros((H, W, 3)), Wt, Teff)
    l = sse(M.body_render(fr, st))
    if best is None or l < best[0]: best = (l, fr, st)
_, frame, stops = best
C = M.body_render(frame, stops)
log('body gradient: mae %.2f, low-res %.2f' % (mae(C), lowres_err(C)[0]))

# 2. shapes
done = 0
while done < NSHAPES:
    n = min(10, NSHAPES - done); C = add_shapes(n, C); done += n
    refit(); C = composite()
    if done % 20 == 0 or done == NSHAPES: log('shapes %d: mae %.2f, low-res %.2f' % (done, mae(C), lowres_err(C)[0]))
mv = polish(2); C = composite()
log('polish (%d moves): mae %.2f, low-res %.2f' % (mv, mae(C), lowres_err(C)[0]))

# 3. back-projection: move the target by what the shrunk SVG still gets wrong, then refit
Ax, Ay = Lr.ops(W, H)
Ux, Uy = Ax.T / np.maximum(Ax.T.sum(axis=1, keepdims=True), 1e-9), Ay.T / np.maximum(Ay.T.sum(axis=1, keepdims=True), 1e-9)
for r in range(ROUNDS):
    e, d, m = lowres_err(C, True)
    _, a = Lr.lowres(np.zeros((H, W, 3)), star)
    delta = np.where(m[..., None], -d / np.maximum(a, 0.5)[..., None], 0)
    up = np.einsum('yk,kxc,wx->ywc', Uy, delta, Ux)
    corr = np.clip(corr + blur(up, 0.3 * Lr.S_ * S), -70, 70)
    set_target(np.clip(T0 + corr, 0, 255))
    refit(); C = composite()
    if PER_ROUND: C = add_shapes(PER_ROUND, C, guided=0.85); refit()
    polish(1); C = composite()
    log('round %d: %d shapes, low-res %.2f (was %.2f), mae to corrected target %.2f' % (r + 1, len(shapes), lowres_err(C, True)[0], e, mae(C)))

# ---- write
f = lambda v: ('%.2f' % v).rstrip('0').rstrip('.')
hx = lambda c: '#%02x%02x%02x' % tuple(int(round(min(255, max(0, v)))) for v in c)
comment = ['The JitaSpace star as vector art, fitted to the 3D render of it: a regular five-pointed star,',
           'ten bevels of four strips each, and a face shaded with a gradient and soft shapes.',
           'Generated by scripts/logo/fit3d.py from the 3D render of the star (source-3d.png).']
svg = M.write_svg(frame, stops, shapes, [], comment, 1, 'miter')
svg = svg.replace('  <use href="#star" fill="none" stroke="#000" stroke-width="1" stroke-linejoin="miter"/>\n', '')
defs, paths = [], []
for st in STRIPS:
    defs.append('    <linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="%s" y1="%s" x2="%s" y2="%s">' % (st['id'], f(st['a'][0]), f(st['a'][1]), f(st['b'][0]), f(st['b'][1])))
    defs += ['      <stop offset="%s" stop-color="%s"/>' % (('%.4f' % (n / (NB - 1))).rstrip('0').rstrip('.'), hx(c)) for n, c in enumerate(st['stops'])]
    defs.append('    </linearGradient>')
    paths.append('    <path d="M%s Z" fill="url(#%s)"/>' % (' L'.join('%s %s' % (f(x), f(y)) for x, y in st['pts']), st['id']))
svg = svg.replace('  </defs>', '\n'.join(defs) + '\n  </defs>', 1)
k = svg.rindex('  </g>')
svg = svg[:k] + '    <!-- bevels -->\n' + '\n'.join(paths) + '\n' + svg[k:]
# The body goes inside the clipped group: browsers isolate that group, so the grain's
# blend mode (grain.py) must find the body there. librsvg does not isolate it, and the two
# would otherwise disagree.
OLD = '  <use href="#star" fill="url(#body)"/>\n  <g clip-path="url(#clip)">\n'
assert svg.count(OLD) == 1
svg = svg.replace(OLD, '  <g clip-path="url(#clip)">\n    <rect width="176" height="168" fill="url(#body)"/>\n')
assert '--' not in svg.replace('<!--', '').replace('-->', '')
with open(OUT, 'w') as out:
    out.write(svg)
log('wrote', OUT, len(svg), 'bytes')
