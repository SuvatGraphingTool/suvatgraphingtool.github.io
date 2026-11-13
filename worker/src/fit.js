// fit.js — does a reading fit the question it was read from?
//
// The user, 13 Nov: a cricket ball hit at 23.8 m s⁻¹ at 50° towards a fielder
// 55.0 m away came back as From the bridge, to the runner — the ball's speed
// in the runner's box, the 55 m in a box of seconds, the 3 m as a drop below
// the throw, the angle nowhere — and the app flew a cricket ball 3.7 km high
// for 55 s. Not a sentence to patch: a RULE, held in code, for every reading
// of a typed question.
//
//   1. A number goes only into a box of its own kind: a speed into a speed, a
//      length into a length, seconds into a time, degrees into an angle.
//   2. Every number in a reading is one the question gives (or a plain
//      conversion of one, or a zero, a right angle, a g the app knows).
//   3. A speed or an angle the question gives is used somewhere.
//
// A reading that breaks one is asked for again, once, with what was wrong
// (index.js). What is still wrong after that is taken out, so the app asks the
// student for it rather than drawing nonsense; and a library reading that
// still puts a number in the wrong kind of box gives way to the plain throw
// the question describes, when it gives one speed and one angle.
//
// Nothing is calculated here (rule 4): values are checked and moved, never made.

import { LIBRARY_GUIDE } from './library.js';

/* ── kinds of quantity ──────────────────────────────────────────────────── */
// The order matters: an acceleration before a speed, a speed before a length.
const UNITS = [
  ['accel', /^\s*(?:met(?:re|er)s?\s+(?:a|per)\s+second\s+(?:squared|per\s+second)|m\s*s\s*(?:\^?\s*-|−|⁻)\s*2|m\s*s⁻²|m\s*\/\s*s\s*(?:²|\^?\s*2)|ms\s*(?:-|⁻)\s*2)/i],
  ['speed', /^\s*(?:m\s*s\s*(?:\^?\s*-|−|⁻)\s*1|m\s*s⁻¹|m\s*\/\s*s\b|ms\s*(?:-|⁻)\s*1|ms\b|mps\b|met(?:re|er)s?\s+(?:a|per)\s+second|km\s*\/?\s*h(?:r|our)?\b|km\s*h\s*(?:-|⁻)\s*1|kph\b|mph\b|miles?\s+(?:an|per)\s+hour)/i],
  ['angle', /^\s*(?:°|º|deg(?:ree)?s?\b)/i],
  ['time', /^\s*(?:s\b|secs?\b|seconds?\b|minutes?\b|mins?\b|hours?\b|hrs?\b)/i],
  ['length', /^\s*(?:m\b|met(?:re|er)s?\b|cm\b|centimet(?:re|er)s?\b|km\b|kilomet(?:re|er)s?\b|mm\b)/i],
  ['mass', /^\s*(?:kg\b|kilograms?\b|grams?\b|tonnes?\b)/i],
  ['force', /^\s*(?:N\b|newtons?\b|kN\b)/],
];
const NUMBER = /(?<![\w.])[-−]?\d+(?:\.\d+)?/g;

/** Every number a text gives, with the kind of quantity its unit says (null: no unit). */
export function numbersIn(text) {
  const s = String(text || '').replace(/(\d),(\d{3})\b/g, '$1$2');
  const out = [];
  for (const m of s.matchAll(NUMBER)) {
    const value = Number(m[0].replace('−', '-'));
    if (!isFinite(value)) continue;
    const after = s.slice(m.index + m[0].length, m.index + m[0].length + 30);
    const kind = UNITS.find(([, re]) => re.test(after))?.[0] || null;
    out.push({ value, kind });
  }
  return out;
}

