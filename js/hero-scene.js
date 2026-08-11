/* =========================================================================
   Kaafila 2026 — the hero's scroll-told story
   =========================================================================

   Bird -> nest -> the nest unravels -> the strands become flowing thread ->
   the thread weaves the Kaafila mark -> the mark holds -> the two figures
   dance. One continuous move, entirely positioned by the scrollbar.

   How it is put together
   ----------------------
   Everything is one <svg>, and one function — render(p) — draws the whole
   scene for a progress value between 0 and 1. Nothing else animates: no
   per-element tweens, no CSS transitions, no state kept between frames. A
   single scrubbed GSAP tween walks p, and ScrollTrigger's scrub supplies the
   easing that makes the scene glide to a stop when scrolling stops and run
   backwards when it reverses.

   Being a pure function of p is what keeps it seamless. Every phase is a
   weight computed from p and cross-faded into its neighbours, so there is no
   frame where one scene ends and another begins — reverse, jump, or fling the
   scrollbar and the picture is always the same for the same p.

   The thread is the through-line. The same strands are, in turn, the bundle in
   the bird's beak, the nest's own weave, a flowing river, and finally the weft
   the mark is woven from. They are never swapped out — each strand is a list
   of points, and the points are blended between those four shapes.

   Assets
   ------
   js/kaafila-scene.js  cut-out layer sizes + the beak / nest-hole anchors
   js/kaafila-mark.js   the wordmark traced to paths, its figures cut to limbs
   both are generated; see tools/.
   ========================================================================= */

