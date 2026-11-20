# 🕳️ Commit Horizon

**Your GitHub year, spiraling into a black hole.**

[![Tests](https://github.com/FelipeBeltranING/commit-horizon/actions/workflows/test.yml/badge.svg)](https://github.com/FelipeBeltranING/commit-horizon/actions/workflows/test.yml)

An animated SVG for your profile README. Every day of the last year is a particle of
light orbiting in the accretion disk: old days drift on the cold outer edge, recent
days race near the event horizon, and **today** is right at the edge, about to cross.

![Commit Horizon](out/commit-horizon-color.svg)

## How the data maps to space

| GitHub | Space |
| --- | --- |
| Contributions per day | Size and brightness of each particle |
| Week of the year | Orbit radius (old outside, recent inside) |
| Days with no contributions | Faint dust / dark gaps |
| Yearly total | Mass of the black hole (shadow size) |
| Best day | A pulsing flare on its orbit |
| Current streak | Brightness of the photon ring (dims if broken) |
| Last 30 days | Brightness of the lensed halo |
| Public repos | Number of background stars |

The physics is "pretty", not exact: Keplerian rotation (period ∝ r^1.5), Doppler
beaming (the side coming towards you is brighter), gravitational lensing (the back of
the disk bends over and under the shadow) and a temperature gradient (white-hot inside,
red outside).

## Try it

Requires Node 18+. No required dependencies (devicon is optional, only for logos).

```bash
npm run demo        # out/commit-horizon-{color,bw,languages}.svg + out/preview.html
npm run preview     # live preview at http://localhost:4321 (re-renders on every refresh)
npm test
```

Real user:

```bash
node bin/commit-horizon.js --user FelipeBeltranING --theme color --out out/me.svg
node bin/commit-horizon.js --user FelipeBeltranING --theme bw    --out out/me-bw.svg
```

Set `GITHUB_TOKEN` to use the GraphQL API; without it the public contributions page is read.

## Languages in orbit

`--mode languages` keeps the black hole and puts your top languages in orbit around
it — just their official logos, floating and gently swaying (`--style planets` puts
each logo inside a small glowing planet instead):

- the language you use most orbits closest; the rest go outwards in order;
- logo size = share of bytes across your own (non-fork) repos;
- orbits are Keplerian too, and logos really pass **behind** the shadow on the far side.

```bash
npm install                     # pulls devicon (the logos), optional
node bin/commit-horizon.js --user FelipeBeltranING --mode languages --out out/me-langs.svg
node bin/commit-horizon.js --user FelipeBeltranING --mode languages --exclude "HTML,CSS" --langs 5
```

Where the logos come from, in order:

1. `icons/<language>.svg` or `icons/<language>.png` in this repo (e.g. `icons/python.png`, `icons/cplusplus.svg`) — your own files win;
2. the `devicon` package (`npm install`).

If neither has it, the language shows short initials (Py, JS, GD…) in its GitHub color.
Logos are trademarks of their respective owners and come from
[devicon](https://github.com/devicons/devicon); they're used only to say "this is a
language I use".

## Themes

- `color` — temperature gradient, white-blue core to red outer disk.
- `bw` — black and white, *Interstellar* style.

## Contributing

PRs are very welcome, especially new celestial bodies (moons, comets, pulsars…: SVG + CSS keyframes).
Read the [contributing guide](CONTRIBUTING.md) and check the issues labelled
[`good first issue`](../../labels/good%20first%20issue).

## Roadmap

The [issues](../../issues) and [milestones](../../milestones) are the roadmap:
**v0.3 · Launch pad** (GitHub Action, web generator, video), **v0.4 · Celestial events**
(moons, comets, supernova, pulsar) and **v0.5 · New universes** (galaxy, solar system, binary holes).

## License

MIT © David Felipe Beltrán Tabares
