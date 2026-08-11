"""
Turns img/kaafila-wordmark-brochure.png into the rigged SVG the hero uses.

    python tools/build-wordmark-svg.py     ->  js/kaafila-mark.js

Two things the hero needs that a PNG can't give:

  * the letterforms as outlines, so the flowing threads can settle onto them
    and the mark can be woven into existence rather than cross-faded in;
  * the two Warli figures as *separate limbs*, so they can dance.

Rather than redraw the mark by hand (which would drift from the brand artwork),
this traces the real pixels. The letters trace whole. The figures are cut into
limbs by assigning every blue pixel to the nearest part in RIG below — each part
being either a filled polygon (torso, skirt, head, drum, horn) or a centreline
polyline (arms, legs). Nearest-shape assignment puts every cut on the
perpendicular bisector through a joint, so a limb rotating about that joint
opens no visible seam, and the parts stay pixel-exact against the source.

Change a pivot or a limb and you re-run this; nothing downstream is hand-tuned.
"""

import json
import math
import os

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "img", "kaafila-wordmark-brochure.png")
OUT = os.path.join(ROOT, "js", "kaafila-mark.js")

LIME = (197, 199, 40)
BLUE = (38, 74, 136)
# Contour simplification, in source pixels. The mark is drawn at most ~900px
# wide, i.e. under 1:1, so half a pixel of error never reaches a device pixel.
RDP_TOL = 0.5
# The source is a lossy-edged export: its outlines carry sub-pixel ripple that
# the simplifier would otherwise have to keep a vertex for. Half a pixel of
# blur before contouring removes the ripple and leaves the letterform.
FIELD_BLUR = 0.6
# Loops smaller than this are export speckle, not artwork.
MIN_LOOP_AREA = 3.0

