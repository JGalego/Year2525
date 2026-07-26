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
  yearCounter.addEventListener("click", toggleMode);

  // Discovery path 2: the Konami code, from anywhere on the page.
  var KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  var konamiProgress = 0;
  window.addEventListener("keydown", function (e) {
    var expected = KONAMI[konamiProgress];
    if (e.key === expected) {
      konamiProgress++;
      if (konamiProgress === KONAMI.length) {
        konamiProgress = 0;
        toggleMode();
      }
    } else {
      konamiProgress = (e.key === KONAMI[0]) ? 1 : 0;
    }
  });

  // Escape always returns to the future.
  window.addEventListener("keydown", function (e) {
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

})();
