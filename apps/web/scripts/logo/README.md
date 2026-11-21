# Logo

`public/logo.svg` and `public/logo-small.svg` are not drawn by hand. The star is modelled in 3D as a worn metal plate, lit so that a small render of it matches the star in the Caldari Navy corporation logo, and the SVGs are then fitted to that render by optimisation. Everything else (the PNG logos, the app icons, the favicons, the iOS splash screens, the sticker) is rendered from the two SVGs.

| File                             | What it is                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `render3d.html`, `render3d.py`   | The 3D star (three.js, runs in a browser) and the small server that feeds it and saves its render.    |
| `source-3d.png`                  | That render at 704 x 672: what the SVGs are fitted to.                                                |
| `fit3d.py`, `model.py`, `png.py` | The vector fit, the SVG model with its numpy renderer, and a PNG reader.                              |
| `grain.py`                       | The brushed grain, added to the fitted SVG as vector strokes.                                         |
| `lowres.py`, `native.py`         | The low-resolution test against the original star, and the download of that original.                 |
| `raster.mjs`                     | PNG and SVG rasteriser (sharp) for the steps above.                                                   |
| `sticker.py`                     | The round print sticker, `sticker-round.svg`.                                                         |
| `fit.py`, `source-4x.png`        | The previous, flat logo: an SVG fitted to the old raster logo. Kept as the record of how it was made. |

CCP's artwork is not in this repository. `native.py` downloads the 128 px Caldari Navy logo from CCP's image server into `.cache/` (git-ignored) the first time a script needs it.

## Regenerating

Needs Python 3 with numpy, Node with the repository's dependencies installed, and a browser. About 25 minutes, nearly all of it the two vector fits.

```bash
cd apps/web/scripts/logo

# 1. The 3D render. Open the URL this prints and wait for the page title to say "done"
#    (about a minute), then stop the server.
python3 render3d.py
node raster.mjs .cache/star-render.png source-3d.png 704 672

# 2. A first fit without grain, to measure what the grain adds when the logo is drawn small.
python3 fit3d.py --rounds 10 --out .cache/smooth.svg
python3 grain.py .cache/smooth.svg .cache/smooth-grain.svg
node raster.mjs .cache/smooth.svg .cache/smooth.png 704 672
node raster.mjs .cache/smooth-grain.svg .cache/smooth-grain.png 704 672
python3 lowres.py grain .cache/smooth.png .cache/smooth-grain.png .cache/grain.npy

# 3. The fit again, leaving room for the grain, then the grain itself.
python3 fit3d.py --grain .cache/grain.npy --out .cache/star.svg
python3 grain.py .cache/star.svg ../../public/logo.svg

# 4. The small logo: fewer shapes and no grain, which is invisible below about 64 px.
python3 fit3d.py --shapes 60 --rounds 6 --per-round 4 --out ../../public/logo-small.svg

# 5. Everything rendered from the two SVGs.
python3 sticker.py --out sticker-round.svg
cd ../..
node scripts/generate-logo-assets.mjs
node scripts/generate-ios-splash.mjs
```

Every step is deterministic, so rerunning them reproduces the committed files. The render depends on the three.js version (0.184.0 when `source-3d.png` was made) and, in its last digits, on the GPU.

To score any image of the logo against the original star (lower is closer; the 3D render scores 3.5 and `logo.svg` 3.2 on this numpy version of the test):

```bash
node raster.mjs ../../public/logo.svg .cache/logo.png 704 672
python3 lowres.py score .cache/logo.png
```

## How it works

1. **The original is tiny.** The star in the Caldari Navy logo is about 45 pixels wide. Enlarging it only gives a blur, so nothing is fitted to an enlargement. Instead a candidate is shrunk onto the original's pixel grid (each original pixel compared with the average of the area it covers) and judged there. `lowres.py` is that test.
2. **A 3D star, lit to match.** `render3d.html` builds the star as a machined plate: a shallow lens-shaped face with a bevel down to a regular pentagram outline. What it reflects is not designed by hand: the reflection map is solved by least squares so that the shrunk render matches the original's pixels, and shallow dents and tarnish are then fitted by back-projection (render, shrink, compare, push the difference back onto the surface, repeat). A procedural wear layer (brushed grain, mottle, pits, scratches) supplies the sharp detail the original is too small to specify.
3. **A vector fit to the render.** `fit3d.py` fits the SVG model to `source-3d.png`. The ten bevels are drawn as four nested strips each, with corners projected through the render's camera and gradient stops solved by least squares. The face is a linear gradient plus soft ellipses and ramps, added one at a time where the error is largest, as [Primitive](https://github.com/fogleman/primitive) does, each colour solved in closed form.
4. **Corrected against the original.** After fitting the render, the fit is shrunk onto the original's pixels, and what is still off is added to the target before refitting, for twelve rounds. This is why the SVG ends up slightly closer to the original than the render it started from.
5. **Grain as geometry.** `grain.py` draws the brushed grain as two tiling patterns of thin tapered streaks, blended as an overlay, horizontal on the face and along the edge on each bevel. The grain does not average out to nothing at low resolution, so its contribution is measured first (step 2 above) and the final fit compensates for it.

## Things that went wrong, so they don't again

- **Fit geometry to the alpha channel before blaming the model.** The original star looked lopsided when its corners were measured by hand. Fitting polygon coverage to its alpha channel showed that a perfectly regular pentagram matches it; the hand-measured corners were up to a pixel short.
- **Score transparency, not just colour.** An early outline fit compared images composited on white. A white bevel painted over the background then cost nothing, and the star grew into the empty space beside it.
- **A noise filter is not grain.** `feTurbulence` aliases into speckle at small sizes, and librsvg drew a stray line with it at 64 and 32 px. Streaks drawn as geometry are averaged correctly at any size.
- **`clip-path` isolates a group in browsers but not in librsvg.** A blend mode inside a clipped group sees only that group as its backdrop in a browser. The body gradient is therefore drawn inside the clipped group; outside it, the two renderers disagreed.
- **`--` inside an XML comment makes the whole SVG unparseable.** The scripts refuse to write one. Run `xmllint --noout` on a generated SVG if in doubt.
- **librsvg ignores `vector-effect="non-scaling-stroke"`,** so a border meant to stay one pixel wide vanishes from the PNG icons. The new star has no border: its dark lower bevels outline it.