# ---------------------------------------------------------------------------
# The rig. Coordinates are source pixels, measured off the artwork.
#   poly  — a filled region; every pixel inside it belongs to this part
#   line  — a limb centreline; pixels are claimed by proximity
#   pivot — the joint this part rotates about
# Order is irrelevant: assignment is by distance, not by precedence.
# ---------------------------------------------------------------------------
RIG = [
    # ---- left figure: the horn player who forms the K --------------------
    {"id": "L_horn", "pivot": (62, 86), "shapes": [
        ("poly", [(56, 90), (60, 74), (168, 10), (192, 14), (192, 66), (182, 80)])]},
    {"id": "L_head", "pivot": (49, 116), "shapes": [
        ("circle", (40, 87.5, 18.5)), ("circle", (11.5, 88, 10.5)),
        ("line", [(43, 103), (50, 119)])]},
    {"id": "L_armA_up",   "pivot": (86, 104), "shapes": [("line", [(86, 104), (142, 118)])]},
    {"id": "L_armA_fore", "pivot": (142, 118), "shapes": [("line", [(142, 118), (151, 88)])]},
    {"id": "L_armB_up",   "pivot": (80, 122), "shapes": [("line", [(80, 122), (158, 137)])]},
    {"id": "L_armB_fore", "pivot": (158, 137), "shapes": [("line", [(158, 137), (170, 90)])]},
    # Both of this figure's triangles taper to a point within a dozen pixels of
    # the artboard's left edge, and the chest's apex falls just outside it. Their
    # edges were least-squares fitted off the source rather than traced, so the
    # emitted geometry is exact, closes properly, and carries no cropped edge
    # that a sway could swing into view.
    {"id": "L_torso", "pivot": (37.8, 224),
     "outline": [(95.4, 105.0), (-13.1, 133.0), (37.7, 224.2)],
     "shapes": [("poly", [(95.4, 105.0), (-13.1, 133.0), (37.7, 224.2)])]},
    {"id": "L_skirt", "pivot": (37.8, 224),
     "outline": [(37.9, 223.8), (168.4, 302.4), (-0.4, 334.1)],
     "shapes": [("poly", [(37.9, 223.8), (168.4, 302.4), (-0.4, 334.1)])]},
    {"id": "L_legA_thigh", "pivot": (75, 302), "shapes": [("line", [(75, 302), (112, 352)])]},
    {"id": "L_legA_shin",  "pivot": (112, 352), "shapes": [("line", [(112, 352), (62, 427)])]},
    {"id": "L_legA_foot",  "pivot": (62, 427), "shapes": [("line", [(62, 427), (96, 418)])]},
    {"id": "L_legB_thigh", "pivot": (150, 300), "shapes": [("line", [(150, 300), (213, 292)])]},
    {"id": "L_legB_shin",  "pivot": (213, 292), "shapes": [("line", [(213, 292), (206, 401)])]},
    {"id": "L_legB_foot",  "pivot": (206, 401), "shapes": [("line", [(206, 401), (224, 397)])]},

    # ---- right figure: the drummer who forms the i -----------------------
    {"id": "R_head", "pivot": (655, 68), "shapes": [("circle", (655, 45, 24))]},
    {"id": "R_torso", "pivot": (662, 92), "shapes": [
        ("poly", [(611, 86), (713, 86), (657, 159)]),
        ("line", [(650, 66), (614, 87)]), ("line", [(661, 66), (710, 87)])]},
    {"id": "R_armL_up",   "pivot": (612, 88), "shapes": [("line", [(612, 88), (573, 100)])]},
    {"id": "R_armL_fore", "pivot": (573, 100), "shapes": [("line", [(573, 100), (621, 152)])]},
    {"id": "R_armR_up",   "pivot": (712, 88), "shapes": [("line", [(712, 88), (752, 100)])]},
    {"id": "R_armR_fore", "pivot": (752, 100), "shapes": [("line", [(752, 100), (717, 151)])]},
    {"id": "R_armLin", "pivot": (618, 92), "shapes": [("line", [(618, 92), (612, 151)])]},
    {"id": "R_armRin", "pivot": (696, 92), "shapes": [("line", [(696, 92), (703, 152)])]},
    {"id": "R_drum", "pivot": (671, 172), "shapes": [
        ("poly", [(604, 173), (640, 148), (671, 143), (706, 149), (738, 170),
                  (706, 194), (671, 201), (638, 195)])]},
    {"id": "R_skirt", "pivot": (661, 193), "shapes": [
        ("poly", [(623, 189), (699, 189), (728, 249), (599, 249)])]},
    {"id": "R_legL_thigh", "pivot": (641, 248), "shapes": [("line", [(641, 248), (622, 274)])]},
    {"id": "R_legL_shin",  "pivot": (622, 274), "shapes": [("line", [(622, 274), (664, 349)])]},
    {"id": "R_legL_foot",  "pivot": (664, 349), "shapes": [("line", [(664, 349), (651, 368)])]},
    {"id": "R_legR_thigh", "pivot": (700, 248), "shapes": [("line", [(700, 248), (717, 274)])]},
    {"id": "R_legR_shin",  "pivot": (717, 274), "shapes": [("line", [(717, 274), (676, 349)])]},
    {"id": "R_legR_foot",  "pivot": (676, 349), "shapes": [("line", [(676, 349), (690, 367)])]},
]

# Marching-squares segment table, keyed by the 4-bit corner code
# (bit0 = top-left, bit1 = top-right, bit2 = bottom-right, bit3 = bottom-left).
# Edge ids: 0 top, 1 right, 2 bottom, 3 left.
MS_EDGES = {
    1: [(3, 0)], 2: [(0, 1)], 3: [(3, 1)], 4: [(1, 2)],
    5: [(3, 2), (0, 1)], 6: [(0, 2)], 7: [(3, 2)], 8: [(2, 3)],
    9: [(2, 0)], 10: [(0, 3), (1, 2)], 11: [(2, 1)], 12: [(1, 3)],
    13: [(1, 0)], 14: [(0, 3)],
}


