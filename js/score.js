(function () {
  "use strict";

  /* ==========================================================================
     A procedural score for the gallery. Web Audio only — no files, no
     dependencies, nothing to download.

     On the source material: "In the Year 2525" is Rick Evans' song and it is
     still in copyright, so none of its melody is here. What this borrows is
     the one thing about it that is a structural device rather than a tune —
     it keeps shoving itself up a key as it marches through the millennia —
     and that device happens to fit a page you scroll through eras. So the
     tonic rises a semitone per era on the way out to Year 12,525.

     Walking back down the other wing, the score regresses instead: it loses
     a layer at a time, slows, and ends on a single pulse in the dark, which
     is the same argument the archive's copy makes about interfaces.

     The score is on by default, so it starts the moment the page loads. But
     "default" is doing limited work: no browser will let a page make a sound
     before the visitor has interacted with it, and scrolling explicitly does
     not count as interacting. So the load-time attempt above will actually go
     silent in most browsers until the first click, tap or keypress arrives,
     at which point it resumes exactly where it already was. Until sound is
     confirmed the control shows on-but-pending rather than claiming to be
     playing. There is always a way to stop it, which is what WCAG 1.4.2 asks
     of anything that starts on its own.
     ========================================================================== */

  var btn = document.getElementById("sound-toggle");
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  var STORE = "year2525.sound";
  var TONIC = 57;            // A3
  var STEPS_PER_BAR = 16;    // sixteenths
  var LOOP = STEPS_PER_BAR * 4;
  var LOOKAHEAD = 0.12;      // seconds of score scheduled ahead
  var TICK = 25;             // ms between scheduler wakeups

  // i — bVII — bVI — V. A descending tetrachord: public domain since roughly
  // the seventeenth century, and the reason this sounds like a slow march
  // toward something nobody is going to enjoy.
  var BARS = [
    { root: 0,  tones: [0, 3, 7] },
    { root: -2, tones: [0, 4, 7] },
    { root: -4, tones: [0, 4, 7] },
    { root: -5, tones: [0, 4, 7] }
  ];

  // An original phrase, sparse enough to sit over the sequencer rather than
  // argue with it: [step within the 64-step loop, semitones over tonic, beats]
  var LEAD = [
    [0, 12, 1.5], [8, 15, 1.0], [16, 14, 1.5], [26, 12, 1.0],
    [32, 19, 2.0], [44, 17, 1.0], [48, 15, 2.0], [58, 12, 1.5]
  ];

  var ARP = [0, 1, 2, 1, 0, 2, 1, 2];

  var FORWARD = ["present", "2525", "3535", "4545", "5555", "6565", "7510", "8525", "9595", "beyond"];

  // How much apparatus each part of the other wing still has. 5 is the full
  // texture; 0 is a heartbeat and nothing else.
  var PAST_STAGE = {
    "modern-web": 5, iphone: 5, xp: 4, win95: 4, zxspectrum: 4, system7: 4,
    msdos: 3, eighties: 3, mainframe: 3,
    punchcard: 2, papertape: 2, mechanical: 2, jacquard: 2, babbage: 2,
    astronomical: 1, abacus: 1, claytablet: 1, tally: 1, knotrope: 1,
    memorypalace: 1, language: 1,
    fire: 0, presymbolic: 0
  };
  var STAGE_LAYERS = [
    { perc: 1 },                                            // 0
    { pad: 1, perc: 0.35 },                                 // 1
    { bass: 1, perc: 1 },                                   // 2
    { bass: 1, arp: 1, perc: 1, square: true },             // 3
    { bass: 1, arp: 1, pad: 1, perc: 1 },                   // 4
    { bass: 1, arp: 1, pad: 1, lead: 1, perc: 1 }           // 5
  ];

  var ctx = null, master = null, wetGain = null, reverb = null, noiseBuf = null;
  var playing = false, pending = false, timer = null;
  var step = 0, nextTime = 0;
  var cfg = readConfig();

  function readConfig() {
    var body = document.body;
    var past = body.getAttribute("data-past");
    if (past) {
      var stage = PAST_STAGE[past];
      if (stage === undefined) stage = 3;
      var layers = STAGE_LAYERS[stage];
      return {
        transpose: -(5 - stage),
        bpm: 96 - (5 - stage) * 8,
        layers: layers,
        wave: layers.square ? "square" : "triangle",
        shimmer: 0
      };
    }
    var i = FORWARD.indexOf(body.getAttribute("data-era") || "present");
    if (i < 0) i = 0;
    return {
      // The device: one semitone per era, all the way out.
      transpose: i,
      bpm: 96,
      layers: STAGE_LAYERS[5],
      wave: "triangle",
      shimmer: i / 9
    };
  }

  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function build() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Impulse response generated rather than fetched: noise under an
    // exponential decay is a perfectly convincing small hall.
    var len = Math.ceil(ctx.sampleRate * 2.4);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = buf;
    wetGain = ctx.createGain();
    wetGain.gain.value = 0.5;
    reverb.connect(wetGain);
    wetGain.connect(master);

    // One noise buffer, reused by every percussive hit.
    var nlen = Math.ceil(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var n = 0; n < nlen; n++) nd[n] = Math.random() * 2 - 1;
  }

  function out(node, wet) {
    node.connect(master);
    if (wet > 0 && reverb) {
      var s = ctx.createGain();
      s.gain.value = wet;
      node.connect(s);
      s.connect(reverb);
    }
  }

  function tone(when, midi, dur, peak, wave, wet, detune) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = wave;
    o.frequency.value = hz(midi);
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    out(g, wet);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function pad(when, midi, dur, peak, wet) {
    var o = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = o2.type = "sine";
    o.frequency.value = hz(midi);
    o2.frequency.value = hz(midi);
    o2.detune.value = 7;                       // the slow beat between them is the whole texture
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); o2.connect(g);
    out(g, wet);
    o.start(when); o2.start(when);
    o.stop(when + dur + 0.1); o2.stop(when + dur + 0.1);
  }

  function noise(when, dur, freq, peak, wet) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 1.2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(peak, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f); f.connect(g);
    out(g, wet);
    s.start(when);
    s.stop(when + dur + 0.02);
  }

  function thud(when, peak) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(108, when);
    o.frequency.exponentialRampToValueAtTime(36, when + 0.13);
    g.gain.setValueAtTime(peak, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    o.connect(g);
    out(g, 0.08);
    o.start(when);
    o.stop(when + 0.32);
  }

  function schedule(s, when) {
    var L = cfg.layers;
    var bar = Math.floor(s / STEPS_PER_BAR) % 4;
    var inBar = s % STEPS_PER_BAR;
    var chord = BARS[bar];
    var root = TONIC + cfg.transpose + chord.root;
    var beat = 60 / cfg.bpm;
    var wet = 0.22 + cfg.shimmer * 0.4;

    if (L.perc) {
      if (inBar === 0) thud(when, 0.5 * L.perc);
      if (L.perc >= 1 && inBar % 4 === 2) noise(when, 0.05, 5200, 0.05, 0.2);
      if (L.perc >= 1 && inBar === 8) noise(when, 0.16, 1800, 0.09, 0.35);
    }
    if (L.bass && inBar === 0) {
      tone(when, root - 24, beat * 3.6, 0.22, "sawtooth", 0.05);
    }
    if (L.arp && s % 2 === 0) {
      var idx = ARP[(s / 2) % ARP.length];
      tone(when, root + chord.tones[idx] + 12, beat * 0.42, 0.075, cfg.wave, wet, cfg.shimmer * 9);
    }
    if (L.pad && inBar === 0 && bar % 2 === 0) {
      chord.tones.forEach(function (t) {
        pad(when, root + t, beat * 7.5, 0.05, 0.6);
      });
    }
    if (L.lead) {
      var pos = s % LOOP;
      for (var i = 0; i < LEAD.length; i++) {
        if (LEAD[i][0] === pos) {
          tone(when, TONIC + cfg.transpose + LEAD[i][1], beat * LEAD[i][2], 0.085, "triangle", 0.55, cfg.shimmer * 6);
        }
      }
    }
  }

  function run() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      // Re-read the page at every bar line, so a change of era arrives on
      // a downbeat instead of halfway through a chord.
      if (step % STEPS_PER_BAR === 0) cfg = readConfig();
      schedule(step, nextTime);
      nextTime += (60 / cfg.bpm) / 4;
      step++;
    }
  }

  function start() {
    if (!ctx) build();
    cfg = readConfig();
    step = 0;
    nextTime = ctx.currentTime + 0.08;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 1.4);
    run();
    if (!timer) timer = setInterval(run, TICK);
    if (ctx.state === "suspended") {
      // Attempt it anyway: some contexts (embedded webviews, a domain with
      // enough prior media engagement) let this through with no gesture at
      // all. Where the browser refuses, the promise just settles without
      // ever reaching "running", and sync() below arms the fallback.
      ctx.resume().then(sync, sync);
      sync();
    } else {
      playing = true;
      paint();
    }
  }

  function sync() {
    playing = ctx.state === "running";
    if (playing) disarm(); else armForGesture();
    paint();
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (ctx && master) {
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    }
    playing = false;
    paint();
  }

  function paint() {
    var on = playing || pending;
    var label = playing ? "Silence the score"
      : pending ? "Score on — click to allow sound"
      : "Play the score";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.classList.toggle("is-pending", pending && !playing);
    btn.title = label;
    btn.setAttribute("aria-label", label);
    var use = btn.querySelector("use");
    if (use) use.setAttribute("href", on ? "#icon-sound-on" : "#icon-sound-off");
  }

  function remember(v) { try { localStorage.setItem(STORE, v); } catch (e) {} }

  btn.addEventListener("click", function () {
    if (playing) { pending = false; stop(); remember("off"); }
    else { disarm(); start(); remember("on"); }
  });

  // Don't keep playing into a tab nobody is looking at.
  document.addEventListener("visibilitychange", function () {
    if (!ctx || !playing) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // Fallback for browsers that refused the load-time attempt above: resume
  // the same context on the first gesture rather than restarting the piece.
  // Events on the toggle itself are skipped — otherwise the pointerdown that
  // opens the control would resume the score and the click that follows
  // would immediately stop it again.
  function onGesture(e) {
    if (e && e.target && e.target.closest && e.target.closest("#sound-toggle")) return;
    disarm();
    if (ctx && ctx.state === "suspended") ctx.resume().then(sync, sync);
    else if (!playing) start();
  }
  function armForGesture() {
    pending = true;
    document.addEventListener("pointerdown", onGesture);
    document.addEventListener("keydown", onGesture);
    document.addEventListener("touchend", onGesture);
  }
  function disarm() {
    pending = false;
    document.removeEventListener("pointerdown", onGesture);
    document.removeEventListener("keydown", onGesture);
    document.removeEventListener("touchend", onGesture);
  }

  // On unless it has been turned off before — and now it actually tries to
  // play right away instead of only arming for later.
  var stored = null;
  try { stored = localStorage.getItem(STORE); } catch (e) {}
  if (stored !== "off") start();

  paint();
})();