/* ── what kind of quantity each box takes ───────────────────────────────── */
const KIND_OF_UNIT = (u) => {
  const t = u.trim();
  if (/^m s⁻²$|^m s\^-2$/.test(t)) return 'accel';
  if (/^m s⁻¹$|^m s\^-1$|^km h⁻¹$/.test(t)) return 'speed';
  if (/^°$/.test(t)) return 'angle';
  if (/^(s|min|h)$/.test(t)) return 'time';
  if (/^(m|cm|km|mm)$/.test(t)) return 'length';
  if (/^(kg|g|t)$/.test(t)) return 'mass';
  if (/^(N|kN)$/.test(t)) return 'force';
  return null;
};
/** library id → { box: kind }, from the boxes the reader is told each takes. */
export const BOX_KINDS = (() => {
  const out = {};
  for (const block of LIBRARY_GUIDE.split(/\n(?=[a-z0-9-]+ — )/)) {
    const id = block.slice(0, block.indexOf(' — '));
    const line = /^\s*boxes: (.*)$/m.exec(block)?.[1] || '';
    const kinds = {};
    let open = false;     // a number box with no unit: it might take anything
    for (const part of line.split(/; (?=[A-Za-z][\w.]* = )/)) {
      const key = /^([A-Za-z][\w.]*) = /.exec(part.trim())?.[1];
      const m = /^([A-Za-z][\w.]*) = .*\(([^()]*)\)\s*$/.exec(part.trim());
      const k = m && KIND_OF_UNIT(m[2]);
      if (k) kinds[m[1]] = k;
      else if (key && key !== 'g' && !/\[[^\]]*\|[^\]]*\]/.test(part)) open = true;
    }
    Object.defineProperty(kinds, 'open', { value: open });
    out[id] = kinds;
  }
  return out;
})();
/** The twelve's fields, and a composed recipe's numbers. */
const FIELD_KINDS = {
  u: 'speed', v: 'speed', vTerm: 'speed',
  t: 'time', tOpen: 'time', atTime: 'time',
  s: 'length', h: 'length', apexAboveLaunch: 'length', heightLine: 'length', targetX: 'length', targetY: 'length', atDisplacement: 'length', sInSecond: 'length',
  angleDegrees: 'angle', theta: 'angle',
  a: 'accel', aChute: 'accel',
};

/* ── the rule ───────────────────────────────────────────────────────────── */
const same = (a, b) => Math.abs(Math.abs(a) - Math.abs(b)) <= 1e-9 * Math.max(1, Math.abs(b));
const SCALES = [1000, 100, 60, 3600, 3.6];
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100, half: 0.5, quarter: 0.25, twice: 2, double: 2 };

/** Every value a reading puts anywhere: [{ where, key, value, kind }]. */
function valuesOf(x) {
  const out = [];
  const add = (where, obj, kinds) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'number' && isFinite(value)) out.push({ where, key, value, kind: kinds[key] || kinds[key.split('.').pop()] || null });
    }
  };
  if (x.scenario === 'library') add('boxes', x.boxes, BOX_KINDS[x.library] || {});
  else if (x.scenario === 'compose') add('numbers', x.recipe?.numbers, FIELD_KINDS);
  else add('fields', x, FIELD_KINDS);
  for (const [i, p] of (Array.isArray(x.parts) ? x.parts : []).entries()) {
    if (!p || typeof p !== 'object') continue;
    const lib = p.scene?.library || x.library;
    add(`parts.${i}.given`, p.given, x.scenario === 'library' ? BOX_KINDS[lib] || {} : FIELD_KINDS);
    add(`parts.${i}.scene.boxes`, p.scene?.boxes, BOX_KINDS[lib] || {});
  }
  return out;
}

/**
 * What is wrong with a reading of this text, by the three rules above.
 * @param now   what the student said last: the question whose speeds and angles must be used
 * @returns [{ rule: 'kind'|'given'|'unused', key?, value, kind?, saidAs? }] — empty when it fits
 */
export function misfit(x, text, now = text) {
  if (!x || !x.understood || x.example || !String(text || '').trim()) return [];
  if (!['library', 'compose'].includes(x.scenario) && !FIELD_KINDS_SCENARIOS.has(x.scenario)) return [];
  const given = numbersIn(text);
  if (!given.length) return [];
  const lower = String(text).toLowerCase();
  const spelled = new Set(Object.entries(WORDS).filter(([w]) => new RegExp(`\\b${w}\\b`).test(lower)).map(([, n]) => n));
  const problems = [];
  const values = valuesOf(x);
  for (const v of values) {
    if (v.key === 'g' && [9.8, 9.81, 10, 9.807, 9.80665].some((n) => same(v.value, n))) continue;
    if (v.value === 0 || v.value === 1 || (v.kind === 'angle' && [90, 180].some((n) => same(v.value, n)))) continue;
    const hits = given.filter((n) => same(n.value, v.value));
    if (hits.length) {
      // said with a unit of another kind, and never without one or with its own
      if (v.kind && hits.every((n) => n.kind && n.kind !== v.kind)) problems.push({ rule: 'kind', key: v.key, where: v.where, value: v.value, kind: v.kind, saidAs: hits[0].kind });
      continue;
    }
    if (spelled.has(Math.abs(v.value))) continue;
    if (given.some((n) => SCALES.some((k) => same(n.value * k, v.value) || same(n.value / k, v.value)))) continue;
    problems.push({ rule: 'given', key: v.key, where: v.where, value: v.value, kind: v.kind });
  }
  // a speed or an angle the question gives, and a scenario with nowhere to
  // put one: the From the bridge that was handed a 50° throw
  const room = x.scenario === 'library' ? (BOX_KINDS[x.library]?.open ? null : new Set(Object.values(BOX_KINDS[x.library] || {})))
    : x.scenario === 'road' ? new Set(['speed', 'time', 'length', 'accel'])
      : x.scenario === 'compose' ? null : new Set(['speed', 'angle', 'time', 'length', 'accel']);
  for (const n of room ? numbersIn(now) : []) {
    if (n.kind !== 'speed' && n.kind !== 'angle') continue;
    if (room.has(n.kind)) continue;
    if (values.some((v) => same(v.value, n.value) || SCALES.some((k) => same(n.value * k, v.value) || same(n.value / k, v.value)))) continue;
    if (problems.some((p) => p.rule === 'unused' && same(p.value, n.value))) continue;
    problems.push({ rule: 'unused', value: n.value, kind: n.kind });
  }
  return problems;
}
const FIELD_KINDS_SCENARIOS = new Set(['up', 'arc', 'dropped', 'down', 'platform', 'platform-angle', 'platform-down', 'time-above', 'parachute', 'bullet', 'monkey', 'road']);

