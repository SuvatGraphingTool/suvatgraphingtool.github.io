// notation.test.mjs — proves the maths is set as maths. Run with:
//     node test/notation.test.mjs
//
// Two halves, and the second is the one that matters.
//
//   1. The notation module itself: given this source, print exactly this.
//   2. A SWEEP of everything the app can actually put on screen — every
//      equation, every rearrangement, every substitution, every row of the
//      working, over a spread of scenarios — checked against a blacklist of
//      programmer's maths. If anybody ever writes (v^2 - u^2)/(2a) straight
//      into a string that reaches a student, this is what catches it.
//
// Adding a formula? You do not need to add a test. Add it through M`` and the
// sweep covers it. Add it as a raw string and the sweep fails. That is the
// whole point of the file.

import fs from 'node:fs';
import { mathHTML, mathText, num, signed } from '../js/notation.js';
import { EQUATIONS, solve } from '../js/core/suvat.js';
import { flight, derivation, timeAbove } from '../js/core/projectile.js';
import { solveLaunch } from '../js/core/solve.js';
import { buildWorking, resolveAt, obstacleCheck } from '../js/working.js';
import { solveDescent, descentWorking, resolveDescent } from '../js/core/descent.js';
import { descentPanes, plotSpec, PRE_SAY } from '../js/render/drop.js';
import { SCENARIOS, GROUPS } from '../js/scenarios.js';
import { toApp } from '../js/core/question.js';
import { readoutHTML, solutionHTML, proseHTML } from '../js/ai/readout.js';
import { trajectory } from '../js/core/trajectory.js';
import { solveRoad, roadWorking } from '../js/core/road.js';
import { readBlueprint, solveBoard } from '../js/board/blueprint.js';
import { solvePair, pairWorking } from '../js/core/pair.js';
import { solveJourney, journeyWorking } from '../js/core/journey.js';
import { solveOvertake, overtakeWorking } from '../js/core/overtake.js';
import { solvePlane, planeWorking } from '../js/core/plane.js';
import { solveTarget, targetWorking } from '../js/core/target.js';
import { KITS } from '../js/kits/index.js';
import { LIBRARY } from '../js/library.js';
import { givenHTML, answersHTML, workingHTML, noteHTML } from '../js/board/frames.js';

let pass = 0, fail = 0;

function is(actual, expected, label) {
  if (actual === expected) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}\n         got  ${actual}\n         want ${expected}`); }
}
function ok(cond, label, detail) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? `\n         ${detail}` : ''}`); }
}
function group(name, fn) { console.log(`\n${name}`); fn(); }

/* == 1 · the notation itself ========================================== */

group('Unicode output: the source reads one way, the screen another', () => {
  const THIN = '\u2009';   // the gap between implicit factors
  is(mathText('v = u + at'), 'v = u + at', 'the simplest one is untouched');
  is(mathText('v^2 = u^2 + 2as'), 'v² = u² + 2as', 'powers become superscripts');
  is(mathText('(v^2 - u^2)/(2a)'), '(v² − u²)⁄2a', 'a fraction slash, not a solidus');
  is(mathText('sqrt(u^2 + 2gh)'), '√(u² + 2gh)', 'a radical sign');
  is(mathText('u sin theta'), `u${THIN}sin${THIN}θ`, 'Greek by name, function upright');
  is(mathText('u sin theta t'), `u${THIN}sin${THIN}θ${THIN}t`, 'separate symbols get air between them');
  is(mathText('cos^2 theta'), `cos²${THIN}θ`, 'a squared trig function');
  is(mathText('9.81 [m s^-2]'), '9.81 m s⁻²', 'units carry negative indices');
  is(mathText('x <= y != z ~= w -> q'), 'x ≤ y ≠ z ≈ w → q', 'relations are real symbols');
  is(mathText('v = +-sqrt(u^2 + 2as)'), 'v = ±√(u² + 2as)', 'plus-or-minus');
  is(mathText('t = h/abs(u sin theta)'), `t = h⁄|u${THIN}sin${THIN}θ|`, 'the size of a quantity');
  is(mathText('35°'), '35°', 'degrees sit tight against the number');
  is(mathText('1.2e5'), '1.2 × 10⁵', 'standard form, not exponent notation');
  is(mathText('2a'), '2a', 'a numeral binds to what follows it');
  is(mathText('3 - -5'), '3 − (−5)', 'two signs in a row are bracketed, never doubled');
});

group('HTML output: the structures Unicode cannot draw', () => {
  const frac = mathHTML('(v^2 - u^2)/(2a)');
  ok(frac.includes('m-frac') && frac.includes('m-fnum') && frac.includes('m-fden'),
     'a fraction is stacked over a bar, not written along one line');
  ok(mathHTML('sqrt(u^2 + 2gh)').includes('m-rad'),
     'a radical gets a vinculum, so the radicand needs no brackets');
  ok(mathHTML('u_y = 0').includes('<sub'), 'subscripts are real subscripts');
  ok(mathHTML('v = u + at').includes('<i class="m-var">v</i>'),
     'quantities are italic — ISO 80000-2');
  const trig = mathHTML('u sin theta');
  ok(trig.includes('<span class="m-fn">sin</span>') && !trig.includes('<i class="m-var">sin</i>'),
     'function names are upright, so sin is not s times i times n');
  ok(mathHTML('9.81 [m s^-2]').includes('class="m-unit"'),
     'units are upright too — m is a metre, not a variable');
  ok(!mathHTML('a < b').includes('<b'), 'angle brackets in the source are escaped');
});

