"""Fit the logo SVG to the original PNG.

  python3 fit.py --shapes 100 --polish 3 --out ../../public/logo.svg
  python3 fit.py --small --out ../../public/logo-small.svg

See README.md for what each step does. Deterministic for a given --seed.
"""
import argparse
import math
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model as M
from model import H, W
from png import read_rgba

HERE = os.path.dirname(os.path.abspath(__file__))


def warped_target(path):
    """The source PNG warped onto the symmetric star, at the fitting scale (straight colour, alpha)."""
    src = read_rgba(path)                                   # 4 px per user unit
    h, w = src.shape[:2]
    pre = np.dstack([src[..., :3] * src[..., 3:4] / 255, src[..., 3]])
    ys, xs = np.mgrid[0:h, 0:w]
    sx, sy = M.fan_map((xs + 0.5) / 4, (ys + 0.5) / 4, M.STAR, (M.CX, M.CY), M.SOURCE_STAR, M.SOURCE_CENTRE)
    fx, fy = np.clip(sx * 4 - 0.5, 0, w - 1.001), np.clip(sy * 4 - 0.5, 0, h - 1.001)
    x0, y0 = fx.astype(int), fy.astype(int); tx, ty = (fx - x0)[..., None], (fy - y0)[..., None]
    out = (pre[y0, x0] * (1 - tx) * (1 - ty) + pre[y0, x0 + 1] * tx * (1 - ty)
           + pre[y0 + 1, x0] * (1 - tx) * ty + pre[y0 + 1, x0 + 1] * tx * ty)
    a = out[..., 3]
    rgb = np.where(a[..., None] > 0.5, out[..., :3] * 255 / np.maximum(a, 1e-6)[..., None], 0)
    rgba = np.dstack([np.clip(rgb, 0, 255), np.clip(a, 0, 255)]).round()
    # down to the fitting scale, averaging premultiplied colour
    k = 4 // M.S
    al = rgba[..., 3:4] / 255
    pre = (rgba[..., :3] * al).reshape(H, k, W, k, 3).mean(axis=(1, 3))
    al = al.reshape(H, k, W, k, 1).mean(axis=(1, 3))
    return np.where(al > 1e-3, pre / np.maximum(al, 1e-3), 255), al[..., 0]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--source', default=os.path.join(HERE, 'source-4x.png'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--shapes', type=int, default=100, help='shading shapes to add (default 100)')
    ap.add_argument('--polish', type=int, default=3, help='polish sweeps over all shapes (default 3)')
    ap.add_argument('--small', action='store_true',
                    help='the small-size logo: 8 shapes, 4 polish sweeps, a 5.5-unit round-joined border')
    ap.add_argument('--seed', type=int, default=1)
    args = ap.parse_args()
    if args.small:
        args.shapes, args.polish = 8, 4
    rng = np.random.default_rng(args.seed)
    t0 = time.time()
    log = lambda *a: print('[%4.0fs]' % (time.time() - t0), *a, flush=True)

    T, Ta = warped_target(args.source)
    star = M.poly_cover(M.STAR)
    layers = M.top_layers()
    Tm, P = M.top_stack(star, layers)
    # Fit where both stars fully cover a pixel, weighting by how much the top layers let through.
    Wm = ((star > 0.999) & (Ta > 0.95)).astype(float)
    Wt = Wm * Tm ** 2
    Teff = np.where(Tm[..., None] > 0.02, (T - P) / np.maximum(Tm, 0.02)[..., None], T)
    mae = lambda C: float((Wm[..., None] * np.abs(C * Tm[..., None] + P - T)).sum() / (Wm.sum() * 3))
    sse = lambda C: float((Wt[..., None] * (C - Teff) ** 2).sum())

    # 1. Body gradient: stops by least squares, direction by search.
    best = None
    for deg in range(0, 180, 3):
        fr = M.body_frame(math.radians(deg))
        st = M.solve_body(fr, np.ones((H, W)), np.zeros((H, W, 3)), Wt, Teff)
        l = sse(M.body_render(fr, st))
        if best is None or l < best[0]: best = (l, fr, st)
    _, frame, stops = best
    shapes = []
    C = M.body_render(frame, stops)
    log('body gradient: mae %.2f' % mae(C))

    def suffix(alphas):
        """For each i, the transmittance and colour of the shapes above i."""
        n = len(shapes)
        TrA = np.ones((n + 1, H, W), np.float32); BA = np.zeros((n + 1, H, W, 3), np.float32)
        for i in range(n - 1, -1, -1):
            TrA[i] = TrA[i + 1] * (1 - alphas[i])
            BA[i] = BA[i + 1] + (TrA[i + 1] * alphas[i])[..., None] * np.array(shapes[i]['c'])
        return TrA, BA

    def refit(stops):
        """Every colour has a closed form once the shapes are fixed: the body's stops, then each shape's."""
        for _ in range(2):
            alphas = [M.shape_alpha(p) * star for p in shapes]
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
        return stops

    def composite(stops):
        C = M.body_render(frame, stops)
        for p in shapes:
            a = (M.shape_alpha(p) * star)[..., None]
            C = C * (1 - a) + np.array(p['c']) * a
        return C

    def eval_on_top(p, C):
        """Best colour for a new top shape, in closed form, and the resulting error."""
        a = M.shape_alpha(p) * star; m = a[..., None]
        den = (Wt * a * a).sum()
        if den < 1e-6: return None, 1e18
        c = np.clip((Wt[..., None] * m * (Teff - C * (1 - m))).sum(axis=(0, 1)) / den, 0, 255)
        return c, sse(C * (1 - m) + c * m)

    # 2. Shapes, added greedily: the best of 250 random ones, hill-climbed.
    for n in range(args.shapes):
        cands = []
        for _ in range(250):
            p = M.random_shape(rng); c, l = eval_on_top(p, C)
            if c is not None: p['c'] = list(c); cands.append((l, p))
        bl, bp = min(cands, key=lambda z: z[0]); stale = 0
        while stale < 120:
            q = M.mutate(bp, rng); c, l = eval_on_top(q, C)
            if c is not None and l < bl: q['c'] = list(c); bl, bp, stale = l, q, 0
            else: stale += 1
        shapes.append(bp)
        a = (M.shape_alpha(bp) * star)[..., None]; C = C * (1 - a) + np.array(bp['c']) * a
        if (n + 1) % 10 == 0 or n + 1 == args.shapes:
            stops = refit(stops); C = composite(stops)
            log('shapes %d: mae %.2f' % (n + 1, mae(C)))

    # 3. Polish: revisit each shape's geometry with everything else fixed.
    for sweep in range(args.polish):
        alphas = [M.shape_alpha(p) * star for p in shapes]
        TrA, BA = suffix(alphas)
        below = M.body_render(frame, stops)
        moves = 0
        for i in range(len(shapes)):
            def score(q):
                a = M.shape_alpha(q) * star; k = a * TrA[i + 1]; w = Wt * k * k
                if w.sum() < 1e-6: return None, 1e18, a
                tgt = Teff - BA[i + 1] - below * ((1 - a) * TrA[i + 1])[..., None]
                c = np.clip((Wt[..., None] * k[..., None] * tgt).sum(axis=(0, 1)) / w.sum(), 0, 255)
                return c, sse((below * (1 - a)[..., None] + c * a[..., None]) * TrA[i + 1][..., None] + BA[i + 1]), a
            c, bl, ba = score(shapes[i]); bp = shapes[i]
            for _ in range(40):
                q = M.mutate(bp, rng); c2, l, a2 = score(q)
                if c2 is not None and l < bl: q['c'] = list(c2); bl, bp, ba = l, q, a2; moves += 1
            shapes[i] = bp
            below = below * (1 - ba)[..., None] + np.array(bp['c']) * ba[..., None]
        stops = refit(stops)
        log('polish %d (%d moves): mae %.2f' % (sweep + 1, moves, mae(composite(stops))))

    if args.small:
        comment = ['The JitaSpace logo for small sizes (favicons, the header, menus): the same star as logo.svg',
                   'with 8 shading shapes instead of 100, and a border thick enough to stay visible.',
                   'Generated by scripts/logo/fit.py in its small mode; see scripts/logo/README.md.']
        border = (5.5, 'round')     # 1px at 32px; round joins keep it inside the canvas
    else:
        comment = ['A regular five-pointed star whose shading was fitted to the original PNG by optimisation.',
                   'Generated by scripts/logo/fit.py; see scripts/logo/README.md.']
        border = (1, 'miter')
    if any('--' in line for line in comment):
        raise ValueError('"--" is not allowed inside an XML comment')
    open(args.out, 'w').write(M.write_svg(frame, stops, shapes, layers, comment, *border))
    log('wrote', args.out)


if __name__ == '__main__':
    main()