def marching_squares(field, level=0.5):
    """Sub-pixel contours of `field` at `level`, returned as closed loops."""
    h, w = field.shape
    f = field
    code = ((f[:-1, :-1] > level).astype(np.uint8)
            | ((f[:-1, 1:] > level).astype(np.uint8) << 1)
            | ((f[1:, 1:] > level).astype(np.uint8) << 2)
            | ((f[1:, :-1] > level).astype(np.uint8) << 3))

    def interp(a, b, pa, pb):
        denom = b - a
        t = 0.5 if abs(denom) < 1e-9 else (level - a) / denom
        t = min(max(t, 0.0), 1.0)
        return (pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t)

    segments = []
    ys, xs = np.nonzero((code > 0) & (code < 15))
    for y, x in zip(ys.tolist(), xs.tolist()):
        c = int(code[y, x])
        tl, tr, br, bl = f[y, x], f[y, x + 1], f[y + 1, x + 1], f[y + 1, x]
        pts = {
            0: interp(tl, tr, (x, y), (x + 1, y)),
            1: interp(tr, br, (x + 1, y), (x + 1, y + 1)),
            2: interp(br, bl, (x + 1, y + 1), (x, y + 1)),
            3: interp(bl, tl, (x, y + 1), (x, y)),
        }
        if c in (5, 10):
            # Saddle: let the cell average decide which way the contour turns.
            if (tl + tr + br + bl) / 4.0 > level:
                c = 5 if c == 10 else 10
        for a, b in MS_EDGES[c]:
            segments.append((pts[a], pts[b]))

    # Chain segments end-to-end into loops.
    def key(p):
        return (round(p[0], 4), round(p[1], 4))

    starts = {}
    for i, (a, _) in enumerate(segments):
        starts.setdefault(key(a), []).append(i)

    used = [False] * len(segments)
    loops = []
    for i in range(len(segments)):
        if used[i]:
            continue
        used[i] = True
        loop = [segments[i][0], segments[i][1]]
        cur = segments[i][1]
        while True:
            nxt = None
            for j in starts.get(key(cur), ()):
                if not used[j]:
                    nxt = j
                    break
            if nxt is None:
                break
            used[nxt] = True
            cur = segments[nxt][1]
            loop.append(cur)
            if key(cur) == key(loop[0]):
                break
        if len(loop) > 3:
            loops.append(loop)
    return loops


def rdp(points, tol):
    """Ramer-Douglas-Peucker, iterative so long contours can't blow the stack."""
    n = len(points)
    if n < 3:
        return points
    keep = np.zeros(n, dtype=bool)
    keep[0] = keep[n - 1] = True
    stack = [(0, n - 1)]
    while stack:
        i0, i1 = stack.pop()
        if i1 <= i0 + 1:
            continue
        ax, ay = points[i0]
        bx, by = points[i1]
        dx, dy = bx - ax, by - ay
        seg = math.hypot(dx, dy)
        best, bestd = -1, tol
        for k in range(i0 + 1, i1):
            px, py = points[k]
            if seg < 1e-9:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / seg
            if d > bestd:
                best, bestd = k, d
        if best >= 0:
            keep[best] = True
            stack.append((i0, best))
            stack.append((best, i1))
    return [points[i] for i in range(n) if keep[i]]


def shoelace(pts):
    s = 0.0
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        s += ax * by - bx * ay
    return abs(s) / 2.0


PAD = 2


