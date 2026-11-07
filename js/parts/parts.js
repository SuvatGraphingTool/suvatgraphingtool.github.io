// parts/parts.js — a question in parts: which boxes each part is solved with,
// and where in the engine's answer each part's answer already is.
//
// Nothing here calculates (rule 4). A part names an output of its kit's
// solve() by a path; this file only looks it up, merges the boxes a part
// adds, and finds the moment and the working step the part is about. The
// format is in design/components.md, "A question in parts".

/** The parts that are in scope, in order — an `out` part has no answer. */
import { toApp } from '../core/question.js';
import { solveRoad } from '../core/road.js';

export const live = (parts) => (parts || []).filter((p) => !p.out);

/** `(a)`, `(ii)`. */
export const tag = (p) => String(p.label).split(/[ .]+/).map((x) => `(${x})`).join('');

/**
 * Look a dotted path up in what an engine answered. A segment that meets an
 * array is an index when it is a number, else the element whose key, name or
 * id (or kind) it is — so `extras.tMeet` finds `{ key: 'tMeet', value }` and
 * gives its value. A segment `name(3)` asks the engine's own function there,
 * `f.startOf(3)`: the engine's answer, looked up, not worked out here.
 * Missing anywhere: undefined.
 */
export function pick(obj, path) {
  if (typeof path === 'number') return path;
  if (path == null || path === '') return undefined;
  let cur = obj;
  for (const seg of String(path).split(/\.(?![^(]*\))/)) {
    if (cur == null) return undefined;
    const call = /^(\w+)\(([-\d.]*)\)$/.exec(seg);
    if (call) { cur = typeof cur[call[1]] === 'function' ? cur[call[1]](call[2] === '' ? undefined : Number(call[2])) : undefined; continue; }
    if (Array.isArray(cur) && !/^\d+$/.test(seg)) {
      const hit = cur.find((x) => x && (x.key === seg || x.name === seg || x.id === seg || x.kind === seg));
      cur = hit && 'value' in hit ? hit.value : hit;
    } else cur = cur[seg];
  }
  return cur;
}

/** A path's value as a number, or NaN: booleans stay booleans. */
function value(solved, path) {
  const v = pick(solved, path);
  if (typeof v === 'boolean') return v;
  if (v && typeof v === 'object' && 'value' in v) return v.value;
  return typeof v === 'number' ? v : NaN;
}

/**
 * The part's answer, as the engine gave it: `{ values: [...], ok }`, one
 * value for each path in `find`. `ok` is false when the engine has nothing
 * there (a meeting that never happens), and the strip says so instead.
 */
export function answerOf(part, solved) {
  // an expression the engine typeset (a position t hours after the turn): shown as it is
  if (part.expr) { const html = pick(solved, part.expr); return { values: [], ok: typeof html === 'string' && html.length > 0, html }; }
  if (!part.find) return { values: [], ok: true };    // a sketch: the stage is the answer
  const paths = Array.isArray(part.find) ? part.find : [part.find];
  const values = paths.map((p) => value(solved, p));
  return { values, ok: values.length > 0 && values.every((v) => typeof v === 'boolean' || isFinite(v)) };
}

/**
 * The part's moment on the clock: `{ t }`, or `{ t, span: [t1, t2] }` for an
 * interval. `at` may be a path, a number of seconds or 'end'; left out, it is
 * the answer itself when the answer is a time, else the end of the motion.
 * Always inside [0, tMax].
 */
export function momentOf(part, solved) {
  const tMax = solved?.f?.tMax ?? 0;
  const clamp = (t) => Math.min(Math.max(t, 0), tMax);
  const at = (p) => (p === 'end' ? tMax : value(solved, p));
  if (part.span) {
    const [a, b] = part.span.map(at);
    if (isFinite(a) && isFinite(b)) return { t: clamp(b), span: [clamp(a), clamp(b)] };
  }
  let t = part.at != null ? at(part.at) : NaN;
  if (!isFinite(t) && part.at == null && part.kind === 'time') {
    const v = answerOf(part, solved).values[0];
    if (isFinite(v)) t = v;
  }
  return { t: isFinite(t) ? clamp(t) : tMax };
}

/** Which of the working panel's steps answers the part, or -1. */
export function stepOf(part, steps) {
  if (typeof part.step === 'number') return part.step < steps.length ? part.step : -1;
  if (!part.step) return -1;
  const want = String(part.step).toLowerCase();
  const plain = (s) => String(s ?? '').replace(/<[^>]+>/g, '').toLowerCase();
  return steps.findIndex((s) => plain(s.title).includes(want));
}

