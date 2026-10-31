// The preview page: shows both themes on a dark and a light "README".
export function previewPage({ color, bw, user = '', live = false }) {
  const form = live
    ? `<form method="get">
  <input name="user" placeholder="github user (empty = demo)" value="${user === 'demo-astronaut' ? '' : user}">
  <button>Generate</button>
</form>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Commit Horizon preview</title>
<style>
:root{color-scheme:dark}
body{margin:0;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;background:#0d1117;color:#c9d1d9}
main{max-width:900px;margin:0 auto;padding:32px 16px}
h1{font-size:16px;letter-spacing:.2em;font-weight:600}
h2{font-size:12px;color:#8b949e;letter-spacing:.15em;margin:32px 0 10px;font-weight:500}
img{width:100%;height:auto;display:block;border-radius:12px}
.light{background:#fff;padding:16px;border-radius:12px}
form{display:flex;gap:8px;margin:12px 0 0}
input{flex:1;background:#161b22;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:8px 10px;font:inherit}
button{background:#238636;color:#fff;border:0;border-radius:6px;padding:8px 14px;font:inherit;cursor:pointer}
</style></head>
<body><main>
<h1>COMMIT HORIZON · preview</h1>
${form}
<h2>COLOR · README DARK</h2><img src="${color}" alt="Commit Horizon color">
<h2>INTERSTELLAR B&amp;W · README DARK</h2><img src="${bw}" alt="Commit Horizon black and white">
<h2>COLOR · README LIGHT</h2><div class="light"><img src="${color}" alt=""></div>
</main></body></html>`;
}
