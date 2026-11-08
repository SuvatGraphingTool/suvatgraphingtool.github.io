// pictures.js — the picture of an object, resolved down the ladder.
//
//   an icon (js/compose/icons.json, fetched only when a question needs it)
//   → a drawing from the reader Worker (POST /draw, cached forever, shared)
//   → the object's name on a clean rounded shape (js/render/thing.js)
//
// A picture must not pop in: prepare() resolves everything a recipe needs before
// the veil lifts (js/compose/reveal.js), and until it arrives the object is its
// labelled shape. Every SVG goes through the strict allowlist again here
// (js/compose/svgsafe.js), then a pre-loaded Image from a data URL, measured once
// so it can sit on a surface exactly. Nothing here calculates (rule 4).

import { READER } from '../ai/capture.js';
import { thingName, headOf, materialOf, isMaterial, isBlocked, isBigWord, settleEffects, normaliseName, sizeOfWord, shownName, BIG_M } from './things.js';

/** The student asks; the scene shows within this, drawing or no drawing. */
export const DEADLINE_MS = 20_000;   // the user, 8 Nov: twenty seconds at most
/** By the reader's full address, not a path on this site: it works on github.io and on workers.dev alike. */
export const DRAW_URL = READER.replace(/\/extract$/, '/draw');
const STORE = 'suvat-drawing-v1:';
/** The rungs, as the tests and the veil say them. */
export const RUNG = { ICON: 2, DRAWN: 3, LABEL: 4 };

const entries = new Map();
let catalogue = null;

/** Where the fetched catalogue comes from: replaced in the tests, which have no network. */
let readCatalogue = async () => {
  const res = await fetch(new URL('./icons.json', import.meta.url));
  if (!res.ok) throw new Error(`icons ${res.status}`);
  return res.json();
};
export const useCatalogue = (fn) => { readCatalogue = fn; catalogue = null; };
export const forgetPictures = () => entries.clear();

const loadCatalogue = () => (catalogue ??= readCatalogue().catch(() => { catalogue = null; return null; }));

/** A word's row in the catalogue: the whole phrase, then what it is about, or null. */
export function rowOf(cat, name) {
  if (!cat) return null;
  const hit = (w) => (Object.hasOwn(cat.words, w) ? cat.icons[cat.words[w]] : null);
  const n = normaliseName(name);
  if (hit(n)) return hit(n);
  // "cup of coffee" is a cup; "car battery" a battery; "kitchen glass" a glass
  const before = n.split(' of ')[0];
  if (hit(before)) return hit(before);
  const words = before.split(' ');
  for (let i = 1; i < words.length; i++) { const tail = words.slice(i).join(' '); if (hit(tail)) return hit(tail); }
  return hit(headOf(n));
}

/** A fresh entry: the labelled shape, until something better is ready. */
function fresh(name) {
  const m = sizeOfWord(name);
  return { name, shown: shownName(name), rung: RUNG.LABEL, img: null, fit: null, material: materialOf(name), m, big: m >= BIG_M, long: false, pulp: null, colours: [], done: false, late: null, busy: null };
}
/** What is known of an object right now, without waiting: never null. */
export function entryOf(name) {
  const key = thingName(name) || 'object';
  let e = entries.get(key);
  if (!e) { e = fresh(key); entries.set(key, e); }
  return e;
}

/* ── how a picture sits: measured once, from its own pixels ──────────────── */
const GRID = 72;
/** Its content box and outline in units of its longest side, from the centre of
    that box, with the direction it runs in: so it can stand on a surface exactly
    at any angle. A browser that will not let it be read keeps the full frame. */
function measure(img) {
  const whole = { cx: 0.5, cy: 0.5, long: 1, axis: 0, ratio: 1, hull: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]] };
  try {
    const c = document.createElement('canvas'); c.width = c.height = GRID;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, GRID, GRID);
    const d = g.getImageData(0, 0, GRID, GRID).data;
    let x0 = GRID, y0 = GRID, x1 = -1, y1 = -1, sx = 0, sy = 0, n = 0;
    const left = new Array(GRID).fill(null), right = new Array(GRID).fill(null), xs = [], ys = [];
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      if (d[(y * GRID + x) * 4 + 3] < 40) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (left[y] == null) left[y] = x;
      right[y] = x;
      sx += x; sy += y; n++; xs.push(x); ys.push(y);
    }
    if (!n) return whole;
    const cx = (x0 + x1 + 1) / 2 / GRID, cy = (y0 + y1 + 1) / 2 / GRID, long = Math.max(x1 - x0 + 1, y1 - y0 + 1) / GRID;
    // the way it runs: its principal axis
    const mx = sx / n, my = sy / n; let xx = 0, yy = 0, xy = 0;
    for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; xx += a * a; yy += b * b; xy += a * b; }
    const axis = 0.5 * Math.atan2(2 * xy, xx - yy), root = Math.hypot(xx - yy, 2 * xy);
    const ratio = Math.sqrt(Math.max(1e-6, (xx + yy + root) / Math.max(1e-6, xx + yy - root)));
    // its outline, row by row, in units of its longest side from its centre
    const hull = [];
    for (let y = 0; y < GRID; y += 2) if (left[y] != null) {
      for (const x of [left[y], right[y] + 1]) hull.push([(x / GRID - cx) / long, ((y + 0.5) / GRID - cy) / long]);
    }
    return { cx, cy, long, axis, ratio, hull };
  } catch { return whole; }
}
/** How far below its centre it reaches at an angle, in units of its longest side. */
export function reachBelow(fit, angle = 0) {
  if (!fit) return 0.5;
  const s = Math.sin(angle), c = Math.cos(angle);
  let low = 0;
  for (const [x, y] of fit.hull) low = Math.max(low, x * s + y * c);
  return low;
}

