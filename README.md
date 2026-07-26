# Year2525

**year2525.xyz** — a fictional future history (and deep archive) of applications.

Inspired by Zager & Evans' *In the Year 2525*, this is a static, single-page museum that scrolls forward through the invented future of software — from today's apps, through Mandates, Cultivars, Foldings, Chorales, Tilth, Liturgies, Weathers, and Resonances, to a closing curator's note from the year 12,525.

There is a hidden way to go the other direction instead: a **Deep Archive**, regressing through the real history of computation and media — modern web, skeuomorphism, Windows, the ZX Spectrum, System 7, DOS, green-phosphor terminals, mainframes, punch cards, Jacquard looms, Babbage, the abacus, clay tablets, knotted rope, memory palaces, language, fire, and pre-symbolic cognition. Find the year counter near the top of the page. Or try the Konami code.

## Stack

Plain HTML, CSS, and vanilla JavaScript. No build step, no framework, no dependencies — deployable as-is on GitHub Pages (see `.github/workflows/pages.yml`).

A `CNAME` file pointing at `year2525.xyz` is included. GitHub Pages will serve the default `<owner>.github.io/<repo>` URL regardless; the custom domain only resolves once its DNS is pointed at GitHub Pages and the domain is added under repo Settings → Pages. Delete `CNAME` if the custom domain isn't wanted yet.

## Local preview

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

- `index.html` — all forward-timeline and past-lightcone content
- `css/style.css` — base layout plus a distinct visual theme per era
- `js/main.js` — scroll-driven era theming, the easter-egg mode toggle, Konami code
- `js/widgets.js` — the per-era interactive experiences (canvas + DOM), lazily initialized
