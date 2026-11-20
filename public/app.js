// Web generator: keeps the options in the URL, previews /api/hole live, builds the snippets.
const USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const DEFAULTS = { mode: 'disk', theme: 'color', bg: 'space', style: 'logos', surface: 'dark' };

const TEXTS = {
  en: {
    kicker: '// a widget for your GitHub profile README',
    title: 'Your year, <em>falling</em> into a black&nbsp;hole.',
    lede: 'Every day of the last twelve months is a particle of light in the accretion disk. Old days drift on the cold edge, recent ones race near the horizon, and today is about to cross.',
    placeholder: 'your-github-username', go: 'Pull it in', source: 'Source',
    mode: 'Mode', disk: 'Disk', languages: 'Languages in orbit', theme: 'Theme', color: 'Color', bw: 'Interstellar B&W',
    background: 'Background', space: 'Space', transparent: 'Transparent', style: 'Logos', logos: 'Floating', planets: 'Planets',
    surface: 'Preview on', dark: 'Dark README', light: 'Light README',
    tz: 'Your time zone', tzHint: 'So your streak follows your day, not UTC.',
    getTitle: 'Put it in your README', mdTitle: 'Paste one line', mdText: 'Refreshed every few hours. Nothing to install.',
    actionTitle: 'Or let an Action redraw it daily',
    actionText: 'In <code>.github/workflows/commit-horizon.yml</code> of your profile repo, then publish <code>dist/</code> to a branch.',
    dlTitle: 'Or keep the file', dlText: 'A self-contained animated SVG, no JavaScript, under 300 KB.', download: 'Download SVG',
    copy: 'Copy', copied: 'Copied', mapTitle: 'How your year maps to space',
    m1a: 'Contributions per day', m1b: 'size and brightness of each particle',
    m2a: 'Week of the year', m2b: 'orbit radius: old outside, recent inside',
    m3a: 'Yearly total', m3b: 'mass of the hole', m4a: 'Current streak', m4b: 'the photon ring, dimmed if broken',
    m5a: 'Best day', m5b: 'a pulsing flare on its orbit', m6a: 'Top languages', m6b: 'logos orbiting, passing behind the shadow',
    sibling: 'Sibling of', demo: 'Demo data · type a username to see yours', falling: 'Falling in…',
    invalid: 'That doesn’t look like a GitHub username.', failed: 'Couldn’t render this one. Check the name or try again in a minute.',
    ready: (u) => `@${u}'s last twelve months`, alt: (u) => `@${u}'s GitHub year as a black hole`,
  },
  es: {
    kicker: '// un widget para el README de tu perfil de GitHub',
    title: 'Tu año, <em>cayendo</em> en un agujero&nbsp;negro.',
    lede: 'Cada día de los últimos doce meses es una partícula de luz en el disco de acreción. Los días viejos flotan en el borde frío, los recientes corren junto al horizonte, y hoy está a punto de cruzar.',
    placeholder: 'tu-usuario-de-github', go: 'Atraerlo', source: 'Código',
    mode: 'Modo', disk: 'Disco', languages: 'Lenguajes en órbita', theme: 'Tema', color: 'Color', bw: 'B/N Interstellar',
    background: 'Fondo', space: 'Espacio', transparent: 'Transparente', style: 'Logos', logos: 'Flotando', planets: 'Planetas',
    surface: 'Ver sobre', dark: 'README oscuro', light: 'README claro',
    tz: 'Tu zona horaria', tzHint: 'Para que tu racha siga tu día, no el de UTC.',
    getTitle: 'Ponlo en tu README', mdTitle: 'Pega una línea', mdText: 'Se actualiza cada pocas horas. Nada que instalar.',
    actionTitle: 'O deja que una Action lo redibuje cada día',
    actionText: 'En <code>.github/workflows/commit-horizon.yml</code> de tu repo de perfil, y publica <code>dist/</code> en una rama.',
    dlTitle: 'O guarda el archivo', dlText: 'Un SVG animado autocontenido, sin JavaScript, de menos de 300 KB.', download: 'Descargar SVG',
    copy: 'Copiar', copied: 'Copiado', mapTitle: 'Cómo tu año se vuelve espacio',
    m1a: 'Contribuciones por día', m1b: 'tamaño y brillo de cada partícula',
    m2a: 'Semana del año', m2b: 'radio de la órbita: lo viejo afuera, lo reciente adentro',
    m3a: 'Total del año', m3b: 'masa del agujero', m4a: 'Racha actual', m4b: 'el anillo de fotones, se apaga si se rompe',
    m5a: 'Mejor día', m5b: 'una llamarada que pulsa en su órbita', m6a: 'Lenguajes principales', m6b: 'logos en órbita que pasan detrás de la sombra',
    sibling: 'Hermano de', demo: 'Datos de demo · escribe un usuario para ver el tuyo', falling: 'Cayendo…',
    invalid: 'Eso no parece un usuario de GitHub.', failed: 'No se pudo dibujar. Revisa el nombre o intenta en un minuto.',
    ready: (u) => `Los últimos doce meses de @${u}`, alt: (u) => `El año de GitHub de @${u} como un agujero negro`,
  },
};

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const state = {
  user: (params.get('user') || '').replace(/^@/, ''),
  mode: params.get('mode') || DEFAULTS.mode,
  theme: params.get('theme') || DEFAULTS.theme,
  bg: params.get('bg') || DEFAULTS.bg,
  style: params.get('style') || DEFAULTS.style,
  surface: params.get('surface') || DEFAULTS.surface,
  tz: params.get('tz') || localZone,
  lang: (params.get('lang') || navigator.language || 'en').slice(0, 2) === 'es' ? 'es' : 'en',
};