(function () {
  "use strict";

  var host = document.querySelector("[data-hero-scene]");
  if (!host) return;

  /* ---------------------------------------------------------------------
     Fallback. Without JS the <noscript> in the markup already shows the
     artwork; this covers the cases where JS runs but the animation must not
     — reduced motion, an old browser, a CDN that did not answer, or a bug in
     anything below. The hero then looks exactly as it did before.
     --------------------------------------------------------------------- */
  function showStill() {
    if (host.querySelector(".hero-title")) return;
    document.documentElement.classList.remove("hero-animating");
    host.innerHTML =
      '<img class="hero-title" src="img/kaafila-wordmark-brochure.png" alt="Kaafila">';
    /* Mark, then the theme line, then the banner — the hero's original order. */
    var slot = document.querySelector("[data-hero-still]");
    if (slot) {
      slot.innerHTML =
        '<img class="hero-banner" src="img/hero-banner.jpg" alt="" aria-hidden="true">';
    }
  }

  /*
   * The hero deliberately does NOT check prefers-reduced-motion.
   *
   * It did, and the result was that it stood down on any machine set to
   * "adjust for best performance" — a common Windows default, which the OS
   * reports to every browser as a request for reduced motion. That silently
   * hid the hero from a large slice of visitors on ordinary laptops, not just
   * from people who had asked for less movement. This is the festival's front
   * page and the animation is the page, so it plays for everyone.
   *
   * Note the motion here is scroll-driven: it only ever advances as far as the
   * reader scrolls, and stops dead when they do. Nothing moves on its own,
   * which is the part of reduced-motion guidance that matters most.
   *
   * The rest of the site still honours the setting — see the
   * prefers-reduced-motion blocks in css/style.css and the checks in js/main.js.
   */
  if (!window.gsap || !window.ScrollTrigger ||
      !window.KAAFILA_MARK || !window.KAAFILA_SCENE) {
    showStill();
    /* Say why: a hero that quietly turns into two flat images is impossible to
       tell apart from a hero that is broken. */
    if (window.console && console.info) {
      console.info("[kaafila] hero animation is off — " +
        ((!window.gsap || !window.ScrollTrigger)
          ? "GSAP did not load (js/vendor/gsap.min.js, js/vendor/ScrollTrigger.min.js)."
          : "js/kaafila-mark.js or js/kaafila-scene.js did not load.") +
        " The hero is showing its static artwork instead.");
    }
    return;
  }

  var MARK = window.KAAFILA_MARK;
  var LAYER = window.KAAFILA_SCENE;

  gsap.registerPlugin(ScrollTrigger);

  /* =====================================================================
     Small maths helpers
     ===================================================================== */

  var PI2 = Math.PI * 2;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** Progress within the window [a,b] of the master timeline, clamped. */
  function span(p, a, b) { return clamp01((p - a) / (b - a)); }

  /** Smooth, zero-derivative at both ends — the default easing here. */
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function smoother(t) { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); }
  function easeOut(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { t = clamp01(t); return t * t * t; }

  /** Deterministic pseudo-random in [0,1) — same scene on every load. */
  function rnd(i, salt) {
    var x = Math.sin((i + 1) * 127.1 + (salt || 0) * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Cubic Bezier point. */
  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
  }

  /**
   * Points -> a smooth path, via Catmull-Rom converted to cubic Beziers.
   * Straight line segments between two dozen points would read as faceted at
   * hero size; this costs one pass and makes every strand a real curve.
   */
  /* One decimal, the cheap way. Number.toFixed is a formatter with allocation
     and locale machinery behind it; this path runs about eight thousand times
     a frame on a phone, and rounding by hand measured markedly faster. */
  function r1(v) { return Math.round(v * 10) / 10; }

  function smoothPath(pts) {
    var n = pts.length;
    if (n < 3) return "M" + r1(pts[0][0]) + " " + r1(pts[0][1]) +
                     "L" + r1(pts[n - 1][0]) + " " + r1(pts[n - 1][1]);
    var d = "M" + r1(pts[0][0]) + " " + r1(pts[0][1]);
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[i > 0 ? i - 1 : 0];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2 < n ? i + 2 : n - 1];
      d += "C" + r1(p1[0] + (p2[0] - p0[0]) / 6) + " " +
                 r1(p1[1] + (p2[1] - p0[1]) / 6) + " " +
                 r1(p2[0] - (p3[0] - p1[0]) / 6) + " " +
                 r1(p2[1] - (p3[1] - p1[1]) / 6) + " " +
                 r1(p2[0]) + " " + r1(p2[1]);
    }
    return d;
  }

  /* =====================================================================
     The score. Every window below is a fraction of the pinned scroll, and
     neighbours deliberately overlap so no two phases ever meet at an edge.
     ===================================================================== */

  var T = {
    flyStart:    0.02, flyEnd:    0.22,   // bird crosses to the nest
    enterStart:  0.18, enterEnd:  0.29,   // and goes in
    frayStart:   0.25, frayEnd:   0.34,   // the carried bundle joins the weave
    coilIn:      0.33, coilFull:  0.44,   // the nest's own fibres take form
    nestFade:    0.34, nestGone:  0.47,   // as the woven ball gives itself up
    flowStart:   0.35, flowEnd:   0.52,   // fibres become flowing thread
    warpIn:      0.47, warpFull:  0.58,   // the loom is strung: taana
    weaveStart:  0.51, weaveEnd:  0.66,   // and crossed: baana
    lineIn:      0.56, lineFull:  0.72,   // the mark draws itself in thread
    revealStart: 0.70, revealEnd: 0.80,   // the solid artwork rises behind it
    lineOut:     0.76, lineGone:  0.84,   // and the drawing is let go
    threadFade:  0.78, threadGone:0.84,   // as is the weave
    textIn:      0.79, textFull:  0.85,   // "Taana Baana" arrives
    /* 0.83 to 0.885 is deliberately empty. The mark has just been made out of
       the whole scene and nothing moves through here — a beat to look at it
       before the figures pick the rhythm back up. */
    danceStart:  0.885, danceEnd: 1.00    // the two figures come alive
  };

  /* Thread colours, sampled off the banner artwork's own strands... */
  var THREADS = ["#A2402A", "#C98B36", "#33607F", "#8B7F59", "#B8642F"];
  /* ...and the dry fibre colours of the nest they come out of. A nest strand
     starts as one of these and warms into its thread colour as it unwinds:
     that recolouring is the transformation, so it is worth doing properly
     rather than fading one set of lines out and another in. */
  var FIBRES = ["#7A5A30", "#634822", "#8C6C3C", "#4E3718", "#6C5130"];
  var THREAD_INK = "rgba(46,32,22,0.5)";    // the artwork outlines its threads

  /* The rope is four ribbons, as the banner paints it. The rest of the strands
     are the nest's own, and only appear as it starts to come apart. */
  var TOW = 4;
  var ROPE_COLOURS = ["#A2402A", "#33607F", "#C98B36", "#C0A075"];
  /* Roughly one strand in five ends in a curled flourish while it flows, and
     the curl starts this far along it. */
  var CURL_EVERY = 5;
  var CURL_AT = 0.74;

  /* =====================================================================
     The rope, traced off img/hero-banner.jpg in that artwork's own 1536x1024
     coordinates: in from the left, a long shallow S, across the lower half of
     the nest's basketwork, then the broad loop past it and back to a tapered
     tail. ROPE_FRAME names the two landmarks the path is registered against —
     the bird's centre and the centre of the nest's woven ball — so the whole
     run can be mapped onto whatever positions a layout gives those two, at any
     size or angle, and still sit against them the way the painting does.
     ===================================================================== */

  var ROPE = [
    [0, 792], [90, 745], [175, 700], [245, 655],
    [302, 608],                                   // <- the bird's lower claw
    [358, 568],                                   // <- the bird's upper claw
    [412, 592], [465, 628], [520, 658], [580, 674], [650, 660], [712, 673],
    [765, 700], [815, 728], [872, 738], [930, 723], [985, 701], [1045, 693],
    [1105, 707], [1165, 736], [1225, 769], [1288, 792], [1352, 790],
    [1420, 761], [1470, 723], [1498, 748], [1472, 802], [1402, 839],
    [1312, 856], [1218, 858], [1152, 848]
  ];
  /*
   * The rope is registered against two landmarks rather than one, because the
   * two ends have to line up with different things: the left end must pass
   * exactly through the bird's claws, and the middle must cross the nest where
   * the painting crosses it. A single transform can only satisfy one of them —
   * the bird and the nest are drawn at their own scales, which a responsive
   * layout is free to change independently — so the run is mapped by both and
   * blended from one to the other along its length.
   */
  var ROPE_FRAME = { bird: [280, 455], ball: [1101, 589] };
  /* Where the hand-off happens: still wholly the bird's at the claws (t≈0.17),
     wholly the nest's before the run reaches it (t≈0.57). */
  var ROPE_HANDOFF = { from: 0.20, to: 0.53 };

  function mixHex(a, b, t) {
    var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    var r = Math.round(lerp((A >> 16) & 255, (B >> 16) & 255, t));
    var g = Math.round(lerp((A >> 8) & 255, (B >> 8) & 255, t));
    var l = Math.round(lerp(A & 255, B & 255, t));
    return "rgb(" + r + "," + g + "," + l + ")";
  }

  /* =====================================================================
     Layouts. Not one composition scaled down: the phone gets a portrait
     staging with the bird high and the nest well below it, because the
     banner's wide left-to-right journey has nowhere to go on a narrow screen.

     Only the opening composition is written here, in each layout's own design
     units. The viewBox is then fitted around whatever that came to and
     stretched to the shape the panel actually turned out to be, and the mark
     is centred inside it — so the scene fills a wide desktop and a tall phone
     equally well instead of either being a letterboxed crop of the other.
     ===================================================================== */

  var LAYOUTS = {
    wide: {
      bird: { cx: 230, cy: 307, s: 1.00 },
      nest: { cx: 1129, cy: 368, s: 1.00 },
      markFill: 0.76, markMaxH: 0.62,
      strands: 36, pts: 30, warps: 26, shards: 96, weft: 3.6, tow: 6.4
    },
    mid: {
      bird: { cx: 250, cy: 250, s: 0.78 },
      nest: { cx: 720, cy: 600, s: 0.84 },
      markFill: 0.88, markMaxH: 0.46,
      strands: 30, pts: 26, warps: 22, shards: 74, weft: 3.4, tow: 5.4
    },
    narrow: {
      bird: { cx: 200, cy: 200, s: 0.52 },
      nest: { cx: 430, cy: 655, s: 0.62 },
      markFill: 0.96, markMaxH: 0.34,
      /* pts must stay dense enough to carry the traced rope's loops. */
      strands: 26, pts: 26, warps: 17, shards: 52, weft: 3.2, tow: 4.4
    }
  };

  /** Grow `box` symmetrically about its centre until its w/h matches `aspect`. */
  function fitAspect(box, aspect) {
    if (box.w / box.h < aspect) {
      var w = box.h * aspect;
      return { x: box.x - (w - box.w) / 2, y: box.y, w: w, h: box.h };
    }
    var h = box.w / aspect;
    return { x: box.x, y: box.y - (h - box.h) / 2, w: box.w, h: h };
  }

  /* =====================================================================
     Scene construction
     ===================================================================== */

  var svgNS = "http://www.w3.org/2000/svg";
  function el(name, attrs) {
    var n = document.createElementNS(svgNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* WebP saves ~80% on the cut-outs; the PNGs stay for anything that can't
     read it (Safari before 14). One synchronous canvas probe, once. */
  var EXT = (function () {
    try {
      var c = document.createElement("canvas");
      return c.toDataURL("image/webp").indexOf("data:image/webp") === 0 ? "webp" : "png";
    } catch (e) { return "png"; }
  })();

  /**
   * The limb hierarchy the dance needs. The generated markup is a flat list of
   * parts because tracing has no idea what hangs off what; this is where the
   * figure gets its skeleton, so rotating a shoulder carries the forearm and
   * swaying a torso carries everything above the waist.
   */
  var SKELETON = {
    L_skirt:  ["L_legA_thigh", "L_legB_thigh"],
    L_legA_thigh: ["L_legA_shin"], L_legA_shin: ["L_legA_foot"],
    L_legB_thigh: ["L_legB_shin"], L_legB_shin: ["L_legB_foot"],
    L_torso:  ["L_head", "L_armA_up", "L_armB_up", "L_horn"],
    L_armA_up: ["L_armA_fore"], L_armB_up: ["L_armB_fore"],

    R_skirt:  ["R_legL_thigh", "R_legR_thigh"],
    R_legL_thigh: ["R_legL_shin"], R_legL_shin: ["R_legL_foot"],
    R_legR_thigh: ["R_legR_shin"], R_legR_shin: ["R_legR_foot"],
    R_torso:  ["R_head", "R_armL_up", "R_armR_up", "R_armLin", "R_armRin"],
    R_armL_up: ["R_armL_fore"], R_armR_up: ["R_armR_fore"]
  };

  var scene = null;   // everything the current layout built

  function build(name) {
    var L = LAYOUTS[name];
    host.innerHTML = "";

    var svg = el("svg", {
      "class": "hero-svg",
      preserveAspectRatio: "xMidYMid meet",
      "aria-hidden": "true",
      focusable: "false"
    });

    /* --- placed geometry ------------------------------------------------ */
    var bw = LAYER.bird.w * L.bird.s, bh = LAYER.bird.h * L.bird.s;
    var bird = { x: L.bird.cx - bw / 2, y: L.bird.cy - bh / 2, w: bw, h: bh };

    var nw = LAYER.nest.w * L.nest.s, nh = LAYER.nest.h * L.nest.s;
    var nest = { x: L.nest.cx - nw / 2, y: L.nest.cy - nh / 2, w: nw, h: nh };
    nest.holeX = nest.x + LAYER.nest.hole[0] * nw;
    nest.holeY = nest.y + LAYER.nest.hole[1] * nh;
    nest.holeR = LAYER.nest.hole[2] * nw;
    /* The woven ball, not the whole layer: the branch and leaves hang off the
       top right and would drag the coil's centre away with them. Measured off
       the cut-out's own alpha. */
    nest.ballX = nest.x + nw * 0.35;
    nest.ballY = nest.y + nh * 0.62;
    nest.ballRX = nw * 0.30;
    nest.ballRY = nh * 0.37;

    /* The viewBox is fitted to the opening composition and then let out to the
       panel's own proportions, so nothing is letterboxed and the artwork is as
       large as the space allows on any screen. */
    var pad = Math.max(bw, nw) * 0.07;
    var box = {
      x: Math.min(bird.x, nest.x) - pad,
      y: Math.min(bird.y, nest.y) - pad,
      w: Math.max(bird.x + bw, nest.x + nw) - Math.min(bird.x, nest.x) + pad * 2,
      h: Math.max(bird.y + bh, nest.y + nh) - Math.min(bird.y, nest.y) + pad * 2
    };
    var panelW = host.clientWidth || 1000;
    var panelH = host.clientHeight || 600;
    /* Clamped, because an extreme panel — a phone held sideways, an ultrawide
       monitor — would otherwise stretch the viewBox until the artwork was a
       stamp in the middle of it. Past these limits the SVG letterboxes instead,
       which keeps the scene as large as the short side allows. */
    var aspect = Math.min(2.1, Math.max(0.42, panelW / Math.max(panelH, 120)));
    var view = fitAspect(box, aspect);
    svg.setAttribute("viewBox",
      view.x.toFixed(1) + " " + view.y.toFixed(1) + " " +
      view.w.toFixed(1) + " " + view.h.toFixed(1));

    /* The mark is centred in that view, as wide as it can be without growing
       taller than its share of the panel. */
    /* The rope's two registrations — see ROPE_FRAME. Each is the plain
       scale-and-shift that carries the banner onto this layout's bird, and onto
       this layout's nest, at those subjects' own scales. */
    var rf = ROPE_FRAME;
    var rope = {
      bx: rf.bird[0], by: rf.bird[1], bs: L.bird.s,
      box: L.bird.cx, boy: L.bird.cy,
      nx: rf.ball[0], ny: rf.ball[1], ns: L.nest.s,
      nox: nest.ballX, noy: nest.ballY
    };

    var mw = Math.min(view.w * L.markFill,
                      view.h * L.markMaxH * MARK.width / MARK.height);
    var mh = mw * MARK.height / MARK.width;
    var mark = {
      x: view.x + (view.w - mw) / 2, y: view.y + (view.h - mh) / 2, w: mw, h: mh
    };
    mark.scale = mw / MARK.width;

    /* --- the mark's reveal mask ----------------------------------------- */
    var defs = el("defs");
    var maskId = "kaafila-weave-" + name;
    var bandX = mark.x - mark.w * 0.03;
    var bandFull = mark.w * 1.06;
    var mask = el("mask", {
      id: maskId, maskUnits: "userSpaceOnUse",
      x: bandX - 10, y: mark.y - 40, width: bandFull + 20, height: mark.h + 80
    });
    /* One band per weft strand. Each opens left to right as its own strand
       lands, so the mark is uncovered by the thread crossing it — a shuttle
       carrying weft — rather than fading up underneath the weave. */
    var bands = [];
    var bandH = mark.h / L.strands;
    for (var b = 0; b < L.strands; b++) {
      var r = el("rect", {
        x: bandX, y: mark.y + b * bandH - bandH * 0.14,
        width: 0, height: bandH * 1.28, fill: "#fff"
      });
      mask.appendChild(r);
      bands.push(r);
    }
    defs.appendChild(mask);

    svg.appendChild(defs);

    /* --- layers, back to front ------------------------------------------ */
    var gBack = el("g", { "class": "scene-threads" });
    var gShard = el("g", { "class": "scene-shards" });
    var gBird = el("g", { "class": "scene-bird" });
    var gNest = el("g", { "class": "scene-nest" });
    var gMark = el("g", { "class": "scene-mark", mask: "url(#" + maskId + ")" });
    var gLines = el("g", { "class": "scene-lines" });
    var gWarp = el("g", { "class": "scene-warp" });
    var gFront = el("g", { "class": "scene-threads" });
    svg.appendChild(gBack);
    svg.appendChild(gNest);
    svg.appendChild(gShard);
    svg.appendChild(gBird);
    svg.appendChild(gMark);
    svg.appendChild(gLines);
    svg.appendChild(gWarp);
    svg.appendChild(gFront);

    gNest.appendChild(el("image", {
      href: "img/scene/nest." + EXT,
      x: nest.x, y: nest.y, width: nest.w, height: nest.h
    }));

    var birdInner = el("g");   // wing-beat lives here so it stacks under flight
    birdInner.appendChild(el("image", {
      href: "img/scene/bird." + EXT,
      x: -bird.w / 2, y: -bird.h / 2, width: bird.w, height: bird.h
    }));
    gBird.appendChild(birdInner);

    /* --- strands --------------------------------------------------------
       Every strand is drawn twice: a dark line under a coloured one, which is
       how the banner's own threads are inked, and what keeps the redrawn
       thread in the same visual language as the painted bird and nest. */
    var strands = [];
    var towCount = Math.min(TOW, L.strands);
    for (var i = 0; i < L.strands; i++) {
      var isTow = i < towCount;
      /* The rope passes wholly behind the nest, as the banner draws it: it
         disappears at the nest's edge and comes out the far side, and the
         basketwork stays solid. Lacing half the ribbons in front of it read as
         rope lying across the nest instead of running past behind. The nest's
         own strands still cross both ways, since those are its weave. */
      var into = (isTow || i % 3 === 0) ? gBack : gFront;
      var wobble = 0.78 + rnd(i, 5) * 0.5;
      var wid = (isTow ? L.tow : L.weft) * wobble;
      var lit = el("path", {
        "class": "strand", fill: "none",
        stroke: isTow ? ROPE_COLOURS[i % ROPE_COLOURS.length]
                      : FIBRES[i % FIBRES.length],
        "stroke-width": wid.toFixed(2), "stroke-linecap": "round"
      });
      var ink = el("path", {
        "class": "strand-ink", fill: "none", stroke: THREAD_INK,
        "stroke-width": (wid + (isTow ? 1.8 : 1.1)).toFixed(2),
        "stroke-linecap": "round"
      });
      into.appendChild(ink);
      into.appendChild(lit);
      strands.push({
        i: i, ink: ink, lit: lit, tow: isTow,
        curl: !isTow && i % CURL_EVERY === 2,
        curlAt: 0.34 + rnd(i, 29) * 0.52,
        keep: !isTow && i % 13 === 4,
        lane: (i + 0.5) / L.strands,
        hue: THREADS[i % THREADS.length],
        fibre: FIBRES[i % FIBRES.length],
        /* Carried thread is heavy and few; nest fibre is fine and many, and it
           firms up a little as it is beaten into cloth — but only a little.
           Plumping it further turned the weave into a solid plaid that buried
           the mark underneath it. */
        w0: wid, w1: isTow ? wid * 0.58 : wid * 1.15,
        tint: -1, alpha: -1, wNow: -1
      });
    }

    /* --- shards: the bits of fibre thrown off as the nest lets go --------
       Short dry splinters that fly outward and tumble while the spiral
       unwinds. They are what makes the nest read as coming apart rather than
       merely dissolving, and they cost one transform each. */
    var shards = [];
    for (var sh = 0; sh < L.shards; sh++) {
      var slen = nest.ballRX * (0.10 + rnd(sh, 21) * 0.13);
      var sd = el("line", {
        "class": "shard", x1: -slen / 2, y1: 0, x2: slen / 2, y2: 0,
        stroke: FIBRES[sh % FIBRES.length],
        "stroke-width": (L.weft * 0.7).toFixed(2), "stroke-linecap": "round"
      });
      gShard.appendChild(sd);
      shards.push({
        el: sd,
        ang: rnd(sh, 22) * PI2,
        /* Most stay in close, a few carry further: that gradient is what makes
           a halo rather than a ring. */
        reach: 0.16 + Math.pow(rnd(sh, 23), 1.8) * 1.05,
        lead: rnd(sh, 24) * 0.55,               // they do not all leave at once
        spin: (rnd(sh, 25) - 0.5) * 520
      });
    }

    /* --- warp: the vertical threads that only exist during the weave -----
       Their dash pattern is the weft's own spacing, so each warp reads as
       passing under one weft and over the next. Taana crossing baana, which
       is the festival's theme said literally. */
    var warps = [];
    for (var k = 0; k < L.warps; k++) {
      var wp = el("path", {
        "class": "warp", fill: "none",
        stroke: THREADS[(k + 2) % THREADS.length],
        "stroke-width": (L.weft * 0.85).toFixed(2),
        "stroke-linecap": "round",
        "stroke-dasharray": (bandH * 1.35).toFixed(2) + " " + (bandH * 0.65).toFixed(2),
        "stroke-dashoffset": (bandH * (0.5 + 1.5 * rnd(k, 9))).toFixed(2)
      });
      gWarp.appendChild(wp);
      warps.push(wp);
    }

    /* --- the mark, and its skeleton -------------------------------------- */
    var markInner = el("g", {
      transform: "translate(" + mark.x.toFixed(2) + " " + mark.y.toFixed(2) +
                 ") scale(" + mark.scale.toFixed(5) + ")"
    });
    markInner.innerHTML = MARK.markup;
    gMark.appendChild(markInner);

    var parts = {};
    var nodes = markInner.querySelectorAll("[data-part]");
    for (var q = 0; q < nodes.length; q++) parts[nodes[q].getAttribute("data-part")] = nodes[q];
    for (var parent in SKELETON) {
      if (!parts[parent]) continue;
      SKELETON[parent].forEach(function (child) {
        if (parts[child]) parts[parent].appendChild(parts[child]);
      });
    }

    /* --- the mark, drawn in thread before it is filled -------------------
       The storyboard has the figures arrive among the flowing threads as thin
       line drawings, and only then become solid artwork. This is that: a
       stroked, unfilled copy of the mark whose outlines are drawn on with
       stroke-dashoffset, as though a thread were being laid along them. The
       figures come first, then the letters, then the fills rise behind. */
    var lineArt = el("g", {
      "class": "mark-lines", fill: "none",
      "stroke-linecap": "round", "stroke-linejoin": "round",
      "stroke-width": (2.6 / mark.scale).toFixed(2),
      transform: "translate(" + mark.x.toFixed(2) + " " + mark.y.toFixed(2) +
                 ") scale(" + mark.scale.toFixed(5) + ")"
    });
    lineArt.innerHTML = MARK.markup;
    gLines.appendChild(lineArt);

    var lines = [];
    var lps = lineArt.querySelectorAll("path");
    for (var li = 0; li < lps.length; li++) {
      var lp = lps[li];
      var isLetters = lp.getAttribute("class") === "mark-letters";
      /* Strip the classes and part hooks off this copy. The stylesheet paints
         .mark-letters and .mark-figures, and a CSS fill beats the fill="none"
         presentation attribute on the group above — leaving these classes on
         made the "line art" render as the finished solid mark. */
      lp.removeAttribute("class");
      lp.removeAttribute("data-part");
      /* getTotalLength is measured once here, never per frame. */
      var len = 0;
      try { len = lp.getTotalLength(); } catch (e) { len = 0; }
      if (!len) continue;
      lp.setAttribute("stroke", THREADS[li % THREADS.length]);
      lp.setAttribute("stroke-dasharray", r1(len));
      lp.setAttribute("stroke-dashoffset", r1(len));
      lines.push({
        el: lp, len: len,
        /* figures draw over the first two-thirds, letters over the last */
        lead: isLetters ? 0.45 + (li / lps.length) * 0.35 : (li / lps.length) * 0.5
      });
    }
    /* Any group classes inside the copy would repaint it too. */
    var lgs = lineArt.querySelectorAll("g");
    for (var lg = 0; lg < lgs.length; lg++) {
      lgs[lg].removeAttribute("class");
      lgs[lg].removeAttribute("data-part");
    }

    host.appendChild(svg);

    scene = {
      L: L, view: view, rope: rope, svg: svg,
      bird: bird, birdG: gBird, birdInner: birdInner,
      nest: nest, nestG: gNest, mark: mark, markG: gMark, markInner: markInner,
      parts: parts, strands: strands, warps: warps, bands: bands,
      shards: shards, shardG: gShard,
      lines: lines, linesG: gLines,
      warpG: gWarp, bandH: bandH, bandFull: bandFull,
      bandW: new Array(bands.length), warpDone: false
    };
    return scene;
  }

  /* =====================================================================
     Where a strand is, for any p.

     Four shapes, blended. Each is written in the same parameter t along the
     strand, so blending two of them reads as one shape becoming the other
     rather than as a cross-fade.
     ===================================================================== */

  /**
   * Shape 1 — the bundle the bird is carrying, hanging from its beak.
   * Held at the beak, falling away under it, then sweeping off to the lower
   * right: the banner artwork's own thread run, redrawn so it can move.
   */
  function towShape(s, t, p) {
    /*
     * One ribbon of the bundle, following the traced rope.
     *
     * The banner's rope is not a set of parallel waves — it is four ribbons
     * braided together, weaving over and under each other the whole way. So
     * every ribbon walks the same path and is offset across it: a fixed lane
     * plus a slow sine that carries it through its neighbours' lanes and back.
     * That crossing is what makes a bundle read as rope.
     */
    var R = scene.rope;
    var n = ROPE.length;
    var f = t * (n - 1);
    var i0 = Math.min(n - 2, Math.floor(f));
    var ft = f - i0;
    var a = ROPE[i0], b = ROPE[i0 + 1];

    /* The tangent, for the across-the-path direction. */
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;

    /*
     * Lane spacing is set from the ribbon's own stroke width, then divided by
     * the rope's scale to get back into banner units. Fixing it in banner units
     * instead meant that on a phone — where the bird and nest are much closer
     * together, so the whole rope is drawn smaller — the lanes shrank while the
     * stroke width did not, and the four ribbons piled up into a single band.
     */
    var gap = scene.L.tow * 1.55 / R.k;
    /* How far the mapping has handed over from the bird to the nest. */
    var w = smooth(clamp01((t - ROPE_HANDOFF.from) /
                           (ROPE_HANDOFF.to - ROPE_HANDOFF.from)));
    var scale = lerp(R.bs, R.ns, w);

    /*
     * Lane spacing is set from the ribbon's own stroke width, then divided by
     * the local scale to get back into banner units. Fixing it in banner units
     * instead meant that wherever the rope is drawn smaller, the lanes shrank
     * while the stroke width did not, and the four ribbons piled up into one
     * band.
     */
    var gap = scene.L.tow * 1.55 / scale;
    var lane = s.i - (Math.min(TOW, scene.L.strands) - 1) / 2;
    var braid = Math.sin(t * 13.0 + s.i * 1.9 + p * 1.6) * gap * 0.85;
    /* Ends taper together, as the painted ones do. */
    var spread = 0.35 + 0.65 * Math.sin(clamp01(t) * Math.PI);
    var off = (lane * gap + braid) * spread;

    var bx = a[0] + dx * ft + nx * off;
    var by = a[1] + dy * ft + ny * off;

    /* banner space -> stage space, by both registrations, blended */
    var ax = R.box + (bx - R.bx) * R.bs, ay = R.boy + (by - R.by) * R.bs;
    var cx = R.nox + (bx - R.nx) * R.ns, cy = R.noy + (by - R.ny) * R.ns;
    return [lerp(ax, cx, w), lerp(ay, cy, w)];
  }

  /**
   * Shape 2 — wound into the nest as a spiral, not a ball of rings.
   *
   * Each strand runs outward from near the entrance to the nest's rim while it
   * turns, so the whole thing reads as a vortex with the dark mouth at its
   * centre — the nest caught mid-spin, which is how the storyboard draws it.
   * Concentric rings looked like a ball of wool and gave the unravel nothing
   * to unwind from.
   */
  function coilShape(s, t) {
    var N = scene.nest;
    var turns = 0.8 + rnd(s.i, 1) * 2.4;
    var ang = rnd(s.i, 2) * PI2 + t * PI2 * turns;
    /* Radius grows along the strand: the inner end sits by the mouth, the
       outer end out at the rim. Which end leads is per strand. */
    var inner = 0.28 + rnd(s.i, 3) * 0.20;
    /* Kept inside the woven wall. Running past it drew a pale ring around the
       nest's silhouette, which read as a halo rather than as its own weave. */
    var outer = 0.66 + rnd(s.i, 17) * 0.22;
    var along = rnd(s.i, 18) > 0.5 ? t : 1 - t;
    var rr = lerp(inner, outer, along);
    /* Two out-of-step wobbles, so the arm of the spiral wanders the way a
       hand-laid fibre does rather than plotting a clean involute. */
    var wob = 1 + 0.08 * Math.sin(t * 8.3 + s.i * 2.1)
                + 0.05 * Math.sin(t * 19.7 + s.i);
    var tilt = (rnd(s.i, 4) - 0.5) * 0.4;
    var x = Math.cos(ang) * N.ballRX * rr * wob;
    var y = Math.sin(ang) * N.ballRY * rr * wob;
    return [N.ballX + x * Math.cos(tilt) - y * Math.sin(tilt),
            N.ballY + x * Math.sin(tilt) + y * Math.cos(tilt)];
  }

  /**
   * Shape 3 — a river of thread crossing the stage. Kept close to parallel:
   * a wide spread of amplitudes turns thirty strands into a scribble, where a
   * shallow one reads as current.
   */
  function flowShape(s, t, p) {
    var V = scene.view, M = scene.mark;
    /*
     * Long, shallow, near-parallel: a current, not a tangle. Roughly one and a
     * half waves across the whole panel, with only a little variation between
     * strands, so the threads travel together and stay legible as individual
     * threads. Short wavelengths and a wide spread of amplitudes turned thirty
     * strands into a scribble.
     *
     * Amplitude is measured in lane-widths rather than panel heights, so the
     * current reads the same on a phone as on a desktop.
     */
    var top = M.y - M.h * 0.55, bottom = M.y + M.h * 1.55;
    var laneH = (bottom - top) / scene.L.strands;
    var amp = laneH * (2.0 + rnd(s.i, 6) * 1.2);
    var freq = 0.85 + rnd(s.i, 7) * 0.45;
    /* Phases stay near each other so neighbours rise and fall together, the
       way water does, instead of every strand doing its own thing. */
    var ph = s.lane * 2.4 + rnd(s.i, 8) * 0.9 + p * 3.0;

    /* Where along the strand the curl begins. Per strand, or every curl starts
       at the same x and they stack into a vertical column of identical loops. */
    var at = s.curlAt;
    var u = s.curl ? clamp01((t - at) / (1 - at)) : 0;
    var tt = s.curl ? Math.min(t, at) : t;           // the curl leaves the run here
    var x = V.x - V.w * 0.12 + tt * V.w * 1.24;
    var y = lerp(top, bottom, s.lane) + Math.sin(tt * freq * PI2 + ph) * amp;
    if (u <= 0) return [x, y];

    /*
     * A rolled ribbon end. Past CURL_AT the strand leaves its run and winds
     * into a tightening spiral — the little curled flourishes the storyboard
     * scatters through the flowing thread. The spiral is struck about a centre
     * one radius off to the side, so at u=0 it starts exactly on the run and
     * the join is invisible.
     */
    var R = laneH * (0.85 + rnd(s.i, 26) * 0.75);    // small; a flourish, not a loop
    var phi = (rnd(s.i, 27) > 0.5 ? 1 : -1) * Math.PI / 2;
    var cx = x + R * Math.cos(phi);
    var cy = y + R * Math.sin(phi);
    var a = phi + Math.PI + u * PI2 * (1.05 + rnd(s.i, 28) * 0.55);
    var r = R * (1 - 0.72 * u);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  /**
   * Shape 4 — laid across the mark as weft, ready to be woven. The reach and
   * the ripple vary per row: rows of identical length starting at identical
   * x would give the cloth two ruled edges and read as lined paper.
   */
  function weftShape(s, t) {
    var M = scene.mark;
    if (s.keep) {
      /* A couple of strands never become weft. They gather into small rolled
         flourishes at the mark's left shoulder and stay there once the rest of
         the weave has gone — the leftover thread the storyboard keeps beside
         the finished mark. */
      var R = M.h * (0.09 + rnd(s.i, 30) * 0.05);
      var cx0 = M.x + M.w * 0.015 - R;
      var cy0 = M.y + M.h * (0.30 + rnd(s.i, 31) * 0.5);
      var a = -Math.PI * 0.35 + t * PI2 * 1.45;
      var r = R * (1 - 0.62 * t);
      return [cx0 + r * Math.cos(a), cy0 + r * Math.sin(a)];
    }
    var over = 0.02 + rnd(s.i, 12) * 0.05;
    return [M.x - M.w * over + t * M.w * (1 + over * 2),
            M.y + s.lane * M.h +
              Math.sin(t * (3 + rnd(s.i, 13) * 4) + s.i) * scene.bandH * (0.2 + rnd(s.i, 14) * 0.3)];
  }

  /**
   * When strand `s` settles into its weft row. Rows land one after another
   * down the cloth rather than all at once — the stagger is the difference
   * between a weave and a wipe. The mask band for the same row follows it.
   */
  function weftProgress(s, p) {
    var raw = span(p, T.weaveStart, T.weaveEnd) * 1.55 - s.lane * 0.55;
    return smoother(clamp01(raw));
  }

  /** How far row `lane`'s band has been uncovered — same cascade, later. */
  function bandOpen(lane, p) {
    var raw = span(p, T.revealStart, T.revealEnd) * 1.55 - lane * 0.55;
    return easeOut(clamp01(raw));
  }

  /**
   * A strand's points for progress p.
   *
   * The unravel does not blend uniformly. Each point crosses from coil to
   * river on its own slightly later schedule, so a strand peels off the ball
   * end-first and whips away while its middle is still wound — which is what
   * the nest coming apart actually looks like.
   */
  function strandPoints(s, p) {
    var L = scene.L;
    var n = L.pts;
    /* A rope strand is drawn in as the nest gathers itself; a nest strand was
       coiled all along. */
    var wCoil = s.tow ? smooth(span(p, T.frayStart, T.frayEnd)) : 1;
    var wFlow = span(p, T.flowStart, T.flowEnd);
    var wWeft = weftProgress(s, p);
    var lead = rnd(s.i, 11);                 // which end of this strand leaves first
    var out = new Array(n);

    for (var j = 0; j < n; j++) {
      var t = j / (n - 1);
      var end = lead > 0.5 ? t : 1 - t;

      var pt;
      if (wCoil <= 0) {
        pt = towShape(s, t, p);
      } else if (wCoil >= 1) {
        pt = coilShape(s, t);
      } else {
        var tow = towShape(s, t, p);
        var co = coilShape(s, t);
        pt = [lerp(tow[0], co[0], wCoil), lerp(tow[1], co[1], wCoil)];
      }

      if (wFlow > 0) {
        /* End-first release. Each point crosses from coil to river on its own
           slightly later schedule, so a strand peels off the ball end-first
           and whips away while its middle is still wound — which is what a
           nest coming apart actually looks like. */
        var wj = smoother(clamp01(wFlow * 1.9 - end * 0.9));
        if (wj > 0) {
          var fl = flowShape(s, t, p);
          pt = [lerp(pt[0], fl[0], wj), lerp(pt[1], fl[1], wj)];
        }
      }

      if (wWeft > 0) {
        var wf = weftShape(s, t);
        pt = [lerp(pt[0], wf[0], wWeft), lerp(pt[1], wf[1], wWeft)];
      }

      out[j] = pt;
    }

    return out;
  }

  /* =====================================================================
     The dance. Rotations are sine functions of the dance progress, so the
     movement is rhythmic, loops cleanly, and reverses exactly — a keyframed
     dance would stutter under a scrubbed, reversible timeline.
     ===================================================================== */

  var BEATS = 3.25;   // how many sways fit in the dance's share of the scroll

  function setPart(id, rot, dx, dy) {
    var g = scene.parts[id];
    if (!g) return;
    var piv = MARK.pivots[id];
    var tr = "";
    if (dx || dy) tr += "translate(" + (dx || 0).toFixed(2) + " " + (dy || 0).toFixed(2) + ")";
    if (rot) tr += "rotate(" + rot.toFixed(2) + " " + piv[0] + " " + piv[1] + ")";
    if (tr) g.setAttribute("transform", tr);
    else g.removeAttribute("transform");
  }

  function dance(q) {
    /* Ease in and out at the edges so the figures wake and settle rather than
       snapping into motion, and hold perfectly still outside the window. */
    var gain = Math.sin(clamp01(q) * Math.PI);
    gain = gain * gain * (3 - 2 * gain);
    var a = q * BEATS * PI2;
    var s1 = Math.sin(a), c1 = Math.cos(a);
    var s2 = Math.sin(a + Math.PI);          // the two figures trade the beat
    var c2 = Math.cos(a + Math.PI);
    var g = gain;

    /* -- left figure: the horn player ---------------------------------- */
    setPart("L_torso", 2.6 * s1 * g, 0, -1.6 * Math.abs(c1) * g);
    setPart("L_skirt", -1.9 * s1 * g);
    setPart("L_head", 3.2 * s1 * g);
    setPart("L_horn", 4.2 * c1 * g);                 // the horn lifts on the beat
    setPart("L_armA_up", -3.4 * c1 * g);
    setPart("L_armA_fore", 4.6 * c1 * g);
    setPart("L_armB_up", -2.6 * c1 * g);
    setPart("L_armB_fore", 3.8 * c1 * g);
    setPart("L_legA_thigh", 5.2 * s1 * g);
    setPart("L_legA_shin", -7.0 * Math.max(0, s1) * g);
    setPart("L_legA_foot", 4.0 * s1 * g);
    setPart("L_legB_thigh", -4.4 * s1 * g);
    setPart("L_legB_shin", 6.2 * Math.max(0, -s1) * g);
    setPart("L_legB_foot", -3.4 * s1 * g);

    /* -- right figure: the drummer -------------------------------------- */
    setPart("R_torso", 2.8 * s2 * g, 0, -1.8 * Math.abs(c2) * g);
    setPart("R_skirt", -2.0 * s2 * g);
    setPart("R_head", 3.4 * s2 * g);
    setPart("R_drum", 3.0 * s2 * g, 0, 1.6 * Math.abs(c2) * g);
    /* Hands alternate on the drum head — a quarter beat apart, not together. */
    setPart("R_armL_up", 3.0 * s2 * g);
    setPart("R_armL_fore", -7.5 * Math.sin(a + Math.PI * 0.5) * g);
    setPart("R_armR_up", -3.0 * s2 * g);
    setPart("R_armR_fore", 7.5 * Math.sin(a + Math.PI * 1.5) * g);
    setPart("R_armLin", 4.5 * s2 * g);
    setPart("R_armRin", -4.5 * s2 * g);
    setPart("R_legL_thigh", -5.0 * s2 * g);
    setPart("R_legL_shin", 7.0 * Math.max(0, -s2) * g);
    setPart("R_legL_foot", -3.6 * s2 * g);
    setPart("R_legR_thigh", 5.0 * s2 * g);
    setPart("R_legR_shin", -7.0 * Math.max(0, s2) * g);
    setPart("R_legR_foot", 3.6 * s2 * g);
  }

  /* =====================================================================
     render(p) — the whole picture, for one progress value
     ===================================================================== */

  var reveals = [];

  /**
   * Where the bird is at any progress, and where its beak is.
   *
   * Split out of render so it can also be asked where the beak *was* at the
   * moment the thread was let go — which is what lets the thread stay behind
   * while the bird carries on, without keeping any state between frames.
   */
  function birdAt(p) {
    var S = scene, B = S.bird, N = S.nest;
    var fly = smoother(span(p, T.flyStart, T.flyEnd));
    var enter = span(p, T.enterStart, T.enterEnd);

    /* A shallow glide across to the nest's mouth. It lifts a little on the way
       out and settles on the approach, but stays near the nest's own height. */
    var from = [B.x + B.w / 2, B.y + B.h / 2];
    var perch = [N.holeX - N.holeR * 1.5, N.holeY - N.holeR * 1.9];
    var c1 = [lerp(from[0], perch[0], 0.32), from[1] - S.view.h * 0.055];
    var c2 = [lerp(from[0], perch[0], 0.74), perch[1] - S.view.h * 0.075];
    var at = bez(from, c1, c2, perch, fly);
    var ahead = bez(from, c1, c2, perch, Math.min(1, fly + 0.02));
    var glide = Math.atan2(ahead[1] - at[1], ahead[0] - at[0]) * 180 / Math.PI * 0.55;

    /* Wing beat: the silhouette compresses and lifts on each downstroke. Ten
       beats across the crossing reads as a bird, not a metronome. */
    var beat = Math.sin(fly * PI2 * 10);
    var flap = 1 - 0.085 * beat * (1 - enter);
    var bob = -beat * S.view.h * 0.012 * (1 - enter);

    /* Going in: it drops onto the entrance, folds down to nothing against the
       dark of the hole, and tips head-first as it goes. */
    var slip = easeIn(enter);
    var shrink = lerp(1, 0.70, fly) * (1 - 0.86 * slip);
    var tilt = glide + 22 * smooth(enter);
    var x = lerp(at[0], N.holeX, slip);
    var y = lerp(at[1] + bob, N.holeY, slip);

    return { x: x, y: y, tilt: tilt, shrink: shrink, flap: flap, enter: enter };
  }

  function render(p) {
    if (!scene) return;
    var S = scene, B = S.bird, N = S.nest, M = S.mark;

    /* ---- the bird ---------------------------------------------------- */
    var bird = birdAt(p);
    var enter = bird.enter;

    S.birdG.setAttribute("transform",
      "translate(" + r1(bird.x) + " " + r1(bird.y) + ") " +
      "rotate(" + r1(bird.tilt) + ") scale(" + bird.shrink.toFixed(4) + ")");
    S.birdInner.setAttribute("transform", "scale(1 " + bird.flap.toFixed(4) + ")");
    S.birdG.style.opacity = (1 - smooth(span(p, T.enterStart + 0.055, T.enterEnd))).toFixed(3);

    /* ---- the nest ---------------------------------------------------- */
    var nestOut = smooth(span(p, T.nestFade, T.nestGone));
    S.nestG.style.opacity = (1 - nestOut).toFixed(3);
    /* It settles and sinks a touch as it gives its thread up. */
    if (nestOut > 0) {
      S.nestG.setAttribute("transform",
        "translate(0 " + (nestOut * S.view.h * 0.03).toFixed(2) + ")");
    } else {
      S.nestG.removeAttribute("transform");
    }

    /* ---- strands ----------------------------------------------------- */
    var gone = smooth(span(p, T.threadFade, T.threadGone));
    /* Fibre -> thread. The nest's strands warm from dry cane into the coloured
       thread of the bundle as they unwind; that recolouring is the moment the
       storyboard turns strands into threads. */
    var tint = smooth(span(p, T.frayEnd, T.flowEnd - 0.02));
    var born = smooth(span(p, T.coilIn, T.coilFull));
    /* Once the mark starts drawing itself, the weave steps back and becomes the
       ground it is being drawn on. At full strength the weft competed with the
       line work and the two read as one busy plaid. */
    var recede = lerp(1, 0.42, smooth(span(p, T.lineIn, T.lineFull)));

    for (var i = 0; i < S.strands.length; i++) {
      var s = S.strands[i];
      /* The keepsake curls thin out with the rest but are never let go. */
      var fade = s.keep ? 1 - gone * 0.62 : 1 - gone;
      var a = (s.tow ? 1 : born) * fade * (s.keep ? Math.max(recede, 0.7) : recede);
      if (Math.abs(a - s.alpha) > 0.004) {
        s.alpha = a;
        s.ink.style.opacity = a.toFixed(3);
        s.lit.style.opacity = a.toFixed(3);
      }
      if (a <= 0.004) continue;

      if (!s.tow && Math.abs(tint - s.tint) > 0.01) {
        s.tint = tint;
        s.lit.setAttribute("stroke", mixHex(s.fibre, s.hue, tint));
      }

      /* Carried thread thins as it is absorbed into the nest; nest fibre
         thickens as it is beaten into cloth. Both are gradual, and neither is
         worth a DOM write for a hundredth of a pixel. */
      var wq = s.tow ? smooth(span(p, T.frayStart, T.frayEnd))
                     : smooth(span(p, T.weaveStart - 0.04, T.weaveEnd));
      var wNow = lerp(s.w0, s.w1, wq);
      if (Math.abs(wNow - s.wNow) > 0.06) {
        s.wNow = wNow;
        s.lit.setAttribute("stroke-width", wNow.toFixed(2));
        s.ink.setAttribute("stroke-width", (wNow + (s.tow ? 1.8 : 1.1)).toFixed(2));
      }

      var d = smoothPath(strandPoints(s, p));
      s.ink.setAttribute("d", d);
      s.lit.setAttribute("d", d);
    }

    /* ---- shards ------------------------------------------------------ */
    var throwing = span(p, T.frayStart, T.flowStart + 0.09);
    S.shardG.style.opacity = Math.sin(clamp01(throwing) * Math.PI).toFixed(3);
    if (throwing > 0 && throwing < 1) {
      for (var sh = 0; sh < S.shards.length; sh++) {
        var f = S.shards[sh];
        var q = easeOut(clamp01((throwing - f.lead) / (1 - f.lead)));
        var rr = 1 + f.reach * q;
        S.shards[sh].el.setAttribute("transform",
          "translate(" + r1(N.ballX + Math.cos(f.ang) * N.ballRX * rr) + " " +
                         r1(N.ballY + Math.sin(f.ang) * N.ballRY * rr) + ") " +
          "rotate(" + r1(f.ang * 180 / Math.PI + f.spin * q) + ")");
      }
    }

    /* ---- warp: the loom is strung before the weft crosses it ---------- */
    var warpIn = smooth(span(p, T.warpIn, T.warpFull));
    /* The warp is structure, not subject — held well back so it reads as the
       loom the mark is being made on rather than as pattern over the top. */
    S.warpG.style.opacity = (warpIn * (1 - gone) * recede * 0.5).toFixed(3);
    /* Once every warp has reached the bottom the geometry stops changing, so
       the paths are only rebuilt while they are actually being let down. */
    if (warpIn > 0 && gone < 1 && !(warpIn === 1 && S.warpDone)) {
      S.warpDone = warpIn === 1;
      for (var k = 0; k < S.warps.length; k++) {
        var fx = (k + 0.5) / S.warps.length;
        var x0 = M.x + fx * M.w;
        var drop = easeOut(clamp01(warpIn * 1.7 - fx * 0.6));
        var top = M.y - M.h * 0.06;
        var bottom = top + (M.h * 1.12) * drop;
        var swayAmp = M.w * 0.008 * (1 - drop);
        var wpts = [];
        for (var v = 0; v <= 6; v++) {
          var tv = v / 6;
          wpts.push([x0 + Math.sin(tv * 4 + k) * swayAmp, lerp(top, bottom, tv)]);
        }
        S.warps[k].setAttribute("d", smoothPath(wpts));
      }
    }

    /* ---- the mark draws itself in thread ------------------------------
       Each outline is laid on with stroke-dashoffset, figures first and
       letters after, as though a thread were being run along them. Then the
       lines fade back out as the solid artwork rises behind. */
    var draw = span(p, T.lineIn, T.lineFull);
    var lineAlpha = smooth(span(p, T.lineIn - 0.03, T.lineIn + 0.02)) *
                    (1 - smooth(span(p, T.lineOut, T.lineGone)));
    S.linesG.style.opacity = lineAlpha.toFixed(3);
    if (lineAlpha > 0.004 && draw < 1) {
      for (var ln = 0; ln < S.lines.length; ln++) {
        var la = S.lines[ln];
        var q = easeOut(clamp01((draw - la.lead) / (1 - la.lead)));
        la.el.setAttribute("stroke-dashoffset", r1(la.len * (1 - q)));
      }
    } else if (draw >= 1 && !S.linesDrawn) {
      S.linesDrawn = true;
      for (var ln2 = 0; ln2 < S.lines.length; ln2++) {
        S.lines[ln2].el.setAttribute("stroke-dashoffset", 0);
      }
    }
    if (draw < 1) S.linesDrawn = false;

    /* ---- the mark fills in behind the drawing, band by band ----------- */
    var full = S.bandFull;
    for (var b = 0; b < S.bands.length; b++) {
      var wpx = r1(full * bandOpen(S.strands[b].lane, p));
      if (wpx !== S.bandW[b]) {
        S.bandW[b] = wpx;
        S.bands[b].setAttribute("width", wpx);
      }
    }

    /* ---- the figures ------------------------------------------------- */
    dance(span(p, T.danceStart, T.danceEnd));

    /* ---- the words --------------------------------------------------- */
    var tin = smooth(span(p, T.textIn, T.textFull));
    for (var r = 0; r < reveals.length; r++) {
      reveals[r].style.opacity = tin.toFixed(3);
      reveals[r].style.transform = "translateY(" + ((1 - tin) * 14).toFixed(2) + "px)";
    }
  }

  /* =====================================================================
     Wiring
     ===================================================================== */

  var stage = document.querySelector("[data-hero-stage]");
  reveals = Array.prototype.slice.call(document.querySelectorAll("[data-hero-reveal]"));

  /* The sticky header sits over the stage; the scene is inset by however tall
     it actually is rather than by a guessed constant. */
  function syncHeader() {
    var h = document.querySelector(".site-header");
    document.documentElement.style.setProperty(
      "--header-h", (h ? Math.round(h.getBoundingClientRect().height) : 0) + "px");
  }
  syncHeader();
  window.addEventListener("resize", syncHeader);

  document.documentElement.classList.add("hero-animating");

  var state = { p: 0 };

  try {
    gsap.matchMedia()
      .add({
        wide: "(min-width: 1000px)",
        mid: "(min-width: 641px) and (max-width: 999.98px)",
        narrow: "(max-width: 640.98px)"
      }, function (ctx) {
        var c = ctx.conditions;
        var name = c.wide ? "wide" : c.mid ? "mid" : "narrow";
        build(name);
        state.p = 0;
        render(0);

        /* Because the viewBox is fitted to the panel, reshaping the window
           inside one breakpoint still needs a rebuild — matchMedia would not
           fire. Only when the shape has really moved, and only after it has
           stopped moving. */
        var aspect = scene.view.w / scene.view.h;
        var resizeTimer = null;
        function onResize() {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            syncHeader();
            var now = (host.clientWidth || 1) / (host.clientHeight || 1);
            if (Math.abs(now - aspect) / aspect < 0.06) return;
            aspect = now;
            build(name);
            render(state.p);
            ScrollTrigger.refresh();
          }, 220);
        }
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);

        /* Scroll budget. Long enough that no phase feels rushed — the still
           beat before the dance needs real distance to register as a pause —
           and shorter on a phone, where the same journey costs far more thumb. */
        var screens = c.narrow ? 4.8 : c.mid ? 5.4 : 6.0;

        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: function () { return "+=" + Math.round(window.innerHeight * screens); },
            pin: true,
            pinSpacing: true,
            /* scrub is what makes it feel filmed rather than stepped: the
               scene chases the scrollbar and glides to rest behind it. */
            scrub: c.narrow ? 0.7 : 1.05,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });
        tl.to(state, {
          p: 1, ease: "none", duration: 1,
          onUpdate: function () { render(state.p); }
        });

        return function () {          // matchMedia cleanup on breakpoint change
          clearTimeout(resizeTimer);
          window.removeEventListener("resize", onResize);
          window.removeEventListener("orientationchange", onResize);
          tl.scrollTrigger && tl.scrollTrigger.kill();
          tl.kill();
          scene = null;
        };
      });
  } catch (err) {
    if (window.console) console.error("[kaafila] hero scene failed:", err);
    showStill();
  }
})();
