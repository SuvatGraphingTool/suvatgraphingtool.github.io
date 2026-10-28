// library.test.mjs — the Past-paper library: each scenario reproduces the
// mark schemes of the papers it names, from the papers' own numbers, and its
// engine refuses what cannot happen instead of drawing it.
// Run: node test/library.test.mjs
import fs from 'node:fs';
import { LIBRARY } from '../js/library.js';
import { SCENARIOS, byId } from '../js/scenarios.js';
import { KITS } from '../js/kits/index.js';
import { staged, meetings, quadRoots } from '../js/core/stages.js';
import { solvePair, pairWorking, poly } from '../js/core/pair.js';

let pass = 0, fail = 0;
const ok = (c, label, detail) => c ? (pass++, console.log(`  ok   ${label}`))
  : (fail++, console.log(`  FAIL ${label}${detail ? `\n         ${detail}` : ''}`));
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const group = (n, f) => { console.log(`\n${n}`); f(); };
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '');

/* ── the library itself ─────────────────────────────────────────────── */
group('Every library entry is a new scenario, with its own kit and its papers', () => {
  ok(SCENARIOS.length === 12, 'the original twelve are still twelve, and none of them moved');
  for (const s of LIBRARY) {
    ok(!SCENARIOS.some((x) => x.id === s.id), `${s.id} is not one of the twelve`);
    ok(byId(s.id) === s, `${s.id} is found by the same byId as the twelve`);
    ok(!!KITS[s.kit], `${s.id} has a kit (${s.kit})`);
    ok(Array.isArray(s.sources) && s.sources.length > 0
       && s.sources.every((x) => x.board && x.paper && x.session && x.q), `${s.id} names its papers: board, paper, session, question`);
    ok((s.note || '').length > 80 && !!s.sub && !!s.name, `${s.id} says what it is for`);
    ok(s.sources.every((x) => Object.values(x).every((v) => typeof v === 'string' && !/[<>{}]/.test(v))), `${s.id}'s sources are plain references`);
  }
  ok(new Set(LIBRARY.map((x) => x.id)).size === LIBRARY.length, 'every library id is its own');
  const cat = fs.readFileSync(new URL('../design/library/catalogue.md', import.meta.url), 'utf8');
  for (const s of LIBRARY) ok(cat.includes(`\`${s.id}\``), `${s.id} has its reasoning written up in the catalogue`);
  const comp = fs.readFileSync(new URL('../design/components.md', import.meta.url), 'utf8');
  for (const s of LIBRARY) ok(comp.includes(s.id), `${s.id} is listed against the components it uses`);
});

/* ── stages.js: motion in stages, and meetings ──────────────────────── */
group('A motion in stages: where it is, and the moments two are level', () => {
  const m = staged([{ t0: 0, t1: 2, x0: 0, u: 0, a: 3 }, { t0: 2, t1: 10, x0: 6, u: 6, a: 0 }]);
  ok(near(m.pos(1), 1.5) && near(m.pos(2), 6) && near(m.pos(4), 18), 'position follows each stage in turn');
  ok(near(m.vel(1), 3) && near(m.vel(5), 6) && near(m.acc(1), 3) && near(m.acc(5), 0), 'velocity and acceleration too');
  ok(near(m.pos(12), 54) && m.vel(12) === 0, 'after the last stage it stays where it ended');
  // A car at a steady 20 passes a motorbike, which sets off from rest at 4 m s⁻² as it does
  const car = staged([{ t0: 0, t1: 30, x0: 0, u: 20, a: 0 }]);
  const bike = staged([{ t0: 0, t1: 30, x0: 0, u: 0, a: 4 }]);
  const mm = meetings(car, bike, { from: 0, to: 30 });
  ok(mm.length === 2 && near(mm[0].t, 0) && near(mm[1].t, 10) && near(mm[1].x, 200), 'an overtaking: level at the start, and again at t = 10 s, 200 m on');
  const same = meetings(car, car, { from: 0, to: 5 });
  ok(same.length === 1 && same[0].together, 'one motion against itself is reported once, as moving together');
  ok(quadRoots(1, -3, 2).map((x) => +x.toFixed(9)).join() === '1,2', 'quadratic roots, in order');
  ok(quadRoots(0, 2, -4)[0] === 2 && quadRoots(1, 0, 1).length === 0, 'a linear one, and one with no real roots');
});

