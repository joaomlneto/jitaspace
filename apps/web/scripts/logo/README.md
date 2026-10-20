# Logo fitting

`public/logo.svg` and `public/logo-small.svg` are not drawn by hand. `fit.py` fits them to the original raster logo, `source-4x.png`: it finds the SVG whose rendering is closest to that image, pixel by pixel. Everything else (the PNG logos, the app icons, the favicons, the iOS splash screens) is rendered from the two SVGs.

## Regenerating

Needs Python 3 with numpy, and nothing else.

```bash
cd apps/web/scripts/logo
python3 fit.py --out ../../public/logo.svg                 # ~12 minutes
python3 fit.py --small --out ../../public/logo-small.svg   # ~1 minute
cd ../..
node scripts/generate-logo-assets.mjs
node scripts/generate-ios-splash.mjs
```

The fit is deterministic for a given `--seed`, so rerunning it reproduces the committed SVGs.

## How the fit works

1. **Symmetric star.** The star in the source PNG is slightly lopsided. `model.STAR` is a regular pentagram fitted to its ten corners by least squares, which moved none of them more than 2.4 units. The source image is warped onto that shape (a piecewise-affine map over the triangles fanning out from the centre), so the highlights and bevels follow their arms.
2. **Renderer.** `model.py` renders the SVG model in numpy, the way a browser does: straight-alpha "over" compositing in sRGB, with linear and radial gradients. Its output was checked against WebKit and librsvg renderings of the generated files.
3. **Body gradient.** For a fixed direction, the rendered colours are linear in the gradient's stop colours, so the best stops are a least-squares solution. The direction is searched in 3° steps.
4. **Shading shapes.** Shapes are added one at a time, as [Primitive](https://github.com/fogleman/primitive) does: soft ellipses (radial gradients fading to transparent) and soft half-planes (opacity ramps). Each is the best of 250 random candidates, then hill-climbed. Its colour is solved in closed form. Every 10 shapes, all colours are re-solved together.
5. **Polish.** Each shape's geometry is revisited with everything else fixed, keeping any change that lowers the error.

The bevels and rims (`model.SOURCE_TOP`) were measured on the source by hand and are not optimised: the fit only blurs edges that sharp. The border is drawn last.

## Things that went wrong, so they don't again

- **Score transparency, not just colour.** An early version of the outline fit compared images composited on white. A white bevel painted over the background then cost nothing, and the star grew into the empty space beside it.
- **Lower error is not always better looking.** Letting the optimiser set the edge stroke made it a 3-unit grey band with blobs at the tips. That matched the source's blurry edges better, and looked like a drawn outline. The border is fixed for that reason.
- **librsvg ignores `vector-effect="non-scaling-stroke"`.** The small logo's border is a fixed 5.5 units (1px at 32px) so the PNG icons rendered with sharp keep it.
