// Renders the black hole as a self-contained animated SVG.
// No JavaScript inside the SVG (GitHub strips it): only CSS keyframes.
import { hashString, mulberry32 } from './prng.js';
import { computeStats } from './stats.js';

const W = 840;
const H = 440;
const CX = 420;
const CY = 205;
const TILT = 0.18; // vertical squash of the disk = how inclined we see it

const THEMES = {
  color: {
    bg: '#03040a',
    bgGlow: '#0d1428',
    star: '#dfe8ff',
    temp: [
      [0, '#eef5ff'],
      [0.1, '#fff7e8'],
      [0.32, '#ffd28c'],
      [0.62, '#ff8f3d'],
      [1, '#c9411c'],
    ],
    hot: '#fff3dc',
    warm: '#ffb45e',
    ring: '#fff6e6',
    text: '#e9edf6',
    muted: '#7f889c',
    accent: '#ffb45e',
  },
};

export const THEME_NAMES = Object.keys(THEMES);

const f2 = (n) => Number(n.toFixed(2)).toString();
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function hex(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
}
function lerpColor(stops, t) {
  t = clamp(t, 0, 1);
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    const [t0, c0] = stops[i - 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0 || 1);
      const a = hex(c0);
      const b = hex(c1);
      return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * u).toString(16).padStart(2, '0')).join('');
    }
  }
  return stops[stops.length - 1][1];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (d) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

/**
 * @param {{ user: string, weeks: {date:string,count:number}[][], repos?: number }} data
 * @param {{ theme?: 'color' }} [opts]
 */
