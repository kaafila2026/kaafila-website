"""
Derives the hero scroll-scene's layered assets from the two source artworks.

The hero animation needs the bird to fly independently of the nest, and the
nest to be unravelled on its own, so the single flat `img/hero-banner.jpg`
has to be split into layers first. Everything here is derived — the sources
are never modified — so re-running this regenerates `img/scene/` from scratch.

    python tools/extract-scene-assets.py

How the split works: the banner sits on one flat paper colour (#EFE2D2), so
"ink" is simply anything far enough from that colour. Erode the ink mask far
enough to snap the thin connecting threads, flood-fill the component under a
known seed, then dilate back and re-intersect with the ink. That returns the
bird (or the nest) at its original edges with the threads dropped, which is
what lets the bird fly over threads that are redrawn as live SVG.

Outputs, alongside the PNGs, `img/scene/layout.json` — each layer's box in the
source artwork's own 1536x1024 coordinate space. The stylesheet and
js/hero-scene.js position layers from those numbers, so nothing downstream
hardcodes a crop.
"""

import json
import os
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANNER = os.path.join(ROOT, "img", "hero-banner.jpg")
OUT_DIR = os.path.join(ROOT, "img", "scene")

# Anything within this per-channel distance of the paper colour is background.
# 14 clears JPEG mottling in the flat areas without eating the pale wing tips.
INK_CUTOFF = 14
# Alpha ramps between these two distances, so edges stay anti-aliased.
ALPHA_LO, ALPHA_HI = 6.0, 22.0
# Odd kernel sizes: 9 snaps the ~8px threads, 13 restores the silhouette with a
# small collar of whatever ink touches it (the beak-held thread ends, the toe
# grip) — which reads as intended rather than as a defect.
ERODE, DILATE = 9, 13
# Quality for the WebP the page actually loads. 90 is visually lossless on this
# flat-shaded artwork and lands ~5x under the equivalent PNG.
WEBP_QUALITY = 90

# Seeds sit on solid ink well inside each subject. Eroding by ERODE opens gaps
# in the nest's weave, so the nest layer is seeded once per part that the
# erosion can isolate — nest wall, branch, and each of the five leaves — and
# the fills are unioned.
#
# `grow` is how many times the fill is dilated back and re-intersected with the
# ink. One round just restores the eroded edge. The nest needs more because
# erosion also snaps the hair-thin twigs holding the five leaves to the branch,
# and each extra round bridges roughly (DILATE-1)/2 px of them back.
#
# `drop` boxes remove ink the reconstruction picked up that does not belong to
# the subject. The bird is holding the thread in its beak, so restoring its
# silhouette also restores a stub of rust and blue thread past the beak tip;
# the hero flies the bird on its own and draws the thread separately, so that
# stub has to go. Inside a drop box a pixel is kept only if its colour is
# nearer the subject's palette than the thread's, which takes the thread out
# without shaving the beak.
THREAD_COLOURS = [(162, 64, 42), (51, 96, 127), (110, 40, 30), (46, 86, 110)]
SUBJECT_COLOURS = [(232, 217, 168), (224, 169, 74), (36, 26, 18),
                   (201, 139, 54), (255, 255, 255)]

# Around the feet, colour cannot tell rope from claw: the toes are wrapped
# around the rope, and the two share both their tans and their dark outlines.
# So the feet are cut by shape instead — keep what falls on a leg or a foot,
# drop everything else in the box, which is the rope running away from them.
# `keep` shapes are disks and capsules in source pixels.
FEET_KEEP = [
    ("capsule", 288, 553, 358, 568, 12),   # upper leg shaft
    ("capsule", 272, 578, 302, 608, 12),   # lower leg shaft
    ("disk", 358, 568, 24),                # upper foot
    ("disk", 302, 608, 24),                # lower foot
]

LAYERS = [
    # Seeded at the belly and at each claw: erosion snaps the thin leg shafts,
    # which orphans both feet, and without their own seeds the bird comes out
    # legless. `grow` then rebuilds the shafts between body and claw.
    {"name": "bird", "seeds": [(280, 500), (361, 560), (307, 596)], "grow": 3,
     "body_seed": (280, 500),
     "drop": [{"box": (436, 394, 500, 470)}],                    # rope in the beak
     "limit": [{"box": (258, 522, 404, 684), "shapes": FEET_KEEP}]},
    {
        "name": "nest",
        "grow": 6,
        "seeds": [
            (1112, 380),   # woven wall
            (1104, 314),   # binding knot at the top
            (1180, 320),   # branch trunk
            (1286, 270),   # sage leaf
            (1366, 244),   # red leaf
            (1362, 324),   # blue leaf
            (1266, 442),   # olive leaf
            (1318, 444),   # amber leaf
        ],
    },
]


