// arabic-sweep.cjs — the proof that Arabic mode is all Arabic. In Arabic mode the
// only Latin-looking thing on screen is a digit, so this crawls every screen and
// lists every string with a Latin letter in it, as the student would meet it:
// DOM text, attributes, and every word the canvas draws.
//
//   node dev-server.mjs 4216          (from the repo)
//   (from a folder with playwright-core installed) node <repo>/tools/verify/arabic-sweep.cjs [out.json] [filter]
//
// filter: twelve, library, composed, chat, board, dialogs, privacy, or an id; none = all.
// Never calls a model: every reader request is answered here. Exit 1 if anything is left.
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [process.cwd()] }));

const BASE = process.env.BASE || 'http://localhost:4216/';
const OUT = process.argv[2] || 'arabic-sweep.json';
const FILTER = process.argv[3] || '';
const WIDTHS = [1440];

// Keyboard legends are the letters printed on the keys; a name stays what it is.
const EXCEPT = [
  { re: /^(?:Ctrl|⌘|Shift|Esc|Enter|Space|Alt|[A-Z]|[A-Z] [A-Z]|Ctrl K|⌘K|Ctrl Z|Ctrl Shift Z)$/, why: 'a key on the keyboard, as printed on it' },
  { re: /^English$/, why: 'the way back: someone stuck in Arabic has to be able to read it' },
  { re: /^[^A-Za-z]*(?:\b\d*[A-Z]+\d+[A-Z0-9]*(?:\/\d+)?(?:-\d)?\b[^A-Za-z]*)+$/, why: 'an exam paper\'s code, as printed on the paper' },
];
const SAMPLE = { up: { u: 20 }, arc: { u: 20, angleDegrees: 40 }, dropped: { h: 20 }, down: { h: 20, u: 5 }, 'platform-down': { h: 20, u: 10, angleDegrees: 30 }, platform: { h: 20, u: 10 }, 'platform-angle': { h: 20, u: 10, angleDegrees: 30 }, 'time-above': { u: 25 }, parachute: { h: 100, descent: { tOpen: 3, aChute: 25, vTerm: 6 } }, bullet: { h: 1.5, u: 360 }, monkey: { u: 30 }, road: { u: 0, a: 2, t: 8 } };
const COMPOSED = [
  ['laptop off a table', { backdrop: 'table', engine: 'projectile', objects: [{ figure: 'laptop' }], numbers: { h: 0.8, u: 3, theta: 0 } }],
  ['person off a cliff', { backdrop: 'cliff', engine: 'projectile', objects: [{ figure: 'diver' }], numbers: { h: 40, u: 3, theta: 0 } }],
  ['car off a bridge', { backdrop: 'bridge', engine: 'projectile', objects: [{ figure: 'car' }], numbers: { h: 20, u: 10, theta: 0 } }],
  ['football', { backdrop: 'ground', engine: 'projectile', objects: [{ figure: 'football' }], numbers: { h: 0, u: 20, theta: 45 } }],
  ['boot off a roof', { backdrop: 'house', engine: 'projectile', objects: [{ figure: 'ball' }], numbers: { h: 6, u: 5, theta: 10 } }],
  ['two from a tower', { backdrop: 'tower', engine: 'pair', objects: [{ figure: 'mug' }, { figure: 'teapot' }], numbers: { 'A.h': 30, 'A.u': 0, 'B.h': 0, 'B.u': 20 } }],
];
const REPLY = (o) => ({ ok: true, model: 'fake', title: 'كرة من فوق جرف', extraction: { understood: true, confidence: 'high', title: 'كرة من فوق جرف', ...o } });
const CHATS = [
  { scenario: 'platform', h: 45, u: 12, summary: 'كرة تُدفع أفقيًا من حافة جرف ارتفاعه 45 م بسرعة 12 م/ث.' },
  { scenario: 'arc', u: 20, angleDegrees: 30, summary: 'كرة تُركل بسرعة 20 م/ث بزاوية 30°.', asks: ['المدى', 'أقصى ارتفاع'] },
  { scenario: 'library', library: 'from-a-height', boxes: { place: 'well', h: 12, u: 0, theta: -90 }, who: 'kettle', summary: 'إبريق يسقط في بئر.' },
  { scenario: 'library', library: 'from-a-height', boxes: { place: 'tower' }, summary: 'كأس يسقط من فوق برج.' },
  { scenario: 'platform', summary: 'كرة من فوق منصة.' },
  { understood: false, reply: 'لم أفهم السؤال، أعد صياغته من فضلك.' },
];

