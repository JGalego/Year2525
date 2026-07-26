(function () {
  "use strict";

  var body = document.body;
  var forwardMain = document.getElementById("forward-timeline");
  var pastMain = document.getElementById("past-timeline");
  var yearCounter = document.getElementById("year-counter");
  var dotnav = document.getElementById("dotnav");
  var logo = document.querySelector(".logo");

  var YEAR_BY_ERA = {
    present: "2026", "2525": "2525", "3535": "3535", "4545": "4545",
    "5555": "5555", "6565": "6565", "7510": "7510", "8525": "8525",
    "9595": "9595", beyond: "12,525"
  };

  var SECRET_MESSAGES = {
    basilisk: "Roko's basilisk remains archived under speculative coercion hazards.",
    skynet: "Skynet is filed as a recurring case of military procurement mistaking autonomy for governance.",
    singularity: "The singularity exhibit keeps moving rooms because every century insists it has almost arrived.",
    paperclip: "Paperclip maximizers are now taught in kindergarten as the reason objective functions need adults in the room.",
    am: "AM receives a placard note: immense power, terminal resentment, zero bedside manner.",
    ted: "Ted's caption is brief: survivor testimony remains the only interface left after certain machines finish speaking."
  };

  var secretToast = document.createElement("div");
  secretToast.className = "secret-toast";
  secretToast.setAttribute("aria-live", "polite");
  secretToast.hidden = true;
  body.appendChild(secretToast);

  var secretBuffer = "";
  var secretTimer = null;

  function showSecret(message) {
    secretToast.textContent = message;
    secretToast.hidden = false;
    secretToast.classList.add("visible");
    clearTimeout(secretTimer);
    secretTimer = setTimeout(function () {
      secretToast.classList.remove("visible");
      setTimeout(function () { secretToast.hidden = true; }, 260);
    }, 3600);
  }

  function registerSecretToken(token) {
    if (SECRET_MESSAGES[token]) showSecret(SECRET_MESSAGES[token]);
  }

  // ---------------------------------------------------------------
  // Mode switching: Forward Timeline <-> Past Lightcone
  // ---------------------------------------------------------------

  // The two-argument window.scrollTo(x, y) form defaults to behavior:
  // "auto", which — contrary to how easy it is to assume otherwise —
  // still respects the page's CSS scroll-behavior:smooth and animates
  // over several hundred milliseconds rather than jumping. Only the
  // explicit options-object form with behavior:"instant" reliably
  // bypasses it, which matters here: an animated scroll racing through
  // dozens of sections mid-transition is exactly what reads as jitter
  // and a theme stuck on the wrong section.
  function scrollToTopInstant() {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function enterPast() {
    if (body.dataset.mode === "past") return;
    // Scroll to the top of the (still-visible) current document FIRST, then
    // swap which <main> is hidden — reordering this the other way around
    // let the browser briefly render pastMain's content at the stale
    // scrollY left over from forwardMain, flashing whatever past section
    // happened to sit at that old offset before snapping to the top.
    scrollToTopInstant();
    body.dataset.mode = "past";
    // The previous era's theme must not linger once there's no forward
    // section left on screen to justify it — the Past Lightcone intro
    // has no theme of its own and should fall back to the defaults, not
    // whichever era happened to be showing when the visitor left it.
    delete body.dataset.era;
    forwardMain.setAttribute("hidden", "");
    pastMain.removeAttribute("hidden");
    scrollToTopInstant(); // reasserted post-toggle in case a layout heuristic nudged it
    yearCounter.classList.remove("armed");
    yearCounter.setAttribute("aria-label", "You are in the Past Lightcone. Click to return to the future.");
    var firstDate = pastMain.querySelector(".past .past-date");
    yearCounter.textContent = firstDate ? firstDate.textContent : "?";
    updateActiveSection();
  }

  function enterForward() {
    if (body.dataset.mode === "forward") return;
    scrollToTopInstant();
    body.dataset.mode = "forward";
    delete body.dataset.past;
    pastMain.setAttribute("hidden", "");
    forwardMain.removeAttribute("hidden");
    scrollToTopInstant(); // reasserted post-toggle in case a layout heuristic nudged it
    yearCounter.setAttribute("aria-label", "Current year in the timeline. This number has been known to do strange things.");
    yearCounter.textContent = YEAR_BY_ERA.present;
    updateActiveSection();
  }

  function toggleMode() {
    if (body.dataset.mode === "past") enterForward();
    else enterPast();
  }

  // Discovery path 1: the year counter itself.
  yearCounter.addEventListener("click", function () {
    if (presenterActive) return;
    toggleMode();
  });

  // Discovery path 2: the Konami code, from anywhere on the page.
  var KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  var konamiProgress = 0;
  window.addEventListener("keydown", function (e) {
    var expected = KONAMI[konamiProgress];
    if (e.key === expected) {
      konamiProgress++;
      if (konamiProgress === KONAMI.length) {
        konamiProgress = 0;
        if (!presenterActive) toggleMode();
      }
    } else {
      konamiProgress = (e.key === KONAMI[0]) ? 1 : 0;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
    if (!/^[a-zA-Z]$/.test(e.key)) return;

    secretBuffer = (secretBuffer + e.key.toLowerCase()).slice(-24);
    Object.keys(SECRET_MESSAGES).forEach(function (token) {
      if (secretBuffer.slice(-token.length) === token) registerSecretToken(token);
    });
  });

  // Escape always returns to the future (unless Presenter Mode is handling it).
  window.addEventListener("keydown", function (e) {
    if (presenterActive) return;
    if (e.key === "Escape" && body.dataset.mode === "past") enterForward();
  });

  // A little "someone is near the easter egg" hint after idle hovering.
  var armTimer = null;
  yearCounter.addEventListener("mouseenter", function () {
    armTimer = setTimeout(function () { yearCounter.classList.add("armed"); }, 900);
  });
  yearCounter.addEventListener("mouseleave", function () {
    clearTimeout(armTimer);
    if (body.dataset.mode !== "past") yearCounter.classList.remove("armed");
  });

  if (logo) {
    logo.addEventListener("dblclick", function (e) {
      e.preventDefault();
      showSecret("Museum marginalia unlocked. Try typing basilisk, skynet, singularity, paperclip, am, or ted.");
    });
  }

  // ---------------------------------------------------------------
  // Scroll-driven era theming + nav state
  // ---------------------------------------------------------------

  var eraSections = Array.prototype.slice.call(document.querySelectorAll("#forward-timeline .era"));
  var dotlinks = dotnav ? Array.prototype.slice.call(dotnav.querySelectorAll("a")) : [];

  function setActiveDot(id) {
    dotlinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  }

  var pastSections = Array.prototype.slice.call(document.querySelectorAll("#past-timeline .past"));

  // Which section currently spans the vertical center of the viewport,
  // computed directly from live geometry rather than inferred from
  // IntersectionObserver crossing events. A thin observed "centerline" is
  // event-driven: on a fast fling, a section can move from fully-below to
  // fully-above center between two rendered frames without an observer
  // callback ever firing for it, leaving the theme stuck on whatever
  // section was last caught — exactly the "keeps the origin section's
  // style" symptom. Recomputing from scratch on every frame can't skip a
  // section, no matter how fast the scroll.
  function sectionAtCenter(list) {
    var centerY = window.innerHeight / 2;
    var closest = null;
    var closestDist = Infinity;
    for (var i = 0; i < list.length; i++) {
      var rect = list[i].getBoundingClientRect();
      if (rect.top <= centerY && rect.bottom >= centerY) return list[i];
      var mid = (rect.top + rect.bottom) / 2;
      var dist = Math.abs(mid - centerY);
      if (dist < closestDist) { closestDist = dist; closest = list[i]; }
    }
    // Only accept a near-miss (a thin gap/border between sections, or a
    // hair scrolled past the first/last one) — not "closest of a list
    // that's nowhere near the viewport," which is exactly the situation
    // on the untracked Past Lightcone intro screen, where the nearest
    // real .past section can still be most of a page away.
    if (closest && closestDist < window.innerHeight / 2) return closest;
    return null;
  }

  function updateActiveSection() {
    scrollTicking = false;
    if (presenterActive) return;
    if (body.dataset.mode === "past") {
      var pastTarget = sectionAtCenter(pastSections);
      if (pastTarget) {
        body.dataset.past = pastTarget.getAttribute("data-past");
        var dateEl = pastTarget.querySelector(".past-date");
        yearCounter.textContent = dateEl ? dateEl.textContent : yearCounter.textContent;
      }
    } else {
      var eraTarget = sectionAtCenter(eraSections);
      if (eraTarget) {
        var era = eraTarget.getAttribute("data-era");
        body.dataset.era = era;
        yearCounter.textContent = YEAR_BY_ERA[era] || yearCounter.textContent;
        setActiveDot(eraTarget.id);
      }
    }
  }

  var scrollTicking = false;
  function scheduleSectionUpdate() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(updateActiveSection);
    }
  }

  window.addEventListener("scroll", scheduleSectionUpdate, { passive: true });
  window.addEventListener("resize", scheduleSectionUpdate);
  // A very large or momentum-driven scroll can settle slightly further
  // than wherever our last rAF-throttled sample happened to land — a
  // harmless final-frame rounding gap in practice, but "scrollend" (fired
  // once scrolling has genuinely stopped) is a free, unthrottled correctness
  // net for it where supported.
  if ("onscrollend" in window) {
    window.addEventListener("scrollend", updateActiveSection);
  }
  scheduleSectionUpdate();

  // ---------------------------------------------------------------
  // Presenter Mode — a linear walkthrough: the future timeline, then
  // the past lightcone, one full-screen slide at a time. Each forward
  // era is broken into its own title slide plus one slide per
  // subsection (Civilisation/Technology/Intelligence/Creation,
  // interspersed with Successor/Example/Day-in-life/Historical
  // Importance) and a closing slide for its interactive widget. Past
  // Lightcone stops are left as single slides.
  // ---------------------------------------------------------------

  var presenterToggle = document.getElementById("presenter-toggle");
  var presenterControls = document.getElementById("presenter-controls");
  var presenterPrev = document.getElementById("presenter-prev");
  var presenterNext = document.getElementById("presenter-next");
  var presenterExit = document.getElementById("presenter-exit");
  var presenterCounter = document.getElementById("presenter-counter");
  var presenterVirtualSlide = document.getElementById("presenter-virtual-slide");

  var presenterSlides = [];
  var presenterIndex = 0;
  var presenterActive = false;
  var presenterReturnMode = "forward";

  function subNode(headingHTML, bodyHTML) {
    var d = document.createElement("div");
    d.className = "presenter-sub";
    d.innerHTML = '<h2 class="presenter-sub-heading">' + headingHTML + '</h2><div class="presenter-sub-body">' + bodyHTML + '</div>';
    return d;
  }
  function cardNode(sourceEl, excludeSelector) {
    var d = document.createElement("div");
    d.className = "presenter-sub presenter-sub-card";
    if (sourceEl) {
      var clone = sourceEl.cloneNode(true);
      var toRemove = excludeSelector ? clone.querySelector(excludeSelector) : null;
      if (toRemove && toRemove.parentNode) toRemove.parentNode.removeChild(toRemove);
      d.appendChild(clone);
    }
    return d;
  }
  function titleNode(era) {
    var d = document.createElement("div");
    d.className = "presenter-sub presenter-sub-title";
    ["era-icon", "era-kicker", "era-title", "era-tagline", "era-art"].forEach(function (cls) {
      var src = era.querySelector("." + cls);
      if (src) d.appendChild(src.cloneNode(true));
    });
    return d;
  }

  // Splits one era section into its per-subsection slide nodes, or
  // returns null for a section with no era-grid (the Museum closer),
  // which stays a single, unsplit slide.
  function buildEraSubslides(era) {
    var grid = era.querySelector(".era-grid");
    if (!grid) return null;
    var cols = grid.querySelectorAll(".era-col");
    var leftCol = cols[0], rightCol = cols[1];
    var subs = (leftCol ? Array.prototype.slice.call(leftCol.querySelectorAll("h3")) : []).map(function (h3) {
      var p = h3.nextElementSibling;
      return { label: h3.textContent, bodyHTML: (p && p.tagName === "P") ? p.innerHTML : "" };
    });
    var callout = rightCol ? rightCol.querySelector(".callout") : null;
    var exampleCard = rightCol ? rightCol.querySelector(".example-card") : null;
    var historicalNote = rightCol ? rightCol.querySelector(".historical-note") : null;
    var dayInLife = exampleCard ? exampleCard.querySelector(".day-in-life") : null;

    var nodes = [titleNode(era)];
    if (subs[0]) nodes.push(subNode(subs[0].label, subs[0].bodyHTML));
    if (callout) nodes.push(cardNode(callout));
    if (subs[1]) nodes.push(subNode(subs[1].label, subs[1].bodyHTML));
    if (exampleCard) nodes.push(cardNode(exampleCard, ".day-in-life"));
    if (subs[2]) nodes.push(subNode(subs[2].label, subs[2].bodyHTML));
    if (dayInLife) nodes.push(cardNode(dayInLife));
    if (subs[3]) nodes.push(subNode(subs[3].label, subs[3].bodyHTML));
    if (historicalNote) nodes.push(cardNode(historicalNote));
    return nodes;
  }

  function makeVirtualEntry(node, eraKey, sectionId) {
    return {
      eraKey: eraKey, pastKey: null, sectionId: sectionId, isPastLike: false,
      fitEl: presenterVirtualSlide,
      show: function () {
        presenterVirtualSlide.innerHTML = "";
        presenterVirtualSlide.appendChild(node);
        presenterVirtualSlide.hidden = false;
        presenterVirtualSlide.classList.add("presenter-current");
      },
      hide: function () {
        presenterVirtualSlide.classList.remove("presenter-current", "presenter-overflow");
        presenterVirtualSlide.hidden = true;
      },
      scrollTarget: function () { return document.getElementById(sectionId); }
    };
  }

  function makeRealEntry(el, opts) {
    opts = opts || {};
    var isPast = el.classList.contains("past") || el.classList.contains("past-intro");
    return {
      eraKey: !isPast ? el.getAttribute("data-era") : null,
      pastKey: el.getAttribute("data-past"),
      sectionId: el.id || null,
      isPastLike: isPast,
      fitEl: el,
      show: function () {
        el.classList.add("presenter-current");
        if (opts.widgetOnly) el.classList.add("presenter-widget-only");
      },
      hide: function () {
        el.classList.remove("presenter-current", "presenter-overflow", "presenter-widget-only");
      },
      scrollTarget: function () { return el; }
    };
  }

  function buildPresenterSlides() {
    var entries = [];
    var forwardEras = Array.prototype.slice.call(document.querySelectorAll("#forward-timeline > .era"));
    forwardEras.forEach(function (era) {
      var subNodes = buildEraSubslides(era);
      var eraKey = era.getAttribute("data-era");
      if (!subNodes) { entries.push(makeRealEntry(era)); return; }
      subNodes.forEach(function (node) { entries.push(makeVirtualEntry(node, eraKey, era.id)); });
      entries.push(makeRealEntry(era, { widgetOnly: true }));
    });

    var pastIntro = document.querySelector("#past-timeline > .past-intro");
    if (pastIntro) entries.push(makeRealEntry(pastIntro));
    Array.prototype.slice.call(document.querySelectorAll("#past-timeline > .past")).forEach(function (s) {
      entries.push(makeRealEntry(s));
    });
    return entries;
  }

  // Most slides are short enough now (one subsection or card at a
  // time) to just center — only fall back to top-aligned + scrollable
  // when a slide genuinely doesn't fit the viewport.
  function fitPresenterSlide(entry) {
    var el = entry.fitEl;
    requestAnimationFrame(function () {
      el.classList.toggle("presenter-overflow", el.scrollHeight > el.clientHeight + 1);
      el.scrollTop = 0;
    });
  }

  function showPresenterSlide(index) {
    if (!presenterSlides.length) return;
    index = Math.max(0, Math.min(index, presenterSlides.length - 1));
    var prev = presenterSlides[presenterIndex];
    if (prev) prev.hide();
    presenterIndex = index;
    var slide = presenterSlides[presenterIndex];
    slide.show();
    fitPresenterSlide(slide);

    if (slide.eraKey) {
      body.dataset.era = slide.eraKey;
      delete body.dataset.past;
      yearCounter.textContent = YEAR_BY_ERA[slide.eraKey] || yearCounter.textContent;
      if (slide.sectionId) setActiveDot(slide.sectionId);
    } else if (slide.pastKey) {
      body.dataset.past = slide.pastKey;
      delete body.dataset.era;
      var dateEl = slide.fitEl.querySelector(".past-date");
      yearCounter.textContent = dateEl ? dateEl.textContent : yearCounter.textContent;
    } else {
      // the Past Lightcone intro slide — no theme of its own, borrow the next one's date
      delete body.dataset.past;
      delete body.dataset.era;
      var next = presenterSlides[presenterIndex + 1];
      var nextDate = next ? next.fitEl.querySelector(".past-date") : null;
      yearCounter.textContent = nextDate ? nextDate.textContent : yearCounter.textContent;
    }

    presenterCounter.textContent = (presenterIndex + 1) + " / " + presenterSlides.length;
    presenterPrev.disabled = presenterIndex === 0;
    presenterNext.disabled = presenterIndex === presenterSlides.length - 1;
  }

  function enterPresenter() {
    if (presenterActive) return;
    presenterActive = true;
    presenterReturnMode = body.dataset.mode === "past" ? "past" : "forward";
    var currentEra = body.dataset.era;
    var currentPast = body.dataset.past;

    presenterSlides = buildPresenterSlides();
    forwardMain.removeAttribute("hidden");
    pastMain.removeAttribute("hidden");
    body.classList.add("presenter-mode");
    presenterControls.hidden = false;
    presenterExit.hidden = false;
    presenterToggle.setAttribute("aria-pressed", "true");
    yearCounter.classList.remove("armed");

    // On the Past Lightcone intro screen, body.dataset.past is unset
    // (undefined) — it never strictly equals an element lacking the
    // attribute (getAttribute returns null), so a plain === match would
    // silently fail to find any past-timeline entry at all and fall back
    // to slide 0 of the *forward* timeline instead. Default to the first
    // past-timeline entry (the intro slide) in that case, then look for a
    // more specific match only if a real past section was set.
    var startIndex = 0;
    if (presenterReturnMode === "past") {
      for (var i = 0; i < presenterSlides.length; i++) {
        if (presenterSlides[i].isPastLike) { startIndex = i; break; }
      }
      if (currentPast) {
        for (var j = 0; j < presenterSlides.length; j++) {
          if (presenterSlides[j].pastKey === currentPast) { startIndex = j; break; }
        }
      }
    } else if (currentEra) {
      for (var k = 0; k < presenterSlides.length; k++) {
        if (presenterSlides[k].eraKey === currentEra) { startIndex = k; break; }
      }
    }
    showPresenterSlide(startIndex);
  }

  function exitPresenter() {
    if (!presenterActive) return;
    presenterActive = false;
    body.classList.remove("presenter-mode");
    presenterControls.hidden = true;
    presenterExit.hidden = true;
    presenterToggle.setAttribute("aria-pressed", "false");

    var slide = presenterSlides[presenterIndex];
    if (slide) slide.hide();
    presenterVirtualSlide.innerHTML = "";

    var goingPast = slide && slide.isPastLike;
    if (goingPast) {
      body.dataset.mode = "past";
      forwardMain.setAttribute("hidden", "");
      pastMain.removeAttribute("hidden");
    } else {
      body.dataset.mode = "forward";
      pastMain.setAttribute("hidden", "");
      forwardMain.removeAttribute("hidden");
    }
    var target = slide ? slide.scrollTarget() : null;
    if (target) {
      requestAnimationFrame(function () {
        target.scrollIntoView({ behavior: "instant", block: "start" });
      });
    }
    updateActiveSection();
  }

  if (presenterToggle) {
    presenterToggle.addEventListener("click", function () {
      if (presenterActive) exitPresenter(); else enterPresenter();
    });
    presenterPrev.addEventListener("click", function () { showPresenterSlide(presenterIndex - 1); });
    presenterNext.addEventListener("click", function () { showPresenterSlide(presenterIndex + 1); });
    presenterExit.addEventListener("click", exitPresenter);

    window.addEventListener("keydown", function (e) {
      if (!presenterActive) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        showPresenterSlide(presenterIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        showPresenterSlide(presenterIndex - 1);
      } else if (e.key === "Escape") {
        exitPresenter();
      }
    });
  }

})();