group('Numbers', () => {
  is(num(-9.81), '−9.81', 'a minus sign, not a hyphen');
  is(num(9.8, 2, { trim: true }), '9.8', 'trailing zeros can be trimmed');
  is(num(Infinity), '∞', 'infinity');
  is(num(-Infinity), '−∞', 'and negative infinity');
  is(num(123456.7), '1.235 × 10⁵', 'large values go to standard form');
  is(num(0.00001234), '1.234 × 10⁻⁵', 'and small ones');
  is(signed(-9.81), '(−9.81)', 'a negative being substituted gets brackets');
  is(signed(9.81), '9.81', 'a positive one does not');
});

/* == 2 · the sweep ==================================================== */

// Programmer's maths, every form of it. A string that reaches a student may
// contain none of these.
const BANNED = [
  { re: /\^/,                  why: 'a caret instead of a superscript' },
  { re: /\bsqrt\b/,            why: 'the word sqrt instead of a radical sign' },
  { re: /\*/,                  why: 'an asterisk instead of a multiplication sign' },
  { re: /\//,                  why: 'a slash instead of a fraction bar' },
  { re: /<=|>=|!=|~=/,         why: 'a two-character comparison instead of one symbol' },
  { re: /-\s*\d|\d\s*-/,       why: 'a hyphen where a minus sign belongs' },
  { re: /\b(?:theta|alpha|beta|lambda|omega|sigma)\b/, why: 'a Greek letter spelled out' },
  { re: /\be[+-]\d/,           why: "a programmer's exponent, e+5" },
  { re: /_[A-Za-z0-9]/,        why: 'an underscore instead of a subscript' },
  { re: /\+-|\+\/-/,           why: 'plus-or-minus typed out' },
  { re: /->|-->/,              why: 'an arrow typed out' },
  { re: /\bInfinity\b|\bNaN\b|\bundefined\b/, why: 'a raw JavaScript value' },
];

// The notation module emits markup. Tags become spaces rather than vanishing,
// so stripping them can never fuse two tokens into a word that reads clean.
const visible = (html) => String(html)
  .replace(/<[^>]*>/g, ' ')
  .replace(/&[a-z]+;/g, ' ');

function check(label, html, bag) {
  if (html == null) return;
  const text = visible(html);
  for (const b of BANNED) {
    if (b.re.test(text)) bag.push(`${label}: ${b.why}\n           ${text.replace(/\s+/g, ' ').trim()}`);
  }
}

group('Every one of the five, typeset', () => {
  const bag = [];
  for (const eq of EQUATIONS) check(`equation ${eq.id}`, eq.tex, bag);
  ok(bag.length === 0, "the five equations carry no programmer's maths", bag.join('\n         '));
  ok(EQUATIONS.every((e) => String(e.tex).includes('class="m"')),
     'and every one of them is typeset, not a bare string');
});

group("The solver's working, over every rearrangement it can reach", () => {
  // Three knowns at a time, across enough combinations that each of the five
  // equations gets rearranged for each of its variables at least once.
  const COMBOS = [
    { u: 0, a: 9.81, t: 3 },      { u: 0, v: 27, t: 8 },     { u: 5, v: 15, a: 2 },
    { v: 12, a: -9.81, t: 1.5 },  { u: 20, a: -9.81, s: 0 }, { s: 100, u: 0, t: 4 },
    { s: -40, v: -28, a: -9.81 }, { s: 12, u: 3, v: 9 },     { u: -4, v: 4, t: 2 },
    { s: 0, u: 14, a: -9.81 },    { s: 45, a: 2, t: 5 },     { u: 1e6, a: -9.81, t: 2 },
    { s: 1e-5, u: 0, a: 9.81 },   { v: 0, a: -9.81, s: 10 },
  ];
  const bag = [];
  let steps = 0;
  for (const c of COMBOS) {
    const r = solve(c);
    if (!r.ok) continue;
    for (const st of r.steps) {
      steps++;
      check('formula', st.formula, bag);
      check('rearranged', st.rearranged, bag);
      check('substitution', st.substitution, bag);
      if (st.warning) check('warning', st.warning, bag);
    }
  }
  ok(steps > 20, `the sweep reaches the solver (${steps} steps)`);
  ok(bag.length === 0, 'nothing the solver shows is written as code', bag.join('\n         '));
});

group('The working panel, across the scenarios it is written for', () => {
  const CASES = [
    { u: 25, theta: 40, h: 0, g: 9.81 },      // the simple arc
    { u: 25, theta: 40, h: 32, g: 9.81 },     // off a cliff
    { u: 14, theta: 90, h: 0, g: 9.81 },      // straight up
    { u: 0, theta: -90, h: 80, g: 9.81 },     // dropped
    { u: 18, theta: -35, h: 40, g: 9.81 },    // thrown down at an angle
    { u: 20, theta: 0, h: 25, g: 1.62 },      // horizontal, on the Moon
    { u: 12, theta: 60, h: 5, g: 0 },         // no field at all
    { u: 30, theta: 20, h: 100, g: 24.79 },   // Jupiter, and a long drop
  ];
  const bag = [];
  let rows = 0;
  for (const p of CASES) {
    const f = flight(p);
    for (const t of [0, 0.4, f.tFlight / 2, f.tFlight]) {
      if (!isFinite(t)) continue;
      for (const st of buildWorking(f, t)) {
        check('step title', st.title, bag);
        if (st.note) check('step note', st.note, bag);
        for (const r of st.rows) {
          rows++;
          check('formula', r.f, bag);
          check('substitution', r.s, bag);
          if (r.r) check('result', r.r, bag);
        }
      }
      // the resolve card: both blocks, all three rows of each
      const R = resolveAt(f, t);
      for (const b of [R.velocity, R.displacement]) {
        for (const part of [b.x, b.y, b.r]) {
          check('resolve formula', part.formula, bag);
          check('resolve substitution', part.sub, bag);
          check('resolve note', part.note, bag);
        }
      }
      check('convention', R.convention, bag);
    }
    for (const st of derivation(f)) {
      check('derivation title', st.title, bag);
      for (const L of st.lines) { check('derivation', L.tex, bag); check('derivation', L.sub, bag); }
    }
    check('obstacle', obstacleCheck(f, { x: 30, height: 8 }).text, bag);
  }
  ok(rows > 100, `the sweep reaches the working panel (${rows} rows)`);
  ok(bag.length === 0, 'nothing in the working is written as code', bag.join('\n         '));
});

group('Whatever the engine says back on screen two', () => {
  const INPUTS = [
    [{ u: 25, g: 9.81, s: 60 }, {}],
    [{ u: 25, g: 9.81, t: 3 }, {}],
    [{ s: 100, t: 4, g: 9.81, h: 12 }, {}],
    [{ u: 20, v: 30, h: 25.51 }, {}],
    [{ g: 9.81, h: 80 }, { noAngle: true }],
    [{ u: 14, g: 9.81 }, { lockAngle: true, theta: 90 }],
    [{ u: 14, g: 9.81, s: 10 }, { lockAngle: true, theta: 90 }],   // refused
    [{ u: 5 }, {}],                                                // refused
    [{ u: 25, g: 9.81, s: 60, t: 9 }, {}],                         // contradictory
    [{ v: 30, t: 2, g: 9.81 }, {}],
  ];
  const bag = [];
  let said = 0;
  for (const [input, opts] of INPUTS) {
    const r = solveLaunch(input, opts);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    if (r.convention) check('convention', r.convention, bag);
    if (r.moment) check('moment', r.moment.text, bag);
  }
  ok(said > 15, `the sweep reaches the engine's own words (${said} lines)`);
  ok(bag.length === 0, 'nothing the engine says is written as code', bag.join('\n         '));
});


group('The Past-paper library: over the wall, everything it says', () => {
  const K = KITS.target;
  const INPUTS = [
    { g: 9.8, u: 28, d: 40, H: 20, kind: 'point', find: 'theta' },
    { g: 9.8, u: 35, d: 100, H: 20, kind: 'tree', find: 'theta', flag: 130, pick: 'flat' },
    { g: 9.8, d: 38.4, H: 3, kind: 'face', find: 'time', T: 2.4 },
    { g: 9.8, h0: 2, d: 20, H: 0.75, kind: 'point', find: 'apex', top: 3 },
    { g: 9.8, d: 20, H: 2, kind: 'point', find: 'apex', top: 5 },
    { g: 9.8, h0: 2.4, ux: 30, uy: -1.4, tAt: 0.4, H: 0.9, kind: 'net' },
    { g: 9.8, h0: 5, ux: 14, uy: 0, H: 2, d: 5, kind: 'wall' },
    { g: 9.8, h0: 5, ux: 14, uy: 0, H: 2, kind: 'wall' }, { g: 9.8, u: 2, theta: 10, H: 3, kind: 'net' },
    { g: 9.8, u: 20, theta: 30, d: 50, H: 3, kind: 'face' }, { g: 9.8, u: 20, d: 30, H: 9.3833, find: 'theta' },
    { g: 9.8, u: 35, d: 100, H: 20, kind: 'tree', find: 'theta', flag: 130 }, { g: 9.8, u: 20, theta: 30, d: 30, H: 6, kind: 'net', flag: 50 },
    { g: 9.8, theta: 30, d: 40, H: 20, find: 'u', kind: 'wall' },
    { g: 9.8, theta: -20, u: 12, h0: 10, d: 5, H: 4, kind: 'tree' },
    { g: 10, u: 20, theta: 30, d: 30, H: 6, kind: 'net' },
    { g: 9.81, u: 10, theta: 30, d: 30, H: 6, kind: 'point', flag: 5 },
    { g: 9.8, u: 10, theta: 45 },
    { g: 9.8, u: 10, d: 40, H: 20, find: 'theta' }, { g: 9.8, theta: 30, d: 40, H: 30, find: 'u' },
    { g: 9.8, u: 5, d: 40, H: 2, find: 'theta' }, {}, { g: 9.8, u: 10, theta: 45, ux: 3 },
  ];
  const bag = [];
  let said = 0;
  for (const k of INPUTS) {
    const r = solveTarget(k);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    for (const st of targetWorking(r)) {
      check('title', st.title, bag);
      for (const row of st.rows) { said++; for (const x of [row.f, row.s, row.r]) if (x) check('row', x, bag); }
      if (st.note) check('note', st.note, bag);
    }
    if (r.ok) {
      const e = K.ending(r);
      for (const x of [e.eyebrow, e.title, e.body]) { said++; check('ending', x, bag); }
      for (const t of [0, r.f.tMax / 2, r.f.tMax]) {
        const h = K.hud(r.f, t);
        for (const b of [...h.left, ...h.right]) { said++; check('hud', `${b.k} ${b.v} ${b.unit}`, bag); }
      }
    }
  }
  for (const f of [...K.fields, ...K.rows.flatMap((r) => r.fields)]) check('box', `${f.label} ${f.hint || ''} ${(f.options || []).map((o) => o.label).join(' ')}`, bag);
  check('voice', `${K.voice.h} ${K.voice.sub}`, bag);
  ok(said > 150, `the sweep reaches the scenario's own words (${said} lines)`);
  ok(bag.length === 0, 'nothing in it is written as code', bag.join('\n         '));
});

group('What Ask Suvat says it read, and what the engine made of it', () => {
  const READINGS = [
    { scenario: 'platform-angle', h: 25, s: 100, g: 9.8, angle: { degrees: 45 }, asks: ['speed of projection'] },
    { scenario: 'arc', u: 35, angle: { ratio: { fn: 'tan', num: 3, den: 4 } }, asks: ['greatest height'] },
    { scenario: 'arc', u: 20, angle: { ratio: { fn: 'sin', num: 3, den: 5 } } },
    { scenario: 'arc', u: 20, angle: { ratio: { fn: 'cos', num: 4, den: 5 } } },
    { scenario: 'platform-down', h: 25, u: 25, angle: { degrees: 30, belowHorizontal: true } },
    { scenario: 'up', apexAboveLaunch: 10 },
    { scenario: 'dropped', h: 45, t: 3.03 },
    { scenario: 'parachute', h: 100, tOpen: 3, aChute: 25, vTerm: 6 },
    { scenario: 'arc', angle: { degrees: 30 } },                         // not enough
    { scenario: 'time-above', h: 0, u: 19.6, g: 9.8, angleDegrees: 90, heightLine: 14.7 },
    { scenario: 'up', h: 0, u: 10, heightLine: 50 },                     // never that high
    { scenario: 'road', v: 34, t: 10, s: 240, atMidpoint: true },
    { scenario: 'road', u: 20, a: -4, t: 3, atDisplacement: 30 },
    { scenario: 'road', s: 240 },                                         // not enough
  ];
  const bag = [];
  let said = 0;
  for (const x of READINGS) {
    const r = toApp({ understood: true, confidence: 'low', summary: 'A ball.', ...x });
    const sc = SCENARIOS.find((s) => s.id === r.id);
    const k = { ...r.given, theta: r.theta, h: r.h };
    if (sc.noAngle) { k.u = 0; delete k.theta; }
    if (sc.lockAngle) k.theta = sc.params.theta;
    const solved = sc.descent ? null
      : sc.road ? solveRoad({ s: r.given.s, u: r.given.u, v: r.given.v, a: r.given.g, t: r.given.t, mark: r.mark })
      : solveLaunch(k, { noAngle: sc.noAngle, lockAngle: sc.lockAngle });
    said++;
    let above = null;
    if (solved?.ok && r.markers.heightLine != null) {
      above = { line: r.markers.heightLine, ...timeAbove(flight(solved.params), r.markers.heightLine) };
    }
    check('readout', readoutHTML(r, { name: sc.name, solved, above }), bag);
  }
  ok(said === READINGS.length, `the sweep reaches every kind of reading (${said})`);
  ok(bag.length === 0, 'nothing on the card is written as code', bag.join('\n         '));
});

group('Along a straight road: everything the engine says, and the working', () => {
  const INPUTS = [
    { s: 240, v: 34, t: 10, mark: 'mid' }, { u: 20, v: 0, s: 50 }, { u: 12, a: 0, t: 5, mark: 30 },
    { u: 5, a: -2, t: 8 }, { s: 240, v: 34, t: 10, u: 15 }, { s: 240, v: 34, t: 10, u: 14 },
    { s: 240, v: 34 }, { u: 20, a: -4, s: 60 }, { u: 10, a: -2, t: -1 },
  ];
  const bag = [];
  let said = 0;
  for (const k of INPUTS) {
    const r = solveRoad(k);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    if (r.moment) { said++; check('moment', r.moment.text, bag); }
    for (const st of roadWorking(r)) {
      check('title', st.title, bag);
      for (const row of st.rows) { said++; for (const x of [row.f, row.s, row.r]) if (x) check('row', x, bag); }
      if (st.note) check('note', st.note, bag);
    }
  }
  ok(said > 25, `the sweep reaches the road's own words (${said} lines)`);
  ok(bag.length === 0, 'nothing on the road is written as code', bag.join('\n         '));
});

group('The Past-paper library: two in one vertical line, everything it says', () => {
  const K = KITS.pair;
  const INPUTS = [
    { A: { h: 0, u: 20 }, B: { h: 40, u: 0, t0: 1 }, g: 10 },
    { A: { h: 0, u: 12 }, B: { h: 0, u: 20, t0: 2 }, g: 10 },
    { A: { h: 0, u: 30 }, B: { h: 15, u: 0 }, g: 10 },
    { A: { h: 0, u: 20 }, B: { h: 3, u: 0, t0: 5 }, g: 9.8 },       // reached while held
    { A: { h: 0, u: 5 }, B: { h: 40, u: 0, t0: 3 }, g: 10 },        // never together
    { A: { h: 0, u: 5 }, B: { h: 2, u: 30 }, g: 9.81 },             // never meet
    { A: { h: 0, u: 5 }, B: { h: 2, u: 9 }, g: 0 },                 // no gravity
    { A: { h: 2.5, u: -4.5 }, B: { h: 0, u: 14.7, t0: 0.25 }, g: 9.81 },
    { A: { h: 0, u: 20 }, B: { h: 0, u: 20 }, g: 10 },              // refused
    { A: { h: 0, u: 10 }, B: { h: 20, u: 0 }, g: 10 },              // level only on the ground
    { A: { h: 10, u: 0, t0: 5 }, B: { h: 0, u: 5 }, g: 10 },        // one lands while the other is held up
    { A: { h: 5, u: 0, t0: 10 }, B: { h: 20, u: 0 }, g: 10 },       // a negative root rejected
    { A: { h: 0, u: 5 }, B: { h: 20, u: 5 }, g: 0 },                // nothing lands
    { A: { h: 0, u: 4 }, B: {}, g: 9.8 },                           // missing
  ];
  const bag = [];
  let said = 0;
  for (const k of INPUTS) {
    const r = solvePair(k);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    if (r.moment) { said++; check('moment', r.moment.text, bag); }
    for (const st of pairWorking(r)) {
      check('title', st.title, bag);
      for (const row of st.rows) { said++; for (const x of [row.f, row.s, row.r]) if (x) check('row', x, bag); }
      if (st.note) check('note', st.note, bag);
    }
    if (r.ok) {
      const e = K.ending(r);
      for (const x of [e.eyebrow, e.title, e.body]) { said++; check('ending', x, bag); }
      for (const t of [0, r.f.tMax / 2, r.f.tMax]) {
        const h = K.hud(r.f, t);
        for (const b of [...h.left, ...h.right]) { said++; check('hud', `${b.k} ${b.v} ${b.unit}`, bag); }
      }
    }
  }
  for (const f of K.fields) check('box', `${f.label} ${f.hint}`, bag);
  check('voice', `${K.voice.h} ${K.voice.sub}`, bag);
  for (const s of LIBRARY) check('card', `${s.name} ${s.sub} ${s.note}`, bag);
  ok(said > 60, `the sweep reaches the scenario's own words (${said} lines)`);
  ok(bag.length === 0, 'nothing in it is written as code', bag.join('\n         '));
});

group('The Past-paper library: a journey in three stages, everything it says', () => {
  const K = KITS.journey;
  const INPUTS = [
    { a1: 0.5, a3: 0.25, T: 300, D: 6300, at: { t: 250, s: 3150, v: 10 } },
    { V: 25, T: 700, D: 15000, rel: { kind: 't3=k*t1', k: 4 }, at: { t: 572 } },
    { V: 25, T: 180, D: 3300, rel: { kind: 'a3=k*a1', k: 2 } },
    { a1: 0.3, t1: 80, a3: 0.5, D: 4800 },
    { t1: 60, t3: 30, T: 270, D: 4500, at: { s: 2250, v: 5 } },
    { V: 15, a3: 2.5, D: 885, rel: { kind: 't1=k*t2', k: 1 / 3 } },
    { V: 22, t1: 30, T: 120, D: 2145 },
    { V: 30, a1: 0.5, a3: 0.25, T: 300, D: 6300 },
    { a1: 1, a3: 1, T: 20, D: 100, at: { v: 10 } },
    { V: 30, a1: 0.5, a3: 0.25, T: 300, D: 6000 },
    { a1: 0.5, a3: 0.25, T: 100, D: 6300 },
    { V: 10, T: 20 },
    { a1: 0.5, a3: 0.25, T: 300, D: 6300, at: { t: 400, s: 9000, v: 40 } },
  ];
  const bag = [];
  let said = 0;
  for (const k of INPUTS) {
    const r = solveJourney(k);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    for (const st of journeyWorking(r)) {
      check('title', st.title, bag);
      for (const row of st.rows) { said++; for (const x of [row.f, row.s, row.r]) if (x) check('row', x, bag); }
      if (st.note) check('note', st.note, bag);
    }
    if (r.ok) {
      const e = K.ending(r);
      for (const x of [e.eyebrow, e.title, e.body]) { said++; check('ending', x, bag); }
      for (const t of [0, r.f.tMax / 2, r.f.tMax]) {
        const h = K.hud(r.f, t);
        for (const b of [...h.left, ...h.right]) { said++; check('hud', `${b.k} ${b.v} ${b.unit}`, bag); }
      }
    }
  }
  for (const f of [...K.fields, ...K.rows.flatMap((r) => r.fields)]) check('box', `${f.label} ${f.hint || ''} ${(f.options || []).map((o) => o.label).join(' ')}`, bag);
  check('voice', `${K.voice.h} ${K.voice.sub}`, bag);
  ok(said > 150, `the sweep reaches the scenario's own words (${said} lines)`);
  ok(bag.length === 0, 'nothing in it is written as code', bag.join('\n         '));
});

group('The Past-paper library: two on one road, everything it says', () => {
  const K = KITS.lanes;
  const INPUTS = [
    { A: { u: 20, V: 8, tau: 30 }, B: { u: 12 } },
    { A: { a: 22 / 30, V: 22 }, B: { t0: 10 }, find: 'B.a', line: 990 },
    { A: { a: 0.8, V: 4 }, B: { a: 1 }, find: 'B.tau', line: 100 },
    { A: { V: 4, tau: 5 }, B: { a: 1 }, find: 'B.V', line: 100 },
    { A: { u: 10 }, B: { t0: 5, a: 2 } },
    { A: { u: 30, a: -2, V: 10 }, B: { u: 15, x0: -50 } },
    { A: { u: 20 }, B: { u: 10 } },
    { A: { u: 10 }, B: { u: 2, a: 0.5, t0: 3 }, find: 'B.V', line: 400 },
    { A: { u: 10 }, B: { a: 1 }, find: 'B.a', at: 20 },
    { A: { u: 10, a: 1, V: 20, tau: 10 }, B: { u: 5 } },
    { A: { u: 10 }, B: { a: 1 }, find: 'B.a' },
    { A: { u: 0 }, B: { u: 5 } },
    { A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.hold', line: 975, where: 'rail' },
    { A: { u: 25, ends: true }, B: { u: 20, hold: 25, ends: true }, find: 'A.hold', line: 800 },
    { A: { u: 40, hold: 2, ends: true }, B: { u: 30, hold: 25, ends: true }, line: 975 },
    { A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.V', line: 975 },
    { A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.a', line: 975 },
    { A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.hold', line: 2000 },
    { A: { u: 20, a: -1, V: 0 }, B: { u: 10 }, find: 'A.hold', line: 300 },
    { A: { u: 40, a: -1, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.V', line: 975 },
  ];
  const bag = [];
  let said = 0;
  for (const k of INPUTS) {
    const r = solveOvertake(k);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    for (const st of overtakeWorking(r)) {
      check('title', st.title, bag);
      for (const row of st.rows) { said++; for (const x of [row.f, row.s, row.r]) if (x) check('row', x, bag); }
      if (st.note) check('note', st.note, bag);
    }
    if (r.ok) {
      const e = K.ending(r);
      for (const x of [e.eyebrow, e.title, e.body]) { said++; check('ending', x, bag); }
      for (const t of [0, r.f.tMax / 2, r.f.tMax]) {
        const h = K.hud(r.f, t);
        for (const b of [...h.left, ...h.right]) { said++; check('hud', `${b.k} ${b.v} ${b.unit}`, bag); }
      }
    }
  }
  for (const f of [...K.fields, ...K.rows.flatMap((r) => r.fields)]) check('box', `${f.label} ${f.hint || ''} ${(f.options || []).map((o) => o.label).join(' ')}`, bag);
  check('voice', `${K.voice.h} ${K.voice.sub}`, bag);
  ok(said > 150, `the sweep reaches the scenario's own words (${said} lines)`);
  ok(bag.length === 0, 'nothing in it is written as code', bag.join('\n         '));
});

group('The Past-paper library: moving in a plane, everything it says', () => {
  const K = KITS.plane;
  const INPUTS = [
    { u: { x: -1, y: 3 }, a: { x: 0.1, y: -0.2 }, at: { due: 'E', moving: 'SE', t: 5 } },
    { r0: { x: 13.6, y: 0 }, u: { x: 6, y: 2.4 }, a: { x: -0.8, y: 0.1 }, at: { moving: 'NW', due: 'NE' } },
    { u: { x: -2, y: 2 }, a: { x: 4, y: -5 }, at: { t: 2, y: -4.5, x: 3, speed: 5 } },
    { vT: { x: 6, y: 0 }, T: 4, a: { x: 3, y: -2 }, at: { t: 0 } },
    { u: { x: 1, y: 0 }, a: { x: 0, y: 1 }, at: { moving: 'W', due: 'S', speed: 0.5 } },
    { u: { x: 1, y: 1 } }, { a: { x: 1, y: 0 } },
    { u: { x: 0, y: 0 }, a: { x: 3, y: -3 }, at: { moving: 'SE', due: 'NW' } },
    { u: { x: 2, y: -2 }, a: { x: -1, y: 1 }, at: { moving: 'NW', due: 'SE' } },
    { u: { x: 3, y: 4 }, a: { x: 0, y: 0 }, at: { speed: 5, x: 0 } },
    { u: { x: -1, y: 2 }, a: { x: 1, y: 0 }, at: { par: { x: 1, y: 1 } } },
    { r0: { x: 5, y: 0 }, u: { x: 1, y: 0 }, a: { x: 0, y: 0 }, at: { due: 'E', speed: 2 } },
  ];
  const bag = [];
  let said = 0;
  for (const k of INPUTS) {
    const r = solvePlane(k);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    for (const st of planeWorking(r)) {
      check('title', st.title, bag);
      for (const row of st.rows) { said++; for (const x of [row.f, row.s, row.r]) if (x) check('row', x, bag); }
      if (st.note) check('note', st.note, bag);
    }
    if (r.ok) {
      const e = K.ending(r);
      for (const x of [e.eyebrow, e.title, e.body]) { said++; check('ending', x, bag); }
      for (const t of [0, r.f.tMax / 2, r.f.tMax]) {
        const h = K.hud(r.f, t);
        for (const b of [...h.left, ...h.right]) { said++; check('hud', `${b.k} ${b.v} ${b.unit}`, bag); }
      }
    }
  }
  for (const f of [...K.fields, ...K.rows.flatMap((r) => r.fields)]) check('box', `${f.label} ${f.hint || ''} ${(f.options || []).map((o) => o.label).join(' ')}`, bag);
  check('voice', `${K.voice.h} ${K.voice.sub}`, bag);
  ok(said > 100, `the sweep reaches the scenario's own words (${said} lines)`);
  ok(bag.length === 0, 'nothing in it is written as code', bag.join('\n         '));
});

group('What Ask Suvat\'s Solve switch shows: the engine\'s working, laid out', () => {
  const bag = [];
  let rows = 0;
  const add = (steps, moment) => {
    const h = solutionHTML(steps, { moment });
    rows += (h.match(/ro-step-row/g) || []).length;
    check('solution', h, bag);
  };
  for (const [k, o] of [[{ u: 25, theta: 45, g: 9.81 }, {}], [{ u: 28, theta: 45, h: 25, g: 9.8 }, {}],
                        [{ g: 9.81, h: 80 }, { noAngle: true }], [{ u: 14, g: 9.81, h: 0 }, { lockAngle: true, theta: 90 }]]) {
    const r = solveLaunch(o.lockAngle ? { ...k, theta: o.theta } : k, o);
    if (r.ok) add(buildWorking(trajectory(r.params), trajectory(r.params).tMax), r.moment);
  }
  const road = solveRoad({ s: 240, v: 34, t: 10, mark: 'mid' });
  add(roadWorking(road), road.moment);
  const chute = solveDescent({ h: 100, g: 9.81, tOpen: 3, aChute: 25, vTerm: 6 });
  if (chute.ok) add(descentWorking(chute.f, chute.f.tMax), null);
  ok(rows > 15, `the sweep reaches every row of the worked solutions (${rows})`);
  ok(bag.length === 0, 'nothing in a worked solution is written as code', bag.join('\n         '));
  // and the model's own prose, from Search, comes out set as maths
  const said = proseHTML('So v^2 = u^2 + 2as, and t = sqrt(2h / g) * 1 when h <= 5 and a = -9.81.');
  ok(!/\^|sqrt|\*|<=| \/ | -9/.test(said.replace(/<[^>]+>/g, '')), 'a search answer has its code-maths set properly');
});

group('The parachute, which is the one motion with three accelerations', () => {
  // Every phase's working, every phase's resolve card, and the engine's own
  // words about a descent — swept exactly as the single-acceleration ones are.
  const CASES = [
    { h: 100, g: 9.81, tOpen: 3, aChute: 25, vTerm: 6 },     // the card's own numbers
    { h: 1000, g: 9.81, tOpen: 12, aChute: 30, vTerm: 5 },   // a real jump height
    { h: 60, g: 9.81, tOpen: 3, aChute: 3, vTerm: 6 },       // lands still slowing
    { h: 400, g: 1.62, tOpen: 14, aChute: 8, vTerm: 4 },     // on the Moon
    { h: 50, g: 9.81, tOpen: 9, aChute: 25, vTerm: 6 },      // refused: never opens
    { h: 100, g: 9.81, tOpen: 0.2, aChute: 25, vTerm: 6 },   // refused: nothing to slow
    { h: 100, g: 0, tOpen: 3, aChute: 25, vTerm: 6 },        // refused: no field
    { h: 100 },                                              // refused: not enough
  ];
  const bag = [];
  let rows = 0, said = 0;
  for (const k of CASES) {
    const r = solveDescent(k);
    for (const x of r.derived || []) { said++; check('derived', x, bag); }
    for (const x of r.notes || []) { said++; check('note', x, bag); }
    if (r.reason) { said++; check('reason', r.reason, bag); }
    if (!r.ok) continue;
    check('convention', r.convention, bag);
    for (const p of r.phases) {
      check('phase name', p.name, bag);
      check('phase sub', p.sub, bag);
      check('phase note', p.note, bag);
      for (const row of p.rows) { rows++; check('phase formula', row.f, bag); check('phase substitution', row.s, bag); }
    }
    for (const t of [0, k.tOpen / 2, k.tOpen, r.tMax / 2, r.tMax]) {
      for (const st of descentWorking(r.f, t)) {
        check('step title', st.title, bag);
        check('step note', st.note, bag);
        for (const row of st.rows) {
          rows++;
          check('formula', row.f, bag); check('substitution', row.s, bag);
          if (row.r) check('result', row.r, bag);
        }
      }
      const R = resolveDescent(r.f, t);
      for (const b of [R.velocity, R.displacement]) {
        for (const part of [b.x, b.y, b.r]) {
          if (!part) continue;
          check('resolve formula', part.formula, bag);
          check('resolve substitution', part.sub, bag);
          check('resolve note', part.note, bag);
        }
      }
      check('resolve convention', R.convention, bag);
    }
  }
  ok(rows > 60, `the sweep reaches the descent's working (${rows} rows)`);
  ok(said > 10, `and the words it says back (${said} lines)`);
  ok(bag.length === 0, "no programmer's maths in a parachute drop", bag.join('\n         '));
});


/* == 3 · the sinks ==================================================== */

// Typeset maths is markup. A sink that receives it must use innerHTML, because
// textContent prints the tags at the student — which is exactly the bug this
// group exists to catch, having already happened once. Any element below may
// carry an equation; none of them may be filled with textContent.
const MATH_SINKS = [
  'solve-msg',     // what the engine worked out, and why it cannot
  'notes',         // its assumptions
  'working',       // the working panel
  'res-title',     // the resolve card
  'res-blocks',
  'done-note',     // the landing card
  'done-five',
  'done-extra',
  'exdone-body',   // the range exhibit's ending
  'mode-say',      // which motion is being solved
  'theta-say',     // how the angle was recovered, and the other one
  'at-t-hint',     // the question card: which instant, and what it is doing
  'at-v-hint',
  'at-picks',
  't-read',        // the one clock the four panes share
];

group('Nothing that can hold an equation is filled with textContent', () => {
  const src = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

  // `const msg = $('solve-msg')` means `msg.textContent` is the same offence,
  // so resolve the aliases before looking for it.
  const alias = new Map();
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\$\(\s*'([^']+)'\s*\)/g)) {
    alias.set(m[1], m[2]);
  }

  const offences = [];
  for (const m of src.matchAll(/(?:\$\(\s*'([^']+)'\s*\)|([A-Za-z_$][\w$]*))\s*\.textContent\s*=/g)) {
    const id = m[1] ?? alias.get(m[2]);
    if (id && MATH_SINKS.includes(id)) {
      offences.push(`#${id} is filled with textContent — it can hold an equation`);
    }
  }
  ok(offences.length === 0, 'every maths sink in app.js takes innerHTML', offences.join('\n         '));

  // And the sinks have to still exist, or the list above is quietly dead.
  // Some are in the markup and some are built by app.js — the angle panel is
  // only there for scenarios that have an angle to show — so look in both.
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const gone = MATH_SINKS.filter((id) => !html.includes(`id="${id}"`) && !src.includes(`id="${id}"`));
  ok(gone.length === 0, 'and every one of them still exists',
     gone.length ? `found in neither index.html nor app.js: ${gone.join(', ')}` : '');
});

/* == 2b · the pane window =============================================
   Four panes replace the single view for the parachute drop, and every string
   in them reaches a student: the pane titles, the convention in each corner,
   the sentence under each one, the unit the cursor's readout carries, and the
   area the v–t pane quotes. The pane list is pure data (js/render/drop.js), so
   it can be swept exactly as the working panel and the engine's own words are.

   The corners are where this matters most. Each says what the pane is in,
   including the sign convention — "m s⁻² · downwards positive" — and a unit
   typed as `m s^-2` rather than set through js/notation.js would put a caret
   in front of every student who opens this scenario. */
group('The four panes say it as maths, or they say it in words', () => {
  const CASES = [
    { h: 140, g: 9.81, tOpen: 3, aChute: 25, vTerm: 6 },
    { h: 1000, g: 9.81, tOpen: 12, aChute: 30, vTerm: 5 },
    { h: 60, g: 9.81, tOpen: 3, aChute: 3, vTerm: 6 },        // lands still slowing
    { h: 400, g: 1.62, tOpen: 14, aChute: 8, vTerm: 4 },      // the Moon
  ];
  const bag = [];
  let said = 0;
  for (const k of CASES) {
    const r = solveDescent(k);
    if (!r.ok) continue;
    for (const p of descentPanes(r.f)) {
      for (const key of ['title', 'tab', 'aria', 'corner', 'say', 'unit']) {
        if (p[key] == null) continue;
        said++;
        check(`pane ${p.id} ${key}`, p[key], bag);
      }
      for (const b of p.rules || []) check(`pane ${p.id} rule`, b.name, bag);
      if (p.kind !== 'plot') continue;
      // the live spec, at both ends of the flight and in the middle of it,
      // and through the pre-roll when the pane has no curve to draw yet
      for (const [t, pre] of [[0, null], [k.tOpen, null], [r.tMax / 2, null], [r.tMax, null], [0, 0.9]]) {
        const spec = plotSpec(p, r.f, t, pre);
        said++;
        check(`pane ${p.id} cursor unit`, spec.tick, bag);
        check(`pane ${p.id} shaded area`, spec.shadeSay, bag);
        check(`pane ${p.id} pre-roll`, spec.pre, bag);
      }
    }
  }
  check('the pre-roll line', PRE_SAY, bag);
  ok(said > 60, `the sweep reaches every pane (${said} strings)`);
  ok(bag.length === 0, "no programmer's maths in the window", bag.join('\n         '));
});


/* == 3 · the prose the scenarios carry ================================
   Every word in scenarios.js is displayed — the card note, the subtitle, the
   intro card, the ending. It is as much "something the app can put on screen"
   as any equation is, and until this ran, the bullet card had been telling
   students about `u_y = 0` in the clear.

   Prose is not an equation, so this does not ask it to go through M``. It
   only asks that if a quantity DOES appear, it appears the way the rest of
   the site writes it. */
group('The scenarios say it in words, or they say it properly', () => {
  const bag = [];
  const look = (label, v) => {
    if (typeof v === 'string') check(label, v, bag);
    else if (Array.isArray(v)) v.forEach((x, i) => look(`${label}[${i}]`, x));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (typeof x === 'function') continue;        // `second.from` is code, not prose
        if (k === 'id' || k === 'group' || k === 'backdrop' || k === 'card') continue;
        look(`${label}.${k}`, x);
      }
    }
  };
  for (const sc of SCENARIOS) look(sc.id, sc);
  for (const g of GROUPS) look(`group ${g.id}`, g);
  ok(bag.length === 0, 'no programmer\'s maths anywhere in the scenario prose',
     bag.join('\n         '));
});

group('The whiteboard: every frame it builds, for every kind of board', () => {
  // The frames are HTML strings (js/board/frames.js), so the sweep reads
  // them exactly as the board puts them up — given, answered and worked,
  // for each scenario the reader can name, and with values missing.
  const bag = [];
  let frames = 0;
  const BOARDS = [
    { scenario: 'arc', u: 20, angleDegrees: 35, h: 0 },
    { scenario: 'arc', u: 35, ratioFn: 'tan', ratioNum: 3, ratioDen: 4, h: 0,
      others: [{ label: 'B', scenario: 'arc', u: 35, angleDegrees: 53.13 }] },
    { scenario: 'platform', h: 30, u: 12 },
    { scenario: 'platform-angle', h: 25, angleDegrees: 45, s: 100, g: 9.8 },
    { scenario: 'platform-down', h: 25, u: 10, angleDegrees: 30, belowHorizontal: true },
    { scenario: 'dropped', h: 45 },
    { scenario: 'up', u: 14 },
    { scenario: 'down', h: 45, u: 5 },
    { scenario: 'time-above', u: 19.6, angleDegrees: 90, heightLine: 14.7 },
    { scenario: 'parachute', h: 1200, tOpen: 4, aChute: 20, vTerm: 5 },
    { scenario: 'bullet', u: 300, h: 1.5 },
    { scenario: 'monkey', u: 22, h: 1.5, targetX: 10, targetY: 9 },
    { scenario: 'monkey', u: 4, h: 1.5, targetX: 30, targetY: 9 },
    { scenario: 'road', u: 25, v: 0, s: 40 },
    { scenario: 'road', v: 34, t: 10, s: 240, atMidpoint: true },
    { scenario: 'arc', u: 20 },                       // not enough: it says what is missing
    { scenario: 'road', u: 20 },
  ];
  for (const b of BOARDS) {
    const bp = readBlueprint({ understood: true, confidence: 'high', summary: 'A test.', title: 'Test',
                               notes: ['Ignore air resistance. Use v^2 = u^2 + 2as and take a = -9.81.'], ...b });
    const board = solveBoard(bp);
    board.objects.forEach((o, i) => {
      for (const [name, h] of [['given', givenHTML(o, i, new Set(['u']))], ['answers', answersHTML(o)], ['working', workingHTML(o)]]) {
        frames++; check(`board ${b.scenario} ${name}`, h, bag);
      }
    });
    for (const n of bp.notes) { frames++; check(`board ${b.scenario} note`, noteHTML(n), bag); }
  }
  ok(frames > 60, `the sweep reaches every frame the board builds (${frames})`);
  ok(bag.length === 0, 'nothing on the whiteboard is written as code', bag.join('\n         '));
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
