// Loads the official language logos from the `devicon` package (npm install devicon)
// and makes them safe to inline several times in one SVG.
// Logos are trademarks of their respective owners; devicon distributes them for
// exactly this kind of "this is the language I use" reference.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// GitHub linguist name -> devicon folder
export const DEVICON_SLUGS = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  Java: 'java',
  'C++': 'cplusplus',
  C: 'c',
  'C#': 'csharp',
  Go: 'go',
  Rust: 'rust',
  Ruby: 'ruby',
  PHP: 'php',
  Kotlin: 'kotlin',
  Swift: 'swift',
  Dart: 'dart',
  HTML: 'html5',
  CSS: 'css3',
  SCSS: 'sass',
  Shell: 'bash',
  GDScript: 'godot',
  'Jupyter Notebook': 'jupyter',
  Lua: 'lua',
  R: 'r',
  Haskell: 'haskell',
  Scala: 'scala',
  Elixir: 'elixir',
  Vue: 'vuejs',
  Svelte: 'svelte',
  MATLAB: 'matlab',
  Dockerfile: 'docker',
  Julia: 'julia',
  Zig: 'zig',
};

function iconsRoot() {
  if (process.env.COMMIT_HORIZON_ICONS) return process.env.COMMIT_HORIZON_ICONS;
  try {
    const pkg = createRequire(import.meta.url).resolve('devicon/package.json');
    return join(dirname(pkg), 'icons');
  } catch {
    return null;
  }
}

// Your own logos win: icons/<slug>.svg or icons/<slug>.png (e.g. icons/python.png).
const LOCAL_ICONS = fileURLToPath(new URL('../icons/', import.meta.url));

export function loadIcon(language, prefix) {
  const slug = DEVICON_SLUGS[language] ?? language.toLowerCase().replace(/[^a-z0-9]+/g, '');
  for (const dir of [LOCAL_ICONS, process.env.COMMIT_HORIZON_ICONS].filter(Boolean)) {
    const svg = join(dir, `${slug}.svg`);
    if (existsSync(svg)) return sanitizeIcon(readFileSync(svg, 'utf8'), prefix);
    const png = join(dir, `${slug}.png`);
    if (existsSync(png)) return pngIcon(readFileSync(png));
  }
  const root = iconsRoot();
  if (!root) return null;
  for (const variant of ['original', 'plain', 'original-wordmark']) {
    const file = join(root, slug, `${slug}-${variant}.svg`);
    if (existsSync(file)) return sanitizeIcon(readFileSync(file, 'utf8'), prefix);
  }
  return null;
}

/** Embeds a PNG as a data URI (GitHub blocks external images inside SVGs, not data URIs). */
export function pngIcon(buf) {
  const isPng = buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47;
  if (!isPng) return null;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return {
    viewBox: `0 0 ${w} ${h}`,
    body: `<image width="${w}" height="${h}" href="data:image/png;base64,${buf.toString('base64')}"/>`,
  };
}

/** Returns { viewBox, body } with ids and classes namespaced by `prefix`. */
export function sanitizeIcon(svg, prefix) {
  let s = svg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|foreignObject)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');

  const root = s.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  if (!root) return null;
  const attrs = root[1];
  let body = root[2];

  let viewBox = attrs.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!viewBox) {
    const w = parseFloat(attrs.match(/\bwidth\s*=\s*["']([\d.]+)/)?.[1] ?? '128');
    const h = parseFloat(attrs.match(/\bheight\s*=\s*["']([\d.]+)/)?.[1] ?? '128');
    viewBox = `0 0 ${w} ${h}`;
  }

  // Namespace ids and references so several icons can live in one document.
  body = body
    .replace(/\bid\s*=\s*"([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
    .replace(/url\(\s*['"]?#([^'")]+)['"]?\s*\)/g, (_, id) => `url(#${prefix}-${id})`)
    .replace(/((?:xlink:)?href)\s*=\s*"#([^"]+)"/g, (_, a, id) => `${a}="#${prefix}-${id}"`)
    .replace(/((?:xlink:)?href)\s*=\s*"(?!#)[^"]*"/g, '') // no external resources
    .replace(/\bclass\s*=\s*"([^"]+)"/g, (_, c) => `class="${c.trim().split(/\s+/).map((k) => `${prefix}-${k}`).join(' ')}"`)
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, a, css) =>
      `<style${a}>${css.replace(/\.(-?[_a-zA-Z][\w-]*)/g, `.${prefix}-$1`).replace(/#([_a-zA-Z][\w-]*)\s*\{/g, `#${prefix}-$1{`)}</style>`,
    );

  return { viewBox, body: body.trim() };
}

/** Adds an `icon` ({viewBox, body} or null) to each language. */
export function withIcons(languages) {
  return languages.map((l, i) => ({ ...l, icon: loadIcon(l.name, `ci${i}`) }));
}
