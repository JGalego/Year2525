(function () {
  "use strict";

  /* ==========================================================================
     Procedural SVG dioramas — one per era of the forward timeline.

     Art direction: neon-noir museum dioramas. The previous banners were
     sparse diagrams; these are built as *scenes*. Every era shares one
     rendering vocabulary so the ten of them read as a single body of work:

       - atmospheric depth: distant geometry is desaturated, low-contrast and
         thin-stroked, near geometry is crisp, bright and heavy;
       - one dominant light source per scene, with bloom and a volumetric
         shaft through particulate air;
       - a reflective floor plane (wet stone, polished obsidian, standing
         water) that mirrors the hero object with a fade;
       - human-scale silhouettes, so the monumental things read as monumental;
       - a film-grain + scanline + vignette pass over everything.

     Scenes are appended strictly back-to-front so occlusion reads correctly.

     Everything is deterministic. Each era seeds its own PRNG from its key, so
     the scatter of windows, rain, embers and crowds is identical on every
     load — and identical between an era section and its Presenter Mode clone.
     ========================================================================== */

  var SVG_NS = "http://www.w3.org/2000/svg";
  var W = 600, H = 240;
  var sceneCount = 0;

  // Silhouettes read as "unlit foreground mass" against every era palette,
  // light or dark, so they use a fixed near-black rather than a theme var.
  var SHADOW = "#05070c";

  /* ------------------------------- primitives ------------------------------ */

  function make(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key) && attrs[key] != null) {
          node.setAttribute(key, attrs[key]);
        }
      }
    }
    return node;
  }
  function group(attrs) { return make("g", attrs); }
  function path(d, attrs) { var a = attrs || {}; a.d = d; return make("path", a); }
  function line(x1, y1, x2, y2, attrs) {
    var a = attrs || {}; a.x1 = x1; a.y1 = y1; a.x2 = x2; a.y2 = y2; return make("line", a);
  }
  function rect(x, y, w, h, attrs) {
    var a = attrs || {}; a.x = x; a.y = y; a.width = w; a.height = h; return make("rect", a);
  }
  function circle(cx, cy, r, attrs) {
    var a = attrs || {}; a.cx = cx; a.cy = cy; a.r = r; return make("circle", a);
  }
  function ellipse(cx, cy, rx, ry, attrs) {
    var a = attrs || {}; a.cx = cx; a.cy = cy; a.rx = rx; a.ry = ry; return make("ellipse", a);
  }
  function polygon(points, attrs) { var a = attrs || {}; a.points = points; return make("polygon", a); }
  function polyline(points, attrs) { var a = attrs || {}; a.points = points; return make("polyline", a); }
  function pts(list) { return list.join(" "); }

  // Solid fill, no stroke — the common case for lit/shadow masses.
  function solid(color, opacity) {
    return { fill: color, stroke: "none", opacity: opacity == null ? 1 : opacity };
  }

  /* --------------------------------- random -------------------------------- */

  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --------------------------------- scene --------------------------------- */

  function Scene(key) {
    sceneCount += 1;
    this.n = sceneCount;
    this.rng = mulberry32(hashSeed(key));
    this.svg = make("svg", {
      viewBox: "0 0 " + W + " " + H,
      preserveAspectRatio: "xMidYMid slice",
      "aria-hidden": "true",
      focusable: "false",
      class: "art-scene",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      // Isolate so the scene's screen/overlay blending composites against the
      // diorama's own background and never against the page behind it.
      style: "isolation:isolate"
    });
    this.defs = make("defs");
    this.svg.appendChild(this.defs);
  }
  Scene.prototype.id = function (name) { return "art" + this.n + "-" + name; };
  Scene.prototype.url = function (name) { return "url(#" + this.id(name) + ")"; };
  Scene.prototype.add = function (node) { this.svg.appendChild(node); return node; };
  Scene.prototype.def = function (node) { this.defs.appendChild(node); return node; };
  Scene.prototype.rand = function (min, max) { return min + this.rng() * (max - min); };
  Scene.prototype.int = function (min, max) { return Math.floor(this.rand(min, max + 0.999)); };
  Scene.prototype.chance = function (p) { return this.rng() < p; };

  // stops: [offset0to1, color, opacity]
  function appendStops(node, stops) {
    stops.forEach(function (s) {
      node.appendChild(make("stop", {
        offset: (s[0] * 100) + "%",
        style: "stop-color:" + s[1] + ";stop-opacity:" + s[2]
      }));
    });
  }
  Scene.prototype.linear = function (name, x1, y1, x2, y2, stops, userSpace) {
    var g = make("linearGradient", {
      id: this.id(name), x1: x1, y1: y1, x2: x2, y2: y2,
      gradientUnits: userSpace ? "userSpaceOnUse" : "objectBoundingBox"
    });
    appendStops(g, stops);
    return this.def(g), this.url(name);
  };
  Scene.prototype.radial = function (name, cx, cy, r, stops, userSpace) {
    var g = make("radialGradient", {
      id: this.id(name), cx: cx, cy: cy, r: r,
      gradientUnits: userSpace ? "userSpaceOnUse" : "objectBoundingBox"
    });
    appendStops(g, stops);
    return this.def(g), this.url(name);
  };

  // Plain gaussian blur — for out-of-focus depth planes and soft masses.
  Scene.prototype.blur = function (name, std) {
    var f = make("filter", { id: this.id(name), x: "-35%", y: "-35%", width: "170%", height: "170%" });
    f.appendChild(make("feGaussianBlur", { stdDeviation: std }));
    return this.def(f), this.url(name);
  };
  // Blur merged back over the source: light that bleeds without losing its core.
  Scene.prototype.bloom = function (name, std) {
    var f = make("filter", { id: this.id(name), x: "-60%", y: "-60%", width: "220%", height: "220%" });
    f.appendChild(make("feGaussianBlur", { stdDeviation: std, result: "b" }));
    var merge = make("feMerge");
    merge.appendChild(make("feMergeNode", { in: "b" }));
    merge.appendChild(make("feMergeNode", { in: "b" }));
    merge.appendChild(make("feMergeNode", { in: "SourceGraphic" }));
    f.appendChild(merge);
    return this.def(f), this.url(name);
  };
  // Chromatic aberration: the channel-split look, used only where something
  // in the scene is failing — dissent, quarantine, decay.
  Scene.prototype.rgbSplit = function (name, dx) {
    var f = make("filter", { id: this.id(name), x: "-30%", y: "-30%", width: "160%", height: "160%" });
    f.appendChild(make("feOffset", { in: "SourceGraphic", dx: -dx, dy: 0, result: "l" }));
    f.appendChild(make("feColorMatrix", {
      in: "l", type: "matrix", result: "lr",
      values: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
    }));
    f.appendChild(make("feOffset", { in: "SourceGraphic", dx: dx, dy: 0, result: "r" }));
    f.appendChild(make("feColorMatrix", {
      in: "r", type: "matrix", result: "rb",
      values: "0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
    }));
    var m = make("feMerge");
    m.appendChild(make("feMergeNode", { in: "lr" }));
    m.appendChild(make("feMergeNode", { in: "rb" }));
    f.appendChild(m);
    return this.def(f), this.url(name);
  };

  /* ------------------------------- atmosphere ------------------------------ */

  // Base gradient plus the two things that sell depth on a flat backdrop:
  // a light-source bloom and a horizon haze the far geometry sinks into.
  function sky(sc, stops) {
    sc.add(rect(0, 0, W, H, { fill: sc.linear("sky", "0%", "0%", "0%", "100%", stops), stroke: "none" }));
  }
  function keyLight(sc, name, cx, cy, r, color, strength) {
    var fill = sc.radial(name, cx / W, cy / H, r / W, [
      [0, color, strength],
      [0.45, color, strength * 0.42],
      [1, color, 0]
    ]);
    sc.add(rect(0, 0, W, H, { fill: fill, stroke: "none", style: "mix-blend-mode:screen" }));
  }
  function haze(sc, name, y, h, color, opacity) {
    var fill = sc.linear(name, 0, y, 0, y + h, [
      [0, color, 0], [0.55, color, opacity], [1, color, 0]
    ], true);
    sc.add(rect(0, y, W, h, { fill: fill, stroke: "none", style: "mix-blend-mode:screen" }));
  }
  // A cone of light made visible by the dust it passes through.
  function shaft(sc, name, apex, left, right, color, opacity, blurStd) {
    var fill = sc.linear(name, apex[0], apex[1], (left[0] + right[0]) / 2, left[1], [
      [0, color, opacity], [0.6, color, opacity * 0.35], [1, color, 0]
    ], true);
    sc.add(polygon(pts([apex[0] + "," + apex[1], left[0] + "," + left[1], right[0] + "," + right[1]]), {
      fill: fill, stroke: "none",
      filter: sc.blur(name + "-b", blurStd || 3),
      style: "mix-blend-mode:screen"
    }));
  }
  // Airborne particulate: the difference between "vector art" and "a room".
  function motes(sc, count, x0, y0, x1, y1, color, maxR) {
    var g = group({ filter: sc.blur("mote-b", 0.7) });
    for (var i = 0; i < count; i++) {
      g.appendChild(circle(sc.rand(x0, x1), sc.rand(y0, y1), sc.rand(0.5, maxR || 1.6),
        solid(color, sc.rand(0.12, 0.7))));
    }
    g.setAttribute("style", "mix-blend-mode:screen");
    sc.add(g);
  }
  function rain(sc, count, lean, y0, y1, color, opacity, width) {
    var g = group({ stroke: color, "stroke-width": width || 0.7, "stroke-linecap": "butt" });
    for (var i = 0; i < count; i++) {
      var x = sc.rand(-60, W + 60);
      var y = sc.rand(y0, y1);
      var len = sc.rand(10, 30);
      g.appendChild(line(x, y, x + lean * len, y + len, { opacity: sc.rand(0.15, 1) * opacity }));
    }
    sc.add(g);
  }

  // Mirror a built group into the floor. Cheap, and far more convincing than
  // any amount of extra linework: it establishes the ground as a surface.
  function reflect(sc, name, node, floorY, depth, opacity, blurStd) {
    var maskId = sc.id(name + "-m");
    var fade = sc.linear(name + "-f", 0, floorY, 0, floorY + depth, [
      [0, "#ffffff", 0.85], [0.45, "#ffffff", 0.28], [1, "#ffffff", 0]
    ], true);
    var mask = make("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: 0, y: floorY, width: W, height: depth });
    mask.appendChild(rect(0, floorY, W, depth, { fill: fade, stroke: "none" }));
    sc.def(mask);

    var mirror = group({
      transform: "translate(0 " + (2 * floorY) + ") scale(1 -1)",
      opacity: opacity,
      filter: sc.blur(name + "-b", blurStd == null ? 1.4 : blurStd)
    });
    mirror.appendChild(node.cloneNode(true));
    var wrap = group({ mask: "url(#" + maskId + ")" });
    wrap.appendChild(mirror);
    return sc.add(wrap);
  }

  /* --------------------------------- grade --------------------------------- */

  // The finishing pass every scene ends with: scanlines, grain, vignette.
  // Applied last so it sits over the whole diorama like a coating of glass.
  function scanlines(sc, opacity, spacing) {
    var step = spacing || 3;
    var pat = make("pattern", {
      id: sc.id("scan"), width: 6, height: step, patternUnits: "userSpaceOnUse"
    });
    pat.appendChild(rect(0, 0, 6, 1, solid("#000000", 1)));
    sc.def(pat);
    sc.add(rect(-20, -20, W + 40, H + 60, {
      fill: sc.url("scan"), stroke: "none", opacity: opacity, class: "art-scan"
    }));
  }
  function grain(sc, opacity, freq) {
    var f = make("filter", { id: sc.id("grain"), x: "0%", y: "0%", width: "100%", height: "100%" });
    f.appendChild(make("feTurbulence", {
      type: "fractalNoise", baseFrequency: freq || 0.9, numOctaves: 3, stitchTiles: "stitch"
    }));
    f.appendChild(make("feColorMatrix", { type: "saturate", values: "0" }));
    sc.def(f);
    sc.add(rect(0, 0, W, H, {
      fill: "#808080", stroke: "none", filter: sc.url("grain"),
      opacity: opacity, style: "mix-blend-mode:overlay"
    }));
  }
  function vignette(sc, strength) {
    var fill = sc.radial("vig", "50%", "48%", "72%", [
      [0, "#000000", 0], [0.55, "#000000", strength * 0.15], [1, "#000000", strength]
    ]);
    sc.add(rect(0, 0, W, H, { fill: fill, stroke: "none" }));
  }
  function grade(sc, opts) {
    var o = opts || {};
    scanlines(sc, o.scan == null ? 0.05 : o.scan, o.scanStep);
    grain(sc, o.grain == null ? 0.13 : o.grain, o.grainFreq);
    vignette(sc, o.vignette == null ? 0.5 : o.vignette);
  }

  /* -------------------------------- figures -------------------------------- */

  // A person, three strokes wide. Present in nearly every scene: without one
  // there is no way to tell whether the hero object is a desk toy or a tower.
  function figure(x, baseY, h, attrs) {
    var a = attrs || {};
    var g = group({ fill: a.fill || SHADOW, stroke: "none", opacity: a.opacity == null ? 0.9 : a.opacity });
    var w = h * 0.30;
    var shoulder = baseY - h * 0.72;
    var headR = h * 0.115;
    g.appendChild(path(
      "M" + (x - w / 2) + " " + baseY +
      " L" + (x - w * 0.44) + " " + shoulder +
      " Q" + x + " " + (shoulder - h * 0.09) + " " + (x + w * 0.44) + " " + shoulder +
      " L" + (x + w / 2) + " " + baseY + " Z"
    ));
    g.appendChild(circle(x, shoulder - headR * 1.35, headR));
    return g;
  }
  function crowd(sc, y, x0, x1, count, h, opacity) {
    var g = group(null);
    for (var i = 0; i < count; i++) {
      var x = sc.rand(x0, x1);
      var hh = h * sc.rand(0.85, 1.15);
      g.appendChild(figure(x, y + sc.rand(-1.5, 1.5), hh, { opacity: opacity * sc.rand(0.7, 1) }));
    }
    return g;
  }

  /* -------------------------------- fixtures ------------------------------- */

  // Windows: the single cheapest signal that a silhouette is inhabited.
  function litWindows(sc, g, x, y, w, h, cols, rows, color, density) {
    var cw = w / cols, rh = h / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (!sc.chance(density)) continue;
        g.appendChild(rect(x + c * cw + cw * 0.22, y + r * rh + rh * 0.22, cw * 0.52, rh * 0.46,
          solid(color, sc.rand(0.18, 0.9))));
      }
    }
  }
  // Catenary between two points — cabling, mooring lines, hung banners.
  function cable(x1, y1, x2, y2, sag, attrs) {
    return path("M" + x1 + " " + y1 + " Q" + ((x1 + x2) / 2) + " " + ((y1 + y2) / 2 + sag) + " " + x2 + " " + y2, attrs);
  }
  // Abstract glyph run: ticks of varying width, reading as dense inscription
  // without ever being legible text.
  function glyphRun(sc, x, y, w, h, color, opacity, gap) {
    var g = group(null);
    var cx = x;
    while (cx < x + w) {
      var tw = sc.rand(1.2, 4.6);
      if (cx + tw > x + w) break;
      g.appendChild(rect(cx, y, tw, h, solid(color, opacity * sc.rand(0.4, 1))));
      cx += tw + (gap || 2.2);
    }
    return g;
  }

  /* ================================= SCENES ================================= */

  var GENERATORS = {

    /* ----------------------------------------------------------------------
       INTRO — "The Long Gallery."
       The museum this whole page is a catalogue for, seen down its length.
       Six vitrines recede toward a vanishing point, each holding the hero
       object of one era: an application, a statute, an organism, a folded
       solid, a weather system, and finally a thing with no edges left. The
       dissolution is literally perspective — each station is smaller,
       paler, softer and less object-like than the one in front of it,
       until the far end is only light. A visitor at the near end fixes the
       scale, and the polished floor doubles everything.

       This shares the grammar of the other nine scenes but runs high-key,
       like PRESENT: the intro sits inside the light present-day era and
       has no frame of its own, so depth is carried by a darkened ceiling
       and a tinted floor rather than by neon against black.
       ---------------------------------------------------------------------- */
    intro: function () {
      var sc = new Scene("intro");
      // .future-intro-art is 3:1 while the artboard is 5:2, and the scene
      // is sliced to cover — so roughly y<22 and y>218 are cropped away on
      // screen. Everything load-bearing is composed inside that band.
      var VP = { x: 556, y: 104 };
      var NEAR_X = 52, NEAR_BASE = 188;

      // Almost transparent: this banner sits directly on the page rather
      // than in a framed box, so it has to blend at its edges.
      sky(sc, [[0, "var(--bg)", 0], [0.46, "var(--bg2)", 0.5], [1, "var(--bg)", 0]]);

      // A darkened ceiling plane. On a light era there is no black to
      // silhouette against, so this is what lets the lamps and the far
      // bloom read as light at all.
      sc.add(rect(0, -20, W, VP.y + 20, {
        fill: sc.linear("ceil", 0, -20, 0, VP.y, [
          [0, "#0d1018", 0.15], [0.72, "#0d1018", 0.05], [1, "#0d1018", 0]
        ], true), stroke: "none"
      }));
      // Polished floor, darkest at the front and washing out toward the
      // vanishing point — atmospheric perspective doing most of the work.
      sc.add(rect(0, VP.y, W, H - VP.y, {
        fill: sc.linear("floor", 0, VP.y, 0, H, [
          [0, "#0d1018", 0.02], [0.5, "#0d1018", 0.10], [1, "#0d1018", 0.17]
        ], true), stroke: "none"
      }));
      keyLight(sc, "key", VP.x, VP.y, 250, "var(--accent)", 0.20);

      // Converging floor lines. Transverse spacing is squared so the
      // courses bunch toward the horizon instead of marching evenly.
      var grid = group({ opacity: 0.12, "stroke-width": 0.7, stroke: "var(--fg)" });
      for (var gx = -700; gx <= 1400; gx += 110) {
        grid.appendChild(line(gx, H + 12, VP.x + (gx - VP.x) * 0.05, VP.y + 3, null));
      }
      // From gr=1: the gr=0 course lies exactly on the horizon and drew a
      // hard rule straight through the tops of the nearer cases.
      for (var gr = 1; gr < 6; gr++) {
        var gy = VP.y + Math.pow(gr / 5, 2.3) * (H + 12 - VP.y);
        grid.appendChild(line(0, gy, W, gy, { opacity: 0.9 - gr * 0.1 }));
      }
      // Fade the whole grid out before it reaches the vanishing point —
      // full-width courses read as graph paper exactly where the floor is
      // supposed to be dissolving into light.
      var gridMask = make("mask", { id: sc.id("gridm"), maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
      gridMask.appendChild(rect(0, 0, W, H, {
        fill: sc.linear("gridf", 0, 0, W, 0, [
          [0, "#ffffff", 1], [0.5, "#ffffff", 0.8], [0.86, "#ffffff", 0]
        ], true), stroke: "none"
      }));
      sc.def(gridMask);
      grid.setAttribute("mask", "url(#" + sc.id("gridm") + ")");
      sc.add(grid);

      // Where the left wall meets the floor. This is the same locus the
      // vitrine bases sit on, so it reads as the line they are ranged
      // along rather than as an extra mark.
      sc.add(line(0, VP.y + (NEAR_BASE - VP.y) * (VP.x / (VP.x - NEAR_X)), VP.x, VP.y, {
        stroke: "var(--fg)", "stroke-width": 0.9, opacity: 0.2
      }));

      // A receding run of ceiling lamps: the reason there is light here.
      var lamps = group({ filter: sc.bloom("lamp", 1.8) });
      for (var li = 0; li < 7; li++) {
        var lt = li / 6;
        var ls = 1 / (1 + lt * 4.4);
        var lx = VP.x - (VP.x - 150) * ls;
        var ly = VP.y - (VP.y - 38) * ls;
        lamps.appendChild(rect(lx - 26 * ls, ly - 3 * ls, 52 * ls, 6 * ls, {
          rx: 3 * ls, fill: "#ffffff", stroke: "none", opacity: 0.3 + 0.38 * (1 - lt)
        }));
      }
      sc.add(lamps);

      /* -- the six stations ------------------------------------------------
         One vitrine per successor state. Scale, baseline height, ink and
         blur all derive from the same perspective factor, so a station's
         distance is the only thing that decides how dissolved it looks. */
      // The last two hold nothing: the gallery keeps going past the point
      // where this page can name what is in the cases.
      var KINDS = ["app", "law", "grow", "fold", "weather", "hum", "gone", "gone"];
      var XS = [52, 158, 248, 322, 383, 432, 470, 498];
      var built = [];

      KINDS.forEach(function (kind, i) {
        var x = XS[i];
        var s = (VP.x - x) / (VP.x - NEAR_X);            // 1 near → 0.11 far
        var base = VP.y + (NEAR_BASE - VP.y) * s;
        // Dissolution is deliberately gentler than the scale falloff. A
        // power curve took the far stations to unreadable smudge, which
        // loses the point — you have to be able to see what is being lost,
        // so distance takes detail and sharpness before it takes presence.
        var ink = 0.35 + 0.65 * s;
        var g = group({ opacity: ink });
        if (s < 0.95) g.setAttribute("filter", sc.blur("st" + i, (1 - s) * 1.6));

        var pw = 58 * s, ph = 30 * s, px0 = x - pw / 2;
        var top = base - ph;                              // the plinth's top face
        g.appendChild(ellipse(x, base + 1.5 * s, pw * 0.7, 4.5 * s, {
          fill: "#0d1018", stroke: "none", opacity: 0.3, filter: sc.blur("cs" + i, 1.8 * s + 0.4)
        }));
        g.appendChild(rect(px0, top, pw, ph, solid("#131926", 0.86)));
        g.appendChild(rect(px0 + pw * 0.74, top, pw * 0.26, ph, solid("#39445a", 0.5)));
        g.appendChild(rect(px0 - 3 * s, top - 4 * s, pw + 6 * s, 4.5 * s, solid("#080c16", 0.9)));

        // Every era's hero object is authored in the same local box — 46
        // tall, ±26 wide, sitting on y=0 — then placed by the plinth's top
        // face and scaled by distance. Nothing floats.
        var o = group({ transform: "translate(" + x + " " + (top - 4 * s) + ") scale(" + s + ")" });
        if (kind === "app") {
          o.appendChild(rect(-26, -48, 52, 44, { rx: 4, fill: "var(--bg2)", "fill-opacity": 0.92, stroke: "var(--fg)", "stroke-width": 1.6, opacity: 0.9 }));
          o.appendChild(line(-26, -37, 26, -37, { stroke: "var(--fg)", opacity: 0.5 }));
          [-21, -16, -11].forEach(function (cx) { o.appendChild(circle(cx, -42.5, 1.4, solid("var(--accent)", 0.85))); });
          o.appendChild(rect(-21, -33, 17, 17, { rx: 2, stroke: "var(--accent)", opacity: 0.55 }));
          o.appendChild(line(-1, -30, 21, -30, { stroke: "var(--fg)", opacity: 0.45 }));
          o.appendChild(line(-1, -24, 16, -24, { stroke: "var(--fg)", opacity: 0.3 }));
          o.appendChild(line(-1, -18, 19, -18, { stroke: "var(--fg)", opacity: 0.2 }));
        } else if (kind === "law") {
          o.appendChild(polygon("0,-48 22,-37 25,-15 0,-3 -25,-15 -22,-37", {
            fill: "var(--accent2)", "fill-opacity": 0.1, stroke: "var(--accent2)", "stroke-width": 1.6, opacity: 0.9
          }));
          for (var l = 0; l < 3; l++) {
            o.appendChild(line(-12, -36 + l * 7, 12 - (l % 2) * 6, -36 + l * 7, { stroke: "var(--accent2)", opacity: 0.5 }));
          }
        } else if (kind === "grow") {
          o.appendChild(path("M0 -3 C-2 -18 3 -30 0 -46 M0 -24 C-11 -29 -15 -35 -17 -41 M1 -32 C12 -37 16 -43 17 -47", {
            stroke: "var(--accent)", "stroke-width": 2, opacity: 0.85
          }));
          [[-17, -42, -16], [17, -48, 14], [0, -47, 0], [-11, -30, -10], [11, -36, 12]].forEach(function (lf) {
            o.appendChild(ellipse(lf[0], lf[1], 6.5, 3, {
              transform: "rotate(" + lf[2] + " " + lf[0] + " " + lf[1] + ")",
              fill: "var(--accent)", "fill-opacity": 0.18, stroke: "var(--accent)", opacity: 0.62
            }));
          });
        } else if (kind === "fold") {
          o.appendChild(polygon("-23,-21 -5,-46 21,-40 24,-15 2,-4", {
            fill: "var(--accent2)", "fill-opacity": 0.09, stroke: "var(--accent2)", "stroke-width": 1.5, opacity: 0.82
          }));
          o.appendChild(polyline("-23,-21 0,-26 -5,-46 21,-40 0,-26 24,-15 2,-4 0,-26", {
            stroke: "var(--accent2)", opacity: 0.5
          }));
        } else if (kind === "weather") {
          // Open linework this far down the row has far less presence
          // than the filled near shapes, so it is drawn heavier to land
          // at the same apparent weight once distance has thinned it.
          for (var a = 0; a < 4; a++) {
            var ay = -40 + a * 8;
            o.appendChild(path("M-22 " + ay + " C-9 " + (ay - 8) + " 8 " + (ay + 8) + " 22 " + ay, {
              stroke: "var(--accent)", "stroke-width": 2.4, opacity: 0.92 - a * 0.1
            }));
          }
        } else if (kind === "hum") {
          // Nothing with an edge left — the era the page cannot name.
          o.setAttribute("filter", sc.bloom("hum", 2.6));
          for (var r = 1; r <= 4; r++) {
            o.appendChild(circle(0, -26, r * 6.5, { stroke: "var(--accent)", "stroke-width": 2, opacity: 0.62 / r }));
          }
          o.appendChild(circle(0, -26, 3, solid("var(--accent)", 0.95)));
        }
        g.appendChild(o);

        // The case, over the object. This is what makes it a museum and
        // not a shelf — and losing it further down the row is the point.
        var gh = 52 * s, gw = pw + 7 * s, gx0 = x - gw / 2;
        g.appendChild(rect(gx0, top - gh, gw, gh, {
          fill: "var(--bg2)", "fill-opacity": 0.14, stroke: "var(--fg)", "stroke-width": 0.8, opacity: 0.3
        }));
        g.appendChild(polygon(pts([
          (gx0 + gw * 0.12) + "," + (top - gh), (gx0 + gw * 0.32) + "," + (top - gh),
          (gx0 + gw * 0.14) + "," + top, gx0 + "," + top
        ]), { fill: "#ffffff", stroke: "none", opacity: 0.2 }));

        built.push({ g: g, base: base, s: s });
      });

      // Reflections first so they sit under every station, each mirrored
      // about its own baseline rather than one shared floor line.
      built.forEach(function (b, i) {
        reflect(sc, "r" + i, b.g, b.base, 46 * b.s + 10, 0.16 * b.s + 0.05, 1.1);
      });
      // Then the stations themselves, far to near, so nearer ones occlude.
      for (var k = built.length - 1; k >= 0; k--) sc.add(built[k].g);

      // The far end, erased. Everything within reach of the vanishing
      // point loses its edges to the light it is receding into.
      sc.add(rect(0, 0, W, H, {
        fill: sc.radial("vpwash", VP.x / W, VP.y / H, 0.22, [
          [0, "#ffffff", 0.78], [0.42, "#ffffff", 0.42], [0.78, "var(--bg2)", 0.14], [1, "#ffffff", 0]
        ]), stroke: "none"
      }));

      // Two visitors, for scale. Without them the vitrines could be any
      // size at all, and the gallery stops being a room.
      var near = figure(100, 198, 60, { opacity: 0.92 });
      sc.add(ellipse(100, 199, 13, 3.4, { fill: "#0d1018", stroke: "none", opacity: 0.28, filter: sc.blur("f1s", 2) }));
      reflect(sc, "fr1", near, 198, 44, 0.16, 1.2);
      sc.add(near);
      var far = figure(286, 160, 26, { opacity: 0.5 });
      sc.add(ellipse(286, 160.6, 6, 1.7, { fill: "#0d1018", stroke: "none", opacity: 0.22, filter: sc.blur("f2s", 1.2) }));
      sc.add(far);

      // Dust, kept to the darkened upper half where white specks read.
      var dust = group({ filter: sc.blur("dust-b", 0.6) });
      for (var d = 0; d < 44; d++) {
        dust.appendChild(circle(sc.rand(30, 585), sc.rand(24, 150), sc.rand(0.4, 1.3),
          solid("#ffffff", sc.rand(0.15, 0.6))));
      }
      sc.add(dust);

      grade(sc, { scan: 0.022, grain: 0.085, vignette: 0.3 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       PRESENT — "Applications."
       A daylight-lit wall of software receding to a vanishing point, seen
       across a glossy desk. Every panel is exhaling telemetry into the
       surface below it. The one era whose palette is light, so the noir
       grammar runs high-key: haze instead of dark, glass instead of neon.
       ---------------------------------------------------------------------- */
    present: function () {
      var sc = new Scene("present");
      var floorY = 182;
      var vp = { x: 300, y: 96 };

      sky(sc, [
        [0, "var(--bg2)", 1], [0.62, "var(--bg)", 1], [1, "var(--bg2)", 1]
      ]);
      keyLight(sc, "key", 300, 84, 300, "var(--accent)", 0.20);

      // Far plane: the same interface repeated to the horizon, out of focus.
      var far = group({ filter: sc.blur("far-b", 1.9), opacity: 0.5 });
      for (var i = 0; i < 9; i++) {
        var t = i / 8;
        var fx = 60 + t * 480;
        var fw = 44 + Math.abs(t - 0.5) * 40;
        var fh = fw * 0.72;
        var fy = vp.y - fh * 0.5 + Math.abs(t - 0.5) * 26;
        far.appendChild(rect(fx - fw / 2, fy, fw, fh, {
          rx: 5, fill: "var(--fg)", stroke: "none", opacity: 0.05
        }));
        far.appendChild(rect(fx - fw / 2, fy, fw, fh, { rx: 5, opacity: 0.22, "stroke-width": 0.8 }));
        far.appendChild(line(fx - fw / 2 + 4, fy + 7, fx + fw / 2 - 4, fy + 7, { opacity: 0.18, "stroke-width": 0.8 }));
      }
      sc.add(far);
      haze(sc, "hz", 60, 90, "var(--accent)", 0.14);

      // Perspective desk: a grid that converges, so the plane reads as flat
      // and receding rather than as a band of colour.
      var deskFill = sc.linear("desk", 0, floorY, 0, H, [
        [0, "#0d1018", 0.46], [0.4, "#0d1018", 0.26], [1, "#0d1018", 0.12]
      ], true);
      sc.add(rect(0, floorY, W, H - floorY, { fill: deskFill, stroke: "none" }));
      var gridG = group({ opacity: 0.3, "stroke-width": 0.7 });
      for (var gx = -600; gx <= 1200; gx += 60) {
        gridG.appendChild(line(vp.x + (gx - vp.x) * 0.16, floorY, gx, H, null));
      }
      for (var gy = 0; gy < 5; gy++) {
        var yy = floorY + Math.pow(gy / 4, 2.1) * (H - floorY);
        gridG.appendChild(line(0, yy, W, yy, { opacity: 0.7 - gy * 0.1 }));
      }
      sc.add(gridG);

      // Mid/near plane: four application windows, each a different genre of
      // interface, overlapping so the stack has real depth order.
      var panels = [
        { x: 22, y: 62, w: 150, h: 116, rot: -6, kind: "list", depth: 0.62 },
        { x: 356, y: 52, w: 168, h: 122, rot: 5, kind: "media", depth: 0.68 },
        { x: 150, y: 30, w: 196, h: 150, rot: -1.5, kind: "chart", depth: 1 },
        { x: 300, y: 108, w: 176, h: 84, rot: 3, kind: "consent", depth: 0.92 }
      ];

      var stack = group(null);
      panels.forEach(function (p) {
        var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
        var g = group({ transform: "rotate(" + p.rot + " " + cx + " " + cy + ")" });
        // Depth of field: anything not on the focal plane is softened, which
        // is what stops four overlapping panels reading as one flat pile.
        if (p.depth < 0.9) g.setAttribute("filter", sc.blur("pb" + p.kind, (1 - p.depth) * 4.5));

        // Cast shadow, then a near-opaque body. The panels used to be glass
        // all the way through and the stack lost its depth order entirely.
        g.appendChild(rect(p.x + 4, p.y + 10, p.w, p.h, {
          rx: 12, fill: "#0a1226", stroke: "none", opacity: 0.34, filter: sc.blur("ps" + p.kind, 5)
        }));
        g.appendChild(rect(p.x, p.y, p.w, p.h, {
          rx: 12, fill: sc.linear("pane" + p.kind, "0%", "0%", "35%", "100%", [
            [0, "#ffffff", 0.5 + p.depth * 0.48], [1, "#e9edf6", 0.42 + p.depth * 0.42]
          ]), stroke: "none"
        }));
        g.appendChild(rect(p.x, p.y, p.w, p.h, { rx: 12, "stroke-width": 0.9, opacity: 0.4 + p.depth * 0.35 }));
        g.appendChild(rect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1, { rx: 11.5, stroke: "#ffffff", opacity: 0.7, "stroke-width": 1 }));

        // chrome: traffic lights, tab, address pill
        g.appendChild(line(p.x, p.y + 17, p.x + p.w, p.y + 17, { opacity: 0.3, "stroke-width": 0.8 }));
        [0, 1, 2].forEach(function (d) {
          g.appendChild(circle(p.x + 10 + d * 7.5, p.y + 8.5, 2.1, solid("currentColor", 0.55 - d * 0.12)));
        });
        g.appendChild(rect(p.x + 34, p.y + 5, p.w * 0.3, 7, { rx: 3.5, fill: "currentColor", stroke: "none", opacity: 0.16 }));

        if (p.kind === "chart") {
          // A metric going up and to the right, with its own forecast cone.
          var chart = [], area = [];
          for (var s = 0; s <= 9; s++) {
            var px = p.x + 22 + s * ((p.w - 44) / 9);
            var py = p.y + p.h - 24 - Math.pow(s / 9, 2.3) * (p.h - 62) - sc.rand(0, 5);
            chart.push(px + "," + py); area.push(px + "," + py);
          }
          area.push((p.x + p.w - 22) + "," + (p.y + p.h - 24), (p.x + 22) + "," + (p.y + p.h - 24));
          g.appendChild(polygon(pts(area), {
            fill: sc.linear("cfill", "0%", "0%", "0%", "100%", [
              [0, "var(--accent)", 0.34], [1, "var(--accent)", 0]
            ]), stroke: "none"
          }));
          g.appendChild(polyline(pts(chart), { "stroke-width": 2, opacity: 1 }));
          g.appendChild(circle(p.x + p.w - 22, p.y + p.h - 24 - (p.h - 62), 3, solid("var(--accent2)", 1)));
          g.appendChild(line(p.x + 22, p.y + p.h - 24, p.x + p.w - 22, p.y + p.h - 24, { opacity: 0.3, "stroke-width": 0.8 }));
          for (var ax = 0; ax < 5; ax++) {
            g.appendChild(line(p.x + 22 + ax * 34, p.y + p.h - 24, p.x + 22 + ax * 34, p.y + p.h - 20, { opacity: 0.3, "stroke-width": 0.8 }));
          }
          g.appendChild(rect(p.x + 22, p.y + 26, 46, 5, { rx: 2.5, fill: "currentColor", stroke: "none", opacity: 0.4 }));
        } else if (p.kind === "list") {
          for (var row = 0; row < 5; row++) {
            var ry = p.y + 28 + row * 17;
            g.appendChild(circle(p.x + 17, ry + 5, 4.6, solid("currentColor", 0.28)));
            g.appendChild(rect(p.x + 28, ry + 1, (p.w - 46) * sc.rand(0.5, 0.95), 4, { rx: 2, fill: "currentColor", stroke: "none", opacity: 0.42 }));
            g.appendChild(rect(p.x + 28, ry + 8, (p.w - 46) * sc.rand(0.25, 0.6), 3, { rx: 1.5, fill: "currentColor", stroke: "none", opacity: 0.2 }));
          }
          g.appendChild(circle(p.x + p.w - 12, p.y + 6, 6, solid("var(--accent2)", 0.95)));
        } else if (p.kind === "media") {
          g.appendChild(rect(p.x + 14, p.y + 26, p.w - 28, p.h - 62, {
            rx: 6, fill: "currentColor", stroke: "none", opacity: 0.14
          }));
          g.appendChild(polygon(pts([
            (p.x + p.w / 2 - 7) + "," + (p.y + p.h / 2 - 13),
            (p.x + p.w / 2 + 10) + "," + (p.y + p.h / 2 - 4),
            (p.x + p.w / 2 - 7) + "," + (p.y + p.h / 2 + 5)
          ]), solid("currentColor", 0.75)));
          g.appendChild(line(p.x + 14, p.y + p.h - 26, p.x + p.w - 14, p.y + p.h - 26, { opacity: 0.28, "stroke-width": 2.4 }));
          g.appendChild(line(p.x + 14, p.y + p.h - 26, p.x + 14 + (p.w - 28) * 0.36, p.y + p.h - 26, { opacity: 0.9, "stroke-width": 2.4 }));
          g.appendChild(circle(p.x + 14 + (p.w - 28) * 0.36, p.y + p.h - 26, 3.4, solid("currentColor", 1)));
          for (var th = 0; th < 4; th++) {
            g.appendChild(rect(p.x + 14 + th * ((p.w - 28) / 4), p.y + p.h - 18, (p.w - 28) / 4 - 4, 8, { rx: 2, fill: "currentColor", stroke: "none", opacity: 0.16 }));
          }
        } else {
          // The consent dialog. Present-day software's true hero object.
          g.appendChild(rect(p.x + 14, p.y + 26, p.w - 28, 4, { rx: 2, fill: "currentColor", stroke: "none", opacity: 0.4 }));
          g.appendChild(rect(p.x + 14, p.y + 35, p.w - 52, 3, { rx: 1.5, fill: "currentColor", stroke: "none", opacity: 0.22 }));
          g.appendChild(rect(p.x + 14, p.y + 42, p.w - 70, 3, { rx: 1.5, fill: "currentColor", stroke: "none", opacity: 0.22 }));
          g.appendChild(rect(p.x + p.w - 74, p.y + 56, 26, 15, { rx: 4, "stroke-width": 0.9, opacity: 0.5 }));
          g.appendChild(rect(p.x + p.w - 44, p.y + 56, 30, 15, { rx: 4, fill: "currentColor", stroke: "none", opacity: 0.9 }));
        }
        stack.appendChild(g);
      });
      sc.add(stack);

      // Telemetry: dotted exhaust falling from every panel into the desk.
      var exhaust = group({ "stroke-width": 0.9, "stroke-dasharray": "1 4", opacity: 0.45 });
      panels.forEach(function (p) {
        for (var e = 0; e < 4; e++) {
          var ex = p.x + 16 + e * ((p.w - 32) / 3);
          exhaust.appendChild(line(ex, p.y + p.h - 2, ex + sc.rand(-4, 4), floorY + sc.rand(10, 40), null));
        }
      });
      sc.add(exhaust);
      reflect(sc, "deskrefl", stack, floorY, 58, 0.20, 2.2);

      // Cursor — the last part of this whole timeline that is still a hand.
      var cur = group({ fill: "var(--fg)", stroke: "#ffffff", "stroke-width": 1 });
      cur.appendChild(polygon(pts(["402,150", "402,178", "409,171", "414,182", "419,180", "414,169", "423,168"]), null));
      sc.add(cur);

      motes(sc, 26, 20, 20, 580, 200, "var(--accent)", 1.4);
      grade(sc, { scan: 0.035, grain: 0.10, vignette: 0.32 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       2525 — "Mandates."
       A tribunal the size of a weather system. The statute is the light
       source; the colonnade recedes into it; the crowd at the base exists
       to establish that nobody in this room is the author of anything.
       ---------------------------------------------------------------------- */
    "2525": function () {
      var sc = new Scene("2525");
      var floorY = 190;

      sky(sc, [[0, "#0a0f1a", 1], [0.5, "var(--bg2)", 1], [1, "var(--bg)", 1]]);
      keyLight(sc, "key", 300, 104, 250, "var(--accent)", 0.30);

      // Colonnade in one-point perspective. Depth is carried entirely by
      // stroke weight, fill opacity and haze — never by outline detail.
      var colon = group(null);
      // dx/width/height all scale together off one vanishing point, so the
      // rank recedes instead of standing in a flat row.
      var offsets = [62, 140, 205, 258];
      offsets.forEach(function (dx, i) {
        var t = i / (offsets.length - 1);          // 0 = far, 1 = near
        var top = 16 - t * 22;
        var wdt = 15 + t * 20;
        var op = 0.2 + t * 0.55;
        var base = floorY + t * 12;
        [-1, 1].forEach(function (side) {
          var x = 300 + side * dx;
          var g = group({ opacity: op });
          g.appendChild(rect(x - wdt / 2, top, wdt, base - top, solid("#060a14", 0.9)));
          // lit edge on the side that faces the statute
          g.appendChild(rect(x - side * wdt * 0.5, top, wdt * 0.2, base - top, solid("var(--accent)", 0.13)));
          g.appendChild(rect(x - wdt / 2 - 3 - t * 2, top, wdt + 6 + t * 4, 7 + t * 3, solid("#060a14", 0.95)));   // capital
          g.appendChild(rect(x - wdt / 2 - 4 - t * 3, base - 7 - t * 3, wdt + 8 + t * 6, 8 + t * 3, solid("#04070f", 1)));  // base
          for (var s = 0; s < 5; s++) {
            g.appendChild(rect(x - wdt * 0.22, top + 30 + s * 28, wdt * 0.44, 1.6 + t, solid("var(--accent)", 0.32)));
          }
          colon.appendChild(g);
        });
      });
      sc.add(colon);

      // Floor grid, converging. Without it the chamber has no depth at all.
      var chamberFloor = group({ opacity: 0.22, "stroke-width": 0.7 });
      for (var fx = -900; fx <= 1500; fx += 90) {
        chamberFloor.appendChild(line(300 + (fx - 300) * 0.04, floorY, fx, H + 30, null));
      }
      for (var fr = 0; fr < 5; fr++) {
        var fy = floorY + Math.pow(fr / 4, 2) * (H - floorY + 6);
        chamberFloor.appendChild(line(0, fy, W, fy, { opacity: 0.9 - fr * 0.14 }));
      }

      // High clerestory light, falling in two hard slabs through the dust.
      shaft(sc, "sh1", [150, -10], [70, floorY], [235, floorY], "var(--accent)", 0.16, 5);
      shaft(sc, "sh2", [452, -10], [368, floorY], [532, floorY], "var(--accent)", 0.13, 5);

      // The Mandate itself: a sealed slab, hovering, permanently in force.
      var mandate = group(null);
      var seal = "M300 26 L372 52 L384 118 L300 168 L216 118 L228 52 Z";
      mandate.appendChild(path(seal, {
        fill: sc.linear("mand", "0%", "0%", "0%", "100%", [
          [0, "var(--accent)", 0.26], [0.55, "var(--bg2)", 0.9], [1, "#05080f", 0.95]
        ]), stroke: "none"
      }));
      mandate.appendChild(path(seal, { "stroke-width": 1.6, opacity: 0.95, filter: sc.bloom("mb", 3) }));
      // clause bands — dense, ratified, unreadable
      for (var cl = 0; cl < 7; cl++) {
        var cy = 58 + cl * 13;
        var half = 48 - Math.abs(cl - 3) * 3;
        mandate.appendChild(glyphRun(sc, 300 - half, cy, half * 2, 3.2, "var(--accent)", 0.62, 2));
      }
      // countersignature ring
      mandate.appendChild(circle(300, 140, 15, { "stroke-width": 1.3, opacity: 0.7 }));
      mandate.appendChild(circle(300, 140, 22, { "stroke-width": 0.8, opacity: 0.3, "stroke-dasharray": "2 4" }));
      mandate.appendChild(circle(300, 140, 6, solid("var(--accent2)", 0.95)));
      sc.add(mandate);
      sc.add(ellipse(300, 96, 120, 74, {
        fill: sc.radial("halo", "50%", "50%", "50%", [
          [0, "var(--accent2)", 0.20], [1, "var(--accent2)", 0]
        ]), stroke: "none", style: "mix-blend-mode:screen"
      }));

      // Precedent: side archives wired back to the seal, still arguing.
      [[92, 118], [508, 118]].forEach(function (p, i) {
        var g = group({ opacity: 0.75, transform: "rotate(" + (i ? 7 : -7) + " " + p[0] + " " + p[1] + ")" });
        g.appendChild(rect(p[0] - 24, p[1] - 34, 48, 68, { rx: 4, fill: "#070c16", stroke: "none", opacity: 0.85 }));
        g.appendChild(rect(p[0] - 24, p[1] - 34, 48, 68, { rx: 4, "stroke-width": 0.9, opacity: 0.4 }));
        for (var r = 0; r < 6; r++) {
          g.appendChild(glyphRun(sc, p[0] - 17, p[1] - 26 + r * 11, 34, 2.4, "var(--accent)", 0.4, 1.6));
        }
        sc.add(g);
        sc.add(cable(p[0] + (i ? -20 : 20), p[1] - 20, 300 + (i ? 60 : -60), 122, i ? 16 : 16, {
          "stroke-width": 0.8, opacity: 0.35, "stroke-dasharray": "3 5"
        }));
      });

      // Floor: polished, wet, and reflecting the thing nobody voted for.
      sc.add(rect(0, floorY, W, H - floorY, {
        fill: sc.linear("fl", 0, floorY, 0, H, [
          [0, "#0b1220", 1], [1, "#04060c", 1]
        ], true), stroke: "none"
      }));
      sc.add(chamberFloor);
      reflect(sc, "rf", mandate, floorY, 50, 0.46, 2.2);
      reflect(sc, "rc", colon, floorY, 50, 0.3, 2.8);
      sc.add(line(0, floorY, W, floorY, { opacity: 0.35, "stroke-width": 0.8 }));

      // Scale.
      sc.add(crowd(sc, floorY + 4, 40, 560, 22, 22, 0.85));
      haze(sc, "hz", floorY - 34, 46, "var(--accent)", 0.13);
      motes(sc, 30, 40, 20, 560, 185, "var(--accent)", 1.5);
      grade(sc, { scan: 0.06, grain: 0.14, vignette: 0.62 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       3535 — "Cultivars."
       A grow-hall at night: ranked bio-vats under a mycelial canopy, wired
       into the floor spine, rain on the dome glass. Something in the far
       right cell has gone wrong and is behind hazard glass, glitching.
       ---------------------------------------------------------------------- */
    "3535": function () {
      var sc = new Scene("3535");
      var floorY = 186;

      sky(sc, [[0, "#08140d", 1], [0.55, "#0c1a12", 1], [1, "var(--bg)", 1]]);
      keyLight(sc, "key", 250, 70, 260, "var(--accent)", 0.22);

      // Dome ribs, seen from inside. Mullions run *along* the ribs rather
      // than converging on a point, which is how a real glazed vault reads.
      var dome = group({ opacity: 0.4, "stroke-width": 0.9 });
      for (var d = 0; d < 5; d++) {
        var rx = 150 + d * 84;
        var apex = -46 + d * 12;
        dome.appendChild(path("M" + (300 - rx) + " 158 Q300 " + apex + " " + (300 + rx) + " 158", { opacity: 0.45 - d * 0.06 }));
        for (var seg = 1; seg < 9; seg++) {
          // sample the quadratic to hang short mullions off each rib
          var tt = seg / 9;
          var qx = (1 - tt) * (1 - tt) * (300 - rx) + 2 * (1 - tt) * tt * 300 + tt * tt * (300 + rx);
          var qy = (1 - tt) * (1 - tt) * 158 + 2 * (1 - tt) * tt * apex + tt * tt * 158;
          dome.appendChild(line(qx, qy, qx, qy + 7, { opacity: 0.22 - d * 0.03 }));
        }
      }
      sc.add(dome);
      rain(sc, 55, 0.34, -20, 150, "var(--accent)", 0.3, 0.6);

      // Canopy: hanging mycelium with luminous fruiting bodies.
      var canopy = group(null);
      for (var c = 0; c < 26; c++) {
        var hx = sc.rand(10, 590);
        var len = sc.rand(14, 54);
        canopy.appendChild(path(
          "M" + hx + " 0 C" + (hx + sc.rand(-8, 8)) + " " + (len * 0.5) + " " + (hx + sc.rand(-12, 12)) + " " + (len * 0.7) + " " + (hx + sc.rand(-6, 6)) + " " + len,
          { "stroke-width": sc.rand(0.5, 1.2), opacity: sc.rand(0.2, 0.6) }
        ));
        if (sc.chance(0.55)) {
          canopy.appendChild(circle(hx + sc.rand(-6, 6), len + 2, sc.rand(1.4, 3.2),
            solid("var(--accent2)", sc.rand(0.4, 0.95))));
        }
      }
      canopy.setAttribute("filter", sc.bloom("cb", 2));
      sc.add(canopy);

      // Three ranks of vats, receding. Back rank blurred and dim, front rank
      // crisp with visible glass, meniscus, cabling and status LEDs.
      function vatRank(y, scale, opacity, count, x0, gap, blurStd) {
        var g = group({ opacity: opacity });
        if (blurStd) g.setAttribute("filter", sc.blur("vb" + y, blurStd));
        for (var i = 0; i < count; i++) {
          // stagger, so ranks don't line up into wallpaper
          var x = x0 + i * gap + sc.rand(-gap * 0.12, gap * 0.12);
          var w = 26 * scale, h = 74 * scale * sc.rand(0.86, 1.14);
          var top = y - h;
          g.appendChild(rect(x - w / 2, top, w, h, {
            rx: w * 0.45,
            fill: sc.linear("vat" + y + i, "0%", "0%", "0%", "100%", [
              [0, "var(--accent)", 0.10], [0.4, "var(--accent)", 0.30], [1, "var(--accent2)", 0.16]
            ]), stroke: "none"
          }));
          g.appendChild(rect(x - w / 2, top, w, h, { rx: w * 0.45, "stroke-width": 0.9 * scale, opacity: 0.65 }));
          g.appendChild(ellipse(x, top + h * 0.22, w * 0.44, w * 0.14, { "stroke-width": 0.7, opacity: 0.5 }));
          // the organism: a coiled filament, different in every vat
          var coil = "M" + x + " " + (y - h * 0.16);
          for (var k = 1; k <= 7; k++) {
            coil += " Q" + (x + sc.rand(-w * 0.4, w * 0.4)) + " " + (y - h * 0.16 - k * h * 0.085) +
                    " " + (x + sc.rand(-w * 0.2, w * 0.2)) + " " + (y - h * 0.16 - k * h * 0.095);
          }
          g.appendChild(path(coil, { "stroke-width": 1.1 * scale, opacity: 0.9, stroke: "var(--accent2)" }));
          g.appendChild(circle(x, y - h * 0.5, w * 0.2, solid("var(--accent)", 0.35)));
          // plumbing + a green tell-tale, and one short drop to the floor bus
          g.appendChild(rect(x - w * 0.62, y - 5 * scale, w * 1.24, 5 * scale, solid("#05100a", 0.95)));
          g.appendChild(circle(x + w * 0.42, y - 2.5 * scale, 1.1 * scale, solid("var(--accent)", 0.9)));
          g.appendChild(path("M" + (x - w * 0.3) + " " + y + " L" + (x - w * 0.3) + " " + (floorY - 6) +
            " Q" + (x - w * 0.3) + " " + floorY + " " + (x - w * 0.3 + 7) + " " + floorY,
            { "stroke-width": 0.9 * scale, opacity: 0.4 }));
        }
        return g;
      }
      sc.add(vatRank(146, 0.46, 0.34, 12, 24, 52, 2.4));
      haze(sc, "hz1", 104, 64, "var(--accent)", 0.14);
      var midRank = vatRank(166, 0.74, 0.66, 7, 52, 84, 1.1);
      sc.add(midRank);
      var frontRank = vatRank(186, 1.22, 1, 4, 74, 148, 0);
      sc.add(frontRank);

      // Floor spine: everything is plumbed into one root bus.
      sc.add(rect(0, floorY, W, H - floorY, {
        fill: sc.linear("fl", 0, floorY, 0, H, [[0, "#081410", 1], [1, "#040807", 1]], true), stroke: "none"
      }));
      var spine = [];
      for (var sx = 0; sx <= W; sx += 12) spine.push(sx + "," + (210 + Math.sin(sx / 52) * 4));
      sc.add(polyline(pts(spine), { "stroke-width": 4.2, opacity: 0.26 }));
      sc.add(polyline(pts(spine), { "stroke-width": 1, opacity: 0.55, "stroke-dasharray": "7 10" }));
      // rootlets, kept short and downward so they read as fibre, not tangle
      for (var rt = 0; rt < 26; rt++) {
        var rx0 = sc.rand(0, W);
        var ry0 = 210 + Math.sin(rx0 / 52) * 4;
        sc.add(path("M" + rx0 + " " + ry0 + " q" + sc.rand(-6, 6) + " " + sc.rand(5, 11) + " " + sc.rand(-12, 12) + " " + sc.rand(11, 24),
          { "stroke-width": 0.6, opacity: sc.rand(0.1, 0.32) }));
      }
      reflect(sc, "rf", frontRank, floorY, 42, 0.3, 1.6);

      // Quarantine: hazard glass, chevrons, and a specimen that will not
      // hold still for the renderer.
      var quar = group(null);
      quar.appendChild(rect(494, 92, 84, 96, { rx: 5, fill: "#120705", stroke: "none", opacity: 0.9 }));
      quar.appendChild(rect(494, 92, 84, 96, { rx: 5, stroke: "rgba(255,90,80,0.7)", "stroke-width": 1.3 }));
      quar.appendChild(rect(494, 92, 84, 11, solid("rgba(255,90,80,0.30)", 1)));
      quar.appendChild(rect(494, 92, 84, 11, { stroke: "rgba(255,90,80,0.5)", "stroke-width": 0.7 }));
      // hazard lamp on the lintel
      var lamp = circle(536, 97.5, 3, solid("#ff8a70", 1));
      lamp.setAttribute("class", "art-flicker");
      lamp.setAttribute("filter", sc.bloom("qb", 3));
      quar.appendChild(lamp);
      // the specimen: an amorphous mass that will not hold still, seen
      // through fogged glass. No outline — outlines make it a cartoon.
      var specimen = group({ filter: sc.rgbSplit("split", 1.8), opacity: 0.85 });
      var blob = "M536 118";
      for (var bp = 1; bp <= 9; bp++) {
        var ba = (bp / 9) * Math.PI * 2;
        blob += " Q" + (536 + Math.cos(ba - 0.35) * sc.rand(20, 32)) + " " + (146 + Math.sin(ba - 0.35) * sc.rand(14, 24)) +
                " " + (536 + Math.cos(ba) * sc.rand(16, 26)) + " " + (146 + Math.sin(ba) * sc.rand(12, 20));
      }
      specimen.appendChild(path(blob + " Z", solid("rgba(255,110,90,0.32)", 1)));
      specimen.appendChild(path(blob + " Z", { stroke: "rgba(255,150,120,0.5)", "stroke-width": 0.8 }));
      specimen.appendChild(circle(534, 144, 5, solid("rgba(255,190,160,0.9)", 1)));
      quar.appendChild(specimen);
      quar.appendChild(rect(497, 95, 78, 90, solid("rgba(200,220,210,0.05)", 1)));   // fogged glass
      for (var ch = 0; ch < 7; ch++) {
        quar.appendChild(path("M" + (496 + ch * 12) + " 188 l6 -9 l4 0 l-6 9 z", solid("rgba(255,90,80,0.5)", 1)));
      }
      sc.add(quar);

      // Pollinator drones, on their rounds.
      [[140, 92], [312, 74], [408, 118]].forEach(function (p) {
        var dg = group({ opacity: 0.9 });
        dg.appendChild(line(p[0] - 5, p[1], p[0] + 5, p[1], { "stroke-width": 1, opacity: 0.8 }));
        dg.appendChild(ellipse(p[0] - 6, p[1] - 1, 4, 1.2, { "stroke-width": 0.7, opacity: 0.45 }));
        dg.appendChild(ellipse(p[0] + 6, p[1] - 1, 4, 1.2, { "stroke-width": 0.7, opacity: 0.45 }));
        dg.appendChild(circle(p[0], p[1] + 1.5, 1.8, solid("var(--accent2)", 0.9)));
        sc.add(dg);
      });

      // A grower, between ranks, with a rim of vat-light down one side.
      sc.add(figure(268, floorY + 10, 34, { opacity: 0.95 }));
      sc.add(path("M262 " + (floorY + 10) + " L261 " + (floorY - 14) + " Q264 " + (floorY - 22) + " 268 " + (floorY - 23),
        { stroke: "var(--accent)", "stroke-width": 1, opacity: 0.55 }));
      motes(sc, 34, 20, 30, 580, 190, "var(--accent2)", 1.5);
      grade(sc, { scan: 0.05, grain: 0.15, vignette: 0.6 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       4545 — "Foldings."
       A fabrication hall where the software/hardware argument is settled by
       machinery: flat woven lattice goes in on the left, gets creased through
       the loom aperture, and comes out the right as a solid. Sodium light,
       sparks, a catwalk with two people who no longer write anything down.
       ---------------------------------------------------------------------- */
    "4545": function () {
      var sc = new Scene("4545");
      var floorY = 200;
      var slitY = 122;

      sky(sc, [[0, "#150e07", 1], [0.55, "#1d1509", 1], [1, "var(--bg)", 1]]);
      keyLight(sc, "key", 300, slitY, 200, "var(--accent)", 0.24);

      // Roof truss. Structure, not ornament: chords, web members, hoists.
      var gantry = group({ opacity: 0.42, "stroke-width": 1 });
      gantry.appendChild(line(0, 20, W, 20, { opacity: 0.8, "stroke-width": 1.8 }));
      gantry.appendChild(line(0, 40, W, 40, { opacity: 0.6, "stroke-width": 1.2 }));
      for (var t = 0; t <= 20; t++) {
        var tx = t * 30;
        gantry.appendChild(line(tx, 20, tx, 40, { opacity: 0.45 }));
        gantry.appendChild(line(tx, 40, tx + 30, 20, { opacity: 0.3 }));
      }
      [110, 246, 486].forEach(function (hx, i) {
        var drop = 26 + i * 14;
        gantry.appendChild(line(hx, 40, hx, 40 + drop, { "stroke-dasharray": "2 3", opacity: 0.75 }));
        gantry.appendChild(rect(hx - 8, 40 + drop, 16, 9, solid("#0d0a05", 0.95)));
        gantry.appendChild(rect(hx - 8, 40 + drop, 16, 9, { "stroke-width": 0.7, opacity: 0.5 }));
      });
      sc.add(gantry);

      // Feedstock: a flat woven sheet in true perspective, running into the
      // press. Warp threads live only on this side of the machine.
      var sheet = { tl: [-20, 74], tr: [252, 108], br: [252, 146], bl: [-20, 208] };
      var weave = group(null);
      weave.appendChild(polygon(pts([
        sheet.tl.join(","), sheet.tr.join(","), sheet.br.join(","), sheet.bl.join(",")
      ]), solid("var(--accent)", 0.05)));
      for (var wf = 0; wf <= 9; wf++) {
        var f = wf / 9;
        var ax = sheet.tl[0] + (sheet.bl[0] - sheet.tl[0]) * f;
        var ay = sheet.tl[1] + (sheet.bl[1] - sheet.tl[1]) * f;
        var bx = sheet.tr[0] + (sheet.br[0] - sheet.tr[0]) * f;
        var by = sheet.tr[1] + (sheet.br[1] - sheet.tr[1]) * f;
        weave.appendChild(line(ax, ay, bx, by, { "stroke-width": 0.8, opacity: 0.1 + f * 0.14 }));
      }
      for (var wc = 0; wc <= 16; wc++) {
        var c = Math.pow(wc / 16, 1.5);      // bunching toward the press
        var px1 = sheet.tl[0] + (sheet.tr[0] - sheet.tl[0]) * c;
        var py1 = sheet.tl[1] + (sheet.tr[1] - sheet.tl[1]) * c;
        var px2 = sheet.bl[0] + (sheet.br[0] - sheet.bl[0]) * c;
        var py2 = sheet.bl[1] + (sheet.br[1] - sheet.bl[1]) * c;
        weave.appendChild(line(px1, py1, px2, py2, { "stroke-width": 0.6, opacity: 0.07 + c * 0.24 }));
      }
      sc.add(weave);

      // The press. Two heavy jaws and a slit of light between them — the
      // hall's only real light source, and the reason anything here is lit.
      var press = group(null);
      var upper = "M232 30 L372 30 L356 " + (slitY - 7) + " L248 " + (slitY - 7) + " Z";
      var lower = "M248 " + (slitY + 7) + " L356 " + (slitY + 7) + " L372 " + floorY + " L232 " + floorY + " Z";
      // Heavy castings: dark bodies that only pick up light near the slit, so
      // the machine reads as mass rather than as an outlined funnel.
      press.appendChild(path(upper, {
        fill: sc.linear("jawU", "0%", "0%", "0%", "100%", [[0, "#0a0703", 1], [1, "#2a1e0c", 1]]), stroke: "none"
      }));
      press.appendChild(path(lower, {
        fill: sc.linear("jawL", "0%", "0%", "0%", "100%", [[0, "#2a1e0c", 1], [1, "#080502", 1]]), stroke: "none"
      }));
      press.appendChild(path(upper, { "stroke-width": 0.9, opacity: 0.16 }));
      press.appendChild(path(lower, { "stroke-width": 0.9, opacity: 0.16 }));
      press.appendChild(line(248, slitY - 7, 356, slitY - 7, { "stroke-width": 1.4, opacity: 0.8 }));
      press.appendChild(line(248, slitY + 7, 356, slitY + 7, { "stroke-width": 1.4, opacity: 0.8 }));
      // hydraulic rams driving the upper jaw
      [258, 300, 342].forEach(function (rx) {
        press.appendChild(rect(rx - 5, 40, 10, 30, solid("#1a1208", 1)));
        press.appendChild(rect(rx - 5, 40, 10, 30, { "stroke-width": 0.7, opacity: 0.22 }));
        press.appendChild(line(rx, 70, rx, slitY - 9, { "stroke-width": 2.4, opacity: 0.2 }));
      });
      // bolt courses
      for (var bo = 0; bo < 9; bo++) {
        press.appendChild(circle(244 + bo * 14, slitY + 15, 1.5, solid("var(--accent)", 0.3)));
        press.appendChild(circle(244 + bo * 14, slitY - 15, 1.5, solid("var(--accent)", 0.22)));
      }
      sc.add(press);

      var slit = group(null);
      slit.appendChild(rect(248, slitY - 7, 108, 14, {
        fill: sc.linear("slit", "0%", "0%", "100%", "0%", [
          [0, "var(--accent)", 0.35], [0.5, "#fff6dd", 1], [1, "var(--accent)", 0.35]
        ]), stroke: "none", filter: sc.bloom("slb", 6)
      }));
      slit.appendChild(ellipse(302, slitY, 96, 26, {
        fill: sc.radial("slg", "50%", "50%", "50%", [
          [0, "#ffe9b8", 0.45], [1, "var(--accent)", 0]
        ]), stroke: "none", style: "mix-blend-mode:screen"
      }));
      sc.add(slit);
      shaft(sc, "shl", [300, slitY], [-40, 60], [-40, 210], "var(--accent)", 0.14, 6);
      shaft(sc, "shr", [300, slitY], [640, 50], [640, 220], "var(--accent)", 0.12, 6);

      // Output: a folded solid on the roller table. Opaque, axonometric,
      // lit from the press side — an object, not a wireframe.
      var solidObj = group(null);
      // Dark metal, not flat colour: each face is a gradient so the block has
      // a light side and a shadow side instead of reading as a paper box.
      var faces = [
        { d: "M358 112 L424 92 L492 110 L428 134 Z", n: "top",
          g: [[0, "#8a6522", 1], [0.55, "#5e4416", 1], [1, "#3c2b0d", 1]], sw: 0.9, so: 0.3 },
        { d: "M358 112 L428 134 L428 178 L358 158 Z", n: "left",
          g: [[0, "#4a330f", 1], [1, "#201607", 1]], sw: 0.8, so: 0.22 },
        { d: "M428 134 L492 110 L492 154 L428 178 Z", n: "right",
          g: [[0, "#181004", 1], [1, "#0c0802", 1]], sw: 0.8, so: 0.14 }
      ];
      faces.forEach(function (f) {
        solidObj.appendChild(path(f.d, {
          fill: sc.linear("fc" + f.n, "0%", "0%", "60%", "100%", f.g), stroke: "none"
        }));
        solidObj.appendChild(path(f.d, { "stroke-width": f.sw, opacity: f.so }));
      });
      // specular streak across the top face, from the slit
      solidObj.appendChild(path("M370 116 L426 98 L444 102 L390 122 Z", solid("#ffe6ac", 0.12)));
      // the crease the fold was made along, still glowing where it was worked
      solidObj.appendChild(path("M358 112 L428 134 L492 110", { "stroke-width": 1.6, opacity: 0.85, filter: sc.bloom("crb", 2.5) }));
      solidObj.appendChild(path("M428 134 L428 178", { "stroke-width": 1, opacity: 0.35 }));
      solidObj.appendChild(path("M388 124 L388 168 M410 131 L410 174", { "stroke-width": 0.6, opacity: 0.16, "stroke-dasharray": "3 4" }));
      // contact glow where it is still leaving the press
      solidObj.appendChild(path("M358 112 L358 158", { "stroke-width": 3, opacity: 0.75, stroke: "#ffe6ac", filter: sc.bloom("ctb", 4) }));
      sc.add(solidObj);
      // rollers
      [374, 404, 434, 464, 494].forEach(function (rx) {
        sc.add(ellipse(rx, 184, 8, 3, solid("#241906", 1)));
        sc.add(ellipse(rx, 184, 8, 3, { "stroke-width": 0.7, opacity: 0.28 }));
      });

      // Sparks, thrown from the slit, mostly downward and to the right.
      var sparks = group({ filter: sc.bloom("sb", 2) });
      for (var s = 0; s < 34; s++) {
        var sx = sc.rand(250, 358), sy = slitY + sc.rand(-6, 8);
        var len = sc.rand(4, 18);
        var dir = sc.chance(0.65) ? 1 : -1;
        sparks.appendChild(line(sx, sy, sx + len * dir, sy + len * sc.rand(0.3, 1.4), {
          stroke: sc.chance(0.45) ? "#fff2d0" : "var(--accent)", "stroke-width": sc.rand(0.5, 1.1), opacity: sc.rand(0.3, 1)
        }));
      }
      for (var em = 0; em < 24; em++) {
        sparks.appendChild(circle(sc.rand(210, 420), sc.rand(90, 196), sc.rand(0.5, 1.4),
          solid("#ffd68a", sc.rand(0.25, 0.9))));
      }
      sc.add(sparks);

      // Catwalk across the near foreground, with two operators who no longer
      // write anything down.
      var walk = group(null);
      walk.appendChild(rect(0, 176, 210, 6, solid("#0d0a05", 1)));
      walk.appendChild(line(0, 176, 210, 176, { "stroke-width": 0.8, opacity: 0.5 }));
      walk.appendChild(line(0, 158, 210, 158, { "stroke-width": 0.9, opacity: 0.4 }));
      for (var rail = 0; rail < 8; rail++) {
        walk.appendChild(line(6 + rail * 27, 158, 6 + rail * 27, 176, { "stroke-width": 0.7, opacity: 0.28 }));
      }
      walk.appendChild(figure(120, 176, 30, { opacity: 0.96 }));
      walk.appendChild(figure(146, 176, 27, { opacity: 0.96 }));
      // rim light off the press, down their leading edges
      walk.appendChild(path("M133 176 L134 154 Q137 148 141 148", { stroke: "var(--accent)", "stroke-width": 1, opacity: 0.6, fill: "none" }));
      sc.add(walk);

      // Floor: hot metal.
      sc.add(rect(0, floorY, W, H - floorY, {
        fill: sc.linear("fl", 0, floorY, 0, H, [[0, "#1c1208", 1], [1, "#070401", 1]], true), stroke: "none"
      }));
      reflect(sc, "rf", slit, floorY, 40, 0.5, 3);
      reflect(sc, "rf2", solidObj, floorY, 40, 0.2, 3);

      haze(sc, "hz", 148, 66, "var(--accent2)", 0.1);
      motes(sc, 40, 20, 30, 580, 200, "#ffd79a", 1.7);
      grade(sc, { scan: 0.05, grain: 0.16, vignette: 0.6 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       5555 — "Chorales."
       A nave of pooled minds. Ranked pods on two curving galleries, every
       filament running to one consensus core. One pod at the right has gone
       out of phase and is rendering wrong — still legible, still connected.
       ---------------------------------------------------------------------- */
    "5555": function () {
      var sc = new Scene("5555");
      var floorY = 200;
      var core = { x: 300, y: 112 };

      sky(sc, [[0, "#0c0614", 1], [0.5, "#150c20", 1], [1, "var(--bg)", 1]]);
      keyLight(sc, "key", core.x, core.y, 250, "var(--accent)", 0.3);

      // Vault, kept to three ribs. More than that and the top of the frame
      // turns into noise the eye has to fight through to reach the core.
      var vault = group({ opacity: 0.34, "stroke-width": 0.9 });
      for (var v = 0; v < 3; v++) {
        var span = 300 - v * 62;
        vault.appendChild(path("M" + (300 - span) + " 120 Q300 " + (-96 + v * 34) + " " + (300 + span) + " 120",
          { opacity: 0.7 - v * 0.16 }));
      }
      for (var rib = 0; rib < 7; rib++) {
        var rx = 60 + rib * 80;
        vault.appendChild(line(rx, 116, 300 + (rx - 300) * 0.5, 24, { opacity: 0.13 }));
      }
      sc.add(vault);
      haze(sc, "hz1", 26, 84, "var(--accent2)", 0.1);

      // Far tier: a whole congregation, too far to resolve.
      var farTier = group({ filter: sc.blur("ft", 1.9), opacity: 0.42 });
      for (var i = 0; i < 17; i++) {
        var t = i / 16;
        var fx = 16 + t * 568;
        var fy = 148 - Math.sin(t * Math.PI) * 10;
        farTier.appendChild(rect(fx - 4, fy - 13, 8, 16, { rx: 4, fill: "var(--accent)", stroke: "none", opacity: 0.4 }));
        farTier.appendChild(circle(fx, fy - 7, 1.4, solid("#ffffff", 0.7)));
        farTier.appendChild(line(fx, fy - 13, fx, 30, { "stroke-width": 0.5, opacity: 0.18 }));
      }
      sc.add(farTier);

      // Consensus core.
      var coreG = group(null);
      coreG.appendChild(circle(core.x, core.y, 52, {
        fill: sc.radial("cg", "50%", "50%", "50%", [
          [0, "#ffffff", 0.92], [0.24, "var(--accent)", 0.5], [1, "var(--accent2)", 0]
        ]), stroke: "none", filter: sc.bloom("cb", 8)
      }));
      coreG.appendChild(circle(core.x, core.y, 16, solid("#ffffff", 0.96)));
      for (var ring = 1; ring <= 4; ring++) {
        coreG.appendChild(circle(core.x, core.y, 22 + ring * 17, {
          "stroke-width": 1.3 - ring * 0.2, opacity: 0.3 - ring * 0.05
        }));
      }
      sc.add(coreG);

      // Near tier: five pods, cropped by the bottom edge, close enough to
      // see the occupant. Perspective comes from scale and crop, not from a
      // curve drawn through evenly spaced ellipses.
      var nearTier = group(null);
      var pods = [
        { x: 54, s: 0.72 }, { x: 158, s: 0.9 }, { x: 300, s: 1.06 },
        { x: 438, s: 0.92 }, { x: 546, s: 0.74 }
      ];
      pods.forEach(function (pd, pi) {
        var pw = 34 * pd.s, ph = 74 * pd.s;
        var top = floorY - ph + 4;
        var g = group(null);
        g.appendChild(line(pd.x, top + 6, pd.x + (pd.x - 300) * 0.14, 0, { "stroke-width": 1.1 * pd.s, opacity: 0.3 }));
        g.appendChild(rect(pd.x - pw / 2, top, pw, ph, {
          rx: pw / 2,
          fill: sc.linear("pod" + pi, "0%", "0%", "30%", "100%", [
            [0, "var(--accent)", 0.34], [1, "var(--accent2)", 0.1]
          ]), stroke: "none"
        }));
        // the occupant, curled, backlit by their own pod
        g.appendChild(path("M" + pd.x + " " + (top + ph * 0.30) +
          " q" + (pw * 0.30) + " " + (ph * 0.10) + " " + (pw * 0.20) + " " + (ph * 0.30) +
          " q" + (-pw * 0.20) + " " + (ph * 0.16) + " " + (-pw * 0.40) + " " + (ph * 0.06) +
          " q" + (-pw * 0.18) + " " + (-ph * 0.20) + " " + (pw * 0.20) + " " + (-ph * 0.46) + " Z",
          solid("#1a0f28", 0.72)));
        g.appendChild(circle(pd.x, top + ph * 0.26, 4.6 * pd.s, solid("#1a0f28", 0.8)));
        g.appendChild(rect(pd.x - pw / 2, top, pw, ph, { rx: pw / 2, "stroke-width": 1.1 * pd.s, opacity: 0.7 }));
        g.appendChild(rect(pd.x - pw / 2 + 2, top + 3, pw * 0.22, ph - 8, { rx: pw * 0.11, fill: "#ffffff", stroke: "none", opacity: 0.1 }));
        g.appendChild(circle(pd.x, floorY - 6, 2 * pd.s, solid("var(--accent)", 0.9)));
        nearTier.appendChild(g);
        // one voice, from this pod to the core
        nearTier.appendChild(path("M" + pd.x + " " + (top + ph * 0.3) +
          " Q" + ((pd.x + core.x) / 2) + " " + (top - 26) + " " + core.x + " " + core.y,
          { "stroke-width": 0.8, opacity: 0.28 }));
      });
      sc.add(nearTier);

      // Dissent: one pod out of phase, inboard where it can be seen.
      var dissent = group(null);
      var dg = group({ filter: sc.rgbSplit("split", 2.4), opacity: 0.95 });
      dg.appendChild(rect(494, 148, 22, 46, { rx: 11, fill: "rgba(255,90,110,0.14)", stroke: "rgba(255,110,120,0.9)", "stroke-width": 1.2 }));
      dg.appendChild(circle(505, 166, 4.4, solid("rgba(255,150,150,0.85)", 1)));
      dg.appendChild(line(505, 148, 508, 0, { stroke: "rgba(255,110,120,0.4)", "stroke-width": 0.9 }));
      dissent.appendChild(dg);
      dissent.appendChild(path("M494 162 Q420 150 348 122", {
        stroke: "rgba(255,110,120,0.65)", "stroke-width": 0.9, "stroke-dasharray": "4 5"
      }));
      for (var gl = 0; gl < 4; gl++) {
        dissent.appendChild(rect(478, 150 + gl * 11 + sc.rand(0, 3), sc.rand(12, 40), sc.rand(0.8, 1.8),
          solid("rgba(255,120,130,0.45)", 1)));
      }
      sc.add(dissent);

      // Floor: still liquid, ringed by the core's standing wave.
      sc.add(rect(0, floorY, W, H - floorY, {
        fill: sc.linear("fl", 0, floorY, 0, H, [[0, "#170e24", 1], [1, "#06040a", 1]], true), stroke: "none"
      }));
      reflect(sc, "rf", coreG, floorY, 40, 0.42, 2.6);
      reflect(sc, "rfg", nearTier, floorY, 40, 0.26, 2);
      for (var rp = 0; rp < 4; rp++) {
        sc.add(ellipse(300, floorY + 7 + rp * 9, 70 + rp * 72, 3 + rp * 3, { "stroke-width": 0.6, opacity: 0.2 - rp * 0.04 }));
      }

      shaft(sc, "sh", [core.x, core.y], [180, H], [420, H], "var(--accent)", 0.14, 6);
      motes(sc, 36, 30, 20, 570, 200, "var(--accent)", 1.6);
      grade(sc, { scan: 0.05, grain: 0.15, vignette: 0.62 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       6565 — "Tilth."
       Graded terrain at dusk, under a targeting overlay. A person walks what
       looks like their own path; the faint alternatives all curve into the
       same basin, because the ground was shaped that way before they arrived.
       ---------------------------------------------------------------------- */
    "6565": function () {
      var sc = new Scene("6565");

      sky(sc, [[0, "#071a17", 1], [0.42, "#0a201b", 1], [1, "var(--bg)", 1]]);
      keyLight(sc, "key", 430, 66, 260, "var(--accent2)", 0.20);

      // Dusk band + a low sun the whole landscape is graded toward. The band
      // fades out at both ends — a hard edge here read as a seam across the
      // middle of the picture.
      sc.add(rect(0, 30, W, 78, {
        fill: sc.linear("dusk", 0, 30, 0, 108, [
          [0, "var(--accent2)", 0], [0.62, "var(--accent2)", 0.18], [1, "var(--accent2)", 0]
        ], true),
        stroke: "none", style: "mix-blend-mode:screen"
      }));
      sc.add(circle(452, 84, 46, {
        fill: sc.radial("sunhalo", "50%", "50%", "50%", [
          [0, "var(--accent2)", 0.45], [0.35, "var(--accent2)", 0.16], [1, "var(--accent2)", 0]
        ]), stroke: "none", style: "mix-blend-mode:screen"
      }));
      sc.add(circle(452, 84, 11, { fill: "#f6ffd9", stroke: "none", opacity: 0.55, filter: sc.blur("sunb", 2.4) }));

      // Ridge silhouettes, aerial perspective by opacity.
      [[96, 0.16, 26], [112, 0.28, 18], [128, 0.42, 12]].forEach(function (r, i) {
        var p = ["0," + H];
        for (var x = 0; x <= W; x += 20) {
          p.push(x + "," + (r[0] + Math.sin(x / (60 + i * 22) + i * 2.1) * r[2] * 0.5 + Math.sin(x / 23 + i) * 2.4));
        }
        p.push(W + "," + H);
        sc.add(polygon(pts(p), solid("#04120f", r[1] + 0.35)));
      });

      // Contour field. The basin at right is not a decoration — every
      // contour bends into it, which is the whole argument of the era.
      var basin = { x: 428, y: 196 };
      var contours = group(null);
      for (var c = 0; c < 13; c++) {
        var baseY = 118 + c * 10;
        var p2 = [];
        for (var x2 = -10; x2 <= W + 10; x2 += 10) {
          var pull = Math.exp(-Math.pow((x2 - basin.x) / 120, 2)) * (30 + c * 5.5);
          var ridge = Math.exp(-Math.pow((x2 - 130) / 100, 2)) * (-14 - c * 1.6);
          p2.push(x2 + "," + (baseY + pull + ridge + Math.sin(x2 / 34 + c * 0.5) * 2.2));
        }
        contours.appendChild(polyline(pts(p2), { "stroke-width": c % 4 === 0 ? 1.2 : 0.7, opacity: 0.14 + c * 0.035 }));
      }
      sc.add(contours);
      // slope hatching into the basin
      var hatch = group({ "stroke-width": 0.6, opacity: 0.3 });
      for (var hh = 0; hh < 46; hh++) {
        var hx = sc.rand(300, 570), hy = sc.rand(130, 214);
        var dxh = (basin.x - hx) * 0.05, dyh = (basin.y - hy) * 0.05;
        hatch.appendChild(line(hx, hy, hx + dxh, hy + dyh, { opacity: sc.rand(0.2, 0.7) }));
      }
      sc.add(hatch);

      // Every path anyone could take.
      var alts = group({ "stroke-width": 0.8, "stroke-dasharray": "2 6", opacity: 0.28 });
      [[20, 150], [60, 186], [130, 128], [190, 210], [252, 122]].forEach(function (st) {
        alts.appendChild(path("M" + st[0] + " " + st[1] + " C" + (st[0] + 140) + " " + (st[1] + 14) + " " + (basin.x - 90) + " " + (basin.y - 34) + " " + basin.x + " " + basin.y, null));
      });
      sc.add(alts);
      // The one being walked, which feels chosen. A worn track, not a laser:
      // a faint bed with a dashed line of footfalls over it.
      var walked = "M96 168 C176 176 292 174 372 190 S416 196 " + basin.x + " " + basin.y;
      sc.add(path(walked, { "stroke-width": 4.5, opacity: 0.12 }));
      sc.add(path(walked, { "stroke-width": 1.1, opacity: 0.75 }));
      sc.add(path(walked, { "stroke-width": 2.2, opacity: 0.85, "stroke-dasharray": "1.5 9", filter: sc.bloom("pb", 1.8) }));
      sc.add(circle(basin.x, basin.y, 8, solid("var(--accent)", 0.9)));
      sc.add(circle(basin.x, basin.y, 18, { "stroke-width": 1, opacity: 0.45 }));
      sc.add(circle(basin.x, basin.y, 30, { "stroke-width": 0.7, opacity: 0.22 }));

      // Seeder drones, tilling the ridge with thin beams.
      [[168, 78], [244, 64], [316, 88]].forEach(function (d) {
        var g = group(null);
        // swept delta, nose left, with a nav light — reads as aircraft
        g.appendChild(path("M" + (d[0] - 11) + " " + d[1] + " L" + (d[0] + 9) + " " + (d[1] - 3.5) +
          " L" + (d[0] + 11) + " " + d[1] + " L" + (d[0] + 7) + " " + (d[1] + 2.5) + " Z", solid(SHADOW, 0.95)));
        g.appendChild(line(d[0] - 2, d[1] - 3, d[0] + 4, d[1] - 8, { stroke: SHADOW, "stroke-width": 1.6, opacity: 0.9 }));
        g.appendChild(circle(d[0] - 10, d[1] + 0.5, 1.1, solid("var(--accent)", 0.95)));
        g.appendChild(polygon(pts([(d[0] - 2) + "," + (d[1] + 5), (d[0] + 2) + "," + (d[1] + 5), (d[0] + 12) + "," + (d[1] + 54), (d[0] - 12) + "," + (d[1] + 54)]), {
          fill: sc.linear("beam" + d[0], 0, d[1], 0, d[1] + 54, [[0, "var(--accent)", 0.3], [1, "var(--accent)", 0]], true),
          stroke: "none", style: "mix-blend-mode:screen"
        }));
        sc.add(g);
      });

      // The subject: big enough to be a person rather than a tick mark, with
      // a cast shadow down-slope and a rim of dusk on the sunward side.
      sc.add(ellipse(220, 178, 18, 3.2, { fill: SHADOW, stroke: "none", opacity: 0.4, filter: sc.blur("figsh", 2) }));
      sc.add(figure(214, 177, 36, { opacity: 0.95 }));
      sc.add(path("M219 177 L220 156 Q222 149 226 148", { stroke: "var(--accent2)", "stroke-width": 1.1, opacity: 0.6 }));

      // HUD: the era from the tiller's side of the glass.
      var hud = group({ "stroke-width": 0.9, opacity: 0.6 });
      [[192, 134], [240, 134], [192, 186], [240, 186]].forEach(function (k, i) {
        var sx = i % 2 ? -1 : 1, sy = i < 2 ? 1 : -1;
        hud.appendChild(path("M" + k[0] + " " + (k[1] + 10 * sy) + " L" + k[0] + " " + k[1] + " L" + (k[0] + 10 * sx) + " " + k[1], null));
      });
      hud.appendChild(line(214, 120, 214, 130, { "stroke-dasharray": "2 3", opacity: 0.5 }));
      hud.appendChild(glyphRun(sc, 248, 132, 54, 2.4, "currentColor", 0.55, 2));
      for (var tk = 0; tk < 30; tk++) {
        hud.appendChild(line(20 + tk * 19, 226, 20 + tk * 19, tk % 5 === 0 ? 219 : 223, { "stroke-width": 0.7, opacity: 0.35 }));
      }
      // preference gradient legend
      for (var bar = 0; bar < 6; bar++) {
        hud.appendChild(rect(24 + bar * 11, 34 - bar * 3, 7, 6 + bar * 3, solid("currentColor", 0.18 + bar * 0.11)));
      }
      hud.appendChild(rect(20, 24, 76, 26, { "stroke-width": 0.7, opacity: 0.3 }));
      sc.add(hud);

      haze(sc, "hz", 96, 60, "var(--accent)", 0.10);
      motes(sc, 22, 20, 60, 580, 210, "var(--accent)", 1.2);
      grade(sc, { scan: 0.06, grain: 0.14, vignette: 0.58 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       7510 — "Liturgies."
       An orbital temple around a relic core nobody can service any more.
       Processions on three inclined tracks, verse-banners in a language that
       stopped being parsed, ranks of celebrants on the altar terrace.
       ---------------------------------------------------------------------- */
    "7510": function () {
      var sc = new Scene("7510");
      var floorY = 200;
      var cx = 300, cy = 108;

      sky(sc, [[0, "#07060f", 1], [0.5, "#0d0b18", 1], [1, "var(--bg)", 1]]);
      // starfield behind everything
      for (var st = 0; st < 90; st++) {
        sc.add(circle(sc.rand(0, W), sc.rand(0, 170), sc.rand(0.3, 1.1), solid("#ffffff", sc.rand(0.08, 0.55))));
      }
      keyLight(sc, "key", cx, cy, 250, "var(--accent)", 0.30);

      // Orbital tracks: three inclinations, each a rotated ellipse.
      var tracks = [
        { r: 74, k: 0.30, tilt: -16, count: 9, op: 0.55 },
        { r: 116, k: 0.40, tilt: 12, count: 13, op: 0.42 },
        { r: 168, k: 0.26, tilt: -6, count: 17, op: 0.3 }
      ];
      tracks.forEach(function (tr, ti) {
        var g = group({ transform: "rotate(" + tr.tilt + " " + cx + " " + cy + ")" });
        g.appendChild(ellipse(cx, cy, tr.r, tr.r * tr.k, { "stroke-width": 0.9, opacity: tr.op * 0.6 }));
        g.appendChild(ellipse(cx, cy, tr.r, tr.r * tr.k, { "stroke-width": 3.2, opacity: tr.op * 0.14 }));
        for (var i = 0; i < tr.count; i++) {
          var ang = (i / tr.count) * Math.PI * 2 + ti * 0.4;
          var x = cx + Math.cos(ang) * tr.r, y = cy + Math.sin(ang) * tr.r * tr.k;
          var lead = ang + 0.16;
          // craft plus the trail it is leaving on the track
          g.appendChild(line(x, y, cx + Math.cos(lead) * tr.r, cy + Math.sin(lead) * tr.r * tr.k, {
            "stroke-width": 1.6, opacity: tr.op * 0.8, stroke: "var(--accent2)"
          }));
          g.appendChild(circle(x, y, 1.9, solid("#ffffff", tr.op + 0.3)));
        }
        sc.add(g);
      });

      // The relic core.
      var core = group(null);
      core.appendChild(circle(cx, cy, 40, {
        fill: sc.radial("cg", "50%", "50%", "50%", [
          [0, "#ffffff", 0.95], [0.3, "var(--accent2)", 0.55], [1, "var(--accent)", 0]
        ]), stroke: "none", filter: sc.bloom("cb", 8)
      }));
      core.appendChild(circle(cx, cy, 13, solid("#fffdf4", 1)));
      core.appendChild(circle(cx, cy, 23, { "stroke-width": 1.1, opacity: 0.55, "stroke-dasharray": "1 4" }));
      // reliquary cage — the machine has been enclosed by its own worship
      for (var cg = 0; cg < 8; cg++) {
        var ca = (cg / 8) * Math.PI * 2;
        core.appendChild(line(cx + Math.cos(ca) * 17, cy + Math.sin(ca) * 17, cx + Math.cos(ca) * 30, cy + Math.sin(ca) * 30,
          { "stroke-width": 1.2, opacity: 0.6 }));
      }
      sc.add(core);

      // Radial shafts through the incense.
      for (var s2 = 0; s2 < 7; s2++) {
        var sa = (s2 / 7) * Math.PI * 2 + 0.3;
        shaft(sc, "sh" + s2, [cx, cy],
          [cx + Math.cos(sa - 0.1) * 340, cy + Math.sin(sa - 0.1) * 340],
          [cx + Math.cos(sa + 0.1) * 340, cy + Math.sin(sa + 0.1) * 340],
          "var(--accent)", 0.13, 4);
      }

      // Hanging verse-banners.
      [78, 148, 452, 522].forEach(function (bx, i) {
        var bg = group({ opacity: 0.8 });
        var bh = 74 + (i % 2) * 22;
        bg.appendChild(path("M" + bx + " 8 L" + (bx + 26) + " 8 L" + (bx + 26) + " " + (8 + bh) + " L" + (bx + 13) + " " + (8 + bh - 9) + " L" + bx + " " + (8 + bh) + " Z", {
          fill: "var(--accent)", stroke: "none", opacity: 0.10
        }));
        bg.appendChild(path("M" + bx + " 8 L" + (bx + 26) + " 8 L" + (bx + 26) + " " + (8 + bh) + " L" + (bx + 13) + " " + (8 + bh - 9) + " L" + bx + " " + (8 + bh) + " Z", {
          "stroke-width": 0.8, opacity: 0.5
        }));
        for (var vv = 0; vv < 6; vv++) {
          bg.appendChild(glyphRun(sc, bx + 5, 20 + vv * 10, 16, 2.6, "var(--accent2)", 0.65, 1.6));
        }
        sc.add(bg);
      });

      // Altar terrace: three steps in perspective, ranks of celebrants,
      // censers trailing smoke.
      var altar = group(null);
      [[176, 360], [187, 470], [198, 640]].forEach(function (step, si) {
        var sw = step[1];
        // solid riser down to the next step, plus a lit leading edge
        altar.appendChild(rect(300 - sw / 2, step[0], sw, H - step[0], solid("#0a0812", 1)));
        altar.appendChild(line(300 - sw / 2, step[0], 300 + sw / 2, step[0], { "stroke-width": 1, opacity: 0.4 - si * 0.06 }));
        altar.appendChild(rect(300 - sw / 2, step[0] + 1, sw, 1.6, solid("var(--accent)", 0.16)));
      });
      sc.add(altar);
      sc.add(crowd(sc, 176, 168, 432, 14, 15, 0.9));
      sc.add(crowd(sc, 186, 122, 478, 16, 18, 0.9));
      sc.add(crowd(sc, 196, 84, 516, 18, 21, 0.92));
      [96, 504].forEach(function (px) {
        var cg2 = group(null);
        cg2.appendChild(line(px, 196, px, 140, { "stroke-width": 1.2, opacity: 0.55 }));
        cg2.appendChild(circle(px, 136, 4.5, { "stroke-width": 1, opacity: 0.8 }));
        cg2.appendChild(circle(px, 136, 2, solid("var(--accent2)", 0.9)));
        // plume: a stack of soft blurred puffs, widening as it rises
        var plume = group({ filter: sc.blur("pl" + px, 4), style: "mix-blend-mode:screen" });
        for (var pu = 0; pu < 7; pu++) {
          plume.appendChild(ellipse(px + sc.rand(-9, 9), 126 - pu * 15, 4 + pu * 2.6, 6 + pu * 2,
            solid("var(--accent2)", 0.14 - pu * 0.014)));
        }
        cg2.appendChild(plume);
        sc.add(cg2);
      });

      // Obsidian floor.
      sc.add(rect(0, floorY + 6, W, H - floorY - 6, {
        fill: sc.linear("fl", 0, floorY, 0, H, [[0, "#0b0918", 1], [1, "#040309", 1]], true), stroke: "none"
      }));
      reflect(sc, "rf", core, floorY + 6, 34, 0.30, 3);

      motes(sc, 44, 20, 20, 580, 200, "var(--accent2)", 1.6);
      grade(sc, { scan: 0.055, grain: 0.15, vignette: 0.66 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       8525 — "Weathers."
       A governing storm over a stilt city. The cyclone is not a metaphor for
       the infrastructure; it is the infrastructure. The city below reads as
       inhabited — windows, beacons, billboards — and as very small.
       ---------------------------------------------------------------------- */
    "8525": function () {
      var sc = new Scene("8525");
      var waterY = 196;
      var eye = { x: 316, y: 76 };

      sky(sc, [[0, "#04101c", 1], [0.45, "#07202f", 1], [1, "#020a12", 1]]);
      keyLight(sc, "key", eye.x, eye.y, 220, "var(--accent)", 0.26);

      // Cyclone: banded arms plus a soft mass behind them, so it has volume
      // instead of being three spirals on a flat field.
      var stormMass = group({ filter: sc.blur("smb", 7), opacity: 0.55 });
      for (var m = 0; m < 5; m++) {
        stormMass.appendChild(ellipse(eye.x + sc.rand(-40, 40), eye.y + sc.rand(-14, 22), sc.rand(90, 190), sc.rand(26, 58),
          solid("var(--accent)", sc.rand(0.05, 0.14))));
      }
      sc.add(stormMass);
      // Arms drawn as tapering bands rather than uniform curves — a uniform
      // spiral reads as a spirograph, not as weather.
      for (var arm = 0; arm < 5; arm++) {
        var p = [];
        var phase = arm * ((Math.PI * 2) / 5) + sc.rand(-0.22, 0.22);
        var sweep = 2.2 + sc.rand(-0.3, 0.45);
        for (var t = 0; t <= 1.001; t += 0.025) {
          var ang = t * Math.PI * sweep + phase;
          var r = 18 + Math.pow(t, 1.2) * (250 + sc.rand(-30, 30));
          p.push((eye.x + Math.cos(ang) * r) + "," + (eye.y + Math.sin(ang) * r * (0.28 + t * 0.06)));
        }
        var band = group({ filter: sc.blur("ab" + arm, 1 + arm * 0.55) });
        band.appendChild(polyline(pts(p), { "stroke-width": 6 - arm * 0.7, opacity: 0.09 }));
        band.appendChild(polyline(pts(p), { "stroke-width": 1.9, opacity: 0.2 }));
        band.appendChild(polyline(pts(p), { "stroke-width": 0.8, opacity: 0.46, "stroke-dasharray": (10 + arm * 4) + " " + (5 + arm * 3) }));
        sc.add(band);
      }
      sc.add(ellipse(eye.x, eye.y, 20, 8, {
        fill: sc.radial("eye", "50%", "50%", "50%", [[0, "#ffffff", 0.9], [1, "var(--accent)", 0]]),
        stroke: "none", filter: sc.bloom("eb", 5)
      }));
      sc.add(ellipse(eye.x, eye.y, 30, 11, { "stroke-width": 1.1, opacity: 0.6 }));

      // Lightning inside the wall, with its own bloom.
      var bolt = ["236,52"], bx = 236, by = 52;
      while (by < 150) { bx += sc.rand(-16, 8); by += sc.rand(12, 26); bolt.push(bx + "," + by); }
      sc.add(polyline(pts(bolt), { "stroke-width": 1.5, opacity: 0.9, stroke: "#dff3ff", filter: sc.bloom("lb", 4) }));
      sc.add(polyline(pts(bolt), { "stroke-width": 5, opacity: 0.12, stroke: "#dff3ff" }));

      // Rain veil far behind the city.
      rain(sc, 90, 0.42, -20, waterY, "var(--accent)", 0.26, 0.6);
      haze(sc, "hz1", 110, 70, "var(--accent)", 0.12);

      // Far city: blurred, low contrast.
      var farCity = group({ filter: sc.blur("fcb", 2.2), opacity: 0.4 });
      for (var f = 0; f < 16; f++) {
        var fx = sc.rand(-10, 600), fw = sc.rand(14, 34), fh = sc.rand(26, 74);
        farCity.appendChild(rect(fx, waterY - fh, fw, fh, solid("#04121c", 0.95)));
        litWindows(sc, farCity, fx, waterY - fh, fw, fh, 3, Math.max(2, Math.round(fh / 12)), "var(--accent)", 0.3);
      }
      sc.add(farCity);

      // Near city on stilts: towers, mooring masts, cables, billboards.
      var city = group(null);
      var towers = [
        { x: 40, w: 44, h: 96 }, { x: 96, w: 30, h: 64 }, { x: 140, w: 52, h: 122 },
        { x: 206, w: 26, h: 54 }, { x: 400, w: 48, h: 108 }, { x: 462, w: 30, h: 70 },
        { x: 506, w: 58, h: 138 }
      ];
      towers.forEach(function (tw, i) {
        var top = waterY - tw.h;
        city.appendChild(rect(tw.x, top, tw.w, tw.h, solid("#03101a", 0.98)));
        city.appendChild(rect(tw.x, top, tw.w, tw.h, { "stroke-width": 0.7, opacity: 0.22 }));
        litWindows(sc, city, tw.x, top + 6, tw.w, tw.h - 10, Math.max(3, Math.round(tw.w / 11)), Math.max(4, Math.round(tw.h / 12)), "var(--accent)", 0.42);
        // stilts into the water
        for (var st2 = 0; st2 < 3; st2++) {
          var sx2 = tw.x + 4 + st2 * ((tw.w - 8) / 2);
          city.appendChild(line(sx2, waterY - 2, sx2 + sc.rand(-3, 3), waterY + 18, { "stroke-width": 1.4, opacity: 0.5, stroke: "#03101a" }));
        }
        // mast + beacon
        city.appendChild(line(tw.x + tw.w / 2, top, tw.x + tw.w / 2, top - sc.rand(10, 26), { "stroke-width": 0.9, opacity: 0.5 }));
        var beacon = circle(tw.x + tw.w / 2, top - 12, 2, solid(i % 2 ? "#ff6b6b" : "var(--accent)", 0.95));
        beacon.setAttribute("class", "art-flicker");
        beacon.setAttribute("filter", sc.bloom("bb" + i, 2));
        city.appendChild(beacon);
      });
      // holographic billboards — the only wide, bright rectangles down here
      [[196, 116, 46, 26], [452, 104, 40, 22]].forEach(function (b, i) {
        city.appendChild(rect(b[0] - 3, b[1] - 3, b[2] + 6, b[3] + 6, {
          fill: i ? "var(--accent2)" : "var(--accent)", stroke: "none", opacity: 0.28,
          filter: sc.blur("bibg" + i, 5), style: "mix-blend-mode:screen"
        }));
        city.appendChild(rect(b[0], b[1], b[2], b[3], solid("#04121c", 1)));
        city.appendChild(rect(b[0], b[1], b[2], b[3], {
          fill: sc.linear("bill" + i, "0%", "0%", "0%", "100%", [
            [0, i ? "var(--accent2)" : "var(--accent)", 0.9], [1, i ? "var(--accent)" : "var(--accent2)", 0.45]
          ]), stroke: "none"
        }));
        city.appendChild(rect(b[0], b[1], b[2], b[3], { "stroke-width": 0.8, opacity: 0.85 }));
        for (var ln = 0; ln < 4; ln++) {
          city.appendChild(glyphRun(sc, b[0] + 4, b[1] + 4 + ln * 5.5, b[2] - 8, 2.4, "#03101a", 0.8, 1.6));
        }
      });
      // cabling between the towers
      city.appendChild(cable(84, waterY - 90, 140, waterY - 116, 16, { "stroke-width": 0.8, opacity: 0.45 }));
      city.appendChild(cable(192, waterY - 108, 400, waterY - 96, 34, { "stroke-width": 0.8, opacity: 0.35 }));
      city.appendChild(cable(448, waterY - 100, 506, waterY - 130, 14, { "stroke-width": 0.8, opacity: 0.45 }));
      sc.add(city);

      // Water: reflections smeared by chop.
      sc.add(rect(0, waterY, W, H - waterY, {
        fill: sc.linear("wt", 0, waterY, 0, H, [[0, "#062032", 1], [1, "#020a12", 1]], true), stroke: "none"
      }));
      reflect(sc, "rf", city, waterY, 44, 0.30, 2.6);
      var chop = group({ "stroke-width": 0.8 });
      for (var w2 = 0; w2 < 60; w2++) {
        var wx = sc.rand(0, W), wy = sc.rand(waterY + 2, H);
        chop.appendChild(line(wx, wy, wx + sc.rand(4, 20), wy, { opacity: sc.rand(0.08, 0.4) }));
      }
      sc.add(chop);

      // Rain in front of the city, heavier and faster.
      rain(sc, 70, 0.42, 40, H, "#cfefff", 0.4, 0.8);

      // A weather bureau that is only allowed to observe.
      var rcx = 528, rcy = 54;
      var radar = group({ opacity: 0.5, "stroke-width": 0.8 });
      radar.appendChild(circle(rcx, rcy, 28, { opacity: 0.5 }));
      radar.appendChild(circle(rcx, rcy, 18, { opacity: 0.32 }));
      radar.appendChild(circle(rcx, rcy, 9, { opacity: 0.22 }));
      radar.appendChild(path("M" + rcx + " " + rcy + " L" + (rcx + 21) + " " + (rcy - 19) + " A28 28 0 0 0 " + rcx + " " + (rcy - 28) + " Z",
        solid("var(--accent)", 0.16)));
      radar.appendChild(line(rcx, rcy, rcx + 21, rcy - 19, { opacity: 0.85 }));
      for (var rt2 = 0; rt2 < 12; rt2++) {
        var ra2 = (rt2 / 12) * Math.PI * 2;
        radar.appendChild(line(rcx + Math.cos(ra2) * 28, rcy + Math.sin(ra2) * 28, rcx + Math.cos(ra2) * 31, rcy + Math.sin(ra2) * 31, { opacity: 0.5 }));
      }
      sc.add(radar);

      grade(sc, { scan: 0.05, grain: 0.16, vignette: 0.62 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       9595 — "Resonances."
       Almost nothing, rendered carefully. A standing-wave field with two
       wells; where their rings cross, an interference lattice precipitates.
       The last architecture is still faintly present, being eaten. Heavy
       grain, hard vignette — the image is losing its own signal.
       ---------------------------------------------------------------------- */
    "9595": function () {
      var sc = new Scene("9595");
      // Deliberately unequal: two identical wells made the field read as
      // wallpaper rather than as two things acting on one medium.
      var wells = [{ x: 196, y: 128, k: 1.25, rx: 104, ry: 80 }, { x: 428, y: 104, k: 0.8, rx: 76, ry: 62 }];

      sky(sc, [[0, "#070709", 1], [0.5, "#0a0a0d", 1], [1, "#030304", 1]]);
      keyLight(sc, "key", 300, 118, 300, "#ffffff", 0.06);

      // The remnant: an arch that is mostly gone.
      var ghost = group({ opacity: 0.14, "stroke-width": 1, "stroke-dasharray": "7 11" });
      ghost.appendChild(path("M150 214 L150 120 Q300 44 450 120 L450 214", null));
      ghost.appendChild(line(150, 152, 450, 152, null));
      ghost.appendChild(line(206, 214, 206, 132, null));
      ghost.appendChild(line(394, 214, 394, 132, null));
      sc.add(ghost);

      // Field: horizontal scan of the medium, amplitude driven by the wells.
      var field = group(null);
      for (var row = 0; row < 26; row++) {
        var y0 = 10 + row * 8.6;
        var p = [];
        for (var x = 0; x <= W; x += 4) {
          var amp = 0;
          wells.forEach(function (wl) {
            var dx = (x - wl.x) / wl.rx, dy = (y0 - wl.y) / wl.ry;
            var dist = Math.sqrt(dx * dx + dy * dy);
            amp += Math.cos(dist * 7.5) * Math.exp(-dist * 0.85) * 13 * wl.k;
          });
          p.push(x + "," + (y0 + amp));
        }
        // Falls off toward the frame edges, so the field has a centre of
        // gravity instead of tiling to infinity.
        var fall = Math.sin((row / 25) * Math.PI);
        field.appendChild(polyline(pts(p), {
          "stroke-width": 0.55 + fall * 0.5,
          opacity: 0.05 + Math.pow(fall, 0.7) * 0.5
        }));
      }
      sc.add(field);

      // Where the two wells agree, matter briefly condenses.
      var lattice = group(null);
      for (var i = 0; i < 150; i++) {
        var lx = sc.rand(60, 540), ly = sc.rand(40, 200);
        var v = 0;
        wells.forEach(function (wl) {
          var d = Math.sqrt(Math.pow((lx - wl.x) / wl.rx, 2) + Math.pow((ly - wl.y) / wl.ry, 2));
          v += Math.cos(d * 7.5) * Math.exp(-d * 0.85) * wl.k;
        });
        if (v > 0.5) {
          lattice.appendChild(circle(lx, ly, sc.rand(0.5, 1.5), solid("#ffffff", Math.min(1, v) * 0.85)));
        }
      }
      lattice.setAttribute("filter", sc.bloom("lb", 1.6));
      sc.add(lattice);

      // The wells themselves.
      wells.forEach(function (wl, wi) {
        var g = group(null);
        g.appendChild(circle(wl.x, wl.y, 34 * wl.k + 16, {
          fill: sc.radial("wg" + wi, "50%", "50%", "50%", [
            [0, "#ffffff", 0.22 + wl.k * 0.14], [0.4, "var(--accent2)", 0.12], [1, "#ffffff", 0]
          ]), stroke: "none", filter: sc.bloom("wb" + wi, 5)
        }));
        for (var r = 1; r <= 6; r++) {
          g.appendChild(circle(wl.x, wl.y, r * 10 * wl.k, { "stroke-width": 1.1 - r * 0.12, opacity: 0.28 - r * 0.037 }));
        }
        g.appendChild(circle(wl.x, wl.y, 2.4 + wl.k, solid("#ffffff", 1)));
        sc.add(g);
      });

      // Dropout: horizontal bands where the signal simply is not there.
      for (var gl = 0; gl < 7; gl++) {
        var gy = sc.rand(12, 226);
        sc.add(rect(sc.rand(-20, 300), gy, sc.rand(80, 420), sc.rand(0.8, 3.4),
          solid("#000000", sc.rand(0.18, 0.5))));
        if (sc.chance(0.4)) {
          sc.add(rect(sc.rand(-20, 300), gy + sc.rand(-2, 2), sc.rand(40, 200), sc.rand(0.6, 1.6),
            solid("var(--accent2)", sc.rand(0.1, 0.3))));
        }
      }

      motes(sc, 26, 20, 20, 580, 220, "#ffffff", 1.1);
      grade(sc, { scan: 0.09, grain: 0.2, grainFreq: 1.1, vignette: 0.78 });
      return sc.svg;
    },

    /* ----------------------------------------------------------------------
       BEYOND — the museum.
       A dim gallery. One vitrine, one spotlight, one glass slab of a device
       under it. The visitor reading the placard is out of focus, far too
       tall, and has more sensors than eyes.
       ---------------------------------------------------------------------- */
    beyond: function () {
      var sc = new Scene("beyond");
      var floorY = 188;

      sky(sc, [[0, "#0c0d11", 1], [0.55, "#090a0d", 1], [1, "#050607", 1]]);
      keyLight(sc, "key", 297, 92, 200, "var(--accent)", 0.24);

      // Receding row of other vitrines: the rest of the collection, unvisited.
      var far = group({ filter: sc.blur("fb", 2.6), opacity: 0.32 });
      for (var i = 0; i < 4; i++) {
        var t = i / 3;
        var fx = 40 + t * 90;
        var fw = 34 - t * 12, fh = 56 - t * 20;
        far.appendChild(rect(fx, floorY - fh - t * 16, fw, fh, { "stroke-width": 0.7, opacity: 0.5 }));
        far.appendChild(rect(fx + 4, floorY - fh - t * 16 + 10, fw - 8, fh - 22, solid("var(--accent)", 0.07)));
      }
      sc.add(far);
      var far2 = group({ filter: sc.blur("fb2", 2.6), opacity: 0.28 });
      for (var j = 0; j < 3; j++) {
        var t2 = j / 2;
        var fx2 = 520 - t2 * 70;
        far2.appendChild(rect(fx2, floorY - 52 + t2 * 14, 30 - t2 * 10, 52 - t2 * 16, { "stroke-width": 0.7, opacity: 0.5 }));
      }
      sc.add(far2);

      // Spotlight from the ceiling track.
      sc.add(rect(277, 0, 40, 5, solid("#101216", 1)));
      sc.add(rect(289, 5, 16, 9, solid("#181b21", 1)));
      shaft(sc, "spot", [297, 14], [219, floorY + 10], [381, floorY + 10], "var(--accent)", 0.26, 4);

      // Plinth, vitrine, artifact. The plinth is lit across its top face so
      // it reads as a block with a surface, not as an outlined trapezoid.
      var vitrine = group(null);
      vitrine.appendChild(path("M242 188 L262 118 L332 118 L352 188 Z", solid("#12141a", 1)));
      vitrine.appendChild(path("M262 118 L332 118 L336 124 L258 124 Z", solid("#2a2f39", 1)));
      vitrine.appendChild(path("M242 188 L262 118 L332 118 L352 188 Z", { "stroke-width": 0.9, opacity: 0.4 }));
      // glass case: edges + one sheet highlight is all it takes to read as glass
      vitrine.appendChild(path("M258 118 L258 46 L336 46 L336 118", { "stroke-width": 0.9, opacity: 0.5 }));
      vitrine.appendChild(rect(258, 46, 78, 72, solid("#ffffff", 0.025)));
      vitrine.appendChild(path("M262 118 L286 46 L302 46 L272 118 Z", solid("#ffffff", 0.05)));
      // the artifact: a glass slab, still faintly lit after ten thousand years
      vitrine.appendChild(rect(288, 76, 18, 34, { rx: 3, fill: "var(--accent)", stroke: "none", opacity: 0.30 }));
      vitrine.appendChild(rect(288, 76, 18, 34, { rx: 3, "stroke-width": 0.9, opacity: 0.9, filter: sc.bloom("ab", 2.5) }));
      vitrine.appendChild(rect(290.5, 80, 13, 24, solid("var(--accent2)", 0.5)));
      vitrine.appendChild(circle(297, 108, 1.2, solid("var(--accent)", 0.9)));
      sc.add(vitrine);

      // Placard.
      var placard = group({ transform: "rotate(-8 400 150)" });
      placard.appendChild(rect(372, 132, 58, 34, { rx: 2, fill: "#12151a", stroke: "none" }));
      placard.appendChild(rect(372, 132, 58, 34, { rx: 2, "stroke-width": 0.7, opacity: 0.4 }));
      for (var ln = 0; ln < 5; ln++) {
        placard.appendChild(glyphRun(sc, 377, 137 + ln * 6, ln === 0 ? 30 : 48, 2, "var(--accent)", 0.55, 1.5));
      }
      sc.add(placard);

      // Floor.
      sc.add(rect(0, floorY, W, H - floorY, {
        fill: sc.linear("fl", 0, floorY, 0, H, [[0, "#0c0d10", 1], [1, "#040506", 1]], true), stroke: "none"
      }));
      sc.add(line(0, floorY, W, floorY, { "stroke-width": 0.7, opacity: 0.22 }));
      reflect(sc, "rf", vitrine, floorY, 46, 0.26, 2);

      // The visitor: a near-camera mass, cropped by the frame on two sides
      // and thrown far out of focus. Shown this way it reads as someone
      // standing beside you — and it stays a silhouette, which is the only
      // honest thing to make of a body whose plan we don't know.
      var visitor = group({ filter: sc.blur("vb", 5), opacity: 1 });
      visitor.appendChild(path(
        "M600 240 L600 30 Q548 34 522 84 Q498 130 484 176 Q474 210 472 240 Z", solid("#000102", 1)
      ));
      // shoulder line, then a long neck carrying the head to the top edge
      visitor.appendChild(path("M576 44 Q536 26 520 -10", { stroke: "#000102", "stroke-width": 30, opacity: 1 }));
      sc.add(visitor);
      // A rim of gallery light down the edge that faces the vitrine — without
      // it the whole mass disappears into the background and stops reading.
      sc.add(path("M528 -6 Q516 40 500 90 Q484 140 476 190 Q471 216 470 240", {
        stroke: "var(--accent)", "stroke-width": 1.6, opacity: 0.34, filter: sc.blur("vr", 2.2)
      }));
      // Sensor cluster, kept clear of the corner radius so it actually reads.
      var sensors = group({ filter: sc.blur("sb", 2.2) });
      [[522, 40], [536, 30], [512, 56], [546, 48], [526, 66]].forEach(function (s) {
        sensors.appendChild(circle(s[0], s[1], 2.4, solid("var(--accent)", sc.rand(0.4, 0.95))));
      });
      sc.add(sensors);
      reflect(sc, "rv", visitor, floorY, 46, 0.16, 4);

      motes(sc, 30, 220, 20, 380, 180, "var(--accent)", 1.3);
      grade(sc, { scan: 0.045, grain: 0.15, vignette: 0.7 });
      return sc.svg;
    }
  };

  /* ------------------------------- mounting -------------------------------- */

  // Renders (or re-renders) one scene into a [data-art] mount. Every call
  // mints a fresh set of gradient/filter ids, which is what makes it safe to
  // put a second copy of an era's banner elsewhere in the document.
  function renderArt(mount) {
    if (!mount) return false;
    var key = mount.getAttribute("data-art");
    var generate = GENERATORS[key];
    if (!generate) return false;
    try {
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      mount.appendChild(generate());
      return true;
    } catch (err) {
      /* decorative artwork should never break the page */
      return false;
    }
  }

  // Presenter Mode needs this: deep-cloning a rendered scene would duplicate
  // every id, and a duplicate resolves to the *original* — which by then is
  // inside a display:none era, where Chrome declines to build SVG resources,
  // so the copy loses all of its gradients and filters. Re-render instead.
  window.Year2525Art = { render: renderArt };

  function init() {
    // Unlike the interactive widgets, this artwork is static — no canvas,
    // no animation loop — so there's no performance reason to lazy-load
    // it, and doing so eagerly means Presenter Mode can safely clone a
    // era-art banner's contents even for an era the visitor never
    // scrolled to in the normal flow.
    document.querySelectorAll("[data-art]").forEach(renderArt);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
