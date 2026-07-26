(function () {
  "use strict";

  // Each widget is a function(mountEl) that builds its own DOM/canvas.
  // Widgets are initialized lazily, the first time their mount scrolls
  // into view, so the page stays light until you actually reach them.

  function makeCanvas(mount) {
    var canvas = document.createElement("canvas");
    var dpr = window.devicePixelRatio || 1;
    function resize() {
      var rect = mount.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, (rect.height || 220) * dpr);
      canvas.style.width = "100%";
      canvas.style.height = (rect.height || 220) + "px";
    }
    mount.appendChild(canvas);
    resize();
    window.addEventListener("resize", resize);
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return { canvas: canvas, ctx: ctx, resize: function () { resize(); ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr); } };
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
    mount.addEventListener("pointermove", function () { target = Math.min(1, target + 0.02); });
    mount.addEventListener("pointerleave", function () { target = 0; });

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
    wrap.innerHTML =
      '<div class="cg-controls" style="display:flex;gap:.5rem;margin-bottom:.5rem;font-family:var(--font-display);font-size:.8rem;flex-wrap:wrap;">' +
      '<button data-c="0" style="padding:.35rem .7rem;border-radius:6px;border:1px solid var(--accent);background:var(--accent);color:#04160f;cursor:pointer;">Cultivar A</button>' +
      '<button data-c="1" style="padding:.35rem .7rem;border-radius:6px;border:1px solid var(--accent2);background:var(--accent2);color:#04160f;cursor:pointer;">Cultivar B</button>' +
      '<button data-c="2" style="padding:.35rem .7rem;border-radius:6px;border:1px solid #d33;background:#d33;color:#fff;cursor:pointer;">Invasive Weed</button>' +
      '<button class="cg-tend" style="margin-left:auto;padding:.35rem .7rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer;">Tend (advance season)</button>' +
      '</div>';
    var canvasHost = document.createElement("div");
    canvasHost.style.cssText = "width:100%;height:180px;";
    wrap.appendChild(canvasHost);
    mount.appendChild(wrap);

    var cols = 28, rows = 14;
    var grid = new Array(cols * rows).fill(-1);
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
    canvasHost.addEventListener("pointerdown", function (e) {
      var rect = canvasHost.getBoundingClientRect();
      paint(e.clientX - rect.left, e.clientY - rect.top);
      draw();
    });

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
    wrap.querySelector(".cg-tend").addEventListener("click", tend);

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
    grid.style.cssText = "display:inline-grid;grid-template-columns:repeat(" + size + ",26px);grid-auto-rows:26px;gap:2px;margin:0 auto;";
    var filled = new Set();
    var msg = document.createElement("p");
    msg.style.cssText = "margin-top:1rem;font-family:var(--font-mono);font-size:.85rem;min-height:1.5em;";

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var cell = document.createElement("div");
        var key = x + "," + y;
        cell.dataset.key = key;
        var isTarget = target.has(key);
        cell.style.cssText = "border:1px dashed " + (isTarget ? "var(--accent)" : "var(--border)") + ";border-radius:3px;cursor:pointer;";
        cell.addEventListener("click", function () {
          var k = this.dataset.key;
          if (filled.has(k)) { filled.delete(k); this.style.background = "transparent"; }
          else { filled.add(k); this.style.background = "var(--accent)"; }
          checkMatch();
        });
        grid.appendChild(cell);
      }
    }

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

    function reset() {
      var w = mount.clientWidth, h = mount.clientHeight || 220;
      basin = { x: w * 0.78, y: h * 0.3, r: 16 };
      particles = [];
      for (var i = 0; i < 60; i++) {
        particles.push({ x: Math.random() * w, y: Math.random() * h, stuck: false });
      }
    }
    reset();

    mount.addEventListener("pointerdown", function (e) {
      var rect = mount.getBoundingClientRect();
      attractor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
    mount.addEventListener("pointermove", function (e) {
      if (e.buttons) {
        var rect = mount.getBoundingClientRect();
        attractor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
    });

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
    mount.addEventListener("pointermove", function (e) {
      var rect = mount.getBoundingClientRect();
      fronts.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, life: 1 });
      if (fronts.length > 40) fronts.shift();
    });

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
    wrap.appendChild(canvasHost);
    wrap.appendChild(slider);
    mount.appendChild(wrap);

    var c = makeCanvas(canvasHost);
    var ctx = c.ctx;
    var t = 0;
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
      "run app.exe": "Loading APP.EXE...\nSegmentation of intent complete.\nRequires 640K. You have 640K. That is exactly enough, and never will be again."
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
    grid.style.cssText = "display:inline-grid;grid-template-columns:repeat(" + cols + ",24px);gap:3px;padding:.75rem;";
    var punched = new Set();
    var decoded = document.createElement("p");
    decoded.style.cssText = "font-family:var(--font-mono);font-size:.85rem;margin-top:.5rem;";
    var instructions = ["READ", "SORT", "TOTAL", "BRANCH", "HALT", "MULTIPLY"];

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var hole = document.createElement("div");
        var key = x + "," + y;
        hole.style.cssText = "width:20px;height:20px;border-radius:50%;border:1px solid currentColor;cursor:pointer;opacity:.4;";
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
    wrap.style.cssText = "display:flex;gap:14px;padding:1rem;justify-content:center;";
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
