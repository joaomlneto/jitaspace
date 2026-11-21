"""The low-resolution test: shrink an image of the logo onto the pixels of the original star and compare.

The original is the star in the Caldari Navy corporation logo, 128 px (see native.py). An
image in the logo's 176 x 168 frame is box-averaged onto that logo's pixel grid, so each
original pixel is compared with the average of the area it covers.

  python3 lowres.py score <image.png>                       # RMS difference, 0-255, lower is closer
  python3 lowres.py grain <smooth.png> <grain.png> <out.npy>  # what a grain layer adds at low resolution

Images are PNGs of the 176 x 168 frame at any whole multiple of it (raster.mjs makes them).
"""
import sys

import numpy as np

import native
import png

# Where the star sits on the original: logo units per original pixel, and the frame's
# offset in original pixels. Found by a joint search over placement and bevel shape.
S_, OX, OY = 3.9098, 40.428, 9.321
NAT = png.read_rgba(native.path())
L, T, CW, CH = int(OX) - 3, int(OY) - 3, 50, 48
def box(n_out, first, off, n_in, ppu):
    """(n_out, n_in) matrix: fraction of each native pixel's span covered by each input pixel, rows sum to <= 1."""
    A = np.zeros((n_out, n_in))
    for k in range(n_out):
        a, b = (first + k - off) * S_ * ppu, (first + k + 1 - off) * S_ * ppu
        for i in range(max(0, int(np.floor(a))), min(n_in, int(np.ceil(b)))):
            A[k, i] = max(0, min(b, i + 1) - max(a, i))
        A[k] /= (b - a)
    return A
def ops(W, H):
    return box(CW, L, OX, W, W / 176), box(CH, T, OY, H, H / 168)
def lowres(rgb, alpha):
    """rgb (H, W, 3) straight, alpha (H, W) 0..1 -> premultiplied low-res colour and coverage."""
    H, W = alpha.shape; Ax, Ay = ops(W, H)
    return np.einsum('ky,ywc,xw->kxc', Ay, rgb * alpha[..., None], Ax), Ay @ alpha @ Ax.T
NRGB = NAT[T:T + CH, L:L + CW, :3]; NA = NAT[T:T + CH, L:L + CW, 3] / 255
BG = np.array([0x6b, 0x76, 0x84], float)
def strict(rgb, alpha, mask=None):
    """RMS difference over the pixels both stars mostly cover, both composited on a mid grey."""
    pre, a = lowres(rgb, alpha)
    ours = np.minimum(255, pre + (1 - a)[..., None] * BG); theirs = NRGB * NA[..., None] + (1 - NA)[..., None] * BG
    m = (a > 0.5) & (NA > 0.5)
    if mask is not None: m &= mask
    d = (np.round(ours) - np.round(theirs))[m]
    return float(np.sqrt((d ** 2).mean())), int(m.sum()), ours - theirs, m
def load(path):
    im = png.read_rgba(path)
    return im[..., :3], im[..., 3] / 255

if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == 'score':
        e, n, _, _ = strict(*load(sys.argv[2]))
        print('%s: rms %.2f over %d pixels' % (sys.argv[2], e, n))
    elif len(sys.argv) == 5 and sys.argv[1] == 'grain':
        a, b = (lowres(*load(p))[0] for p in sys.argv[2:4])
        np.save(sys.argv[4], b - a)
        print('grain at low res: rms %.2f, mean %s' % (np.sqrt(((b - a) ** 2).mean()), np.round((b - a).mean(axis=(0, 1)), 2)))
    else:
        sys.exit(__doc__)
