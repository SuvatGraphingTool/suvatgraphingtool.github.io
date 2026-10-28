// blueprint.js — what the whiteboard is asked to build, and the engine's answer.
//
// THE MODEL LAYS OUT; THE ENGINE CALCULATES. Asked in board mode, the reader
// (worker/src/schema.js, BOARD_PROMPT) returns the same flat reading it always
// does for the main object, plus four things only a board needs:
//
//   title    a heading for the board, a few words
//   frames   which of the ready-made pieces to put on it, in order
//   notes    sticky notes: assumptions, a hint, the idea behind it — prose
//   others   up to two more objects in the same situation, each a reading
//
// Nothing the model sends is a result. Each object goes through toApp
// (js/core/question.js), exactly as a chat question does, and then through
// the engine that scenario uses — solveLaunch, solveRoad or solveDescent —
// so every number on the board is one the engine worked out. CLAUDE.md rule 4.
//
// Pure: no DOM, no network. test/blueprint.test.mjs runs it in node.

import { toApp } from '../core/question.js';
import { solveLaunch } from '../core/solve.js';
import { trajectory } from '../core/trajectory.js';
import { flight, timeAbove } from '../core/projectile.js';
import { solveRoad, roadWorking } from '../core/road.js';
import { solveDescent, descentWorking } from '../core/descent.js';
import { intercept } from '../core/intercept.js';
import { byId } from '../scenarios.js';
import { buildWorking } from '../working.js';

/** The ready-made pieces a board can hold, in the order a board opens on. */
export const FRAMES = ['scene', 'given', 'answers', 'graph-s', 'graph-v', 'graph-a', 'working', 'notes'];
const MAX_OTHERS = 2;
const MAX_NOTES = 4;
const NOTE_CHARS = 280;

const isNum = (x) => typeof x === 'number' && isFinite(x);
const text = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '');

/**
 * The model's answer, checked and trimmed into what the board will build.
 * @returns {{ok:true, title, summary, frames, notes, objects:[{label, x}]}
 *          |{ok:false, error, chat?}}
 */
export function readBlueprint(x) {
  if (!x || typeof x !== 'object') return { ok: false, error: 'Nothing came back from the reader.' };
  if (x.understood === false) {
    return x.note
      ? { ok: false, error: String(x.note), chat: true }
      : { ok: false, error: 'That did not read as something moving. Describe what is thrown, dropped or driven, and the numbers.' };
  }
  const { title, frames, notes, others, label, ...main } = x;

  // Only pieces the board has, each once, with the picture always first:
  // a board about a motion that does not show the motion is a list.
  let want = Array.isArray(frames) ? frames.filter((f) => FRAMES.includes(f)) : [];
  want = [...new Set(['scene', ...want, 'given', 'answers'])];
  if (want.length <= 3) want = [...FRAMES];

  const say = (Array.isArray(notes) ? notes : [])
    .map((n) => text(typeof n === 'string' ? n : n?.text, NOTE_CHARS)).filter(Boolean).slice(0, MAX_NOTES);
  // A note written is a note shown; none written, no empty sticky.
  if (say.length) want.push('notes'); else want = want.filter((f) => f !== 'notes');
  want = FRAMES.filter((f) => want.includes(f));

  const objects = [{ label: text(label, 40) || 'it', x: main }];
  // A composed scenario's companion (js/compose/registry.js) is already its
  // second object, flown beside it; listed again in others it would be drawn twice.
  const paired = main.scenario === 'composed' && Array.isArray(main.recipe?.pieces)
    && main.recipe.pieces.some((p) => ['released-beside', 'drops-from-target'].includes(p?.piece));
  for (const o of (paired ? [] : Array.isArray(others) ? others : []).slice(0, MAX_OTHERS)) {
    if (!o || typeof o !== 'object') continue;
    const { label: l, ...rest } = o;
    objects.push({ label: text(l, 40) || `object ${objects.length + 1}`,
                   x: { understood: true, confidence: main.confidence, ...rest } });
  }

  return {
    ok: true,
    title: text(title, 80) || text(main.summary, 80) || 'A motion, set out',
    summary: text(main.summary, 240),
    frames: want, notes: say, objects,
  };
}

/**
 * One object, solved by the engine its scenario uses.
 *
 * @param x      the flat reading for this object
 * @param edits  what the student has changed on the board since:
 *               { given: {s,u,v,g,t}, theta, h } — a value of null clears one
 * @returns {{ok, reading, scenario, solved, traj, second, markers, steps, above, reason?}}
 */
