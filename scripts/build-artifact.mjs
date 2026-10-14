#!/usr/bin/env node
/**
 * Packages the Expo web export as ONE self-contained page for publishing as a
 * private claude.ai artifact — the "play on any device" build. The artifact
 * page contract wants page content only (the platform wraps it in its own
 * doctype/head/body), every script inline, and every asset as a data: URI,
 * so this inlines the JS bundle and the few image assets it references.
 *
 * Usage:
 *   npx expo export --platform web --output-dir <exportDir>
 *   node scripts/build-artifact.mjs <exportDir> <out.html> [--standalone]
 *
 * --standalone wraps the result in a full HTML document so it can be opened
 * directly from disk for local smoke tests (the published page must not be).
 */
import fs from 'node:fs';
import path from 'node:path';

const [exportDir, outFile, flag] = process.argv.slice(2);
if (!exportDir || !outFile) {
  console.error('usage: node scripts/build-artifact.mjs <exportDir> <out.html> [--standalone]');
  process.exit(1);
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

const indexHtml = fs.readFileSync(path.join(exportDir, 'index.html'), 'utf8');
const bundles = [...indexHtml.matchAll(/<script src="([^"]+\.js)"/g)].map((m) => m[1]);
if (bundles.length === 0) throw new Error('no bundle <script> found in the export index.html');

let inlined = 0;
const js = bundles
  .map((src) => fs.readFileSync(path.join(exportDir, src.replace(/^\//, '')), 'utf8'))
  .join('\n')
  // asset references are absolute "/assets/..." URLs; the artifact serves no such paths, so embed them
  .replace(/"(\/assets\/[^"]+\.(png|jpe?g|gif|svg|ttf|woff2))"/g, (whole, rel) => {
    const file = path.join(exportDir, decodeURIComponent(rel).replace(/^\//, ''));
    if (!fs.existsSync(file)) return whole;
    inlined++;
    const mime = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    return `"data:${mime};base64,${fs.readFileSync(file).toString('base64')}"`;
  })
  // inline-script safety: these two sequences would end or derail an HTML <script> element.
  // \x3C is "<" inside any JS string, template or regex, so behavior is unchanged.
  .replace(/<\/script/gi, '\\x3C/script')
  .replace(/<!--/g, '\\x3C!--');

const page = `<title>Solara Shores Sim</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
  /* single committed look: the game's own day-sheet drafting palette */
  :root { color-scheme: light; --bg: #E8EAE4; --fg: #16202A; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--fg);
    overflow: hidden;
    box-sizing: border-box;
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<noscript>Solara Shores Sim needs JavaScript to run.</noscript>
<div id="root"></div>
<script>
${js}
</script>
`;

const out =
  flag === '--standalone'
    ? `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${page}</body></html>`
    : page;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, out);
console.log(`wrote ${outFile} (${(out.length / 1024 / 1024).toFixed(2)} MB, ${inlined} assets inlined)`);
