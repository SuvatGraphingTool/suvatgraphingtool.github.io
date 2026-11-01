// parts/answers.js — what a part from Ask Suvat can be answered with.
//
// The reader (worker/src/schema.js) splits a question into its parts and, for
// each one, names an answer KEY from a list it is given: for a library
// scenario, the labels of that scenario's own `parts`; for the original
// projectile and road scenarios, the keys below. This file turns the reader's
// parts into parts in the format of design/components.md, so the strip steps
// through them exactly as it steps through a library scenario's own. The
// reader never writes a number into an answer; it only says which one.

import { byId } from '../scenarios.js';

/** The answers the original twelve can give, by key. Paths are into the
    launch (or road) solution with the flight as `f`. */
export const LAUNCH_ANSWERS = [
  { key: 'flight', kind: 'time', say: 'time of flight', find: 'f.tFlight', sym: 't', unit: 's', at: 'end', step: 'time of flight' },
  { key: 'top', kind: 'height', say: 'greatest height above the GROUND (not above the launch)', find: 'f.apexHeight', sym: 'H', unit: 'm', at: 'f.tApex', step: 'greatest height' },
  { key: 'rise', kind: 'height', say: 'greatest height above the point it was launched from', find: 'f.apexRise', sym: 'H', unit: 'm', at: 'f.tApex', step: 'greatest height' },
  { key: 'tTop', kind: 'time', say: 'time to the greatest height', find: 'f.tApex', sym: 't', unit: 's', at: 'f.tApex', step: 'greatest height' },
  { key: 'range', kind: 'distance', say: 'horizontal distance to where it lands', find: 'f.range', sym: 'x', unit: 'm', at: 'end', step: 'horizontal' },
  { key: 'vLand', kind: 'speed', say: 'speed as it lands', find: 'f.vLanding', unit: 'm s^-1', at: 'end', step: 'time of flight' },
  { key: 'u', kind: 'speed', say: 'speed of projection', find: 'params.u', sym: 'u', unit: 'm s^-1', at: 0 },
  { key: 'theta', kind: 'angle', say: 'angle of projection', find: 'params.theta', sym: 'theta', suffix: '°', dp: 1, at: 0 },
];
export const ROAD_ANSWERS = [
  { key: 's', kind: 'distance', say: 'the distance between the two points', find: 'five.s.value', sym: 's', unit: 'm', at: 'end' },
  { key: 'u', kind: 'speed', say: 'the velocity at the first point', find: 'five.u.value', sym: 'u', unit: 'm s^-1', at: 0 },
  { key: 'v', kind: 'speed', say: 'the velocity at the second point', find: 'five.v.value', sym: 'v', unit: 'm s^-1', at: 'end' },
  { key: 'a', kind: 'acceleration', say: 'the acceleration', find: 'five.a.value', sym: 'a', unit: 'm s^-2', at: 'end' },
  { key: 't', kind: 'time', say: 'the time between the two points', find: 'five.t.value', sym: 't', unit: 's', at: 'end' },
];

/**
 * The answer list a scenario offers the reader: `[{ key, say }]`, or none. A
 * library scenario offers what its own parts answer, then its `answers` (more
 * outputs, in the same shape, that other papers ask for). Keys are the kind,
 * numbered when a kind comes twice — speed1, speed2 — so the reader cannot
 * mistake one for a part's label or a box.
 */
export function answersFor(s) {
  if (!s) return [];
  if (s.kit) {
    const all = [...(s.parts || []).filter((p) => !p.out), ...(s.answers || [])];
    const count = {}, seen = {};
    for (const p of all) count[p.kind] = (count[p.kind] || 0) + 1;
    return all.map((p) => {
      seen[p.kind] = (seen[p.kind] || 0) + 1;
      return { key: count[p.kind] > 1 ? `${p.kind}${seen[p.kind]}` : p.kind, kind: p.kind, say: p.ask || p.say, part: p };
    });
  }
  if (s.road) return ROAD_ANSWERS;
  if (s.descent) return [];
  return LAUNCH_ANSWERS;
}