def contour(field, tol=RDP_TOL):
    """Field -> one SVG path string. +0.5 moves pixel centres onto the PNG's box."""
    smooth = np.asarray(
        Image.fromarray((np.clip(field, 0, 1) * 255).astype(np.uint8))
        .filter(ImageFilter.GaussianBlur(FIELD_BLUR))
    ).astype(np.float32) / 255.0
    # Ink that runs off the artboard (the left figure is cropped by it, as is the
    # final "a") would otherwise trace as open chains that close across the shape
    # and bite pieces out of it. A ring of empty pixels makes every region
    # interior, so every contour closes where it should.
    smooth = np.pad(smooth, PAD)

    out, kept, points = [], 0, 0
    for loop in marching_squares(smooth):
        loop = [(x - PAD, y - PAD) for x, y in loop]
        loop = loop[:-1] if loop[0] == loop[-1] else loop
        if shoelace(loop) < MIN_LOOP_AREA:
            continue
        pts = rdp(loop, tol)
        if len(pts) < 3:
            continue
        kept += 1
        points += len(pts)
        out.append("M" + " L".join(f"{x + 0.5:.1f} {y + 0.5:.1f}" for x, y in pts) + "Z")
    return "".join(out), kept, points


def dist_to_shapes(shapes, gx, gy):
    """Per-pixel distance to a rig part: 0 inside a polygon/circle, else Euclidean."""
    best = np.full(gx.shape, 1e9, dtype=np.float32)
    for kind, geom in shapes:
        if kind == "circle":
            cx, cy, r = geom
            best = np.minimum(best, np.maximum(np.hypot(gx - cx, gy - cy) - r, 0.0))
        elif kind == "line":
            best = np.minimum(best, polyline_distance(geom, gx, gy))
        elif kind == "poly":
            d = polyline_distance(list(geom) + [geom[0]], gx, gy)
            best = np.minimum(best, np.where(point_in_poly(geom, gx, gy), 0.0, d))
    return best


def polyline_distance(pts, gx, gy):
    best = np.full(gx.shape, 1e9, dtype=np.float32)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = 0.0 if L2 < 1e-9 else np.clip(((gx - ax) * dx + (gy - ay) * dy) / L2, 0.0, 1.0)
        best = np.minimum(best, np.hypot(gx - (ax + t * dx), gy - (ay + t * dy)))
    return best


def point_in_poly(poly, gx, gy):
    inside = np.zeros(gx.shape, dtype=bool)
    n = len(poly)
    for i in range(n):
        ax, ay = poly[i]
        bx, by = poly[(i + 1) % n]
        cond = ((ay > gy) != (by > gy))
        with np.errstate(divide="ignore", invalid="ignore"):
            xint = (bx - ax) * (gy - ay) / np.where(by - ay == 0, np.nan, by - ay) + ax
        inside ^= cond & (gx < xint)
    return inside


def soften(mask, blur=0.7):
    """Grow a hard part mask by a pixel and feather it, so neighbouring limbs
    overlap slightly instead of leaving a hairline where they were cut apart."""
    img = Image.fromarray((mask * 255).astype(np.uint8))
    img = img.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(img).astype(np.float32) / 255.0