def ink_mask(arr, bg):
    return np.abs(arr - bg).max(axis=2)


def morph(mask, size, op):
    """Binary erode/dilate via PIL's min/max box filters."""
    img = Image.fromarray((mask * 255).astype(np.uint8))
    flt = ImageFilter.MinFilter(size) if op == "erode" else ImageFilter.MaxFilter(size)
    return np.asarray(img.filter(flt)) > 127


def component(mask, seeds):
    """4-connected flood fill of `mask` from every seed, unioned."""
    h, w = mask.shape
    out = np.zeros_like(mask)
    q = deque()
    for sx, sy in seeds:
        if not mask[sy, sx]:
            raise SystemExit(f"seed ({sx},{sy}) is not on ink — artwork changed?")
        if not out[sy, sx]:
            out[sy, sx] = True
            q.append((sx, sy))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True
                q.append((nx, ny))
    return out


def shape_mask(shapes, h, w):
    """Union of disks and capsules, as a boolean mask."""
    gy, gx = np.mgrid[0:h, 0:w].astype(np.float32)
    out = np.zeros((h, w), dtype=bool)
    for sh in shapes:
        if sh[0] == "disk":
            _, cx, cy, r = sh
            out |= np.hypot(gx - cx, gy - cy) <= r
        else:
            _, ax, ay, bx, by, r = sh
            dx, dy = bx - ax, by - ay
            L2 = dx * dx + dy * dy
            t = np.clip(((gx - ax) * dx + (gy - ay) * dy) / max(L2, 1e-6), 0.0, 1.0)
            out |= np.hypot(gx - (ax + t * dx), gy - (ay + t * dy)) <= r
    return out


def find_anchors(name, keep, arr):
    """
    The two points the animation actually aims at, measured rather than eyeballed:
    the bird's beak tip (where its threads leave it) and the centre + radius of
    the nest's entrance hole (where the bird has to arrive).
    """
    if name == "bird":
        ys, xs = np.where(keep)
        tip = xs.max()
        # A beak is a wedge, so average the few rows that actually reach the tip
        # instead of trusting one antialiased pixel.
        near = ys[xs >= tip - 3]
        return {"beak": [int(tip), int(round(near.mean()))]}

    if name == "nest":
        # The entrance is the one large near-black mass inside the nest.
        dark = keep & (arr.mean(axis=2) < 70)
        dark = morph(dark, 15, "erode")
        ys, xs = np.where(dark)
        cx, cy = float(xs.mean()), float(ys.mean())
        r = float(np.sqrt(len(xs) / np.pi)) + 7  # undo the erosion
        return {"nestHole": [round(cx, 1), round(cy, 1), round(r, 1)]}

    return {}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    src = Image.open(BANNER).convert("RGB")
    arr = np.asarray(src).astype(np.float32)
    h, w, _ = arr.shape

    ring = np.concatenate([arr[:4].reshape(-1, 3), arr[-4:].reshape(-1, 3)])
    bg = np.round(np.median(ring, axis=0))
    print(f"source {w}x{h}, paper #{int(bg[0]):02X}{int(bg[1]):02X}{int(bg[2]):02X}")

    dist = ink_mask(arr, bg)
    ink = dist > INK_CUTOFF
    eroded = morph(ink, ERODE, "erode")

    layout = {
        "source": {"width": w, "height": h},
        "paper": "#%02X%02X%02X" % tuple(int(c) for c in bg),
        "layers": {},
    }
    anchors = {}

    for spec in LAYERS:
        keep = component(eroded, spec["seeds"])
        for _ in range(spec["grow"]):
            keep = morph(keep, DILATE, "dilate") & ink

        for drop in spec.get("drop", []):
            dx0, dy0, dx1, dy1 = drop["box"]
            box = arr[dy0:dy1, dx0:dx1]
            near_thread = np.min([np.linalg.norm(box - np.array(c, np.float32), axis=2)
                                  for c in drop.get("thread", THREAD_COLOURS)], axis=0)
            near_subject = np.min([np.linalg.norm(box - np.array(c, np.float32), axis=2)
                                   for c in drop.get("subject", SUBJECT_COLOURS)], axis=0)
            dropped = near_thread < near_subject
            keep[dy0:dy1, dx0:dx1] &= ~dropped
            print(f"  {spec['name']:5s} dropped {int(dropped.sum()):,}px of thread "
                  f"from ({dx0},{dy0})-({dx1},{dy1})")

        for lim in spec.get("limit", []):
            lx0, ly0, lx1, ly1 = lim["box"]
            # Inside this box keep only the subject's own anatomy, plus
            # whatever the body already covers, and drop the rest.
            body = component(eroded, [spec["body_seed"]])
            for _ in range(spec["grow"]):
                body = morph(body, DILATE, "dilate") & ink
            allowed = body | shape_mask(lim["shapes"], h, w)
            cut = keep[ly0:ly1, lx0:lx1] & ~allowed[ly0:ly1, lx0:lx1]
            keep[ly0:ly1, lx0:lx1] &= allowed[ly0:ly1, lx0:lx1]
            print(f"  {spec['name']:5s} trimmed {int(cut.sum()):,}px outside the "
                  f"leg/foot shapes")

        if spec.get("drop") or spec.get("limit"):
            # A colour test can't classify the thread's own anti-aliased edge,
            # which is a blend of thread and paper and lands nearer the
            # subject's palette. Those survivors are left stranded once the
            # thread's body has gone, so anything no longer joined to the
            # subject is discarded.
            before = int(keep.sum())
            # Seed only from points the drops left standing — a claw seed can
            # itself sit on a pixel the rope test removed.
            alive = [s for s in spec["seeds"] if keep[s[1], s[0]]]
            keep = component(keep, alive or [spec["seeds"][0]])
            print(f"  {spec['name']:5s} discarded {before - int(keep.sum()):,}px "
                  f"of stranded speckle")

        ys, xs = np.where(keep)
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1

        # Straight alpha, with the paper colour unmixed back out of the edge
        # pixels so the layer composites cleanly over anything, not just beige.
        alpha = np.clip((dist - ALPHA_LO) / (ALPHA_HI - ALPHA_LO), 0.0, 1.0)
        alpha = np.where(keep, alpha, 0.0)
        a = alpha[y0:y1, x0:x1, None]
        rgb = arr[y0:y1, x0:x1]
        unmixed = np.where(a > 0.02, (rgb - (1.0 - a) * bg) / np.maximum(a, 0.02), rgb)

        out = np.concatenate(
            [np.clip(unmixed, 0, 255), np.clip(a * 255.0, 0, 255)], axis=2
        ).astype(np.uint8)

        img = Image.fromarray(out)
        png = os.path.join(OUT_DIR, spec["name"] + ".png")
        webp = os.path.join(OUT_DIR, spec["name"] + ".webp")
        img.save(png, optimize=True)
        img.save(webp, quality=WEBP_QUALITY, method=6)

        layout["layers"][spec["name"]] = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}
        print(
            f"  {spec['name']:5s} box=({x0},{y0},{x1 - x0},{y1 - y0}) "
            f"ink={int(keep.sum()):,}px  "
            f"png {os.path.getsize(png) // 1024}KB / "
            f"webp {os.path.getsize(webp) // 1024}KB"
        )
        anchors.update(find_anchors(spec["name"], keep, arr))

    layout["anchors"] = anchors
    with open(os.path.join(OUT_DIR, "layout.json"), "w", encoding="utf-8") as f:
        json.dump(layout, f, indent=2)
    for k, v in anchors.items():
        print(f"  anchor {k:8s} {v}")
    print("wrote img/scene/layout.json")
    write_scene_js(layout)


