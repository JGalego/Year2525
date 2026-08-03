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
  var presenterPDF = document.getElementById("presenter-pdf");
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
      // Nothing on it needs to have been on screen to be worth copying.
      live: false,
      printContent: function () { return printCopy(node); },
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
      // A widget mounts when the slide it is on comes into view and sizes
      // itself from the box it mounted into, so an export has to put this
      // slide on screen before there is anything on it to copy.
      live: true,
      printContent: function () {
        // A widget slide is the widget: on screen the rest of the section
        // is hidden by CSS, and in a copy it is simply not brought along.
        var copy = printCopy(el.querySelector(".era-inner") || el);
        if (opts.widgetOnly) {
          Array.prototype.slice.call(copy.children).forEach(function (child) {
            if (!child.classList.contains("interactive-block") && !child.classList.contains("changelog")) {
              copy.removeChild(child);
            }
          });
        }
        return copy;
      },
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

  // The largest scale in [FIT_MIN_SCALE, maxScale] at which the element,
  // laid out by sizeAt(s), still comes in under boxH/s — or null if even
  // the smallest one overflows. Fitting is monotone in s: laying a slide
  // out smaller only ever gives it a wider box and more room than it had,
  // so the boundary between fits and doesn't can be bisected for.
  //
  // Height is left auto for each measurement, because offsetHeight of an
  // auto-height box is the honest height of the content plus its padding —
  // scrollHeight on an already-clipped box is the thing browsers disagree
  // about at the bottom edge. The caller sets the final height itself.
  function fitScale(el, boxH, maxScale, sizeAt) {
    function fits(s) {
      sizeAt(s);
      el.style.height = "auto";
      return el.offsetHeight <= Math.ceil(boxH / s);
    }
    if (fits(maxScale)) return maxScale;
    if (!fits(FIT_MIN_SCALE)) return null;
    var scale = FIT_MIN_SCALE, lo = FIT_MIN_SCALE, hi = maxScale;
    for (var i = 0; i < FIT_STEPS; i++) {
      var mid = (lo + hi) / 2;
      if (fits(mid)) { scale = mid; lo = mid; } else { hi = mid; }
    }
    return scale;
  }

  function fitPresenterSlide(entry) {
    var el = entry.fitEl;
    el.classList.remove("presenter-scroll");
    var scale = fitScale(el, window.innerHeight, entry.maxScale || 1, function (s) {
      sizeSlideBox(el, s);
    });
    if (scale === null) {
      // Two and a half times the screen and still overflowing: nothing here
      // is worth reading at that size anyway, so this one slide scrolls
      // rather than losing its bottom half without saying so.
      scale = FIT_MIN_SCALE;
      el.classList.add("presenter-scroll");
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

  // ---------------------------------------------------------------
  // Export to PDF
  // ---------------------------------------------------------------
  // No library and no server: the browser already has a PDF writer behind
  // window.print(), so the work is handing it a document worth printing —
  // one page-sized box per slide, in order, each fitted by the same
  // bisection the screen uses, against the page box instead of the window.
  //
  // The pages are built at 1280x720 to match the @page size, so a slide
  // measured here is not rescaled again on the way out.

  var PRINT_PAGE_W = 1280;
  var PRINT_PAGE_H = 720;
  var printRoot = null;
  var printOverlay = null;
  var printSafety = null;
  var exporting = false;

  // Every theme on the site is a set of custom properties hung off
  // body[data-era] / body[data-past], plus a few rules that reach down from
  // there into a section. One printed document has one body and needs a
  // different theme per page, so the theme cascade is re-emitted against the
  // pages themselves: each of those rules is copied with its body swapped
  // for a .print-page carrying the same attribute. Reading the real
  // stylesheet rather than restating it means a theme edited later, or a
  // room added later, needs nothing done here to come out right.
  var THEME_BODY_TEST = /body\[data-(?:era|past)[\]=]/;
  var THEME_BODY = /body(?=\[data-(?:era|past)[\]=])/g;

  function collectThemeRules(rules, out, media) {
    Array.prototype.forEach.call(rules, function (rule) {
      if (rule.cssRules && typeof rule.conditionText === "string") {
        collectThemeRules(rule.cssRules, out, rule.conditionText);
        return;
      }
      if (!rule.selectorText || !THEME_BODY_TEST.test(rule.selectorText)) return;
      // Selector lists in this stylesheet are plain — no :is() or :not()
      // carrying commas of their own — so splitting on the comma is safe.
      var selectors = rule.selectorText.split(",").map(function (part) {
        part = part.trim();
        return THEME_BODY_TEST.test(part) ? part.replace(THEME_BODY, "#presenter-print .print-page") : null;
      }).filter(Boolean);
      if (!selectors.length) return;
      var css = selectors.join(", ") + " { " + rule.style.cssText + " }";
      out.push(media ? "@media " + media + " { " + css + " }" : css);
    });
  }

  function printThemeStyle() {
    var out = [];
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules = null;
      // A stylesheet from another origin will not hand its rules over. The
      // site's own, served from beside the page, always does.
      try { rules = sheet.cssRules; } catch (err) { return; }
      if (rules) collectThemeRules(rules, out, "");
    });
    var style = document.createElement("style");
    style.textContent = out.join("\n");
    return style;
  }

  // A copy of a slide's content that can stand on its own in a page.
  function printCopy(sourceEl) {
    var copy = sourceEl.cloneNode(true);
    // The box the on-screen fitter left behind belongs to the window it was
    // measured in. A page is a different size and fits its own copy.
    clearSlideBox(copy);
    copy.classList.remove("presenter-current", "presenter-scroll", "presenter-widget-only");

    // Same reason the presenter re-generates era artwork instead of cloning
    // it: a cloned scene's gradient and filter ids are duplicates, and a
    // duplicate resolves to the original, which is inside a display:none
    // section the browser has stopped building resources for.
    if (window.Year2525Art) {
      Array.prototype.forEach.call(copy.querySelectorAll("[data-art]"), function (mount) {
        window.Year2525Art.render(mount);
      });
    }

    // A cloned canvas is blank — the bitmap is not part of the element — so
    // each one is replaced by a picture of what the live one is showing, at
    // the size it is showing it, which also keeps the copy's layout
    // measurable before the image has decoded.
    var live = sourceEl.querySelectorAll("canvas");
    var dead = copy.querySelectorAll("canvas");
    for (var i = 0; i < dead.length; i++) {
      if (!live[i] || !dead[i].parentNode) continue;
      var shot = document.createElement("img");
      try {
        shot.src = live[i].toDataURL("image/png");
      } catch (err) {
        continue; /* a tainted canvas keeps its blank copy rather than breaking the export */
      }
      shot.className = dead[i].className;
      shot.style.cssText = dead[i].style.cssText;
      shot.style.display = "block";
      shot.style.width = (live[i].offsetWidth || live[i].width) + "px";
      shot.style.height = (live[i].offsetHeight || live[i].height) + "px";
      dead[i].parentNode.replaceChild(shot, dead[i]);
    }
    return copy;
  }

  function printPageFor(entry, content) {
    var page = document.createElement("div");
    page.className = "print-page" + (entry.live ? "" : " print-page-sub");
    // The theme keys the page renders in are the same ones the slide sets on
    // the body. The archive's opening slide sets neither, and leaving both
    // off here is what gives it the same untinted room it has on screen.
    if (entry.eraKey) page.setAttribute("data-era", entry.eraKey);
    else if (entry.pastKey) page.setAttribute("data-past", entry.pastKey);
    var fit = document.createElement("div");
    fit.className = "print-fit";
    fit.appendChild(content);
    page.appendChild(fit);
    return page;
  }

  function fitPrintPage(page, maxScale) {
    var fit = page.querySelector(".print-fit");
    var scale = fitScale(fit, PRINT_PAGE_H, maxScale, function (s) {
      fit.style.width = Math.ceil(PRINT_PAGE_W / s) + "px";
      fit.style.minHeight = "0";
    });
    // A page cannot scroll, so the floor is the floor: a slide that still
    // will not fit at it is scaled there and clipped. Nothing in the gallery
    // as it stands comes near it — the smallest page lands around 0.72.
    if (scale === null) scale = FIT_MIN_SCALE;
    fit.style.height = "";
    fit.style.minHeight = Math.ceil(PRINT_PAGE_H / scale) + "px";
    fit.style.transform = "scale(" + scale + ")";
  }

  // The dioramas are the one thing on a slide a PDF cannot afford to keep
  // as vectors. Each scene is built from a couple of dozen blurred
  // elements, and Chrome writes every filtered subtree into the file as its
  // own high-resolution bitmap: the ten artwork pages came to 52MB of a
  // 58MB export, against 6MB for the other hundred and nineteen.
  // Photographed once each at twice their printed size they look the same
  // and the file comes out around six times smaller.
  function rasterizeArt(page, mount, done) {
    var svg = mount.querySelector("svg");
    var w = mount.offsetWidth, h = mount.offsetHeight;
    if (!svg || !w || !h) { done(); return; }

    // An SVG loaded as an image is its own document: it cannot see this
    // one's custom properties, and the currentColor its strokes default to
    // is no longer inherited from the mount. Both are resolved into the
    // copy, off the themed page, before it is handed over as an image.
    var pageStyle = window.getComputedStyle(page);
    var mountColor = window.getComputedStyle(mount).color;
    var copy = svg.cloneNode(true);
    copy.setAttribute("width", w);
    copy.setAttribute("height", h);
    var markup = new XMLSerializer().serializeToString(copy)
      .replace(/var\(\s*(--[\w-]+)\s*\)/g, function (whole, name) {
        return pageStyle.getPropertyValue(name).trim() || whole;
      })
      .replace(/currentColor/g, mountColor || "currentColor");

    var loader = new Image();
    loader.onload = function () {
      try {
        var shot = document.createElement("canvas");
        shot.width = Math.round(w * 2);
        shot.height = Math.round(h * 2);
        shot.getContext("2d").drawImage(loader, 0, 0, shot.width, shot.height);
        var flat = document.createElement("img");
        flat.src = shot.toDataURL("image/png");
        flat.style.display = "block";
        flat.style.width = "100%";
        flat.style.height = "100%";
        mount.replaceChild(flat, svg);
      } catch (err) { /* leave the scene vector rather than lose it */ }
      done();
    };
    // Anything that stops the image loading leaves the vector scene in
    // place: a heavier file is better than a missing diorama.
    loader.onerror = function () { done(); };
    loader.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
  }

  // A widget mounts when the observer watching it reports the slide it sits
  // on as visible — a frame or two after the slide is shown — and then
  // builds its own DOM. Waiting a fixed couple of frames photographed some
  // of them still empty, so the wait is on the mounts themselves filling up,
  // with a deadline for any that legitimately have nothing to put in them.
  function whenSlideSettled(entry, done) {
    var mounts = Array.prototype.slice.call(entry.fitEl.querySelectorAll("[data-widget-mount]"));
    var deadline = Date.now() + 900;
    function check() {
      var empty = mounts.some(function (mount) { return !mount.firstElementChild; });
      if (empty && Date.now() < deadline) { requestAnimationFrame(check); return; }
      // Two more frames: one for the last thing to mount to be laid out, one
      // for whatever it draws on its first pass to be on the canvas before
      // the canvas is photographed.
      requestAnimationFrame(function () { requestAnimationFrame(done); });
    }
    check();
  }

  function showPrintOverlay() {
    printOverlay = document.createElement("div");
    printOverlay.className = "print-overlay";
    printOverlay.innerHTML =
      '<p class="print-overlay-count">Laying out slides…</p>' +
      '<div class="print-overlay-bar"><span></span></div>' +
      '<p class="print-overlay-note">Your browser\'s print dialog will open when they are ready. Choose "Save as PDF", and leave the paper size on the one the page asks for.</p>';
    body.appendChild(printOverlay);
    return printOverlay;
  }

  function printProgress(label, done, total) {
    if (!printOverlay) return;
    printOverlay.querySelector(".print-overlay-count").textContent =
      label + " " + done + " / " + total;
    printOverlay.querySelector(".print-overlay-bar span").style.width =
      Math.round((done / total) * 100) + "%";
  }

  function hidePrintOverlay() {
    if (printOverlay && printOverlay.parentNode) printOverlay.parentNode.removeChild(printOverlay);
    printOverlay = null;
  }

  function removePrintDocument() {
    if (printRoot && printRoot.parentNode) printRoot.parentNode.removeChild(printRoot);
    printRoot = null;
  }

  function endExport() {
    clearTimeout(printSafety);
    body.classList.remove("presenter-printing");
    removePrintDocument();
    hidePrintOverlay();
    exporting = false;
  }

  function exportPresenterPDF() {
    if (exporting || !presenterActive || !presenterSlides.length) return;
    exporting = true;
    var total = presenterSlides.length;
    var openOn = presenterIndex;
    var captured = [];
    var i = 0;

    showPrintOverlay();
    printProgress("Laying out slides…", 0, total);
    removePrintDocument();
    printRoot = document.createElement("div");
    printRoot.id = "presenter-print";
    printRoot.appendChild(printThemeStyle());
    body.appendChild(printRoot);

    function capture() {
      if (i >= total) { assemble(); return; }
      var entry = presenterSlides[i];
      if (entry.live) {
        showPresenterSlide(i);
        whenSlideSettled(entry, function () {
          captured.push({ content: entry.printContent(), entry: entry });
          i++;
          printProgress("Laying out slides…", i, total);
          capture();
        });
        return;
      }
      // Nothing to wait for on a built slide, so take as many as fit in a
      // frame's worth of work and let the overlay keep up between batches.
      var deadline = Date.now() + 20;
      while (i < total && !presenterSlides[i].live && Date.now() < deadline) {
        captured.push({ content: presenterSlides[i].printContent(), entry: presenterSlides[i] });
        i++;
      }
      printProgress("Laying out slides…", i, total);
      setTimeout(capture, 0);
    }

    function assemble() {
      showPresenterSlide(openOn);
      var pages = captured.map(function (item) {
        var page = printPageFor(item.entry, item.content);
        printRoot.appendChild(page);
        return { page: page, maxScale: item.entry.maxScale || 1 };
      });
      var f = 0;
      function fitBatch() {
        var deadline = Date.now() + 20;
        while (f < pages.length && Date.now() < deadline) {
          fitPrintPage(pages[f].page, pages[f].maxScale);
          f++;
        }
        printProgress("Fitting pages…", f, total);
        if (f < pages.length) { setTimeout(fitBatch, 0); return; }
        flatten();
      }
      fitBatch();
    }

    // Runs after the fit, not before it: swapping each scene for a picture
    // of itself at the same size leaves every box on the page where the fit
    // put it, so there is nothing to measure again.
    function flatten() {
      var mounts = Array.prototype.slice.call(printRoot.querySelectorAll(".print-page [data-art]"));
      var r = 0;
      function next() {
        if (r >= mounts.length) { handOver(); return; }
        var mount = mounts[r];
        printProgress("Flattening artwork…", r, mounts.length);
        r++;
        rasterizeArt(mount.closest(".print-page"), mount, next);
      }
      next();
    }

    function handOver() {
      hidePrintOverlay();
      body.classList.add("presenter-printing");
      // One frame in the printing state before the dialog takes over, so it
      // is measuring the document it is about to render.
      requestAnimationFrame(function () {
        window.print();
        // The stack comes down when the dialog reports itself closed, not
        // when print() returns: print() blocks until then in every browser
        // that matters, but a browser where it did not would have its
        // document pulled out from under it mid-render. The timer is only
        // there so a browser that reports nothing at all cannot leave the
        // export stuck on and the button dead.
        printSafety = setTimeout(function () { if (exporting) endExport(); }, 30000);
      });
    }

    capture();
  }

  window.addEventListener("afterprint", function () {
    if (exporting) endExport();
  });
  // Safari has only had afterprint since 13, and the print media query
  // going quiet says the same thing in every browser that has either.
  if (window.matchMedia) {
    var printMedia = window.matchMedia("print");
    var printMediaChange = function (e) { if (!e.matches && exporting) endExport(); };
    if (printMedia.addEventListener) printMedia.addEventListener("change", printMediaChange);
    else if (printMedia.addListener) printMedia.addListener(printMediaChange);
  }

  if (presenterToggle) {
    presenterToggle.addEventListener("click", function () {
      if (exporting) return;
      if (presenterActive) exitPresenter(); else enterPresenter();
    });
    // An export drives the slides itself, one at a time, to get a look at
    // every widget — so while it is running the controls that would move
    // them out from under it are inert.
    presenterPrev.addEventListener("click", function () { if (!exporting) showPresenterSlide(presenterIndex - 1); });
    presenterNext.addEventListener("click", function () { if (!exporting) showPresenterSlide(presenterIndex + 1); });
    presenterExit.addEventListener("click", function () { if (!exporting) exitPresenter(); });
    presenterPDF.addEventListener("click", exportPresenterPDF);

    // A projector is a resize: plugging one in re-runs the fit rather than
    // leaving the slide scaled for the laptop screen it was measured on.
    var refitTimer = null;
    window.addEventListener("resize", function () {
      if (!presenterActive) return;
      clearTimeout(refitTimer);
      refitTimer = setTimeout(refitCurrentSlide, 120);
    });

    window.addEventListener("keydown", function (e) {
      if (!presenterActive || exporting) return;
      // Asking the browser to print a slide deck should get the slide deck,
      // not one fixed slide repeated across a hundred sheets of paper.
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        exportPresenterPDF();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
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