def main():
    im = Image.open(SRC).convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    alpha = a[..., 3] / 255.0
    rgb = a[..., :3]

    d_lime = np.linalg.norm(rgb - np.array(LIME, np.float32), axis=2)
    d_blue = np.linalg.norm(rgb - np.array(BLUE, np.float32), axis=2)
    lime_field = np.where(d_lime <= d_blue, alpha, 0.0)
    blue_field = np.where(d_blue < d_lime, alpha, 0.0)
    print(f"source {w}x{h}  lime {int((lime_field>0.5).sum()):,}px  "
          f"blue {int((blue_field>0.5).sum()):,}px")

    letters, lloops, lpts = contour(lime_field)
    print(f"  letters: {lloops} loops, {lpts} points")

    gy, gx = np.mgrid[0:h, 0:w].astype(np.float32)

    def assign():
        d = np.stack([dist_to_shapes(p["shapes"], gx, gy) for p in RIG])
        return d.argmin(axis=0)

    # The limb centrelines above were measured by eye, which is good enough to
    # claim the right ink but not to rotate about. So: assign once, refit every
    # limb to the pixels it actually claimed, snap its pivot to the refitted
    # end, and assign again. After this the joints sit on the artwork, not on
    # my reading of it.
    owner = assign()
    ink = blue_field > 0.5
    for i, part in enumerate(RIG):
        if part.get("outline") or [k for k, _ in part["shapes"] if k != "line"]:
            continue
        sel = ink & (owner == i)
        if sel.sum() < 30:
            continue
        pts = np.stack([gx[sel], gy[sel]], axis=1)
        mean = pts.mean(axis=0)
        axis = np.linalg.svd(pts - mean, full_matrices=False)[2][0]
        t = (pts - mean) @ axis
        a = mean + axis * t.min()
        b = mean + axis * t.max()
        if np.hypot(*(a - part["pivot"])) > np.hypot(*(b - part["pivot"])):
            a, b = b, a
        part["shapes"] = [("line", [tuple(a.tolist()), tuple(b.tolist())])]
        part["pivot"] = tuple(a.tolist())
    owner = assign()

    if "--debug" in os.sys.argv:
        # One hue per part over the blue ink, plus a dot at every pivot, so the
        # limb split can be eyeballed rather than taken on trust.
        import colorsys
        vis = np.full((h, w, 3), 255, np.uint8)
        for i, part in enumerate(RIG):
            r, g, b = colorsys.hsv_to_rgb((i * 0.37) % 1.0, 0.85, 0.95)
            sel = (owner == i) & (blue_field > 0.5)
            vis[sel] = (int(r * 255), int(g * 255), int(b * 255))
        dbg = Image.fromarray(vis)
        from PIL import ImageDraw
        dr = ImageDraw.Draw(dbg)
        for part in RIG:
            px, py = part["pivot"]
            dr.ellipse([px - 3, py - 3, px + 3, py + 3], outline=(0, 0, 0), width=2)
        import tempfile
        path = os.path.join(tempfile.gettempdir(), "kaafila-rig-debug.png")
        dbg.save(path)
        print("  wrote", path)

    parts, pivots, missing, tpts = [], {}, [], 0
    for i, part in enumerate(RIG):
        if part.get("outline"):
            pts = part["outline"]
            d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"
            npts = len(pts)
        else:
            field = blue_field * soften(owner == i)
            d, _, npts = contour(field)
        if not d:
            missing.append(part["id"])
            continue
        tpts += npts
        parts.append((part["id"], d))
        pivots[part["id"]] = [round(float(part["pivot"][0]), 1),
                              round(float(part["pivot"][1]), 1)]
    if missing:
        print("  !! no ink claimed by:", ", ".join(missing))

    total = len(letters) + sum(len(d) for _, d in parts)
    print(f"  {len(parts)} rig parts, {tpts} points; "
          f"{total / 1024:.1f}KB of path data")

    body = [
        '  <path class="mark-letters" fill-rule="evenodd" d="%s"/>' % letters,
        '  <g class="mark-figures">',
    ]
    for pid, d in parts:
        body.append('    <g data-part="%s"><path fill-rule="evenodd" d="%s"/></g>' % (pid, d))
    body.append("  </g>")

    js = f'''/* GENERATED by tools/build-wordmark-svg.py - do not edit by hand.
   Traced from img/kaafila-wordmark-brochure.png so the hero can weave the
   letterforms into being and dance the two figures. Re-run the tool after any
   change to the source artwork or to the rig defined in it. */
window.KAAFILA_MARK = {{
  viewBox: "0 0 {w} {h}",
  width: {w},
  height: {h},
  lime: "#{LIME[0]:02X}{LIME[1]:02X}{LIME[2]:02X}",
  blue: "#{BLUE[0]:02X}{BLUE[1]:02X}{BLUE[2]:02X}",
  pivots: {json.dumps(pivots, separators=(",", ":"))},
  markup: [
{chr(10).join("    " + json.dumps(line) + "," for line in body)}
  ].join("")
}};
'''
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"wrote js/kaafila-mark.js  {os.path.getsize(OUT) / 1024:.1f}KB")


if __name__ == "__main__":
    main()