def write_scene_js(layout):
    """
    The same geometry again, as a script the page can load without a fetch.
    Anchors are stored as fractions of their own layer's box so the scene can
    place a layer at any size and still know where the beak and the nest's
    entrance ended up.
    """
    bird = layout["layers"]["bird"]
    nest = layout["layers"]["nest"]
    bx, by = layout["anchors"]["beak"]
    hx, hy, hr = layout["anchors"]["nestHole"]

    def frac(v, lo, size):
        return round((v - lo) / size, 4)

    data = {
        "bird": {"w": bird["w"], "h": bird["h"],
                 "beak": [frac(bx, bird["x"], bird["w"]), frac(by, bird["y"], bird["h"])]},
        "nest": {"w": nest["w"], "h": nest["h"],
                 "hole": [frac(hx, nest["x"], nest["w"]), frac(hy, nest["y"], nest["h"]),
                          round(hr / nest["w"], 4)]},
        "paper": layout["paper"],
    }
    js = (
        "/* GENERATED by tools/extract-scene-assets.py - do not edit by hand.\n"
        "   Intrinsic size of each cut-out layer, plus two measured anchors as\n"
        "   fractions of their layer's box: the nest's entrance, which the bird\n"
        "   flies into, and the bird's beak. (The beak is recorded because it is\n"
        "   worth knowing; nothing reads it now that the bird carries no rope.) */\n"
        "window.KAAFILA_SCENE = " + json.dumps(data, separators=(",", ":")) + ";\n"
    )
    path = os.path.join(os.path.dirname(OUT_DIR), "..", "js", "kaafila-scene.js")
    path = os.path.normpath(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(js)
    print("wrote js/kaafila-scene.js")


if __name__ == "__main__":
    main()
