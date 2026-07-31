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
        var hinge = document.getElementById("archive");
        if (hinge) hinge.scrollIntoView({ behavior: "smooth", block: "start" });
        showSecret("The other wing is not hidden any more. It is simply further down.");
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

})();
