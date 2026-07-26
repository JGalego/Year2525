(function () {
  "use strict";

  // Procedural line-art banners for the forward timeline. Each era gets a
  // small generative scene built directly as SVG (createElementNS), not a
  // canvas — static, so there's no device-pixel-ratio/resize class of bug
  // to worry about, and it themes for free via currentColor + the era's
  // own --accent, already transitioning smoothly via --transition-era.

  var SVG_NS = "http://www.w3.org/2000/svg";

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
    return make("svg", {
      viewBox: "0 0 600 240",
      "aria-hidden": "true",
      focusable: "false",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    });
  }

  function rand(min, max) { return min + Math.random() * (max - min); }
  function polyline(points, opacity, width) {
    return make("polyline", { points: points.join(" "), opacity: opacity || 1, "stroke-width": width || 1.5 });
  }

  var GENERATORS = {

    // Present — a stack of glass rectangles, each holding its own small
    // grid of app icons, with a few stray notification dots drifting
    // between them.
    present: function () {
      var svg = scene();
      var screens = [
        { x: 55, y: 45, w: 130, h: 160, rot: -6 },
        { x: 205, y: 20, w: 145, h: 185, rot: 4 },
        { x: 355, y: 55, w: 125, h: 150, rot: -4 },
        { x: 450, y: 90, w: 105, h: 120, rot: 7 }
      ];
      screens.forEach(function (s) {
        var cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        var g = make("g", { transform: "rotate(" + s.rot + " " + cx + " " + cy + ")" });
        g.appendChild(make("rect", { x: s.x, y: s.y, width: s.w, height: s.h, rx: 14 }));
        var cols = 2, cell = (s.w - 16 * 3) / cols;
        var rows = Math.max(2, Math.min(3, Math.floor(s.h / 55)));
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            g.appendChild(make("rect", {
              x: s.x + 16 + c * (cell + 16), y: s.y + 16 + r * (cell + 16),
              width: cell, height: cell, rx: 5, opacity: 0.55
            }));
          }
        }
        svg.appendChild(g);
      });
      for (var i = 0; i < 6; i++) {
        svg.appendChild(make("circle", {
          cx: rand(20, 580), cy: rand(8, 232), r: rand(1.4, 2.6),
          fill: "currentColor", stroke: "none", opacity: rand(0.3, 0.7)
        }));
      }
      return svg;
    },

    // 2525 — a ratified scroll with a stack of clauses, a wax seal, and
    // two precedent scrolls cited by dotted line.
    "2525": function () {
      var svg = scene();
      svg.appendChild(make("ellipse", { cx: 300, cy: 50, rx: 88, ry: 15 }));
      svg.appendChild(make("ellipse", { cx: 300, cy: 190, rx: 88, ry: 15 }));
      svg.appendChild(make("line", { x1: 212, y1: 50, x2: 212, y2: 190 }));
      svg.appendChild(make("line", { x1: 388, y1: 50, x2: 388, y2: 190 }));
      [108, 138, 88, 128, 70].forEach(function (w, i) {
        var y = 80 + i * 20;
        svg.appendChild(make("line", { x1: 300 - w / 2, y1: y, x2: 300 + w / 2, y2: y, opacity: 0.7 }));
      });
      svg.appendChild(make("circle", { cx: 300, cy: 190, r: 13, fill: "currentColor", stroke: "none", opacity: 0.35 }));
      [[95, 140], [505, 140]].forEach(function (pos) {
        svg.appendChild(make("rect", { x: pos[0] - 24, y: pos[1] - 32, width: 48, height: 64, rx: 8, opacity: 0.55 }));
        svg.appendChild(make("line", {
          x1: pos[0], y1: pos[1], x2: 300, y2: 155,
          "stroke-dasharray": "3,5", opacity: 0.45
        }));
      });
      return svg;
    },

    // 3535 — a canopy of overlapping cultivars rooted in a shared
    // Commons, one isolated invasive strain at the margin.
    "3535": function () {
      var svg = scene();
      svg.appendChild(make("line", { x1: 20, y1: 218, x2: 580, y2: 218, opacity: 0.45 }));
      [150, 250, 350, 430].forEach(function (x) {
        svg.appendChild(make("line", { x1: x, y1: 218, x2: x, y2: 148, opacity: 0.8 }));
      });
      var canopies = [
        { cx: 150, cy: 108, r: 52 }, { cx: 252, cy: 88, r: 62 },
        { cx: 350, cy: 98, r: 55 }, { cx: 428, cy: 128, r: 38 }
      ];
      canopies.forEach(function (c) {
        svg.appendChild(make("circle", { cx: c.cx, cy: c.cy, r: c.r, fill: "currentColor", stroke: "none", opacity: 0.08 }));
        svg.appendChild(make("circle", { cx: c.cx, cy: c.cy, r: c.r }));
      });
      for (var a = 0; a < 8; a++) {
        var ang = (a / 8) * Math.PI * 2;
        svg.appendChild(make("line", {
          x1: 252 + Math.cos(ang) * 68, y1: 88 + Math.sin(ang) * 68,
          x2: 252 + Math.cos(ang) * 78, y2: 88 + Math.sin(ang) * 78, opacity: 0.3
        }));
      }
      svg.appendChild(make("line", { x1: 520, y1: 218, x2: 520, y2: 196 }));
      svg.appendChild(make("circle", { cx: 520, cy: 178, r: 20, fill: "#e04b4b", stroke: "none", opacity: 0.2 }));
      svg.appendChild(make("circle", { cx: 520, cy: 178, r: 20 }));
      return svg;
    },

    // 4545 — a woven matter-grid with one corner lifting into a folded
    // shape, mid-reconfiguration.
    "4545": function () {
      var svg = scene();
      svg.appendChild(make("rect", { x: 40, y: 30, width: 380, height: 180, opacity: 0.35 }));
      for (var x = 74; x <= 380; x += 34) svg.appendChild(make("line", { x1: x, y1: 30, x2: x, y2: 210, opacity: 0.45 }));
      for (var y = 64; y <= 210; y += 34) svg.appendChild(make("line", { x1: 40, y1: y, x2: 420, y2: y, opacity: 0.45 }));
      svg.appendChild(make("path", { d: "M420 96 L522 58 L562 148 L460 184 Z", fill: "currentColor", opacity: 0.1 }));
      svg.appendChild(make("path", { d: "M420 96 L522 58 L562 148 L460 184 Z", "stroke-width": 1.75 }));
      svg.appendChild(make("line", { x1: 460, y1: 184, x2: 420, y2: 96, opacity: 0.5 }));
      return svg;
    },

    // 5555 — braided voices, four strands crossing down the frame with
    // a shared line of confluence points.
    "5555": function () {
      var svg = scene();
      for (var s = 0; s < 4; s++) {
        var pts = [];
        for (var y = 10; y <= 230; y += 18) {
          pts.push((300 + Math.sin(y / 26 + s * 1.35) * (48 + s * 14)) + "," + y);
        }
        svg.appendChild(polyline(pts, 0.5 + s * 0.1, 1.75));
      }
      for (var i = 0; i < 6; i++) {
        svg.appendChild(make("circle", { cx: 300, cy: 20 + i * 38, r: 3, fill: "currentColor", stroke: "none", opacity: 0.75 }));
      }
      return svg;
    },

    // 6565 — terraced contour lines with one gradient-shaped basin and a
    // particle drifting the easy way down.
    "6565": function () {
      var svg = scene();
      for (var row = 0; row < 6; row++) {
        var baseY = 30 + row * 32;
        var pts = [];
        for (var x = 0; x <= 600; x += 24) {
          pts.push(x + "," + (baseY + Math.sin(x / 75 + row * 0.6) * 11));
        }
        svg.appendChild(polyline(pts, 0.28 + row * 0.09));
      }
      svg.appendChild(make("circle", { cx: 470, cy: 214, r: 5, fill: "currentColor", stroke: "none" }));
      svg.appendChild(make("circle", { cx: 200, cy: 118, r: 3.5, fill: "currentColor", stroke: "none" }));
      svg.appendChild(make("line", { x1: 200, y1: 118, x2: 460, y2: 205, "stroke-dasharray": "2,6", opacity: 0.5 }));
      return svg;
    },

    // 7510 — a swarm halo: rings of standing nodes around a small
    // central sun, a few threaded back with faint attention-lines.
    "7510": function () {
      var svg = scene();
      var cx = 300, cy = 120;
      svg.appendChild(make("circle", { cx: cx, cy: cy, r: 13 }));
      [50, 78, 105].forEach(function (radius, ri) {
        var count = 10 + ri * 5;
        for (var i = 0; i < count; i++) {
          var ang = (i / count) * Math.PI * 2 + ri * 0.35;
          var x = cx + Math.cos(ang) * radius, y = cy + Math.sin(ang) * radius * 0.52;
          svg.appendChild(make("circle", { cx: x, cy: y, r: 2.4, fill: "currentColor", stroke: "none", opacity: 0.7 }));
          if (i % 3 === 0) svg.appendChild(make("line", { x1: cx, y1: cy, x2: x, y2: y, opacity: 0.14 }));
        }
      });
      return svg;
    },

    // 8525 — a monsoon eye: three spiral wind-arms around a calm centre,
    // a scatter of settlements along the bottom edge.
    "8525": function () {
      var svg = scene();
      var cx = 300, cy = 118;
      svg.appendChild(make("circle", { cx: cx, cy: cy, r: 17, opacity: 0.55 }));
      for (var arm = 0; arm < 3; arm++) {
        var pts = [];
        for (var t = 0; t <= 1; t += 0.04) {
          var ang = t * Math.PI * 2.1 + arm * ((Math.PI * 2) / 3);
          var r = 24 + t * 128;
          pts.push((cx + Math.cos(ang) * r) + "," + (cy + Math.sin(ang) * r * 0.58));
        }
        svg.appendChild(polyline(pts, 0.5));
      }
      for (var i = 0; i < 5; i++) {
        svg.appendChild(make("circle", { cx: rand(20, 580), cy: rand(200, 230), r: 2, fill: "currentColor", stroke: "none", opacity: 0.5 }));
      }
      return svg;
    },

    // 9595 — a standing wave with resonance ripples at two of its nodes.
    "9595": function () {
      var svg = scene();
      var pts = [];
      for (var x = 0; x <= 600; x += 6) {
        pts.push(x + "," + (120 + Math.sin(x / 38) * 46 * Math.sin(x / 260)));
      }
      svg.appendChild(polyline(pts, 0.9, 2));
      [140, 460].forEach(function (nx) {
        [18, 36, 54].forEach(function (r) {
          svg.appendChild(make("circle", { cx: nx, cy: 120, r: r, opacity: Math.max(0.06, 0.32 - r * 0.004) }));
        });
      });
      return svg;
    },

    // Beyond — a museum vitrine, one small artifact inside, lit from
    // above. The gallery's own closing image.
    beyond: function () {
      var svg = scene();
      svg.appendChild(make("rect", { x: 215, y: 35, width: 170, height: 135, opacity: 0.45 }));
      svg.appendChild(make("rect", { x: 185, y: 170, width: 230, height: 18, opacity: 0.55 }));
      svg.appendChild(make("rect", { x: 274, y: 88, width: 52, height: 72, rx: 6 }));
      svg.appendChild(make("circle", { cx: 300, cy: 156, r: 4, fill: "currentColor", stroke: "none" }));
      [255, 300, 345].forEach(function (x) {
        svg.appendChild(make("line", { x1: x, y1: 0, x2: x - 22, y2: 38, opacity: 0.25 }));
      });
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