const SAY = { speed: 'a speed', angle: 'an angle', length: 'a length', time: 'a time', accel: 'an acceleration', mass: 'a mass', force: 'a force' };
/** What to tell the model when its reading broke the rule: one line a problem. */
export function feedback(problems, x) {
  const lines = problems.map((p) => p.rule === 'kind'
    ? `- ${p.value} is ${SAY[p.saidAs]} in the question, but you put it in "${p.key}", which takes ${SAY[p.kind]}.`
    : p.rule === 'given'
      ? `- ${p.value} in "${p.key}" is not a number the question gives.`
      : `- The question gives ${SAY[p.kind]}, ${p.value}, and the scenario you chose has no box for one.`);
  return `Check your reading against the question. It does not fit:\n${lines.join('\n')}\n`
    + 'A number goes only into a box of its own kind, every number must be one the question gives, and the speed and the angle it gives must have a box to go in. '
    + `If ${x?.scenario === 'library' ? `library "${x.library}"` : 'the scenario you chose'} has no box for what the question gives, it is the wrong scenario: `
    + 'choose the one the question describes — one plain projectile is one of the twelve (arc from the ground). Answer with the whole reading again, as JSON.';
}

/** The reading with every value the rule rejects taken out, so the app asks for it. */
export function strip(x, problems) {
  const bad = problems.filter((p) => p.rule !== 'unused' && p.where);
  if (!bad.length) return x;
  const out = structuredClone(x);
  for (const p of bad) {
    const path = p.where === 'fields' ? [] : p.where.split('.');
    let obj = out;
    if (p.where === 'numbers') obj = out.recipe?.numbers;
    else for (const k of path) obj = obj?.[k];
    if (obj && typeof obj === 'object') delete obj[p.key];
  }
  return out;
}

/**
 * A library reading that still puts a number in the wrong kind of box, when
 * the question gives one speed and one angle: the plain throw it describes,
 * from the ground, said as an assumption. Otherwise null.
 */
export function plainThrow(x, problems, text, lang = 'en') {
  // a number in a box of another kind; or an angle given to a scenario with no
  // box for one (a "show that" may give a speed only to be shown, never an angle)
  if (x?.scenario !== 'library' || !problems.some((p) => p.rule === 'kind' || (p.rule === 'unused' && p.kind === 'angle'))) return null;
  const given = numbersIn(text);
  const speeds = [...new Set(given.filter((n) => n.kind === 'speed').map((n) => n.value))];
  const angles = [...new Set(given.filter((n) => n.kind === 'angle').map((n) => n.value))];
  if (speeds.length !== 1 || angles.length !== 1 || !(speeds[0] > 0) || !(angles[0] > 0 && angles[0] < 90)) return null;
  const out = { understood: true, confidence: 'medium', scenario: 'arc', u: speeds[0], angleDegrees: angles[0], h: 0,
    summary: lang === 'ar' ? `قُذف بسرعة ${speeds[0]} م/ث بزاوية ${angles[0]}° من سطح الأرض.` : `Launched at ${speeds[0]} m/s at ${angles[0]}° from the ground.`,
    note: lang === 'ar' ? 'لا يطابق هذا سؤال امتحان بعينه، فهذه هي الرمية نفسها، من سطح الأرض.'
      : 'No past paper matches this exactly, so here is the throw itself, from the ground.' };
  for (const k of ['title', 'who', 'sender', 'paper', 'g']) if (x[k] != null) out[k] = x[k];
  return out;
}
