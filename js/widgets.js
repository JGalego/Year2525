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
  // 4545 — Fold matter into a target shape
  // ---------------------------------------------------------------
  function loomFold(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "text-align:center;padding:1rem;";
    var size = 8;
    var target = new Set();
    // a simple "chair-ish" silhouette
    [ [3,1],[4,1],[3,2],[4,2],[3,3],[4,3],[2,4],[3,4],[4,4],[5,4],[3,5],[4,5],[3,6],[4,6],[2,6],[5,6] ]
      .forEach(function (p) { target.add(p[0] + "," + p[1]); });

    var grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(" + size + ",minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:2px;margin:0 auto;width:min(100%,222px);aspect-ratio:1/1;";
    grid.style.touchAction = "pan-y";
    var filled = new Set();
    var msg = document.createElement("p");
    msg.style.cssText = "margin-top:1rem;font-family:var(--font-mono);font-size:.85rem;min-height:1.5em;";
    var dragging = false;
    var dragValue = true;

    function setCellState(cell, shouldFill) {
      var k = cell.dataset.key;
      if (shouldFill) {
        filled.add(k);
        cell.style.background = "var(--accent)";
      } else {
        filled.delete(k);
        cell.style.background = "transparent";
      }
      checkMatch();
    }

    function stopDrag() {
      dragging = false;
      grid.style.touchAction = "pan-y";
    }

    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var cell = document.createElement("div");
        var key = x + "," + y;
        cell.dataset.key = key;
        var isTarget = target.has(key);
        cell.style.cssText = "border:1px dashed " + (isTarget ? "var(--accent)" : "var(--border)") + ";border-radius:3px;cursor:pointer;min-width:0;min-height:0;";
        cell.addEventListener("pointerdown", function (e) {
          dragging = true;
          grid.style.touchAction = "none";
          dragValue = !filled.has(this.dataset.key);
          setCellState(this, dragValue);
        });
        grid.appendChild(cell);
      }
    }

    grid.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || !el.dataset || !el.dataset.key) return;
      setCellState(el, dragValue);
    });

    function checkMatch() {
      var match = filled.size === target.size;
      if (match) { for (var v of filled) if (!target.has(v)) { match = false; break; } }
      msg.textContent = match ? "Folding stable. Atrium holds the shape." : "Folding unresolved — " + filled.size + " / " + target.size + " cells committed.";
    }
    checkMatch();

    wrap.appendChild(grid);
    wrap.appendChild(msg);
    mount.appendChild(wrap);
  }

  // ---------------------------------------------------------------
  // 5555 — Convene a Chorale
  // ---------------------------------------------------------------
  function choraleBraid(mount) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "width:100%;padding:1rem;text-align:left;";
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:140px;margin-bottom:1rem;";
    var slidersHost = document.createElement("div");
    wrap.appendChild(canvasHost);
    wrap.appendChild(slidersHost);
    mount.appendChild(wrap);

    var FLOOR = 12;
    var voices = [
      { label: "Voice I", color: "#d8b4fe", v: 70 },
      { label: "Voice II", color: "#f472b6", v: 55 },
      { label: "Voice III", color: "#7dd3fc", v: 40 },
      { label: "Dissent", color: "#fbbf24", v: 30 }
    ];
    voices.forEach(function (voice) {
      var row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;gap:.75rem;margin-bottom:.4rem;font-size:.8rem;font-family:var(--font-display);";
      row.innerHTML = '<span style="width:5.5em;color:' + voice.color + ';">' + voice.label + '</span>';
      var input = document.createElement("input");
      input.type = "range"; input.min = 0; input.max = 100; input.value = voice.v;
      input.style.flex = "1";
      input.addEventListener("input", function () {
        var val = +input.value;
        if (val < FLOOR) { val = FLOOR; input.value = FLOOR; }
        voice.v = val;
      });
      row.appendChild(input);
      slidersHost.appendChild(row);
    });

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var t = 0;
    function frame() {
      t += 0.02;
      var w = canvasHost.clientWidth, h = canvasHost.clientHeight || 140;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      voices.forEach(function (voice, i) {
        var amp = voice.v / 100;
        ctx.beginPath();
        ctx.fillStyle = voice.color;
        ctx.globalAlpha = 0.35 * amp + 0.05;
        var r = (0.18 + amp * 0.3) * Math.min(w, h);
        var cx = w / 2 + Math.cos(t + i * 1.7) * (w / 5);
        var cy = h / 2 + Math.sin(t + i * 1.3) * (h / 5);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------
  // 6565 — Shape a gradient (Tilth)
  // ---------------------------------------------------------------
  function tilthGradient(mount) {
    var c = makeCanvas(mount);
    var ctx = c.ctx;
    var attractor = null;
    var basin = null;
    var particles = [];
    var dragging = false;

    mount.style.touchAction = "pan-y";

    function reset() {
      var w = mount.clientWidth, h = mount.clientHeight || 220;
      basin = { x: w * 0.78, y: h * 0.3, r: 16 };
      particles = [];
      for (var i = 0; i < 60; i++) {
        particles.push({ x: Math.random() * w, y: Math.random() * h, stuck: false });
      }
    }
    reset();

    function placeAttractor(e) {
      var rect = mount.getBoundingClientRect();
      attractor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    mount.addEventListener("pointerdown", function (e) {
      dragging = true;
      mount.style.touchAction = "none";
      if (mount.setPointerCapture) mount.setPointerCapture(e.pointerId);
      placeAttractor(e);
    });
    mount.addEventListener("pointermove", function (e) {
      if (!dragging && e.pointerType !== "mouse") return;
      if (!dragging && !e.buttons) return;
      placeAttractor(e);
    });
    function clearDrag(e) {
      dragging = false;
      mount.style.touchAction = "pan-y";
      if (e && mount.releasePointerCapture) {
        try { mount.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    }
    mount.addEventListener("pointerup", clearDrag);
    mount.addEventListener("pointercancel", clearDrag);

    function frame() {
      var w = mount.clientWidth, h = mount.clientHeight || 220;
      ctx.clearRect(0, 0, w, h);
      var accent = cssVar("--accent", "#2dd4bf");

      ctx.beginPath();
      ctx.arc(basin.x, basin.y, basin.r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(180,60,60,.6)";
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      particles.forEach(function (p) {
        if (!p.stuck) {
          var dbx = basin.x - p.x, dby = basin.y - p.y;
          if (Math.hypot(dbx, dby) < basin.r) { p.stuck = true; }
          else if (attractor) {
            var dx = attractor.x - p.x, dy = attractor.y - p.y;
            var d = Math.hypot(dx, dy) || 1;
            p.x += (dx / d) * 0.6;
            p.y += (dy / d) * 0.6;
          } else {
            p.x += Math.sin(p.y * 0.05) * 0.3;
            p.y += Math.cos(p.x * 0.05) * 0.3;
          }
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.stuck ? "rgba(160,160,160,.7)" : accent;
        ctx.fill();
      });

      if (attractor) {
        ctx.beginPath();
        ctx.arc(attractor.x, attractor.y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = accent;
        ctx.stroke();
      }
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