async function imageOf(svg) {
  const safe = await import('./svgsafe.js');
  const clean = safe.sanitizeSvg(svg);
  if (!clean.ok) return null;
  const img = new Image();
  img.decoding = 'sync';
  const ready = new Promise((done, no) => { img.onload = done; img.onerror = no; });
  img.src = safe.dataUrl(clean.svg);
  await ready;
  return { img, colours: safe.coloursIn(clean.svg), info: clean.info };
}

/** Take a picture: at once, or held for the next launch when the scene has already gone on without it. */
function adopt(e, patch) {
  if (e.late === 'waiting') { e.late = patch; return; }
  Object.assign(e, patch);
}

function remembered(name) {
  try { const v = localStorage.getItem(STORE + name); return v ? JSON.parse(v) : null; } catch { return null; }
}
function remember(name, v) {
  try { localStorage.setItem(STORE + name, JSON.stringify(v)); } catch { /* it is only a convenience */ }
}

/** Ask the Worker for a drawing. Any failure is simply no drawing: the last rung takes over. */
async function askForDrawing(name, signal) {
  const res = await fetch(DRAW_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }), signal });
  if (!res.ok) return null;
  return res.json();
}

/** Down the ladder, for one object. `signal` is the student's deadline. */
async function resolve(e, signal) {
  const cat = await loadCatalogue();
  const row = rowOf(cat, e.name);
  if (row) {
    const size = { m: row.m, big: row.m >= BIG_M, long: !!row.long, pulp: row.pulp ?? null, ...(isMaterial(row.mat) ? { material: row.mat } : {}) };
    Object.assign(e, size);
    const got = await imageOf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${row.b}</svg>`).catch(() => null);
    if (got) { adopt(e, { rung: RUNG.ICON, img: got.img, fit: measure(got.img), colours: got.colours }); return; }
  }
  // what must not be drawn never leaves the page
  if (isBlocked(e.name)) return;
  const stored = remembered(e.name);
  const answer = stored || await askForDrawing(e.name, signal).catch(() => null);
  if (answer?.status !== 'ok' || typeof answer.svg !== 'string') {
    // the Worker has said no, and will say no again: no need to ask next time
    if (answer?.status === 'refused' || answer?.status === 'failed') { remember(e.name, { status: answer.status }); }
    return;
  }
  if (!stored) remember(e.name, { status: 'ok', svg: answer.svg, material: answer.material });
  const got = await imageOf(answer.svg).catch(() => null);
  if (!got) return;
  const fit = measure(got.img);
  adopt(e, { rung: RUNG.DRAWN, img: got.img, fit, colours: got.colours, long: fit.ratio > 2.4, ...(isMaterial(answer.material) ? { material: answer.material } : {}), ...(isBigWord(e.name) ? { big: true } : {}) });
}

/** One object's picture, however far down the ladder it comes from. */
export function ready(name, { signal } = {}) {
  const e = entryOf(name);
  if (e.done) return Promise.resolve(e);
  // (stopped by the student's deadline it is not finished with: the Worker keeps what it was
  // making, so the next time this is asked it is simply there)
  e.busy ??= resolve(e, signal).catch(() => {}).then(() => { e.done = !signal?.aborted || e.rung !== RUNG.LABEL; e.busy = null; return e; });
  return e.busy;
}

/** The objects a recipe needs a picture of: what moves, and whoever sends it. */
export function namesIn(R) {
  const out = (R?.objects || []).filter((o) => o.figure === 'thing' && o.thing).map((o) => o.thing);
  if (R?.sender?.kind === 'thing' && R.sender.thing) out.push(R.sender.thing);
  return [...new Set(out)];
}

/**
 * Every picture a recipe needs, by a real deadline.
 * @param R         the checked recipe
 * @param o.until   the wall-clock time the scene must show by
 * @returns Promise, resolved when they are ready or the deadline has passed;
 *          the recipe's effects then say what its object's material does
 */
export function prepare(R, { until = Date.now() + DEADLINE_MS } = {}) {
  const names = namesIn(R);
  if (!names.length) return Promise.resolve();
  // anything that came too late for the last run is taken now, between runs
  for (const n of names) { const e = entryOf(n); if (e.late && e.late !== 'waiting') { Object.assign(e, e.late); } if (e.late) e.late = null; }
  const ctl = new AbortController();
  const left = Math.max(0, until - Date.now());
  const timer = setTimeout(() => ctl.abort(), left);
  const settle = () => { clearTimeout(timer); for (const o of R.objects || []) if (o.thing) settleEffects(R, entryOf(o.thing).material); };
  const work = Promise.all(names.map((n) => ready(n, { signal: ctl.signal })));
  // never hang: past the deadline the scene goes on with the last rung, and a
  // drawing still on its way waits for the next run rather than popping in
  const over = new Promise((done) => setTimeout(done, left)).then(() => {
    for (const n of names) { const e = entryOf(n); if (!e.done) { e.late = 'waiting'; } }
  });
  return Promise.race([work, over]).then(settle, settle);
}
