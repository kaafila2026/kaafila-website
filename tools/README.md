# tools/

Two scripts that derive the hero animation's assets from the brand artwork.
Their outputs are committed, so the site needs no build step — you only run
these if the source artwork changes, or if you want to adjust how the scene is
cut up. Both need Python with Pillow and NumPy (`pip install pillow numpy`).

```
python tools/extract-scene-assets.py     # img/hero-banner.jpg
python tools/build-wordmark-svg.py       # img/kaafila-wordmark-brochure.png
```

## Why they exist

The hero animation (`js/hero-scene.js`) needs two things a flat image cannot
give it: a bird that flies independently of its nest, and a wordmark whose two
figures can dance while the lettering holds still. Rather than redraw the
artwork by hand — which would drift from the brand — both scripts work from the
real pixels.

| script | reads | writes |
|---|---|---|
| `extract-scene-assets.py` | `img/hero-banner.jpg` | `img/scene/bird.{webp,png}`, `img/scene/nest.{webp,png}`, `img/scene/layout.json`, `js/kaafila-scene.js` |
| `build-wordmark-svg.py` | `img/kaafila-wordmark-brochure.png` | `js/kaafila-mark.js` |

`extract-scene-assets.py` splits the banner into layers by keying out its flat
paper colour, eroding the ink until the thin rope snaps, flood-filling from seed
points, and dilating back. It also measures the nest's entrance, which the bird
flies into.

Three things in that script exist because the bird is *holding* the rope, and
the hero flies it on its own:

- **`seeds`** includes one point per claw as well as the belly. Erosion snaps
  the thin leg shafts, which orphans both feet — seed only the belly and the
  bird comes out legless.
- **`drop`** boxes remove ink by colour, used at the beak: keep a pixel only if
  it is nearer the bird's palette than the rope's. A box may carry its own
  palettes.
- **`limit`** boxes remove ink by *shape*, used at the feet, keeping only what
  falls on a leg or a foot (capsules and disks). Colour cannot work there: the
  toes are wrapped around the rope and share both its tans and its dark
  outlines, and excluding those browns eats the bird's own outlines.

A final pass discards anything left unconnected to the subject, which clears the
speckle that colour tests leave behind — the rope's anti-aliased edge is a blend
of rope and paper and scores as "subject".

The rope itself is not extracted at all. It is redrawn as SVG in
`js/hero-scene.js`, from a path traced off the banner in that artwork's own
coordinates, so it can flow, braid and later unwind.

`build-wordmark-svg.py` traces the wordmark to paths and cuts the figures into
limbs, assigning every blue pixel to the nearest part in its `RIG` table. Run it
with `--debug` to get a colour-per-limb image of that split written to your temp
directory; it is the quickest way to check a rig change.

Both scripts print what they measured. If a seed point ever lands off the ink —
because the artwork was re-exported — they say so and stop rather than writing a
silently wrong layer.