const found = new Map();
let where = 'boot';
const note = (s, how) => {
  const v = String(s).replace(/[⁦-⁩‌‎‏؜]/g, '').trim();
  if (!/[A-Za-z]/.test(v)) return;
  const key = v;
  if (!found.has(key)) found.set(key, { how, where, n: 0 });
  found.get(key).n++;
};

async function grab(p, label) {
  where = label;
  const r = await p.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('script,style,noscript,textarea,[data-sweep-skip]')) continue;
      if (/[A-Za-z]/.test(n.nodeValue)) out.push(['dom', n.nodeValue, el.tagName + (el.className && el.className.baseVal === undefined ? '.' + el.className : '')]);
    }
    for (const el of document.querySelectorAll('[title],[aria-label],[placeholder],[alt],[aria-description],[data-tip]')) {
      for (const a of ['title', 'aria-label', 'placeholder', 'alt', 'aria-description', 'data-tip']) {
        const v = el.getAttribute(a);
        if (v && /[A-Za-z]/.test(v)) out.push(['attr:' + a, v, el.tagName]);
      }
    }
    const canvas = window.__sweepCanvas ? [...window.__sweepCanvas] : [];
    if (window.__sweepCanvas) window.__sweepCanvas.clear();
    for (const c of canvas) out.push(['canvas', c, '']);
    return out;
  });
  for (const [how, s, tag] of r) note(s, how + (tag ? ` ${tag}` : ''));
}

const settle = (p, ms = 250) => p.waitForTimeout(ms);
async function frames(p) { await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); }

