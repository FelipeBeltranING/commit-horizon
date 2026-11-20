<div align="center">

# 🕳️ Commit Horizon

**Your GitHub year, spiraling into a black hole.**
Every day of the last year is a particle of light in the accretion disk: old days drift on
the cold outer edge, recent days race near the event horizon, and **today** is right at the
edge, about to cross.

<img src="examples/commit-horizon-color.svg" alt="Commit Horizon: a black hole whose accretion disk is made of a year of GitHub contributions" width="100%">

[![Tests](https://github.com/FelipeBeltranING/commit-horizon/actions/workflows/test.yml/badge.svg)](https://github.com/FelipeBeltranING/commit-horizon/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-ffb45e)](LICENSE)
[![Node 18+](https://img.shields.io/badge/node-18%2B-3d72bd)](package.json)
[![No runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-0e8a16)](package.json)

**[🚀 Use the GitHub Action](#put-a-black-hole-in-your-readme-2-minutes)** · **[🌐 Web generator](#web-generator)** · **[🎞️ Share it as a video](#share-it-as-a-video)** · **[🔭 Run it locally](#run-it-locally)** · **[🪐 Languages in orbit](#languages-in-orbit)** · **[🗺️ Roadmap](#roadmap)** · **[🤝 Contribute](CONTRIBUTING.md)**

</div>

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

## Languages in orbit

<img src="examples/commit-horizon-languages.svg" alt="Commit Horizon in languages mode: language logos orbiting the black hole" width="100%">

`--mode languages` keeps the black hole and puts your top languages in orbit around
it — just their official logos, floating and gently swaying (`--style planets` puts
each logo inside a small glowing planet instead):

- the language you use most orbits closest; the rest go outwards in order;
- logo size = share of bytes across your own (non-fork) repos;
- orbits are Keplerian too, and logos really pass **behind** the shadow on the far side.

Where the logos come from, in order:

1. `icons/<language>.svg` or `icons/<language>.png` in this repo (e.g. `icons/python.png`, `icons/cplusplus.svg`) — your own files win;
2. `icons/devicon/`: copies of the devicon logos for every language we map (74 KB instead of the 139 MB package), so nothing needs installing;
3. the `devicon` package, if you `npm install` it.

If neither has it, the language shows short initials (Py, JS, GD…) in its GitHub color.
Logos are trademarks of their respective owners and come from
[devicon](https://github.com/devicons/devicon); they're used only to say "this is a
language I use".

## Themes

| `color` (default) | `bw` |
| --- | --- |
| Temperature gradient, white-blue core to red outer disk | Black and white, *Interstellar* style |
| <img src="examples/commit-horizon-color.svg" alt="color theme" width="100%"> | <img src="examples/commit-horizon-bw.svg" alt="black and white theme" width="100%"> |

## Put a black hole in your README (2 minutes)

**1.** In your profile repo (`your-username/your-username`), create `.github/workflows/commit-horizon.yml`
(or copy [`examples/commit-horizon.yml`](examples/commit-horizon.yml)):

```yaml
name: Commit Horizon

on:
  schedule:
    - cron: "23 4 * * *" # every day
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  black-hole:
    runs-on: ubuntu-latest
    steps:
      - uses: FelipeBeltranING/commit-horizon@v0
        with:
          github_user_name: ${{ github.repository_owner }}
          output: dist/commit-horizon.svg
          timezone: America/Bogota   # your IANA time zone, so your streak follows your day
          # mode: languages          # put your top languages in orbit
          # theme: bw                # black and white, Interstellar style
          # background: transparent  # float on your README instead of a dark card

      - uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**2.** Run it once from the **Actions** tab (or wait for the daily run).

**3.** Add this to your `README.md`:

```md
![My black hole](https://raw.githubusercontent.com/your-username/your-username/output/commit-horizon.svg)
```

That's it: your year falls a little further in every day. The job summary shows your total, streaks
and best day, and the step outputs `svg`, `total` and `streak` for anything else you want to do.

### Inputs

| Input | Default | Description |
| --- | --- | --- |
| `github_user_name` | repo owner | Whose year falls into the hole |
| `github_token` | `github.token` | Used for the GraphQL API (exact counts and bytes per language) |
| `output` | `dist/commit-horizon.svg` | Where the SVG is written |
| `theme` | `color` | `color` or `bw` |
| `background` | `space` | `space` or `transparent` |
| `mode` | `disk` | `disk` or `languages` |
| `style` | `logos` | `logos` or `planets` (languages mode) |
| `langs` | `6` | Languages in orbit, 1–8 |
| `exclude` | | Languages to leave out, e.g. `HTML,CSS` |
| `labels` | `true` | Show `Python 24%` under each logo |
| `timezone` | `UTC` | Your IANA time zone; runners use UTC, so set it or your streak may break at night |
| `demo` | `false` | Fake data, for previews |

### Live example

The author's black hole, regenerated every day by this repo's own workflow
([`black-hole.yml`](.github/workflows/black-hole.yml)) with `uses: ./`:

<img src="https://raw.githubusercontent.com/FelipeBeltranING/commit-horizon/output/commit-horizon-languages.svg" alt="FelipeBeltranING's black hole with languages in orbit, regenerated daily" width="100%">

## Web generator

No workflow at all: type a username, pick mode, theme and background, watch it live and copy one line.
Options live in the URL, so a link shows exactly what you picked, and the page speaks English and Spanish.

```md
![My GitHub year as a black hole](https://<your-deployment>/api/hole?user=your-username&mode=languages&tz=America/Bogota)
```

Query parameters: `user`, `mode`, `theme`, `bg` (`space`/`transparent`), `style`, `langs`, `exclude`,
`labels`, `tz` and `demo=1`. Images are cached at the edge for 4 hours and served stale while they refresh.

**Deploy your own** (free on Vercel): [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFelipeBeltranING%2Fcommit-horizon&env=GITHUB_TOKEN&envDescription=Optional%3A%20a%20read-only%20token%20for%20exact%20counts%20and%20higher%20limits)
Optionally add a `GITHUB_TOKEN` environment variable (any read-only token) for exact counts and higher
limits. Locally: `npm run dev` → <http://localhost:3000>.

## Run it locally

Requires Node 18+, no dependencies.

```bash
git clone https://github.com/FelipeBeltranING/commit-horizon.git && cd commit-horizon
node bin/commit-horizon.js --user your-username --out out/me.svg
node bin/commit-horizon.js --user your-username --mode languages --out out/me-langs.svg
npm run preview     # live preview at http://localhost:4321/?user=your-username
npm run demo        # regenerate examples/*.svg (fake data, no network)
npm test
```

## Share it as a video

SVGs don't play on Reddit, X or Discord, so you can record your black hole:

```bash
npm install                                          # once: Playwright (dev dependency)
node tools/record.mjs out/me.svg --out me.webm       # nothing else needed
node tools/record.mjs out/me.svg --out me.mp4        # or .gif: needs ffmpeg on your PATH
node tools/record.mjs out/me.svg --out me.png        # a sharp still frame (2×), for a social preview
```

Options: `--seconds 12`, `--width 840`, `--fps 30`, `--background "#0d1117"`. It uses Playwright's
Chromium if you installed it (`npx playwright install chromium`), otherwise your Chrome or Edge.

## CLI options

| Flag | Default | Description |
| --- | --- | --- |
| `--user`, `-u` | | Whose year falls into the hole |
| `--demo` | | Fake but believable data, no network |
| `--theme`, `-t` | `color` | `color` or `bw` |
| `--background`, `-b` | `space` | `space` (dark card) or `transparent` (floats on your README, labels in gray) |
| `--mode`, `-m` | `disk` | `disk`, or `languages` to put your top languages in orbit |
| `--style` | `logos` | `logos` (floating logos) or `planets` (logos inside planets) |
| `--langs` | `6` | How many languages in orbit (1–8) |
| `--exclude` | | Languages to leave out, e.g. `"HTML,CSS"` |
| `--no-labels` | | Hide the `Python 24%` labels under the logos |
| `--timezone`, `-z` | this machine's | Your IANA time zone, e.g. `America/Bogota` |
| `--out`, `-o` | `out/commit-horizon.svg` | Where the SVG is written |

**`GITHUB_TOKEN`** (optional): with a token, the GraphQL API gives exact contributions and exact
bytes per language. Without one, the public contributions page is read and languages are
approximated from each repo's main language (1 request, so you stay under the 60/hour limit).

**Time zones:** "today" is your local day. GitHub's public calendar is in UTC, so without this
your streak would break every evening west of UTC. The CLI uses your machine's zone; in the
Action, set the `timezone` input.

## How it works

The SVG is self-contained and animated with CSS keyframes only (no JavaScript), so it renders
inside GitHub READMEs:

- **The disk** is one rotating `<g>` per week (53 groups instead of 365 animated elements),
  each with its own Keplerian period, squashed with `scale(1 0.18)` so you see it tilted.
- **The lensing** is two arcs over and under the shadow with a radial gradient, plus dashed
  streams spinning inside them; the upper half of the shadow is drawn again after the disk so
  it hides the back.
- **The orbits** of the languages are two perpendicular sine motions (`translateX` and
  `translateY` a quarter period apart). Each logo is drawn twice, behind and in front of the
  shadow, and an opacity toggle shows the right copy for each half of the orbit.
- **Deterministic:** randomness comes from `mulberry32(hash(user|date))`, so the same user on
  the same day gets the same SVG.
- **Small:** ~50 KB for the disk, ~90 KB with the languages, always under 300 KB.

## Contributing

PRs are very welcome, especially new celestial bodies (moons, comets, pulsars…: SVG + CSS
keyframes). Read the [contributing guide](CONTRIBUTING.md) and check the issues labelled
[`good first issue`](../../labels/good%20first%20issue) or
[`celestial-body`](../../labels/celestial-body).

```bash
npm test        # node:test, no dependencies
npm run preview # edit src/render.js, refresh, repeat
```

## Roadmap

The [issues](../../issues) and [milestones](../../milestones) are the roadmap:

| Milestone | What's coming |
| --- | --- |
| [v0.3 · Launch pad](../../milestone/2) | 🚀 GitHub Action + Marketplace · 🌐 web generator · 🎞️ MP4/GIF export · 📏 calibrated disk for quieter years |
| [v0.4 · Celestial events](../../milestone/3) | 🌙 moons for streaks · ☄️ comets for merged PRs · 💥 supernova on your best day · 📡 pulsar for night owls · 🛰️ Voyager probe |
| [v0.5 · New universes](../../milestone/4) | 🌌 galaxy mode · ☀️ solar system mode · 🕳️🕳️ two black holes merging |

## License

MIT © David Felipe Beltrán Tabares
