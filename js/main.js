(function () {
  "use strict";

  var body = document.body;
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
  // One continuous timeline
  // ---------------------------------------------------------------
  // The page used to be two <main>s, one of them hidden, swapped by a
  // mode toggle — which meant two thirds of the exhibits were reachable
  // only by finding an easter egg. It is now a single scroll: forward
  // from the present to Year 12,525, and then back down the other wing
  // through the real record. Nothing is hidden, so there is no mode, no
  // hidden-swap, and no scroll-position juggling around the swap.

  function scrollToTopInstant() {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  // The Konami code no longer has a mode to flip. It now jumps to the
  // hinge — the point where the gallery turns around — which is the one
  // piece of navigation a very long single page genuinely wants.
  var KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  var konamiProgress = 0;
  window.addEventListener("keydown", function (e) {
    var expected = KONAMI[konamiProgress];
    if (e.key === expected) {
      konamiProgress++;
      if (konamiProgress === KONAMI.length) {
        konamiProgress = 0;
        if (!presenterActive) {
          var hinge = document.getElementById("archive");
          if (hinge) hinge.scrollIntoView({ behavior: "smooth", block: "start" });
          showSecret("The other wing is not hidden any more. It is simply further down.");
        }
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

  if (logo) {
    logo.addEventListener("click", function (e) {
      e.preventDefault();
      if (presenterActive) exitPresenter();
      scrollToTopInstant();
      body.dataset.era = "present";
      delete body.dataset.past;
      yearCounter.textContent = YEAR_BY_ERA.present;
      setActiveDot("present");
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    });
    logo.addEventListener("dblclick", function (e) {
      e.preventDefault();
      showSecret("Museum marginalia unlocked. Try typing basilisk, skynet, singularity, paperclip, am, or ted.");
    });
  }

  // ---------------------------------------------------------------
  // Scroll-driven era theming + nav state
  // ---------------------------------------------------------------

  var dotlinks = dotnav ? Array.prototype.slice.call(dotnav.querySelectorAll("a")) : [];

  function setActiveDot(id) {
    dotlinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  }

  // One list, in document order: the forward eras, then the other wing's
  // sections. Which theme family a section belongs to is read off the
  // element rather than off a page mode, because there is no page mode.
  var sections = Array.prototype.slice.call(
    document.querySelectorAll("#timeline .era, #timeline .past")
  );

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
    // on the untracked hinge screen between the two wings, where the
    // nearest real section can still be most of a page away.
    if (closest && closestDist < window.innerHeight / 2) return closest;
    return null;
  }

  function updateActiveSection() {
    scrollTicking = false;
    if (presenterActive) return;
    var target = sectionAtCenter(sections);
    if (!target) return;
    var era = target.getAttribute("data-era");
    if (era) {
      body.dataset.era = era;
      delete body.dataset.past;
      yearCounter.textContent = YEAR_BY_ERA[era] || yearCounter.textContent;
      setActiveDot(target.id);
    } else {
      body.dataset.past = target.getAttribute("data-past");
      delete body.dataset.era;
      var dateEl = target.querySelector(".past-date");
      yearCounter.textContent = dateEl ? dateEl.textContent : yearCounter.textContent;
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
  // the deep archive, one full-screen slide at a time. Each forward
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
      if (!src) return;
      // The era artwork is re-generated rather than deep-cloned. A cloned
      // scene carries duplicate gradient/filter ids, and those resolve back
      // to the original inside the now-hidden era, which the browser has
      // stopped building resources for — the copy renders flat and unlit.
      if (cls === "era-art" && window.Year2525Art) {
        var mount = src.cloneNode(false);
        if (window.Year2525Art.render(mount)) { d.appendChild(mount); return; }
      }
      d.appendChild(src.cloneNode(true));
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
    var forwardEras = Array.prototype.slice.call(document.querySelectorAll("#timeline > .era"));
    forwardEras.forEach(function (era) {
      var subNodes = buildEraSubslides(era);
      var eraKey = era.getAttribute("data-era");
      if (!subNodes) { entries.push(makeRealEntry(era)); return; }
      subNodes.forEach(function (node) { entries.push(makeVirtualEntry(node, eraKey, era.id)); });
      entries.push(makeRealEntry(era, { widgetOnly: true }));
    });

    var pastIntro = document.querySelector("#timeline > .past-intro");
    if (pastIntro) entries.push(makeRealEntry(pastIntro));
    Array.prototype.slice.call(document.querySelectorAll("#timeline > .past")).forEach(function (s) {
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
      // the Deep Archive intro slide — no theme of its own, borrow the next one's date
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
    var currentEra = body.dataset.era;
    var currentPast = body.dataset.past;

    presenterSlides = buildPresenterSlides();
    body.classList.add("presenter-mode");
    presenterControls.hidden = false;
    presenterExit.hidden = false;
    presenterToggle.setAttribute("aria-pressed", "true");

    // Open on whichever exhibit the reader was actually looking at. Only
    // one of the two theme keys is ever set at a time now, so the live one
    // says which wing they are in without needing a remembered mode.
    var startIndex = 0;
    if (currentPast) {
      for (var j = 0; j < presenterSlides.length; j++) {
        if (presenterSlides[j].pastKey === currentPast) { startIndex = j; break; }
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