export function renderSVG(data, opts = {}) {
  const theme = THEMES[opts.theme] ? opts.theme : 'color';
  const T = THEMES[theme];
  const weeks = data.weeks.slice(-53).filter((w) => w.length);
  const stats = computeStats(weeks);
  const rnd = mulberry32(hashString(`${data.user}|${stats.today}`));

  // Mass of the hole grows (gently) with the year's total.
  const mass = clamp(Math.log10(stats.total + 10) / 3.4, 0.35, 1);
  const RS = 34 + 14 * mass; // shadow radius
  const R_IN = RS * 1.6; // innermost orbit = today
  const R_OUT = 392; // outermost orbit = a year ago
  const nW = weeks.length;
  const spanW = Math.max(1, nW - 1);
  // Orbit radius for a (fractional) week index: old weeks outside, recent inside.
  const orbit = (w) => R_IN + (R_OUT - R_IN) * Math.pow(clamp(1 - w / spanW, 0, 1), 1.12);

  const streakGlow = stats.currentStreak === 0 ? 0.22 : clamp(0.5 + (stats.currentStreak / 30) * 0.5, 0.5, 1);
  const recentGlow = clamp((stats.activeLast30 / 30) * 1.15, 0.3, 1);

  // ---------- background stars ----------
  const starCount = clamp(90 + (data.repos ?? 20) * 2, 90, 240);
  let stars = '';
  for (let i = 0; i < starCount; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const inLabel = (y < 50 && (x < 250 || x > W - 230)) || (y > H - 52 && (x < 340 || x > W - 330));
    if (inLabel) continue;
    const r = 0.35 + Math.pow(rnd(), 3) * 1.1;
    const cls = `tw t${1 + Math.floor(rnd() * 3)}`;
    const delay = f2(-rnd() * 7);
    stars += `<circle class="${cls}" style="animation-delay:${delay}s" cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}"/>`;
  }

  // ---------- accretion disk: one rotating <g> per week ----------
  let rings = '';
  weeks.forEach((week, w) => {
    const rRing = orbit(w + 0.5);
    const period = 9 * Math.pow(rRing / R_IN, 1.5); // Kepler: T ∝ r^1.5
    const delay = -rnd() * period;
    let dots = '';
    week.forEach((day) => {
      const dayIdx = new Date(`${day.date}T00:00:00Z`).getUTCDay();
      const r = orbit(w + dayIdx / 7); // continuous spiral through the week
      const theta = dayIdx * ((2 * Math.PI) / 7) + w * 0.61;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const heat = (r - R_IN) / (R_OUT - R_IN);
      const color = lerpColor(T.temp, heat);
      const v = day.count > 0 ? Math.min(1, day.count / stats.scale) : 0;
      if (day.count > 0) {
        const s = 1.6 + 3.6 * Math.sqrt(v);
        const o = 0.5 + 0.5 * v;
        dots += `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(s)}" fill="${color}" fill-opacity="${f2(o)}"/>`;
        if (stats.best && day.date === stats.best.date) {
          dots += `<circle class="flare" cx="${f2(x)}" cy="${f2(y)}" r="${f2(s * 3.2)}" fill="url(#flare)"/>`;
        }
      } else {
        dots += `<circle cx="${f2(x)}" cy="${f2(y)}" r="1.1" fill="${color}" fill-opacity="0.12"/>`;
      }
      if (day.date === stats.today) {
        dots += `<circle class="pulse" cx="${f2(x)}" cy="${f2(y)}" r="7" fill="none" stroke="${T.hot}" stroke-width="1.6"/>`;
      }
    });
    rings += `<g class="o" style="animation-duration:${f2(period)}s;animation-delay:${f2(delay)}s">${dots}</g>`;
  });

  // ---------- lensed light (back of the disk bent over and under the shadow) ----------
  const hoOut = RS * 1.62;
  const hoIn = RS * 1.06;
  const topArc =
    `M${f2(CX - hoOut)} ${CY} A${f2(hoOut)} ${f2(hoOut * 0.93)} 0 0 1 ${f2(CX + hoOut)} ${CY} ` +
    `L${f2(CX + hoIn)} ${CY} A${f2(hoIn)} ${f2(hoIn)} 0 0 0 ${f2(CX - hoIn)} ${CY}Z`;
  const loOut = RS * 1.26;
  const loIn = RS * 1.05;
  const bottomArc =
    `M${f2(CX - loOut)} ${CY} A${f2(loOut)} ${f2(loOut)} 0 0 0 ${f2(CX + loOut)} ${CY} ` +
    `L${f2(CX + loIn)} ${CY} A${f2(loIn)} ${f2(loIn)} 0 0 1 ${f2(CX - loIn)} ${CY}Z`;

  const streams = [0.15, 0.4, 0.68]
    .map((u, i) => {
      const r = hoIn + (hoOut - hoIn) * u;
      const dash = ['16 9', '9 14', '22 18'][i];
      return `<circle class="hs" style="animation-duration:${5 + i * 2.5}s" r="${f2(r)}" fill="none" stroke="${T.hot}" stroke-opacity="${f2(0.38 - i * 0.09)}" stroke-width="${f2(1.4 - i * 0.3)}" stroke-dasharray="${dash}"/>`;
    })
    .join('');

  const hazeR = R_OUT * 1.04;
  const inner = R_IN / hazeR;
  const edge = (RS * 0.98) / hazeR;

  // ---------- labels ----------
  const total = stats.total.toLocaleString('en-US');
  const bestTxt = stats.best ? `best ${shortDate(stats.best.date)} (${stats.best.count})` : 'best —';
  const streakTxt = `streak ${stats.currentStreak}d · longest ${stats.longestStreak}d · ${bestTxt}`;

  const font = `ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ch-title ch-desc">
<title id="ch-title">Commit Horizon — @${esc(data.user)}</title>
<desc id="ch-desc">${esc(total)} contributions in the last year, spiraling into a black hole. Current streak: ${stats.currentStreak} days.</desc>
<style>
.o{animation-name:spin;animation-timing-function:linear;animation-iteration-count:infinite}
.hs{animation:spin linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.tw{fill:${T.star};animation:tw ease-in-out infinite alternate}
.t1{animation-duration:2.6s}.t2{animation-duration:4.1s}.t3{animation-duration:6.3s}
@keyframes tw{from{opacity:.15}to{opacity:.95}}
.pulse{animation:pulse 2.2s ease-in-out infinite}
.flare{animation:pulse 3.4s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.15}50%{opacity:1}}
.pr{animation:breathe 5s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:${f2(streakGlow * 0.75)}}50%{opacity:${f2(streakGlow)}}}
@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
</style>
<defs>
<radialGradient id="bg" cx="50%" cy="46%" r="65%"><stop offset="0" stop-color="${T.bgGlow}"/><stop offset="1" stop-color="${T.bg}"/></radialGradient>
<radialGradient id="haze" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${f2(hazeR)}">
<stop offset="0" stop-color="${T.hot}" stop-opacity="0"/>
<stop offset="${f2(edge)}" stop-color="${T.hot}" stop-opacity="0"/>
<stop offset="${f2(edge + 0.02)}" stop-color="${T.hot}" stop-opacity="0.9"/>
<stop offset="${f2(inner)}" stop-color="${T.hot}" stop-opacity="0.6"/>
<stop offset="${f2(inner * 1.8)}" stop-color="${T.warm}" stop-opacity="0.2"/>
<stop offset="0.6" stop-color="${lerpColor(T.temp, 0.7)}" stop-opacity="0.07"/>
<stop offset="1" stop-color="${lerpColor(T.temp, 1)}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="lens" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${CY}" r="${f2(hoOut)}">
<stop offset="${f2(hoIn / hoOut)}" stop-color="${T.hot}" stop-opacity="1"/>
<stop offset="${f2(hoIn / hoOut + 0.08)}" stop-color="${T.hot}" stop-opacity="0.7"/>
<stop offset="${f2((hoIn / hoOut + 1) / 2)}" stop-color="${T.warm}" stop-opacity="0.3"/>
<stop offset="1" stop-color="${T.warm}" stop-opacity="0"/>
</radialGradient>
<radialGradient id="flare"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.3" stop-color="${T.hot}" stop-opacity="0.6"/><stop offset="1" stop-color="${T.warm}" stop-opacity="0"/></radialGradient>
<linearGradient id="dop" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#5a5a5a"/><stop offset="0.5" stop-color="#b4b4b4"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="doppler" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="${f2(CX - R_OUT - 10)}" y="0" width="${f2(2 * R_OUT + 20)}" height="${H}" fill="url(#dop)"/></mask>
<filter id="glow" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<clipPath id="lensClip"><path d="${topArc}"/><path d="${bottomArc}"/></clipPath>
<clipPath id="upper"><rect x="0" y="0" width="${W}" height="${CY}"/></clipPath>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g>${stars}</g>
<g mask="url(#doppler)" opacity="${f2(0.55 + 0.45 * recentGlow)}">
<path d="${topArc}" fill="url(#lens)" filter="url(#soft)"/>
<path d="${bottomArc}" fill="url(#lens)" filter="url(#soft)" opacity="0.6"/>
<g clip-path="url(#lensClip)"><g transform="translate(${CX} ${CY})">${streams}</g></g>
</g>
<circle cx="${CX}" cy="${CY}" r="${f2(RS)}" fill="#000"/>
<circle class="pr" cx="${CX}" cy="${CY}" r="${f2(RS * 1.025)}" fill="none" stroke="${T.ring}" stroke-width="1.4" filter="url(#glow)"/>
<g mask="url(#doppler)"><g filter="url(#glow)"><g transform="translate(${CX} ${CY}) scale(1 ${TILT})">
<circle r="${f2(hazeR)}" fill="url(#haze)"/>
${rings}
</g></g></g>
<circle cx="${CX}" cy="${CY}" r="${f2(RS)}" fill="#000" clip-path="url(#upper)"/>
<g font-family="${font}">
<text x="28" y="38" fill="${T.muted}" font-size="11" letter-spacing="3.5">COMMIT HORIZON</text>
<text x="${W - 28}" y="38" fill="${T.text}" font-size="13" text-anchor="end">@${esc(data.user)}</text>
<text x="28" y="${H - 30}" fill="${T.text}" font-size="22" font-weight="700">${esc(total)}</text>
<text x="28" y="${H - 14}" fill="${T.muted}" font-size="10.5" letter-spacing="1">CONTRIBUTIONS FALLING IN · LAST 12 MONTHS</text>
<text x="${W - 28}" y="${H - 14}" fill="${T.muted}" font-size="10.5" text-anchor="end">${esc(streakTxt)}</text>
</g>
</g>
</svg>
`;
}
