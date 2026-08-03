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
      // Leaving presenter mode normally puts you back where the slide you
      // were on sits in the scroll — but the wordmark means "back to the
      // beginning", and that restore is a rAF, so it would land after this
      // jump to the top and quietly undo it.
      if (presenterActive) exitPresenter(false);
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
  function bodyNode(sourceEl) {
    var d = document.createElement("div");
    d.className = "presenter-sub";
    var wrap = document.createElement("div");
    wrap.className = "presenter-sub-body";
    wrap.appendChild(sourceEl.cloneNode(true));
    d.appendChild(wrap);
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
  function cardParagraphs(cardSlide) {
    var card = cardSlide.firstChild;
    return card ? Array.prototype.slice.call(card.children).filter(function (el) {
      return el.tagName === "P";
    }) : [];
  }
  // The Example card is the longest single block on the site — two dense
  // paragraphs of worldbuilding under one heading. Fitting it whole is
  // possible but means presenting it at about half size, so it is dealt
  // out a paragraph at a time under a repeated heading instead. Splitting
  // where the writing already breaks costs the copy nothing; every other
  // card is short enough to stay in one piece.
  function cardNodes(sourceEl, excludeSelector) {
    var whole = cardNode(sourceEl, excludeSelector);
    var count = cardParagraphs(whole).length;
    if (count < 2) return [whole];
    var out = [];
    for (var i = 0; i < count; i++) {
      var slice = cardNode(sourceEl, excludeSelector);
      var keep = i;
      cardParagraphs(slice).forEach(function (p, j) {
        if (j !== keep) p.parentNode.removeChild(p);
      });
      out.push(slice);
    }
    return out;
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
  // returns null for a section with neither an era-grid nor a curator's
  // note, which stays a single, unsplit slide.
  function buildEraSubslides(era) {
    var grid = era.querySelector(".era-grid");
    // The Museum closer has no grid — it is a placard, six paragraphs of
    // it, and it was the one slide the fitter had to take down past half
    // size to hold whole. Dealt out a paragraph at a time it reads at
    // full size, and the thesis it ends on gets the wall to itself.
    if (!grid) {
      var placard = era.querySelector(".museum-text");
      if (!placard) return null;
      var placardNodes = [titleNode(era)];
      Array.prototype.slice.call(placard.children).forEach(function (p) {
        // Kept inside a .museum-text of its own: the thesis paragraph is
        // styled by descent from it, and a bare clone would arrive
        // without the rule that gives it its accent bar.
        var wrap = document.createElement("div");
        wrap.className = "museum-text";
        wrap.appendChild(p.cloneNode(true));
        placardNodes.push(bodyNode(wrap));
      });
      var wingTurn = era.querySelector(".wing-turn");
      if (wingTurn) placardNodes.push(cardNode(wingTurn));
      return placardNodes;
    }
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
    if (exampleCard) nodes.push.apply(nodes, cardNodes(exampleCard, ".day-in-life"));
    if (subs[2]) nodes.push(subNode(subs[2].label, subs[2].bodyHTML));
    if (dayInLife) nodes.push(cardNode(dayInLife));
    if (subs[3]) nodes.push(subNode(subs[3].label, subs[3].bodyHTML));
    if (historicalNote) nodes.push(cardNode(historicalNote));
    return nodes;
  }

  function makeVirtualEntry(node, eraKey, sectionId) {
    return {
      eraKey: eraKey, pastKey: null, sectionId: sectionId,
      fitEl: presenterVirtualSlide,
      // Built copy, all vector: it can be blown up past its natural size
      // to fill the wall when a slide is only a heading and a paragraph.
      maxScale: 1.35,
      show: function () {
        presenterVirtualSlide.innerHTML = "";
        presenterVirtualSlide.appendChild(node);
        presenterVirtualSlide.hidden = false;
        presenterVirtualSlide.classList.add("presenter-current");
      },
      hide: function () {
        presenterVirtualSlide.classList.remove("presenter-current", "presenter-scroll");
        clearSlideBox(presenterVirtualSlide);
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
      fitEl: el,
      // A live section, canvas widgets and all. Shrinking one is fine —
      // it is the same reflow the page already does at a narrower window
      // — but enlarging it would resample a raster widget upwards, so the
      // section's own size is the ceiling.
      maxScale: 1,
      show: function () {
        el.classList.add("presenter-current");
        if (opts.widgetOnly) el.classList.add("presenter-widget-only");
      },
      hide: function () {
        el.classList.remove("presenter-current", "presenter-scroll", "presenter-widget-only");
        clearSlideBox(el);
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
      if (era.querySelector(".interactive-block")) entries.push(makeRealEntry(era, { widgetOnly: true }));
    });

    var pastIntro = document.querySelector("#timeline > .past-intro");
    if (pastIntro) entries.push(makeRealEntry(pastIntro));
    Array.prototype.slice.call(document.querySelectorAll("#timeline > .past")).forEach(function (s) {
      entries.push(makeRealEntry(s));
    });
    return entries;
  }

  // ---------------------------------------------------------------
  // Fitting a slide to the screen
  // ---------------------------------------------------------------
  // The first cut of presenter mode chose its type sizes up front and
  // hoped: headings at clamp(2rem, 5.5vw, 3.4rem), body at
  // clamp(1.15rem, 2.3vw, 1.55rem). Slides carrying more than that guess
  // allowed for — the Example cards especially — overflowed, and the
  // fallback was to top-align the slide and let it scroll, which during a
  // talk means the end of the thought is simply not on the wall.
  //
  // A slide now measures itself instead. It is laid out in a *virtual*
  // viewport of vw/s by vh/s and then scaled back by s, which is the
  // same thing as re-typesetting it at s times the size — text re-wraps
  // to the wider box rather than being squeezed inside a fixed column —
  // and s is found by bisection: the largest one whose content still
  // comes in under the height. Nothing the site says has to get shorter
  // for a slide to hold it, and none of the page's own type rules move;
  // the slide just carries its own scale. Slides with room to spare go
  // the other way and grow into it.

  var FIT_MIN_SCALE = 0.4;
  var FIT_STEPS = 7;
  // The header sits over the top of every slide and the controls pill over
  // the bottom, both at a fixed size on screen. Reserving room for them in
  // ordinary padding would shrink that room along with everything else on
  // a slide that had to scale down — exactly when the slide is at its
  // tallest. Dividing the reservation by the scale cancels the scale out,
  // so the gap the chrome sits in is the same however the slide came out.
  // Capped as a share of the window as well, because a fixed 148px out of
  // a squashed 480px-tall one is a third of the wall spent on margins.
  var CHROME_TOP = 68;
  var CHROME_BOTTOM = 80;
  function chromeTop() { return Math.min(CHROME_TOP, window.innerHeight * 0.09); }
  function chromeBottom() { return Math.min(CHROME_BOTTOM, window.innerHeight * 0.11); }

  function clearSlideBox(el) {
    el.style.width = "";
    el.style.height = "";
    el.style.paddingTop = "";
    el.style.paddingBottom = "";
    el.style.transform = "";
  }

  function sizeSlideBox(el, s) {
    el.style.width = Math.ceil(window.innerWidth / s) + "px";
    el.style.paddingTop = (chromeTop() / s) + "px";
    el.style.paddingBottom = (chromeBottom() / s) + "px";
  }

  // Lays the slide out at scale s and reports whether it fits. Height is
  // left auto for the measurement so offsetHeight is the honest height of
  // the content plus its padding — scrollHeight on an already-clipped box
  // is the thing browsers disagree about at the bottom edge.
  function slideFitsAt(el, s) {
    sizeSlideBox(el, s);
    el.style.height = "auto";
    return el.offsetHeight <= Math.ceil(window.innerHeight / s);
  }

  function fitPresenterSlide(entry) {
    var el = entry.fitEl;
    var max = entry.maxScale || 1;
    var scale = max;

    el.classList.remove("presenter-scroll");
    if (!slideFitsAt(el, max)) {
      scale = FIT_MIN_SCALE;
      if (!slideFitsAt(el, FIT_MIN_SCALE)) {
        // Two and a half times the screen and still overflowing: nothing
        // here is worth reading at that size anyway, so this one slide
        // scrolls rather than losing its bottom half without saying so.
        el.classList.add("presenter-scroll");
      } else {
        // Fits small, doesn't fit large, and shrinking never makes a slide
        // overflow that didn't — so the boundary can be bisected for.
        var lo = FIT_MIN_SCALE, hi = max;
        for (var i = 0; i < FIT_STEPS; i++) {
          var mid = (lo + hi) / 2;
          if (slideFitsAt(el, mid)) { scale = mid; lo = mid; } else { hi = mid; }
        }
      }
    }

    // Ceil both axes so the scaled box covers the viewport rather than
    // leaving a hairline of footer showing along the right or bottom.
    sizeSlideBox(el, scale);
    el.style.height = Math.ceil(window.innerHeight / scale) + "px";
    el.style.transform = "scale(" + scale + ")";
    el.scrollTop = 0;
  }

  // Widgets mount lazily, and a slide's widget only comes into view when
  // the slide does — so the first fit for those is measuring a box that
  // is still empty. Re-fit once the mount has had its frame.
  function refitCurrentSlide() {
    var slide = presenterSlides[presenterIndex];
    if (presenterActive && slide) fitPresenterSlide(slide);
  }

  // And the widget stays live once it is up: a demo prints a line, a
  // terminal types one, and the slide is taller than it was when it was
  // measured. Watching its subtree catches that. The fit itself only ever
  // writes inline styles on the slide element, and an attribute is not a
  // childList or characterData record, so this cannot feed itself — but a
  // widget that re-renders on width changes could, so refits are throttled
  // rather than run per record.
  var contentObserver = null;
  var contentRefitAt = 0;
  var contentRefitTimer = null;
  if (window.MutationObserver) {
    contentObserver = new MutationObserver(function () {
      var now = Date.now();
      clearTimeout(contentRefitTimer);
      contentRefitTimer = setTimeout(refitCurrentSlide, 220);
      if (now - contentRefitAt >= 250) {
        contentRefitAt = now;
        refitCurrentSlide();
      }
    });
  }

  function watchSlideContent(entry) {
    if (!contentObserver) return;
    contentObserver.observe(entry.fitEl, { childList: true, characterData: true, subtree: true });
  }
  function unwatchSlideContent() {
    if (!contentObserver) return;
    clearTimeout(contentRefitTimer);
    contentObserver.disconnect();
  }

  function showPresenterSlide(index) {
    if (!presenterSlides.length) return;
    index = Math.max(0, Math.min(index, presenterSlides.length - 1));
    unwatchSlideContent();
    var prev = presenterSlides[presenterIndex];
    if (prev) prev.hide();
    presenterIndex = index;
    var slide = presenterSlides[presenterIndex];
    slide.show();
    fitPresenterSlide(slide);
    requestAnimationFrame(refitCurrentSlide);
    setTimeout(refitCurrentSlide, 400);
    watchSlideContent(slide);

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
    presenterToggle.setAttribute("aria-label", "Exit presenter mode");

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

  // restoreScroll is false only for the wordmark, which is on its way to
  // the top of the page and does not want the slide's position back.
  function exitPresenter(restoreScroll) {
    if (!presenterActive) return;
    presenterActive = false;
    unwatchSlideContent();
    body.classList.remove("presenter-mode");
    presenterControls.hidden = true;
    presenterExit.hidden = true;
    presenterToggle.setAttribute("aria-pressed", "false");
    presenterToggle.setAttribute("aria-label", "Enter presenter mode");

    var slide = presenterSlides[presenterIndex];
    if (slide) slide.hide();
    presenterVirtualSlide.innerHTML = "";

    var target = (restoreScroll !== false && slide) ? slide.scrollTarget() : null;
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
    presenterExit.addEventListener("click", function () { exitPresenter(); });

    // A projector is a resize: plugging one in re-runs the fit rather than
    // leaving the slide scaled for the laptop screen it was measured on.
    var refitTimer = null;
    window.addEventListener("resize", function () {
      if (!presenterActive) return;
      clearTimeout(refitTimer);
      refitTimer = setTimeout(refitCurrentSlide, 120);
    });

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
