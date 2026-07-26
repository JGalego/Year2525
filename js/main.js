(function () {
  "use strict";

  var body = document.body;
  var forwardMain = document.getElementById("forward-timeline");
  var pastMain = document.getElementById("past-timeline");
  var yearCounter = document.getElementById("year-counter");
  var dotnav = document.getElementById("dotnav");

  var YEAR_BY_ERA = {
    present: "2026", "2525": "2525", "3535": "3535", "4545": "4545",
    "5555": "5555", "6565": "6565", "7510": "7510", "8525": "8525",
    "9595": "9595", beyond: "12,525"
  };

  // ---------------------------------------------------------------
  // Mode switching: Forward Timeline <-> Past Lightcone
  // ---------------------------------------------------------------

  function enterPast() {
    if (body.dataset.mode === "past") return;
    body.dataset.mode = "past";
    forwardMain.setAttribute("hidden", "");
    pastMain.removeAttribute("hidden");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    yearCounter.classList.remove("armed");
    yearCounter.setAttribute("aria-label", "You are in the Past Lightcone. Click to return to the future.");
    var firstDate = pastMain.querySelector(".past .past-date");
    yearCounter.textContent = firstDate ? firstDate.textContent : "?";
  }

  function enterForward() {
    if (body.dataset.mode === "forward") return;
    body.dataset.mode = "forward";
    pastMain.setAttribute("hidden", "");
    forwardMain.removeAttribute("hidden");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    yearCounter.setAttribute("aria-label", "Current year in the timeline. This number has been known to do strange things.");
    yearCounter.textContent = YEAR_BY_ERA.present;
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

  // A thin trigger line at the vertical center of the viewport, rather than
  // "50% of the section is visible" — the latter never fires for any
  // section taller than twice the viewport, which most eras here are.
  var CENTERLINE = { threshold: 0, rootMargin: "-50% 0px -50% 0px" };

  if ("IntersectionObserver" in window) {
    var forwardObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var era = entry.target.getAttribute("data-era");
          body.dataset.era = era;
          if (body.dataset.mode !== "past") {
            yearCounter.textContent = YEAR_BY_ERA[era] || yearCounter.textContent;
          }
          setActiveDot(entry.target.id);
        }
      });
    }, CENTERLINE);
    eraSections.forEach(function (s) { forwardObserver.observe(s); });

    var pastSections = Array.prototype.slice.call(document.querySelectorAll("#past-timeline .past"));
    var pastObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          body.dataset.past = entry.target.getAttribute("data-past");
          if (body.dataset.mode === "past") {
            var dateEl = entry.target.querySelector(".past-date");
            yearCounter.textContent = dateEl ? dateEl.textContent : "?";
          }
        }
      });
    }, CENTERLINE);
    pastSections.forEach(function (s) { pastObserver.observe(s); });
  }

  // ---------------------------------------------------------------
  // Presenter Mode — a linear walkthrough: the future timeline, then
  // the past lightcone, one full-screen slide at a time.
  // ---------------------------------------------------------------

  var presenterToggle = document.getElementById("presenter-toggle");
  var presenterControls = document.getElementById("presenter-controls");
  var presenterPrev = document.getElementById("presenter-prev");
  var presenterNext = document.getElementById("presenter-next");
  var presenterExit = document.getElementById("presenter-exit");
  var presenterCounter = document.getElementById("presenter-counter");

  var presenterSlides = [];
  var presenterIndex = 0;
  var presenterActive = false;
  var presenterReturnMode = "forward";

  function buildPresenterSlides() {
    var forwardSlides = Array.prototype.slice.call(document.querySelectorAll("#forward-timeline > .era"));
    var pastIntro = document.querySelector("#past-timeline > .past-intro");
    var pastSlides = Array.prototype.slice.call(document.querySelectorAll("#past-timeline > .past"));
    return forwardSlides.concat(pastIntro ? [pastIntro] : []).concat(pastSlides);
  }

  function showPresenterSlide(index) {
    if (!presenterSlides.length) return;
    index = Math.max(0, Math.min(index, presenterSlides.length - 1));
    presenterSlides.forEach(function (s) { s.classList.remove("presenter-current"); });
    presenterIndex = index;
    var slide = presenterSlides[presenterIndex];
    slide.classList.add("presenter-current");
    slide.scrollTop = 0;

    var era = slide.getAttribute("data-era");
    var past = slide.getAttribute("data-past");
    if (era) {
      body.dataset.era = era;
      delete body.dataset.past;
      yearCounter.textContent = YEAR_BY_ERA[era] || yearCounter.textContent;
      setActiveDot(slide.id);
    } else if (past) {
      body.dataset.past = past;
      delete body.dataset.era;
      var dateEl = slide.querySelector(".past-date");
      yearCounter.textContent = dateEl ? dateEl.textContent : yearCounter.textContent;
    } else {
      // the Past Lightcone intro slide — no theme of its own, borrow the next one's date
      delete body.dataset.past;
      var next = presenterSlides[presenterIndex + 1];
      var nextDate = next ? next.querySelector(".past-date") : null;
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

    var startIndex = 0;
    presenterSlides.forEach(function (s, i) {
      if (presenterReturnMode === "forward" && s.getAttribute("data-era") === currentEra) startIndex = i;
      if (presenterReturnMode === "past" && s.getAttribute("data-past") === currentPast) startIndex = i;
    });
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
    presenterSlides.forEach(function (s) { s.classList.remove("presenter-current"); });

    var goingPast = slide && (slide.classList.contains("past") || slide.classList.contains("past-intro"));
    if (goingPast) {
      body.dataset.mode = "past";
      forwardMain.setAttribute("hidden", "");
      pastMain.removeAttribute("hidden");
    } else {
      body.dataset.mode = "forward";
      pastMain.setAttribute("hidden", "");
      forwardMain.removeAttribute("hidden");
    }
    if (slide) {
      requestAnimationFrame(function () {
        slide.scrollIntoView({ behavior: "instant" in window ? "instant" : "auto" });
      });
    }
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