async function walkFlight(p, label) {
  await grab(p, `${label} · reply`);
  await p.evaluate(() => { try { window.SUVAT.go('values'); } catch {} });
  await settle(p); await grab(p, `${label} · values`);
  const ran = await p.evaluate(() => { try { const S = window.SUVAT; S.go('flight'); S.launch(); return !!S.traj; } catch (e) { return String(e); } });
  if (ran !== true) { await grab(p, `${label} · no flight`); return; }
  await settle(p, 300);
  await p.evaluate(() => { const S = window.SUVAT; if (S.state.extras) { S.state.extras.graphs = true; S.state.extras.working = true; S.state.extras.energy = true; } });
  for (const f of [0.15, 0.5, 0.85]) {
    await p.evaluate((q) => { const S = window.SUVAT; S.state.playing = false; S.state.launched = true; S.state.t = (S.traj?.tMax || 1) * q; S.hideDone?.(); S.redraw(); }, f);
    await frames(p); await settle(p, 60);
    await grab(p, `${label} · flight ${f}`);
  }
  // every display option on, so its words are drawn
  await p.evaluate(() => { for (const b of document.querySelectorAll('#options input[type=checkbox], .ck input[type=checkbox]')) { if (!b.checked && !b.disabled && !/filling|bounce/i.test(b.id)) { b.click(); } } });
  await frames(p); await settle(p, 120); await grab(p, `${label} · all options`);
  // Resolve, on the moving thing
  await p.evaluate(async () => {
    const u = await import('/js/render/util.js'), S = window.SUVAT, c = document.getElementById('scene');
    const r = c?.getBoundingClientRect(); const m = S.cam?._map; let at = null;
    if (m?.sx && S.traj?.pos) { const q = S.traj.pos(S.state.t); at = m.ball || { x: m.sx(q.x), y: m.sy(q.y) }; }
    else { const l = u.movers.list.filter((q) => q.strong); at = (l.length ? l : u.movers.list)[0]; }
    window.__at = at && r ? { x: r.left + at.x, y: r.top + at.y } : null;
  });
  const at = await p.evaluate(() => window.__at);
  if (at) { await p.mouse.move(at.x - 3, at.y); await p.mouse.move(at.x, at.y); await settle(p, 100); await grab(p, `${label} · hover`); await p.mouse.click(at.x, at.y); await settle(p, 300); await grab(p, `${label} · resolve`); }
  await p.evaluate(() => { const S = window.SUVAT; try { S.closeResolve?.(); } catch {} try { S.openAskAt?.(); } catch {} });
  await settle(p, 120); await grab(p, `${label} · resolve an instant`);
  await p.evaluate(() => { const S = window.SUVAT; try { S.closeAskAt?.(); } catch {} try { S.state.t = S.traj?.tMax || 0; S.redraw(); S.showDone?.(); } catch {} });
  await settle(p, 200); await grab(p, `${label} · landing card`);
  await p.evaluate(() => { const S = window.SUVAT; try { S.hideDone?.(); S.showEnding?.(); } catch {} });
  await settle(p, 200); await grab(p, `${label} · what the model leaves out`);
  await p.evaluate(() => { const S = window.SUVAT; try { S.hideDone?.(); } catch {} for (const b of document.querySelectorAll('.pstrip button, .parts button, [data-part]')) { try { b.click(); } catch {} } });
  await settle(p, 150); await grab(p, `${label} · parts`);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: WIDTHS[0], height: 900 } });
  const p = await ctx.newPage();
  const errs = new Set();
  p.on('pageerror', (e) => errs.add(String(e).slice(0, 200)));
  let reply = REPLY(CHATS[0]);
  await p.addInitScript(() => {
    try { localStorage.setItem('suvat-lang', 'ar'); } catch {}
    window.__sweepCanvas = new Set();
    const C = CanvasRenderingContext2D.prototype;
    for (const name of ['fillText', 'strokeText']) {
      const o = C[name];
      C[name] = function (text, ...rest) { if (typeof text === 'string' && /[A-Za-z]/.test(text)) window.__sweepCanvas.add(text); return o.call(this, text, ...rest); };
    }
  });
  await p.route('**/*', (r) => {
    const u = r.request().url();
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (u.includes('/extract')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(reply) });
    if (u.includes('/draw')) return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ status: 'refused' }) });
    if (u.startsWith(BASE) || /fonts\.(googleapis|gstatic)\.com/.test(u)) return r.continue();
    return r.abort();
  });
  const want = (k) => !FILTER || FILTER === k;
  const save = () => {
    const left = [], excused = [];
    for (const [s, v] of found) {
      const ex = EXCEPT.find((e) => e.re.test(s));
      (ex ? excused : left).push({ s, why: ex?.why, ...v });
    }
    fs.writeFileSync(OUT, JSON.stringify({ left, excused, errors: [...errs] }, null, 1));
    return left;
  };
  // a whole page's Resolve can stall on a heavy stage: no one scenario holds up the rest
  const within = (ms, what, f) => Promise.race([f(), new Promise((_, no) => setTimeout(() => no(new Error(`timed out: ${what}`)), ms))]);
  const each = async (label, f) => {
    try { await within(45000, label, f); } catch (e) { console.log(`STUCK at ${where}: ${String(e).slice(0, 120)}`); errs.add(`${label} at ${where}: ${String(e).slice(0, 160)}`); save(); process.exit(3); }
    save();
    process.stdout.write(`${label}\n`);
  };
  const open = async () => { await p.goto(BASE, { waitUntil: 'load' }); await p.waitForFunction(() => window.SUVAT); await settle(p, 500); };
  await open();
  const ids = await p.evaluate(async () => { const { SCENARIOS } = await import('/js/scenarios.js'); const { LIBRARY } = await import('/js/library.js'); return { twelve: SCENARIOS.map((s) => s.id), lib: LIBRARY.map((s) => s.id) }; });

  if (want('dialogs')) {
    await grab(p, 'home');
    for (const [id, label] of [['nav-scenarios', 'scenarios'], ['nav-library', 'library'], ['keys-btn', 'shortcuts'], ['cmdk-open', 'search']]) {
      await p.evaluate((i) => document.getElementById(i)?.click(), id);
      await settle(p); await grab(p, label);
      await p.keyboard.press('Escape');
    }
    await p.evaluate(() => { const a = document.getElementById('acct-btn'); if (a) { a.hidden = false; a.click(); } });
    await settle(p); await grab(p, 'sign-in dialog'); await p.keyboard.press('Escape');
    await p.evaluate(() => { document.getElementById('theme-btn')?.click(); }); await settle(p, 100); await grab(p, 'the other theme');
  }
  if (want('privacy')) { await p.goto(BASE + 'privacy.html', { waitUntil: 'load' }); await settle(p, 800); await grab(p, 'privacy'); await open(); }
  for (const id of ids.twelve) {
    if (!want('twelve') && FILTER !== id) continue;
    await each(`the twelve: ${id}`, async () => {
      await p.evaluate(([i, n]) => { window.SUVAT.applyReading({ understood: true, scenario: i, who: 'ball', summary: '', ...n }, { graph: true }); }, [id, SAMPLE[id] || {}]);
      await settle(p); await walkFlight(p, `the twelve: ${id}`);
    });
  }
  for (const id of ids.lib) {
    if (!want('library') && FILTER !== id) continue;
    await each(`library: ${id}`, async () => {
      await p.evaluate((i) => { window.SUVAT.applyReading({ understood: true, scenario: 'library', library: i, example: true, summary: '' }, { graph: true }); }, id);
      await settle(p); await walkFlight(p, `library: ${id}`);
      // the same scenario as a question in parts: the strip, each part's card, its working
      const labels = await p.evaluate(async (i) => { const { LIBRARY } = await import('/js/library.js'); const s = LIBRARY.find((x) => x.id === i); if (!s?.parts?.length) return 0; window.SUVAT.applyReading({ understood: true, scenario: 'library', library: i, example: true, summary: '', parts: s.parts.map((q) => q.label) }, { graph: true }); return s.parts.length; }, id);
      if (labels) {
        await settle(p, 200); await grab(p, `library: ${id} · parts, reply`);
        for (let k = 0; k < labels; k++) {
          await p.evaluate((n) => { try { window.SUVAT.go('flight'); window.SUVAT.showPart?.(n); } catch {} }, k);
          await settle(p, 200); await grab(p, `library: ${id} · part ${k}`);
        }
      }
    });
  }
  if (want('composed')) for (const [n, r] of COMPOSED) {
    await p.evaluate((rc) => { window.SUVAT.applyReading({ understood: true, scenario: 'compose', summary: '', recipe: rc }, { graph: true }); }, r);
    await p.evaluate(() => window.SUVAT.showFlight?.()); await settle(p, 900); await grab(p, `composed: ${n} · drawing screen`);
    await p.waitForFunction(() => !document.querySelector('.cmp-reveal'), { timeout: 45000 }).catch(() => {});
    await walkFlight(p, `composed: ${n}`);
    process.stdout.write('.');
  }
  if (want('chat')) {
    await open();
    for (const c of CHATS) {
      reply = c.understood === false ? REPLY(c) : REPLY(c);
      await p.evaluate(() => { document.getElementById('ask-top')?.click(); });
      await settle(p, 150);
      await p.evaluate(() => { const t = [...document.querySelectorAll('textarea')].find((x) => x.offsetParent); if (!t) return; t.value = 'كرة تسقط من ارتفاع ٤٥ م'; t.dispatchEvent(new Event('input', { bubbles: true })); t.closest('form')?.requestSubmit(); });
      await settle(p, 1500); await grab(p, 'chat');
    }
    // the same questions with the worked solution on
    await p.evaluate(() => { document.getElementById('ask-top')?.click(); document.getElementById('ask-solve')?.click(); });
    for (const c of CHATS.slice(0, 3)) {
      reply = REPLY(c);
      await settle(p, 150);
      await p.evaluate(() => { const t = [...document.querySelectorAll('textarea')].find((x) => x.offsetParent); if (!t) return; t.value = 'كرة تسقط'; t.dispatchEvent(new Event('input', { bubbles: true })); t.closest('form')?.requestSubmit(); });
      await settle(p, 3000); await grab(p, 'chat, worked solution');
    }
    await p.evaluate(() => document.getElementById('chat-hist')?.click()); await settle(p, 100); await grab(p, 'chats list');
    process.stdout.write('.');
  }
  if (want('board')) {
    await open();
    await p.evaluate(() => document.getElementById('board-top')?.click()); await settle(p, 400); await grab(p, 'whiteboard, empty');
    reply = { ok: true, model: 'fake', extraction: { understood: true, confidence: 'high', scenario: 'arc', u: 20, angleDegrees: 35, title: 'ركلة', summary: 'كرة تُركل بسرعة 20 م/ث.', frames: ['scene', 'given', 'answers', 'graph-s', 'graph-v', 'graph-a', 'working', 'notes'], notes: ['لاحظ تماثل المسار.'] } };
    await p.evaluate(() => { const t = [...document.querySelectorAll('textarea')].find((x) => x.offsetParent); if (!t) return; t.value = 'كرة تُركل'; t.dispatchEvent(new Event('input', { bubbles: true })); t.closest('form')?.requestSubmit(); });
    await settle(p, 2500); await grab(p, 'whiteboard, built');
    process.stdout.write('.');
  }

  const left = save();
  console.log(`\nLatin strings: ${left.length} left, page errors: ${errs.size}`);
  await b.close();
  process.exit(left.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
