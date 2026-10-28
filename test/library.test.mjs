// library.test.mjs — the past-paper library: every entry is a real reference,
// opens a scenario that exists, and the engine gets the mark scheme's answers
// from the paper's own numbers. Run: node test/library.test.mjs
//
// The last of those is the one that matters. An entry carries `answers` —
// the final figures from the published mark scheme — and this solves the
// entry exactly the way the values screen would and compares. If an entry's
// numbers were copied wrong, or the scenario it opens does not really answer
// it, this is where it shows.

import { TOPICS, QUESTIONS, BOARDS } from '../js/library/questions.js';
import { matches, shelve, sourceTag, haystack, EXAMPLES, queryWords, PLACEHOLDER_SHORT } from '../js/library/shelf.js';
import { SCENARIOS, byId } from '../js/scenarios.js';
import { solveLaunch } from '../js/core/solve.js';
import { solveRoad } from '../js/core/road.js';
import { solveDescent } from '../js/core/descent.js';
import { timeAbove, heightForTime, timeAtSpeed } from '../js/core/projectile.js';

let pass = 0, fail = 0;
const ok = (c, label, detail) => c ? (pass++, console.log(`  ok   ${label}`))
  : (fail++, console.log(`  FAIL ${label}${detail ? `\n         ${detail}` : ''}`));
const group = (n, f) => { console.log(`\n${n}`); f(); };

/** The entry, solved the way js/app.js recompute() solves the boxes. */
export function solveEntry(q) {
  const sc = byId(q.opens);
  const f = q.fill || {};
  const given = { ...(f.given || {}) };
  if (sc.road) return solveRoad({ s: given.s, u: given.u, v: given.v, a: given.g, t: given.t, mark: f.mark });
  if (sc.descent) return solveDescent({ h: f.h, g: given.g, ...(f.descent || {}) });
  const k = { ...given, theta: f.theta, h: f.h };
  if (sc.noAngle) { k.u = 0; delete k.theta; }
  if (sc.lockAngle) k.theta = sc.params.theta;
  return solveLaunch(k, { noAngle: sc.noAngle, lockAngle: sc.lockAngle });
}

/** What an answer's name means, read off the engine's own result. */
const READ = {
  h: (r) => r.params.h, tFlight: (r) => r.f.tFlight, range: (r) => r.f.range, apex: (r) => r.f.apexHeight,
  tApex: (r) => r.f.tApex, vLand: (r) => r.f.vLanding, landAngle: (r) => Math.abs(r.f.landingAngle),
  theta: (r) => r.params.theta, u: (r) => r.five.u.value, v: (r) => r.five.v.value,
  s: (r) => r.five.s.value, a: (r) => r.five.a.value, t: (r) => r.five.t.value,
  tMark: (r) => r.moment.t, vMark: (r) => r.moment.v,
  above: (r, q) => timeAbove(r.f, q.fill.line).above,
  // the line the "time above the line" box moves to, for a time typed into it
  lineFor: (r, q, a) => heightForTime(r.f, a.at).height,
  // the instants the Resolve card's speed box finds
  atSpeed: (r, q, a) => timeAtSpeed(r.f, a.speed).times?.[a.n],
  // a point mid-flight, named by time: where it is and how fast then
  xAt: (r, q, a) => r.f.pos(a.at).x, yAt: (r, q, a) => r.f.pos(a.at).y,
  speedAt: (r, q, a) => r.f.speed ? r.f.speed(a.at) : Math.abs(r.f.vel(a.at).x),
};

group('The shelves', () => {
  ok(TOPICS.length >= 6 && new Set(TOPICS.map((t) => t.id)).size === TOPICS.length, 'six topics, each its own');
  ok(TOPICS.every((t) => t.label && t.blurb && t.blurb.length > 40), 'every topic says what it holds');
  ok(BOARDS.length === 6, 'all six boards can be searched for');
});

