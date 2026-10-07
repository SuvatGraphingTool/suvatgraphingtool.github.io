// shoot.mjs — drive the dev server with a headless browser and save screenshots.
//
// NOT part of the app. Nothing under js/ imports it, nothing in a shipping
// package.json mentions it, and its node_modules is gitignored. It exists so a
// visual change can be looked at rather than assumed.
//
//   node tools/verify/shoot.mjs <recipe.mjs> [outDir]
//
// A recipe default-exports an array of { name, async run(page) }.

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const PORT = Number(process.env.SHOOT_PORT || 4173);
const ORIGIN = `http://localhost:${PORT}`;
const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');

const recipePath = process.argv[2];
const outDir = resolve(ROOT, process.argv[3] || 'docs/verify');
if (!recipePath) { console.error('usage: shoot.mjs <recipe.mjs> [outDir]'); process.exit(2); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function serve() {
  const p = spawn(process.execPath, ['dev-server.mjs'], {
    cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`${ORIGIN}/index.html`); if (r.ok) return p; } catch {}
    await wait(250);
  }
  p.kill(); throw new Error('dev server never came up');
}

const server = await serve();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
});
await mkdir(outDir, { recursive: true });

const shots = (await import(resolve(process.cwd(), recipePath))).default;
let failed = 0;

for (const shot of shots) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const noise = [];
  page.on('console', (m) => { if (m.type() === 'error') noise.push(m.text()); });
  page.on('pageerror', (e) => noise.push(String(e)));
  try {
    await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' });
    await shot.run(page, { wait, ORIGIN });
    await page.screenshot({ path: `${outDir}/${shot.name}.png` });
    console.log(`  ok   ${shot.name}${noise.length ? `  [console: ${noise.slice(0, 3).join(' | ')}]` : ''}`);
    if (noise.length) failed++;
  } catch (e) {
    console.log(`  FAIL ${shot.name}  ${e.message}`);
    failed++;
  }
  await ctx.close();
}

await browser.close();
server.kill();
process.exit(failed ? 1 : 0);