export function solveObject(x, edits = {}) {
  const reading = toApp(x);
  if (!reading.ok) return { ok: false, reason: reading.error, chat: reading.chat, reading: null };
  const sc = byId(reading.id);

  // Where the screens start: empty boxes, except that the two experiments
  // seed their own numbers (seedExhibit in js/app.js) and the reading wins.
  const seed = sc.exhibit && sc.seed ? sc.seed : {};
  const given = { ...(isNum(seed.u) ? { u: seed.u } : {}), ...(isNum(seed.g) ? { g: seed.g } : {}),
                  ...(sc.noAngle ? { u: 0 } : {}), ...reading.given };
  for (const [k, v] of Object.entries(edits.given || {})) {
    if (v == null || v === '') delete given[k]; else if (isNum(v)) given[k] = v;
  }
  const theta = edits.theta !== undefined ? edits.theta : reading.theta;
  const h = edits.h !== undefined ? edits.h : (reading.h ?? seed.h);
  const markers = JSON.parse(JSON.stringify(sc.markers || {}));
  if (reading.markers?.heightLine != null) markers.heightLine = reading.markers.heightLine;
  if (reading.markers?.target) markers.target = reading.markers.target;

  const base = { ok: false, reading, scenario: sc, given, theta, h, markers, descentEdits: edits.descent || {},
                 traj: null, second: null, steps: [], above: null };

  // ALONG A ROAD: the five, and nothing else.
  if (sc.road) {
    const solved = solveRoad({ s: given.s, u: given.u, v: given.v, a: given.g, t: given.t, mark: reading.mark });
    if (!solved.ok) return { ...base, solved, reason: solved.reason };
    const m = solved.moment ? { mark: { s: solved.moment.s, t: solved.moment.t, mid: solved.moment.mid } } : {};
    return { ...base, ok: true, solved, traj: solved.f, markers: m, steps: roadWorking(solved) };
  }

  // A PARACHUTE: three phases, each one of them SUVAT.
  if (sc.descent) {
    const solved = solveDescent({ h, g: given.g, ...reading.descent, ...(edits.descent || {}) });
    if (!solved.ok) return { ...base, solved, reason: solved.reason };
    return { ...base, ok: true, solved, traj: solved.f, steps: descentWorking(solved.f, solved.f.tMax) };
  }

  // EVERYTHING ELSE IS A LAUNCH, exactly as recompute() in js/app.js sets it.
  const k = { ...given, theta, h };
  if (sc.noAngle) { k.u = 0; delete k.theta; }
  if (sc.lockAngle) k.theta = sc.params.theta;
  if (sc.aimAtTarget && markers.target && edits.theta === undefined) {
    k.theta = (Math.atan2(markers.target.y - (h ?? 0), markers.target.x) * 180) / Math.PI;
  }
  const solved = solveLaunch(k, { noAngle: sc.noAngle, lockAngle: sc.lockAngle || sc.aimAtTarget });
  if (!solved.ok) return { ...base, solved, reason: solved.reason };

  let traj = trajectory({ ...solved.params });
  let second = secondOf(sc, solved.params, markers);
  let verdict = null;
  if (sc.aimAtTarget && markers.target && second) {
    verdict = intercept(traj, markers.target, solved.params.g);
    if (verdict.kind === 'caught') { traj = endAt(traj, verdict.t); second = endAt(second, verdict.t); }
  }
  const above = sc.dragLine && markers.heightLine != null
    ? { line: markers.heightLine, ...timeAbove(traj, markers.heightLine) } : null;
  return { ...base, ok: true, solved, traj, second, verdict, above, steps: buildWorking(traj, traj.tMax) };
}

/**
 * Every object on the board, solved, and the clock they share: the longest
 * of their flights, so the scrubber reaches the end of every one of them.
 */
export function solveBoard(bp, edits = []) {
  const objects = bp.objects.map((o, i) => ({ label: o.label, ...solveObject(o.x, edits[i]) }));
  const tMax = Math.max(0, ...objects.filter((o) => o.ok).map((o) => o.traj.tMax));
  return { objects, tMax };
}

/* The scenario's own second object — the bullet let go, the monkey falling —
   derived from the first, as buildSecond does in js/app.js. */
function secondOf(sc, p, markers) {
  const s = sc.second;
  if (!s) return null;
  const q = s.from ? s.from(p, markers) : s;
  if (!q) return null;
  const f = flight({ u: q.u, theta: q.theta, h: q.h ?? 0, g: p.g });
  return q.x0 ? shift(f, q.x0) : f;
}

/** The same flight, started x0 metres along — js/app.js's shift(). */
function shift(f, x0) {
  const move = (p) => ({ ...p, x: p.x + x0 });
  return { ...f, x0,
    pos: (t) => move(f.pos(t)),
    path: (n, tEnd) => f.path(n, tEnd).map(move),
    ticks: (n, tEnd) => f.ticks(n, tEnd).map(move),
    range: f.range + x0 };
}

/** The same flight, stopped early. Nothing is re-modelled; the clock is cut. */
function endAt(f, tEnd) {
  const T = Math.min(tEnd, f.tMax);
  const reach = f.pos(T).x;
  return { ...f, tMax: T, tFlight: Math.min(f.tFlight, T), range: reach,
    pos: (t) => f.pos(Math.min(t, T)),
    vel: (t) => f.vel(Math.min(t, T)),
    path: (n, e = T) => f.path(n, Math.min(e, T)),
    ticks: (n, e = T) => f.ticks(n, Math.min(e, T)) };
}
