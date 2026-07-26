(function () {
  "use strict";

  // Procedural SVG tableaux for the forward timeline. The old banners were
  // intentionally sparse line-art; this version keeps the same static,
  // theme-aware approach but adds depth, layered lighting, and a more
  // materially specific silhouette for each era.

  var SVG_NS = "http://www.w3.org/2000/svg";
  var sceneId = 0;

  function make(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
      }
    }
    return node;
  }

  function scene() {
    sceneId += 1;
    return make("svg", {
      viewBox: "0 0 600 240",
      "aria-hidden": "true",
      focusable: "false",
      class: "art-scene",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.35",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "data-scene-id": String(sceneId)
    });
  }

  function rand(min, max) { return min + Math.random() * (max - min); }
  function polyline(points, opacity, width) {
    return make("polyline", { points: points.join(" "), opacity: opacity || 1, "stroke-width": width || 1.5 });
  }
  function path(d, attrs) {
    var a = attrs || {};
    a.d = d;
    return make("path", a);
  }
  function group(attrs) {
    return make("g", attrs);
  }
  function line(x1, y1, x2, y2, attrs) {
    var a = attrs || {};
    a.x1 = x1; a.y1 = y1; a.x2 = x2; a.y2 = y2;
    return make("line", a);
  }
  function rect(x, y, width, height, attrs) {
    var a = attrs || {};
    a.x = x; a.y = y; a.width = width; a.height = height;
    return make("rect", a);
  }
  function circle(cx, cy, r, attrs) {
    var a = attrs || {};
    a.cx = cx; a.cy = cy; a.r = r;
    return make("circle", a);
  }
  function ellipse(cx, cy, rx, ry, attrs) {
    var a = attrs || {};
    a.cx = cx; a.cy = cy; a.rx = rx; a.ry = ry;
    return make("ellipse", a);
  }
  function polygon(points, attrs) {
    var a = attrs || {};
    a.points = points;
    return make("polygon", a);
  }
  function addDefs(svg) {
    var defs = make("defs");
    svg.appendChild(defs);
    return defs;
  }
  function addLinearGradient(defs, id, x1, y1, x2, y2, stops) {
    var gradient = make("linearGradient", { id: id, x1: x1, y1: y1, x2: x2, y2: y2 });
    stops.forEach(function (stop) {
      gradient.appendChild(make("stop", {
        offset: stop.offset,
        style: "stop-color:" + stop.color + ";stop-opacity:" + stop.opacity
      }));
    });
    defs.appendChild(gradient);
    return gradient;
  }
  function addRadialGradient(defs, id, cx, cy, r, stops) {
    var gradient = make("radialGradient", { id: id, cx: cx, cy: cy, r: r });
    stops.forEach(function (stop) {
      gradient.appendChild(make("stop", {
        offset: stop.offset,
        style: "stop-color:" + stop.color + ";stop-opacity:" + stop.opacity
      }));
    });
    defs.appendChild(gradient);
    return gradient;
  }
  function addFilter(defs, id) {
    var filter = make("filter", { id: id, x: "-20%", y: "-20%", width: "140%", height: "140%" });
    filter.appendChild(make("feGaussianBlur", { stdDeviation: "8", result: "blur" }));
    filter.appendChild(make("feMerge", null));
    filter.lastChild.appendChild(make("feMergeNode", { in: "blur" }));
    filter.lastChild.appendChild(make("feMergeNode", { in: "SourceGraphic" }));
    defs.appendChild(filter);
    return filter;
  }
  function background(svg, fillId, horizonY) {
    svg.appendChild(rect(0, 0, 600, 240, { fill: "url(#" + fillId + ")", stroke: "none" }));
    if (typeof horizonY === "number") {
      svg.appendChild(rect(0, horizonY, 600, 240 - horizonY, { fill: "rgba(255,255,255,0.025)", stroke: "none" }));
    }
  }

  var GENERATORS = {

    // Present — a believable desktop of glass slabs, cards, charts, and a
    // looming recommendation spiral in the background.
    present: function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-present", "0%", "0%", "100%", "100%", [
        { offset: "0%", color: "var(--bg2)", opacity: 1 },
        { offset: "55%", color: "var(--bg)", opacity: 1 },
        { offset: "100%", color: "var(--bg2)", opacity: 1 }
      ]);
      addRadialGradient(defs, "glow-present", "50%", "45%", "45%", [
        { offset: "0%", color: "var(--accent2)", opacity: 0.26 },
        { offset: "45%", color: "var(--accent)", opacity: 0.16 },
        { offset: "100%", color: "var(--accent)", opacity: 0 }
      ]);
      background(svg, "bg-present", 174);
      svg.appendChild(circle(452, 72, 92, { fill: "url(#glow-present)", stroke: "none" }));
      svg.appendChild(path("M42 196 C116 156 186 170 252 148 S392 104 554 138", { opacity: 0.18, "stroke-width": 28 }));

      var screens = [
        { x: 46, y: 56, w: 142, h: 124, rot: -7, header: 16 },
        { x: 180, y: 24, w: 176, h: 152, rot: 3, header: 18 },
        { x: 330, y: 74, w: 158, h: 116, rot: -4, header: 16 },
        { x: 468, y: 96, w: 92, h: 92, rot: 8, header: 14 }
      ];

      screens.forEach(function (s, index) {
        var cx = s.x + s.w / 2;
        var cy = s.y + s.h / 2;
        var g = group({ transform: "rotate(" + s.rot + " " + cx + " " + cy + ")" });
        g.appendChild(rect(s.x + 6, s.y + 10, s.w, s.h, {
          rx: 18,
          opacity: 0.12,
          fill: "currentColor",
          stroke: "none"
        }));
        g.appendChild(rect(s.x, s.y, s.w, s.h, {
          rx: 18,
          fill: "rgba(255,255,255,0.035)",
          opacity: 1
        }));
        g.appendChild(rect(s.x + 10, s.y + 12, s.w - 20, s.h - 24, {
          rx: 12,
          fill: "rgba(255,255,255,0.02)",
          opacity: 1
        }));
        g.appendChild(line(s.x + 14, s.y + s.header + 10, s.x + s.w - 14, s.y + s.header + 10, { opacity: 0.25 }));
        g.appendChild(circle(s.x + 18, s.y + 18, 2.2, { fill: "currentColor", stroke: "none", opacity: 0.65 }));
        g.appendChild(circle(s.x + 26, s.y + 18, 2.2, { fill: "currentColor", stroke: "none", opacity: 0.32 }));

        if (index === 1) {
          var chart = [];
          for (var step = 0; step < 7; step++) {
            var px = s.x + 24 + step * 20;
            var py = s.y + s.h - 28 - Math.pow(step / 6, 2.7) * 62;
            chart.push(px + "," + py);
          }
          g.appendChild(polyline(chart, 0.9, 2.2));
          g.appendChild(path("M" + chart[0] + " L" + chart[chart.length - 1], { opacity: 0.12, "stroke-dasharray": "4 5" }));
        } else {
          for (var row = 0; row < 3; row++) {
            for (var col = 0; col < 2; col++) {
              g.appendChild(rect(s.x + 18 + col * ((s.w - 52) / 2), s.y + 34 + row * 26, (s.w - 60) / 2, 16, {
                rx: 4,
                opacity: 0.46
              }));
            }
          }
        }
        svg.appendChild(g);
      });

      for (var i = 0; i < 11; i++) {
        svg.appendChild(circle(rand(28, 574), rand(20, 218), rand(1.3, 2.8), {
          fill: "currentColor",
          stroke: "none",
          opacity: rand(0.18, 0.62)
        }));
      }
      return svg;
    },

    // 2525 — a monumental legal chamber with a sealed mandate hovering over
    // precedent rails and side archives.
    "2525": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-2525", "0%", "0%", "0%", "100%", [
        { offset: "0%", color: "var(--bg2)", opacity: 1 },
        { offset: "100%", color: "var(--bg)", opacity: 1 }
      ]);
      addRadialGradient(defs, "glow-2525", "50%", "38%", "42%", [
        { offset: "0%", color: "var(--accent)", opacity: 0.24 },
        { offset: "100%", color: "var(--accent)", opacity: 0 }
      ]);
      background(svg, "bg-2525", 178);
      svg.appendChild(circle(300, 92, 112, { fill: "url(#glow-2525)", stroke: "none" }));
      svg.appendChild(path("M56 186 L132 62 L468 62 L544 186", { opacity: 0.18, "stroke-width": 2.4 }));
      svg.appendChild(line(92, 186, 508, 186, { opacity: 0.24, "stroke-width": 2 }));

      var mandate = group({ transform: "translate(0 4)" });
      mandate.appendChild(path("M238 44 Q300 28 362 44 L378 72 L378 162 Q300 182 222 162 L222 72 Z", {
        fill: "rgba(255,255,255,0.04)",
        opacity: 1
      }));
      mandate.appendChild(path("M238 44 Q300 28 362 44 L378 72 L378 162 Q300 182 222 162 L222 72 Z", { "stroke-width": 1.8 }));
      for (var clause = 0; clause < 6; clause++) {
        var y = 74 + clause * 15;
        mandate.appendChild(line(252, y, 348 - (clause % 2) * 18, y, { opacity: 0.72 }));
      }
      mandate.appendChild(circle(300, 150, 14, { fill: "currentColor", stroke: "none", opacity: 0.34 }));
      mandate.appendChild(circle(300, 150, 22, { opacity: 0.24 }));
      svg.appendChild(mandate);

      [[124, 128], [476, 128]].forEach(function (pos, index) {
        var archive = group({ transform: "rotate(" + (index === 0 ? -10 : 10) + " " + pos[0] + " " + pos[1] + ")" });
        archive.appendChild(rect(pos[0] - 26, pos[1] - 40, 52, 80, { rx: 10, opacity: 0.46, fill: "rgba(255,255,255,0.03)" }));
        archive.appendChild(line(pos[0] - 14, pos[1] - 18, pos[0] + 14, pos[1] - 18, { opacity: 0.55 }));
        archive.appendChild(line(pos[0] - 14, pos[1], pos[0] + 14, pos[1], { opacity: 0.55 }));
        archive.appendChild(line(pos[0], pos[1] + 18, 300, 136, { opacity: 0.35, "stroke-dasharray": "3 5" }));
        svg.appendChild(archive);
      });
      return svg;
    },

    // 3535 — a living canopy with root nets, luminous fruiting bodies, and
    // one invasive node blazing at the edge.
    "3535": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-3535", "0%", "0%", "0%", "100%", [
        { offset: "0%", color: "#102317", opacity: 1 },
        { offset: "100%", color: "var(--bg)", opacity: 1 }
      ]);
      addRadialGradient(defs, "glow-3535", "44%", "32%", "42%", [
        { offset: "0%", color: "var(--accent2)", opacity: 0.16 },
        { offset: "50%", color: "var(--accent)", opacity: 0.18 },
        { offset: "100%", color: "var(--accent)", opacity: 0 }
      ]);
      background(svg, "bg-3535", 170);
      svg.appendChild(circle(262, 76, 104, { fill: "url(#glow-3535)", stroke: "none" }));
      svg.appendChild(path("M24 214 C140 194 260 198 388 188 S514 194 576 176", { opacity: 0.32, "stroke-width": 1.8 }));

      var roots = [];
      for (var rootX = 40; rootX <= 560; rootX += 34) {
        roots.push(rootX + "," + (194 + Math.sin(rootX / 24) * 12));
      }
      svg.appendChild(polyline(roots, 0.28, 2.4));

      [146, 246, 340, 430].forEach(function (x, index) {
        svg.appendChild(line(x, 196, x + (index % 2 ? 6 : -4), 138 - index * 4, { opacity: 0.58, "stroke-width": 2.1 }));
      });
      var canopies = [
        { cx: 150, cy: 108, r: 52 }, { cx: 252, cy: 88, r: 62 },
        { cx: 350, cy: 98, r: 55 }, { cx: 428, cy: 128, r: 38 }
      ];
      canopies.forEach(function (c) {
        svg.appendChild(circle(c.cx, c.cy, c.r + 8, { fill: "currentColor", stroke: "none", opacity: 0.05 }));
        svg.appendChild(circle(c.cx, c.cy, c.r, { fill: "rgba(255,255,255,0.02)" }));
        for (var fruit = 0; fruit < 7; fruit++) {
          var ang = (fruit / 7) * Math.PI * 2;
          svg.appendChild(circle(c.cx + Math.cos(ang) * c.r * 0.55, c.cy + Math.sin(ang) * c.r * 0.38, 2.6, {
            fill: "currentColor",
            stroke: "none",
            opacity: 0.45
          }));
        }
      });
      for (var a = 0; a < 10; a++) {
        var ang = (a / 10) * Math.PI * 2;
        svg.appendChild(line(252 + Math.cos(ang) * 68, 88 + Math.sin(ang) * 48, 252 + Math.cos(ang) * 84, 88 + Math.sin(ang) * 58, { opacity: 0.24 }));
      }
      svg.appendChild(line(520, 202, 520, 186, { opacity: 0.62, "stroke-width": 1.8 }));
      svg.appendChild(circle(520, 168, 24, { fill: "rgba(224,75,75,0.16)", stroke: "rgba(224,75,75,0.85)", "stroke-width": 1.8 }));
      svg.appendChild(circle(520, 168, 7, { fill: "rgba(224,75,75,0.85)", stroke: "none" }));
      return svg;
    },

    // 4545 — a reconfigurable matter loom lifting out of a disciplined grid
    // into a volumetric fold.
    "4545": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-4545", "0%", "0%", "100%", "100%", [
        { offset: "0%", color: "#1d1510", opacity: 1 },
        { offset: "100%", color: "var(--bg)", opacity: 1 }
      ]);
      background(svg, "bg-4545", 176);
      svg.appendChild(rect(44, 28, 374, 182, { rx: 12, opacity: 0.32, fill: "rgba(255,255,255,0.025)" }));
      for (var x = 44; x <= 418; x += 34) svg.appendChild(line(x, 28, x, 210, { opacity: 0.28 }));
      for (var y = 28; y <= 210; y += 26) svg.appendChild(line(44, y, 418, y, { opacity: 0.2 }));
      var fold = group(null);
      fold.appendChild(path("M418 88 L504 52 L560 118 L470 188 L418 152 Z", { fill: "rgba(255,255,255,0.08)", opacity: 1 }));
      fold.appendChild(path("M418 88 L504 52 L560 118 L470 188 L418 152 Z", { "stroke-width": 1.8 }));
      fold.appendChild(path("M470 188 L470 132 L418 88", { opacity: 0.44, "stroke-width": 1.4 }));
      fold.appendChild(path("M470 132 L560 118", { opacity: 0.38, "stroke-width": 1.4 }));
      svg.appendChild(fold);
      svg.appendChild(path("M418 88 C446 96 464 112 470 132", { opacity: 0.42, "stroke-dasharray": "4 6" }));
      return svg;
    },

    // 5555 — a nerve-lattice of minds pooling into a bright consensus core
    // while dissent remains legible at the edge.
    "5555": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-5555", "0%", "0%", "100%", "100%", [
        { offset: "0%", color: "#160d1f", opacity: 1 },
        { offset: "100%", color: "var(--bg)", opacity: 1 }
      ]);
      addFilter(defs, "glow-5555");
      background(svg, "bg-5555", null);
      for (var s = 0; s < 4; s++) {
        var pts = [];
        for (var y = 10; y <= 230; y += 18) {
          pts.push((300 + Math.sin(y / 26 + s * 1.35) * (42 + s * 16)) + "," + y);
        }
        svg.appendChild(polyline(pts, 0.38 + s * 0.12, 2.2));
      }
      svg.appendChild(circle(300, 120, 36, { fill: "rgba(255,255,255,0.08)", stroke: "none", filter: "url(#glow-5555)" }));
      for (var i = 0; i < 7; i++) {
        svg.appendChild(circle(300, 18 + i * 34, 3.4, { fill: "currentColor", stroke: "none", opacity: 0.76 }));
      }
      [148, 454].forEach(function (x) {
        svg.appendChild(circle(x, 120, 18, { opacity: 0.26 }));
        svg.appendChild(line(x + (x < 300 ? 18 : -18), 120, 300 + (x < 300 ? -36 : 36), 120, { opacity: 0.26 }));
      });
      for (var ring = 1; ring <= 3; ring++) {
        svg.appendChild(circle(300, 120, 28 + ring * 22, { opacity: 0.08 + ring * 0.03 }));
      }
      return svg;
    },

    // 6565 — a shaped topography with a sculpted basin and a highlighted
    // decision path being gently steered toward equilibrium.
    "6565": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-6565", "0%", "0%", "0%", "100%", [
        { offset: "0%", color: "#0e1f1a", opacity: 1 },
        { offset: "100%", color: "var(--bg)", opacity: 1 }
      ]);
      background(svg, "bg-6565", null);
      for (var row = 0; row < 6; row++) {
        var baseY = 30 + row * 32;
        var pts = [];
        for (var x = 0; x <= 600; x += 24) {
          pts.push(x + "," + (baseY + Math.sin(x / 75 + row * 0.6) * 11));
        }
        svg.appendChild(polyline(pts, 0.22 + row * 0.1, 1.9));
      }
      svg.appendChild(path("M378 38 C448 64 502 114 530 178", { opacity: 0.16, "stroke-width": 22 }));
      svg.appendChild(circle(470, 206, 34, { opacity: 0.22 }));
      svg.appendChild(circle(470, 206, 9, { fill: "currentColor", stroke: "none" }));
      svg.appendChild(circle(196, 116, 4.4, { fill: "currentColor", stroke: "none" }));
      svg.appendChild(path("M196 116 C246 126 304 152 368 176 S434 198 456 204", { opacity: 0.56, "stroke-dasharray": "2 7", "stroke-width": 1.8 }));
      return svg;
    },

    // 7510 — a solar liturgy: orbital processions around a bright core with
    // procedural attention lines linking tiers.
    "7510": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addRadialGradient(defs, "glow-7510", "50%", "50%", "40%", [
        { offset: "0%", color: "var(--accent2)", opacity: 0.4 },
        { offset: "100%", color: "var(--accent)", opacity: 0 }
      ]);
      background(svg, "glow-7510", null);
      var cx = 300, cy = 120;
      svg.appendChild(circle(cx, cy, 18, { fill: "rgba(255,255,255,0.09)", stroke: "none" }));
      svg.appendChild(circle(cx, cy, 13, { filter: "url(#glow-7510)" }));
      [50, 78, 105].forEach(function (radius, ri) {
        var count = 10 + ri * 5;
        svg.appendChild(ellipse(cx, cy, radius, radius * 0.52, { opacity: 0.22 }));
        for (var i = 0; i < count; i++) {
          var ang = (i / count) * Math.PI * 2 + ri * 0.35;
          var x = cx + Math.cos(ang) * radius, y = cy + Math.sin(ang) * radius * 0.52;
          svg.appendChild(circle(x, y, 2.4, { fill: "currentColor", stroke: "none", opacity: 0.72 }));
          if (i % 3 === 0) svg.appendChild(line(cx, cy, x, y, { opacity: 0.14 }));
        }
      });
      return svg;
    },

    // 8525 — a weather-engine storm eye with sweeping vector arms and tiny
    // inhabited lights below it.
    "8525": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-8525", "0%", "0%", "100%", "100%", [
        { offset: "0%", color: "#0a2130", opacity: 1 },
        { offset: "100%", color: "var(--bg)", opacity: 1 }
      ]);
      background(svg, "bg-8525", 182);
      var cx = 300, cy = 118;
      svg.appendChild(circle(cx, cy, 17, { opacity: 0.55 }));
      svg.appendChild(circle(cx, cy, 40, { opacity: 0.16 }));
      for (var arm = 0; arm < 3; arm++) {
        var pts = [];
        for (var t = 0; t <= 1; t += 0.04) {
          var ang = t * Math.PI * 2.1 + arm * ((Math.PI * 2) / 3);
          var r = 24 + t * 128;
          pts.push((cx + Math.cos(ang) * r) + "," + (cy + Math.sin(ang) * r * 0.58));
        }
        svg.appendChild(polyline(pts, 0.52, 2));
      }
      for (var i = 0; i < 5; i++) {
        var sx = rand(20, 580);
        var sy = rand(198, 228);
        svg.appendChild(rect(sx - 4, sy - 4, 8, 8, { rx: 2, fill: "currentColor", stroke: "none", opacity: 0.36 }));
        svg.appendChild(circle(sx, sy - 7, 1.4, { fill: "currentColor", stroke: "none", opacity: 0.6 }));
      }
      return svg;
    },

    // 9595 — a harmonic field with two reinforced resonant wells.
    "9595": function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-9595", "0%", "0%", "100%", "100%", [
        { offset: "0%", color: "#09090d", opacity: 1 },
        { offset: "100%", color: "#030304", opacity: 1 }
      ]);
      background(svg, "bg-9595", null);
      var pts = [];
      for (var x = 0; x <= 600; x += 6) {
        pts.push(x + "," + (120 + Math.sin(x / 38) * 46 * Math.sin(x / 260)));
      }
      svg.appendChild(polyline(pts, 0.9, 2));
      [140, 460].forEach(function (nx) {
        [18, 36, 54].forEach(function (r) {
          svg.appendChild(circle(nx, 120, r, { opacity: Math.max(0.06, 0.32 - r * 0.004) }));
        });
        svg.appendChild(circle(nx, 120, 5, { fill: "currentColor", stroke: "none", opacity: 0.68 }));
      });
      return svg;
    },

    // Beyond — a museum vitrine, one artifact, and the last thin beam of
    // procedural light the page is willing to cast.
    beyond: function () {
      var svg = scene();
      var defs = addDefs(svg);
      addLinearGradient(defs, "bg-beyond", "0%", "0%", "0%", "100%", [
        { offset: "0%", color: "#0d0f12", opacity: 1 },
        { offset: "100%", color: "#060708", opacity: 1 }
      ]);
      background(svg, "bg-beyond", 184);
      svg.appendChild(rect(212, 36, 176, 134, { rx: 4, opacity: 0.44, fill: "rgba(255,255,255,0.02)" }));
      svg.appendChild(rect(184, 170, 232, 20, { rx: 3, opacity: 0.55, fill: "rgba(255,255,255,0.04)" }));
      svg.appendChild(rect(270, 82, 60, 78, { rx: 8, fill: "rgba(255,255,255,0.04)" }));
      svg.appendChild(circle(300, 156, 4, { fill: "currentColor", stroke: "none" }));
      [255, 300, 345].forEach(function (x) {
        svg.appendChild(line(x, 0, x - 22, 38, { opacity: 0.25 }));
      });
      svg.appendChild(path("M246 194 C274 188 328 188 358 194", { opacity: 0.18, "stroke-width": 2.4 }));
      return svg;
    }
  };

  function initArt(mount) {
    var key = mount.getAttribute("data-art");
    var generate = GENERATORS[key];
    if (!generate) return;
    try {
      mount.appendChild(generate());
    } catch (err) {
      /* decorative artwork should never break the page */
    }
  }

  function init() {
    // Unlike the interactive widgets, this artwork is static — no canvas,
    // no animation loop — so there's no performance reason to lazy-load
    // it, and doing so eagerly means Presenter Mode can safely clone a
    // era-art banner's contents even for an era the visitor never
    // scrolled to in the normal flow.
    document.querySelectorAll("[data-art]").forEach(initArt);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
