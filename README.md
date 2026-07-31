# Year2525

**year2525.xyz** — a fictional future history (and deep archive) of applications.

Inspired by Zager & Evans' *In the Year 2525*, this is a static, single-page museum you walk in one continuous scroll.

It runs **forward** first, through the invented future of software — from today's apps, through Mandates, Cultivars, Foldings, Chorales, Tilth, Liturgies, Weathers and Resonances, to a curator's note written in the year 12,525. That note is the hinge. Past it the gallery turns around and walks **back** down the real record — modern web, skeuomorphism, Windows, the ZX Spectrum, System 7, DOS, the 1980s underground, mainframes, punch cards, Jacquard looms, Babbage, the abacus, clay tablets, knotted rope, memory palaces, language, fire, and pre-symbolic cognition.

Thirty-three exhibits, twenty-eight of them interactive. Nothing is hidden behind a mode: the year counter in the header is a readout, not a control, and it reports whatever room you are standing in — 2026 up to 12,525, then all the way back to before anyone had a word for any of it.

## Stack

Plain HTML, CSS, and vanilla JavaScript. No build step, no framework, no dependencies — deployable as-is on GitHub Pages (see `.github/workflows/pages.yml`).

A `CNAME` file pointing at `year2525.xyz` is included. GitHub Pages will serve the default `<owner>.github.io/<repo>` URL regardless; the custom domain only resolves once its DNS is pointed at GitHub Pages and the domain is added under repo Settings → Pages. Delete `CNAME` if the custom domain isn't wanted yet.

## Local preview

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

- `index.html` — every exhibit, in one `<main>`, in scroll order
- `css/style.css` — base layout plus a distinct visual theme per era
- `js/main.js` — scroll-driven era theming, the year readout, dot nav, typed easter eggs
- `js/widgets.js` — the per-era interactive experiences (canvas + DOM), lazily initialized