/**
 * The boxes part `k` is solved with: the student's boxes, then every part up
 * to and including k adds its `given`, and its `carry` puts an earlier part's
 * answer — the engine's, from `answers` — into a box. Returns the boxes and
 * which ones were carried, `{ boxes, carried: [{ box, from, value }] }`.
 */
export function partBoxes(base, parts, k, answers = {}) {
  const boxes = { ...base }, carried = [];
  (parts || []).slice(0, k + 1).forEach((p) => {
    if (p.out) return;
    Object.assign(boxes, p.given || {});
    for (const [box, from] of Object.entries(p.carry || {})) {
      const v = answers[from]?.values?.[0];
      if (isFinite(v)) { boxes[box] = v; carried.push({ box, from, value: v, here: p === parts[k] }); }
    }
  });
  return { boxes, carried };
}

/** Whether two sets of boxes would solve the same. */
export const sameBoxes = (a, b) => {
  const ka = Object.keys(a || {}), kb = Object.keys(b || {});
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

/** The labels of the earlier parts this one leans on, carried or used. */
export const leansOn = (part) => [...new Set([...(part.uses || []), ...Object.values(part.carry || {})])];

/**
 * Every part solved in turn, by the kit's own engine: `solveBoxes(boxes)` is
 * `K.solve(K.read(boxes))`. A part whose boxes are the same as the one before
 * shares that part's solution rather than solving again, so the stage stays
 * on one motion until a part changes it.
 * @returns [{ part, k, boxes, carried, solved, answer, moment }] — null for an `out` part
 */
export function walk(solveBoxes, base, parts) {
  const answers = {}, runs = [];
  let prev = null;
  (parts || []).forEach((p, k) => {
    if (p.out) { runs.push(null); return; }
    const { boxes, carried } = partBoxes(base, parts, k, answers);
    const solved = prev && sameBoxes(prev.boxes, boxes) ? prev.solved : solveBoxes(boxes);
    const answer = solved?.ok ? answerOf(p, solved) : { values: [], ok: false };
    answers[p.label] = answer;
    const run = { part: p, k, boxes, carried, solved, answer, moment: solved?.ok ? momentOf(p, solved) : null };
    runs.push(run); prev = run;
  });
  return runs;
}

/* A part with a set-up of its own (see readInto in js/app.js): its label as the
   reader parts are labelled, whether it has one, and the reading it opens. */
export const labelOf = (p) => String(p?.label ?? '').replace(/[^A-Za-z0-9]/g, '').toLowerCase().slice(0, 5);
export const ownScene = (p) => p && typeof p === 'object' && ((p.scene && typeof p.scene === 'object') || (p.recipe && typeof p.recipe === 'object'));
/** A part's own reading: the question's, with what the part changes — or a whole one of its own. */
export function sceneOf(x, p) {
  const { scene, recipe, ...part } = p;
  const sc = recipe ? { scenario: 'compose', recipe } : { ...scene };
  const base = { understood: true, confidence: x.confidence, summary: typeof p.asks === 'string' && p.asks ? p.asks : x.summary, parts: [part] };
  if (sc.scenario || sc.library) return { ...sc, ...(sc.library && !sc.scenario ? { scenario: 'library' } : {}), ...base };
  const top = { ...x };
  for (const k of ['parts', 'summary', 'note', 'example']) delete top[k];
  // "at twice the speed, with the same deceleration": the rate the engine found for the
  // first motion, not its time — the time is what changes
  if (top.scenario === 'road' && /\bsame (de|ac)celeration\b|\bsame (rate|braking)\b/i.test(`${p.asks || ''} ${x.words || ''}`)
      && ('u' in sc || 'v' in sc) && !('a' in sc) && !('t' in sc)) {
    const r = toApp(top), g = r.ok ? r.given : null;
    const first = g ? solveRoad({ s: g.s, u: g.u, v: g.v, a: g.g, t: g.t }) : null;
    if (first?.ok) { delete top.t; delete top.s; return { ...top, a: first.params.a, ...sc, ...base }; }
  }
  if (top.scenario === 'library') return { ...top, ...base, boxes: { ...(top.boxes || {}), ...(sc.boxes || sc) } };
  if (top.scenario === 'compose') return { ...top, ...base, recipe: { ...top.recipe, numbers: { ...(top.recipe?.numbers || {}), ...(sc.numbers || sc) } } };
  return { ...top, ...sc, ...base };
}
