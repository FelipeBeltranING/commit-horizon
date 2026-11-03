// Language planets orbiting the black hole on tilted ellipses.
// CSS only: an ellipse is two perpendicular sine motions (translateX / translateY)
// with a quarter-period offset. Each planet is drawn twice — once behind the
// shadow and once in front — and an opacity toggle decides which copy is visible,
// so planets really pass behind the hole on the far side of their orbit.

const f2 = (n) => Number(n.toFixed(2)).toString();
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SINE = 'cubic-bezier(.37,0,.63,1)'; // easeInOutSine ≈ half a sine wave

const SHORT = {
  JavaScript: 'JS', TypeScript: 'TS', Python: 'Py', Java: 'Jv', 'C++': 'C++', C: 'C', 'C#': 'C#',
  GDScript: 'GD', 'Jupyter Notebook': 'Ju', Shell: 'sh', HTML: '<>', CSS: '{}', Kotlin: 'Kt',
  Rust: 'Rs', Ruby: 'Rb', Swift: 'Sw', Dart: 'Dt', Haskell: 'Hs', Elixir: 'Ex', Dockerfile: 'Dk',
};

// Logos that are (mostly) black/navy and would vanish on a dark planet.
const LIGHT_CORE = new Set(['Rust', 'Shell', 'Lua', 'Assembly', 'Zig']);

function initials(name) {
  if (SHORT[name]) return SHORT[name];
  const clean = name.replace(/[^A-Za-z0-9+#]/g, ' ').trim();
  const parts = clean.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toUpperCase();
}

function label(lang, y, T) {
  return `<text y="${f2(y)}" text-anchor="middle" font-size="9" fill="${T.muted}" letter-spacing=".5">${esc(lang.name)} ${Math.round(lang.share * 100)}%</text>`;
}

// The logo sits inside a small glowing planet.
function planetBody(lang, s, i, T, showLabel) {
  const glow = `<circle r="${f2(s * 2.1)}" fill="url(#pg${i})"/>`;
  let core;
  if (lang.icon) {
    const k = s * 1.18; // logo size inside the planet
    core =
      `<circle r="${f2(s)}" fill="${LIGHT_CORE.has(lang.name) ? '#e6ebf5' : '#0b0f1a'}" stroke="${lang.color}" stroke-opacity=".9" stroke-width="1.3"/>` +
      `<svg x="${f2(-k / 2)}" y="${f2(-k / 2)}" width="${f2(k)}" height="${f2(k)}" viewBox="${esc(lang.icon.viewBox)}" overflow="visible">${lang.icon.body}</svg>`;
  } else {
    core =
      `<circle r="${f2(s)}" fill="url(#pf${i})" stroke="${lang.color}" stroke-width="1"/>` +
      `<text y="${f2(s * 0.33)}" text-anchor="middle" font-size="${f2(s * (initials(lang.name).length > 2 ? 0.72 : 0.9))}" font-weight="700" fill="#fff" fill-opacity=".92">${esc(initials(lang.name))}</text>`;
  }
  const shade = `<circle r="${f2(s)}" fill="url(#shade)"/>`;
  return glow + core + shade + (showLabel ? label(lang, s + 12, T) : '');
}

/**
 * @param {{name:string,share:number,color:string,icon:{viewBox:string,body:string}|null}[]} languages
 */
export function renderPlanets(languages, { RS, R_OUT, TILT, CX, CY, T, rnd, labels = true }) {
  if (!languages?.length) return { css: '', defs: '', back: '', front: '' };
  const n = languages.length;
  const maxShare = Math.max(...languages.map((l) => l.share));
  const R1 = RS * 2.55;
  const R2 = R_OUT * 0.9;

  let css =
    `.pv{animation:pv linear infinite}.bk{animation:bk linear infinite}` +
    `@keyframes pv{0%,49.6%{opacity:1}50%,99.6%{opacity:0}100%{opacity:1}}` +
    `@keyframes bk{0%,49.6%{opacity:0}50%,99.6%{opacity:1}100%{opacity:0}}`;
  let defs = `<radialGradient id="shade" cx="35%" cy="30%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>`;
  let back = '';
  let front = '';

  languages.forEach((lang, i) => {
    const r = n === 1 ? (R1 + R2) / 2 : R1 + ((R2 - R1) * i) / (n - 1); // most used = closest
    const a = r;
    const b = r * Math.max(TILT, 0.27); // a bit more inclined than the disk so orbits read as ellipses
    const s = 9 + 12 * Math.sqrt(lang.share / maxShare);
    const period = 16 * Math.pow(r / R1, 1.5); // Kepler again
    const phase = rnd() * period;
    const dx = -phase;
    const dy = -(phase + 0.75 * period);

    css +=
      `@keyframes x${i}{0%,100%{transform:translateX(${f2(a)}px)}50%{transform:translateX(${f2(-a)}px)}}` +
      `@keyframes y${i}{0%,100%{transform:translateY(${f2(b)}px) scale(1.14)}50%{transform:translateY(${f2(-b)}px) scale(.84)}}` +
      // x = a·cos, y = b·sin (y's delay is shifted by 3/4 of a period). y > 0 is the near side.
      `.x${i}{animation:x${i} ${f2(period)}s ${SINE} ${f2(dx)}s infinite}` +
      `.y${i}{animation:y${i} ${f2(period)}s ${SINE} ${f2(dy)}s infinite}`;

    defs +=
      `<radialGradient id="pg${i}"><stop offset=".35" stop-color="${lang.color}" stop-opacity=".45"/><stop offset="1" stop-color="${lang.color}" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="pf${i}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".4" stop-color="${lang.color}"/><stop offset="1" stop-color="#05070d"/></radialGradient>`;

    const body = planetBody(lang, s, i, T, labels);
    const vis = `style="animation-duration:${f2(period)}s;animation-delay:${f2(dx)}s"`;
    const wrap = (cls) =>
      `<g transform="translate(${CX} ${CY})"><g class="x${i}"><g class="y${i}"><g class="${cls}" ${vis}>${body}</g></g></g></g>`;
    back += wrap('bk').replace(body, `<g opacity=".72">${body}</g>`);
    front += wrap('pv');
  });

  return { css, defs, back, front };
}
