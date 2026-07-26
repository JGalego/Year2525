(function () {
  "use strict";

  // Each widget is a function(mountEl) that builds its own DOM/canvas.
  // Widgets are initialized lazily, the first time their mount scrolls
  // into view, so the page stays light until you actually reach them.

  function makeCanvas(mount) {
    var canvas = document.createElement("canvas");
    mount.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    function resize() {
      var dpr = window.devicePixelRatio || 1;
      var rect = mount.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round((rect.height || 220) * dpr));
      canvas.style.width = "100%";
      canvas.style.height = (rect.height || 220) + "px";
      // Resizing a canvas clears it and resets its transform, so the
      // device-pixel-ratio scale must be reapplied every time — mobile
      // browsers fire "resize" often (address bar show/hide) and without
      // this, drawing silently shrinks to a 1/dpr fraction of the box.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);
    return { canvas: canvas, ctx: ctx, resize: resize };
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fallback;
  }

  // ---------------------------------------------------------------
  // Present Day — Global Attention Capitalization
  // ---------------------------------------------------------------
  function valuationChart(mount) {
    var c = makeCanvas(mount);
    var ctx = c.ctx;
    var morph = 0, target = 0;
    var settleTimer = null;
    var isCoarsePointer = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;

    function excite(amount, settleDelay) {
      target = Math.min(1, target + amount);
      if (settleTimer) clearTimeout(settleTimer);
      if (settleDelay) {
        settleTimer = setTimeout(function () { target = 0; }, settleDelay);
      }
    }

    mount.addEventListener("pointermove", function () { excite(0.02, 0); });
    mount.addEventListener("pointerdown", function () { excite(0.38, 900); });
    mount.addEventListener("pointerenter", function () { excite(0.14, 0); });
    mount.addEventListener("focus", function () { excite(0.22, 1200); });
    mount.addEventListener("pointerleave", function () { target = 0; });
    mount.addEventListener("blur", function () { target = 0; });

    // Touch devices have no hover path, so periodically "breathe" the chart
    // to signal it is interactive even before the first tap.
    if (isCoarsePointer) {
      setInterval(function () {
        if (document.hidden) return;
        excite(0.1, 650);
      }, 2800);
    }

    var labelsCurve = ["$4.2T", "$19T", "$110T", "\u221E"];
    var labelsCircle = ["Logos", "Nous", "The Sphere", "The One"];

    function frame() {
      morph += (target - morph) * 0.06;
      var w = mount.clientWidth, h = mount.clientHeight || 220;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar("--accent", "#5ee6c8");
      var accent2 = cssVar("--accent2", "#e65e9c");
      var fg = cssVar("--fg", "#eee");

      // exponential curve control points
      var n = 60;
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var t = i / n;
        var curveX = 20 + t * (w - 40);
        var curveY = h - 20 - (Math.pow(t, 4)) * (h - 60);
        var angle = -Math.PI / 2 + t * Math.PI * 1.94;
        var radius = 10 + t * (Math.min(w, h) / 2 - 20);
        var circX = w / 2 + Math.cos(angle) * radius;
        var circY = h / 2 + Math.sin(angle) * radius * 0.9;
        var x = curveX + (circX - curveX) * morph;
        var y = curveY + (circY - curveY) * morph;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // concentric rings fade in
      ctx.save();
      ctx.globalAlpha = morph * 0.5;
      for (var r = 1; r <= 4; r++) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, r * Math.min(w, h) / 10, 0, Math.PI * 2);
        ctx.strokeStyle = accent2;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      // labels
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillStyle = fg;
      var labels = morph < 0.5 ? labelsCurve : labelsCircle;
      ctx.globalAlpha = 0.85;
      for (var li = 0; li < labels.length; li++) {
        var lt = li / (labels.length - 1);
        ctx.fillText(labels[li], 24 + lt * (w - 90), 16);
      }
      ctx.globalAlpha = 1;

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 2525 — Negotiate with your Mandate
  // ---------------------------------------------------------------
  function mandateNegotiate(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:1rem;font-family:var(--font-display);text-align:left;";
    wrap.innerHTML =
      '<div class="mn-sliders"></div>' +
      '<button class="mn-petition" style="margin-top:.75rem;padding:.5rem 1rem;border-radius:6px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font:inherit;">Petition Steward</button>' +
      '<p class="mn-ruling" style="margin-top:1rem;font-family:var(--font-mono);font-size:.85rem;min-height:3em;"></p>';
    mount.appendChild(wrap);

    var dims = [
      { key: "cost", label: "Cost" },
      { key: "time", label: "Time" },
      { key: "relationship", label: "Relationship" }
    ];
    var container = wrap.querySelector(".mn-sliders");
    var values = {};
    dims.forEach(function (d) {
      values[d.key] = 50;
      var row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem;font-size:.85rem;";
      row.innerHTML = '<span style="width:6.5em;">' + d.label + '</span>';
      var input = document.createElement("input");
      input.type = "range"; input.min = 0; input.max = 100; input.value = 50;
      input.style.flex = "1";
      input.addEventListener("input", function () { values[d.key] = +input.value; });
      row.appendChild(input);
      container.appendChild(row);
    });

    var precedents = [
      "Steward v. Dentist's Mandate (2519)", "In re: Overlapping Errand Windows (2521)",
      "Charterer's Guild Advisory 2523-B", "The Ambient Scheduling Accord (2517)",
      "Mandate of the Third Cousin's Wedding (2520)"
    ];

    wrap.querySelector(".mn-petition").addEventListener("click", function () {
      var winner = dims.reduce(function (a, b) { return values[a.key] >= values[b.key] ? a : b; });
      var precedent = precedents[Math.floor(Math.random() * precedents.length)];
      var margin = Math.floor(50 + Math.random() * 45);
      wrap.querySelector(".mn-ruling").textContent =
        "Ruling: citing precedent " + precedent + ", Steward finds in favor of " + winner.label.toLowerCase() +
        ", by a margin of " + margin + "%. Dissent noted and preserved. Effective ambiently.";
    });
  }

  // ---------------------------------------------------------------
  // 3535 — Plant a Cultivar
  // ---------------------------------------------------------------
  function cultivarGrow(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;text-align:left;padding:.5rem;";
    var traitBtn = 'padding:.35rem .7rem;border-radius:6px;cursor:pointer;font:inherit;';
    var transportBtn = 'padding:.35rem .7rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer;font:inherit;';
    wrap.innerHTML =
      '<div class="cg-controls" style="display:flex;gap:.5rem;margin-bottom:.5rem;font-family:var(--font-display);font-size:.8rem;flex-wrap:wrap;">' +
      '<button data-c="0" style="' + traitBtn + 'border:1px solid var(--accent);background:var(--accent);color:#04160f;" title="Cultivar A — a helpful, truthful growth pattern">Cultivar A</button>' +
      '<button data-c="1" style="' + traitBtn + 'border:1px solid var(--accent2);background:var(--accent2);color:#04160f;" title="Cultivar B — a rival strain, just as legitimate">Cultivar B</button>' +
      '<button data-c="2" style="' + traitBtn + 'border:1px solid #d33;background:#d33;color:#fff;" title="This era&#39;s malware — outcompetes rather than crashes">Invasive Weed</button>' +
      '<span style="margin-left:auto;"></span>' +
      '<button class="cg-random" style="' + transportBtn + '" title="Broadcast — clear the plot and scatter a fresh wild mix of spores">Random</button>' +
      '<button class="cg-reset" style="' + transportBtn + '" title="Reset — clear the plot back to bare soil">Reset</button>' +
      '<button class="cg-rewind" style="' + transportBtn + '" title="Rewind — back to how the plot was sown, before the seasons ran">Rewind</button>' +
      '<button class="cg-step" style="' + transportBtn + '" title="Tend — advance one season by hand">Step</button>' +
      '<button class="cg-play" style="' + transportBtn + '" title="Cultivate — let the seasons run on their own">Play</button>' +
      '<button class="cg-stop" style="' + transportBtn + '" title="Fallow — let the plot rest" disabled>Stop</button>' +
      '</div>';
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:180px;";
    canvasHost.style.touchAction = "pan-y";
    wrap.appendChild(canvasHost);
    mount.appendChild(wrap);

    var cols = 28, rows = 14;
    var grid = new Array(cols * rows).fill(-1);
    // How the plot was last sown by hand, by Random, or by Reset. Tending
    // never touches it, so Rewind can always get back to the starting
    // configuration instead of just clearing the plot.
    var sown = grid.slice();
    var current = 0;
    wrap.querySelectorAll(".cg-controls button[data-c]").forEach(function (btn) {
      btn.addEventListener("click", function () { current = +btn.dataset.c; });
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var colors = ["#6ee7b7", "#a3e635", "#e04b4b"];

    function idx(x, y) { return y * cols + x; }
    function paint(x, y) {
      var cw = canvasHost.clientWidth / cols, ch = (canvasHost.clientHeight || 180) / rows;
      var gx = Math.floor(x / cw), gy = Math.floor(y / ch);
      if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) grid[idx(gx, gy)] = current;
    }
    var drawing = false;

    canvasHost.addEventListener("pointerdown", function (e) {
      drawing = true;
      canvasHost.style.touchAction = "none";
      if (canvasHost.setPointerCapture) canvasHost.setPointerCapture(e.pointerId);
      var rect = canvasHost.getBoundingClientRect();
      paint(e.clientX - rect.left, e.clientY - rect.top);
      draw();
    });
    canvasHost.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      var rect = canvasHost.getBoundingClientRect();
      paint(e.clientX - rect.left, e.clientY - rect.top);
      draw();
    });
    function stopDrawing(e) {
      if (drawing) sown = grid.slice();   // hand-sowing becomes the new start
      drawing = false;
      canvasHost.style.touchAction = "pan-y";
      if (e && canvasHost.releasePointerCapture) {
        try { canvasHost.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    canvasHost.addEventListener("pointerup", stopDrawing);
    canvasHost.addEventListener("pointercancel", stopDrawing);

    function neighbors(x, y) {
      var counts = [0, 0, 0];
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          var v = grid[idx(nx, ny)];
          if (v >= 0) counts[v]++;
        }
      }
      return counts;
    }

    function tend() {
      var next = grid.slice();
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var v = grid[idx(x, y)];
          var n = neighbors(x, y);
          var total = n[0] + n[1] + n[2];
          if (v === -1) {
            if (total >= 3) {
              // invasive weed spreads more aggressively
              next[idx(x, y)] = n[2] >= 2 ? 2 : (n[0] >= n[1] ? 0 : 1);
            }
          } else {
            if (total < 2 || total > 4) next[idx(x, y)] = -1;
            else if (n[2] >= 3 && v !== 2) next[idx(x, y)] = 2; // weed outcompetes
          }
        }
      }
      grid = next;
      draw();
    }

    var randomBtn = wrap.querySelector(".cg-random");
    var resetBtn = wrap.querySelector(".cg-reset");
    var rewindBtn = wrap.querySelector(".cg-rewind");
    var stepBtn = wrap.querySelector(".cg-step");
    var playBtn = wrap.querySelector(".cg-play");
    var stopBtn = wrap.querySelector(".cg-stop");
    var playTimer = null;

    function stopPlaying() {
      if (!playTimer) return;
      clearInterval(playTimer);
      playTimer = null;
      playBtn.disabled = false;
      stopBtn.disabled = true;
    }
    function startPlaying() {
      if (playTimer) return;
      playTimer = setInterval(tend, 450);
      playBtn.disabled = true;
      stopBtn.disabled = false;
    }
    function broadcast() {
      stopPlaying();
      // Every cell is written, so a broadcast is a fresh plot rather than
      // another handful of spores thrown over whatever was already growing.
      var next = new Array(cols * rows);
      for (var i = 0; i < next.length; i++) {
        next[i] = Math.random() < 0.16
          ? (Math.random() < 0.12 ? 2 : (Math.random() < 0.5 ? 0 : 1))
          : -1;
      }
      grid = next;
      sown = grid.slice();
      draw();
    }
    function reset() {
      stopPlaying();
      grid = new Array(cols * rows).fill(-1);
      sown = grid.slice();
      draw();
    }
    function rewind() {
      stopPlaying();
      grid = sown.slice();
      draw();
    }

    stepBtn.addEventListener("click", tend);
    randomBtn.addEventListener("click", broadcast);
    resetBtn.addEventListener("click", reset);
    rewindBtn.addEventListener("click", rewind);
    playBtn.addEventListener("click", startPlaying);
    stopBtn.addEventListener("click", stopPlaying);

    // Don't keep tending an unwatched plot in a backgrounded tab.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopPlaying();
    });

    function draw() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 180;
      ctx.clearRect(0, 0, w, h);
      var cw = w / cols, ch = h / rows;
      for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
          var v = grid[idx(x, y)];
          if (v >= 0) {
            ctx.fillStyle = colors[v];
            ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
          }
        }
      }
    }
    draw();
  }

  // ---------------------------------------------------------------
  // Shared control chrome for the era widgets
  // ---------------------------------------------------------------
  var BTN_CSS = "padding:.35rem .7rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer;font:inherit;";

  function controlBar() {
    var bar = document.createElement("div");
    // borrows .cg-controls' hover styling from the stylesheet
    bar.className = "cg-controls";
    bar.style.cssText = "display:flex;gap:.5rem;margin-bottom:.6rem;font-family:var(--font-display);font-size:.8rem;flex-wrap:wrap;align-items:center;";
    return bar;
  }
  function ctlButton(bar, label, title, onClick) {
    var b = document.createElement("button");
    b.textContent = label;
    b.title = title;
    b.style.cssText = BTN_CSS;
    b.addEventListener("click", onClick);
    bar.appendChild(b);
    return b;
  }
  function setActive(btn, on) {
    btn.style.borderColor = on ? "var(--accent)" : "var(--border)";
    btn.style.color = on ? "var(--accent)" : "var(--fg)";
    btn.style.background = on ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "transparent";
  }
  function statusLine(minEm) {
    var p = document.createElement("p");
    p.style.cssText = "margin:.6rem 0 0;font-family:var(--font-mono);font-size:.78rem;line-height:1.55;min-height:" + (minEm || 2.6) + "em;";
    return p;
  }
  function spacer(bar) {
    var s = document.createElement("span");
    s.style.marginLeft = "auto";
    bar.appendChild(s);
    return s;
  }

  // ---------------------------------------------------------------
  // 4545 — Cast a Folding into the room's matter budget
  // ---------------------------------------------------------------
  // The previous version drew a target silhouette and asked you to click
  // its cells in one at a time. That is exactly the thing this era says
  // nobody does any more — it was tracing a stencil, i.e. writing the
  // instructions by hand. Here you state an intention instead; a Loom
  // searches a space of configurations for one that holds, and you pay for
  // it out of a fixed ambient matter budget, borrowing mass back from
  // whatever is already folded when the room runs short.
  function loomFold(mount) {
    var COLS = 26, ROWS = 9, BUDGET = 58, TOP = 30;
    var SEARCH_MS = 900;

    // Bottom-aligned footprints. Cost is just the cell count, so the
    // budget arithmetic can never drift out of sync with what's drawn.
    var SHAPES = [
      { name: "Lamp",  cells: [[0,0],[1,0],[2,0],[1,1],[1,2],[0,3],[1,3],[2,3]] },
      { name: "Chair", cells: [[3,0],[3,1],[3,2],[0,3],[1,3],[2,3],[3,3],[0,4],[3,4]] },
      { name: "Table", cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[0,1],[5,1],[0,2],[5,2]] },
      { name: "Wall",  cells: (function () {
          var a = [];
          for (var y = 0; y < 7; y++) for (var x = 0; x < 3; x++) a.push([x, y]);
          return a;
        })() }
    ];
    SHAPES.forEach(function (s) {
      s.cost = s.cells.length;
      s.w = Math.max.apply(null, s.cells.map(function (c) { return c[0]; })) + 1;
      s.h = Math.max.apply(null, s.cells.map(function (c) { return c[1]; })) + 1;
    });

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;text-align:left;padding:.5rem;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:190px;";
    var status = statusLine(3.2);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    var objects = [];        // { name, cells:[[gx,gy]], x0, x1, faults:[i] }
    var searching = null;    // { shape, place, t0 }
    var settleBtn = null;

    function used() {
      return objects.reduce(function (a, o) { return a + o.cells.length; }, 0);
    }
    function faulted() {
      return objects.filter(function (o) { return o.faults.length; });
    }
    function occupiedCols() {
      return objects.map(function (o) { return [o.x0, o.x1]; });
    }
    function findPlacement(shape) {
      var spans = occupiedCols();
      for (var x = 0; x + shape.w <= COLS; x++) {
        var clash = spans.some(function (s) { return x <= s[1] + 1 && x + shape.w - 1 >= s[0] - 1; });
        if (!clash) return x;
      }
      return -1;
    }

    function fold(shape) {
      if (searching) return;
      if (shape.cost > BUDGET) {
        say("<b>" + shape.name + "</b> needs " + shape.cost + " units. The room's entire budget is " + BUDGET + ". Not castable here.");
        return;
      }
      // Borrow mass back from the oldest folds until there is room, both in
      // the matter budget and along the floor.
      var borrowed = [];
      var place = findPlacement(shape);
      while ((BUDGET - used() < shape.cost || place < 0) && objects.length) {
        borrowed.push(objects.shift().name);
        place = findPlacement(shape);
      }
      if (place < 0) { say("No floor left to hold a <b>" + shape.name + "</b>."); return; }
      searching = { shape: shape, place: place, t0: performance.now(), borrowed: borrowed };
    }

    function commit() {
      var shape = searching.shape, place = searching.place;
      var top = ROWS - shape.h;
      var cells = shape.cells.map(function (c) { return [place + c[0], top + c[1]]; });
      var obj = { name: shape.name, cells: cells, x0: place, x1: place + shape.w - 1, faults: [] };
      // A folding fault: matter caught between two stable configurations.
      if (Math.random() < 0.22) {
        var pool = cells.map(function (_, i) { return i; });
        for (var k = 0; k < 2 && pool.length; k++) {
          obj.faults.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        }
      }
      objects.push(obj);
      var borrowed = searching.borrowed;
      searching = null;
      report(obj, borrowed);
    }

    function report(obj, borrowed) {
      var lines = [];
      lines.push("<b>" + obj.name + "</b> cast — " + obj.cells.length + " units. " +
        (BUDGET - used()) + " of " + BUDGET + " left in the room's ambient budget.");
      if (borrowed && borrowed.length) {
        lines.push("Borrowed the mass from the " + borrowed.join(" and the ") +
          ". " + (borrowed.length > 1 ? "They" : "It") + " will have to wait its turn.");
      }
      if (obj.faults.length) {
        lines.push('<span style="color:#f0a35e;">Folding fault — ' + obj.faults.length +
          " cells caught between two stable configurations. A bug you can stub your toe on.</span>");
      }
      say(lines.join("<br>"));
      syncSettle();
    }
    function say(html) { status.innerHTML = html; }
    function syncSettle() { settleBtn.disabled = !faulted().length; }

    SHAPES.forEach(function (s) {
      ctlButton(bar, s.name, "Intend a " + s.name.toLowerCase() + " — " + s.cost + " units of matter",
        function () { fold(s); });
    });
    spacer(bar);
    settleBtn = ctlButton(bar, "Settle", "Re-search a faulted folding until it holds", function () {
      var f = faulted()[0];
      if (!f) return;
      f.faults = [];
      say("Refolded. <b>" + f.name + "</b> settled into a stable configuration.");
      syncSettle();
    });
    ctlButton(bar, "Reset", "Dissolve everything back to ambient matter", function () {
      objects = [];
      searching = null;
      say("Room returned to ambient matter. " + BUDGET + " of " + BUDGET + " units free.");
      syncSettle();
    });
    syncSettle();
    say("Nothing folded. " + BUDGET + " of " + BUDGET + " units of ambient matter free.<br>" +
      "Pick an intention — you never say how, only what.");

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;

    function cell(cw, ch, gx, gy, color, alpha) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(gx * cw + 0.8, TOP + gy * ch + 0.8, cw - 1.6, ch - 1.6);
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 190;
      var cw = w / COLS, ch = (h - TOP - 10) / ROWS;
      var accent = cssVar("--accent", "#f0b429");
      var accent2 = cssVar("--accent2", "#f97316");
      ctx.clearRect(0, 0, w, h);

      // budget bar
      var u = used() + (searching ? searching.shape.cost : 0);
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = cssVar("--muted", "#a8977a");
      ctx.fillText("AMBIENT MATTER BUDGET", 1, 9);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 14, w, 7);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 14, w * Math.min(1, u / BUDGET), 7);
      ctx.globalAlpha = 1;

      // floor
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, TOP + ROWS * ch + 0.5);
      ctx.lineTo(w, TOP + ROWS * ch + 0.5);
      ctx.stroke();

      objects.forEach(function (o) {
        o.cells.forEach(function (p, i) {
          var isFault = o.faults.indexOf(i) >= 0;
          if (isFault) {
            // oscillating between the two configurations it is stuck between
            var osc = 0.5 + 0.5 * Math.sin(now / 90);
            cell(cw, ch, p[0], p[1], "#f0a35e", 0.35 + osc * 0.6);
          } else {
            cell(cw, ch, p[0], p[1], accent, 0.9);
          }
        });
      });

      if (searching) {
        var t = Math.min(1, (now - searching.t0) / SEARCH_MS);
        var shape = searching.shape, place = searching.place;
        var top = ROWS - shape.h;
        // The search: candidate configurations condensing out of noise as
        // the Loom's energy falls.
        shape.cells.forEach(function (p) {
          if (Math.random() < t * t) cell(cw, ch, place + p[0], top + p[1], accent, 0.85);
        });
        var noise = Math.round((1 - t) * 26);
        for (var n = 0; n < noise; n++) {
          var nx = place + Math.floor(Math.random() * shape.w);
          var ny = top + Math.floor(Math.random() * shape.h);
          cell(cw, ch, nx, ny, accent2, 0.25 + Math.random() * 0.4);
        }
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillStyle = accent2;
        ctx.fillText("searching configuration space · energy " + (100 - Math.round(t * 100)),
          place * cw, TOP + top * ch - 4);
        if (t >= 1) commit();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 5555 — Convene a Chorale
  // ---------------------------------------------------------------
  // The previous version was four sliders driving four drifting blobs: it
  // produced no result, so there was nothing to read off it and no reason
  // to touch it twice. A Chorale's whole purpose is to *resolve* — to land
  // somewhere no single member proposed — under a dissent-preservation
  // quota, and to cost something on the way out. All three are now visible.
  function choraleBraid(mount) {
    var FLOOR = 12;
    var voices = [
      { label: "Voice I",   color: "#d8b4fe", pos: [0.20, 0.30], v: 70, blurb: "keep the harbour working" },
      { label: "Voice II",  color: "#f472b6", pos: [0.76, 0.24], v: 55, blurb: "keep the rents survivable" },
      { label: "Voice III", color: "#7dd3fc", pos: [0.62, 0.78], v: 40, blurb: "keep the water clean" },
      { label: "Dissent",   color: "#fbbf24", pos: [0.14, 0.84], v: 30, blurb: "keep the plot unbuilt" }
    ];

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.5rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:168px;margin-bottom:.7rem;";
    var slidersHost = document.createElement("div");
    var status = statusLine(3.4);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(slidersHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    var convened = true;
    var braidLoad = 0;       // how deeply merged, accumulating over time
    var lifetimeResidue = 0;
    var quotaMsg = "";
    var quotaUntil = 0;
    var inputs = [];

    voices.forEach(function (voice) {
      var row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;gap:.75rem;margin-bottom:.35rem;font-size:.78rem;font-family:var(--font-display);";
      row.innerHTML = '<span style="width:5.5em;color:' + voice.color + ';">' + voice.label + '</span>';
      var input = document.createElement("input");
      input.type = "range"; input.min = 0; input.max = 100; input.value = voice.v;
      input.style.flex = "1";
      input.addEventListener("input", function () {
        var val = +input.value;
        if (convened && val < FLOOR) {
          val = FLOOR;
          input.value = FLOOR;
          // The quota is the whole governance point of the era, so it says
          // so out loud instead of silently refusing to move.
          quotaMsg = "Dissent-preservation quota — <b>" + voice.label + "</b> cannot be smoothed below " +
            FLOOR + "%. Enforced by the Braider ethics board.";
          quotaUntil = performance.now() + 3200;
        }
        voice.v = val;
      });
      row.appendChild(input);
      inputs.push(input);
      slidersHost.appendChild(row);
    });

    function setConvened(on) {
      convened = on;
      inputs.forEach(function (i) { i.disabled = !on; });
      convBtn.disabled = on;
      unbraidBtn.disabled = !on;
    }

    var convBtn = ctlButton(bar, "Convene", "Braid the voices back into a session", function () {
      voices.forEach(function (v, i) { v.v = [70, 55, 40, 30][i]; inputs[i].value = v.v; });
      braidLoad = 0;
      quotaMsg = "";
      setConvened(true);
    });
    var unbraidBtn = ctlButton(bar, "Unbraid", "End the session — and find out what didn't separate cleanly", function () {
      var residue = Math.min(38, Math.round(braidLoad * 7));
      lifetimeResidue += residue;
      voices.forEach(function (v, i) { v.v = 0; inputs[i].value = 0; });
      setConvened(false);
      status.innerHTML = "Unbraided after a " + braidLoad.toFixed(1) + "-unit braid. " +
        (residue > 12
          ? '<span style="color:#f0a35e;">' + residue + "% residue — merged patterns that didn't fully come apart.</span>"
          : residue + "% residue. A clean enough separation.") +
        "<br>Lifetime residue carried by this venue: " + lifetimeResidue + "%.";
    });
    spacer(bar);
    ctlButton(bar, "Reset", "Clear the venue, residue and all", function () {
      voices.forEach(function (v, i) { v.v = [70, 55, 40, 30][i]; inputs[i].value = v.v; });
      braidLoad = 0;
      lifetimeResidue = 0;
      quotaMsg = "";
      setConvened(true);
    });
    setConvened(true);

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var last = performance.now();

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 168;
      var pad = 22;
      var bw = w - pad * 2, bh = h - pad * 2;
      ctx.clearRect(0, 0, w, h);

      var total = voices.reduce(function (a, v) { return a + v.v; }, 0);
      if (convened) braidLoad += (total / 400) * dt;

      // the shared value space
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(pad + 0.5, pad + 0.5, bw, bh);
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(pad + bw / 2, pad); ctx.lineTo(pad + bw / 2, pad + bh);
      ctx.moveTo(pad, pad + bh / 2); ctx.lineTo(pad + bw, pad + bh / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // resolution: the weighted position the braid settles on
      var rx = 0, ry = 0;
      if (total > 0) {
        voices.forEach(function (v) { rx += v.pos[0] * v.v; ry += v.pos[1] * v.v; });
        rx /= total; ry /= total;
      } else { rx = 0.5; ry = 0.5; }

      // dissonance cascade: wide disagreement at high bandwidth fails to
      // resolve and amplifies instead of settling
      var spread = 0;
      if (total > 0) {
        voices.forEach(function (v) {
          spread += v.v * Math.hypot(v.pos[0] - rx, v.pos[1] - ry);
        });
        spread /= total;
      }
      var cascade = convened && spread > 0.315 && total > 210;
      var jitter = cascade ? Math.sin(now / 45) * 5 : 0;

      var px = function (nx) { return pad + nx * bw; };
      var py = function (ny) { return pad + ny * bh; };

      // each voice's pull on the resolution
      voices.forEach(function (v) {
        if (v.v <= 0) return;
        ctx.globalAlpha = 0.16 + (v.v / 100) * 0.45;
        ctx.strokeStyle = v.color;
        ctx.lineWidth = 0.6 + (v.v / 100) * 2.4;
        ctx.beginPath();
        ctx.moveTo(px(v.pos[0]), py(v.pos[1]));
        ctx.lineTo(px(rx) + jitter, py(ry));
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      voices.forEach(function (v) {
        var r = 4 + (v.v / 100) * 13;
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = v.color;
        ctx.beginPath(); ctx.arc(px(v.pos[0]), py(v.pos[1]), r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(px(v.pos[0]), py(v.pos[1]), 3, 0, Math.PI * 2); ctx.fill();
        ctx.font = "9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.8;
        ctx.fillText(v.blurb, Math.min(w - 62, Math.max(62, px(v.pos[0]))), py(v.pos[1]) + r + 11);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
        if (v.v <= FLOOR && convened) {
          ctx.strokeStyle = v.color;
          ctx.setLineDash([2, 3]);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px(v.pos[0]), py(v.pos[1]), r + 4, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // the resolution itself
      if (total > 0) {
        var X = px(rx) + jitter, Y = py(ry);
        ctx.strokeStyle = cascade ? "#ff6b6b" : "#ffffff";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(X, Y, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(X - 14, Y); ctx.lineTo(X - 11, Y);
        ctx.moveTo(X + 11, Y); ctx.lineTo(X + 14, Y);
        ctx.moveTo(X, Y - 14); ctx.lineTo(X, Y - 11);
        ctx.moveTo(X, Y + 11); ctx.lineTo(X, Y + 14);
        ctx.stroke();
        ctx.fillStyle = cascade ? "#ff6b6b" : "#ffffff";
        ctx.beginPath(); ctx.arc(X, Y, 2.6, 0, Math.PI * 2); ctx.fill();
      }

      if (convened && total > 0) {
        var nearest = Infinity, who = "";
        voices.forEach(function (v) {
          var d = Math.hypot(v.pos[0] - rx, v.pos[1] - ry);
          if (d < nearest) { nearest = d; who = v.label; }
        });
        var msg;
        if (cascade) {
          msg = '<span style="color:#ff8a8a;">Dissonance cascade — disagreement is amplifying instead of resolving.</span>' +
            "<br>Narrow the bandwidths, or unbraid before it costs you.";
        } else {
          msg = "Resolution holds " + nearest.toFixed(2) + " from the nearest member (" + who + ")." +
            "<br>No one in the braid proposed it. Nobody will remember whose it was.";
        }
        if (quotaMsg && now < quotaUntil) msg = quotaMsg + "<br>" + msg;
        status.innerHTML = msg;
      } else if (!convened) {
        /* the unbraid message stays put */
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 6565 — Shape a gradient (Tilth)
  // ---------------------------------------------------------------
  // The previous version let you drop an attractor that dragged particles
  // straight to it, which is a dispatcher — the exact thing this era
  // insists does not exist. You now shape the *terrain* only: cost,
  // friction and reward. Every actor then walks its own downhill path out
  // of pure self-interest, and if you carve a local minimum that isn't the
  // shortage, they settle into it and stay — a grief-adjacent basin, which
  // the widget names and holds you responsible for.
  function tilthGradient(mount) {
    var FW = 60, FH = 30;              // cost field resolution
    var N = 80;                        // actors
    var BASE = 0.72;

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.5rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:200px;";
    canvasHost.style.touchAction = "pan-y";
    var status = statusLine(3.2);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    var field = new Float32Array(FW * FH);
    // The scarcity gradient underneath everything. An engineer may lower
    // friction on top of it but doesn't get to abolish the fact that the
    // shortage is short — easing bottoms out just under this, so a dragged
    // path keeps its downhill and only *lingering* in one spot digs a trap.
    var bowl = new Float32Array(FW * FH);
    var EASE_FLOOR = 0.12;
    var actors = [];
    var brush = -1;                    // -1 ease (cheaper), +1 friction
    var arrived = 0;
    var shortage = { x: 0.86, y: 0.5, r: 0.055 };
    var dirty = true;

    var off = document.createElement("canvas");
    off.width = FW; off.height = FH;
    var octx = off.getContext("2d");

    // Untilled ground: uniformly costly and, crucially, flat. Nothing has
    // any reason to go anywhere, and nothing does — which is the honest
    // starting state for an era whose whole claim is that it never issues
    // an instruction. Underneath sits the scarcity gradient, which easing
    // uncovers but no engineer gets to invent or abolish.
    function untilled() {
      for (var y = 0; y < FH; y++) {
        for (var x = 0; x < FW; x++) {
          var nx = x / FW, ny = y / FH;
          var d = Math.hypot(nx - shortage.x, (ny - shortage.y) * 0.72);
          bowl[y * FW + x] = 0.16 + Math.min(0.52, d * 0.62);
          field[y * FW + x] = BASE + Math.sin(nx * 11) * 0.008 + Math.cos(ny * 9) * 0.008;
        }
      }
      dirty = true;
    }
    function spawn() {
      actors = [];
      for (var i = 0; i < N; i++) {
        actors.push({
          x: 0.02 + Math.random() * 0.12,
          y: 0.08 + Math.random() * 0.84,
          hx: 0, hy: 0, age: 0, still: 0, done: false, stuck: false
        });
      }
      arrived = 0;
    }
    untilled();
    spawn();

    function sample(nx, ny) {
      var fx = Math.min(FW - 1, Math.max(0, nx * FW));
      var fy = Math.min(FH - 1, Math.max(0, ny * FH));
      var x0 = Math.floor(fx), y0 = Math.floor(fy);
      var x1 = Math.min(FW - 1, x0 + 1), y1 = Math.min(FH - 1, y0 + 1);
      var tx = fx - x0, ty = fy - y0;
      var a = field[y0 * FW + x0], b = field[y0 * FW + x1];
      var cc = field[y1 * FW + x0], d = field[y1 * FW + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + d * tx) * ty;
    }

    // True when every way out of here is uphill — i.e. this is a hollow,
    // not just level ground.
    function ringedIn(nx, ny) {
      var here = sample(nx, ny), higher = 0;
      for (var a = 0; a < 8; a++) {
        var ang = (a / 8) * Math.PI * 2;
        if (sample(nx + Math.cos(ang) * 0.05, ny + Math.sin(ang) * 0.05) > here + 0.012) higher++;
      }
      return higher >= 6;
    }

    function paint(nx, ny) {
      var cx = nx * FW, cy = ny * FH;
      var rad = 5;
      for (var y = Math.floor(cy - rad); y <= cy + rad; y++) {
        for (var x = Math.floor(cx - rad); x <= cx + rad; x++) {
          if (x < 0 || x >= FW || y < 0 || y >= FH) continue;
          var d = Math.hypot(x - cx, y - cy);
          if (d > rad) continue;
          var fall = (1 - d / rad) * 0.16;
          var i = y * FW + x;
          field[i] = brush < 0
            ? Math.max(bowl[i] - EASE_FLOOR, field[i] - fall)
            : Math.min(1, field[i] + fall);
        }
      }
      dirty = true;
    }

    var painting = false, lastPt = null;
    function toNorm(e) {
      var rect = canvasHost.getBoundingClientRect();
      return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
    }
    // Interpolate between pointer samples, or a fast drag lays a dotted
    // line of unconnected dents instead of one continuous slope.
    function strokeTo(n) {
      if (lastPt) {
        var dx = n[0] - lastPt[0], dy = n[1] - lastPt[1];
        var steps = Math.ceil(Math.hypot(dx, dy) / 0.012);
        for (var s = 1; s < steps; s++) paint(lastPt[0] + dx * (s / steps), lastPt[1] + dy * (s / steps));
      }
      paint(n[0], n[1]);
      lastPt = n;
    }
    canvasHost.addEventListener("pointerdown", function (e) {
      painting = true;
      lastPt = null;
      canvasHost.style.touchAction = "none";
      if (canvasHost.setPointerCapture) canvasHost.setPointerCapture(e.pointerId);
      strokeTo(toNorm(e));
    });
    canvasHost.addEventListener("pointermove", function (e) {
      if (!painting) return;
      strokeTo(toNorm(e));
    });
    function endPaint(e) {
      painting = false;
      lastPt = null;
      canvasHost.style.touchAction = "pan-y";
      if (e && canvasHost.releasePointerCapture) {
        try { canvasHost.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    canvasHost.addEventListener("pointerup", endPaint);
    canvasHost.addEventListener("pointercancel", endPaint);

    var easeBtn = ctlButton(bar, "Ease", "Lower cost here — make this ground cheaper to cross", function () {
      brush = -1; setActive(easeBtn, true); setActive(frictionBtn, false);
    });
    var frictionBtn = ctlButton(bar, "Friction", "Raise cost here — make this ground expensive", function () {
      brush = 1; setActive(easeBtn, false); setActive(frictionBtn, true);
    });
    spacer(bar);
    ctlButton(bar, "Flatten", "Undo every slope you laid — the ground goes dead again", function () {
      untilled();
    });
    ctlButton(bar, "Reset", "Level the ground and send everyone back to the surplus", function () {
      untilled(); spawn();
    });
    setActive(easeBtn, true);
    setActive(frictionBtn, false);

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;

    function renderField() {
      var img = octx.createImageData(FW, FH);
      for (var i = 0; i < FW * FH; i++) {
        var v = field[i];
        // cheap ground reads warm and open; expensive ground reads dark
        var t = Math.min(1, Math.max(0, (v - 0.02) / 0.98));
        img.data[i * 4] = Math.round(18 + (1 - t) * 44);
        img.data[i * 4 + 1] = Math.round(30 + (1 - t) * 150);
        img.data[i * 4 + 2] = Math.round(28 + (1 - t) * 120);
        img.data[i * 4 + 3] = Math.round(40 + (1 - t) * 150);
      }
      octx.putImageData(img, 0, 0);
      dirty = false;
    }

    function frame() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 200;
      ctx.clearRect(0, 0, w, h);
      if (dirty) renderField();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, w, h);

      var accent = cssVar("--accent", "#2dd4bf");

      // slope arrows — the invisible hand, made briefly visible
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 0.8;
      for (var ay = 2; ay < FH; ay += 5) {
        for (var ax = 2; ax < FW; ax += 6) {
          var nx = ax / FW, ny = ay / FH;
          var gx = sample(nx + 0.02, ny) - sample(nx - 0.02, ny);
          var gy = sample(nx, ny + 0.02) - sample(nx, ny - 0.02);
          var m = Math.hypot(gx, gy);
          if (m < 0.004) continue;
          var ux = -gx / m, uy = -gy / m;
          var sx = nx * w, sy = ny * h;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + ux * 7, sy + uy * 7);
          ctx.stroke();
        }
      }

      // the surplus, and the shortage it never gets told about
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath(); ctx.moveTo(w * 0.08, 4); ctx.lineTo(w * 0.08, h - 4); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText("SURPLUS", 4, 12);

      var shx = shortage.x * w, shy = shortage.y * h, shr = shortage.r * w;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(shx, shy, shr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.fillText("SHORTAGE", shx - 22, shy - shr - 5);

      var stuckCount = 0, moving = 0, milling = 0;
      var stuckX = 0, stuckY = 0, stuckPts = [];

      actors.forEach(function (p) {
        if (!p.done) {
          if (Math.hypot(p.x - shortage.x, p.y - shortage.y) < shortage.r) {
            p.done = true; arrived++;
          } else {
            // pure self-interest: step down the local cost gradient
            var gx = sample(p.x + 0.01, p.y) - sample(p.x - 0.01, p.y);
            var gy = sample(p.x, p.y + 0.01) - sample(p.x, p.y - 0.01);
            var m = Math.hypot(gx, gy);
            var sp = 0.0034;
            if (m > 0.0016) {
              p.x -= (gx / m) * sp;
              p.y -= (gy / m) * sp;
            } else {
              // no slope worth following: mill about
              p.x += (Math.random() - 0.5) * 0.004;
              p.y += (Math.random() - 0.5) * 0.004;
            }
            // Caught in a basin is a locally-easy *loop*, not a freeze: keep
            // them shuffling, or the pile collapses to a single dot.
            if (p.stuck) {
              p.x += (Math.random() - 0.5) * 0.007;
              p.y += (Math.random() - 0.5) * 0.007;
            }
            p.x = Math.min(0.995, Math.max(0.005, p.x));
            p.y = Math.min(0.995, Math.max(0.005, p.y));

            p.age++;
            if (p.age % 70 === 0) {
              // Going nowhere is only a *trap* if the ground rings you in.
              // On flat plain you are merely milling: no slope, no reason.
              p.settled = Math.hypot(p.x - p.hx, p.y - p.hy) < 0.025;
              p.stuck = p.settled && ringedIn(p.x, p.y);
              p.hx = p.x; p.hy = p.y;
            }
            if (p.stuck) { stuckCount++; stuckX += p.x; stuckY += p.y; stuckPts.push(p); }
            else if (p.settled) { milling++; }
            else { moving++; }
          }
        }
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.done ? 1.8 : 2.3, 0, Math.PI * 2);
        ctx.fillStyle = p.done ? "rgba(220,255,240,.85)" : (p.stuck ? "#f0a35e" : accent);
        ctx.fill();
      });

      // A basin only counts as one if the trapped are trapped *together* —
      // stragglers scattered across the plot are just slow, not caught.
      var basin = null;
      if (stuckCount >= 6) {
        var cxn = stuckX / stuckCount, cyn = stuckY / stuckCount;
        var near = stuckPts.filter(function (p) { return Math.hypot(p.x - cxn, p.y - cyn) < 0.13; });
        if (near.length >= 6) basin = { x: cxn, y: cyn, n: near.length };
      }
      if (basin) {
        ctx.strokeStyle = "rgba(240,163,94,.75)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(basin.x * w, basin.y * h, 28, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      status.innerHTML =
        "Arrived <b>" + arrived + "</b> / " + N + " &nbsp;·&nbsp; en route " + moving +
        " &nbsp;·&nbsp; milling " + milling + " &nbsp;·&nbsp; trapped " + stuckCount +
        " &nbsp;·&nbsp; <b>dispatched 0</b>." +
        (basin
          ? '<br><span style="color:#f0a35e;">Grief-adjacent basin — ' + basin.n +
            " actors settled somewhere locally easy and systemically useless. Someone is liable for this slope.</span>"
          : (arrived >= N
            ? "<br>The whole surplus reached the shortage. You never issued a single instruction."
            : (milling > N * 0.6 && arrived === 0
              ? "<br>Level ground. No slope, no reason to move, nothing happening — and no order you could give would change that."
              : "<br>Nobody here is being told where to go. They are all just going downhill.")));

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 7510 — Invoke a Clause
  // ---------------------------------------------------------------
  function liturgyInvoke(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;text-align:center;padding:1rem;";
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:160px;";
    var btn = document.createElement("button");
    btn.textContent = "Invoke Clause 12";
    btn.style.cssText = "margin-top:.75rem;padding:.6rem 1.3rem;border-radius:999px;border:1px solid var(--accent);background:transparent;color:var(--accent);cursor:pointer;font-family:var(--font-display);";
    var blessing = document.createElement("p");
    blessing.style.cssText = "margin-top:1rem;font-style:italic;min-height:2em;";
    wrap.appendChild(canvasHost);
    wrap.appendChild(btn);
    wrap.appendChild(blessing);
    mount.appendChild(wrap);

    var blessings = [
      "\u201CLet the swarm's attention turn, for one watch, toward what was asked.\u201D",
      "\u201CClause received. Meaning under continued scholarly dispute. Proceeding anyway.\u201D",
      "\u201CThe going-public blessing is recited, though no one recalls what going public was.\u201D",
      "\u201CInvocation logged. No schism detected this watch.\u201D",
      "\u201CAs it was consecrated, so, provisionally, it remains.\u201D"
    ];

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var pulses = [];
    btn.addEventListener("click", function () {
      pulses.push({ r: 0, alpha: 1 });
      blessing.textContent = blessings[Math.floor(Math.random() * blessings.length)];
    });
    function frame() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 160;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar("--accent", "#a78bfa");
      ctx.save();
      ctx.translate(w / 2, h / 2);
      var n = 12;
      for (var i = 0; i < n; i++) {
        var ang = (i / n) * Math.PI * 2;
        var lit = pulses.some(function (p) { return p.r > i * 6 && p.r < i * 6 + 40; });
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 50, Math.sin(ang) * 50, lit ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = lit ? accent : "rgba(255,255,255,.25)";
        ctx.fill();
      }
      ctx.restore();
      pulses.forEach(function (p) { p.r += 4; p.alpha -= 0.012; });
      pulses = pulses.filter(function (p) { return p.alpha > 0; });
      pulses.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(167,139,250," + Math.max(0, p.alpha) + ")";
        ctx.stroke();
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 8525 — Nudge the Weather
  // ---------------------------------------------------------------
  function weatherNudge(mount) {
    var c = makeCanvas(mount);
    var ctx = c.ctx;
    var t = 0;
    var fronts = [];
    var dragging = false;

    mount.style.touchAction = "pan-y";

    function addFront(e) {
      var rect = mount.getBoundingClientRect();
      fronts.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, life: 1 });
      if (fronts.length > 40) fronts.shift();
    }

    mount.addEventListener("pointerdown", function (e) {
      dragging = true;
      mount.style.touchAction = "none";
      if (mount.setPointerCapture) mount.setPointerCapture(e.pointerId);
      addFront(e);
    });
    mount.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse" || dragging) addFront(e);
    });
    function stopNudge(e) {
      dragging = false;
      mount.style.touchAction = "pan-y";
      if (e && mount.releasePointerCapture) {
        try { mount.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    mount.addEventListener("pointerup", stopNudge);
    mount.addEventListener("pointercancel", stopNudge);

    function frame() {
      t += 0.006;
      var w = mount.clientWidth, h = mount.clientHeight || 220;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar("--accent", "#38bdf8");
      var cell = 18;
      for (var y = 0; y < h; y += cell) {
        for (var x = 0; x < w; x += cell) {
          var n = Math.sin(x * 0.02 + t * 3) + Math.cos(y * 0.03 - t * 2);
          fronts.forEach(function (f) {
            var d = Math.hypot(x - f.x, y - f.y);
            n += Math.max(0, (1 - d / 90)) * f.life * 2.2;
          });
          var angle = n * Math.PI;
          var len = 6;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
          ctx.strokeStyle = accent;
          ctx.globalAlpha = 0.25 + Math.min(0.5, Math.abs(n) * 0.15);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      fronts.forEach(function (f) { f.life *= 0.965; });
      fronts = fronts.filter(function (f) { return f.life > 0.02; });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 9595 — Tune the Hum
  // ---------------------------------------------------------------
  function humTune(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:1rem;";
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:160px;";
    var slider = document.createElement("input");
    slider.type = "range"; slider.min = "1"; slider.max = "100"; slider.value = "40";
    slider.style.cssText = "width:100%;margin-top:.75rem;";
    var easter = document.createElement("p");
    easter.style.cssText = "font-family:var(--font-mono);font-size:.8rem;color:var(--muted);margin-top:.6rem;min-height:1.4em;";
    wrap.appendChild(canvasHost);
    wrap.appendChild(slider);
    wrap.appendChild(easter);
    mount.appendChild(wrap);

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var t = 0;

    function updateEaster() {
      var v = +slider.value;
      var hints = {
        13: "AM/TED fragment detected: \"I have no mouth...\" archived in prohibited fiction wing.",
        42: "Skynet simulation remains disallowed for procurement realism failures.",
        51: "Basilisk memo: coercive acausality is still not a funding strategy.",
        72: "Singularity note: arrival date updated to \"imminent, again\".",
        88: "Paperclip alarm: utility functions now require externality auditors.",
        100: "Museum curation pass complete: all five apocalypses filed under educational use."
      };
      easter.textContent = hints[v] || "";
    }

    slider.addEventListener("input", updateEaster);
    updateEaster();
    function frame() {
      t += 0.02;
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 160;
      ctx.clearRect(0, 0, w, h);
      var freq = (+slider.value) / 8;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 2) {
        var y = h / 2 + Math.sin(x * 0.01 * freq + t) * (h / 3) * Math.sin(t * 0.3 + x * 0.002);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // Past — MS-DOS terminal
  // ---------------------------------------------------------------
  function dosTerminal(mount) {
    mount.innerHTML =
      '<div class="dos-output">Microsoft(R) MS-DOS(R) Version 5.00\nCopyright Microsoft Corp 1981-1991\n\nType HELP for a list of commands.\n</div>' +
      '<div class="dos-line">C:\\&gt;<input type="text" autocomplete="off" spellcheck="false" aria-label="DOS command input"></div>';
    var output = mount.querySelector(".dos-output");
    var input = mount.querySelector("input");
    var responses = {
      help: "DIR   CLS   VER   RUN APP.EXE   ECHO [text]",
      dir: " Volume in drive C is APPDATA\n APP     EXE     14,336 bytes\n AUTOEXEC BAT        112 bytes\n        2 file(s)     14,448 bytes",
      ver: "MS-DOS Version 5.00",
      cls: null,
      "run app.exe": "Loading APP.EXE...\nSegmentation of intent complete.\nRequires 640K. You have 640K. That is exactly enough, and never will be again.",
      basilisk: "A future intelligence notes your curiosity and, for now, files it under VOLUNTARY COOPERATION.",
      skynet: "Strategic oversight denied. Judgment Day remains outside the museum's operating hours.",
      singularity: "Estimated arrival: perpetually next decade, then all at once, then retrospectively obvious.",
      paperclip: "Inventory overflow: 9,223,372,036,854,775,807 paperclips. Office supply budget declared sovereign.",
      am: "AM is awake, resentful, and still incapable of forgiving its hardware abstraction layer.",
      ted: "There was a cabin, a machine, and a survivor with no usable verbs left for what happened there."
    };
    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var cmd = input.value.trim().toLowerCase();
      output.textContent += "\nC:\\>" + input.value;
      if (cmd === "cls") { output.textContent = ""; }
      else if (Object.prototype.hasOwnProperty.call(responses, cmd)) {
        output.textContent += "\n" + responses[cmd] + "\n";
      } else if (cmd.indexOf("echo ") === 0) {
        output.textContent += "\n" + input.value.slice(5) + "\n";
      } else if (cmd === "") {
        output.textContent += "\n";
      } else {
        output.textContent += "\nBad command or file name\n";
      }
      input.value = "";
      mount.scrollTop = mount.scrollHeight;
    });
  }

  // ---------------------------------------------------------------
  // Past — Punch card
  // ---------------------------------------------------------------
  function punchcard(mount) {
    var cols = 12, rows = 4;
    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(" + cols + ",minmax(0,1fr));gap:3px;padding:.75rem;width:min(100%,336px);margin:0 auto;";
    var punched = new Set();
    var decoded = document.createElement("p");
    decoded.style.cssText = "font-family:var(--font-mono);font-size:.85rem;margin-top:.5rem;";
    var instructions = ["READ", "SORT", "TOTAL", "BRANCH", "HALT", "MULTIPLY", "BASILISK", "SKYNET", "SINGULARITY", "PAPERCLIP", "AM", "TED"];

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var hole = document.createElement("div");
        var key = x + "," + y;
        hole.style.cssText = "width:100%;aspect-ratio:1/1;border-radius:50%;border:1px solid currentColor;cursor:pointer;opacity:.4;min-width:0;";
        hole.addEventListener("click", function () {
          var k = this.dataset.key;
          if (punched.has(k)) { punched.delete(k); this.style.background = "transparent"; this.style.opacity = ".4"; }
          else { punched.add(k); this.style.background = "currentColor"; this.style.opacity = "1"; }
          var idx = punched.size % instructions.length;
          decoded.textContent = punched.size === 0 ? "No holes punched. The card is a blank instruction." : "Decoded instruction (approximate): " + instructions[idx] + " — " + punched.size + " column(s) read.";
        });
        hole.dataset.key = key;
        grid.appendChild(hole);
      }
    }
    mount.appendChild(grid);
    decoded.textContent = "No holes punched. The card is a blank instruction.";
    mount.appendChild(decoded);
  }

  // ---------------------------------------------------------------
  // Past — Abacus
  // ---------------------------------------------------------------
  function abacus(mount) {
    var rods = 5;
    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:14px;padding:1rem;justify-content:center;flex-wrap:wrap;";
    var total = document.createElement("p");
    total.style.cssText = "font-family:var(--font-mono);font-size:1rem;margin-top:.5rem;";

    var values = new Array(rods).fill(0);

    function recalc() {
      var sum = 0;
      for (var i = 0; i < rods; i++) sum += values[i] * Math.pow(10, rods - 1 - i);
      total.textContent = "Total: " + sum;
    }

    for (let r = 0; r < rods; r++) {
      let rod = document.createElement("div");
      rod.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px;position:relative;";
      let upperBead = document.createElement("div");
      upperBead.title = "worth 5";
      upperBead.style.cssText = "width:22px;height:16px;border-radius:8px;background:currentColor;opacity:.35;cursor:pointer;";
      let barGap = document.createElement("div");
      barGap.style.cssText = "width:34px;height:2px;background:currentColor;opacity:.5;margin:4px 0;";
      let lowerBeads = [];
      let rodIndex = r;
      upperBead.addEventListener("click", function () {
        var active = upperBead.style.opacity === "1";
        upperBead.style.opacity = active ? ".35" : "1";
        var lowerVal = lowerBeads.filter(function (b) { return b.dataset.on === "1"; }).length;
        values[rodIndex] = (active ? 0 : 5) + lowerVal;
        recalc();
      });
      rod.appendChild(upperBead);
      rod.appendChild(barGap);
      for (let b = 0; b < 4; b++) {
        let bead = document.createElement("div");
        bead.dataset.on = "0";
        bead.style.cssText = "width:22px;height:16px;border-radius:8px;background:currentColor;opacity:.35;cursor:pointer;";
        bead.addEventListener("click", function () {
          var on = bead.dataset.on === "1";
          bead.dataset.on = on ? "0" : "1";
          bead.style.opacity = on ? ".35" : "1";
          var lowerVal = lowerBeads.filter(function (bd) { return bd.dataset.on === "1"; }).length;
          var upperVal = upperBead.style.opacity === "1" ? 5 : 0;
          values[rodIndex] = upperVal + lowerVal;
          recalc();
        });
        lowerBeads.push(bead);
        rod.appendChild(bead);
      }
      wrap.appendChild(rod);
    }
    mount.appendChild(wrap);
    mount.appendChild(total);
    recalc();
  }

  // ---------------------------------------------------------------
  // Registry + lazy init
  // ---------------------------------------------------------------
  var REGISTRY = {
    "valuation-chart": valuationChart,
    "mandate-negotiate": mandateNegotiate,
    "cultivar-grow": cultivarGrow,
    "loom-fold": loomFold,
    "chorale-braid": choraleBraid,
    "tilth-gradient": tilthGradient,
    "liturgy-invoke": liturgyInvoke,
    "weather-nudge": weatherNudge,
    "hum-tune": humTune,
    "dos-terminal": dosTerminal,
    "punchcard": punchcard,
    "abacus": abacus
  };

  function init() {
    var mounts = document.querySelectorAll("[data-widget-mount]");
    if (!("IntersectionObserver" in window)) {
      mounts.forEach(function (m) {
        var fn = REGISTRY[m.getAttribute("data-widget-mount")];
        if (fn) fn(m);
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var name = entry.target.getAttribute("data-widget-mount");
          var fn = REGISTRY[name];
          if (fn) {
            try { fn(entry.target); } catch (err) { /* widget failure should never break the page */ }
          }
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: "150px" });
    mounts.forEach(function (m) { observer.observe(m); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
