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
  { key: 'flight', kind: 'time', say: 'time of flight, until it lands', find: 'f.tFlight', sym: 't', unit: 's', at: 'end', step: 'time of flight' },
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
  // the moment the question times: its mid-point, or a mark it names
  { key: 'tMid', kind: 'time', say: 'the time from the first point to the mid-point (or the mark)', find: 'moment.t', sym: 't', unit: 's', at: 'moment.t' },
  { key: 'vMid', kind: 'speed', say: 'the speed at the mid-point (or the mark)', find: 'moment.v', sym: 'v', unit: 'm s^-1', at: 'moment.t' },
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
    // an answer may carry its own key, so one added later never renumbers the
    // keys readings already use (the composer's distance stays "distance")
    const count = {}, seen = {};
    for (const p of all) if (!p.key) count[p.kind] = (count[p.kind] || 0) + 1;
    return all.map((p) => {
      if (p.key) return { key: p.key, kind: p.kind, say: p.ask || p.say, part: p };
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
// words too common to tell two answers apart
const STOP = new Set(['what', 'when', 'where', 'which', 'find', 'from', 'that', 'this', 'with', 'their', 'there', 'they', 'does', 'will', 'into', 'than', 'then', 'show', 'value', 'time', 'speed', 'height', 'distance', 'ball', 'particle']);

// "how long is the ramp" is a distance; "how long until it lands" a time
const HOW = [[/\bhow (high|tall|deep)\b/, 'height'], [/\bhow far\b/, 'distance'], [/\bhow (fast|quickly)\b/, 'speed'],
  [/\bhow long (is|was) (the|a|an)\b/, 'distance'], [/\bhow long\b|\bhow many seconds\b/, 'time']];

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
    // the one answer of a kind — or, of several, the one whose own words the part's share
    // most: "greatest height" is the greatest height, not the height at 5 s. A tie is
    // kept as `either`: the reply may say it when every one of them comes to the same
    let tie = null;
    const only = (k) => {
      // the road's mid-point answers only where a mid-point or a mark is asked about
      // an answer with a `when` is offered only to the words it names ("the hoop")
      const m = offer.filter((a) => a.kind === k && (!/Mid$/.test(a.key || '') || /mid-?point|\bmark\b|halfway/.test(words))
        && (!a.part?.when || new RegExp(a.part.when, 'i').test(words)));
      // "how far away is the hoop": the hoop's distance, never where it lands — unless the answer is about a hoop
      const thing = /\bhow far away (?:is|are) (?:the|a|an) ([a-z]+)/.exec(words)?.[1];
      if (m.length < 2) return m[0] && (!thing || String(m[0].say || '').toLowerCase().includes(thing)) ? m[0] : null;
      // "how high does it go", "the highest point", "max height": the greatest height
      // and a "total" time or distance is the whole one
      const cue = `${words}${/\bhow high\b|\bhighest\b|\bmax(imum)? height\b/.test(words) ? ' greatest' : ''}${/\btotal\b/.test(words) ? ' whole' : ''}${/\bin the air\b/.test(words) ? ' flight' : ''}${/\b(hits?|reach(es)?|lands? on) the (floor|ground|water|sea|road|river)\b/.test(words) ? ' lands' : ''}`;
      const mine = new Set(cue.split(/[^a-z]+/).filter((w) => w.length > 3 && !STOP.has(w)));
      const score = m.map((a) => String(a.say || '').toLowerCase().split(/[^a-z]+/).filter((w) => mine.has(w)).length);
      const best = Math.max(...score);
      if (best > 0 && score.filter((x) => x === best).length === 1) return m[score.indexOf(best)];
      tie ??= m.filter((_, i) => score[i] === best);
      return null;
    };
    // a kind named for a key ("time" where the key is "meeting"), and "when do they
    // meet / catch up / draw level" — the one meeting there is
    const meets = /\b(when|catch(es)?|meet|level|overtakes?|pass(es)?|collide)\b/.test(words);
    // "the deceleration" or "the retardation" asks for the acceleration (deceleration does not contain the word)
    const named = ['speed', 'time', 'height', 'distance', 'acceleration', 'angle', 'impulse'].filter((k) => words.includes(k) || (k === 'acceleration' && /decelerat|retard/.test(words)));
    // a student's "how high", "how far", "how fast", "how long until": the kind, in their words
    // "when it hits the floor": a time, where there is no meeting to time
    const how = HOW.find(([re]) => re.test(words))?.[1] || (/^\s*when\b/.test(words) && !offer.some((a) => a.kind === 'meeting') ? 'time' : undefined);
    if (how && !named.includes(how)) named.push(how);
    const asKind = (k) => only(k) || (k === 'time' && meets ? only('meeting') : null);
    let hit = offer.find((a) => a.key === r.answer)
      || (/sketch|graph/.test(words) ? only('graph') : null)
      || (typeof r.answer === 'string' ? asKind(r.answer.replace(/\d+$/, '')) : null)
      || named.map(asKind).find(Boolean)
      // "when does A catch B", with no other kind asked for
      || (meets && !named.some((k) => k !== 'time') && !/^(speed|height|distance|acceleration|angle)/.test(r.answer || '') ? only('meeting') : null);
    // "when it is 5 m above the ground on its way down": a moment at a height, never the landing
    const atHeight = /\b\d+(?:\.\d+)?\s*m\s*(above|high|up)\b/.test(words) && /\bwhen\b|\bway (up|down)\b|\bpasses\b/.test(words);
    if (atHeight && hit && /\blands?\b|\blanding\b|in the air|time of flight/.test(String(hit.say || hit.part?.ask || '').toLowerCase())) hit = null;
    // a time or a speed "to the mid-point" is the moment's, whatever key was named
    if (/mid-?point|\bmark\b/.test(words) && (hit?.key === 't' || hit?.key === 'v')) hit = offer.find((a) => a.key === `${hit.key}Mid`) || hit;
    const base = hit ? (hit.part || hit) : null;
    const p = base
      // with no words of its own, a part says what it is — never another paper's numbers
      ? { ...base, label, ask: clip(r.asks, 160) || (hit.say && !/\d/.test(hit.say) ? hit.say : `The ${base.kind}`), prose: true }
      : { label, kind: 'other', ask: clip(r.asks, 160) || 'This part', prose: true };
    // a sketch read from another paper says only where it is drawn
    if (base?.kind === 'graph') p.say = 'The stage’s own graphs are the sketch: choosing this part opens them.';
    delete p.key; delete p.part; delete p.paper; delete p.when; delete p.tol; delete p.given; delete p.carry; delete p.example;
    if (!base) p.say = 'Not one this app works out for you — it may need another topic. The stage, the working and the graphs show the motion it is about.';
    if (!base && tie) p.either = tie.map((a) => { const q = { ...(a.part || a) }; delete q.key; delete q.part; delete q.paper; delete q.example; return q; });
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