group('Every entry is a reference and a paraphrase, and opens something real', () => {
  ok(QUESTIONS.length > 0, `${QUESTIONS.length} questions on the shelves`);
  ok(new Set(QUESTIONS.map((q) => q.id)).size === QUESTIONS.length, 'every id is its own');
  for (const q of QUESTIONS) {
    const s = q.source || {};
    const where = q.id;
    ok(TOPICS.some((t) => t.id === q.topic), `${where}: on a shelf that exists`);
    ok(BOARDS.some((b) => b.id === s.boardId) && s.board && s.paper && s.session && s.q != null,
       `${where}: board, paper, session and question number`);
    ok(/^https:\/\//.test(s.url || ''), `${where}: a link to the paper`);
    ok(!!byId(q.opens), `${where}: opens a scenario that exists (${q.opens})`);
    // A paraphrase, not a transcript: one sentence or two, never a page.
    ok(typeof q.says === 'string' && q.says.length > 30 && q.says.length < 260,
       `${where}: says what happens, briefly`, q.says);
    ok(typeof q.asks === 'string' && q.asks.length > 5, `${where}: says what it asks that the app answers`);
    ok(q.beyond === undefined || (typeof q.beyond === 'string' && q.beyond.length > 10),
       `${where}: anything the app does not answer is said in words`);
  }
});

group('The paper’s numbers give the mark scheme’s answers', () => {
  for (const q of QUESTIONS) {
    const r = solveEntry(q);
    ok(r.ok, `${q.id}: the engine accepts the paper's numbers`, r.reason);
    if (!r.ok) continue;
    for (const a of q.answers || []) {
      const got = READ[a.q]?.(r, q, a);
      const tol = a.tol ?? Math.max(0.01, Math.abs(a.value) * 0.005);
      ok(isFinite(got) && Math.abs(got - a.value) <= tol,
         `${q.id}: ${a.q}${a.at != null ? ` at ${a.at} s` : ''}${a.speed != null ? ` at ${a.speed} m/s (${a.n})` : ''} = ${a.value}`,
         `the engine got ${got}`);
    }
    ok((q.answers || []).length > 0, `${q.id}: checked against at least one mark-scheme answer`);
  }
});

group('Search', () => {
  const nameOf = (id) => byId(id)?.name || '';
  const any = QUESTIONS[0];
  if (!any) return;
  ok(matches(any, '', nameOf), 'nothing typed matches everything');
  ok(matches(any, any.source.board.toUpperCase(), nameOf), 'the board, in any case');
  ok(matches(any, `${any.source.session.match(/\d{4}/)[0]} ${any.source.board}`, nameOf), 'year and board, in either order');
  ok(!matches(any, 'zzqqxx', nameOf), 'nonsense matches nothing');
  ok(shelve('zzqqxx', nameOf).length === 0, 'and leaves every shelf empty');
  for (const b of BOARDS) {
    const q = QUESTIONS.find((x) => x.source.boardId === b.id);
    if (!q) continue;
    for (const w of b.alias.split(' ')) ok(haystack(q, nameOf).includes(w), `${b.id} is found by "${w}"`);
  }
  ok(/· Q/.test(sourceTag(any.source)), 'the tag reads board, paper, session and question');
  const first = (w) => shelve(w, nameOf).flatMap((t) => t.items)[0];
  for (const ex of EXAMPLES) ok(QUESTIONS.some((q) => matches(q, ex, nameOf)), `the box's own example "${ex}" finds something`);
  ok(/cliff/.test(first('cliff')?.says), 'cliff puts the cliff question first');
  ok(QUESTIONS.filter((q) => matches(q, 'lorry', nameOf)).length === 1, 'lorry finds the lorry, not every vehicle');
  ok(QUESTIONS.filter((q) => matches(q, 'IAL', nameOf)).every((q) => /IAL/.test(q.source.paper)), 'IAL finds only IAL papers');
  ok(matches(QUESTIONS.find((q) => q.id === 'aqa-mm1b-2012-06-q3'), 'stop', nameOf), 'stop finds the braking car, by what it does not answer too');
  ok(QUESTIONS.some((q) => matches(q, '9MA0/32', nameOf)) && QUESTIONS.some((q) => matches(q, '8MA0/22', nameOf)), 'a paper as its cover prints it');
  ok(QUESTIONS.some((q) => matches(q, '04.3', nameOf)), "and a question number as AQA prints it");
  ok(['m s-1', 'm s⁻¹', 'ms-1', 'm/s'].every((w) => queryWords(w).length === 0), 'a unit, however it is typed, is not a word');
  ok(['θ', '−', '-', '.', 'é'].every((w) => queryWords(w).length === 0), 'nor is a stray symbol');
  ok(PLACEHOLDER_SHORT.length <= 24, 'the phone placeholder fits a phone');
  const count = (w) => QUESTIONS.filter((q) => matches(q, w, nameOf)).length;
  ok(count('vertical') > 0 && count('vertically') > 0, 'vertical and vertically both find the up-and-down shelf');
  ok(count('midpoint') > 0 && count('mid-point') === count('midpoint'), 'midpoint, with or without its hyphen');
  ok(count('braking') > 0 && count('range') > 0, 'braking and range are words it knows');
  ok(count('m/s') === QUESTIONS.length, 'a unit typed on its own narrows nothing');
  ok(count('question 2') === count('q2') && count('q2') < QUESTIONS.length, '"question 2" is Q2, not every question');
  const q1 = QUESTIONS.filter((q) => matches(q, 'q1', nameOf));
  ok(q1.every((q) => String(q.source.q).split('.')[0] === '1'), 'q1 is Q1, not Q12 or Q13');
  ok(queryWords('6').length === 1 && count('6') < QUESTIONS.length, 'a bare number matches whole numbers only');
  // The words the papers themselves use, which is what a student types with
  // the paper in front of them. Each has to find the questions it names.
  const EXAM = [['projected', 4], ['projection', 4], ['velocity', 10], ['maximum height', 4], ['max height', 4],
    ['greatest height', 5], ['released', 5], ['released from rest', 5], ['hits the ground', 5],
    ['mid point', 2], ['show that', 1], ['9.8', 5], ['vertically upwards', 5]];
  for (const [w, least] of EXAM) {
    const n = count(w);
    ok(n >= least && n < QUESTIONS.length + 1, `"${w}" finds at least ${least}`, `found ${n}`);
  }
});

group('The twelve stay as they are', () => {
  ok(SCENARIOS.length === 12, 'still twelve hand-built scenarios on the cards');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