const t = (key, ...args) => {
  const v = TEXTS[state.lang][key];
  return typeof v === 'function' ? v(...args) : v;
};

/** Query string for /api/hole: only what differs from the defaults, so README links stay short. */
function apiQuery({ forReadme = false } = {}) {
  const q = new URLSearchParams();
  if (state.user) q.set('user', state.user);
  else q.set('demo', '1');
  for (const k of ['mode', 'theme', 'bg']) if (state[k] !== DEFAULTS[k]) q.set(k, state[k]);
  if (state.mode === 'languages' && state.style !== DEFAULTS.style) q.set('style', state.style);
  if (state.tz && state.tz !== 'UTC') q.set('tz', state.tz);
  if (!forReadme) q.set('v', Date.now().toString(36).slice(-4)); // bust the browser cache while editing
  return q.toString();
}

function yaml() {
  const extra = [
    state.mode !== 'disk' && `          mode: ${state.mode}`,
    state.mode === 'languages' && state.style !== 'logos' && `          style: ${state.style}`,
    state.theme !== 'color' && `          theme: ${state.theme}`,
    state.bg !== 'space' && `          background: ${state.bg}`,
  ].filter(Boolean);
  return [
    'name: Commit Horizon',
    'on:',
    '  schedule: [{ cron: "23 4 * * *" }]',
    '  workflow_dispatch:',
    'permissions:',
    '  contents: write',
    'jobs:',
    '  black-hole:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: FelipeBeltranING/commit-horizon@v0',
    '        with:',
    '          github_user_name: ${{ github.repository_owner }}',
    `          timezone: ${state.tz || 'UTC'}`,
    ...extra,
    '      - uses: crazy-max/ghaction-github-pages@v4',
    '        with: { target_branch: output, build_dir: dist }',
    '        env: { GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}" }',
  ].join('\n');
}

function translate() {
  document.documentElement.lang = state.lang;
  $('lang').textContent = state.lang === 'es' ? 'EN' : 'ES';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
}

function syncControls() {
  for (const fs of document.querySelectorAll('.seg')) {
    for (const b of fs.querySelectorAll('button')) b.setAttribute('aria-pressed', String(state[fs.dataset.key] === b.dataset.value));
    if (fs.dataset.needs) fs.dataset.off = String(state.mode !== fs.dataset.needs);
  }
  $('stage').dataset.surface = state.surface;
}

function syncUrl() {
  const q = new URLSearchParams();
  if (state.user) q.set('user', state.user);
  for (const k of ['mode', 'theme', 'bg', 'style', 'surface']) if (state[k] !== DEFAULTS[k]) q.set(k, state[k]);
  if (state.tz !== localZone) q.set('tz', state.tz);
  history.replaceState(null, '', q.size ? `?${q}` : location.pathname);
}

let renderId = 0;
function render() {
  syncControls();
  syncUrl();
  const id = ++renderId;
  const src = `api/hole?${apiQuery()}`;
  const stage = $('stage');
  stage.dataset.loading = 'true';
  $('caption').textContent = t('falling');
  const img = new Image();
  img.onload = () => {
    if (id !== renderId) return;
    $('img').src = src;
    $('img').alt = state.user ? t('alt', state.user) : t('alt', 'demo-astronaut');
    stage.dataset.loading = 'false';
    $('caption').textContent = state.user ? t('ready', state.user) : t('demo');
  };
  img.onerror = () => {
    if (id !== renderId) return;
    stage.dataset.loading = 'false';
    $('caption').textContent = '';
    $('err').textContent = t('failed');
  };
  img.src = src;

  const readmeUrl = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}api/hole?${apiQuery({ forReadme: true })}`;
  $('md').textContent = `![My GitHub year as a black hole](${readmeUrl})`;
  $('yaml').textContent = yaml();
  $('download').href = src;
  $('download').download = `commit-horizon-${state.user || 'demo'}.svg`;
}

$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = $('user').value.trim().replace(/^@/, '');
  if (user && !USERNAME.test(user)) {
    $('err').textContent = t('invalid');
    $('user').focus();
    return;
  }
  $('err').textContent = '';
  state.user = user;
  render();
});
$('user').addEventListener('input', () => ($('err').textContent = ''));

for (const fs of document.querySelectorAll('.seg')) {
  fs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || state[fs.dataset.key] === b.dataset.value) return;
    state[fs.dataset.key] = b.dataset.value;
    if (fs.dataset.key === 'surface') return syncControls(), syncUrl();
    render();
  });
}

let tzTimer;
$('tz').addEventListener('input', () => {
  clearTimeout(tzTimer);
  tzTimer = setTimeout(() => {
    const zone = $('tz').value.trim();
    try {
      new Intl.DateTimeFormat('en', { timeZone: zone });
    } catch {
      return; // wait until it's a real zone
    }
    state.tz = zone;
    render();
  }, 500);
});

for (const b of document.querySelectorAll('.copy')) {
  b.addEventListener('click', async () => {
    await navigator.clipboard?.writeText($(b.dataset.copy).textContent);
    b.dataset.done = 'true';
    b.textContent = t('copied');
    setTimeout(() => ((b.dataset.done = 'false'), (b.textContent = t('copy'))), 1600);
  });
}

$('lang').addEventListener('click', () => {
  state.lang = state.lang === 'es' ? 'en' : 'es';
  translate();
  render();
});

$('user').value = state.user;
$('tz').value = state.tz;
translate();
render();
