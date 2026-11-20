# Contributing to Commit Horizon 🕳️

Thanks for wanting to add something to the sky! The most fun way to contribute is a
**new celestial body**: a moon, a comet, a pulsar, a probe… It's mostly SVG shapes and
CSS keyframes, with very little JavaScript.

## Setup

You only need Node 18+. There are no required dependencies (`devicon` is optional and only
brings the language logos).

```bash
git clone https://github.com/FelipeBeltranING/commit-horizon.git
cd commit-horizon
npm install                  # optional: devicon logos for --mode languages
npm test                     # run the tests
npm run demo                 # regenerate the example SVGs
npm run preview              # live preview on http://localhost:4321
node bin/commit-horizon.js --help
```

`npm run preview` re-imports `src/` on every refresh: edit `src/render.js`, reload the page,
and you see the change. Add `?user=your-username` for real data (set `GITHUB_TOKEN` if you
hit the 60 requests/hour limit).

## How the pieces fit

| File | What it does |
| --- | --- |
| `src/build.js` | The shared pipeline: validate options, fetch the data, render (used by the CLI, the Action and the web) |
| `src/action.js` / `action.yml` | The GitHub Action |
| `src/github.js` | Contribution calendar (GraphQL with a token, the public page without one) |
| `src/stats.js` | Weeks, streaks, best day, the p95 scale, the user's local "today" |
| `src/render.js` | The whole SVG: stars, disk, lensing, shadow, labels |
| `src/planets.js` | Elliptical orbits that pass behind the hole (languages mode) |
| `src/languages.js` / `src/icons.js` | Top languages and their logos |
| `src/prng.js` | Deterministic randomness (`mulberry32(hashString(user\|date))`) |

## Add a celestial body 🌙

1. **Decide what data drives it** and compute it in `src/stats.js` (or `src/github.js` if it
   needs new data). Add a test in `test/render.test.js` for the rule, e.g. "one moon per 7
   days of current streak".
2. **Draw it** in `src/render.js`. Pick its position and phase with the `rnd()` that's already
   seeded, never `Math.random()`.
3. **Animate it with CSS only.** Look at how things already move:
   - `@keyframes spin` rotates a whole `<g>` (the disk rings, the lensing streams).
   - `src/planets.js` makes an ellipse from two sine motions (`translateX` and `translateY`
     with a quarter-period offset) and draws each body **twice**, behind and in front of the
     shadow, with an opacity toggle. Reuse that if your body orbits the hole.
4. **Check the layers.** The order in the SVG is: background → stars → far side of the orbits
   → lensed light → shadow → photon ring → disk → upper half of the shadow → near side of the
   orbits → labels. Put your body where it belongs physically.
5. Preview it with `npm run preview` (demo and a real user) and run `npm test`.

## Add a language logo 🔤

Logos come from [devicon](https://github.com/devicons/devicon). Add the GitHub language name
and its devicon folder to `DEVICON_SLUGS` in `src/icons.js`, and its GitHub color to
`LINGUIST_COLORS` in `src/languages.js`. Prefer a different version of a logo? Drop it in
`icons/<slug>.svg` or `icons/<slug>.png`: local files win over devicon.

Logos are trademarks of their owners. Don't redraw them by hand; use the official files.

## Rules of the SVG

- **No JavaScript.** GitHub strips scripts from images, so everything is CSS `@keyframes`.
- **No external resources.** Images go in as `data:` URIs (see `pngIcon` in `src/icons.js`).
- **Deterministic.** Same user + same day = same SVG. Use `rnd()`.
- **Mind the size.** The SVG is downloaded on every profile view: keep it under 300 KB.
  `npm test` checks the demo in both modes.
- **One blur filter per layer**, not per particle: filters are the expensive part.
- **`transform` property vs. attribute.** In SVG, a CSS `transform` replaces the
  `transform="…"` attribute. Never put both on the same element: wrap it in a `<g>`.

## Code style

Plain modern JavaScript (ES modules), 2 spaces, single quotes. Keep functions small and add a
test in `test/` for any logic you add. Code, comments and the README are in English.

## Before you open a PR ✅

- [ ] `npm test` passes.
- [ ] You previewed it with `npm run preview` (demo **and** a real user, both themes).
- [ ] It still looks right standing still (Chrome DevTools → **Rendering** → *Emulate CSS
      media feature prefers-reduced-motion* → `reduce`).
- [ ] The PR has a screenshot or a short recording and links its issue (`Closes #16`).

## What to work on

The [issues](https://github.com/FelipeBeltranING/commit-horizon/issues) are the roadmap, grouped
in [milestones](https://github.com/FelipeBeltranING/commit-horizon/milestones). Pick one by label:

| Label | What you'll do |
| --- | --- |
| [`good first issue`](https://github.com/FelipeBeltranING/commit-horizon/labels/good%20first%20issue) | Small and well described. Perfect for a first PR. |
| [`celestial-body`](https://github.com/FelipeBeltranING/commit-horizon/labels/celestial-body) | A new object in the sky: SVG shapes and CSS keyframes. |
| [`languages`](https://github.com/FelipeBeltranING/commit-horizon/labels/languages) | Logos and languages in orbit. |
| [`physics`](https://github.com/FelipeBeltranING/commit-horizon/labels/physics) | Make the space look more real (or prettier). |
| [`help wanted`](https://github.com/FelipeBeltranING/commit-horizon/labels/help%20wanted) | Bigger features. |

Comment on the issue before you start, so nobody duplicates work.

### More ideas up for grabs

These don't have an issue yet. Open one to claim it, or to propose your own:

- 🌠 **Shooting stars** on days with more than 3× your average.
- 🪐 **Saturn-style rings** around the language you use most.
- 🌫️ **A nebula theme** (`--theme nebula`): purple and teal instead of the temperature gradient.
- ⭐ **Stars that remember**: the background stars placed by your repo creation dates.
- 🌍 **The labels in your language**: once #27 lands, add a block to `TEXTS`.