/* ── pair-vertical: the papers it names ─────────────────────────────── */
group('CIE 9709/42 Oct/Nov 2019 Q5: up from the ground, one dropped from 40 m a second later', () => {
  const r = solvePair({ A: { h: 0, u: 20 }, B: { h: 40, u: 0, t0: 1 }, g: 10 });
  ok(r.ok && !!r.meet, 'they meet');
  ok(near(r.meet.t, 3.5) && near(r.meet.x, 8.75), '(i) 3.5 s after A is projected, 8.75 m above the ground — as the mark scheme');
  ok(near(r.meet.vA, -15) && near(r.meet.vB, -25), 'A at 15 and B at 25 m s⁻¹, both downwards');
  const dv = r.extras.find((x) => x.key === 'dSpeed').value;
  ok(near(dv, 10), '(ii) the speeds differ by 10 m s⁻¹ — as the mark scheme');
  ok(near(r.rows[1].t, 2.5), 'B has been falling for 2.5 s, the mark scheme’s T');
  ok(near(r.f.tMax, 3.5), 'the run ends at the collision');
});

group('CIE 9709/43 May/Jun 2017 Q5: two projected up from O, the second two seconds later', () => {
  const r = solvePair({ A: { h: 0, u: 12 }, B: { h: 0, u: 20, t0: 2 }, g: 10 });
  ok(r.ok && !!r.meet, 'they meet');
  ok(near(r.rows[1].t, 1 / 7), '(i) t = 1/7 s after the second is projected — as the mark scheme');
  ok(near(r.meet.x, 2.755, 1e-3) && r.meet.x.toFixed(2) === '2.76', '(ii) 2.76 m above O — as the mark scheme');
  ok(r.meet.vA < 0 && r.meet.vB > 0, 'the first is coming down as the second goes up');
});

group('CIE 9709/42 May/Jun 2021 Q6, the collision: up at 30, one let go 15 m above at the same instant', () => {
  const r = solvePair({ A: { h: 0, u: 30 }, B: { h: 15, u: 0 }, g: 10 });
  ok(r.ok && near(r.meet.t, 0.5) && near(r.meet.x, 13.75), 'they collide after 0.5 s, 13.75 m up');
  ok(near(r.meet.vA, 25) && near(r.meet.vB, -5), 'A still rising at 25, B falling at 5');
});

/* ── and what cannot happen ─────────────────────────────────────────── */
group('It can fail, and says why, instead of being steered into a meeting', () => {
  const late = solvePair({ A: { h: 0, u: 5 }, B: { h: 40, u: 0, t0: 3 }, g: 10 });
  ok(late.ok && !late.meet && /never in the air together/.test(strip(late.notes.join(' '))), 'A lands before B is let go: never in the air together');
  ok(near(late.f.tMax, Math.max(late.A.tLand, late.B.tLand)), 'and it is watched until both are down');
  const below = solvePair({ A: { h: 0, u: 5 }, B: { h: 2, u: 30 }, g: 9.8 });
  ok(below.ok && !below.meet && /never meet/i.test(strip(below.notes.join(' '))), 'one thrown up faster from above stays above');
  const same = solvePair({ A: { h: 0, u: 20 }, B: { h: 0, u: 20 }, g: 10 });
  ok(!same.ok && /same motion/.test(same.reason), 'the same motion twice is refused');
  const ground = solvePair({ A: { h: 0, u: 0 }, B: { h: 10, u: 0 }, g: 9.8 });
  ok(!ground.ok && /never leaves/.test(ground.reason), 'on the ground and not thrown up: refused');
  ok(!solvePair({ A: { h: -1, u: 4 }, B: { h: 3, u: 0 }, g: 9.8 }).ok, 'a negative height is refused');
  ok(!solvePair({ A: { h: 0, u: 4 }, B: { h: 3, u: 0, t0: -1 }, g: 9.8 }).ok, 'a negative start time is refused');
  ok(!solvePair({ A: { h: 0, u: 4 }, B: { h: 3, u: 0 }, g: -9.8 }).ok, 'a negative g is refused');
  const miss = solvePair({ A: { h: 0, u: 4 }, B: {}, g: 9.8 });
  ok(!miss.ok && /height B starts from/.test(miss.reason), 'what is missing is named');
  const held = solvePair({ A: { h: 0, u: 20 }, B: { h: 3, u: 0, t0: 5 }, g: 9.8 });
  ok(held.ok && held.meet && near(held.meet.x, 3) && held.rows[1].held, 'A reaching B before it is let go is a meeting at B’s hand');
  const space = solvePair({ A: { h: 0, u: 5 }, B: { h: 20, u: -5 }, g: 0 });
  ok(space.ok && near(space.meet.t, 2) && near(space.meet.x, 10), 'with no gravity they close at a steady 10 m s⁻¹');
  const huge = solvePair({ A: { h: 0, u: 900 }, B: { h: 1e5, u: 0 }, g: 9.81 });
  ok(huge.ok && huge.meet && isFinite(huge.meet.x), 'huge numbers stay finite');
  for (const r of [late, below, held, space, huge]) {
    const f = r.f;
    const bad = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * f.tMax, s = f.at(t);
      if (![s.A.x, s.A.v, s.B.x, s.B.v].every(isFinite)) bad.push(t);
      if (s.A.x < -1e-6 || s.B.x < -1e-6) bad.push(t);
    }
    ok(bad.length === 0, `no NaN and nothing below the ground (${r.meet ? 'meets' : 'never meets'})`);
  }
});