/** Every box a kit shows, with the rows that come and go with a choice, for every option. */
export function boxesOf(K, ex = {}) {
  const rowsOf = (v) => (typeof K.rows === 'function' ? K.rows(v) : (K.rows || [])).flatMap((r) => r.fields || []);
  let rowFields = rowsOf(ex);
  for (const f of [...K.fields, ...rowFields].filter((x) => x.type === 'choice' && x.options)) {
    for (const o of f.options) rowFields = rowFields.concat(rowsOf({ ...ex, [f.key]: o.v }));
  }
  const seen = new Set();
  return [...K.fields, ...rowFields].filter((f) => !seen.has(f.key) && seen.add(f.key));
}

const clip = (x, n) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const isNum = (x) => typeof x === 'number' && isFinite(x);

/**
 * The reader's parts, as parts the strip steps through. Each reader part is
 * `{ label, asks, answer, given?, uses? }`. A part whose `answer` is not one
 * the scenario offers keeps its question and says the stage cannot give it
 * on its own. `boxes` are the keys a part's `given` may set (a library
 * scenario's boxes); the original twelve take no givens per part.
 */
export function fromReader(id, raw, boxes = []) {
  const s = byId(id);
  if (!s || !Array.isArray(raw)) return null;
  const offer = answersFor(s);
  const out = [];
  for (const r of raw.slice(0, 8)) {
    if (!r || typeof r !== 'object') continue;
    const label = clip(r.label, 5).replace(/[^A-Za-z0-9]/g, '').toLowerCase() || String.fromCharCode(97 + out.length);
    if (out.some((p) => p.label === label)) continue;
    // the key it named; else, when it named none that exists, the one answer
    // of the kind its words ask for — a sketch, or the only speed there is
    const words = String(r.asks ?? '').toLowerCase();
    const only = (k) => { const m = offer.filter((a) => a.kind === k); return m.length === 1 ? m[0] : null; };
    // a kind named for a key ("time" where the key is "meeting"), and "when do they
    // meet / catch up / draw level" — the one meeting there is
    const meets = /\b(when|catch(es)?|meet|level|overtakes?|pass(es)?|collide)\b/.test(words);
    const named = ['speed', 'time', 'height', 'distance', 'acceleration', 'angle'].filter((k) => words.includes(k));
    const asKind = (k) => only(k) || (k === 'time' && meets ? only('meeting') : null);
    const hit = offer.find((a) => a.key === r.answer)
      || (/sketch|graph/.test(words) ? only('graph') : null)
      || (typeof r.answer === 'string' ? asKind(r.answer.replace(/\d+$/, '')) : null)
      || named.map(asKind).find(Boolean)
      // "when does A catch B", with no other kind asked for
      || (meets && !named.some((k) => k !== 'time') && !/^(speed|height|distance|acceleration|angle)/.test(r.answer || '') ? only('meeting') : null);
    const base = hit ? (hit.part || hit) : null;
    const p = base
      // with no words of its own, a part says what it is — never another paper's numbers
      ? { ...base, label, ask: clip(r.asks, 160) || (hit.say && !/\d/.test(hit.say) ? hit.say : `The ${base.kind}`), prose: true }
      : { label, kind: 'other', ask: clip(r.asks, 160) || 'This part', prose: true };
    // a sketch read from another paper says only where it is drawn
    if (base?.kind === 'graph') p.say = 'It is drawn on the stage: the graphs are the motion the engine found.';
    delete p.key; delete p.part; delete p.paper; delete p.tol; delete p.given; delete p.carry;
    if (!base) p.say = 'Not one this app works out for you — it may need another topic. The stage, the working and the graphs show the motion it is about.';
    // every part's own answer is the engine's; a reader part's `uses` only says so
    p.uses = Array.isArray(r.uses) ? r.uses.map((x) => clip(x, 5).toLowerCase()).filter((x) => out.some((q) => q.label === x)) : [];
    if (!p.uses.length) delete p.uses;
    if (s.kit && r.given && typeof r.given === 'object') {
      const g = Object.fromEntries(Object.entries(r.given).filter(([k, v]) => boxes.includes(k) && (isNum(v) || typeof v === 'string')));
      if (Object.keys(g).length) p.given = g;
    }
    out.push(p);
  }
  return out.length ? out : null;
}
