// reveal.js — the moment a composed scene arrives.
//
// Ask Suvat has put a scene together. Rather than cut to it, the stage opens
// behind a veil: the scene blurred and shimmering, the Spark (Ask Suvat's mark)
// large in the middle, and under it ONE line that says what is being made:
// "Building the table…", "Drawing the laptop…", "Setting the height to 40 m…",
// "Working out the motion…", with time to read each, at most thirty seconds in all.
// Then the veil lifts from the top down, the way an image generator resolves its
// picture, and the motion plays.
//
// THE LINE IS TRUE. Each line names a piece the recipe really has (js/compose/
// registry.js), and a line with real work behind it stays up until that work is
// done: the icon's load, the drawing from the Worker, the engine's solve. Every
// line names something the scene really has, and past the student's deadline the
// scene goes on without what has not come (js/compose/pictures.js). Reduced motion:
// a short fade.

import { placeOf, pieceOf, EFFECTS } from './registry.js';
import { num } from '../notation.js';
import { prepare, ready, namesIn, DEADLINE_MS } from './pictures.js';

/** The Spark, Ask Suvat's mark: the one `#spark` symbol in index.html. */
const SPARK = '<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true"><use href="#spark"/></svg>';
const BELOW = { surface: 'the surface', sea: 'the sea', river: 'the river', pool: 'the pool', well: 'the water in the well', ground: 'the ground', beach: 'the beach', road: 'the road', rails: 'the track', floor: 'the floor', snow: 'the snow', sand: 'the sand' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const bare = (s) => String(s).replace(/^(an?|the) /i, '');
const value = (v) => num(v, Number.isInteger(v) ? 0 : 2);

/**
 * What the veil says, line by line, from the recipe: [{ say, work? }], where
 * `work` is what that line is really waiting for.
 * @param R  the checked recipe
 * @param o.solve     the engine's own solve, for "Working out the motion"
 * @param o.prepared  the promise that says the recipe's pictures are in, or the deadline has passed
 */
export function steps(R, { solve = null, prepared = null } = {}) {
  const B = placeOf(R), out = [], n = R.numbers || {};
  const place = bare(B.label.toLowerCase());
  out.push({ say: `Building the ${place}…` });
  const below = BELOW[B.below];
  if (below && !B.label.toLowerCase().includes(B.below) && !/(?:ground|floor)$/.test(below)) out.push({ say: `Laying out ${below}…` });
  const pending = new Set(namesIn(R));
  const named = new Set();
  R.objects.forEach((o) => {
    const name = bare(pieceOf(o).label);
    if (named.has(name)) return;
    named.add(name);
    out.push({ say: `Drawing the ${name}…`, ...(o.thing && pending.has(o.thing) ? { work: () => Promise.race([ready(o.thing), prepared ?? Promise.resolve()]) } : {}) });
  });
  if (R.sender) {
    const S = R.sender;
    const person = S.kind === 'person', onlyPeople = R.objects.some((o) => o.figure === 'diver');
    const who = person ? (onlyPeople ? 'second person' : 'person') : bare(S.word || 'other one');
    const where = B.edge ? 'at the edge' : 'beside it';
    out.push({ say: `Standing the ${who} ${where}…`, ...(S.kind === 'thing' && pending.has(S.thing) ? { work: () => Promise.race([ready(S.thing), prepared ?? Promise.resolve()]) } : {}) });
  }
  if (n.h) out.push({ say: `Setting the height to ${value(n.h)} m…` });
  if (n.u != null) out.push({ say: `Setting the launch speed to ${value(n.u)} m s⁻¹…` });
  if (n.theta) out.push({ say: `Setting the angle to ${value(n.theta)}°…` });
  out.push({ say: 'Working out the motion…', ...(solve ? { work: async () => { solve(); } } : {}) });
  out.push({ say: 'Drawing its path…' });
  for (const e of R.effects || []) if (EFFECTS[e]) out.push({ say: `Adding ${EFFECTS[e].label}…` });
  return out;
}

/**
 * Veil `wrap` (the stage), say what is being made, then lift.
 * @param wrap  the element the stage canvas is in
 * @param R     the checked recipe
 * @param o.until  the wall-clock time the scene must show by
 * @param o.solve  the engine's own solve
 * @returns Promise that resolves as the veil starts to lift (play then)
 */
export function reveal(wrap, R, { per = 1800, until = Date.now() + DEADLINE_MS, solve = null } = {}) {
  wrap.querySelector('.cmp-reveal')?.remove();
  const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prepared = prepare(R, { until });
  const list = steps(R, { solve, prepared });
  const el = document.createElement('div');
  el.className = 'cmp-reveal';
  el.innerHTML = `
    <canvas class="cr-snap" aria-hidden="true"></canvas>
    <div class="cr-blur"></div>
    <div class="cr-shimmer" aria-hidden="true"></div>
    <div class="cr-card">
      <span class="cr-mark" aria-hidden="true"><span class="ai-orb cr-orb">${SPARK}</span></span>
      <p class="cr-step" role="status" aria-live="polite"><span>${esc(list[0].say)}</span></p>
    </div>`;
  wrap.append(el);
  // the veil is the scene itself, blurred: a copy of the stage's canvas,
  // taken again while the stage settles into its new size
  const snap = el.querySelector('.cr-snap'), src = wrap.querySelector('canvas');
  // a canvas caught mid-resize is blank: such a copy is skipped, never kept
  const drawn = () => {
    try {
      const d = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
      for (let i = 3; i < d.length; i += 4 * 997) if (d[i] > 0) return true;
    } catch { return true; }
    return false;
  };
  const copy = () => {
    if (!src?.width || !drawn()) return;
    snap.width = src.width; snap.height = src.height;
    snap.getContext('2d').drawImage(src, 0, 0);
  };
  copy();
  const copier = setInterval(copy, 160);
  const step = el.querySelector('.cr-step');
  requestAnimationFrame(() => el.classList.add('is-on'));
  const say = (text) => { const s = document.createElement('span'); s.textContent = text; step.replaceChildren(s); };
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  // time to read each line, at most thirty seconds in all (the user, 7 Nov); a line
  // with real work behind it stays for as long as that work takes, up to the deadline
  const dwell = (quiet ? 500 : Math.min(30_000, Math.max(9000, list.length * per))) / list.length;
  // the scene sharpens as the lines go by (css/compose.css)
  el.style.setProperty('--total', `${dwell * list.length}ms`);

  return (async () => {
    for (const [i, line] of list.entries()) {
      if (i) say(line.say);
      // (past the student's deadline nothing is dwelt on: the scene goes on)
      await Promise.all([sleep(Date.now() < until ? dwell : 0), line.work ? Promise.resolve().then(line.work).catch(() => {}) : null]);
    }
    await prepared;
    clearInterval(copier); copy();
    el.classList.add('is-lifting');
    setTimeout(() => el.remove(), quiet ? 250 : 1300);
  })();
}