/* ── what it shows ──────────────────────────────────────────────────── */
group('The working says what the mark scheme says, in the same order', () => {
  const W = pairWorking(solvePair({ A: { h: 0, u: 20 }, B: { h: 40, u: 0, t0: 1 }, g: 10 })).map((s) => ({
    title: s.title, rows: s.rows.map((r) => [strip(r.f), strip(r.s), strip(r.r)]),
  }));
  ok(W.length === 4, 'where each is, the meeting, the height, the velocities');
  ok(W[0].rows[1][2] === 'yB=35+10t−5t2', 'B multiplied out: 35 + 10t − 5t²');
  ok(W[1].rows[0][2] === '10t−35=0', 'the t² terms cancel, leaving 10t − 35 = 0');
  ok(W[1].rows[1][2] === 't=3.5s' && W[2].rows[0][2] === 'y=8.75m', 't = 3.5 s and 8.75 m');
  ok(W[3].rows[0][2] === 'vA=−15m s−1' && W[3].rows[1][2] === 'vB=−25m s−1', 'both velocities, with their signs');
  ok(poly([0, 0, 0]) === '0' && poly([-60, 40, -5]) === '-60 + 40t - 5t^2' && poly([0, 1, 0]) === 't', 'polynomials are written as a student writes them');
});

group('The kit: graphs from the engine, a sketch, an ending', () => {
  const K = KITS.pair;
  const r = K.solve(K.read({ 'A.h': 0, 'A.u': 20, 'B.h': 40, 'B.u': 0, 'B.t0': 1, g: 10 }));
  ok(r.ok && near(r.meet.t, 3.5), 'the boxes read into the engine’s input');
  const P = { disp: 'd', vel: 'v', acc: 'a', second: 's', mark: 'm' };
  const G = K.graphs(r.f, 2, P);
  ok(G.map((x) => x.canvas).join() === 'g-s,g-v,g-a', 'three graphs, in the three canvases');
  ok(G.every((x) => x.series.length === 2 && x.series.every((s) => s.dash === null && s.tag)), 'two solid, lettered lines on each — vertical motion');
  ok(near(G[0].series[0].fn(3.5), G[0].series[1].fn(3.5)), 'the height lines cross at the meeting');
  ok(near(G[1].series[0].fn(2) - G[1].series[1].fn(2), G[1].series[0].fn(3) - G[1].series[1].fn(3)), 'once both are free the velocity lines are parallel');
  ok(G[2].series[1].fn(0.5) === 0 && G[2].series[1].fn(2) === -10, 'B has no acceleration while held, and −g once let go');
  ok(G[0].points.length === 1 && near(G[0].points[0].y, 8.75), 'the meeting is marked on the height–time graph');
  ok(/<svg[\s\S]*<path/.test(K.thumb(byId('pair-vertical'))), 'the card has a sketch drawn from its own numbers');
  const e = K.ending(r, byId('pair-vertical').ending);
  ok(/8\.75/.test(e.title) && /3\.5/.test(e.eyebrow) && /ph-tab/.test(e.body), 'the ending card: the height, the time, and a row of five for each');
  const hud = K.hud(r.f, 3.5);
  ok(hud.left.length === 4 && hud.left[0].v === '8.8', 'the readouts are the engine’s heights and velocities');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
