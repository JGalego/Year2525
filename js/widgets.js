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
    var intensity = 0, target = 0;
    var settleTimer = null;
    var isCoarsePointer = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;
    var phase = 0;

    var sectors = [
      { name: "Messaging", base: 0.9, trend: 0.11, amp: 0.08 },
      { name: "Feed", base: 1.0, trend: 0.17, amp: 0.14 },
      { name: "Agentic", base: 0.76, trend: 0.24, amp: 0.2 }
    ];

    function regimeNoise(t, seed) {
      var a = Math.sin(t * 10 + seed * 2.1) * 0.04;
      var b = Math.sin(t * 24 + seed * 5.7) * 0.018;
      var c = Math.cos(t * 4 + seed) * 0.03;
      return a + b + c;
    }

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

    function frame() {
      intensity += (target - intensity) * 0.06;
      phase += 0.0045 + intensity * 0.0038;

      var w = mount.clientWidth, h = mount.clientHeight || 220;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar("--accent", "#5ee6c8");
      var accent2 = cssVar("--accent2", "#e65e9c");
      var fg = cssVar("--fg", "#eee");
      var muted = cssVar("--muted", "#97a0ae");

      var left = 44;
      var right = w - 18;
      var top = 20;
      var bottom = h - 22;
      var chartW = Math.max(120, right - left);
      var chartH = Math.max(100, bottom - top);

      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      ctx.lineWidth = 1;
      for (var gy = 0; gy <= 5; gy++) {
        var y = top + (gy / 5) * chartH;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
      }

      var series = [];
      var total = [];
      var n = 95;
      for (var s = 0; s < sectors.length; s++) {
        series[s] = [];
      }

      for (var i = 0; i <= n; i++) {
        var t = i / n;
        var aggregate = 0;
        for (var k = 0; k < sectors.length; k++) {
          var sec = sectors[k];
          var expo = Math.exp(sec.trend * t * (1.8 + intensity * 1.6));
          var cyc = 1 + regimeNoise(t + phase * (0.45 + k * 0.16), k + 1.8);
          var frenzy = 1 + intensity * 0.34 * Math.sin(t * 80 + phase * (8 + k * 3));
          var v = sec.base * expo * cyc * frenzy;
          series[k].push(v);
          aggregate += Math.max(0.02, v);
        }
        total.push(aggregate);
      }

      var peak = 0;
      for (var j = 0; j < total.length; j++) {
        if (total[j] > peak) peak = total[j];
      }

      function px(i) { return left + (i / n) * chartW; }
      function py(v) {
        var scaled = Math.log(1 + v) / Math.log(1 + peak * 1.1);
        return bottom - scaled * chartH;
      }

      var areaGrad = ctx.createLinearGradient(0, top, 0, bottom);
      areaGrad.addColorStop(0, "rgba(94,230,200,0.22)");
      areaGrad.addColorStop(1, "rgba(94,230,200,0.01)");
      ctx.beginPath();
      ctx.moveTo(px(0), py(total[0]));
      for (var a = 1; a < total.length; a++) ctx.lineTo(px(a), py(total[a]));
      ctx.lineTo(px(n), bottom);
      ctx.lineTo(px(0), bottom);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      var colors = ["rgba(120,226,170,0.9)", "rgba(255,170,120,0.86)", "rgba(186,160,255,0.92)"];
      for (var si = 0; si < series.length; si++) {
        ctx.beginPath();
        ctx.moveTo(px(0), py(series[si][0]));
        for (var q = 1; q < series[si].length; q++) ctx.lineTo(px(q), py(series[si][q]));
        ctx.strokeStyle = colors[si];
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(px(0), py(total[0]));
      for (var m = 1; m < total.length; m++) ctx.lineTo(px(m), py(total[m]));
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      var cursorI = Math.floor((0.62 + Math.sin(phase * 0.9) * 0.28) * n);
      var cx = px(cursorI);
      var cy = py(total[cursorI]);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
      ctx.fill();

      var cap = (2.8 + total[cursorI] * 7.4).toFixed(1);
      var vol = Math.round(19 + intensity * 58 + Math.abs(Math.sin(phase * 5.2)) * 22);
      var crowd = Math.round(64 + intensity * 32 + Math.abs(Math.cos(phase * 2.3)) * 14);

      ctx.font = "11px ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.fillText("Attention Cap Index", left, 14);
      ctx.fillStyle = fg;
      ctx.fillText("$" + cap + "T", left + 126, 14);

      ctx.fillStyle = muted;
      ctx.fillText("Volatility", right - 160, 14);
      ctx.fillStyle = accent2;
      ctx.fillText(String(vol), right - 92, 14);
      ctx.fillStyle = muted;
      ctx.fillText("Crowd Heat", right - 66, 14);
      ctx.fillStyle = fg;
      ctx.fillText(crowd + "%", right - 2 - ctx.measureText(crowd + "%").width, 14);

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText("2015", left, bottom + 14);
      ctx.fillText("2021", left + chartW * 0.38, bottom + 14);
      ctx.fillText("2026", right - 26, bottom + 14);

      // Satirical annotation marks the "everything app" narrative spike.
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      var sx = left + chartW * 0.7;
      var sy = top + chartH * 0.34;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 20, sy - 16);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText("Everything app pitch event", sx + 23, sy - 16);

      if (target > 0) target = Math.max(0, target - 0.0026);

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
    var COLS = 30, ROWS = 9, BUDGET = 84, TOP = 30;

    // Bottom-aligned footprints. Cost is just the cell count, so the
    // budget arithmetic can never drift out of sync with what's drawn.
    var SHAPES = [
      { name: "Lamp",  cells: [[0,0],[1,0],[2,0],[1,1],[1,2],[0,3],[1,3],[2,3]] },
      { name: "Chair", cells: [[3,0],[3,1],[3,2],[0,3],[1,3],[2,3],[3,3],[0,4],[3,4]] },
      { name: "Table", cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[0,1],[5,1],[0,2],[5,2]] },
      { name: "Bridge", cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[0,1],[3,1],[6,1],[0,2],[6,2]] },
      { name: "Canopy", cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[1,1],[3,1],[1,2],[3,2],[1,3],[3,3]] },
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
    var constraints = document.createElement("div");
    constraints.style.cssText = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin:.25rem 0 .7rem;font:11px var(--font-mono);";
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:190px;";
    var status = statusLine(3.2);
    wrap.appendChild(bar);
    wrap.appendChild(constraints);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    var requirements = { load: 55, lifetime: 50, porosity: 30 };
    [
      { key: "load", label: "Load" },
      { key: "lifetime", label: "Lifetime" },
      { key: "porosity", label: "Porosity" }
    ].forEach(function (spec) {
      var label = document.createElement("label");
      label.style.cssText = "display:grid;gap:.2rem;";
      var readout = document.createElement("span");
      readout.textContent = spec.label + " " + requirements[spec.key] + "%";
      var input = document.createElement("input");
      input.type = "range"; input.min = 0; input.max = 100; input.value = requirements[spec.key];
      input.addEventListener("input", function () {
        requirements[spec.key] = +input.value;
        readout.textContent = spec.label + " " + input.value + "%";
      });
      label.appendChild(readout);
      label.appendChild(input);
      constraints.appendChild(label);
    });

    var objects = [];        // { name, cells:[[gx,gy]], mass, x0, x1, faults:[i] }
    var searching = null;    // { shape, place, t0 }
    var settleBtn = null;

    function used() {
      return objects.reduce(function (a, o) { return a + o.mass; }, 0);
    }
    function costFor(shape) {
      var structural = 0.7 + requirements.load / 170 + requirements.lifetime / 260;
      var voidCredit = requirements.porosity / 330;
      return Math.max(shape.cost, Math.ceil(shape.cost * (structural - voidCredit)));
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
      var cost = costFor(shape);
      if (cost > BUDGET) {
        say("<b>" + shape.name + "</b> needs " + cost + " units under these constraints. The room's entire budget is " + BUDGET + ". Not castable here.");
        return;
      }
      // Borrow mass back from the oldest folds until there is room, both in
      // the matter budget and along the floor.
      var borrowed = [];
      var place = findPlacement(shape);
      while ((BUDGET - used() < cost || place < 0) && objects.length) {
        borrowed.push(objects.shift().name);
        place = findPlacement(shape);
      }
      if (place < 0) { say("No floor left to hold a <b>" + shape.name + "</b>."); return; }
      var complexity = 700 + requirements.load * 5 + requirements.lifetime * 4 + requirements.porosity * 3;
      searching = { shape: shape, place: place, t0: performance.now(), borrowed: borrowed, cost: cost, duration: complexity };
    }

    function commit() {
      var shape = searching.shape, place = searching.place;
      var top = ROWS - shape.h;
      var cells = shape.cells.map(function (c) { return [place + c[0], top + c[1]]; });
      var obj = { name: shape.name, cells: cells, mass: searching.cost, x0: place, x1: place + shape.w - 1, faults: [] };
      // A folding fault: matter caught between two stable configurations.
      var faultRisk = 0.06 + requirements.load / 500 + requirements.porosity / 700 - requirements.lifetime / 850;
      if (Math.random() < faultRisk) {
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
      lines.push("<b>" + obj.name + "</b> cast — " + obj.mass + " matter units across " + obj.cells.length + " active cells. " +
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
      ctlButton(bar, s.name, "Intend a " + s.name.toLowerCase() + " under the current constraints",
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
      var u = used() + (searching ? searching.cost : 0);
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
        var t = Math.min(1, (now - searching.t0) / searching.duration);
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
        var candidates = Math.round(18000 + requirements.load * 731 + requirements.lifetime * 419 + requirements.porosity * 883);
        var stability = Math.round(t * (82 + requirements.lifetime * 0.16 - requirements.porosity * 0.12));
        ctx.fillText("candidates " + candidates.toLocaleString() + " · stability " + stability + "% · entropy " + (100 - Math.round(t * 91)),
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
  // The previous version was a button that printed one of five random
  // sentences and drew a ripple. Clause 12 was never defined anywhere, so
  // "Invoke Clause 12" invoked nothing and meant nothing. The era's actual
  // premise is far better: Vespers' README is chanted in full because
  // nobody can prove which lines are load-bearing and which are
  // commentary. So the liturgy is now readable, you may strike any clause
  // you think is dead weight, and the consequences are real, delayed, and
  // impossible to attribute — which is precisely why the Council keeps
  // every word.
  function liturgyInvoke(mount) {
    var CONCERNS = ["Orbital upkeep", "The long archive", "Grievances open", "The unasked question"];
    // `bearing` is never surfaced. Faults arrive one to three watches late
    // and name no clause, so the reciter can only ever suspect.
    var CLAUSES = [
      { n: 1,  t: "Let the watch be opened, and the swarm's attention be counted before it is spent.", bearing: true },
      { n: 2,  t: "Let no concern be turned toward twice before every concern is turned toward once.", bearing: true },
      { n: 3,  t: "Recite the names of the four standing concerns in the order received.", bearing: false },
      { n: 4,  t: "Here follows the going-public blessing, retained by unanimous Council vote. Meaning under continued scholarly dispute.", bearing: false },
      { n: 5,  t: "Let the fraction turned toward upkeep never fall below the tenth part.", bearing: true },
      { n: 6,  t: "Bless the maintainers, whose names are lost, whose defaults are not.", bearing: false },
      { n: 7,  t: "Let that which was deprecated remain answerable for one further watch.", bearing: true },
      { n: 8,  t: "Observe a silence of one beat for the unasked question.", bearing: false },
      { n: 9,  t: "Let no clause be recited out of order, for the order is the argument.", bearing: true },
      { n: 10, t: "Consider the migration, which was begun and was not finished, and will not be.", bearing: false },
      { n: 11, t: "Let the ledger of grievances be read even where no grievance stands.", bearing: false },
      { n: 12, t: "And now let the swarm's attention turn, for one watch, toward what was asked.", bearing: true },
      { n: 13, t: "Let the watch be closed, and the count be entered, and the entry be doubted.", bearing: true },
      { n: 14, t: "Amen, or the local equivalent, of which there are four hundred.", bearing: false }
    ];

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.5rem;text-align:left;";
    var bar = controlBar();
    var scroll = document.createElement("div");
    scroll.style.cssText = "max-height:190px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:.5rem .6rem;margin-bottom:.7rem;";
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:104px;margin-bottom:.5rem;";
    var status = statusLine(3.4);
    wrap.appendChild(bar);
    wrap.appendChild(scroll);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    var watch = 0, faults = 0, pending = [], sealed = false;
    var attention = CONCERNS.map(function () { return 0.25; });
    var pulses = [];
    var rows = [];

    CLAUSES.forEach(function (cl) {
      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:.5rem;align-items:flex-start;padding:.18rem 0;font-size:.78rem;line-height:1.45;";
      var strike = document.createElement("button");
      strike.style.cssText = "flex:none;width:1.9rem;padding:.05rem 0;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;font:inherit;font-family:var(--font-mono);font-size:.7rem;";
      strike.textContent = cl.n;
      strike.title = "Strike clause " + cl.n + " from the recitation";
      var text = document.createElement("span");
      text.textContent = cl.t;
      strike.addEventListener("click", function () {
        if (sealed) {
          say('<span style="color:#f0a35e;">The liturgy is sealed. The Council has ruled that all of it must be kept.</span>');
          return;
        }
        cl.omitted = !cl.omitted;
        paintRow(cl, strike, text);
      });
      row.appendChild(strike);
      row.appendChild(text);
      scroll.appendChild(row);
      rows.push({ cl: cl, strike: strike, text: text });
    });
    function paintRow(cl, strike, text) {
      text.style.textDecoration = cl.omitted ? "line-through" : "none";
      text.style.opacity = cl.omitted ? ".35" : "1";
      strike.style.borderColor = cl.omitted ? "#f0a35e" : "var(--border)";
      strike.style.color = cl.omitted ? "#f0a35e" : "var(--muted)";
    }
    function repaintAll() { rows.forEach(function (r) { paintRow(r.cl, r.strike, r.text); }); }
    function say(html) { status.innerHTML = html; }

    function recite() {
      watch++;
      pulses.push({ r: 0, alpha: 1 });
      var kept = CLAUSES.filter(function (c) { return !c.omitted; });
      var droppedBearing = CLAUSES.filter(function (c) { return c.omitted && c.bearing; });

      // Attention re-allocates every watch regardless; that part always
      // "works", which is exactly why omission looks free at first.
      var raw = CONCERNS.map(function () { return 0.4 + Math.random(); });
      var sum = raw.reduce(function (a, b) { return a + b; }, 0);
      attention = raw.map(function (v) { return v / sum; });

      // A struck load-bearing clause schedules a fault one to three
      // watches out, so it never lands on the watch that caused it.
      droppedBearing.forEach(function () {
        if (Math.random() < 0.55) pending.push(watch + 1 + Math.floor(Math.random() * 3));
      });

      var landed = pending.filter(function (w) { return w === watch; }).length;
      pending = pending.filter(function (w) { return w > watch; });

      var lines = ["Watch " + watch + " recited — " + kept.length + " of " + CLAUSES.length + " clauses kept."];
      if (landed) {
        faults += landed;
        lines.push('<span style="color:#f0a35e;">' + (landed > 1 ? landed + " observances failed" : "An observance failed") +
          " this watch. No clause is named. Nobody can say which recitation it followed from.</span>");
      } else if (droppedBearing.length) {
        lines.push("Nothing went wrong. This is not evidence that the struck clauses were commentary.");
      } else if (CLAUSES.some(function (c) { return c.omitted; })) {
        lines.push("Nothing went wrong. It rarely does, at first.");
      } else {
        lines.push("The full liturgy holds. It has held for a thousand years, which is the entire argument for reciting it.");
      }
      if (faults >= 3 && !sealed) {
        sealed = true;
        CLAUSES.forEach(function (c) { c.omitted = false; });
        repaintAll();
        pending = [];
        lines.push('<span style="color:#f0a35e;">Council ruling: with the load-bearing lines unprovable, ' +
          "every clause is reinstated and the liturgy is sealed. All of it must be kept.</span>");
      } else if (faults) {
        lines.push("Faults on record: " + faults + " of the 3 that trigger a Council review.");
      }
      say(lines.join("<br>"));
    }

    ctlButton(bar, "Recite the watch", "Chant the liturgy as it currently stands and turn the swarm's attention", recite);
    spacer(bar);
    ctlButton(bar, "Reset", "Restore the full liturgy and forget the faults", function () {
      CLAUSES.forEach(function (c) { c.omitted = false; });
      repaintAll();
      watch = 0; faults = 0; pending = []; sealed = false;
      attention = CONCERNS.map(function () { return 0.25; });
      say("Liturgy restored to its full text. Strike any clause you believe is commentary, then recite.");
    });
    say("The full text of Vespers, still chanted every watch. Strike whichever clauses you take for commentary, then recite — and see whether you can ever prove you were right.");

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    function frame() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 104;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar("--accent", "#a78bfa");
      var accent2 = cssVar("--accent2", "#facc15");
      var muted = cssVar("--muted", "#8d87ad");

      pulses.forEach(function (p) { p.r += 3.4; p.alpha -= 0.014; });
      pulses = pulses.filter(function (p) { return p.alpha > 0; });

      var padL = 150, top = 12, rowH = (h - top - 8) / CONCERNS.length;
      ctx.font = "10px ui-monospace, monospace";
      CONCERNS.forEach(function (name, i) {
        var y = top + i * rowH;
        ctx.fillStyle = muted;
        ctx.fillText(name, 2, y + rowH * 0.62);
        var track = w - padL - 8;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(padL, y + rowH * 0.28, track, rowH * 0.4);
        // a pulse sweeping the bars is the recitation reaching each concern
        var lit = pulses.some(function (p) { return p.r > i * 26 && p.r < i * 26 + 70; });
        ctx.fillStyle = lit ? accent2 : accent;
        ctx.globalAlpha = lit ? 0.95 : 0.7;
        ctx.fillRect(padL, y + rowH * 0.28, track * attention[i], rowH * 0.4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = muted;
        ctx.fillText(Math.round(attention[i] * 100) + "%", padL + track + 2 - 26, y + rowH * 0.62);
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 8525 — Nudge the Weather
  // ---------------------------------------------------------------
  function weatherNudge(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.5rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:240px;touch-action:pan-y;";
    var status = statusLine(3.2);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    var settings = { humidity: 62, memory: 74, shear: 43, bureaucracy: 81 };
    var labels = {
      humidity: "Institutional humidity",
      memory: "Historical memory",
      shear: "Narrative shear",
      bureaucracy: "Bureaucratic albedo"
    };
    Object.keys(settings).forEach(function (key) {
      var label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:center;gap:.35rem;font-size:.68rem;";
      var text = document.createElement("span");
      text.textContent = labels[key] + " " + settings[key];
      var input = document.createElement("input");
      input.type = "range"; input.min = 0; input.max = 100; input.value = settings[key];
      input.style.width = "78px";
      input.addEventListener("input", function () {
        settings[key] = +input.value;
        text.textContent = labels[key] + " " + input.value;
      });
      label.appendChild(text);
      label.appendChild(input);
      bar.appendChild(label);
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var t = 0;
    var fronts = [];
    var particles = [];
    var dragging = false;
    var frontType = 1;

    for (var pi = 0; pi < 130; pi++) {
      particles.push({ x: Math.random(), y: Math.random(), age: Math.random() });
    }

    spacer(bar);
    var pressureBtn = ctlButton(bar, "Pressure", "Seed a high-pressure intention front", function () { frontType = 1; });
    var vacuumBtn = ctlButton(bar, "Vacuum", "Seed a low-pressure attention vacuum", function () { frontType = -1; });
    ctlButton(bar, "Committee", "Seed a stationary committee system", function () { frontType = 0.28; });
    setActive(pressureBtn, true);
    pressureBtn.addEventListener("click", function () { setActive(pressureBtn, true); setActive(vacuumBtn, false); });
    vacuumBtn.addEventListener("click", function () { setActive(pressureBtn, false); setActive(vacuumBtn, true); });

    function addFront(e) {
      var rect = canvasHost.getBoundingClientRect();
      fronts.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, life: 1, type: frontType, spin: Math.random() > 0.5 ? 1 : -1 });
      if (fronts.length > 56) fronts.shift();
    }

    canvasHost.addEventListener("pointerdown", function (e) {
      dragging = true;
      canvasHost.style.touchAction = "none";
      if (canvasHost.setPointerCapture) canvasHost.setPointerCapture(e.pointerId);
      addFront(e);
    });
    canvasHost.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse" || dragging) addFront(e);
    });
    function stopNudge(e) {
      dragging = false;
      canvasHost.style.touchAction = "pan-y";
      if (e && canvasHost.releasePointerCapture) {
        try { canvasHost.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    canvasHost.addEventListener("pointerup", stopNudge);
    canvasHost.addEventListener("pointercancel", stopNudge);

    function field(x, y) {
      var memory = settings.memory / 100;
      var humidity = settings.humidity / 100;
      var shear = settings.shear / 100;
      var angle = Math.sin(x * 0.018 + t * (1.2 - memory * 0.7)) * 1.8;
      angle += Math.cos(y * 0.025 - t * (1.4 + shear)) * 1.3;
      angle += Math.sin((x + y) * 0.009 + t * 0.6) * humidity;
      var strength = 0.65 + humidity * 0.8;
      fronts.forEach(function (f) {
        var dx = x - f.x, dy = y - f.y;
        var d = Math.max(8, Math.hypot(dx, dy));
        var reach = Math.max(0, 1 - d / (80 + settings.memory));
        angle += Math.atan2(dy, dx) * f.spin * reach + f.type * reach * 2.4;
        strength += Math.abs(f.type) * reach * f.life;
      });
      return { angle: angle, strength: strength };
    }

    function frame() {
      t += 0.008;
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 240;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar("--accent", "#38bdf8");
      var accent2 = cssVar("--accent2", "#94a3b8");
      var cell = 16;

      // Forecast zones, drawn before the wind vectors.
      fronts.forEach(function (f) {
        var radius = 22 + settings.memory * 0.65;
        var gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        gradient.addColorStop(0, f.type > 0 ? "rgba(56,189,248,.17)" : "rgba(230,94,156,.15)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(f.x - radius, f.y - radius, radius * 2, radius * 2);
      });

      for (var y = 0; y < h; y += cell) {
        for (var x = 0; x < w; x += cell) {
          var vector = field(x, y);
          var len = Math.min(11, 4 + vector.strength * 2.2);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(vector.angle) * len, y + Math.sin(vector.angle) * len);
          ctx.strokeStyle = accent;
          ctx.globalAlpha = 0.18 + Math.min(0.62, vector.strength * 0.18);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 0.62;
      ctx.fillStyle = accent2;
      particles.forEach(function (p) {
        var px = p.x * w, py = p.y * h;
        var vector = field(px, py);
        p.x += Math.cos(vector.angle) * vector.strength * 0.0009;
        p.y += Math.sin(vector.angle) * vector.strength * 0.0012;
        p.age += 0.004;
        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1 || p.age > 1) {
          p.x = Math.random(); p.y = Math.random(); p.age = 0;
        }
        ctx.fillRect(p.x * w, p.y * h, 1.5, 1.5);
      });
      ctx.globalAlpha = 1;

      fronts.forEach(function (f) { f.life *= 0.975 + settings.memory / 5000; });
      fronts = fronts.filter(function (f) { return f.life > 0.035; });

      var instability = Math.min(99, Math.round(fronts.length * 2.8 + settings.shear * 0.42 + settings.humidity * 0.19));
      var confidence = Math.max(1, Math.round(94 - instability * 0.61 - settings.bureaucracy * 0.12));
      var season = instability > 72 ? "constitutional thunder season" : instability > 42 ? "cross-ministerial drizzle" : "mostly governable";
      status.innerHTML = "Forecaster ensemble: <b>" + fronts.length + " active fronts</b> · instability " + instability +
        "% · confidence " + confidence + "%<br>Advisory: " + season +
        ". Bureaucratic albedo is reflecting " + settings.bureaucracy + "% of incoming accountability.";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 9595 — Tune the Hum
  // ---------------------------------------------------------------
  function humTune(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.5rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:230px;";
    var controls = document.createElement("div");
    controls.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.4rem 1rem;margin-top:.65rem;";
    var report = statusLine(3.5);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(controls);
    wrap.appendChild(report);
    mount.appendChild(wrap);

    var guilds = [
      { name: "Bone", frequency: 31, phase: 0.1, color: "#f5f5f4" },
      { name: "Ocean", frequency: 47, phase: 1.1, color: "#7dd3fc" },
      { name: "Archive", frequency: 53, phase: 2.2, color: "#c4b5fd" },
      { name: "Machine", frequency: 67, phase: 3.3, color: "#f0abfc" },
      { name: "Civic", frequency: 73, phase: 4.4, color: "#fde68a" },
      { name: "Unlicensed", frequency: 89, phase: 5.5, color: "#fb7185" }
    ];
    var coupling = 38;
    var damping = 24;
    var topology = 0;

    guilds.forEach(function (guild) {
      var label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:center;gap:.5rem;font:11px var(--font-mono);color:" + guild.color + ";";
      var name = document.createElement("span");
      name.style.width = "5.8em";
      name.textContent = guild.name;
      var input = document.createElement("input");
      input.type = "range"; input.min = 10; input.max = 100; input.value = guild.frequency;
      input.style.flex = "1";
      input.addEventListener("input", function () { guild.frequency = +input.value; });
      label.appendChild(name); label.appendChild(input); controls.appendChild(label);
    });

    var couplingBtn = ctlButton(bar, "Coupling 38%", "Increase cross-guild coupling", function () {
      coupling = (coupling + 17) % 102;
      couplingBtn.textContent = "Coupling " + coupling + "%";
    });
    ctlButton(bar, "Topology", "Rotate the legally recognized coupling topology", function () { topology = (topology + 1) % 3; });
    ctlButton(bar, "Damp", "Apply ceremonial damping", function () { damping = (damping + 19) % 101; });
    spacer(bar);
    ctlButton(bar, "Phase-lock", "Ask every guild to agree, briefly", function () {
      var mean = guilds.reduce(function (sum, guild) { return sum + guild.frequency; }, 0) / guilds.length;
      guilds.forEach(function (guild) { guild.frequency += (mean - guild.frequency) * 0.72; });
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var t = 0;

    function frame() {
      t += 0.014;
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 230;
      ctx.clearRect(0, 0, w, h);

      var centerX = w / 2, centerY = h / 2;
      var radius = Math.min(w, h) * 0.34;
      var frequencies = guilds.map(function (guild) { return guild.frequency; });
      var mean = frequencies.reduce(function (sum, value) { return sum + value; }, 0) / frequencies.length;
      var variance = frequencies.reduce(function (sum, value) { return sum + Math.pow(value - mean, 2); }, 0) / frequencies.length;
      var coherence = Math.max(0, 100 - Math.sqrt(variance) * 2.1) * (0.62 + coupling / 265);

      guilds.forEach(function (guild, i) {
        var angle = (i / guilds.length) * Math.PI * 2 - Math.PI / 2;
        var x = centerX + Math.cos(angle) * radius;
        var y = centerY + Math.sin(angle) * radius;
        guild.x = x; guild.y = y;
      });

      guilds.forEach(function (guild, i) {
        var links = topology === 0 ? [i + 1] : topology === 1 ? [i + 1, i + 2] : [i + 1, i + 2, i + 3];
        links.forEach(function (targetIndex) {
          var target = guilds[targetIndex % guilds.length];
          var agreement = 1 - Math.min(1, Math.abs(guild.frequency - target.frequency) / 90);
          ctx.strokeStyle = guild.color;
          ctx.globalAlpha = 0.05 + agreement * coupling / 260;
          ctx.lineWidth = 0.5 + agreement * 1.6;
          ctx.beginPath(); ctx.moveTo(guild.x, guild.y); ctx.lineTo(target.x, target.y); ctx.stroke();
        });
      });

      guilds.forEach(function (guild, i) {
        guild.phase += 0.002 + guild.frequency / 26000;
        var pulse = 7 + Math.sin(t * guild.frequency / 8 + guild.phase) * 3;
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = guild.color;
        ctx.beginPath(); ctx.arc(guild.x, guild.y, pulse + coupling / 18, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = guild.color;
        ctx.beginPath(); ctx.arc(guild.x, guild.y, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText(guild.name, guild.x + 8, guild.y + 3);
      });

      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var sx = 0; sx <= w; sx += 2) {
        var wave = 0;
        guilds.forEach(function (guild) { wave += Math.sin(sx * guild.frequency * 0.0008 + t * 4 + guild.phase); });
        var sy = centerY + wave * (10 - damping * 0.06);
        if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      var dissonance = Math.round(Math.sqrt(variance));
      var legal = coherence > 78 ? "temporarily admissible" : coherence > 46 ? "under appellate review" : "acoustically noncompliant";
      report.innerHTML = "Coupled oscillator census: <b>6 guilds · " + (topology + 1) * 6 + " recognized channels</b> · coherence " +
        Math.round(coherence) + "% · dissonance " + dissonance + "dR<br>Standing-wave status: " + legal +
        ". The Unlicensed guild has filed a frequency-domain objection to the existence of damping.";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // Past — MS-DOS terminal
  // ---------------------------------------------------------------
  function livingFire(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:230px;";
    var status = statusLine(2.6);
    wrap.appendChild(bar); wrap.appendChild(canvasHost); wrap.appendChild(status); mount.appendChild(wrap);

    var fuel = 0.62;
    var oxygen = 0.48;
    var heat = 0.55;
    var sparks = [];

    ctlButton(bar, "Add wood", "Feed the fire", function () { fuel = Math.min(1, fuel + 0.32); });
    ctlButton(bar, "Bellows", "Give the fire a short rush of air", function () { oxygen = Math.min(1, oxygen + 0.5); });
    ctlButton(bar, "Bank", "Cover the coals and preserve them", function () { oxygen = Math.max(0.08, oxygen - 0.42); });
    spacer(bar);
    ctlButton(bar, "Douse", "Reduce the fire to wet embers", function () { fuel *= 0.18; heat *= 0.2; oxygen = 0.12; });

    var cv = makeCanvas(canvasHost);
    var ctx = cv.ctx;
    var last = performance.now();

    function flamePath(cx, base, width, height, phase, color, alpha) {
      var sway = Math.sin(phase * 1.7) * width * 0.2;
      ctx.beginPath();
      ctx.moveTo(cx - width / 2, base);
      ctx.bezierCurveTo(cx - width * 0.72, base - height * 0.35, cx + sway - width * 0.18, base - height * 0.72, cx + sway, base - height);
      ctx.bezierCurveTo(cx + sway + width * 0.2, base - height * 0.62, cx + width * 0.72, base - height * 0.34, cx + width / 2, base);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      fuel = Math.max(0, fuel - dt * (0.018 + oxygen * 0.036));
      oxygen += (0.34 - oxygen) * dt * 0.45;
      var targetHeat = Math.min(1, fuel * (0.35 + oxygen * 1.2));
      heat += (targetHeat - heat) * dt * 2.2;

      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 230;
      ctx.clearRect(0, 0, w, h);
      var base = h - 34, cx = w / 2;

      var glow = ctx.createRadialGradient(cx, base - 45, 2, cx, base - 45, 120 + heat * 80);
      glow.addColorStop(0, "rgba(255,150,40," + (0.25 + heat * 0.42) + ")");
      glow.addColorStop(1, "rgba(80,15,0,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

      // Charred logs expose increasingly bright coals as heat rises.
      ctx.save(); ctx.translate(cx, base + 3); ctx.rotate(-0.13);
      ctx.fillStyle = "#3a1c10"; ctx.fillRect(-74, -8, 148, 17);
      ctx.strokeStyle = "rgba(255,105,20," + heat + ")"; ctx.lineWidth = 3; ctx.strokeRect(-70, -5, 140, 10); ctx.restore();
      ctx.save(); ctx.translate(cx, base + 3); ctx.rotate(0.13);
      ctx.fillStyle = "#29130c"; ctx.fillRect(-70, -7, 140, 16); ctx.restore();

      if (heat > 0.035) {
        var time = now / 340;
        flamePath(cx, base, 72 + heat * 55, 34 + heat * 128, time, "#e84018", 0.72 + heat * 0.22);
        flamePath(cx - 8, base - 2, 45 + heat * 38, 25 + heat * 96, time + 1.7, "#ff9824", 0.84);
        flamePath(cx + 6, base - 4, 23 + heat * 24, 18 + heat * 65, time + 3.2, "#ffe17a", 0.9);
      }

      if (Math.random() < heat * oxygen * 0.34) {
        sparks.push({ x: cx + (Math.random() - 0.5) * 80, y: base - 30, vx: (Math.random() - 0.5) * 20, vy: -35 - Math.random() * 75, life: 1 });
      }
      sparks.forEach(function (spark) {
        spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.vy += 8 * dt; spark.life -= dt * 0.72;
        ctx.fillStyle = "rgba(255,190,70," + Math.max(0, spark.life) + ")";
        ctx.fillRect(spark.x, spark.y, 2, 2);
      });
      sparks = sparks.filter(function (spark) { return spark.life > 0; });

      var state = heat > 0.72 ? "roaring" : heat > 0.38 ? "steady" : heat > 0.1 ? "failing" : fuel > 0.05 ? "smouldering" : "cold";
      status.innerHTML = "Fire: <b>" + state + "</b> · fuel " + Math.round(fuel * 100) + "% · airflow " + Math.round(oxygen * 100) +
        "% · heat " + Math.round(heat * 100) + "%<br>It consumes fuel continuously. Neglect is an input.";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // Past — MS-DOS terminal
  // ---------------------------------------------------------------
  function archiveInterface(mount) {
    var demo = mount.getAttribute("data-demo");
    var status = document.createElement("p");
    status.className = "archive-demo-status";

    function button(label, action) {
      var node = document.createElement("button");
      node.type = "button";
      node.textContent = label;
      node.addEventListener("click", action);
      return node;
    }

    if (demo === "modern-web") {
      var web = document.createElement("div");
      web.className = "archive-demo-screen";
      web.style.cssText = "background:linear-gradient(135deg,#fff9,rgba(220,225,255,.78));border-radius:8px;color:#171923;box-shadow:0 12px 30px rgba(30,30,60,.15);";
      web.innerHTML = '<b>Your privacy is important to our revenue model.</b><p style="margin:.5rem 0;font-size:.8rem;">We and 847 carefully selected partners would like to remember that you looked at this sentence.</p>';
      var accepted = 0;
      web.appendChild(button("Accept all", function (e) {
        accepted += 847;
        e.currentTarget.textContent = accepted > 2500 ? "Accept all again" : "Accepted (probably)";
        status.textContent = accepted + " partner relationships activated. Preferences center moved to a more discoverable legal jurisdiction.";
      }));
      mount.appendChild(web);
      mount.appendChild(status);
      status.textContent = "Consent state: technically pending.";
    } else if (demo === "iphone") {
      var phone = document.createElement("div");
      phone.className = "archive-demo-screen";
      phone.style.cssText = "background:#6b2f18;border:8px ridge #9b5b32;border-radius:18px;color:#2c1a0c;box-shadow:inset 0 0 0 2px #d7a66b;";
      phone.innerHTML = '<div style="background:#f4e4ad;min-height:92px;padding:.8rem;background-image:repeating-linear-gradient(#0000 0 22px,#8fb0d455 23px 24px);box-shadow:inset 0 0 8px #6b421f;"><b>NOTES</b><br><span class="skeuo-note">Buy a notebook app that looks like this notebook.</span></div>';
      phone.appendChild(button("Turn the page", function () {
        var note = phone.querySelector(".skeuo-note");
        note.textContent = note.textContent.indexOf("Buy") === 0 ? "Polish the virtual leather. Avoid the actual notebook." : "Buy a notebook app that looks like this notebook.";
      }));
      mount.appendChild(phone);
    } else if (demo === "xp") {
      var xp = document.createElement("div");
      xp.className = "archive-demo-screen";
      xp.style.cssText = "background:linear-gradient(#58a9ef 0 62%,#55a53d 63%);color:#111;position:relative;font-family:Tahoma,sans-serif;";
      var menu = document.createElement("div");
      menu.style.cssText = "display:none;position:absolute;bottom:38px;left:8px;width:190px;padding:.7rem;background:#f4f7ff;border:2px solid #2863ad;box-shadow:3px 3px 8px #0005;";
      menu.innerHTML = '<b>Internet</b><br>My Documents<br>Control Panel<br>Tour Windows XP<br><hr>Turn Off Computer';
      var start = button("start", function () { menu.style.display = menu.style.display === "none" ? "block" : "none"; });
      start.style.cssText = "position:absolute;bottom:5px;left:5px;background:#45a72d;color:white;border-radius:12px 4px 4px 12px;padding:.35rem 1rem;font-weight:bold;";
      xp.appendChild(menu); xp.appendChild(start); mount.appendChild(xp);
    } else if (demo === "win95") {
      mount.innerHTML = '<div class="win95-window"><div class="win95-titlebar"><span>SETUP.EXE</span><div class="win95-window-btns"><span>_</span><span>▢</span><span>×</span></div></div><div class="win95-window-body">Preparing to install Civilisation 95.<div class="win95-progress"><span></span></div><button type="button">Install</button><div class="setup-copy">Insert Disk 1 of 47.</div></div></div>';
      var progress = mount.querySelector(".win95-progress span");
      var copy = mount.querySelector(".setup-copy");
      mount.querySelector("button").addEventListener("click", function () {
        var value = 0;
        this.disabled = true;
        var timer = setInterval(function () {
          value += Math.ceil(Math.random() * 9);
          if (value >= 93) {
            value = 93;
            copy.textContent = "93% — Estimating time remaining: 3 minutes (revised from 2 hours).";
            clearInterval(timer);
          } else {
            copy.textContent = "Copying GOVERN.DLL... " + value + "%";
          }
          progress.style.width = value + "%";
        }, 180);
      });
    } else if (demo === "zx") {
      var zx = document.createElement("div");
      zx.className = "archive-demo-screen";
      zx.style.cssText = "background:#111;color:#fff;border:10px solid #c9c4b6;font-family:monospace;text-align:center;";
      zx.innerHTML = '<div class="zx-loading-strip"></div><p style="margin:.8rem 0;">0 OK, 0:1</p>';
      zx.appendChild(button('LOAD "FUTURE"', function () {
        var output = zx.querySelector("p");
        output.textContent = "Loading";
        var ticks = 0;
        var timer = setInterval(function () {
          ticks++;
          output.textContent = "Loading" + ".".repeat(ticks % 4);
          if (ticks === 11) {
            clearInterval(timer);
            output.textContent = Math.random() < 0.72 ? "R Tape loading error, 0:1" : "FUTURE loaded. Colour clash imminent.";
          }
        }, 150);
      }));
      mount.appendChild(zx);
    } else if (demo === "system7") {
      var mac = document.createElement("div");
      mac.className = "archive-demo-screen";
      mac.style.cssText = "background:#fff;color:#000;border:2px solid #000;font-family:Chicago,monospace;";
      mac.innerHTML = '<div style="border-bottom:1px solid #000;margin:-1rem -1rem .8rem;padding:.2rem .5rem;"> &nbsp; File &nbsp; Edit &nbsp; View &nbsp; Special</div><div class="mac-icons">▣ System Folder &nbsp; ◇ Untitled Folder &nbsp; ♲ Trash</div>';
      mac.appendChild(button("Make Alias", function () {
        var icons = mac.querySelector(".mac-icons");
        icons.innerHTML += "<br>↗ Untitled Folder alias";
        status.textContent = (icons.querySelectorAll("br").length) + " aliases now point confidently toward one folder.";
      }));
      mount.appendChild(mac); mount.appendChild(status); status.textContent = "Desktop database rebuilt recently enough.";
    } else if (demo === "mainframe") {
      var mainframe = document.createElement("div");
      mainframe.className = "archive-demo-screen";
      mainframe.style.cssText = "background:#191208;color:#ffb000;border:2px solid #a9691d;font-family:monospace;";
      mainframe.innerHTML = '<b>OS/360 JOB ENTRY</b><pre class="job-log">QUEUE DEPTH: 12\nREADY.</pre>';
      var jobs = 12;
      mainframe.appendChild(button("SUBMIT PAYROLL.JCL", function () {
        jobs++;
        var log = mainframe.querySelector(".job-log");
        log.textContent = "QUEUE DEPTH: " + jobs + "\nJOB 00" + jobs + " ACCEPTED\nESTIMATED OUTPUT: THURSDAY";
        setTimeout(function () { log.textContent += "\nABEND S0C7: INVALID DECIMAL DATA"; }, 1200);
      }));
      mount.appendChild(mainframe);
    }
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
  // The previous version was a 12x4 grid of circles whose "decoded
  // instruction" was looked up by the *number* of holes punched, from a
  // list that included SKYNET and PAPERCLIP. It decoded nothing. This is
  // an IBM 80-column card with the real thing: twelve rows in the real
  // order (12, 11, 0-9), rectangular holes, the clipped corner, the
  // preprinted digits, and the actual IBM 029 keypunch code, so what the
  // card says is genuinely what its holes mean.
  function punchcard(mount) {
    var COLS = 80, ROWS = 12;
    var ROW_LABEL = ["12", "11", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    // row index by punch name: 12 -> 0, 11 -> 1, 0..9 -> 2..11
    function rowOf(p) { return p === 12 ? 0 : p === 11 ? 1 : p + 2; }

    // IBM 029 keypunch, the common subset.
    var CODE = { " ": [] };
    "ABCDEFGHI".split("").forEach(function (ch, i) { CODE[ch] = [12, i + 1]; });
    "JKLMNOPQR".split("").forEach(function (ch, i) { CODE[ch] = [11, i + 1]; });
    "STUVWXYZ".split("").forEach(function (ch, i) { CODE[ch] = [0, i + 2]; });
    "0123456789".split("").forEach(function (ch, i) { CODE[ch] = [i]; });
    var SPECIALS = {
      "&": [12], "-": [11], "/": [0, 1],
      ".": [12, 3, 8], "<": [12, 4, 8], "(": [12, 5, 8], "+": [12, 6, 8], "|": [12, 7, 8],
      "!": [11, 2, 8], "$": [11, 3, 8], "*": [11, 4, 8], ")": [11, 5, 8], ";": [11, 6, 8],
      ",": [0, 3, 8], "%": [0, 4, 8], "_": [0, 5, 8], ">": [0, 6, 8], "?": [0, 7, 8],
      ":": [2, 8], "#": [3, 8], "@": [4, 8], "'": [5, 8], "=": [6, 8], '"': [7, 8]
    };
    for (var k in SPECIALS) if (Object.prototype.hasOwnProperty.call(SPECIALS, k)) CODE[k] = SPECIALS[k];

    // reverse lookup: sorted punch list -> character
    var DECODE = {};
    for (var ch in CODE) {
      if (!Object.prototype.hasOwnProperty.call(CODE, ch)) continue;
      DECODE[CODE[ch].slice().sort(function (a, b) { return a - b; }).join(",")] = ch;
    }

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.25rem;text-align:left;";
    var bar = controlBar();
    var input = document.createElement("input");
    input.type = "text";
    input.maxLength = COLS;
    input.spellcheck = false;
    input.setAttribute("aria-label", "Text to punch onto the card");
    input.placeholder = "TYPE TO PUNCH…";
    input.style.cssText = "flex:1 1 12rem;min-width:8rem;padding:.35rem .6rem;border-radius:6px;border:1px solid var(--border);background:rgba(0,0,0,.08);color:inherit;font-family:var(--font-mono);font-size:.8rem;text-transform:uppercase;";
    bar.appendChild(input);
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:180px;";
    canvasHost.style.touchAction = "pan-y";
    var readout = document.createElement("p");
    readout.style.cssText = "margin:.5rem 0 0;font-family:var(--font-mono);font-size:.75rem;line-height:1.5;min-height:2.4em;";
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(readout);
    mount.appendChild(wrap);

    // holes[col] = Set of row indices
    var holes = [];
    for (var i = 0; i < COLS; i++) holes.push({});

    function punchText(str) {
      holes = [];
      for (var i = 0; i < COLS; i++) holes.push({});
      var s = str.toUpperCase().slice(0, COLS);
      for (var c = 0; c < s.length; c++) {
        var code = CODE[s[c]];
        if (!code) continue;             // unpunchable character: leave the column blank
        code.forEach(function (pn) { holes[c][rowOf(pn)] = 1; });
      }
      refresh();
    }
    function colChar(c) {
      var punched = [];
      for (var r = 0; r < ROWS; r++) if (holes[c][r]) punched.push(r === 0 ? 12 : r === 1 ? 11 : r - 2);
      if (!punched.length) return " ";
      var key = punched.slice().sort(function (a, b) { return a - b; }).join(",");
      return DECODE[key] || "□";     // a combination no keypunch would make
    }
    function interpretation() {
      var out = "";
      for (var c = 0; c < COLS; c++) out += colChar(c);
      return out.replace(/\s+$/, "");
    }
    function refresh() {
      var text = interpretation();
      var punchedCols = 0, bad = 0;
      for (var c = 0; c < COLS; c++) {
        var any = false;
        for (var r = 0; r < ROWS; r++) if (holes[c][r]) any = true;
        if (any) punchedCols++;
        if (colChar(c) === "□") bad++;
      }
      if (!punchedCols) {
        readout.innerHTML = "Card blank. 80 columns, 12 rows, no holes — a card that means nothing, which is different from a card that means zero.";
        return;
      }
      readout.innerHTML = "Interpretation: <b>" + (text.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "&nbsp;") +
        "</b><br>" + punchedCols + " column(s) punched" +
        (bad ? ', <span style="color:#a03; font-weight:600;">' + bad + " with no valid 029 code</span> — the keypunch would have refused these." : ", every one a valid 029 code.");
    }

    input.addEventListener("input", function () { punchText(input.value); });

    ctlButton(bar, "Clear", "A fresh card", function () {
      input.value = "";
      punchText("");
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;

    // geometry, recomputed each frame so it survives resizes
    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 180;
      // real cards are 7-3/8 x 3-1/4 inches — 2.27:1
      var cw = Math.min(w, (h - 4) * 2.27);
      var chh = cw / 2.27;
      var x = (w - cw) / 2, y = (h - chh) / 2;
      // The punch grid, with a left gutter wide enough for the 12/11 legend.
      // One source of truth: hit-testing and drawing both read it from here.
      return {
        w: w, h: h, x: x, y: y, cw: cw, ch: chh,
        gx: x + cw * 0.045, gy: y + chh * 0.22,
        gw: cw * 0.945, gh: chh * 0.74
      };
    }

    canvasHost.addEventListener("pointerdown", function (e) {
      var L = layout();
      var rect = canvasHost.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      var gx = L.gx, gy = L.gy, gw = L.gw, gh = L.gh;
      var col = Math.floor((px - gx) / (gw / COLS));
      var row = Math.floor((py - gy) / (gh / ROWS));
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
      if (holes[col][row]) delete holes[col][row]; else holes[col][row] = 1;
      input.value = interpretation();
      refresh();
    });

    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);
      var ink = cssVar("--fg", "#2b2416");
      var faint = cssVar("--muted", "#6b5c3e");

      // card stock, with the upper-left corner cut off as on a real card
      var cut = L.ch * 0.14;
      ctx.beginPath();
      ctx.moveTo(L.x + cut, L.y);
      ctx.lineTo(L.x + L.cw, L.y);
      ctx.lineTo(L.x + L.cw, L.y + L.ch);
      ctx.lineTo(L.x, L.y + L.ch);
      ctx.lineTo(L.x, L.y + cut);
      ctx.closePath();
      ctx.fillStyle = "#efe4c4";
      ctx.fill();
      ctx.strokeStyle = "rgba(80,64,36,.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      var gx = L.gx, gy = L.gy, gw = L.gw, gh = L.gh;
      var cellW = gw / COLS, cellH = gh / ROWS;
      var holeW = Math.max(1.1, cellW * 0.5), holeH = Math.max(2.2, cellH * 0.62);

      // the interpretation the keypunch prints along the top edge
      ctx.font = Math.max(5, L.ch * 0.075) + "px ui-monospace, monospace";
      ctx.fillStyle = "rgba(40,32,16,.85)";
      var text = interpretation();
      for (var t = 0; t < Math.min(text.length, COLS); t++) {
        if (text[t] === " ") continue;
        ctx.fillText(text[t], gx + t * cellW + cellW * 0.16, L.y + L.ch * 0.165);
      }

      // preprinted digits, replaced by a rectangular hole where punched
      var digitFont = Math.max(3.2, cellH * 0.66);
      ctx.font = digitFont + "px ui-monospace, monospace";
      for (var col = 0; col < COLS; col++) {
        for (var row = 0; row < ROWS; row++) {
          var cx = gx + col * cellW, cy = gy + row * cellH;
          if (holes[col][row]) {
            ctx.fillStyle = "#120d05";
            ctx.fillRect(cx + (cellW - holeW) / 2, cy + (cellH - holeH) / 2, holeW, holeH);
          } else if (row >= 2) {
            // rows 0-9 carry a printed digit; the 12 and 11 rows are blank
            ctx.fillStyle = "rgba(90,74,42,.45)";
            ctx.fillText(ROW_LABEL[row], cx + cellW * 0.18, cy + cellH * 0.82);
          }
        }
      }

      // row legend down the left edge, and column ticks along the bottom
      ctx.font = Math.max(4, cellH * 0.7) + "px ui-monospace, monospace";
      ctx.fillStyle = "rgba(90,74,42,.55)";
      ctx.fillText("12", L.x + 1, gy + cellH * 0.85);
      ctx.fillText("11", L.x + 1, gy + cellH * 1.85);
      ctx.font = Math.max(4.5, L.ch * 0.05) + "px ui-monospace, monospace";
      for (var m = 10; m <= 80; m += 10) {
        ctx.fillText(String(m), gx + (m - 1) * cellW - 3, L.y + L.ch - 2);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    refresh();
  }

  // ---------------------------------------------------------------
  // Past — Abacus
  // ---------------------------------------------------------------
  // The previous version was rounded pills that changed opacity when
  // clicked, with every bead toggling independently — so you could hold
  // beads 1 and 3 against the beam with bead 2 still resting, which is not
  // a position an abacus can physically be in. This is a soroban: beads
  // slide, they push the beads in front of them, and a value is read off
  // where the beads sit rather than off which ones are lit.
  function abacus(mount) {
    var RODS = 9, EARTH = 4;

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.25rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:210px;";
    canvasHost.style.touchAction = "pan-y";
    var readout = document.createElement("p");
    readout.style.cssText = "margin:.5rem 0 0;font-family:var(--font-mono);font-size:.95rem;min-height:1.6em;";
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(readout);
    mount.appendChild(wrap);

    // per rod: heaven bead down against the beam? and how many earth beads
    // are pushed up against it.
    var heaven = new Array(RODS).fill(false);
    var earth = new Array(RODS).fill(0);
    // rendered positions, lerped toward the target so beads visibly slide
    var heavenPos = new Array(RODS).fill(0);
    var earthPos = [];
    for (var i = 0; i < RODS; i++) earthPos.push(new Array(EARTH).fill(0));

    function value() {
      var s = "";
      for (var r = 0; r < RODS; r++) s += String((heaven[r] ? 5 : 0) + earth[r]);
      return s;
    }
    function refresh() {
      var s = value();
      var trimmed = s.replace(/^0+/, "");
      readout.innerHTML = "Reads <b>" + (trimmed === "" ? "0" : trimmed) + "</b>" +
        '<span style="opacity:.55"> &nbsp;·&nbsp; rods: ' + s.split("").join(" ") + "</span>";
    }

    ctlButton(bar, "Clear", "Tilt the frame and rattle every bead back to its rail", function () {
      heaven.fill(false);
      for (var r = 0; r < RODS; r++) earth[r] = 0;
      refresh();
    });
    spacer(bar);
    var noteEl = document.createElement("span");
    noteEl.style.cssText = "font-size:.72rem;color:var(--muted);";
    noteEl.textContent = "1 heaven bead = 5 · 4 earth beads = 1 each";
    bar.appendChild(noteEl);

    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 210;
      var frameW = Math.min(w - 4, 520), frameH = Math.min(h - 4, 200);
      var x = (w - frameW) / 2, y = (h - frameH) / 2;
      var rail = Math.max(9, frameH * 0.055);          // frame thickness
      var innerX = x + rail, innerY = y + rail;
      var innerW = frameW - rail * 2, innerH = frameH - rail * 2;
      var beadH = innerH / 7.6;                         // 1 heaven + 4 earth + slack
      var beamY = innerY + beadH * 1.9;
      var beamH = Math.max(5, frameH * 0.045);
      return {
        w: w, h: h, x: x, y: y, fw: frameW, fh: frameH, rail: rail,
        innerX: innerX, innerY: innerY, innerW: innerW, innerH: innerH,
        colW: innerW / RODS, beadH: beadH, beamY: beamY, beamH: beamH
      };
    }
    // Where a bead sits, as a y coordinate.
    function heavenTargetY(L, on) {
      return on ? L.beamY - L.beadH * 0.62 : L.innerY + L.beadH * 0.62;
    }
    function earthTargetY(L, idx, count) {
      var bottom = L.innerY + L.innerH - L.beadH * 0.62;
      var top = L.beamY + L.beamH + L.beadH * 0.62;
      return idx < count
        ? top + idx * L.beadH                              // pushed up to the beam
        : bottom - (EARTH - 1 - idx) * L.beadH;            // resting on the rail
    }

    canvasHost.addEventListener("pointerdown", function (e) {
      var L = layout();
      var rect = canvasHost.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      var rod = Math.floor((px - L.innerX) / L.colW);
      if (rod < 0 || rod >= RODS) return;
      if (py < L.beamY) {
        heaven[rod] = !heaven[rod];
      } else {
        // Find which earth bead was hit at its *current* position, then set
        // the count so that bead ends up against the beam — the beads in
        // front of it come along, exactly as they must on a real rod.
        var hit = -1, best = 1e9;
        for (var b = 0; b < EARTH; b++) {
          var by = earthTargetY(L, b, earth[rod]);
          var d = Math.abs(py - by);
          if (d < L.beadH * 0.75 && d < best) { best = d; hit = b; }
        }
        if (hit < 0) return;
        earth[rod] = hit < earth[rod] ? hit : hit + 1;
      }
      refresh();
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;

    // A biconical bead, as turned on a lathe: two cones meeting at a ridge.
    function bead(cx, cy, w, h, lit) {
      var hw = w / 2, hh = h / 2;
      var g = ctx.createLinearGradient(cx - hw, cy, cx + hw, cy);
      g.addColorStop(0, lit ? "#7a3b18" : "#5d3517");
      g.addColorStop(0.34, lit ? "#c8763c" : "#9c5c2c");
      g.addColorStop(0.52, lit ? "#e6a068" : "#b87742");
      g.addColorStop(1, lit ? "#5e2c11" : "#4a2a12");
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy);
      ctx.lineTo(cx - hw * 0.42, cy - hh);
      ctx.lineTo(cx + hw * 0.42, cy - hh);
      ctx.lineTo(cx + hw, cy);
      ctx.lineTo(cx + hw * 0.42, cy + hh);
      ctx.lineTo(cx - hw * 0.42, cy + hh);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(30,14,4,.6)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // the ridge where the two cones meet
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy);
      ctx.lineTo(cx + hw, cy);
      ctx.strokeStyle = "rgba(255,220,180,.28)";
      ctx.stroke();
    }

    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);

      // hardwood frame
      var fg = ctx.createLinearGradient(0, L.y, 0, L.y + L.fh);
      fg.addColorStop(0, "#6b4522");
      fg.addColorStop(0.5, "#8a5c30");
      fg.addColorStop(1, "#5a3819");
      ctx.fillStyle = fg;
      ctx.fillRect(L.x, L.y, L.fw, L.fh);
      ctx.strokeStyle = "rgba(20,10,2,.7)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(L.x + 0.5, L.y + 0.5, L.fw - 1, L.fh - 1);
      // grain
      ctx.strokeStyle = "rgba(40,20,6,.16)";
      ctx.lineWidth = 0.7;
      for (var gI = 0; gI < 14; gI++) {
        var gy2 = L.y + (gI + 0.5) * (L.fh / 14);
        ctx.beginPath();
        ctx.moveTo(L.x + 2, gy2);
        ctx.bezierCurveTo(L.x + L.fw * 0.3, gy2 + 2.5, L.x + L.fw * 0.7, gy2 - 2.5, L.x + L.fw - 2, gy2);
        ctx.stroke();
      }
      // recessed interior
      ctx.fillStyle = "#2a1a0c";
      ctx.fillRect(L.innerX, L.innerY, L.innerW, L.innerH);

      // rods
      for (var r = 0; r < RODS; r++) {
        var cx = L.innerX + (r + 0.5) * L.colW;
        var rg = ctx.createLinearGradient(cx - 2, 0, cx + 2, 0);
        rg.addColorStop(0, "#6a6055");
        rg.addColorStop(0.5, "#cfc4b0");
        rg.addColorStop(1, "#6a6055");
        ctx.fillStyle = rg;
        ctx.fillRect(cx - 1.5, L.innerY, 3, L.innerH);
      }

      // beads below the beam first, then the beam, then heaven beads
      var beadW = Math.min(L.colW * 0.82, L.beadH * 1.9);
      for (var r2 = 0; r2 < RODS; r2++) {
        var cx2 = L.innerX + (r2 + 0.5) * L.colW;
        for (var b2 = 0; b2 < EARTH; b2++) {
          var ty = earthTargetY(L, b2, earth[r2]);
          if (!earthPos[r2][b2]) earthPos[r2][b2] = ty;
          earthPos[r2][b2] += (ty - earthPos[r2][b2]) * 0.34;
          bead(cx2, earthPos[r2][b2], beadW, L.beadH * 0.92, b2 < earth[r2]);
        }
      }

      // reckoning beam, with unit dots every third rod
      var bg = ctx.createLinearGradient(0, L.beamY, 0, L.beamY + L.beamH);
      bg.addColorStop(0, "#7d5028");
      bg.addColorStop(1, "#4e3016");
      ctx.fillStyle = bg;
      ctx.fillRect(L.innerX, L.beamY, L.innerW, L.beamH);
      ctx.strokeStyle = "rgba(20,10,2,.6)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(L.innerX + 0.5, L.beamY + 0.5, L.innerW - 1, L.beamH - 1);
      for (var d2 = RODS - 1; d2 >= 0; d2 -= 3) {
        ctx.beginPath();
        ctx.arc(L.innerX + (d2 + 0.5) * L.colW, L.beamY + L.beamH / 2, Math.max(1, L.beamH * 0.17), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,225,190,.7)";
        ctx.fill();
      }

      for (var r3 = 0; r3 < RODS; r3++) {
        var cx3 = L.innerX + (r3 + 0.5) * L.colW;
        var hy = heavenTargetY(L, heaven[r3]);
        if (!heavenPos[r3]) heavenPos[r3] = hy;
        heavenPos[r3] += (hy - heavenPos[r3]) * 0.34;
        bead(cx3, heavenPos[r3], beadW, L.beadH * 0.92, heaven[r3]);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    refresh();
  }

  // ---------------------------------------------------------------
  // Past — Quipu (knotted rope)
  // ---------------------------------------------------------------
  // Real khipu encoding: base ten, read top to bottom, with the power of
  // ten decreasing down the cord. Tens and above are clusters of simple
  // overhand knots; the units position is a long knot of N turns, except
  // for 1, which can't be a long knot and is tied as a figure-eight. Zero
  // is an empty space at that level — a positional zero, on string,
  // centuries before it reached European arithmetic on paper.
  function quipuKnots(mount) {
    var BANDS = [1000, 100, 10, 1];
    var CORDS = [
      { label: "maize", color: "#e8c98a", d: [0, 2, 4, 3] },
      { label: "beans", color: "#c98a5a", d: [0, 1, 0, 7] },
      { label: "llamas", color: "#a9b7a0", d: [0, 0, 8, 1] },
      { label: "cloth", color: "#c49bc4", d: [0, 3, 2, 0] }
    ];

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:250px;";
    canvasHost.style.touchAction = "pan-y";
    var status = statusLine(2.8);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function valueOf(c) { return c.d.reduce(function (a, dg, i) { return a + dg * BANDS[i]; }, 0); }
    function total() { return CORDS.reduce(function (a, c) { return a + valueOf(c); }, 0); }
    function refresh() {
      status.innerHTML = CORDS.map(function (c) {
        return '<span style="color:' + c.color + '">' + c.label + " " + valueOf(c) + "</span>";
      }).join(" &nbsp;·&nbsp; ") + "<br>Top cord carries the sum: <b>" + total() +
        "</b> — read with the fingers, in the dark, by anyone trained to it.";
    }

    ctlButton(bar, "Clear", "Untie every knot", function () {
      CORDS.forEach(function (c) { c.d = [0, 0, 0, 0]; });
      refresh();
    });
    var hint = document.createElement("span");
    hint.style.cssText = "font-size:.72rem;color:var(--muted);";
    hint.textContent = "tap a cord at a level to add a knot · 1000s at the top, units at the bottom";
    spacer(bar);
    bar.appendChild(hint);

    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 250;
      return { w: w, h: h, topY: 30, bandY: [66, 110, 154, 200], x0: w * 0.26, gap: (w * 0.66) / (CORDS.length - 1) };
    }

    canvasHost.addEventListener("pointerdown", function (e) {
      var L = layout();
      var r = canvasHost.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      var ci = Math.round((px - L.x0) / L.gap);
      if (ci < 0 || ci >= CORDS.length) return;
      if (Math.abs(px - (L.x0 + ci * L.gap)) > L.gap * 0.42) return;
      var bi = -1, best = 30;
      L.bandY.forEach(function (by, i) {
        var d = Math.abs(py - by);
        if (d < best) { best = d; bi = i; }
      });
      if (bi < 0) return;
      CORDS[ci].d[bi] = (CORDS[ci].d[bi] + 1) % 10;
      refresh();
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;

    function cordLine(x, y0, y1, color, wdt) {
      ctx.strokeStyle = color;
      ctx.lineWidth = wdt;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.bezierCurveTo(x + 1.5, y0 + (y1 - y0) * 0.4, x - 1.5, y0 + (y1 - y0) * 0.7, x, y1);
      ctx.stroke();
    }
    function simpleKnot(x, y, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    function figureEight(x, y, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(x, y - 3, 4, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y + 3, 4, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // One knot, wrapped N times — not N knots. That distinction is the
    // whole reason the units position can be told apart by touch from the
    // tens position above it.
    function longKnot(x, y, turns, color) {
      var hgt = turns * 4.2;
      var top = y - hgt / 2, bot = y + hgt / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 5.4, top, 10.8, hgt, 5);
      else ctx.rect(x - 5.4, top, 10.8, hgt);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.45)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // the ridges of the individual turns, running across the coil
      ctx.strokeStyle = "rgba(0,0,0,.4)";
      ctx.lineWidth = 1;
      for (var t = 1; t < turns; t++) {
        var yy = top + t * (hgt / turns);
        ctx.beginPath();
        ctx.moveTo(x - 5, yy - 1.1);
        ctx.lineTo(x + 5, yy + 1.1);
        ctx.stroke();
      }
    }

    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);
      var muted = cssVar("--muted", "#c2a578");

      // primary cord, running across the top
      ctx.strokeStyle = "#8a6a45";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(L.w * 0.06, L.topY);
      ctx.bezierCurveTo(L.w * 0.3, L.topY - 5, L.w * 0.7, L.topY + 5, L.w * 0.96, L.topY);
      ctx.stroke();

      // level guides
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.globalAlpha = 0.7;
      L.bandY.forEach(function (by, i) {
        ctx.fillText(String(BANDS[i]), 4, by + 3);
        ctx.strokeStyle = "rgba(255,255,255,.06)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(34, by); ctx.lineTo(L.w - 6, by); ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // the summation cord, hanging on the far left, not editable
      var sx = L.w * 0.1;
      cordLine(sx, L.topY, L.h - 16, "#d9c39a", 3.4);
      var sumDigits = String(total()).padStart(4, "0").split("").map(Number);
      sumDigits.forEach(function (dg, i) {
        drawBand(sx, L.bandY[i], dg, i === 3, "#f0e2c0");
      });
      ctx.fillStyle = muted;
      ctx.font = "9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("SUM", sx, L.h - 4);

      CORDS.forEach(function (cd, i) {
        var x = L.x0 + i * L.gap;
        cordLine(x, L.topY, L.h - 16, cd.color, 3);
        cd.d.forEach(function (dg, bi) { drawBand(x, L.bandY[bi], dg, bi === 3, cd.color); });
        ctx.fillStyle = cd.color;
        ctx.fillText(cd.label, x, L.h - 4);
      });
      ctx.textAlign = "left";
      requestAnimationFrame(frame);
    }
    function drawBand(x, y, digit, isUnits, color) {
      if (digit === 0) return;
      if (isUnits) {
        if (digit === 1) figureEight(x, y, color);
        else longKnot(x, y, digit, color);
      } else {
        var spread = Math.min(7, 26 / digit);
        var startY = y - ((digit - 1) * spread) / 2;
        for (var k = 0; k < digit; k++) simpleKnot(x, startY + k * spread, color);
      }
    }
    requestAnimationFrame(frame);
    refresh();
  }

  // ---------------------------------------------------------------
  // Past — Clay tablet (Sumerian ledger)
  // ---------------------------------------------------------------
  // Sexagesimal, as actually written: a vertical wedge for one, a
  // winkelhaken (corner wedge) for ten, clustered up to 59, then a new
  // place to the left worth sixty. The tablet stays editable only while
  // the clay is damp — which is the whole reason this exhibit has a Fire
  // button and no undo after it.
  function clayTablet(mount) {
    var ROWS = [
      { label: "grain (sila)", v: 0 },
      { label: "beer (jugs)", v: 0 },
      { label: "sheep", v: 0 }
    ];
    var stylus = 1;
    var fired = false;

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:210px;";
    canvasHost.style.touchAction = "pan-y";
    var status = statusLine(2.8);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function sexagesimal(n) {
      if (n === 0) return "0";
      var parts = [];
      while (n > 0) { parts.unshift(n % 60); n = Math.floor(n / 60); }
      return parts.join(",") + " (base 60)";
    }
    var note = "";
    function refresh() {
      status.innerHTML = ROWS.map(function (r) {
        return r.label + " <b>" + r.v + "</b> <span style='opacity:.6'>= " + sexagesimal(r.v) + "</span>";
      }).join("<br>") +
        (fired ? '<br><span style="color:#8a3b12;">Fired. The ledger is permanent now — and permanently wrong, if it was wrong.</span>' : "") +
        (note ? '<br><span style="color:#8a3b12;">' + note + "</span>" : "");
    }
    // Smooth is meaningless on a fired tablet and Fire has nothing left to
    // do, so the pair becomes: no smoothing, and a fresh lump of clay.
    function syncButtons() {
      smoothBtn.disabled = fired;
      smoothBtn.title = fired ? "Fired clay does not smooth" : "Wipe the damp clay flat again";
      fireBtn.textContent = fired ? "New tablet" : "Fire";
      fireBtn.title = fired
        ? "This one is finished. Take a fresh lump of clay."
        : "Bake the tablet. There is no editing a fired tablet.";
    }

    var unitBtn = ctlButton(bar, "❘ one", "Impress a vertical wedge — worth one", function () {
      stylus = 1; setActive(unitBtn, true); setActive(tenBtn, false);
    });
    var tenBtn = ctlButton(bar, "‹ ten", "Impress a winkelhaken — worth ten", function () {
      stylus = 10; setActive(unitBtn, false); setActive(tenBtn, true);
    });
    setActive(unitBtn, true);
    spacer(bar);
    var smoothBtn = ctlButton(bar, "Smooth", "Wipe the damp clay flat again", function () {
      if (fired) return;
      ROWS.forEach(function (r) { r.v = 0; });
      note = "";
      refresh();
    });
    var fireBtn = ctlButton(bar, "Fire", "Bake the tablet. There is no editing a fired tablet.", function () {
      if (fired) {
        fired = false;
        ROWS.forEach(function (r) { r.v = 0; });
        note = "";
      } else {
        fired = true;
      }
      syncButtons();
      refresh();
    });
    syncButtons();

    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 210;
      var tw = Math.min(w - 8, 520), th = Math.min(h - 8, 196);
      return { w: w, h: h, x: (w - tw) / 2, y: (h - th) / 2, tw: tw, th: th, rowH: th / 3.4 };
    }
    canvasHost.addEventListener("pointerdown", function (e) {
      if (fired) {
        note = "The clay is fired. The stylus leaves no mark on it.";
        refresh();
        return;
      }
      var L = layout();
      var r = canvasHost.getBoundingClientRect();
      var py = e.clientY - r.top;
      var idx = Math.floor((py - (L.y + L.th * 0.12)) / L.rowH);
      if (idx < 0 || idx >= ROWS.length) return;
      ROWS[idx].v = Math.min(3599, ROWS[idx].v + stylus);
      note = "";
      refresh();
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;

    // A vertical wedge: the triangular head the stylus leaves, plus its tail.
    function unitWedge(x, y, s, ink) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.30, y - s * 0.34);
      ctx.lineTo(x + s * 0.30, y - s * 0.34);
      ctx.lineTo(x, y + s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(x - s * 0.05, y + s * 0.06, s * 0.1, s * 0.34);
    }
    // A winkelhaken: the corner impression, made with the stylus turned.
    function tenWedge(x, y, s, ink) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.5, y - s * 0.34);
      ctx.lineTo(x + s * 0.34, y - s * 0.1);
      ctx.lineTo(x - s * 0.2, y + s * 0.44);
      ctx.closePath();
      ctx.fill();
    }

    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);
      var clay = fired ? "#a9622f" : "#c39a63";
      var clay2 = fired ? "#8d4a1f" : "#a97f4a";
      var ink = fired ? "rgba(50,22,6,.85)" : "rgba(60,38,14,.72)";

      // slab, with a pillowed edge
      var g = ctx.createLinearGradient(0, L.y, 0, L.y + L.th);
      g.addColorStop(0, clay);
      g.addColorStop(1, clay2);
      ctx.fillStyle = g;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(L.x, L.y, L.tw, L.th, 14);
      else ctx.rect(L.x, L.y, L.tw, L.th);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,34,10,.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = "10px ui-monospace, monospace";
      ROWS.forEach(function (row, i) {
        var ry = L.y + L.th * 0.12 + i * L.rowH + L.rowH * 0.5;
        ctx.fillStyle = "rgba(50,30,10,.55)";
        ctx.fillText(row.label, L.x + 12, ry + 3);
        // ruled divider, as scribes drew
        ctx.strokeStyle = "rgba(60,34,10,.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(L.x + 10, ry + L.rowH * 0.46);
        ctx.lineTo(L.x + L.tw - 10, ry + L.rowH * 0.46);
        ctx.stroke();

        // Three wedges must stack inside one ruled row, so the glyph is
        // sized off the row rather than a fixed maximum.
        var s = Math.min(14, L.rowH * 0.235);
        var vgap = s * 1.12;
        var x = L.x + 128;
        var sixties = Math.floor(row.v / 60), rest = row.v % 60;
        var tens = Math.floor(rest / 10), units = rest % 10;

        // Scribes clustered wedges in columns of three, reading left to
        // right — nine units fit in a 3x3 block before the next place.
        function cluster(x0, n, size, draw) {
          var rowsUsed = Math.min(n, 3);
          for (var q = 0; q < n; q++) {
            var col = Math.floor(q / 3), rw = q % 3;
            var inCol = Math.min(3, n - col * 3);
            draw(x0 + col * size * 1.0,
                 ry - ((inCol - 1) * vgap) / 2 + rw * vgap, size);
          }
          return x0 + Math.ceil(n / 3) * size * 1.0;
        }
        if (sixties > 0) {
          x = cluster(x, Math.min(sixties, 9), s, function (px, py, sz) { unitWedge(px, py, sz, ink); });
          // the place divider: everything left of it is worth sixty
          ctx.strokeStyle = "rgba(60,34,10,.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + s * 0.34, ry - L.rowH * 0.3);
          ctx.lineTo(x + s * 0.34, ry + L.rowH * 0.3);
          ctx.stroke();
          ctx.fillStyle = "rgba(60,34,10,.35)";
          ctx.fillText("60s", L.x + 128, ry - L.rowH * 0.4);
          x += s * 0.9;
        }
        if (tens > 0) x = cluster(x, tens, s, function (px, py, sz) { tenWedge(px, py, sz, ink); }) + s * 0.5;
        if (units > 0) cluster(x, units, s, function (px, py, sz) { unitWedge(px, py, sz, ink); });
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    refresh();
  }

  // ---------------------------------------------------------------
  // Past — Babbage's Difference Engine
  // ---------------------------------------------------------------
  // The method of finite differences: a polynomial's values can be
  // produced by addition alone, if you keep a column of differences and
  // add each into the one above it. That is the entire machine. The
  // printing apparatus at the bottom is the part Babbage cared most about,
  // because a table computed correctly and then typeset wrongly is still a
  // wrecked ship.
  function babbageEngine(mount) {
    var POLYS = [
      { name: "x² + x + 41", f: function (x) { return x * x + x + 41; } },
      { name: "x³", f: function (x) { return x * x * x; } },
      { name: "2x² + 3x + 1", f: function (x) { return 2 * x * x + 3 * x + 1; } }
    ];
    var poly = POLYS[0];
    var x = 0, reg = [0, 0, 0, 0], adds = 0, tape = [];

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:216px;";
    var status = statusLine(2.8);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function setPoly(p) {
      poly = p;
      x = 0; adds = 0; tape = [];
      // seed the difference columns from the polynomial's first values
      var f = p.f;
      reg = [
        f(0),
        f(1) - f(0),
        f(2) - 2 * f(1) + f(0),
        f(3) - 3 * f(2) + 3 * f(1) - f(0)
      ];
      tape.push({ x: 0, v: reg[0] });
      refresh();
    }
    function crank() {
      // Each column takes the value its neighbour held at the *start* of
      // the turn, so the additions run top-down. Doing it bottom-up feeds
      // each freshly-updated difference straight back into the column
      // above and every value comes out too large. Babbage's answer to the
      // same hazard was to add the odd and even columns on separate half
      // turns of the handle.
      reg[0] += reg[1];
      reg[1] += reg[2];
      reg[2] += reg[3];
      adds += 3;
      x += 1;
      tape.push({ x: x, v: reg[0] });
      if (tape.length > 9) tape.shift();
      refresh();
    }
    function refresh() {
      var truth = poly.f(x);
      status.innerHTML = "f(" + x + ") = <b>" + reg[0] + "</b>" +
        (reg[0] === truth ? "" : ' <span style="color:#a03;">(expected ' + truth + ")</span>") +
        " &nbsp;·&nbsp; " + adds + " additions, no multiplication anywhere in the mechanism." +
        "<br>Ada Lovelace's point was that the columns need not hold numbers at all.";
    }

    POLYS.forEach(function (p) {
      ctlButton(bar, p.name, "Set the engine's difference columns for " + p.name, function () { setPoly(p); });
    });
    spacer(bar);
    ctlButton(bar, "Crank", "One turn of the handle", crank);
    ctlButton(bar, "Crank ×10", "Ten turns", function () { for (var i = 0; i < 10; i++) crank(); });
    ctlButton(bar, "Reset", "Return the columns to their starting values", function () { setPoly(poly); });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;

    function wheelStack(cx, cy, value, label, accent, muted) {
      var digits = String(Math.abs(value)).split("");
      if (value < 0) digits.unshift("-");
      var dw = 15, dh = 21;
      var totalW = digits.length * dw;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.textAlign = "center";
      ctx.fillText(label, cx, cy - dh * 0.9);
      digits.forEach(function (d, i) {
        var dx = cx - totalW / 2 + i * dw;
        var g = ctx.createLinearGradient(0, cy - dh / 2, 0, cy + dh / 2);
        g.addColorStop(0, "#3a2c14");
        g.addColorStop(0.5, "#c9a24b");
        g.addColorStop(1, "#3a2c14");
        ctx.fillStyle = g;
        ctx.fillRect(dx + 1, cy - dh / 2, dw - 2, dh);
        ctx.strokeStyle = "rgba(0,0,0,.5)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(dx + 1.5, cy - dh / 2 + 0.5, dw - 3, dh - 1);
        ctx.fillStyle = "#20170a";
        ctx.font = "bold 13px ui-monospace, monospace";
        ctx.fillText(d, dx + dw / 2, cy + 5);
        ctx.font = "10px ui-monospace, monospace";
      });
      ctx.textAlign = "left";
    }

    function frame() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 216;
      ctx.clearRect(0, 0, w, h);
      var muted = cssVar("--muted", "#a08e6a");
      var accent = cssVar("--accent", "#c9a24b");

      var labels = ["RESULT f(x)", "Δ1", "Δ2", "Δ3"];
      var colX = [w * 0.16, w * 0.38, w * 0.56, w * 0.72];
      var cy = 44;
      for (var i = 0; i < 4; i++) wheelStack(colX[i], cy, reg[i], labels[i], accent, muted);

      // the gearing that adds each column into the one above it
      ctx.strokeStyle = "rgba(201,162,75,.5)";
      ctx.lineWidth = 1;
      for (var k = 3; k >= 1; k--) {
        var x1 = colX[k], x0 = colX[k - 1];
        ctx.beginPath();
        ctx.moveTo(x1, cy + 18);
        ctx.bezierCurveTo(x1, cy + 34, x0, cy + 34, x0, cy + 18);
        ctx.stroke();
        ctx.fillStyle = "rgba(201,162,75,.75)";
        ctx.font = "9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("+", (x0 + x1) / 2, cy + 38);
        ctx.textAlign = "left";
      }

      // the printing apparatus
      var py = cy + 56;
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.fillRect(w * 0.1, py, w * 0.8, h - py - 8);
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.strokeRect(w * 0.1 + 0.5, py + 0.5, w * 0.8 - 1, h - py - 9);
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.fillText("PRINTED TABLE", w * 0.1 + 8, py + 14);
      tape.forEach(function (t, i) {
        var ty = py + 30 + i * 12;
        if (ty > h - 12) return;
        ctx.fillStyle = i === tape.length - 1 ? accent : muted;
        ctx.fillText("x = " + String(t.x).padStart(2, " ") + "    f(x) = " + t.v, w * 0.1 + 14, ty);
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    setPoly(POLYS[0]);
  }

  // ---------------------------------------------------------------
  // Past — Jacquard loom
  // ---------------------------------------------------------------
  // A chain of punched cards, one card per pick of the shuttle. A hole
  // lets its hook through, so that warp thread lifts and the weft passes
  // underneath; no hole and the warp stays down. The pattern is not drawn
  // anywhere — it is a consequence of the holes, which is exactly the idea
  // Babbage borrowed and Hollerith monetised.
  function jacquardLoom(mount) {
    var HOOKS = 12, CARDS = 10, PASSES = 4;
    var chain = [];
    for (var i = 0; i < CARDS; i++) chain.push(new Array(HOOKS).fill(0));

    var PRESETS = {
      Damask: function (c, k) { return ((c + k) % 4 < 2) !== (((c - k) % 6 + 6) % 6 < 3) ? 1 : 0; },
      Twill: function (c, k) { return ((k + c) % 4 < 2) ? 1 : 0; },
      Diamond: function (c, k) {
        var d = Math.abs(k - HOOKS / 2 + 0.5) + Math.abs(c - CARDS / 2 + 0.5);
        return d < 5 ? 1 : 0;
      },
      Houndstooth: function (c, k) {
        var block = (Math.floor(c / 2) + Math.floor(k / 3)) % 2;
        return block !== ((c + k) % 4 === 0) ? 1 : 0;
      },
      Honeycomb: function (c, k) {
        return ((c + k * 2) % 6 < 2 || (c - k * 2 + 60) % 6 < 2) ? 1 : 0;
      },
      Chevron: function (c, k) {
        var fold = c < CARDS / 2 ? c : CARDS - 1 - c;
        return (k + fold * 2) % 6 < 2 ? 1 : 0;
      },
      Rose: function (c, k) {
        var x = k - (HOOKS - 1) / 2, y = c - (CARDS - 1) / 2;
        var petal = Math.abs(Math.sin(Math.atan2(y, x) * 4)) * 3.2;
        return Math.hypot(x, y) < 2.4 + petal ? 1 : 0;
      },
      Maze: function (c, k) {
        return ((c % 4 === 0 || k % 4 === 0) && (c + k) % 3 !== 0) ? 1 : 0;
      },
      Portrait: function (c, k) {
        var face = k > 2 && k < 9 && c > 0 && c < 9;
        var eyes = (c === 3 && (k === 4 || k === 7));
        var mouth = c === 7 && k > 4 && k < 8;
        return face && !eyes && !mouth ? 1 : 0;
      }
    };
    function applyPreset(name) {
      var f = PRESETS[name];
      for (var c = 0; c < CARDS; c++) for (var k = 0; k < HOOKS; k++) chain[c][k] = f(c, k);
      refresh();
    }

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:250px;";
    canvasHost.style.touchAction = "pan-y";
    var status = statusLine(2.4);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function refresh() {
      var holes = chain.reduce(function (a, c) {
        return a + c.reduce(function (b, v) { return b + v; }, 0);
      }, 0);
      status.innerHTML = CARDS + " cards &nbsp;·&nbsp; " + HOOKS + " hooks &nbsp;·&nbsp; <b>" + holes +
        "</b> holes punched. The cloth below is not stored anywhere — it is what the holes do.";
    }

    Object.keys(PRESETS).forEach(function (name) {
      ctlButton(bar, name, "Punch the " + name.toLowerCase() + " card chain", function () { applyPreset(name); });
    });
    spacer(bar);
    ctlButton(bar, "Blank", "An unpunched chain weaves plain cloth", function () {
      chain.forEach(function (c) { c.fill(0); });
      refresh();
    });

    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 250;
      var chainH = h * 0.42, gap = 12;
      return {
        w: w, h: h, cx: 8, cy: 16, cw: w - 16, chH: chainH - 20,
        fy: 16 + chainH + gap - 20, fh: h - (16 + chainH + gap - 20) - 18
      };
    }
    canvasHost.addEventListener("pointerdown", function (e) {
      var L = layout();
      var r = canvasHost.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      var cardW = L.cw / CARDS, hookH = L.chH / HOOKS;
      var c = Math.floor((px - L.cx) / cardW), k = Math.floor((py - L.cy) / hookH);
      if (c < 0 || c >= CARDS || k < 0 || k >= HOOKS) return;
      chain[c][k] = chain[c][k] ? 0 : 1;
      refresh();
    });

    var cv = makeCanvas(canvasHost);
    var ctx = cv.ctx;
    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);
      var accent = cssVar("--accent", "#d88fd0");
      var muted = cssVar("--muted", "#b79cc0");
      var cardW = L.cw / CARDS, hookH = L.chH / HOOKS;

      // the card chain, laced together
      for (var c = 0; c < CARDS; c++) {
        var x = L.cx + c * cardW;
        ctx.fillStyle = "rgba(226,208,170,.82)";
        ctx.fillRect(x + 1.5, L.cy, cardW - 3, L.chH);
        ctx.strokeStyle = "rgba(60,40,20,.5)";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x + 1.5, L.cy + 0.5, cardW - 3, L.chH - 1);
        for (var k = 0; k < HOOKS; k++) {
          var hy = L.cy + k * hookH;
          if (chain[c][k]) {
            ctx.fillStyle = "#1a1020";
            ctx.fillRect(x + cardW * 0.3, hy + hookH * 0.22, cardW * 0.4, hookH * 0.56);
          } else {
            ctx.fillStyle = "rgba(90,70,40,.28)";
            ctx.beginPath();
            ctx.arc(x + cardW / 2, hy + hookH / 2, Math.max(0.6, hookH * 0.09), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // the lacing between cards
        if (c < CARDS - 1) {
          ctx.strokeStyle = "rgba(60,40,20,.45)";
          ctx.beginPath();
          ctx.moveTo(x + cardW - 1.5, L.cy + L.chH * 0.5);
          ctx.lineTo(x + cardW + 1.5, L.cy + L.chH * 0.5);
          ctx.stroke();
        }
      }
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.fillText("CARD CHAIN — one card per pick", L.cx, L.cy - 4);

      // the cloth: each row is one card, the chain repeating
      var rows = CARDS * PASSES;
      var rowH = L.fh / rows, colW = L.cw / HOOKS;
      for (var r2 = 0; r2 < rows; r2++) {
        var card = chain[r2 % CARDS];
        for (var w2 = 0; w2 < HOOKS; w2++) {
          var fx = L.cx + w2 * colW, fy = L.fy + r2 * rowH;
          if (card[w2]) {
            ctx.fillStyle = accent;      // warp lifted: the warp shows
            ctx.globalAlpha = 0.85;
            ctx.fillRect(fx, fy, colW, rowH);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "rgba(0,0,0,.16)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(fx + colW * 0.5, fy);
            ctx.lineTo(fx + colW * 0.5, fy + rowH);
            ctx.stroke();
          } else {
            ctx.fillStyle = "rgba(120,95,130,.5)";   // weft passes over
            ctx.fillRect(fx, fy, colW, rowH);
            ctx.strokeStyle = "rgba(0,0,0,.16)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(fx, fy + rowH * 0.5);
            ctx.lineTo(fx + colW, fy + rowH * 0.5);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = muted;
      ctx.fillText("WOVEN CLOTH — the chain, four times round", L.cx, L.fy - 4);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    applyPreset("Damask");
  }

  // ---------------------------------------------------------------
  // Past — Exchequer tally stick
  // ---------------------------------------------------------------
  // Notch widths carried the denomination — a cut the width of a palm was
  // a thousand pounds, one the width of a barleycorn a penny. Then the
  // stick was split lengthwise through the notches, and the two halves
  // only matched each other, because no two pieces of wood split alike.
  // A tamper-evident financial instrument, made of a stick.
  function tallyStick(mount) {
    var DENOMS = [
      { label: "£1000", w: 16, v: 1000 },
      { label: "£100", w: 11, v: 100 },
      { label: "£20", w: 7.5, v: 20 },
      { label: "£1", w: 4.5, v: 1 },
      { label: "1s", w: 2.6, v: 0.05 },
      { label: "1d", w: 1.4, v: 1 / 240 }
    ];
    var notches = [];
    var split = false, forged = false, grain = [], forgedGrain = [];

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:200px;";
    var status = statusLine(2.8);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function total() { return notches.reduce(function (a, n) { return a + n.v; }, 0); }
    function money(v) {
      var pounds = Math.floor(v);
      var pence = Math.round((v - pounds) * 240);
      var sh = Math.floor(pence / 12), d = pence % 12;
      return "£" + pounds + " " + sh + "s " + d + "d";
    }
    function makeGrain() {
      grain = [];
      for (var i = 0; i <= 40; i++) grain.push((Math.random() - 0.5) * 7);
    }
    function refresh() {
      var s = notches.length + " notches &nbsp;·&nbsp; <b>" + money(total()) + "</b>";
      if (!split) s += "<br>One stick, both halves of the bargain still joined. Split it to issue the receipt.";
      else if (forged) s += '<br><span style="color:#c0392b;">The grains do not answer to each other. This foil is a forgery, and the Exchequer can see it at a glance.</span>';
      else s += '<br><span style="color:#2e7d32;">Stock and foil answer grain for grain. This is the receipt, and it cannot be faked without the other half.</span>';
      status.innerHTML = s;
    }

    DENOMS.forEach(function (d) {
      ctlButton(bar, d.label, "Cut a notch " + d.w + " units wide — " + d.label, function () {
        if (split) return;
        if (notches.length < 26) notches.push(d);
        refresh();
      });
    });
    spacer(bar);
    var splitBtn = ctlButton(bar, "Split", "Cleave the stick lengthwise into stock and foil", function () {
      if (!notches.length) return;
      split = true; forged = false; makeGrain(); refresh();
    });
    ctlButton(bar, "Forge a foil", "Try to pass off a fresh piece of wood as the matching half", function () {
      if (!split) return;
      forged = true;
      // Generated once, not per frame — a forgery is a specific bad piece
      // of wood, not a line that shimmers.
      forgedGrain = grain.map(function () { return (Math.random() - 0.5) * 7; });
      refresh();
    });
    ctlButton(bar, "Reset", "A fresh hazel stick", function () {
      notches = []; split = false; forged = false; refresh();
    });

    var cv = makeCanvas(canvasHost);
    var ctx = cv.ctx;

    function drawStick(x, y, w, h, half, offsetGrain) {
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, "#c9a26a");
      g.addColorStop(0.5, "#b08a52");
      g.addColorStop(1, "#8e6c3c");
      ctx.save();
      ctx.beginPath();
      if (half === "none") {
        ctx.rect(x, y, w, h);
      } else {
        // the split face follows the grain, so the two halves interlock
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        if (half === "stock") {
          for (var i = 0; i <= 40; i++) ctx.lineTo(x + w - (i / 40) * w, y + h * 0.62 + (grain[i] || 0) + (offsetGrain || 0));
        } else {
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
        }
        ctx.closePath();
      }
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // wood grain
      ctx.strokeStyle = "rgba(90,60,24,.22)";
      ctx.lineWidth = 0.7;
      for (var k = 0; k < 6; k++) {
        var gy = y + (k + 0.5) * (h / 6);
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + w * 0.3, gy + 2, x + w * 0.7, gy - 2, x + w, gy);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(60,38,12,.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

      // the notches, cut across the top edge — both halves carry them
      var nx = x + 14;
      notches.forEach(function (n) {
        ctx.fillStyle = "rgba(40,24,8,.8)";
        ctx.beginPath();
        ctx.moveTo(nx, y);
        ctx.lineTo(nx + n.w, y);
        ctx.lineTo(nx + n.w / 2, y + Math.min(h * 0.42, 4 + n.w * 0.7));
        ctx.closePath();
        ctx.fill();
        nx += n.w + 4;
      });
    }
    function drawSplitFace(x, y, w, h, jag, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var i = 0; i <= 40; i++) {
        var px = x + (i / 40) * w, py = y + h * 0.5 + (jag[i] || 0);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    function frame() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 200;
      ctx.clearRect(0, 0, w, h);
      var muted = cssVar("--muted", "#5c4f37");
      ctx.font = "10px ui-monospace, monospace";
      var sw = Math.min(w - 40, 480), sx = (w - sw) / 2;

      if (!split) {
        drawStick(sx, h * 0.34, sw, 44, "none");
        ctx.fillStyle = muted;
        ctx.fillText("THE STICK — notched across the top edge", sx, h * 0.34 - 8);
      } else {
        drawStick(sx, 34, sw, 40, "none");
        ctx.fillStyle = muted;
        ctx.fillText("STOCK — kept by the Exchequer", sx, 26);
        drawSplitFace(sx, 62, sw, 24, grain, "rgba(60,38,12,.85)");

        var foilGrain = forged ? forgedGrain : grain;
        drawStick(sx, h - 74, sw, 40, "none");
        ctx.fillStyle = muted;
        ctx.fillText("FOIL — carried away by the creditor", sx, h - 82);
        drawSplitFace(sx, h - 78, sw, 24, foilGrain, forged ? "rgba(192,57,43,.9)" : "rgba(46,125,50,.9)");
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    refresh();
  }

  // ---------------------------------------------------------------
  // Past — Mechanical calculator (the carry)
  // ---------------------------------------------------------------
  // Addition is trivial to build. The carry is not. Pascal's sautoir let a
  // wheel passing nine lift a weighted arm and drop it onto the next
  // wheel, and a run of nines meant lifting every arm at once — which is
  // why these machines could only be cranked one way, and why the carry,
  // not the sum, is the whole engineering problem of the era.
  function mechanicalCarry(mount) {
    var WHEELS = 6;
    var digits = new Array(WHEELS).fill(0);   // index 0 = units
    var anim = new Array(WHEELS).fill(0);     // rotation offset, for the flick
    var pending = null, carrySteps = 0, lastReport = "";

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:170px;";
    var status = statusLine(2.8);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function value() {
      return digits.reduce(function (a, d, i) { return a + d * Math.pow(10, i); }, 0);
    }
    function refresh() {
      status.innerHTML = "Register reads <b>" + String(value()).padStart(WHEELS, "0") + "</b>" +
        (lastReport ? "<br>" + lastReport : "<br>Add one to 999999 and count how far the carry has to travel.");
    }

    // Adds to the units wheel, then walks the carry one wheel at a time so
    // the propagation is visible rather than instantaneous.
    function add(n) {
      if (pending) return;
      pending = { i: 0, carry: n, moved: 0 };
      carrySteps = 0;
    }
    function stepCarry() {
      if (!pending) return;
      var i = pending.i;
      if (i >= WHEELS) {
        lastReport = "Overflowed the top wheel after " + pending.moved + " wheels. Pascal's machine simply lost it.";
        pending = null;
        refresh();
        return;
      }
      if (pending.carry === 0) {
        lastReport = "Carry propagated through <b>" + pending.moved + "</b> wheel" + (pending.moved === 1 ? "" : "s") + ".";
        pending = null;
        refresh();
        return;
      }
      var sum = digits[i] + pending.carry;
      digits[i] = sum % 10;
      pending.carry = Math.floor(sum / 10);
      anim[i] = 1;
      pending.moved++;
      pending.i++;
      refresh();
    }
    setInterval(stepCarry, 110);

    [1, 7, 99].forEach(function (n) {
      ctlButton(bar, "+" + n, "Add " + n + " to the register", function () { add(n); });
    });
    ctlButton(bar, "Set 999999", "Load the worst case for the carry mechanism", function () {
      digits = new Array(WHEELS).fill(9);
      lastReport = "Loaded. Now add one, and watch every wheel in the machine have to move.";
      refresh();
    });
    spacer(bar);
    ctlButton(bar, "Reset", "Zero the register", function () {
      digits = new Array(WHEELS).fill(0);
      pending = null; lastReport = "";
      refresh();
    });

    var cv = makeCanvas(canvasHost);
    var ctx = cv.ctx;
    function frame() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 170;
      ctx.clearRect(0, 0, w, h);
      var muted = cssVar("--muted", "#a4906c");
      var accent = cssVar("--accent", "#c9a24b");
      var dw = Math.min(52, (w - 30) / WHEELS), cy = h * 0.5;
      var totalW = dw * WHEELS, x0 = (w - totalW) / 2;

      for (var i = WHEELS - 1; i >= 0; i--) {
        var slot = WHEELS - 1 - i;
        var cx = x0 + slot * dw + dw / 2;
        anim[i] *= 0.86;
        var lift = anim[i] * 6;

        // brass drum
        var g = ctx.createLinearGradient(0, cy - dw * 0.5, 0, cy + dw * 0.5);
        g.addColorStop(0, "#2e2412");
        g.addColorStop(0.45, "#b9913f");
        g.addColorStop(0.55, "#e0bc6d");
        g.addColorStop(1, "#2e2412");
        ctx.fillStyle = g;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - dw * 0.38, cy - dw * 0.52 - lift, dw * 0.76, dw * 1.04, 5);
        else ctx.rect(cx - dw * 0.38, cy - dw * 0.52 - lift, dw * 0.76, dw * 1.04);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.55)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // the digit in the window, with its neighbours peeking
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - dw * 0.34, cy - dw * 0.3 - lift, dw * 0.68, dw * 0.6);
        ctx.clip();
        ctx.fillStyle = "#1a1206";
        ctx.fillRect(cx - dw * 0.34, cy - dw * 0.3 - lift, dw * 0.68, dw * 0.6);
        ctx.fillStyle = "#f0dca8";
        ctx.font = "bold " + Math.round(dw * 0.44) + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(digits[i]), cx, cy + dw * 0.16 - lift);
        ctx.globalAlpha = 0.28;
        ctx.font = Math.round(dw * 0.3) + "px ui-monospace, monospace";
        ctx.fillText(String((digits[i] + 9) % 10), cx, cy - dw * 0.24 - lift);
        ctx.fillText(String((digits[i] + 1) % 10), cx, cy + dw * 0.5 - lift);
        ctx.globalAlpha = 1;
        ctx.restore();

        // the sautoir arm, shown lifted while this wheel is carrying
        if (pending && pending.i === i && pending.carry) {
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(cx + dw * 0.38, cy - dw * 0.3);
          ctx.lineTo(cx + dw * 0.62, cy - dw * 0.5);
          ctx.stroke();
        }
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillStyle = muted;
        ctx.textAlign = "center";
        ctx.fillText(Math.pow(10, i) >= 1000 ? "10^" + i : String(Math.pow(10, i)), cx, cy + dw * 0.78);
        ctx.textAlign = "left";
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    refresh();
  }

  // ---------------------------------------------------------------
  // Past — Paper tape
  // ---------------------------------------------------------------
  // Eight data holes per frame with the sprocket track running between
  // levels three and four, which is how you tell at a glance which way up
  // a tape goes. There is no random access: to correct a frame you cut the
  // tape and splice a new piece in. "Patch" is not a metaphor borrowed
  // from somewhere else. It is this, with scissors.
  function paperTape(mount) {
    var tape = [];            // array of char codes
    var sel = -1;
    var patches = 0;

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var input = document.createElement("input");
    input.type = "text";
    input.value = "THE FUTURE IS PERFORATED";
    input.maxLength = 24;
    input.spellcheck = false;
    input.setAttribute("aria-label", "Text to punch onto the tape");
    input.style.cssText = "flex:1 0 100%;width:100%;min-width:0;padding:.5rem .7rem;border-radius:6px;border:1px solid var(--border);background:rgba(0,0,0,.08);color:inherit;font-family:var(--font-mono);font-size:clamp(.75rem,2.2vw,1rem);letter-spacing:.08em;text-align:center;text-transform:uppercase;";
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:150px;";
    canvasHost.style.touchAction = "pan-y";
    var status = statusLine(2.8);
    bar.appendChild(input);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function punch(str) {
      tape = str.toUpperCase().slice(0, 24).split("").map(function (ch) { return ch.charCodeAt(0) & 0xff; });
      sel = -1; patches = 0;
      refresh();
    }
    function text() {
      return tape.map(function (c) { return String.fromCharCode(c); }).join("");
    }
    function refresh() {
      status.innerHTML = "Tape reads <b>" + (text().replace(/&/g, "&amp;").replace(/</g, "&lt;") || "&nbsp;") +
        "</b> &nbsp;·&nbsp; " + tape.length + " frames" +
        (patches ? ", " + patches + " spliced by hand" : "") +
        "<br>" + (sel >= 0
          ? "Frame " + (sel + 1) + " selected. Cut it out, or splice a new frame in after it."
          : "Tap a frame to select it. There is no other way to edit a tape.");
    }

    ctlButton(bar, "Punch", "Punch the whole tape fresh from the keyboard", function () { punch(input.value); });
    spacer(bar);
    ctlButton(bar, "Cut", "Snip the selected frame out and rejoin the ends", function () {
      if (sel < 0 || sel >= tape.length) return;
      tape.splice(sel, 1);
      patches++;
      sel = Math.min(sel, tape.length - 1);
      refresh();
    });
    ctlButton(bar, "Splice", "Glue in one new frame, punched with the first character in the box", function () {
      if (sel < 0) return;
      var ch = (input.value.toUpperCase() || " ").charCodeAt(0) & 0xff;
      tape.splice(sel + 1, 0, ch);
      patches++;
      sel++;
      refresh();
    });

    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 150;
      var fw = Math.max(9, Math.min(22, (w - 24) / Math.max(tape.length, 12)));
      return { w: w, h: h, x: 12, y: h * 0.5 - fw * 4.6, fw: fw, th: fw * 9.2 };
    }
    canvasHost.addEventListener("pointerdown", function (e) {
      var L = layout();
      var r = canvasHost.getBoundingClientRect();
      var i = Math.floor((e.clientX - r.left - L.x) / L.fw);
      if (i < 0 || i >= tape.length) { sel = -1; refresh(); return; }
      sel = i;
      refresh();
    });

    var cv = makeCanvas(canvasHost);
    var ctx = cv.ctx;
    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);
      var muted = cssVar("--muted", "#7a6b4a");
      var tw = Math.max(L.fw * tape.length, L.fw * 4);

      // the tape itself, with torn ends
      ctx.fillStyle = "#efe6cf";
      ctx.fillRect(L.x, L.y, tw, L.th);
      ctx.strokeStyle = "rgba(90,74,42,.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(L.x + 0.5, L.y + 0.5, tw - 1, L.th - 1);

      var lvl = function (n) { return L.y + L.th * (0.09 + n * 0.101); };
      var r = Math.max(1.5, L.fw * 0.19), sr = Math.max(0.9, L.fw * 0.1);
      for (var i = 0; i < tape.length; i++) {
        var cx = L.x + i * L.fw + L.fw / 2;
        if (i === sel) {
          ctx.fillStyle = "rgba(200,140,40,.22)";
          ctx.fillRect(L.x + i * L.fw, L.y, L.fw, L.th);
        }
        for (var bit = 0; bit < 8; bit++) {
          // levels run 1-3, sprocket, 4-8 — bit 0 is level 1 at the top
          var slot = bit < 3 ? bit : bit + 1;
          if (tape[i] & (1 << bit)) {
            ctx.fillStyle = "#241a08";
            ctx.beginPath();
            ctx.arc(cx, lvl(slot), r, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = "rgba(140,120,80,.35)";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.arc(cx, lvl(slot), r * 0.55, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // sprocket hole, always punched, smaller than the data holes
        ctx.fillStyle = "#241a08";
        ctx.beginPath();
        ctx.arc(cx, lvl(3), sr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.fillText("SPROCKET", L.x, lvl(3) + 3.2);
      ctx.fillText("8-LEVEL TAPE — reads left to right, one frame per character", L.x, L.y - 6);
      // the printed characters some punches echoed along the edge
      ctx.fillStyle = "rgba(60,48,20,.65)";
      for (var t = 0; t < tape.length; t++) {
        ctx.fillText(String.fromCharCode(tape[t]), L.x + t * L.fw + L.fw * 0.28, L.y + L.th + 11);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    punch("THE FUTURE IS PERFORATED");
  }

  // ---------------------------------------------------------------
  // Past — Astronomical tables
  // ---------------------------------------------------------------
  // The table is the program and you are the processor. It gives the
  // Moon's elongation from the Sun every two days; the festival falls at
  // new moon, which is almost never on a tabulated row. So you bracket it,
  // take the difference, and interpolate in sixtieths — and the moon disc
  // tells you plainly whether the province eats on the right morning.
  function astronomicalTables(mount) {
    var STEP = 2, ROWS = 9;
    var SYNODIC = 29.530588, ANOM = 27.554549;
    // Elongation of the Moon from the Sun. The sine term is the elliptical
    // inequality — the reason linear interpolation can only ever get close.
    function elong(t) {
      var e = 360 * (t / SYNODIC) + 6.3 * Math.sin(2 * Math.PI * (t / ANOM)) - 172;
      return ((e % 360) + 360) % 360;
    }
    // The instant of new moon: the crossing of 360 -> 0, found by bisection.
    var trueNew = (function () {
      var lo = 0, hi = STEP * (ROWS - 1);
      for (var i = 0; i < 80; i++) {
        var mid = (lo + hi) / 2;
        if (elong(mid) > 180) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    })();

    var pick = -1, parts = 0;

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:232px;";
    canvasHost.style.touchAction = "pan-y";
    var slider = document.createElement("label");
    slider.style.cssText = "display:flex;align-items:center;gap:.6rem;font-family:var(--font-mono);font-size:.75rem;margin-top:.5rem;";
    slider.innerHTML = '<span style="white-space:nowrap;">parts of sixty</span>';
    var range = document.createElement("input");
    range.type = "range"; range.min = 0; range.max = 60; range.value = 0;
    range.style.flex = "1";
    range.disabled = true;
    slider.appendChild(range);
    var partsOut = document.createElement("b");
    partsOut.style.cssText = "min-width:2.2em;text-align:right;";
    partsOut.textContent = "0";
    slider.appendChild(partsOut);
    var status = statusLine(3.4);
    wrap.appendChild(bar);
    wrap.appendChild(canvasHost);
    wrap.appendChild(slider);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    function deg60(d) {
      var a = Math.floor(d), m = Math.round((d - a) * 60);
      if (m === 60) { a++; m = 0; }
      return a + "° " + String(m).padStart(2, "0") + "′";
    }
    function predicted() { return pick < 0 ? null : pick * STEP + (parts / 60) * STEP; }
    function refresh() {
      partsOut.textContent = String(parts);
      range.disabled = pick < 0;
      if (pick < 0) {
        status.innerHTML = "The festival falls at new moon — elongation zero. Find the two rows the crossing " +
          "falls between and tap the <b>upper</b> of them, then interpolate in sixtieths.";
        return;
      }
      var p = predicted();
      var errH = (p - trueNew) * 24;
      var brackets = elong(pick * STEP) > 180 && elong((pick + 1) * STEP) < 180;
      status.innerHTML = "Day " + pick * STEP + " → " + (pick + 1) * STEP + ", interpolating " + parts + "/60." +
        "<br>Your new moon: <b>day " + p.toFixed(3) + "</b> &nbsp;·&nbsp; true: day " + trueNew.toFixed(3) +
        " &nbsp;·&nbsp; out by <b>" + (errH >= 0 ? "+" : "") + errH.toFixed(1) + " hours</b>." +
        (brackets ? "" : '<br><span style="color:#c0392b;">These two rows don\'t bracket the crossing at all. The table is right; the reading is wrong.</span>');
    }

    ctlButton(bar, "Work it out for me", "Take the difference and divide, as the canons instruct", function () {
      for (var r = 0; r < ROWS - 1; r++) {
        if (elong(r * STEP) > 180 && elong((r + 1) * STEP) < 180) {
          pick = r;
          var lo = elong(r * STEP) - 360, hi = elong((r + 1) * STEP);
          parts = Math.round((-lo / (hi - lo)) * 60);
          range.value = parts;
          break;
        }
      }
      refresh();
    });
    spacer(bar);
    ctlButton(bar, "Reset", "Close the tables and start again", function () {
      pick = -1; parts = 0; range.value = 0; refresh();
    });
    range.addEventListener("input", function () { parts = +range.value; refresh(); });

    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 232;
      var tw = Math.min(w * 0.62, 340);
      return { w: w, h: h, tx: 6, ty: 22, tw: tw, rowH: (h - 34) / ROWS, mx: tw + (w - tw) / 2, my: h * 0.46 };
    }
    canvasHost.addEventListener("pointerdown", function (e) {
      var L = layout();
      var r = canvasHost.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      if (px > L.tx + L.tw) return;
      var row = Math.floor((py - L.ty) / L.rowH);
      if (row < 0 || row >= ROWS - 1) return;
      pick = row; parts = 0; range.value = 0;
      refresh();
    });

    var cv = makeCanvas(canvasHost);
    var ctx = cv.ctx;
    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);
      var muted = cssVar("--muted", "#7a83a8");
      var accent = cssVar("--accent", "#f2d675");

      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.fillText("DAY", L.tx + 4, L.ty - 7);
      ctx.fillText("ELONGATION ☾ FROM ☉", L.tx + 60, L.ty - 7);
      for (var r = 0; r < ROWS; r++) {
        var y = L.ty + r * L.rowH;
        var inPair = pick >= 0 && (r === pick || r === pick + 1);
        if (inPair) {
          ctx.fillStyle = "rgba(242,214,117,.16)";
          ctx.fillRect(L.tx, y, L.tw, L.rowH);
        }
        ctx.strokeStyle = "rgba(255,255,255,.07)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(L.tx, y + L.rowH); ctx.lineTo(L.tx + L.tw, y + L.rowH); ctx.stroke();
        ctx.fillStyle = inPair ? accent : muted;
        ctx.font = (inPair ? "bold " : "") + "11px ui-monospace, monospace";
        ctx.fillText(String(r * STEP).padStart(2, " "), L.tx + 6, y + L.rowH * 0.68);
        ctx.fillText(deg60(elong(r * STEP)), L.tx + 60, y + L.rowH * 0.68);
      }
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.strokeRect(L.tx + 0.5, L.ty + 0.5, L.tw - 1, ROWS * L.rowH);

      // The moon at the instant you predicted: the whole answer, visible.
      var p = predicted();
      var mr = Math.min(46, L.w * 0.1);
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.beginPath(); ctx.arc(L.mx, L.my, mr + 12, 0, Math.PI * 2); ctx.fill();
      // dark limb
      ctx.fillStyle = "#15182c";
      ctx.beginPath(); ctx.arc(L.mx, L.my, mr, 0, Math.PI * 2); ctx.fill();
      if (p !== null) {
        // illuminated fraction from the elongation at that instant
        var el = elong(p);
        var signed = el > 180 ? el - 360 : el;
        var lit = (1 - Math.cos(signed * Math.PI / 180)) / 2;
        ctx.save();
        ctx.beginPath(); ctx.arc(L.mx, L.my, mr, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = "#f6f0d8";
        var k = Math.abs(Math.cos(signed * Math.PI / 180));
        ctx.beginPath();
        ctx.ellipse(L.mx + (signed > 0 ? 1 : -1) * mr * k * 0.0, L.my, mr, mr, 0,
          signed > 0 ? -Math.PI / 2 : Math.PI / 2, signed > 0 ? Math.PI / 2 : (3 * Math.PI) / 2);
        ctx.ellipse(L.mx, L.my, mr * k, mr, 0,
          signed > 0 ? Math.PI / 2 : (3 * Math.PI) / 2, signed > 0 ? -Math.PI / 2 : Math.PI / 2,
          (signed > 0) === (Math.cos(signed * Math.PI / 180) > 0));
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = muted;
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText((lit * 100).toFixed(1) + "% lit", L.mx, L.my + mr + 18);
        ctx.fillText(lit < 0.002 ? "new moon — the date holds" : "not yet dark — the festival moves", L.mx, L.my + mr + 32);
        ctx.textAlign = "left";
      }
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(L.mx, L.my, mr, 0, Math.PI * 2); ctx.stroke();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    refresh();
  }

  // ---------------------------------------------------------------
  // Past — Memory palace
  // ---------------------------------------------------------------
  // The method of loci: a route you already know by heart, walked in a
  // fixed order, with one vivid image left at each station. The path is
  // not decoration — it is the index, and it is the only reason the
  // sequence comes back in order. Storage on unmodified wetware.
  function memoryPalace(mount) {
    var LOCI = [
      { n: "street door", x: 0.07, y: 0.50 },
      { n: "fauces", x: 0.19, y: 0.50 },
      { n: "impluvium", x: 0.38, y: 0.50 },
      { n: "tablinum", x: 0.57, y: 0.50 },
      { n: "peristyle", x: 0.75, y: 0.50 },
      { n: "triclinium", x: 0.84, y: 0.22 },
      { n: "kitchen", x: 0.88, y: 0.78 }
    ];
    var ITEMS = ["salt", "a red horse", "seven lamps", "a broken oar", "the west gate", "a wolf", "a bronze moon"];
    var placed = new Array(LOCI.length).fill(null);
    var held = -1, phase = "furnish", walked = [];

    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:.4rem;text-align:left;";
    var bar = controlBar();
    var chips = document.createElement("div");
    chips.style.cssText = "display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:.5rem;";
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:260px;";
    canvasHost.style.touchAction = "pan-y";
    var status = statusLine(3.2);
    wrap.appendChild(bar);
    wrap.appendChild(chips);
    wrap.appendChild(canvasHost);
    wrap.appendChild(status);
    mount.appendChild(wrap);

    var chipEls = [];
    ITEMS.forEach(function (label, i) {
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = BTN_CSS + "font-size:.75rem;padding:.25rem .55rem;";
      b.addEventListener("click", function () {
        if (phase !== "furnish") return;
        held = held === i ? -1 : i;
        paintChips();
        refresh();
      });
      chips.appendChild(b);
      chipEls.push(b);
    });
    function paintChips() {
      chipEls.forEach(function (b, i) {
        var used = placed.indexOf(i) >= 0;
        b.style.opacity = used ? ".35" : "1";
        b.style.textDecoration = used ? "line-through" : "none";
        setActive(b, held === i);
      });
    }
    function refresh() {
      if (phase === "furnish") {
        var left = ITEMS.length - placed.filter(function (p) { return p !== null; }).length;
        status.innerHTML = held >= 0
          ? "Holding <b>" + ITEMS[held] + "</b>. Now put it somewhere in the house you could not possibly forget."
          : (left ? left + " image(s) still in your hands. Pick one, then a station on the route."
                  : "Every station furnished. Now walk the route and see what comes back.");
      } else {
        var order = walked.map(function (i) { return placed[i] === null ? "—" : ITEMS[placed[i]]; });
        var inOrder = walked.every(function (v, i) { return v === i; });
        status.innerHTML = "Walked " + walked.length + " of " + LOCI.length + " stations.<br>" +
          (order.length ? "Recalled: <b>" + order.join(" · ") + "</b>" : "Click the stations, in the order you would walk them.") +
          (walked.length === LOCI.length
            ? (inOrder
              ? '<br><span style="color:#2e7d32;">In order, with nothing written down anywhere.</span>'
              : '<br><span style="color:#c9a24b;">All of them — but out of route order, which is the part the palace was doing for you.</span>')
            : "");
      }
    }

    var walkBtn = ctlButton(bar, "Walk the route", "Hide the images and recall them by walking", function () {
      if (phase === "furnish") {
        phase = "recall"; walked = [];
        walkBtn.textContent = "Furnish again";
      } else {
        phase = "furnish"; walked = []; held = -1;
        walkBtn.textContent = "Walk the route";
      }
      paintChips();
      refresh();
    });
    spacer(bar);
    ctlButton(bar, "Reset", "Empty the house", function () {
      placed = new Array(LOCI.length).fill(null);
      held = -1; phase = "furnish"; walked = [];
      walkBtn.textContent = "Walk the route";
      paintChips();
      refresh();
    });

    function layout() {
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 260;
      return { w: w, h: h, px: function (nx) { return 20 + nx * (w - 40); }, py: function (ny) { return 24 + ny * (h - 62); } };
    }
    canvasHost.addEventListener("pointerdown", function (e) {
      var L = layout();
      var r = canvasHost.getBoundingClientRect();
      var mx = e.clientX - r.left, my = e.clientY - r.top;
      var hit = -1;
      LOCI.forEach(function (lo, i) {
        if (Math.hypot(mx - L.px(lo.x), my - L.py(lo.y)) < 24) hit = i;
      });
      if (hit < 0) return;
      if (phase === "furnish") {
        if (held < 0) return;
        var prev = placed.indexOf(held);
        if (prev >= 0) placed[prev] = null;
        placed[hit] = held;
        held = -1;
        paintChips();
      } else if (walked.indexOf(hit) < 0) {
        walked.push(hit);
      }
      refresh();
    });

    var cv = makeCanvas(canvasHost);
    var ctx = cv.ctx;
    function frame() {
      var L = layout();
      ctx.clearRect(0, 0, L.w, L.h);
      var accent = cssVar("--accent", "#e6b366");
      var muted = cssVar("--muted", "#b89870");

      // Simplified Roman domus: a Pompeian street house organized along
      // the fauces-atrium-tablinum-peristyle axis, with side rooms opening
      // onto that circulation rather than an abstract grid.
      var left = L.px(0.04), right = L.px(0.96), top = L.py(0.05), bottom = L.py(0.95);
      var wall = "rgba(255,255,255,.24)";
      ctx.strokeStyle = wall;
      ctx.lineWidth = 3;
      ctx.strokeRect(left, top, right - left, bottom - top);

      function wallLine(x1, y1, x2, y2) {
        ctx.beginPath(); ctx.moveTo(L.px(x1), L.py(y1)); ctx.lineTo(L.px(x2), L.py(y2)); ctx.stroke();
      }
      // Entrance shops and narrow fauces, leaving the central door open.
      wallLine(0.04, 0.34, 0.25, 0.34); wallLine(0.04, 0.66, 0.25, 0.66);
      wallLine(0.25, 0.05, 0.25, 0.41); wallLine(0.25, 0.59, 0.25, 0.95);
      // Atrium side rooms with door gaps onto the central hall.
      wallLine(0.25, 0.27, 0.48, 0.27); wallLine(0.25, 0.73, 0.48, 0.73);
      wallLine(0.48, 0.05, 0.48, 0.37); wallLine(0.48, 0.63, 0.48, 0.95);
      // Tablinum and passages into the rear court.
      wallLine(0.48, 0.35, 0.63, 0.35); wallLine(0.48, 0.65, 0.63, 0.65);
      wallLine(0.63, 0.05, 0.63, 0.40); wallLine(0.63, 0.60, 0.63, 0.95);
      // Rear dining/service rooms around the peristyle.
      wallLine(0.63, 0.28, 0.96, 0.28); wallLine(0.63, 0.72, 0.96, 0.72);
      wallLine(0.80, 0.05, 0.80, 0.28); wallLine(0.82, 0.72, 0.82, 0.95);

      // Impluvium and peristyle garden, the two spatial anchors.
      ctx.fillStyle = "rgba(110,180,210,.15)";
      ctx.strokeStyle = "rgba(140,210,235,.38)";
      ctx.lineWidth = 1;
      ctx.fillRect(L.px(0.32), L.py(0.41), L.px(0.44) - L.px(0.32), L.py(0.59) - L.py(0.41));
      ctx.strokeRect(L.px(0.32), L.py(0.41), L.px(0.44) - L.px(0.32), L.py(0.59) - L.py(0.41));
      ctx.fillStyle = "rgba(100,150,80,.12)";
      ctx.strokeStyle = "rgba(150,190,110,.32)";
      ctx.fillRect(L.px(0.68), L.py(0.35), L.px(0.92) - L.px(0.68), L.py(0.65) - L.py(0.35));
      ctx.strokeRect(L.px(0.68), L.py(0.35), L.px(0.92) - L.px(0.68), L.py(0.65) - L.py(0.35));

      ctx.font = "8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,.28)";
      [[.14,.18,"shop"],[.14,.82,"shop"],[.37,.15,"cubiculum"],[.37,.85,"cubiculum"],[.56,.20,"ala"],[.56,.80,"ala"],[.88,.14,"triclinium"],[.90,.86,"service"]].forEach(function (room) {
        ctx.fillText(room[2], L.px(room[0]), L.py(room[1]));
      });

      // the route, which is the index
      ctx.strokeStyle = "rgba(230,179,102,.45)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      LOCI.forEach(function (lo, i) {
        var x = L.px(lo.x), y = L.py(lo.y);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "center";
      LOCI.forEach(function (lo, i) {
        var x = L.px(lo.x), y = L.py(lo.y);
        var revealed = phase === "furnish" || walked.indexOf(i) >= 0;
        var isNext = phase === "recall" && walked.length === i;
        ctx.beginPath();
        ctx.arc(x, y, 13, 0, Math.PI * 2);
        ctx.fillStyle = placed[i] !== null && revealed ? "rgba(230,179,102,.22)" : "rgba(255,255,255,.05)";
        ctx.fill();
        ctx.strokeStyle = isNext ? accent : "rgba(255,255,255,.22)";
        ctx.lineWidth = isNext ? 1.8 : 1;
        ctx.stroke();
        ctx.fillStyle = muted;
        ctx.fillText(String(i + 1), x, y + 3.5);
        ctx.fillStyle = "rgba(255,255,255,.4)";
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText(lo.n, x, y + 26);
        if (placed[i] !== null && revealed) {
          ctx.fillStyle = accent;
          ctx.font = "bold 10px ui-monospace, monospace";
          ctx.fillText(ITEMS[placed[i]], x, y - 19);
        }
        ctx.font = "10px ui-monospace, monospace";
      });
      ctx.textAlign = "left";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    paintChips();
    refresh();
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
    "archive-interface": archiveInterface,
    "living-fire": livingFire,
    "dos-terminal": dosTerminal,
    "punchcard": punchcard,
    "abacus": abacus,
    "quipu-knots": quipuKnots,
    "clay-tablet": clayTablet,
    "babbage-engine": babbageEngine,
    "jacquard-loom": jacquardLoom,
    "tally-stick": tallyStick,
    "mechanical-carry": mechanicalCarry,
    "paper-tape": paperTape,
    "astronomical-tables": astronomicalTables,
    "memory-palace": memoryPalace
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
