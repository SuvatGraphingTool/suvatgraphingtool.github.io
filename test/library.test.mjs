// library.test.mjs — the Past-paper library: each scenario reproduces the
// mark schemes of the papers it names, from the papers' own numbers, and its
// engine refuses what cannot happen instead of drawing it.
// Run: node test/library.test.mjs
import fs from 'node:fs';
import { LIBRARY } from '../js/library.js';
import { SCENARIOS, byId } from '../js/scenarios.js';
import { KITS } from '../js/kits/index.js';
import { staged, meetings, quadRoots } from '../js/core/stages.js';
import { solvePair, pairWorking, poly, ratio } from '../js/core/pair.js';
import { yScale, endTags } from '../js/render/graphs.js';
import { snap, rat } from '../js/core/numeric.js';
import { timeLapse, lapseNote } from '../js/core/pace.js';
import { solveJourney, journeyWorking } from '../js/core/journey.js';
import { solveOvertake, overtakeWorking, mover, timeAt } from '../js/core/overtake.js';
import { solvePlane, planeWorking } from '../js/core/plane.js';
import { solveTarget, targetWorking, flight } from '../js/core/target.js';
import { solveHeight, levelRows } from '../js/core/height.js';
import { solveCatch, catchWorking } from '../js/core/catch.js';
import { solveTrip, tripWorking } from '../js/core/trip.js';
import { solveTwoPlane, twoPlaneWorking } from '../js/core/twoplane.js';
import { solveBounce, bounceWorking } from '../js/core/bounce.js';
import { toLevel, rebound, timesAt } from '../js/core/stages.js';
import { mathText, mathHTML, paren, num } from '../js/notation.js';

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
  ok(late.ok && !late.meet && /A is back on the ground at t=1s, before B is let go at t=3s, held 40m up/.test(strip(late.say)), 'A lands before B is let go, and it says B was held 40 m up meanwhile');
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
group('What it says when there is no meeting in the air is what happened', () => {
  const ground = solvePair({ A: { h: 0, u: 10 }, B: { h: 20, u: 0 }, g: 10 });
  ok(ground.outcome === 'ground' && /level only on the ground\. Both land at the same instant, t=2s/.test(strip(ground.say)), 'both land together: level only on the ground');
  const up = solvePair({ A: { h: 10, u: 0, t0: 5 }, B: { h: 0, u: 5 }, g: 10 });
  ok(/B is back on the ground at t=1s, before A is let go at t=5s, held 10m up/.test(strip(up.say)), 'one lands while the other is still held up high — said as that, not as \u201cnever in the air\u201d');
  const space = solvePair({ A: { h: 0, u: 5 }, B: { h: 20, u: 5 }, g: 0 });
  ok(/neither comes back down/.test(strip(space.say)) && /10 s/.test(space.watched) && space.f.tMax === 10, 'no gravity, nothing lands: it says so, and how long it was watched');
 const tower = solvePair({ A: { h: 10, u: 0, t0: 1 }, B: { h: 0, u: 5, t0: 3 }, g: 10 });
  ok(/A reaches the ground at/.test(strip(tower.say)) && !/back on/.test(strip(tower.say)), 'one dropped from a tower reaches the ground; it is not \u201cback\u201d on it');
  ok(K_never(), 'the ending for a run that did not meet leaves out the collision caveats');
});

group('The time each paper asks for, on each particle\u2019s own clock', () => {
  const r = solvePair({ A: { h: 0, u: 12 }, B: { h: 0, u: 20, t0: 2 }, g: 10 });
  ok(/0\.143s after B sets off/.test(strip(r.moment.text)) && r.derived.some((x) => /0\.143s after B/.test(strip(x))), 'J17: 0.143 s after the second is projected, in the headline');
  const W = pairWorking(r).map((st) => st.rows.map((x) => strip(x.r)).join(' | '));
  ok(W.some((x) => /^17=0\.143s$/.test(x)), 'and in the working as 1/7 = 0.143 s');
  ok(r.extras.find((x) => x.key === 'tB').value.toFixed(3) === '0.143', 'and among the answers');
  const neg = pairWorking(solvePair({ A: { h: 5, u: 0, t0: 10 }, B: { h: 20, u: 0 }, g: 10 }));
  ok(/t=−1\.732s is before the clock starts/.test(strip(neg[1].note)), 'a negative root is rejected, with the reason');
  ok(ratio(35, 10).p === 7 && ratio(35, 10).q === 2 && ratio(60, 28).q === 7 && ratio(3, 1) === null && ratio(Math.PI, 1) === null
     && ratio(45.1, 20.2) === null, 'fractions in lowest terms, only when short and exact: 7/2, 15/7, never 451/202');
});

group('The working says what the mark scheme says, in the same order', () => {
  const W = pairWorking(solvePair({ A: { h: 0, u: 20 }, B: { h: 40, u: 0, t0: 1 }, g: 10 })).map((s) => ({
    title: s.title, rows: s.rows.map((r) => [strip(r.f), strip(r.s), strip(r.r)]),
  }));
  ok(W.length === 5, 'where each is, the meeting, the height, B\u2019s own clock, the velocities');
  ok(W[0].rows[1][2] === 'yB=35+10t−5t2', 'B multiplied out: 35 + 10t − 5t²');
  ok(W[1].rows[0][2] === '10t−35=0', 'the t² terms cancel, leaving 10t − 35 = 0');
  ok(W[1].rows[1][2] === 't=3.5s' && W[2].rows[0][2] === 'y=8.75m', 't = 3.5 s and 8.75 m');
  ok(W[0].rows[1][1] === '40−½×10(t−1)2', 'nothing substituted that a student would leave out: no 0(t − 1)');
  ok(W[1].rows[1][1] === '72', 't = 35/10 is also written as 7/2');
  ok(W[3].rows[0][2] === '52=2.5s', 'on B\u2019s own clock, 5/2 = 2.5 s');
  ok(W[4].rows[0][2] === 'vA=−15m s−1' && W[4].rows[1][2] === 'vB=−25m s−1', 'both velocities, with their signs');
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
  ok(G[2].series[0].tag === 'B' && G[2].series[0].fn(0.5) === 0 && G[2].series[0].fn(2) === -10, 'B has no acceleration while held, and −g once let go');
  ok(G[2].series[1].tag === 'A' && /both/.test(G[2].note), 'A is drawn last, on top, and the graph says both are −g');
  for (const [name, k] of [['N19', { A: { h: 0, u: 20 }, B: { h: 40, u: 0, t0: 1 }, g: 10 }],
                           ['J17', { A: { h: 0, u: 12 }, B: { h: 0, u: 20, t0: 2 }, g: 10 }],
                           ['held', { A: { h: 0, u: 20 }, B: { h: 3, u: 0, t0: 5 }, g: 9.8 }]]) {
    const rr = solvePair(k);
    const few = K.graphs(rr.f, 0, P).filter((sp) => yScale(sp.series, sp.tMax).ticks.length < 2);
    ok(few.length === 0, `${name}: every graph has a scale to read off (two or more y labels, as every graph on the site)`);
  }
  ok(G[0].points.length === 1 && near(G[0].points[0].y, 8.75), 'the meeting is marked on the height–time graph');
  ok((K.thumb(byId('pair-vertical')).match(/<circle/g) || []).length > 10, 'the card has a sketch drawn from its own numbers');
  const e = K.ending(r, byId('pair-vertical').ending);
  ok(/8\.75/.test(e.title) && /3\.5/.test(e.eyebrow) && /ph-tab/.test(e.body), 'the ending card: the height, the time, and a row of five for each');
  const hud = K.hud(r.f, 3.5);
  ok(hud.left.length === 4 && hud.left[0].v === '8.75' && hud.left[2].v === '8.75', 'the readouts are the engine’s heights and velocities');
});


/* ── journey-stages: the papers it names ──────────────────────────────── */
group('A journey in stages: the two that are not rest to rest, against their mark schemes', () => {
  const W = (r) => journeyWorking(r).map((st) => ({ title: strip(st.title), rows: st.rows.map((x) => [strip(x.f), strip(x.s), strip(x.r)]), note: strip(st.note) }));
  // Edexcel M1 Jun 2012 Q4: 20 for 25 s, brake at 0.4 to 8, 8 for 60 s, up to 20 at B; 1960 m
  const car = solveJourney({ u: 20, stages: [{ kind: 'hold', t: 25 }, { kind: 'down', v: 8, a: 0.4 }, { kind: 'hold', t: 60 }, { kind: 'up', v: 20 }], D: 1960 });
  ok(car.ok && near(car.J.t2, 30) && near(car.J.T, 155) && car.unknown === 't4' && near(car.J.t4, 40),
     'Edexcel M1 J12 Q4: braking for 30 s, and 155 s from A to B');
  const cw = W(car);
  ok(cw[0].rows[0][1] === '8=20−0.4t2' && cw[0].rows[0][2] === 't2=30s', 'the braking time from v = u − at: 8 = 20 − 0.4t₂, so 30 s');
  const area = cw.find((x) => /area/.test(x.title));
  ok(area && area.rows.some((x) => x[1] === '1960=500+420+480+14t4' && x[2] === '14t4=560') && area.rows.some((x) => x[2] === 't4=40s'),
     'the area, a piece per stage: 1960 = 500 + 420 + 480 + 14t₄, so t₄ = 40');
  ok(near(car.f.vel(0).x, 20) && near(car.f.vel(155).x, 20) && near(car.f.pos(155).x, 1960) && near(car.f.vel(40).x, 14),
     'the motion: 20 m s⁻¹ passing A, 20 m s⁻¹ passing B, 14 m s⁻¹ halfway through the braking');
  // Edexcel M1 Jun 2011 Q4: from rest, 4 s to 5, 60 s at 5, 20 s slowing to V; 400 m in 84 s
  const girl = solveJourney({ u: 0, stages: [{ kind: 'up', v: 5, t: 4 }, { kind: 'hold', t: 60 }, { kind: 'down', t: 20 }], T: 84, D: 400, at: { t: 64 } });
  ok(girl.ok && girl.unknown === 'V' && near(girl.x, 4) && near(girl.J.a3, 0.05) && near(girl.answers[0].s, 310),
     'Edexcel M1 J11 Q4: 310 m in the first 64 s, V = 4, decelerating at 0.05 m s⁻²');
  const gw = W(girl);
  ok(gw.find((x) => /area/.test(x.title)).rows.some((x) => x[1] === '400=10+300+(10V+50)' && x[2] === '10V=40'), 'the area: 400 = 10 + 300 + (10V + 50), so V = 4');
  ok(gw.find((x) => /64/.test(x.title)).rows.some((x) => x[0] === 's=s1+s2' && x[2] === 's=310m'), 'the distance at 64 s is the first two pieces of the area');
  ok(/V=4m s−1/.test(strip(girl.derived.join(' '))) && /a3=0\.05/.test(strip(girl.derived.join(' '))), 'V and the deceleration are what comes out');
  // the same two through the kit, as the boxes are filled in
  const K = KITS.journey;
  const vals = { n: '4', u: 20, k1: 'hold', t1: 25, k2: 'down', v2: 8, a2: 0.4, k3: 'hold', t3: 60, k4: 'up', v4: 20, D: 1960, who: 'car' };
  const viaKit = K.solve(K.read(vals));
  ok(viaKit.ok && near(viaKit.J.T, 155) && viaKit.f.who === 'car', 'through the kit\u2019s boxes, the car gives 155 s');
  const rows = K.rows({ ...vals });
  ok(rows.filter((r) => /^Stage \d$/.test(r.title)).length === 4 && rows[2].fields.length === 4 && rows[1].fields.length === 2,
     'four stage rows: a changing stage has its speed, rate and time; a steady one its time');
  ok(K.rows({ n: '3' }).filter((r) => /^Stage/.test(r.title)).every((r) => r.fields.length === 1 && r.fields[0].rebuild),
     'a stage says nothing but its choice until the student says what it does, and that choice redraws the screen');
  const noKind = K.solve(K.read({ n: '2', u: 0, k1: 'up' }));
  ok(!noKind.ok && /Say what stage 2 does/.test(strip(noKind.reason)), 'a stage with no kind is asked about, by number');
  const runner = K.solve(K.read({ n: '3', u: 0, k1: 'up', v1: 5, t1: 4, k2: 'hold', t2: 60, k3: 'down', t3: 20, T: 84, D: 400, who: 'runner', 'at.t': 64 }));
  ok(runner.ok && runner.f.who === 'runner' && near(runner.x, 4), 'the race, with the runner on the stage');
  const end = K.ending(runner);
  ok((end.body.match(/data-key="stage"/g) || []).length === 3 && /Slowing down/.test(end.body) && /at up to 5 m s⁻¹/.test(end.title), 'the ending: a row per stage, named by what it does');
  const G = K.graphs(car.f, 50, { disp: 'd', vel: 'v', acc: 'a', mark: 'm' });
  ok(G[2].series[0].breaks.length === 3, 'the acceleration graph breaks at each of the three changes');
  ok(/<path/.test(K.thumb(byId('journey-stages'))) && /stroke-dasharray="2 2"/.test(K.thumb(byId('journey-stages'))), 'the card sketches the car\u2019s own graph, corners marked');
  const hud = K.hud(car.f, 155);
  ok(hud.left[1].v === '20.00' || hud.left[1].v === '20', 'at B the car is still doing 20 m s⁻¹, and the readout says so');
  ok(/stage 2/.test(K.hud(car.f, 40).left[2].k), 'the readout says which stage the acceleration belongs to');
});

group('A journey in stages: what cannot be, refused with the reason', () => {
  const J = (k) => solveJourney(k);
  const up = J({ u: 20, stages: [{ kind: 'up', v: 8, t: 4 }] });
  ok(!up.ok && /speeds up/.test(strip(up.reason)), 'a stage that speeds up cannot end slower');
  const two = J({ u: 0, stages: [{ kind: 'up', a: 2 }, { kind: 'down', v: 0 }], D: 100 });
  ok(!two.ok && /still open/.test(strip(two.reason)), 'two things unknown and one equation: says what is still open');
  const rel = J({ u: 0, stages: [{ kind: 'up', t: 10 }, { kind: 'down', v: 0, t: 30 }], D: 400, rel: { kind: 'a', x: 1, y: 2, k: 3 } });
  ok(rel.ok && near(rel.x, 20) && near(rel.J.a1, 3 * rel.J.a2), 'a relation between rates is checked, and agrees');
  const relBad = J({ u: 0, stages: [{ kind: 'up', t: 10 }, { kind: 'down', v: 0, t: 30 }], D: 400, rel: { kind: 'a', x: 1, y: 2, k: 2 } });
  ok(!relBad.ok && /relation/.test(strip(relBad.reason)), 'and one that disagrees is refused');
  ok(!J({ u: 0, stages: [{ kind: 'up', v: 10, t: 5 }, { kind: 'hold', t: 1 }], rel: { kind: 't', x: 1, y: 1, k: 2 } }).ok, 'a relation of a stage with itself is refused');
  ok(!J({ u: 0, stages: [{ kind: 'up', a: 0, t: 5 }] }).ok, 'a rate of zero is not a change of speed');
  const four = J({ u: 0, stages: [{ kind: 'up', a: 2 }, { kind: 'hold', t: 10 }, { kind: 'up', a: 1, t: 5 }, { kind: 'down', v: 0, a: 3 }], D: 500 });
  ok(four.ok && four.unknown === 'V' && four.f.vel(four.J.T).x === 0 && near(four.J.D, 500), 'four stages with V hidden in the first: a quadratic, and at rest at B');
  let bad = 0;
  for (let i = 0; i < 300; i++) {
    const u = (i * 3.7) % 25, v1 = u + 1 + (i * 5.3) % 20, v3 = (i * 1.9) % v1;
    const r = J({ u, stages: [{ kind: 'up', v: v1, t: 1 + (i * 7.1) % 40 }, { kind: 'hold', t: (i * 2.3) % 60 }, { kind: 'down', v: v3, t: 1 + (i * 4.4) % 30 }] });
    if (!r.ok) { bad++; continue; }
    const back = J({ u, stages: [{ kind: 'up', v: v1 }, { kind: 'hold', t: r.J.t2 }, { kind: 'down', v: v3, t: r.J.t3 }], D: r.J.D });
    if (!back.ok || !near(back.J.t1, r.J.t1, 1e-6) || back.f.pos(back.J.T).x !== back.J.D || ![0, 0.3, 0.7, 1].every((q) => isFinite(back.f.vel(q * back.J.T).x))) bad++;
  }
  ok(bad === 0, 'three hundred journeys, each found again from its own distance');
});

group('A journey in stages: what critic round 1 found, kept found', () => {
  const J = (k) => solveJourney(k);
  const W = (r) => journeyWorking(r).map((st) => ({ title: strip(st.title), rows: st.rows.map((x) => [strip(x.f), strip(x.s), strip(x.r)]), note: strip(st.note) }));
  const two = J({ u: 0, stages: [{ kind: 'up' }, { kind: 'hold', t: 50 }, { kind: 'down', v: 0 }], rel: { kind: 't', x: 3, y: 1, k: 4 }, T: 100, D: 1500 });
  ok(two.ok && two.steps.length === 2 && near(two.J.t1, 10) && near(two.J.V, 20), 'a relation and the speed both open: t₁ from the whole time first, then V from the area');
  ok(W(two).some((x) => x.title === 'The whole time') && /First t1 came from the whole time/.test(strip(KITS.journey.ending(two).body)), 'the working and the ending say it in that order');
  const rr = J({ u: 0, stages: [{ kind: 'up' }, { kind: 'down', v: 0 }], rel: { kind: 'a', x: 2, y: 1, k: 2 }, T: 30, D: 300 });
  ok(rr.ok && near(rr.J.V, 20) && near(rr.J.t1, 20), 'a relation between rates with V open: the same change of speed makes it one between times');
  const sq = W(J({ u: 0, stages: [{ kind: 'up', a: 2 }, { kind: 'down', v: 0, a: 1 }], D: 1200 })).find((x) => /area/.test(x.title));
  ok(sq.rows.some((x) => x[1] === '×4') && sq.rows.some((x) => x[1] === 'V2=1600') && !sq.rows.some((x) => /−0|02/.test(x[1])), 'no middle term: decimals cleared, then a square root — never −0 ± √0²');
  ok(sq.rows[0][2] === 's1=¼V2' && !sq.rows.some((x) => /\(¼V2\)/.test(x[1])), 'a coefficient the working finds is ¼, not 0.25, and one term is never bracketed');
  const u = J({ stages: [{ kind: 'up', a: 1, t: 10 }, { kind: 'hold', t: 10 }], D: 300 });
  ok(u.ok && u.sym === 'u' && near(u.J.u, 7.5) && /u=7\.5/.test(strip(u.derived.join(' '))) && u.f.named[0] === 'u', 'a blank speed at A is found as u, and named u');
  const six = J({ u: 0, stages: [{ kind: 'up', v: 10, a: 1 }, { kind: 'hold', t: 20 }, { kind: 'up', v: 20, a: 0.5 }, { kind: 'hold', t: 30 }, { kind: 'down', v: 5, a: 1 }, { kind: 'down', v: 0 }], D: 2000, at: { v: 10 } });
  ok(/twice: from t=10s to t=30s, holding it/.test(strip(six.answers[0].text)), 'reaching a speed and holding it is one occasion, not two');
  const rest = J({ u: 0, stages: [{ kind: 'up', v: 10, t: 5 }, { kind: 'down', v: 0, t: 5 }], at: { v: 0 } });
  ok(/at t=0, at A, at rest/.test(strip(rest.answers[0].text)) && !/speeding up/.test(strip(rest.answers[0].text)), 'at rest at A is not speeding up');
  ok(/does not add up/.test(strip(J({ u: 0, stages: [{ kind: 'up', v: 5, t: 2, a: 3 }, { kind: 'hold' }] }).reason)), 'a stage that does not add up is refused at once, not as not enough');
  ok(/speeds up, but it goes from 0 to 0/.test(strip(J({ u: 0, stages: [{ kind: 'up', v: 0 }, { kind: 'hold' }] }).reason)), 'and so is a stage said to speed up that does not');
  const area = journeyWorking(J({ u: 20, stages: [{ kind: 'hold', t: 25 }, { kind: 'down', v: 8, a: 0.4 }, { kind: 'hold', t: 60 }, { kind: 'up', v: 20 }], D: 1960 })).find((x) => /area/.test(x.title));
  ok(/<span class="m/.test(area.note) || /class=/.test(area.note), 'the formulas in the area note are set as maths');
  const hud = KITS.journey.hud(J({ u: 0, stages: [{ kind: 'up', v: 22, t: 30 }, { kind: 'hold' }, { kind: 'down', v: 0 }], T: 120, D: 2145 }).f, 110);
  ok(hud.left[2].v === '−1.467', 'one rule for a rate on every screen: 1.467, as in the working');
});

group('A journey in three stages: seven papers, each against its mark scheme', () => {
  const J = (k) => solveJourney(k);
  const e = J({ a1: 0.5, a3: 0.25, T: 300, D: 6300 });
  ok(e.ok && e.unknown === 'V' && near(e.J.V, 30) && e.rejected.some((r) => near(r.x, 70) && /t_?2|negative/.test(strip(r.why))),
     'Edexcel M1 J15 Q7: V = 30, and V = 70 rejected because it makes the steady time negative');
  const as22 = J({ V: 25, T: 700, D: 15000, rel: { kind: 't3=k*t1', k: 4 }, at: { t: 572 } });
  ok(as22.ok && near(as22.J.t1, 40) && near(as22.J.a1, 0.625) && near(as22.answers[0].v, 20),
     'Edexcel 8MA0/22 J22 Q2: 40 s accelerating, 0.625 m s⁻², 20 m s⁻¹ at t = 572');
  const cie = J({ V: 25, T: 180, D: 3300, rel: { kind: 'a3=k*a1', k: 2 } });
  ok(cie.ok && near(cie.J.t1, 64) && near(cie.J.s3, 400), 'CIE 9709/43 J17 Q3: T = 64, and 400 m braking');
  const as18 = J({ a1: 0.3, t1: 80, a3: 0.5, D: 4800 });
  ok(as18.ok && near(as18.J.V, 24) && near(as18.J.T, 264), 'Edexcel 8MA0/02 J18 Q7: 24 m s⁻¹, and 264 s in all');
  const ial = J({ t1: 60, t3: 30, T: 270, D: 4500, at: { s: 2250, v: 5 } });
  ok(ial.ok && near(ial.J.V, 20) && near(ial.answers[0].t, 142.5)
     && near(ial.answers[1].times[0], 15) && near(ial.answers[1].times[1], 262.5),
     'Edexcel IAL WME01 Jan 2019 Q6: V = 20, halfway at 142.5 s, a quarter of V at 15 s and 262.5 s');
  const j12 = J({ V: 15, a3: 2.5, D: 885, rel: { kind: 't1=k*t2', k: 1 / 3 } });
  ok(j12.ok && near(j12.J.t2, 48) && near(j12.J.a1, 0.9375), 'Edexcel M1 Jan 2012 Q6: T = 48, and a = 0.9375');
  const j13 = J({ V: 22, t1: 30, T: 120, D: 2145 });
  ok(j13.ok && j13.unknown === 't2' && near(j13.J.t2, 75), 'Edexcel M1 J13 Q5(b): the car holds 22 m s⁻¹ for T = 75 s');
});

group('A journey: what cannot happen, and what does not agree', () => {
  const J = (k) => solveJourney(k);
  ok(!J({ V: 10, T: 20 }).ok, 'two numbers are not enough, and it says what is');
  ok(/no real solution/.test(strip(J({ a1: 0.5, a3: 0.25, T: 100, D: 6300 }).reason)), 'too far in too little time: no real root, said so');
  ok(/do not agree/.test(strip(J({ V: 30, a1: 0.5, a3: 0.25, T: 300, D: 6000 }).reason)), 'one number too many, and it disagrees');
  ok(J({ V: 30, a1: 0.5, a3: 0.25, T: 300, D: 6300 }).ok, 'one too many, and it agrees');
  ok(!J({ V: -3, a1: 0.5, a3: 0.25, T: 300 }).ok && !J({ a1: 0, a3: 0.25, T: 300, D: 10 }).ok, 'negative and zero rates refused');
  const tri = J({ a1: 1, a3: 1, T: 20, D: 100 });
  ok(tri.ok && near(tri.J.t2, 0) && near(tri.J.V, 10) && /triangle/.test(strip(tri.notes.join(' '))), 'no steady stretch: a triangle, said so');
  const out = J({ a1: 0.5, a3: 0.25, T: 300, D: 6300, at: { t: 400, s: 9000, v: 40 } });
  ok(out.ok && out.answers.every((a) => !a.ok) && out.notes.length === 3, 'questions outside the journey are answered as outside it');
  const f = e30().f, bad = [];
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * f.tMax;
    if (![f.pos(t).x, f.vel(t).x, f.accel(t)].every(isFinite)) bad.push(t);
    if (f.vel(t).x < -1e-9 || f.vel(t).x > 30 + 1e-9) bad.push(t);
  }
  ok(bad.length === 0, 'no NaN, and the speed stays between 0 and V');
  ok(near(f.pos(f.tMax).x, 6300) && near(f.pos(60).x, 900) && near(f.pos(180).x, 4500), 'the motion is the stages, end to end');
});

group('A journey: the working is the mark scheme’s', () => {
  const W = journeyWorking(e30()).map((st) => ({ title: st.title, rows: st.rows.map((r) => [strip(r.f), strip(r.s), strip(r.r)]), note: strip(st.note) }));
  ok(W[0].rows.map((r) => r[2]).join(' | ') === 't1=2V | t3=4V | t2=300−6V', 'each stage in terms of V: 2V, 4V, 300 − 6V');
  ok(W[1].rows[0][1] === '6300=½(300+300−6V)×V' && W[1].rows[1][2] === 'V2−100V+2100=0', 'the area: ½(300 + 300 − 6V)V = 6300, so V² − 100V + 2100 = 0');
  ok(/V=30orV=70/.test(W[1].rows[2][2]) && /V=70 makes t2=−120s/.test(W[1].note), 'both roots, and why 70 is rejected');
  const K = KITS.journey;
  const G = K.graphs(e30().f, 100, { disp: 'd', vel: 'v', acc: 'a', mark: 'm' });
  ok(G.every((sp) => sp.series.every((x) => x.dash)), 'every line dashed: motion along a track is horizontal');
  ok(G.every((sp) => yScale(sp.series, sp.tMax).ticks.length >= 2), 'every graph has a scale');
  ok(/<path/.test(K.thumb(byId('journey-stages'))), 'the card has a sketch from its own numbers');
  const end = K.ending(e30());
  ok(/6300/.test(end.title) && /ph-tab/.test(end.body) && (end.body.match(/ph-row/g) || []).length >= 4, 'the ending: a row of five per stage, and the total');
});
group('A journey: what critic round 1 found, kept found', () => {
  const J = (k) => solveJourney(k);
  const W = (k) => journeyWorking(J(k)).map((st) => ({ title: strip(st.title), rows: st.rows.map((r) => [strip(r.f), strip(r.s), strip(r.r)]), note: strip(st.note) }));
  const as22 = W({ V: 25, T: 700, D: 15000, rel: { kind: 't3=k*t1', k: 4 }, at: { t: 572 } });
  const at = as22.find((x) => /572/.test(x.title));
  ok(at && at.rows[0][1] === '25−0.15625×32' && at.rows[0][2] === 'v=20m s−1', 'the speed at 572 s from exact numbers: 25 − 0.15625 × 32 = 20, no rounded rate');
  const ial = W({ t1: 60, t3: 30, T: 270, D: 4500, at: { v: 5 } }).find((x) => /doing/.test(x.title));
  ok(ial.rows[0][1] === '5=0+⅓t' && ial.rows[1][1] === '5=20−⅔t' && ial.rows[2][2] === 't=262.5s', 'the times at a speed from each stage\u2019s exact rate: ⅓ and ⅔, never 0.3333');
  const j12 = W({ V: 15, a3: 2.5, D: 885, rel: { kind: 't1=k*t2', k: 1 / 3 } });
  ok(j12[0].rows.some((r) => r[2] === 't1=⅓t2') && /4t23/.test(j12[1].rows[0][1]), 'a third is ⅓ and four thirds a fraction, never 0.3333');
  const e = W({ a1: 0.5, a3: 0.25, T: 300, D: 6300 });
  ok(e[1].rows.some((r) => r[0] === '(V−30)(V−70)=0'), 'a quadratic that factorises is factorised, as the mark scheme does');
  const tri = W({ a1: 0.3, a3: 0.7, T: 20, D: 42 });
  ok(tri[1].rows.some((r) => /4×\(5021\)×42/.test(r[1])) && /triangle/.test(tri[1].note), 'the formula with its numbers in, and a triangle said to be one');
  const tied = J({ a1: 0.1, a3: 0.3, T: 93.3, D: 327 });
  ok(tied.ok && near(tied.J.t2, 0) && /rounded/.test(strip(tied.notes.join(' '))), 'rounded figures for a triangle: taken as the triangle, and said so');
  ok(!J({ V: 30, a1: 0.5, a3: 0.25, T: 300, D: 6330 }).ok, 'D = 6330 against 6300 (0.5 %) is refused, not quietly replaced');
  const near6310 = J({ V: 30, a1: 0.5, a3: 0.25, T: 300, D: 6310 });
  ok(near6310.ok && /You gave D=6310m; the rest fix it at 6300m/.test(strip(near6310.notes.join(' '))), 'within rounding, accepted — and the note says which figure is used');
  ok(/Pick which relation k belongs to/.test(strip(J({ V: 25, T: 700, D: 15000, rel: { kind: null, k: 4 } }).reason)), 'a k with no relation chosen is named as the problem');
  ok(/t2=2DV−T=75s/.test(strip(J({ V: 22, T: 120, D: 2145 }).reason)), 'V, T and D alone: not enough, but t₂ = 75 s is said');
  const byT = J({ V: 25, t2: 500, T: 700, rel: { kind: 't3=k*t1', k: 4 } });
  ok(byT.ok && /whole time/.test(byT.fixedBy) && !/area/.test(KITS.journey.ending(byT).body), 'when the whole time fixes the unknown, the ending says so — not the area');
  const G = KITS.journey.graphs(e30().f, 100, { disp: 'd', vel: 'v', acc: 'a', mark: 'm' });
  ok(G[2].series[0].breaks.length === 2, 'the acceleration graph is broken at each change: no vertical lines');
  ok(KITS.journey.lapse(e30().f) === 20 && KITS.journey.lapse({ tMax: 8 }) === 1, 'five minutes plays as a 20× time-lapse; a short one in real time');
  ok(KITS.journey.lapse({ tMax: 700 }) === 50 && KITS.journey.lapse({ tMax: 270 }) === 20, 'every journey inside about fifteen seconds of watching');
  const known = J({ t1: 60, t3: 30, T: 270, D: 4500 });
  ok(!known.dependsOn && /Everything else followed from what was given/.test(strip(KITS.journey.ending(known).body))
     && /Every other time follows from what is given/.test(strip(journeyWorking(known)[0].note)), 'when no time depends on the unknown, neither the working nor the ending says it did');
  ok(/which is the whole distance, fixed it/.test(strip(KITS.journey.ending(e30()).body)), 'the ending\u2019s sentence about the area is whole');
  const hud = KITS.journey.hud(e30().f, 300);
  ok(/rest/.test(hud.left[2].k) && hud.right.some((b) => b.v === '20×'), 'at B it says at rest, and the clock says it is a time-lapse');
});

group('The audit after two scenarios: what it found, kept found', () => {
  ok(snap(8.749999999999993) === 8.75 && snap(2 / 3) === 2 / 3 && snap(0.15625) === 0.15625 && snap(1 / 7) === 1 / 7,
     'snap removes floating-point dust and nothing else: 2⁄3 stays 2⁄3');
  ok(rat(3.5).p === 7 && rat(3.5).q === 2 && rat(1 / 0.3).q === 3 && rat(Math.SQRT2) === null, 'one fraction finder for every engine');
  let bad = 0;
  for (let i = 0; i < 400; i++) {
    const V = 1 + (i * 7.3) % 40, t1 = 1 + (i * 3.1) % 90, t2 = (i * 11.7) % 200, t3 = 1 + (i * 5.9) % 90;
    const q = solveJourney({ V, t1, t2, t3 });
    if (!q.ok || q.f.vel(q.J.T).x !== 0 || q.f.pos(q.J.T).x !== q.J.D) bad++;
  }
  ok(bad === 0, 'every journey is exactly at rest, exactly at B, at the end');
  const atB = solveJourney({ V: 20, t1: 10, t2: 60, t3: 30, at: { t: 100 } });
  ok(/at rest at B, 1600m from A/.test(strip(atB.notes.join(' '))), 'asked about t = T, it says at rest at B — not braking at −10⁻⁸');
  ok(!solvePair({ A: { h: 10, u: 0, t0: 1 }, B: { h: 10, u: 0, t0: 2 }, g: 9.8 }).meet, 'two held level, let go one after the other: their parting is not a meeting');
  const early = pairWorking(solvePair({ A: { h: 10, u: 5 }, B: { h: 10, u: 0, t0: 2 }, g: 9.81 }));
  ok(/t=0s is the instant they start, level/.test(strip(early[1].note)) && !/later crossing/.test(strip(early[1].note)), 'a root at the start is the start, not a later crossing');
  ok(!solvePair({ A: { h: 0, u: 0 }, B: { h: 5, u: 1 }, g: 0 }).ok, 'with no gravity, a particle on the ground and not thrown up never leaves it');
  ok(/0\.00373m above the ground/.test(strip(solvePair({ A: { h: 0, u: 0.3 }, B: { h: 0.004, u: 0, t0: 0.01 }, g: 9.81 }).say)), 'a meeting 4 mm up is not 0 m up');
  const neg = journeyWorking(solveJourney({ a1: 1, a3: 0.5, D: 2000, rel: { kind: 't1=k*t2', k: 0.25 } }))[1].note;
  ok(/is negative, and a speed cannot be/.test(strip(neg)), 'a negative root for V is called negative, not circularly');
  const PP = { disp: 'd', vel: 'v', acc: 'a', second: 's', mark: 'm' };
  const pg = KITS.pair.graphs(solvePair({ A: { h: 0, u: 20 }, B: { h: 40, u: 0, t0: 1 }, g: 10 }).f, 1, PP);
  ok(pg.every((sp) => sp.series.every((x) => Array.isArray(x.breaks) && x.breaks.length)), 'the pair’s lines break at release and landing: no vertical lines');
  const jg = KITS.journey.graphs(e30().f, 1, PP);
  ok(jg[1].shade.color === 'd' && /displacement/.test(jg[1].shade.label), 'the area under velocity–time is shaded as what it is: displacement');
  const y = yScale([{ fn: () => 40 }], 10);
  ok(y.hi >= 40 * 1.2 && y.ticks.includes(40), 'a line along the top of a graph has room above it, and its value is labelled');
  ok(timeLapse(300) === 20 && timeLapse(700) === 50 && timeLapse(8) === 1, 'the time-lapse lives with the rest of the pace logic');
  ok(/takes 300 s, so it is shown 20 times faster/.test(lapseNote(75, 300, 20).text) && !/really lasts/.test(lapseNote(75, 300, 20).text), 'its sentence never says a train really lasts 15 s');
  const hud = KITS.journey.hud(e30().f, 100, { rate: 0.75 });
  ok(hud.right[1].v === '15×' && hud.left[0].k === 'Displacement from A' && hud.left[1].k === 'Velocity', 'the HUD says what actually plays, in the road’s words');
});

group('Two on one road: four papers, each against its mark scheme', () => {
  const O = (k) => solveOvertake(k);
  const ocr = O({ A: { u: 20, V: 8, tau: 30 }, B: { u: 12 } });
  const over = ocr.events.find((e) => e.kind === 'overtake');
  ok(ocr.ok && near(ocr.A.a, -0.4) && over && over.ahead === 'B' && near(over.t, 45), 'OCR H240/03 J22 Q9: A decelerates at 0.4 m s⁻², and B overtakes at t = 45 s');
  const j13 = O({ A: { a: 22 / 30, V: 22 }, B: { t0: 10 }, find: 'B.a', line: 990 });
  ok(j13.ok && near(j13.found.value, 0.792) && near(j13.extras.find((x) => x.key === 'ownB').value, 50),
     'Edexcel M1 J13 Q5(c, d): the motorbike takes 50 s, at a = 0.792 m s⁻² (99⁄125)');
  const ial = O({ A: { a: 0.8, V: 4 }, B: { a: 1 }, find: 'B.tau', line: 100 });
  ok(ial.ok && near(ial.extras.find((x) => x.key === 'tA').value, 27.5) && near(ial.found.value, 3.915047, 1e-5)
     && near(ial.extras.find((x) => x.key === 'dv').value, 0.08495, 1e-4), 'Edexcel IAL WME01 J22 Q7: 27.5 s, T = 3.915, and the speeds differ by 0.085 m s⁻¹');
  // as the paper gives it: both take 27.5 s; the 100 m is part (c)'s answer
  const as23 = O({ A: { V: 4, tau: 5 }, B: { a: 1 }, find: 'B.V', at: 27.5 });
  const W23 = overtakeWorking(as23).map((st) => st.rows.map((r) => strip(r.r)).join(' | '));
  ok(as23.ok && near(as23.A.a, 0.8) && as23.found.value.toFixed(2) === '3.92' && W23.some((x) => /aA=0\.8m s−2/.test(x)) && W23.some((x) => /sA=100m/.test(x)),
     'Edexcel 8MA0/22 J23 Q1: Pat at 0.8 m s⁻² and 100 m, both worked, and X = 3.92');
  const Wi = overtakeWorking(ial).map((st) => ({ title: strip(st.title), rows: st.rows.map((r) => [strip(r.f), strip(r.s), strip(r.r)]), note: strip(st.note) }));
  const fi = Wi.find((x) => /time spent changing speed, from that/.test(x.title));
  ok(fi.rows[0][1] === '100=½tB×tB+tB(27.5−tB)' && fi.rows[0][2] === 'tB2−55tB+200=0', 'the race in the mark scheme’s own form: ½T × T + T(27.5 − T) = 100');
  ok(/tB=51\.085 is longer than the 27\.5s there is/.test(fi.note), 'the other root rejected, with the reason');
  ok(Wi.some((x) => x.rows.some((r) => r[1] === '|4−3.915|' && r[2] === '0.085m s−1')), 'IAL (d) worked: |4 − 3.915| = 0.085');
  const Wo = overtakeWorking(ocr).map((st) => st.rows.map((r) => strip(r.r)).join(' | '));
  ok(/aA=−0\.4m s−2/.test(Wo[0]) && Wo.some((x) => /sA=180\+8t \| sB=12t \| 4t−180=0 \| t=45s/.test(x)), 'OCR (a) and (b) worked: −0.4 m s⁻², then 180 + 8t = 12t, so t = 45 s');
  const Wj = overtakeWorking(j13).map((st) => st.rows.map((r) => strip(r.f) + ' ' + strip(r.s) + ' ' + strip(r.r)).join(' | '));
  ok(Wj.some((x) => /t−t0 60−10 50s/.test(x)) && /B’s a=0\.792/.test(strip(j13.derived.join(' '))) && /B has been moving 50s/.test(strip(j13.derived.join(' '))),
     'J13: 60 − 10 = 50 s worked, and the Ready line says whose a and the 50 s');
});

group('Two on one road: what cannot happen, and the edges', () => {
  const O = (k) => solveOvertake(k);
  ok(!O({ A: { u: 10, a: 1, V: 20, tau: 10 }, B: { u: 5 } }).ok, 'three of a, V and the time: refused, one too many');
  ok(/where they are level/.test(O({ A: { u: 10 }, B: { a: 1 }, find: 'B.a' }).reason), 'to find a number, it asks where they are level');
  ok(!O({ A: { u: 0 }, B: { u: 5 } }).ok, 'one that never moves is refused');
  const ahead = O({ A: { u: 20 }, B: { u: 10 } });
  ok(ahead.ok && /never level again: A stays ahead/.test(strip(ahead.notes.join(' '))), 'never level again: said so');
  const late = O({ A: { u: 10 }, B: { t0: 5, a: 2 } });
  const e = late.events.find((x) => x.kind === 'overtake');
  ok(e && near(10 * e.t, (e.t - 5) ** 2), 'a late starter catches up where 10t = (t − 5)², exactly');
  const head = O({ A: { u: 30, a: -2, V: 10 }, B: { u: 15, x0: -50 } });
  ok(head.ok && near(head.events.find((x) => x.kind === 'overtake').t, 30), 'a head start (B 50 m behind) is counted');
  const m = mover({ u: 3, a: 2, V: 7 }, 'A');
  ok(near(m.tau, 2) && near(timeAt(m, 10), 2) && near(m.pos(4), 10 + 14), 'a mover: changes for 2 s to 7 m s⁻¹, then holds it');
  ok(/its acceleration is negative: −0\.4, not 0\.4/.test(strip(O({ A: { u: 20, a: 0.4, V: 8 }, B: { u: 12 } }).reason)), 'a deceleration typed as a size is refused, with the sign it needs');
  ok(!O({ A: { u: 10, V: 20 }, B: { u: 5 } }).ok && !O({ A: { u: 10, tau: 5 }, B: { u: 5 } }).ok, 'a speed change with no rate or time, or a time with nothing to change: refused');
  const keep = O({ A: { V: 22, tau: 30 }, B: { t0: 10, tau: 20 }, find: 'B.V', line: 990 });
  ok(keep.ok && near(keep.found.value, 24.75) && near(keep.B.tau, 20) && near(timeAt(keep.B, 990), 60), 'finding V keeps the time that was given: B changes for 20 s, and reaches 990 m at 60 s');
  const tau = O({ A: { V: 22, tau: 30 }, B: { t0: 10, V: 25 }, find: 'B.tau', line: 990 });
  ok(tau.ok && near(tau.found.value, 20.8), 'and finding the time with V given: 20.8 s');
  const before = O({ A: { u: 20, V: 8, tau: 30 }, B: { u: 12 }, line: 300 });
  ok(/not level before the line: A is ahead\. They are level later, at t=45s/.test(strip(before.notes.join(' '))), 'a line before the overtaking: not level before it, level later — not “never”');
  ok(O({ A: { u: 20 }, B: { t0: 5, a: 1, V: 15 } }).f.tMax >= 20, 'never level: watched long enough to see them part, not 2 s');
  ok(/same motion twice/.test(O({ A: { u: 10 }, B: { u: 10 } }).reason), 'the same motion twice is refused, once, in one voice');
  const twoLate = O({ A: { t0: 3, u: 10 }, B: { t0: 5, u: 15 } });
  ok(!twoLate.events.some((e) => e.kind !== 'start' && e.t < 5), 'two waiting at the start are not “level” as one sets off');
  const e23 = KITS.lanes.ending(O({ A: { V: 4, tau: 5 }, B: { a: 1 }, find: 'B.V', at: 27.5 }));
  ok(/B’s final speed is 3\.915/.test(e23.title) && /Level at 27\.5/.test(e23.eyebrow) && /ph-tab/.test(e23.body), 'AS23 as the paper gives it: the ending says level at 27.5 s, and B’s final speed');
  const eAt = KITS.lanes.ending(O({ A: { u: 10 }, B: { a: 1 }, at: 20 }));
  ok(/They are level/.test(eAt.title) && /Level at 20/.test(eAt.eyebrow), 'level at a given time: the ending says so');
  const eLater = KITS.lanes.ending(O({ A: { u: 20, V: 8, tau: 30 }, B: { u: 12 }, line: 300 }));
  ok(/Not level before the line/.test(eLater.title) && /later, at 45/.test(eLater.eyebrow), 'level only after the line: the ending says not before it, and when');
  ok(/B draws ahead/.test(strip(O({ A: { V: 4, tau: 5 }, B: { a: 1 }, find: 'B.V', at: 27.5 }).notes.join(' '))), 'from the same start, the one that draws ahead is named');
  const K = KITS.lanes;
  const G = K.graphs(O({ A: { u: 20, V: 8, tau: 30 }, B: { u: 12 } }).f, 10, { disp: 'd', vel: 'v', acc: 'a', second: 's', mark: 'm' });
  ok(G.every((sp) => sp.series.every((x) => x.dash && x.tag && Array.isArray(x.breaks))), 'every line dashed, lettered and broken at its changes');
  ok(G[0].points.length === 1 && near(G[0].points[0].t, 45), 'the overtaking ringed on the displacement graph');
  ok(/<path/.test(K.thumb(byId('two-on-a-road'))), 'the card has a sketch from its own numbers');
  const end = K.ending(O({ A: { a: 22 / 30, V: 22 }, B: { t0: 10 }, find: 'B.a', line: 990 }));
  ok(/0\.792/.test(end.title) && (end.body.match(/acceleration is/g) || []).length === 0 && /ph-tab/.test(end.body), 'the ending: the number in the title, not said twice, and a row of five each');
});

group('Moving in a plane, in i and j: four papers, each against its mark scheme', () => {
  const Pl = (k) => solvePlane(k);
  const aqa12 = Pl({ u: { x: -1, y: 3 }, a: { x: 0.1, y: -0.2 }, at: { due: 'E', moving: 'SE' } });
  const due = aqa12.answers.find((x) => x.kind === 'due'), se = aqa12.answers.find((x) => x.kind === 'moving');
  ok(due.ok && near(due.t, 30) && se.ok && near(se.t, 20) && near(se.v.x, 1) && near(se.v.y, -1) && near(se.speed, Math.SQRT2),
     'AQA MM1B J12 Q7: due east of O at 30 s; moving south-east at 20 s, v = i − j, speed 1.41');
  const aqa13 = Pl({ r0: { x: 13.6, y: 0 }, u: { x: 6, y: 2.4 }, a: { x: -0.8, y: 0.1 }, at: { moving: 'NW' } });
  const nw = aqa13.answers[0];
  ok(nw.ok && near(nw.t, 12) && near(nw.r.x, 28) && near(nw.r.y, 36) && nw.dist.toFixed(1) === '45.6', 'AQA MM1B Jan13 Q7: moving north-west at 12 s, at 28i + 36j, 45.6 m from O');
  const ed = Pl({ u: { x: -2, y: 2 }, a: { x: 4, y: -5 }, at: { t: 2, y: -4.5 } });
  const at2 = ed.answers.find((x) => x.kind === 't'), py = ed.answers.find((x) => x.kind === 'passes');
  ok(near(at2.v.x, 6) && near(at2.v.y, -8) && near(py.t, 1.8) && near(py.r.x, 2.88), 'Edexcel 9MA0/32 Oct20 Q2: v = 6i − 8j at t = 2; passes y = −4.5 at 1.8 s, where λ = 2.88');
  const ocr = Pl({ vT: { x: 6, y: 0 }, T: 4, a: { x: 3, y: -2 } });
  ok(ocr.ok && near(ocr.u.x, -6) && near(ocr.u.y, 8) && /10m s−1/.test(strip(ocr.pre[1].r)), 'OCR H240/03 J23 Q8: u = v − aT = −6i + 8j, speed 10');
  const W = planeWorking(aqa12).map((st) => st.rows.map((r) => strip(r.f) + ' | ' + strip(r.s) + ' | ' + strip(r.r)));
  ok(W[0].some((x) => /v=\(−1\+0\.1t\)i\+\(3−0\.2t\)j/.test(x)) && W.some((st) => st.some((x) => /y=0 \| 3t−0\.1t2=0 \| t=30s/.test(x))), 'the working: v and r in components, and y = 0 for due east, as the mark scheme');
  ok(W.some((st) => st.some((x) => /vx=−vy \| −1\+0\.1t=−\(3−0\.2t\) \| t=20s/.test(x))), 'south-east: vₓ = −v_y, as the mark scheme');
});

group('Moving in a plane: edges, and the notation for vectors', () => {
  const Pl = (k) => solvePlane(k);
  ok(mathText('vec(i) + vec r') === '𝒊 + 𝒓' && /<b class="m-vec"><i class="m-var">i<\/i><\/b>/.test(mathHTML('vec(i)')), 'vectors are bold, in HTML and on a canvas');
  ok(!Pl({ u: { x: 1, y: 1 } }).ok && !Pl({ a: { x: 1, y: 0 } }).ok, 'no acceleration, or no velocity: what is missing is said');
  ok(!Pl({ u: { x: 1, y: 0 }, vT: { x: 2, y: 0 }, T: 1, a: { x: 1, y: 0 } }).ok, 'an initial velocity and a later one: refused, one fixes the other');
  const never = Pl({ u: { x: 1, y: 0 }, a: { x: 0, y: 1 }, at: { moving: 'W', due: 'S' } });
  ok(never.answers.every((a) => !a.ok) && never.notes.length === 2, 'never moving west, never due south: said, not invented');
  const opp = Pl({ u: { x: 2, y: 0 }, a: { x: -1, y: 0 }, at: { moving: 'E' } });
  ok(opp.answers[0].ok && near(opp.answers[0].t, 0), 'moving east from the start is at t = 0');
  const twice = Pl({ u: { x: 0, y: 10 }, a: { x: 0, y: -2 }, at: { y: 16, speed: 4 } });
  ok(near(twice.answers[0].times[0], 2) && near(twice.answers[0].times[1], 8) && near(twice.answers[1].times[0], 3) && near(twice.answers[1].times[1], 7), 'a coordinate and a speed met twice: both times');
  const fromRest = Pl({ u: { x: 0, y: 0 }, a: { x: 3, y: -3 }, at: { moving: 'SE' } });
  ok(fromRest.answers[0].ok && fromRest.answers[0].always && /the whole time/.test(strip(fromRest.notes.join(' '))), 'from rest it moves along its acceleration the whole time — not “never”');
  const later = Pl({ u: { x: 2, y: -2 }, a: { x: -1, y: 1 }, at: { moving: 'NW', due: 'SE' } });
  ok(/north-west from t=2s on/.test(strip(later.notes.join(' '))) && /south-east of O from the start until t=4s/.test(strip(later.notes.join(' '))), 'along one line, turning back: north-west from 2 s on, south-east of O until 4 s');
  ok(/whole time/.test(strip(Pl({ u: { x: 3, y: 4 }, a: { x: 0, y: 0 }, at: { speed: 5 } }).notes.join(' '))), 'no acceleration: its speed is 5 the whole time');
  ok(/x=0 at t=4s/.test(strip(Pl({ u: { x: 2, y: 1 }, a: { x: -1, y: 0 }, at: { x: 0 } }).notes.join(' '))), 'starting on x = 0 is not passing it: the answer is t = 4 s');
  const par = Pl({ u: { x: 1, y: 2 }, a: { x: 1, y: 0 }, at: { par: { x: 1, y: 2 } } });
  ok(par.answers[0].ok && near(Pl({ u: { x: -1, y: 2 }, a: { x: 1, y: 0 }, at: { par: { x: 1, y: 1 } } }).answers[0].t, 3), 'moving parallel to a vector: v ∥ i + j at t = 3 s');
  ok(/Initially 10 m s⁻¹/.test(KITS.plane.ending(ocrE()).title) && /10m s−1/.test(strip(ocrE().derived.join(' '))), 'OCR: the speed 10 is in the Ready line and the ending');
  const K = KITS.plane;
  const G = K.graphs(solvePlane({ u: { x: -1, y: 3 }, a: { x: 0.1, y: -0.2 }, at: { due: 'E' } }).f, 5, { disp: 'd', vel: 'v', acc: 'a', mark: 'm' });
  ok(G.every((sp) => sp.series[0].dash && !sp.series[1].dash), 'i parts dashed, j parts solid, on every graph');
  ok(/<path/.test(K.thumb(byId('vectors-ij'))), 'the card has a sketch from its own numbers');
  const e = K.ending(Pl({ r0: { x: 13.6, y: 0 }, u: { x: 6, y: 2.4 }, a: { x: -0.8, y: 0.1 }, at: { moving: 'NW' } }));
  ok(/north-west at 12/.test(e.title), 'the ending names what it found');
});

group('Every lettered line on every library graph gets its letter', () => {
  const P = { disp: 'd', vel: 'v', acc: 'a', second: 's', mark: 'm' };
  const cases = [
    ['pair-vertical', KITS.pair, solvePair(byId('pair-vertical').params)],
    ['N19', KITS.pair, solvePair({ A: { h: 0, u: 20 }, B: { h: 40, u: 0, t0: 1 }, g: 10 })],
    ['two-on-a-road', KITS.lanes, solveOvertake(byId('two-on-a-road').params)],
    ['IAL race', KITS.lanes, solveOvertake({ A: { a: 0.8, V: 4 }, B: { a: 1 }, find: 'B.tau', line: 100 })],
    ['vectors-ij', KITS.plane, solvePlane(byId('vectors-ij').params)],
    ['AQA J12', KITS.plane, solvePlane({ u: { x: -1, y: 3 }, a: { x: 0.1, y: -0.2 }, at: { due: 'E', moving: 'SE' } })],
    ['AQA Jan13', KITS.plane, solvePlane({ r0: { x: 13.6, y: 0 }, u: { x: 6, y: 2.4 }, a: { x: -0.8, y: 0.1 }, at: { moving: 'NW' } })],
  ];
  for (const [name, K, r] of cases) {
    for (const sp of K.graphs(r.f, 0, P)) {
      // the app's graph size: 294 × 183
      const { lo, hi } = yScale(sp.series, sp.tMax);
      const X = (t) => 52 + (t / sp.tMax) * (294 - 68), Y = (v) => 28 + 121 - ((v - lo) / (hi - lo)) * 121;
      const tags = endTags(sp.series, sp.tMax, Y, 34, 149);
      const n = sp.series.filter((x) => x.tag).length;
      // every letter, in its own place, in the order its lines end, each
      // either level with its line's end or joined to it by a leader
      const apart = tags.every((q, k) => k === 0 || q.y - tags[k - 1].y >= 17.9);
      const ordered = tags.every((q, k) => k === 0 || q.y0 >= tags[k - 1].y0);
      const tied = tags.every((q) => q.leader || Math.abs(q.y - q.y0) <= 3);
      const inPlot = tags.every((q) => q.y >= 34 && q.y <= 149);
      ok(tags.length === n && apart && ordered && tied && inPlot, `${name}, ${sp.title}: ${n} letters at their lines\u2019 ends, apart, in order, each tied to its line`);
    }
  }
});

/* ── over the wall, through the point ─────────────────────────────── */
group('Over the wall: each paper against its mark scheme', () => {
  const deg = (x) => (Math.atan(x) * 180) / Math.PI;
  // Edexcel 9MA0/32 Jun 2023 Q5: tan²α − 4tanα + 3 = 0, tan α = 1 or 3; greatest height 36 m
  const e23 = solveTarget({ g: 9.8, u: 28, d: 40, H: 20, kind: 'point', find: 'theta' });
  ok(e23.ok && e23.flights.length === 2 && near(e23.flights[0].theta, deg(3)) && near(e23.flights[1].theta, deg(1)), 'E J23 Q5(b): tan α = 3 or 1');
  ok(strip(e23.findRows[1].r) === 'tan2θ−4tanθ+3=0', 'E J23 Q5(b): the quadratic as the mark scheme writes it', strip(e23.findRows[1].r));
  ok(near(e23.flights[0].at.t, 10 / (7 * Math.cos(Math.atan(3)))), 'E J23 Q5(a): T = 10/(7 cos α)');
  ok(near(Math.max(...e23.flights.map((f) => f.topBefore)), 36), 'E J23 Q5(c): the greatest possible height on the way is 36 m');
  // WJEC Unit 4 Jun 2022 Q10: tan θ = 1 or 1.5; lands short of the flag, at least 5 m
  const w22 = solveTarget({ g: 9.8, u: 35, d: 100, H: 20, kind: 'tree', find: 'theta', flag: 130, pick: 'flat' });
  ok(w22.ok && near(Math.tan(w22.flights[0].theta * Math.PI / 180), 1.5) && near(Math.tan(w22.flights[1].theta * Math.PI / 180), 1), 'W J22 Q10(b)(i): tan θ = 1 or 1.5');
  ok(near(w22.flagGap, 5) && near(w22.other.R, 250 * 1.5 / 3.25), 'W J22 Q10(b)(ii): 5 m short at tan θ = 1; the other lands 115.4 m out');
  ok(targetWorking(w22).flatMap((x) => x.rows).some((r) => strip(r.r) === 'y=x−0.008x2'), 'W J22 Q10: at tan θ = 1 its path is y = x − x²/125');
  // AQA MM1B Jan 2013 Q8: horizontal component 16, V ≈ 20.6, α ≈ 39.1°
  const a13 = solveTarget({ g: 9.8, d: 38.4, H: 3, kind: 'face', find: 'time', T: 2.4 });
  ok(a13.ok && near(a13.shown.ux, 16) && near(a13.shown.u, 20.6, 0.05) && near(a13.shown.theta, 39.1, 0.05), 'AQA J13 Q8: 16 m s⁻¹, V = 20.6, α = 39.1°');
  ok(a13.shown.hits && near(a13.f.tMax, 2.4), 'AQA J13 Q8: it hits the wall, and the flight ends there');
  // Edexcel 9MA0/03 Jun 2018 Q10: α = 14.0°, 1.13 s
  const e18 = solveTarget({ g: 9.8, h0: 2, d: 20, H: 0.75, kind: 'point', find: 'apex', top: 3 });
  ok(e18.ok && e18.flights.length === 1 && near(e18.shown.theta, 14.04, 0.01) && near(e18.shown.at.t, 1.13, 0.005), 'E J18 Q10(b, d): α = 14.0°, 1.13 s to the target');
  ok(e18.rejected.some((x) => /before it is launched/.test(strip(x.text))), 'E J18 Q10: the negative time is rejected, and says why');
  // WJEC Unit 4 Jun 2019 Q10: 30.8 m s⁻¹; 12 m; clears by about 16 cm
  const w19 = solveTarget({ g: 9.8, h0: 2.4, ux: 30, uy: -1.4, tAt: 0.4, H: 0.9, kind: 'net' });
  ok(w19.ok && near(w19.shown.landSpeed, 30.8, 0.01) && near(w19.shown.tGround, 4 / 7), 'W J19 Q10(a): lands after 4⁄7 s at 30.8 m s⁻¹');
  ok(near(w19.P.d, 12) && near(w19.shown.at.y, 1.056) && near(w19.shown.at.clear, 0.156), 'W J19 Q10(b): 12i + 1.056j, over the net by 0.156 m');
  // OCR MEI H640/01 Jun 2018 Q9: 1.01 s; y = 5 − x²/40; 0 < d < 10.95
  const m18 = solveTarget({ g: 9.8, h0: 5, ux: 14, uy: 0, H: 2, d: 5, kind: 'wall' });
  ok(m18.ok && near(m18.shown.tGround, Math.sqrt(10 / 9.8)), 'MEI J18 Q9(i): down in 1.01 s');
  ok(strip(targetWorking(m18).find((x) => /path/i.test(x.title)).rows[0].r) === 'y=5−0.025x2', 'MEI J18 Q9(ii): y = 5 − 0.025x²');
  ok(m18.shown.span.from === 0 && near(m18.shown.span.to, Math.sqrt(120)), 'MEI J18 Q9(iii): a 2 m fence is cleared anywhere up to √120 = 10.95 m');
});

group('Over the wall: what cannot be, refused with its reason', () => {
  const r = (k) => strip(solveTarget(k).reason);
  ok(/cannot even get/.test(r({ g: 9.8, u: 10, d: 40, H: 20, find: 'theta' })), 'too slow to get that far at any angle');
  ok(/highest it can be/.test(r({ g: 9.8, u: 25, d: 40, H: 30, find: 'theta' })), 'gets that far, never that high: says the highest it can be');
  ok(/above that line/.test(r({ g: 9.8, theta: 30, d: 40, H: 30, find: 'u' })), 'a point above the line at θ: no speed');
  ok(/higher than its greatest height/.test(r({ g: 9.8, d: 20, H: 4, find: 'apex', top: 3 })), 'a point above the greatest height');
  ok(/not both/.test(r({ g: 9.8, u: 10, theta: 45, ux: 3 })), 'a speed and an angle and components: refused');
  ok(/leave the launch/.test(r({ g: 9.8, d: 10, H: 5, find: 'time', T: 1, u: 3 })), 'finding both with the launch typed: refused');
  ok(/never leaves/.test(r({ g: 9.8, u: 10, theta: -10 })), 'thrown down from the ground: never leaves it');
  ok(/Choose the value of g/.test(r({ u: 10, theta: 45 })), 'g is asked for');
  const hit = solveTarget({ g: 9.8, u: 20, theta: 30, d: 30, H: 6, kind: 'net' });
  ok(hit.ok && hit.shown.hits && near(hit.f.tMax, hit.shown.at.t) && hit.shown.R == null, 'a net it does not clear, it hits: the flight ends there');
  const short = solveTarget({ g: 9.8, u: 10, theta: 30, d: 30, H: 6, kind: 'wall' });
  ok(short.ok && /before it reaches/.test(short.notes.map(strip).join(' ')), 'landing before the wall is said');
  const two = solveTarget({ g: 9.8, d: 20, H: 2, find: 'apex', top: 5, kind: 'point' });
  ok(two.flights.length === 2 && !two.shown.at.rising && two.flights[1].at.rising, 'from a greatest height, two launches: the steeper passes on the way down');
  // the engine and an independent sum agree everywhere it is read
  for (const fl of [e23F(), w19F()]) {
    for (const t of [0, 0.3, fl.end / 2, fl.end]) ok(near(fl.y(t), fl.h0 + fl.uy * t - 0.5 * fl.g * t * t) && near(fl.x(t), fl.ux * t), `x and y at t = ${t.toFixed(3)} agree`);
  }
  for (const k of [{ g: 9.8, u: 28, d: 40, H: 20, kind: 'point', find: 'theta' }, { g: 9.8, h0: 2.4, ux: 30, uy: -1.4, tAt: 0.4, H: 0.9, kind: 'net' }]) {
    const g = KITS.target.graphs(solveTarget(k).f, 0, new Proxy({}, { get: () => '#000' }));
    ok(g.length === 3 && g.every((x) => x.series.length === 2 && x.series[0].dash && !x.series[1].dash), 'three graphs, across dashed and up solid');
  }
});
group('Over the wall: the critic’s round 1', () => {
  const face = solveTarget({ g: 9.8, u: 20, theta: 30, d: 20, kind: 'face' });
  ok(face.ok && face.shown.hits && near(face.f.tMax, face.shown.at.t) && face.shown.R == null && !targetWorking(face).some((x) => /lands/.test(x.title)), 'a wall it hits, no height given: the flight ends at the wall');
  ok(/not the 2 m given/.test(strip(solveTarget({ g: 9.8, u: 20, theta: 30, d: 20, H: 2, kind: 'face' }).reason).replace(/(\d)m\b/g, '$1 m')), 'a wall it hits at a height the launch disagrees with: refused, with both heights');
  for (const k of [{ g: 9.8, theta: -20, h0: 10, d: 10, H: 1, find: 'u', kind: 'point' }, { g: 10, d: 26, H: 2.3, kind: 'point', find: 'apex', top: 33.6 },
    { g: 9.81, h0: 14.6, d: 53.2, H: 1.8, kind: 'tree', find: 'theta', u: 38.2 }, { g: 10, d: 63.7, H: 14.5, kind: 'point', find: 'theta', u: 49.1 }]) {
    const r = solveTarget(k);
    const all = [...r.notes, ...targetWorking(r).flatMap((x) => x.rows.flatMap((y) => [y.s, y.r]))].map(strip).join(' ');
    ok(r.ok && r.flights.every((f) => f.at.clear === 0) && !/×\s*10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(all), `no rounding noise reaches the screen: ${JSON.stringify(k)}`);
  }
  const below = strip(solveTarget({ g: 9.8, d: 10, H: 0, h0: 20, T: 0.5, find: 'time', kind: 'point' }).notes.join(' '));
  ok(/61\.96° below/.test(below) && !/−61/.test(below), 'below the horizontal is said without a minus', below);
  ok(/horizontally/.test(strip(solveTarget({ g: 9.8, h0: 5, d: 14, H: 0, find: 'u', theta: 0, kind: 'point' }).notes.join(' '))), 'a horizontal launch is said as one');
  ok(/already landed/.test(strip(solveTarget({ g: 9.8, h0: 2.4, ux: 30, uy: -1.4, tAt: 0.8, H: 0.9, kind: 'net' }).reason)), 'a time above the net after it has landed: refused');
  ok(/more than 0/.test(strip(solveTarget({ g: 9.8, u: 10, theta: 30, d: 5, H: 0, kind: 'wall' }).reason)), 'a wall 0 m high: refused');
  ok(/choose what to find/.test(strip(solveTarget({ g: 9.8, u: 10, theta: 30, d: 5, H: 1, top: 3 }).reason)), 'a greatest height typed with nothing to find: said, not ignored');
  const w19 = targetWorking(solveTarget({ g: 9.8, h0: 2.4, ux: 30, uy: -1.4, tAt: 0.4, H: 0.9, kind: 'net' }));
  const net = w19.find((x) => /net/.test(x.title)).rows.map((r) => strip(r.f));
  ok(net[0] === 'x=uxt' && !net.includes('t=dux'), 'the time given: the distance is worked from it, not back again');
  ok(w19.some((x) => x.rows.some((r) => strip(r.s) === '2.4−(1.430)x−9.8x22×302')), 'the path is written with a minus, never “+ −”');
  const e23 = targetWorking(solveTarget({ g: 9.8, u: 28, d: 40, H: 20, kind: 'point', find: 'theta' }));
  ok(e23.flatMap((x) => x.rows).some((r) => strip(r.f) === 'ux=ucosθ' && /28cos71\.57°/.test(strip(r.s))), 'found angle: its components are worked before u_x is used');
  ok(e23.flatMap((x) => x.rows).some((r) => strip(r.f) === 'vy=uy−gt'), 'the landing velocity’s vertical part is its own row');
  ok(KITS.target.rows.flatMap((r) => r.fields).filter((f) => f.type === 'choice' && f.key !== 'find').every((f) => f.default), 'a choice the engine defaults shows its default');
  ok(byId('over-the-wall').params.pick === 'flat' && near(solveTarget(byId('over-the-wall').params).flagGap, 5), 'the card’s sketch is the WJEC setup, at the angle that lands 5 m short');
  const both = strip(solveTarget({ g: 9.8, u: 35, d: 100, H: 20, kind: 'tree', find: 'theta', flag: 130 }).notes.join(' '));
  ok(/θ=45°landsnearerthemark:5m/.test(both.replace(/\s/g, '')) && /the flatter/.test(both), 'with two answers and a mark, it says which lands nearer, and how to fly it');
  // round 2
  const mei = solveTarget({ g: 9.8, h0: 5, ux: 14, uy: 0, H: 2, kind: 'wall' });
  ok(mei.ok && near(mei.shown.span.to, Math.sqrt(120)) && /up to 10\.954/.test(strip(mei.derived[0])) && !mei.shown.at, 'MEI J18 Q9(iii) from the paper’s own data: a 2 m fence, no distance, cleared up to 10.954 m');
  ok(/lands 35\.348 m out.*never hits it/.test(strip(solveTarget({ g: 9.8, u: 20, theta: 30, d: 50, H: 3, kind: 'face' }).reason).replace(/(\d)m\b/g, '$1 m')), 'a wall it hits that it never reaches: says where it lands, not a height under the ground');
  for (const k of [{ g: 9.8, d: 20, H: 2, find: 'apex', top: 5, T: 3 }, { g: 9.8, d: 20, H: 2, find: 'time', T: 2, top: 5 }, { g: 9.8, u: 28, d: 40, H: 20, find: 'theta', T: 3 }]) ok(/clear that box/.test(strip(solveTarget(k).reason)), `a box typed for another question is said: ${JSON.stringify(k)}`);
  ok(/never reaches the mark/.test(strip(solveTarget({ g: 9.8, u: 20, theta: 30, d: 30, H: 6, kind: 'net', flag: 50 }).notes.join(' '))), 'a mark it never reaches, because it hits the net, is said');
  const close = strip(solveTarget({ g: 9.8, u: 20, d: 30, H: 9.3833, find: 'theta' }).reason);
  ok(/9\.3832 ?m.*9\.3833 ?m/.test(close), 'just out of reach: enough figures to tell the two heights apart', close);
  ok(targetWorking(solveTarget({ g: 9.8, theta: 30, d: 40, H: 20, find: 'u' })).flatMap((x) => x.rows).some((r) => /^u2=gd2/.test(strip(r.f))), 'finding u: the rearranged formula is a row');
  ok(!targetWorking(e23F0()).flatMap((x) => x.rows).some((r) => /tan−1\(tanθ\)/.test(strip(r.f))), 'no θ = tan⁻¹(tan θ) row');
});

group('Over the wall: the critic’s round 3', () => {
  // a find value never names a box, or choosing it would empty and lock that box
  const keys = [...KITS.target.fields, ...KITS.target.rows.flatMap((r) => r.fields)].map((f) => f.key);
  const finds = KITS.target.rows.flatMap((r) => r.fields).find((f) => f.key === 'find').options.map((o) => o.v);
  ok(finds.filter((v) => keys.includes(v)).every((v) => v === 'theta' || v === 'u'), 'only the angle and the speed chips lock a box: the time box stays the student’s');
  const read = KITS.target.read({ g: 9.8, d: 38.4, H: 3, kind: 'face', find: 'time', T: 2.4 });
  const a13 = solveTarget(read);
  ok(a13.ok && near(a13.shown.u, 20.622, 0.001) && near(a13.shown.theta, 39.12, 0.01), 'AQA J13 Q8 through the values screen’s own reading: 20.622 m s⁻¹ at 39.12°');
  // the table's greatest height is one it reaches
  const tab = (k) => strip(KITS.target.ending(solveTarget(k)).body);
  ok(!/8\.49/.test(tab({ g: 9.8, d: 10, H: 8, T: 1, find: 'time', kind: 'face' })), 'hits the wall still rising: no greatest height it never reaches');
  ok(!/11\.48/.test(tab({ g: 9.8, ux: 10, uy: 15, d: 10, kind: 'face' })), 'hits the wall still rising, launch given: the same');
  ok(/never leaves/.test(strip(solveTarget({ g: 9.8, u: 10, theta: -20, d: 30, H: 3, kind: 'face' }).reason)), 'thrown down from the ground at a wall: refused as never leaving the ground');
  ok(/more than 0/.test(strip(solveTarget({ g: 9.8, u: 20, d: 20, H: 0, find: 'theta' }).reason)), 'finding the angle over a wall 0 m high: refused, as when it is all given');
  ok(solveTarget({ g: 9.8, u: 20, d: 20, H: 0, find: 'theta', kind: 'point' }).ok, '… while a target point on the ground is fine');
  ok(!/6\.000/.test(strip(solveTarget({ g: 9.8, u: 32.6, d: 102.6, H: 6, find: 'theta' }).reason)), 'out of reach: the student’s number is not padded');
  const e = solveTarget({ g: 9.8, u: 28, d: 40, H: 20, kind: 'point', find: 'theta' });
  ok(/dividingby10/.test(strip(e.findRows[1].s).replace(/\s/g, '')), 'the quadratic’s rescaling says what it divided by');
  const aqa = targetWorking(a13);
  ok(aqa.some((x) => /top of its path/.test(x.title)) && /top of its path/.test(strip(a13.notes.join(' '))), 'AQA: the top it reaches before the wall is worked, not only drawn');
});

group('Over the wall: the critic’s round 4', () => {
  for (const k of [{ g: 9.8, d: 20, H: 2, top: 5, kind: 'face', find: 'apex', pick: 'flat' }, { g: 9.8, h0: 2, d: 20, H: 2.5, top: 3, kind: 'face', find: 'apex', pick: 'flat' }]) {
    const r = solveTarget(k);
    ok(r.ok && r.flights.every((f) => near(f.topBefore, k.top)) && r.rejected.some((x) => /on its way up/.test(strip(x.text))), `a wall it hits, from its greatest height: no launch that hits on the way up (${JSON.stringify(k)})`);
  }
  ok(/more than 0/.test(strip(solveTarget({ g: 9.8, u: 20, theta: 30, d: 20, H: 0, kind: 'face' }).reason)), 'a wall it hits 0 m up is refused');
  const w = targetWorking(solveTarget({ g: 9.8, h0: 2.4, ux: 30, uy: -1.4, tAt: 0.4, H: 0.9, kind: 'net' })).flatMap((x) => x.rows).map((r) => strip(r.r));
  ok(w.includes('y−H=0.156m') && w.includes('v=30.806m s−1'), 'every result row says what it is');
  ok(/below the horizontal/.test(KITS.target.ending(solveTarget({ g: 9.8, d: 10, H: 0, h0: 20, T: 0.5, find: 'time', kind: 'point' })).title), 'a downward launch is headlined without a minus');
});

group('Over the wall: the critic’s round 5', () => {
  for (const kind of ['tree', 'point', 'face']) {
    const r = solveTarget({ g: 9.8, d: 10, H: 3.5, top: 3.5, kind, find: 'apex' });
    const w = targetWorking(r).flatMap((x) => x.rows).map((x) => strip(x.r));
    ok(r.ok && r.flights.length === 1 && !r.rejected.length && w.includes('t=0.8452s'), `the point at the top of the path is one moment, not two (${kind})`, w.join(' | '));
  }
  let split = 0;
  for (const g of [9.8, 9.81, 10]) for (let h0 = 0; h0 <= 3; h0 += 0.5) for (let top = h0 + 0.5; top <= 8; top += 0.5) for (const d of [5, 10, 20, 50]) {
    const r = solveTarget({ g, h0, d, H: top, top, kind: 'point', find: 'apex' });
    if (!r.ok || r.flights.length !== 1) split++;
  }
  ok(split === 0, `a sweep of round numbers: the top of the path is never two answers (${split} were)`);
  ok(solveTarget({ g: 10, ux: 5, uy: 1, h0: 2, H: 2.05, kind: 'wall' }).shown.span == null, 'a wall exactly as high as the top is not “cleared from 0.5 to 0.5 m”');
  const huge = solveTarget({ g: 9.8, u: 1e5, d: 10, H: 3, kind: 'wall', find: 'theta' });
  ok(huge.ok && huge.flights.every((f) => Math.abs(f.at.clear) < 1e-6) && huge.rejected.some((x) => /straight up/.test(strip(x.text))), 'a near-vertical root that cannot reach the point is left out, and said');
  ok(/reach the ground before/.test(strip(solveTarget({ g: 9.8, h0: 2, d: 20, H: 1, theta: -40, find: 'u' }).reason)), 'no height under the ground in the find-u refusal');
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  ok(/const locked = new Set/.test(app) && !/markFound\(key\)/.test(app), 'pressing another chip never unlocks the box being found');
});

group('Over the wall: the critic’s round 6', () => {
  for (const k of [{ g: 9.81, h0: 0.894, d: 20, H: 22.773, top: 22.773, kind: 'point', find: 'apex' }, { g: 9.81, h0: 0.954, d: 20, H: 5.171, top: 5.171, kind: 'point', find: 'apex' },
    { g: 10, h0: 0, d: 181.6, H: 0.613, top: 0.613, kind: 'wall', find: 'apex' }, { g: 10, h0: 5.08, d: 106.5, H: 17.287, top: 17.287, kind: 'point', find: 'apex' },
    { g: 10, h0: 9.95, d: 141.7, H: 33.629, top: 33.629, kind: 'net', find: 'apex' }]) {
    const r = solveTarget(k);
    ok(r.ok && r.flights.length === 1 && !r.shown.span, `three-place inputs, point at the top: one launch, never refused (${JSON.stringify(k)})`, r.reason && strip(r.reason));
  }
  let bad = 0;
  for (let i = 0; i < 4000; i++) {
    const g = [9.8, 9.81, 10][i % 3], h0 = +((i * 0.37) % 10).toFixed(3), top = +(h0 + 0.01 + ((i * 7.13) % 40)).toFixed(3), d = +(0.5 + ((i * 13.7) % 200)).toFixed(1);
    const r = solveTarget({ g, h0, d, H: top, top, kind: 'point', find: 'apex' });
    if (!r.ok || r.flights.length !== 1) bad++;
  }
  ok(bad === 0, `4000 three-place cases with the point at the top: none split or refused (${bad})`);
  ok(/never leaves the ground/.test(strip(solveTarget({ g: 9.8, d: 50, H: 0, top: 0, kind: 'point', find: 'apex' }).reason)), 'a greatest height of 0 from the ground: said plainly');
});

group('From a cliff or a tower: each paper against its mark scheme', () => {
  const j10 = solveHeight({ place: 'tower', h: 49, u: 14.7, theta: 90, g: 9.8 });
  ok(j10.ok && near(j10.top, 60.025) && near(j10.vL, 34.3) && near(j10.T, 5), 'M1 J10 Q6: greatest height 60.0 m, 34.3 m s⁻¹, 5 s');
  const j12 = solveHeight({ place: 'tower', h: 17.5, v: 28, theta: 90, g: 9.8, level: 19 });
  ok(j12.ok && near(j12.f.params.u, 21) && near(j12.level.times[0], 1.30, 0.005) && near(j12.level.times[1], 2.99, 0.005), 'M1 J12 Q5: U = 21; 19 m above the start at 1.30 s and 2.99 s');
  ok(strip(levelRows(j12)[0].s) === '19=21t−½×9.8t2', 'M1 J12 Q5: the equation for the times, substituted');
  const o20 = solveHeight({ place: 'cliff', h: 25, s: 100, theta: 45, g: 9.8 });
  ok(o20.ok && near(o20.f.params.u, 28) && near(o20.top, 45), 'E 9MA0/32 Oct20 Q5: U = 28, greatest height 45 m');
  ok(!j10.notes.some((n) => /more than enough/.test(strip(n))), 'straight up: the angle is not called a spare value');
  for (const k of [{ g: 9.8, h: 0, u: 5, theta: 0 }, { g: 9.8, h: 10, u: 5, theta: 90, s: 3 }, { g: 9.8, h: 10, u: 5, theta: 120 }, { h: 10, u: 5, theta: 0 }, { g: 9.8, h: 10, u: 5, theta: 0, level: -20 }]) {
    ok(!solveHeight(k).ok && solveHeight(k).reason, `refused with a reason: ${JSON.stringify(k)}`);
  }
  for (const k of [{ place: 'cliff', h: 40, u: 15, theta: 0, g: 9.8 }, { place: 'cliff', h: 40, u: 15, theta: -30, g: 9.8 }, { place: 'tower', h: 30, u: 0, theta: -90, g: 9.8 }]) {
    const r = solveHeight(k);
    ok(r.ok && near(r.f.pos(r.T).y, 0, 1e-6) && r.T > 0, `lands on the sea or ground: ${JSON.stringify(k)}`);
  }
  const g = KITS.height.graphs(j10.f, 0, new Proxy({}, { get: () => '#000' }));
  ok(g.every((x) => x.series.length === 1 && !x.series[0].dash), 'straight up: one solid line on each graph, no empty across line');
  const g2 = KITS.height.graphs(o20.f, 0, new Proxy({}, { get: () => '#000' }));
  ok(g2.every((x) => x.series.length === 2 && x.series[0].dash && !x.series[1].dash), 'at an angle: across dashed, up solid');
});

group('Audit 4: from a cliff or a tower', () => {
  const top = solveHeight({ place: 'cliff', h: 30, theta: 90, u: 20, g: 10, level: 20 });
  ok(top.ok && top.level.times.length === 1 && near(top.level.times[0], 2) && /once, at the top/.test(strip(top.notes.join(' '))), 'a height equal to the top: once, at the top, never "never"');
  const ang = solveHeight({ place: 'cliff', h: 20, theta: 30, u: 14, g: 9.8, level: 2.5 });
  ok(ang.ok && ang.level.times.length === 1, 'the same at an angle');
  const zero = solveHeight({ place: 'cliff', h: 30, theta: 90, u: 20, g: 10, level: 0 });
  ok(zero.level.times.length === 1 && near(zero.level.times[0], 4) && /back at the height/.test(strip(zero.notes.join(' '))), 'level 0: back at the throw height at 4 s, not "at t = 0 on the way up"');
  ok(!solveHeight({ place: 'cliff', h: 30, theta: 90, u: 20, g: 10 }).derived.some((x) => /on the ground/.test(strip(x))), 'a cliff into the sea never says "on the ground"');
  const drop = solveHeight({ place: 'cliff', h: 30, theta: 30, u: 0, g: 9.8 });
  ok(drop.ok && /dropped/.test(strip(drop.notes.join(' '))) && !/more than enough/.test(strip(drop.notes.join(' '))), 'speed 0 at an angle: a drop, said so');
});

group('Thrown, chased and caught: the paper and its edges', () => {
  const a23 = solveCatch({ g: 9.8, h: 1.8, u: 14, theta: 60, yc: 0.3, c: { t0: 0.2 }, find: 'a' });
  ok(a23.ok && near(a23.tc, 2.5925, 1e-3) && near(a23.xc, 18.147, 1e-3) && near(a23.catcher.a, 6.34, 0.005), 'AQA 7357/2 J23 Q20: caught at 2.59 s, 18.15 m out, a = 6.34');
  const back = solveCatch({ g: 9.8, h: 1.8, u: 14, theta: 60, yc: 0.3, c: { t0: 0.2, a: 6.34 } });
  ok(back.ok && /catches it/.test(strip(back.notes.join(' '))), 'typed back at the rounded 6.34: it catches it, to the figures given');
  const t0 = solveCatch({ g: 9.8, h: 1.8, u: 14, theta: 60, yc: 0.3, c: { a: 8 }, find: 't0' });
  ok(t0.ok && near(t0.f.dog.pos(t0.tc), t0.xc, 1e-6), 'finding the delay: the dog is at the ball then');
  const u0 = solveCatch({ g: 9.8, h: 1.8, u: 14, theta: 60, yc: 0.3, c: { a: 2, t0: 0.2 }, find: 'u' });
  ok(u0.ok && near(u0.f.dog.pos(u0.tc), u0.xc, 1e-6), 'finding the starting speed: the dog is at the ball then');
  for (const k of [{ g: 9.8, u: 14, theta: 60, yc: 30, find: 'a' }, { g: 9.8, u: 14, theta: 60, yc: 0.3, c: { t0: 5 }, find: 'a' }, { g: 9.8, u: 14, theta: 0, yc: 0, find: 'a' },
    { g: 9.8, h: 1.8, u: 14, theta: 60, yc: 0.3, c: { a: 5 }, find: 't0' }, { u: 14, theta: 60, yc: 0.3 }]) {
    ok(!solveCatch(k).ok && solveCatch(k).reason, `refused with a reason: ${JSON.stringify(k)}`);
  }
  for (const s of catchWorking(a23)) for (const r of s.rows) ok(!/NaN|undefined|Infinity/.test(r.f + r.s + r.r), 'no NaN in the working');
  const g = KITS.catcher.graphs(a23.f, 0, new Proxy({}, { get: () => '#000' }));
  ok(g.every((x) => x.series[0].dash && x.series[1].dash && !x.series[2].dash), 'across dashed, up solid, on every graph');
  ok(typeof a23.f.path === 'function' && a23.f.path(10).length === 11 && near(a23.f.path(10)[10].y, 0.3), 'the motion has a path, for the ghost of a second launch');
});

group('There and back: the paper and its edges', () => {
  const P = { segs: [{ who: 'car', v: 15, t: 6 }, { who: 'car', v: 15, t: 11 }, { who: 'car', v: 0, t: 2 }, { who: 'foot', u: -2, v: -2, t: 20 }, { who: 'foot', u: 0, v: 0 }, { who: 'foot', u: 5, v: 5 }], T: 60, back: 4 };
  const r = solveTrip(P);
  ok(r.ok && near(r.S[0].a, 2.5) && near(r.S[2].a, -7.5), 'OCR 4728 J11 Q4(i): 2.5 and 7.5 m s⁻²');
  ok(near(r.S.slice(0, 3).reduce((a, s) => a + s.s, 0), 225), 'OCR 4728 J11 Q4(ii): the car travels 225 m');
  ok(near(r.S[4].t, 13) && near(r.S[5].t, 8) && near(r.f.pos(60), 225), 'OCR 4728 J11 Q4(iii): 13 s in the shop, and back at the car at 60 s');
  ok(byId('there-and-back') && near(solveTrip(byId('there-and-back').params).S[4].t, 13), 'the card is the paper');
  for (const k of [{ segs: [] }, { segs: [{ v: 5, t: -1 }] }, { segs: [{ v: 5, t: 2 }, { v: -5, t: 2 }] }, { segs: [{ v: 5, t: 2 }, { u: 0, v: 0 }] },
    { segs: [{ v: 5, t: 2 }, { u: 3, v: 3 }], back: 1 }, { segs: [{ v: 5, t: 2 }, { u: 0, v: 0 }], T: 1 }]) {
    ok(!solveTrip(k).ok && solveTrip(k).reason, `refused with a reason: ${JSON.stringify(k)}`);
  }
  for (const sec of tripWorking(r)) for (const row of sec.rows) ok(!/NaN|undefined|Infinity/.test(row.f + row.s + row.r), 'no NaN in the working');
  const gr = KITS.trip.graphs(r.f, 0, new Proxy({}, { get: () => '#000' }));
  ok(gr.every((x) => x.series.every((sr) => sr.dash)), 'along the road: dashed on every graph');
});

group('Audit 5: catch and trip', () => {
  const c = solveCatch({ g: 9.81, u: 20, theta: 40, yc: 0, c: { t0: 0, u: 5, a: -3 } });
  ok(c.ok && near(c.f.dog.pos(c.tc), 25 / 6) && c.f.dog.vel(c.tc) === 0 && near(c.gap, 25 / 6 - c.xc, 1e-3), 'a slowing dog stops and stays stopped, and the gap is from there');
  ok(/never moves forwards/.test(strip(solveCatch({ g: 9.8, u: 14, theta: 60, yc: 0.3, c: { a: -2 } }).reason)), 'from rest and slowing: refused');
  ok(/add up to/.test(strip(solveTrip({ segs: [{ v: 6, t: 3 }, { v: 0, t: 2 }, { u: -6, v: -6 }], back: 1, T: 99 }).reason)), 'a total time the segments do not make: refused');
  ok(/not back there/.test(strip(solveTrip({ segs: [{ v: 6, t: 3 }, { v: 0, t: 3 }, { u: -6, v: -6, t: 1 }], back: 1 }).reason)), 'ends back at a segment it is not back at: refused');
  ok(/back at the start/.test(strip(solveTrip({ segs: [{ v: 6, t: 2 }, { v: 0, t: 2 }, { u: -6, v: -6, t: 2 }] }).notes.join(' '))), 'back at the start is said so');
});

group('A parachute jump in stages: the paper', () => {
  const K = KITS.jump;
  const r = K.solve({ g: 10, D: 550, t1: 3, a2: 12, t2: 2 });
  ok(r.ok && near(r.f.tMax, 83.1667, 1e-3) && near(r.f.vel(3).x, 30) && near(r.f.vel(6).x, 6), 'E 8MA0/22 J19 Q1: 30 and 6 m s⁻¹, T = 83.2 s');
  ok(near(r.f.jump.D, 550) && near(r.f.pos(r.f.tMax).x, 550), 'it lands after 550 m');
  ok(!K.solve({ D: 550, t1: 3, a2: 12, t2: 2 }).ok, 'g is asked for');
  const g = K.graphs(r.f, 0, new Proxy({}, { get: () => '#000' }));
  ok(g.every((x) => x.series.every((sr) => !sr.dash)), 'vertical: solid on every graph');
});

group('From a height: the bridge, the board, the well and the balloon', () => {
  for (const place of ['bridge', 'board', 'well', 'balloon']) {
    const r = solveHeight({ place, h: 20, u: 5, theta: place === 'well' ? -90 : 90, g: 9.8 });
    ok(r.ok && near(r.f.pos(r.T).y, 0, 1e-6) && /hits|enters/.test(strip(r.notes.join(' '))), `${place}: it comes down to the water or the ground`);
  }
  ok(/straight up or down/.test(strip(solveHeight({ place: 'well', h: 20, u: 5, theta: 30, g: 9.8 }).reason)), 'down a well at an angle: refused');
  ok(/balloon/.test(strip(solveHeight({ place: 'balloon', h: 20, u: 5, theta: 30, g: 9.8 }).reason)), 'from a balloon at an angle: refused, saying why');
  ok(/at the bottom of the well/.test(strip(solveHeight({ place: 'well', h: 20, u: 0, theta: -90, g: 9.8 }).notes.join(' '))), 'the well says where it lands as a well');
});

group('From a height: the time to the top', () => {
  const ial = solveHeight({ place: 'tower', theta: 90, tTop: 2.5, t: 7, g: 9.8 });
  ok(ial.ok && near(ial.f.params.u, 24.5) && near(ial.h, 68.6), 'IAL WME01 Oct21 Q6: u = 24.5, the start 68.6 m up');
  const aqa = solveHeight({ place: 'cliff', h: 10, theta: 35, tTop: 1.5, g: 9.8 });
  ok(aqa.ok && near(aqa.f.params.u, 25.63, 0.01) && near(aqa.T, 3.571, 1e-3), 'AQA 7357/2 J18 Q16: u = 25.6, 3.57 s in the air');
  ok(/not both/.test(strip(solveHeight({ place: 'cliff', h: 10, theta: 35, tTop: 1.5, u: 3, g: 9.8 }).reason)), 'speed and time to the top together: refused');
  ok(/upwards/.test(strip(solveHeight({ place: 'cliff', h: 10, theta: -20, tTop: 1.5, g: 9.8 }).reason)), 'a time to the top when thrown down: refused');
  ok(/too short/.test(strip(solveHeight({ place: 'tower', theta: 90, u: 20, t: 2, g: 9.8 }).reason)), 'a landing time too short to have started above the ground: refused');
  ok(KITS.height.working(ial, 1)[0].title === 'The speed, from the time to the top', 'the working starts from the time to the top');
});

group('Two ships, in i and j: the papers', () => {
  const j12 = solveTwoPlane({ units: 'km', A: { r0: { x: 2, y: -8 }, v: { x: -4, y: 8 } }, B: { r0: { x: 18, y: 12 }, v: { x: -6, y: -8 } }, at: { due: 'W' } });
  ok(j12.ok && near(j12.answers[0].t, 1.25) && near(j12.answers[0].dist, 13.5) && near(j12.heads[0].sp, Math.sqrt(80)), 'M1 J12 Q7: speed √80; due west at 1.25 h, 13.5 km apart');
  const j17 = solveTwoPlane({ units: 'km', A: { r0: { x: 9, y: 10 }, v: { x: 9, y: -2 } }, B: { r0: { x: 1, y: 4 }, v: { x: 4, y: 8 } }, at: { apart: 10 } });
  ok(j17.ok && Math.round(j17.heads[0].br) === 103 && near(j17.answers[0].times[0], 0) && near(j17.answers[0].times[1], 0.32), 'M1 J17 Q7: bearing 103°, 10 km apart at t = 0 and 0.32');
  const i19 = solveTwoPlane({ units: 'm', A: { r0: { x: 20, y: -17 }, v: { x: -6, y: 7 } }, B: { r0: { x: -8, y: 9 }, w: { x: 1, y: 2 } }, find: 'p', at: { due: 'SW', bOfA: true, dueT: 4 } });
  ok(i19.ok && Math.round(i19.heads[0].br) === 319 && near(i19.p, -0.5) && near(Math.hypot(i19.B.v.x, i19.B.v.y), Math.sqrt(5) / 2), 'IAL Jan19 Q2: bearing 319°, p = −0.5, B at √5⁄2');
  for (const k of [{}, { A: { v: { x: 1 } } }, { A: { v: { x: 1 } }, B: { v: { x: 1 }, w: { x: 1 } }, find: 'p', at: { due: 'N', dueT: 1 } }, { A: { v: { x: 1, y: 0 } }, B: { w: { x: 1, y: 0 } }, find: 'p', at: { due: 'E', dueT: 1 } }]) {
    ok(!solveTwoPlane(k).ok && solveTwoPlane(k).reason, `refused with a reason: ${JSON.stringify(k)}`);
  }
  for (const sec of twoPlaneWorking(j12)) for (const row of sec.rows) ok(!/NaN|undefined/.test(row.f + row.s + row.r), 'no NaN in the working');
  const g = KITS.twoplane.graphs(j12.f, 0, new Proxy({}, { get: () => '#000' }));
  ok(g[0].series.every((s, i) => (i % 2 === 0) === !!s.dash), 'i parts dashed, j parts solid');
});

group('Two ships: the critic’s round 1', () => {
  const note = (k) => strip(solveTwoPlane(k).notes.slice(-1)[0]);
  ok(/Never/.test(note({ A: { r0: { x: 5, y: 0 }, v: { x: 1, y: 0 } }, B: { r0: { x: 0, y: 0 }, v: { x: 1, y: 0 } }, at: { due: 'W' } })), 'on one line, the wrong way round: never, not "the whole time"');
  ok(/untilt=4/.test(note({ A: { r0: { x: -4, y: 0 }, v: { x: 1, y: 0 } }, B: { r0: { x: 4, y: 0 }, v: { x: -1, y: 0 } }, at: { due: 'W' } }).replace(/\s/g, '')), 'passing through each other on one line: until they meet');
  ok(/same place/.test(note({ A: { r0: { x: -4, y: 0 }, v: { x: 1, y: 0 } }, B: { r0: { x: 0, y: -4 }, v: { x: 0, y: 1 } }, at: { due: 'NE' } })), 'meeting exactly: no direction, said so');
  ok(/from the start on/.test(note({ A: { v: { x: -1, y: 0 } }, B: { v: { x: 0, y: 0 } }, at: { due: 'W' } })), 'setting off from the same place: from the start on, not never');
  const sqRow = strip(twoPlaneWorking(solveTwoPlane({ units: 'm', A: { r0: { x: -4, y: 0 }, v: { x: 0, y: 0 } }, B: { v: { x: 0, y: 3 } }, at: { apart: 5 } })).slice(-1)[0].rows[0].s);
  ok(sqRow.startsWith('(−4)2'), 'a negative number squared is bracketed', sqRow);
});

group('Audit 7', () => {
  const same = solveTwoPlane({ A: { r0: { x: 0, y: 0 }, v: { x: 3, y: 4 } }, B: { r0: { x: 3, y: 4 }, v: { x: 3, y: 4 } }, at: { apart: 5 } });
  ok(/the whole time/.test(strip(same.notes.slice(-1)[0])), 'the same velocity, 5 apart: the whole time');
  ok(/neither moves/.test(strip(solveTwoPlane({ A: { v: { x: 0, y: 0 } }, B: { r0: { x: 5, y: 0 }, v: { x: 0, y: 0 } }, at: { due: 'W' } }).notes.slice(-1)[0])), 'both at rest: neither moves');
  ok(!solveHeight({ place: 'cliff', theta: 90, tTop: 2.5, t: 7, g: 9.8 }).notes.some((n) => /No launch height given/.test(strip(n))), 'the found height is said once, in the scene’s words');
  ok(!/ground/.test(strip(solveHeight({ place: 'cliff', h: 0.5, u: 20, theta: 60, s: 30, t: 2, g: 9.8 }).reason || '')), 'a cliff’s refusal never says the ground');
});

group('Two ships: the lighthouse', () => {
  const r = solveTwoPlane({ units: 'km', A: { r0: { x: -2, y: 9 }, r1: { x: 4, y: 6 }, t1: 0.6 }, find: 'B', at: { sights: [{ due: 'E', t: 1.8 }, { due: 'NE', t: 2 }], due: 'S' } });
  ok(r.ok && near(r.A.v.x, 10) && near(r.A.v.y, -5) && near(r.B.r0.x, 19) && near(r.B.r0.y, 0), 'IAL Oct21 Q8: v = 10i − 5j, the lighthouse at 19i');
  ok(near(r.answers[0].t, 2.1) && /19i−1\.5j/.test(strip(r.notes.join(' ')).replace(/\s/g, '')), 'IAL Oct21 Q8(d): due south of it at 19i − 1.5j');
  ok(/same line/.test(strip(solveTwoPlane({ A: { v: { x: 1, y: 0 } }, find: 'B', at: { sights: [{ due: 'E', t: 1 }, { due: 'W', t: 2 }] } }).reason)), 'two sightings along one line: refused');
  ok(/behind/.test(strip(solveTwoPlane({ A: { v: { x: 1, y: 0 } }, find: 'B', at: { sights: [{ due: 'NE', t: 2 }, { due: 'N', t: 1 }] } }).reason)), 'lines of sight that cross behind: refused');
  ok(/leave B/.test(strip(solveTwoPlane({ A: { r0: { x: -2, y: 9 }, r1: { x: 4, y: 6 }, t1: 0.6 }, B: { v: { x: 3, y: 3 } }, find: 'B', at: { sights: [{ due: 'E', t: 1.8 }, { due: 'NE', t: 2 }] } }).reason)), 'finding B with B’s velocity typed: refused');
  ok(/not both/.test(strip(solveTwoPlane({ A: { v: { x: 1, y: 1 }, r1: { x: 4, y: 6 }, t1: 0.6 }, B: { v: { x: 0, y: 0 } } }).reason)), 'a velocity and a later position: refused');
  ok(/A itself/.test(strip(solveTwoPlane({ A: { v: { x: 0, y: 0 }, r1: undefined }, find: 'B', at: { sights: [{ due: 'N', t: 1 }, { due: 'E', t: 2 }] } }).reason || '')) || !solveTwoPlane({ A: { v: { x: 0, y: 0 } }, find: 'B', at: { sights: [{ due: 'N', t: 1 }, { due: 'E', t: 2 }] } }).ok, 'A at rest, two directions: no false "behind"');
});

group('Braking for a sign: three models', () => {
  const r = KITS.models.solve({ u: 25, D: 48, a: 6, limit: 13, react: 0.2 });
  ok(r.ok && near(r.models[0].vSign, 7) && near(r.models[1].tSign, 2.769, 1e-3) && near(r.models[2].tSign, 2.585, 1e-3), 'IAL Oct21 Q3: 7 m s⁻¹; 2.77 s; 2.58 s');
  ok(!KITS.models.solve({ u: 25, D: 48, a: 6, limit: 30, react: 0.2 }).ok, 'a limit above the speed: refused');
  const near10 = KITS.models.solve({ u: 25, D: 30, a: 6, limit: 13, react: 0.2 });
  ok(near10.ok && /still above the limit/.test(strip(near10.notes.join(' '))), 'a sign too close to brake to the limit: said in its own words, the other lanes still run');
  const short = KITS.models.solve({ u: 25, D: 60, a: 6, limit: 13, react: 0.2 });
  ok(short.ok && /short of the sign/.test(strip(short.notes[0])) && short.models[1].tSign > 0, 'model 1 stopping short: it stops, said so; models 2 and 3 still answer');
  const late = KITS.models.solve({ u: 25, D: 48, a: 6, limit: 13, react: 2.5 });
  ok(late.ok && /during the reaction time/.test(strip(late.notes[2])), 'a reaction so long it passes the sign first: said so');
  ok(KITS.models.solve({ u: 25, D: 48, a: 6, limit: 13, react: 0 }).ok, 'no reaction time: model 3 is model 2');
  const g = KITS.models.graphs(r.f, 0, new Proxy({}, { get: () => '#000' }));
  ok(g.every((x) => x.series.length === 3 && x.series.every((s) => s.dash)), 'three models on each graph, dashed along the road');
});

group('Audit 8', () => {
  const w = twoPlaneWorking(solveTwoPlane({ A: { v: { x: 1, y: 0 } }, B: { r0: { x: -3, y: -4 }, v: { x: 0, y: 0 } } })).flatMap((s) => s.rows).map((r) => strip(r.r || '')).join(' ');
  ok(!/\+\s*\(−/.test(w), 'a lone negative part is written with a minus, not + (−4j)', w);
  const lh = solveTwoPlane({ units: 'km', A: { r0: { x: -2, y: 9 }, r1: { x: 4, y: 6 }, t1: 0.6 }, find: 'B', at: { sights: [{ due: 'E', t: 1.8 }, { due: 'NE', t: 2 }] } });
  ok(lh.ok && lh.f.tMax >= 2 && /B is at/.test(KITS.twoplane.ending(lh).title), 'the lighthouse run reaches both sightings, and the ending says where it is', lh.reason);
  const sh = KITS.models.solve({ u: 25, D: 60, a: 6, limit: 13, react: 0.2 });
  ok(sh.ok && sh.models.every((m) => m.does), 'every lane says what it does');
  ok(!/which with no|which no/.test(KITS.models.solve({ u: 25, D: 48, a: 6, limit: 13 }).notes.join(' ')), 'no reaction time reads cleanly');
});

group('Off the bench (9PH0/01 J18 Q18b)', () => {
  const r = KITS.bench.solve({ look: 'foil', g: 9.81, d: 0.5, tGap: 0.14, drop: 0.08 });
  ok(r.ok && Math.abs(r.u - 3.5714) < 1e-3, 'speed 0.50 / 0.14 = 3.57 m s⁻¹ (MS 3.6)', r.reason);
  ok(Math.abs(r.fall - 0.0961) < 1e-4 && r.atCentre === false && r.miss > 0, 'drops 9.6 cm at the second strip: not at its centre (MS)');
  ok(/below the centre/.test(KITS.bench.ending(r).title), 'the ending says below the centre');
  const c = KITS.bench.solve({ g: 9.81, d: 0.5, tGap: 0.14, drop: 0.0961 });
  ok(c.ok && c.atCentre, 'a strip set at the drop is broken at its centre');
  const tb = KITS.bench.solve({ look: 'table', g: 9.8, H: 0.8, R: 1.2 });
  ok(tb.ok && Math.abs(tb.u - 2.97) < 0.01 && tb.floorRows.length === 1, 'off a table: the speed from the height and how far out, no row twice');
  ok(!KITS.bench.solve({ g: 9.81, u: 2, tGap: 0.1, d: 0.2 }).ok, 'the speed and the time together are refused');
  ok(!KITS.bench.solve({ g: 9.81, u: 1, H: 0.1, d: 2 }).ok, 'a strip past where it lands is refused');
  ok(!KITS.bench.solve({ g: 9.81, d: 0.5 }).ok, 'no speed and no time: it says what is needed');
  ok(!KITS.bench.solve({ g: 9.81, d: 0.5, tGap: 0.14, H: 0.8, R: 1.5 }).ok && !KITS.bench.solve({ g: 9.81, u: 2, R: 1 }).ok, 'a landing distance that would be ignored is refused');
  ok(!KITS.bench.solve({ g: 9.81, d: 0.5, tGap: 0.14, H: 0.3, drop: 0.5 }).ok, 'a strip below the floor is refused');
  const hi = KITS.bench.solve({ g: 9.81, d: 0.5, tGap: 0.14, drop: 0.2 });
  ok(!/only/.test(hi.notes.join(' ')) && /above its centre/.test(hi.notes.join(' ')), 'a strip set lower than the drop: above its centre, no "only"');
  const near = KITS.bench.solve({ g: 9.81, d: 0.5, tGap: 0.14, drop: 0.096 });
  ok(near.atCentre && /0\.0001/.test(near.stripRows[near.stripRows.length - 1].r.replace(/<[^>]+>/g, '')) && /half a millimetre/.test(near.notes.join(' ')), 'within half a millimetre: the true difference, and said so');
});

group('Over the wall, in a letter (H240/03 J22 Q13)', () => {
  const r = KITS.clears.solve({ g: 9.8, P: 1, Q: 0.5, beyond: 3, u: 54.6 });
  ok(r.ok && Math.abs(r.theta - 33.69) < 0.01 && /33\.7°/.test(KITS.clears.ending(r).title), 'tan θ = 2/3: 33.7° (MS)', r.reason);
  ok(Math.abs(r.a - 70.2) < 0.01 && Math.abs(r.Hmax - 46.8) < 0.01, 'a = 70.2, greatest height 2a/3 = 46.8 m (MS)');
  const back = KITS.clears.solve({ g: 9.8, P: 1, Q: 0.5, beyond: 3, a: 70.2 });
  ok(back.ok && Math.abs(back.u - 54.6) < 1e-6, 'given a, the speed comes back');
  const f = r.f; ok(Math.abs(f.pos(f.tWall).y - f.wall.H) < 1e-9 && Math.abs(f.pos(r.T).y) < 1e-9, 'the path passes the top of the wall and lands at 4a');
  const none = KITS.clears.solve({ g: 9.8, P: 1, Q: 0.5, beyond: 3 });
  ok(!none.ok && /33\.7/.test(none.reason.replace(/<[^>]+>/g, '')), 'with neither the speed nor a, it still gives the angle');
  ok(!KITS.clears.solve({ g: 9.8, P: 1, Q: 0.5, beyond: 3, u: 50, a: 70 }).ok, 'the speed and a together are refused');
});

group('Stage by stage (MM1B Jan13 Q1, H240/03 J19 Q7, H556/01 J19 Q19a)', () => {
  const K = KITS.chain;
  const r = K.solve({ stages: [{ u: 20, v: 12, s: 640 }, { s: 1820, t: 70 }] });
  ok(r.ok && Math.abs(r.S[0].t - 40) < 1e-9 && Math.abs(r.S[0].a + 0.2) < 1e-9, 'stage 1: 40 s, deceleration 0.2 (MS)', r.reason);
  ok(Math.abs(r.S[1].a - 0.4) < 1e-9 && Math.abs(r.S[1].v - 40) < 1e-9 && Math.abs(r.avg - 2460 / 110) < 1e-9, 'stage 2: 0.4 m s⁻², 40 m s⁻¹; average 22.4 (MS)');
  const cy = K.solve({ stages: [{ u: 0, a: 1.5, t: 4 }, { a: 0, t: 6 }] });
  ok(cy.ok && Math.abs(cy.Stot - 48) < 1e-9, 'the cyclist: 48 m in 10 s');
  const br = K.solve({ stages: [{ u: 18, a: 0, t: 0.5 }, { v: 0 }], S: 38 });
  ok(br.ok && Math.abs(br.S[1].a + 324 / 58) < 1e-9, 'reaction then braking, stopped in 38 m: 5.59 m s⁻² (from the whole distance)');
  const back = K.solve({ stages: [{ u: 0, a: 2, s: 25 }, { u: 10, a: -1, t: 4 }] });
  ok(back.ok && back.S[0].v === 10, 'a stage that ends where the next is given to start');
  ok(!K.solve({ stages: [{ u: 20, v: 12, s: 640, t: 30 }] }).ok, 'four numbers that disagree are refused');
  ok(!K.solve({ stages: [{ u: 5, v: 11.4, t: 4 }, { a: 0 }] }).ok, 'a stage short of a number says so');
  ok(!K.solve({ stages: [{ u: 0, a: 1, t: 4 }, { a: 0 }], T: 3 }).ok, 'a whole time shorter than the stages is refused');
  const rev = K.solve({ stages: [{ u: 6, a: -2, t: 6 }] });
  ok(rev.ok && rev.back && Math.abs(rev.avg - 3) < 1e-9 && rev.Stot === 0, 'turning back: an average speed of 3 from 18 m travelled, not 0');
  ok(!K.solve({ stages: [{ u: 0, a: 2, t: 5 }, { u: 12, a: 0, t: 2 }] }).ok && !K.solve({ stages: [{ u: 0, v: 5, t: 2 }, { u: 9, a: 0, t: 2 }] }).ok, 'a start that is not where the last stage ended is refused');
  ok(!K.solve({ stages: [{ u: 0, a: 1, t: 2 }, { a: 0, t: 2 }], T: 999 }).ok, 'a whole time the stages do not add up to is refused');
  ok(/twice/.test(K.solve({ stages: [{ u: 10, a: -2, s: 21 }] }).notes.join(' ')), 'two roots: it says both, and which is taken');
  ok(!/twice/.test(K.solve({ stages: [{ u: 0, a: 1.5, t: 4 }, { a: 0 }], S: 48, T: 10 }).notes.join(' ')) && !/twice/.test(K.solve({ stages: [{ u: 10, a: -4, s: 0 }, { a: 1, t: 2 }] }).notes.join(' ')), 'no two-roots note where there is one time');
  const tractor = K.solve({ stages: [{ t: 5 }, { a: 0, t: 25 }, { v: 12, a: 0.8, t: 5 }, { v: 0, t: 15 }], S: 375 });
  ok(tractor.ok && tractor.S[1].u === 8 && tractor.S[0].u === 6, 'CIE 9709/42 N19 Q2: V = 8 carried back, U = 6 from 375 m (MS)', tractor.reason);
  const at = K.solve({ stages: [{ u: 8, a: -0.5, t: 4 }, { a: 0, t: 6 }, { a: 1.2, t: 10 }] });
  ok(at.ok && at.S[2].v === 18 && at.Stot === 184, 'WME01 Oct23 Q2: an a–t graph as stages; v = 18, AB = 184 m (MS)');
  const f = r.f; ok(Math.abs(f.pos(40) - 640) < 1e-9 && Math.abs(f.pos(110) - 2460) < 1e-9 && Math.abs(f.vel(40) - 12) < 1e-9, 'the motion passes the join and ends at 2460 m');
});

group('Do they collide? (MM1B J14 Q7)', () => {
  const K = KITS.collide;
  const r = K.solve({ A: { u: { x: 4, y: 2 }, a: { x: -0.4 } }, B: { r0: { x: 11.2 }, u: { x: 0.4, y: 0.6 }, a: { y: 0.2 } }, at: 10 });
  ok(r.ok && r.tc === 14 && r.where.x === 16.8 && r.where.y === 28, 'they collide at t = 14, at 16.8i + 28j', r.reason);
  ok(r.f.posA(10).x === 20 && r.f.posA(10).y === 20, 'A at 20i + 20j after 10 s');
  const miss = K.solve({ A: { u: { x: 4, y: 2 }, a: { x: -0.4 } }, B: { r0: { x: 11 }, u: { x: 0.4, y: 0.6 }, a: { y: 0.2 } } });
  ok(miss.ok && miss.tc === null && /never collide/.test(miss.notes.join(' ')), 'moved a little, they never collide');
  ok(!K.solve({ A: { u: { x: 1 } }, B: { u: { x: 1 } } }).ok, 'together the whole time is said, not solved');
  ok(!K.solve({ A: { u: { x: 1 } } }).ok, 'B missing says what is needed');
  const sameStart = K.solve({ A: { u: { x: 1 } }, B: { u: { y: 1 } } });
  ok(sameStart.ok && sameStart.tc === null && /start together/.test(sameStart.notes.join(' ')), 'starting together is not a collision');
  const line = K.solve({ A: { u: { x: 2 } }, B: { r0: { x: 10 }, a: { x: -1 } } });
  ok(line.ok && Math.abs(line.tc - (-2 + Math.sqrt(24))) < 1e-9, 'j parts always equal: the i parts alone decide');
});

group('Known from two moments (9MA0/03 J18 Q8, WME01 J22 Q6)', () => {
  const K = KITS.snapshots;
  const a = K.solve({ u: { x: 2, y: -3 }, at2: { kind: 'r', t: 2, v: { x: 7, y: -10 } }, a2: { x: 4, y: 8.8 }, ask: { dir: 'NE' } });
  ok(a.ok && a.a.x === 1.5 && a.a.y === -2 && Math.abs(Math.hypot(a.a.x, a.a.y) - 2.5) < 1e-12, 'a = 1.5i − 2j, of size 2.5 (MS)', a.reason);
  ok(a.tDir === 4.5 && a.dirWord === 'north-east', 'north-east 2.5 s after the change (MS)');
  const b = K.solve({ u: { x: -1, y: 4 }, tu: 1, at2: { kind: 'v', t: 4, v: { x: 5, y: -8 } }, ask: { t: 3.5 } });
  ok(b.ok && b.a.x === 2 && b.a.y === -4 && Math.abs(b.askSpeed - Math.sqrt(52)) < 1e-9, 'a = 2i − 4j; speed √52 = 7.21 at t = 3.5 (MS)');
  const c = K.solve({ a: { x: 1.5, y: -2 }, at2: { kind: 'r', t: 2, v: { x: 7, y: -10 } } });
  ok(c.ok && c.u.x === 2 && c.u.y === -3, 'two positions and the acceleration give the starting velocity');
  ok(!K.solve({ u: { x: 1 }, a: { x: 1 }, at2: { kind: 'v', t: 2, v: { x: 3 } } }).ok, 'a second velocity and the acceleration together are refused');
  ok(/never moving/.test(K.solve({ u: { x: 1, y: 0 }, a: { x: 1, y: 0 }, ask: { dir: 'W' } }).notes.join(' ')), 'never moving west, said');
  const rest = K.solve({ a: { x: 2, y: -4 }, u: { x: 0, y: 0 }, ask: { dir: 'N' } });
  ok(rest.ok && rest.tDir === null && /at rest/.test(rest.notes.join(' ')) && !/other way/.test(rest.notes.join(' ')), 'at rest is not "pointing the other way"');
  const along = K.solve({ u: { x: 0, y: -2 }, a: { x: 0, y: 1 }, ask: { dir: 'N' } });
  ok(along.ok && along.tDir === 2, 'always along the line: north from when it turns, t = 2');
  ok(!K.solve({ u: { x: 1 }, a: { x: 1 }, at2: { kind: 'r', t: 2, v: {} } }).ok, 'a second-moment time with no vector is refused');
  const fused = K.solve({ u: { x: 3, y: 0 }, a: { x: 0, y: 2 }, ask: { t: 2 } });
  ok(/3i\+2\(2j\)/.test(fused.askRows.map((r) => r.s.replace(/<[^>]+>/g, '').replace(/\s/g, '')).join(' ')), 'a time times a one-part vector never fuses into one number');
  ok(/2\.5 s after the change/.test(K.ending(a).title), 'the headline gives the time after the change, as the paper asks');
  const f = a.f; ok(Math.abs(f.pos(2).x - 7) < 1e-12 && Math.abs(f.vel(4.5).x - f.vel(4.5).y) < 1e-12, 'the motion passes the second moment and turns north-east');
});

group('Read the displacement–time graph (4728 J14 Q5)', () => {
  const K = KITS.xtgraph;
  const r = K.solve({ x0: 5, speed: 4, pts: [{ x: 5 }, { t: 3, x: 0 }, { t: 5, x: 0 }, { t: 7, x: -8 }, { t: 10, x: 4 }], tail: { c0: -96, c1: 20, c2: -1, speed: 4 }, ask: { ts: [2, 8, 9] } });
  ok(r.ok && r.blankT === 1.75, 'T = 1.75 (MS)', r.reason);
  ok(r.f.asked.map((a) => a.v).join() === '-4,4,4', 'velocities −4, 4, 4 at t = 2, 8, 9 (MS)');
  ok(r.dist === 25 && r.tail.ts[0] === 12, '25 m travelled; speed 4 again at t = 12 (MS)');
  ok(!K.solve({ x0: 5, speed: 3, pts: [{ x: 5 }, { t: 3, x: 0 }, { t: 5, x: 0 }, { t: 7, x: -8 }] }).ok, 'a piece at another speed than the one given is refused');
  ok(!K.solve({ x0: 0, pts: [{ t: 2, x: 4 }], tail: { c0: 0, c1: 1, c2: 0 } }).ok, 'a formula that does not join the graph is refused');
  ok(!K.solve({ x0: 0, pts: [{ t: 2, x: 4 }, { t: 1, x: 0 }] }).ok, 'corners out of time order are refused');
  const steady = K.solve({ x0: 0, pts: [{ t: 2, x: 4 }], tail: { c0: 0, c1: 2, c2: 0, speed: 2 } });
  ok(steady.ok && steady.tail.always && /whole time/.test(steady.notes.join(' ')), 'a steady formula at that speed: always, not never');
  ok(r.f.asked.length === 3 && K.solve({ x0: 5, speed: 4, pts: [{ x: 5 }, { t: 3, x: 0 }, { t: 5, x: 0 }, { t: 7, x: -8 }, { t: 10, x: 4 }], tail: { c0: -96, c1: 20, c2: -1 }, ask: { ts: [10] } }).f.asked[0].v === null, 'at the last corner the formula takes over: the velocity changes there');
  ok(!K.solve({ x0: 0, pts: [{ t: 2, x: 4 }], tail: { speed: 2 } }).ok, 'a speed after the graph with no formula is refused');
  const corner = K.solve({ x0: 0, pts: [{ t: 2, x: 4 }, { t: 4, x: 0 }], ask: { ts: [2] } });
  ok(corner.ok && corner.f.asked[0].v === null, 'at a corner the velocity changes: said, not guessed');
});

group('Two robots on a floor (WME01 J23 Q8)', () => {
  const K = KITS.robots;
  const r = K.solve({ R: { r0: { x: -2, y: 1 }, r1: { x: 9, y: 23 }, t1: 11 }, S: { r0: { x: 25, y: 25 }, v: { x: -1, y: -1 } }, side: 50 });
  ok(r.ok && Math.abs(r.tc - 126 / 13) < 1e-9, 'closest at t = 126/13 (MS)', r.reason);
  ok(Math.abs(r.dmin - Math.hypot(2 * 126 / 13 - 27, 3 * 126 / 13 - 24)) < 1e-6 && r.f.leaves.R === 12, 'the least distance; R reaches the edge at t = 12');
  const away = K.solve({ R: { r0: { x: 0, y: 0 }, v: { x: 1, y: 0 } }, S: { r0: { x: -5, y: 0 }, v: { x: -1, y: 0 } } });
  ok(away.ok && away.tc === 0 && /moving apart/.test(away.notes.join(' ')), 'already moving apart: closest at t = 0');
  const same = K.solve({ R: { r0: { x: 0, y: 0 }, v: { x: 1, y: 1 } }, S: { r0: { x: 3, y: 0 }, v: { x: 1, y: 1 } } });
  ok(same.ok && /never changes/.test(same.notes.join(' ')), 'equal velocities: the gap never changes');
  ok(!K.solve({ R: { r0: { x: 30, y: 0 }, v: { x: 1 } }, S: { r0: {}, v: {} }, side: 50 }).ok, 'starting off the floor is refused');
  const twoOff = K.solve({ R: { r0: { x: -20, y: 0 }, v: { x: 1, y: 0 } }, S: { r0: { x: 24, y: 24 }, v: { x: 0.3, y: 0.1 } } });
  ok(twoOff.ok && /^On this floor never that close: S/.test(K.ending(twoOff).title), 'both leave the floor: the headline names the first to go');
  ok(!K.solve(K.read({ 'R.v.x': 5, 'R.r1.x': 9, 'R.r1.y': 23, 'R.t1': 11, 'S.r0.x': 25, 'S.r0.y': 25, 'S.v.x': -1, 'S.v.y': -1 })).ok, 'a velocity and a later position for R together are refused');
  ok(K.solve(K.read({ 'S.r0.x': 10, 'S.v.x': -1 })).ok, 'R with nothing given is at rest');
  const late = K.solve({ R: { r0: { x: 20, y: 0 }, v: { x: 1, y: 0 } }, S: { r0: { x: -20, y: 10 }, v: { x: 2, y: 0 } }, side: 50 });
  ok(late.ok && /edge of the floor/.test(late.notes.join(' ')), 'closest only after one has reached the edge: said');
});

group('Two thrown up, in letters (WME01 Jan20 Q3)', () => {
  const K = KITS.letters;
  const st = (x) => x.replace(/<[^>]+>/g, '').replace(/\s/g, '');
  const r = K.solve({ k: 0.5, when: 'top' });
  ok(r.ok && r.tau === 1 && Math.abs(r.yc) < 1e-12, 'they collide U/g after Q is projected, at O (MS)', r.reason);
  ok(/H=U2⁄?\(?2g/.test(st(r.rows[0].r)) || /U2.*2g/.test(st(r.rows[0].r)), 'H = U²/2g (MS)');
  const n = K.solve({ k: 0.5, when: 'top', U: 14, g: 9.8 });
  ok(/10m/.test(st(n.notes.join(' '))) && /1\.429s/.test(st(n.notes.join(' '))), 'with numbers: H = 10 m, 1.429 s');
  const later = K.solve({ k: 1, when: 'after', c: 0.5 });
  ok(later.ok && Math.abs(later.tau - 0.75) < 1e-12 && Math.abs(later.yc - 15 / 32) < 1e-12, 'Q at U after U/2g: 3U/4g later, 15U²/32g up');
  ok(!K.solve({ k: 0.5, U: 14 }).ok, 'U without g is refused');
  ok(!K.solve({ k: 1, when: 'after', c: 2 }).ok, 'P back at O as Q is projected: refused');
});

function e23F0() { return solveTarget({ g: 9.8, u: 28, d: 40, H: 20, kind: 'point', find: 'theta' }); }
function e23F() { return solveTarget({ g: 9.8, u: 28, d: 40, H: 20, kind: 'point', find: 'theta' }).shown; }
function w19F() { return flight({ ux: 30, uy: -1.4, h0: 2.4, g: 9.8 }, { d: 12, H: 0.9 }, 'net'); }

/* ── deep audit 2: what it found, and the fixes ─────────────────────── */
group('Two on a road or two tracks: holding a speed, then braking to rest together', () => {
  const O = (k) => solveOvertake(k);
  const W = (r) => overtakeWorking(r).map((st) => ({ title: strip(st.title), rows: st.rows.map((x) => [strip(x.f), strip(x.s), strip(x.r)]), note: strip(st.note) }));
  // M1 J16 Q4: M at 40 holds T s, N at 30 holds 25 s, both brake to rest beside Y, 975 m
  const trains = O({ A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.hold', line: 975, where: 'rail' });
  ok(trains.ok && near(trains.found.value, 8.75) && near(trains.B.tau, 15) && near(trains.A.a, -1.28), 'Edexcel M1 J16 Q4: T = 8.75, N brakes for 15 s, M at 1.28 m s⁻²');
  const wt = W(trains);
  ok(wt.some((x) => x.rows.some((r) => r[1] === '975=30×25+½×30tB' && r[2] === 'tB=15s')), 'N: 975 = 30 × 25 + ½ × 30t, so 15 s braking');
  ok(wt.some((x) => x.rows.some((r) => r[1] === '25+15' && r[2] === 't=40s')), 'N reaches Y at 25 + 15 = 40 s');
  ok(wt.some((x) => x.rows.some((r) => r[1] === '975=40TA+½×40(40−TA)' && r[2] === 'TA=8.75s')), 'M as the mark scheme: 975 = 40T + ½ × 40(40 − T)');
  const rest = trains.events.find((e) => e.rest);
  ok(rest && rest.kind === 'line' && near(rest.t, 40) && near(rest.x, 975) && !rest.first, 'they come to rest at Y together, at 40 s — one event, not “the same motion twice”');
  ok(trains.f.where === 'rail' && trains.f.crossings.length === 1 && near(trains.f.crossings[0].t, 16.5625) && near(trains.f.crossings[0].v, 30), 'drawn on tracks; the speed lines cross once, at 30 m s⁻¹');
  ok(near(trains.f.dist(40).A, 975) && near(trains.f.dist(40).B, 975), 'the two areas are both 975 m at the end');
  // M1 J10 Q5: P at 25 brakes from T, Q at 20 brakes from 25 s, both stop at X 800 m on
  const cars = O({ A: { u: 25, ends: true }, B: { u: 20, hold: 25, ends: true }, find: 'A.hold', line: 800 });
  ok(cars.ok && near(cars.found.value, 9) && near(timeAt(cars.B, 800), 55) && cars.f.where === 'road', 'Edexcel M1 J10 Q5: Q stops at 55 s, and T = 9');
  const e = KITS.lanes.ending(cars);
  ok(/time at its first speed is 9 s/.test(strip(e.title)) && !/differ by/.test(e.body), 'the ending names T, and says nothing of a 0 difference in speeds');
  // the same, run forwards with T given: they still stop together
  const fwd = O({ A: { u: 40, hold: 8.75, ends: true }, B: { u: 30, hold: 25, ends: true }, line: 975 });
  ok(fwd.ok && fwd.events.some((x) => x.rest && near(x.t, 40)) && W(fwd).some((x) => /come to rest together/.test(x.title)), 'with T given, both stop beside Y at 40 s, worked as each one’s stopping time');
  // the other unknowns, from the same stopping
  ok(near(O({ A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.a', line: 975 }).found.value, -1.28), 'or M’s deceleration: 1.28');
  ok(near(O({ A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.tau', line: 975 }).found.value, 31.25), 'or how long M brakes: 31.25 s');
  ok(near(O({ A: { u: 40, ends: true }, B: { u: 30, a: -2, ends: true }, find: 'A.hold', line: 975 }).B.hold, 25), 'N’s 25 s from its rate instead: the line fixes the hold');
  // a hold, then a change, without stopping: T from the rectangles
  const h = O({ A: { u: 20, a: -1, V: 0 }, B: { u: 10 }, find: 'A.hold', line: 300 });
  ok(h.ok && near(h.found.value, 5) && near(h.A.pos(30), 300) && near(timeAt(h.B, 300), 30), 'a hold before braking, found from where they are level: 5 s');
  // what cannot be
  ok(/more than the 2000m/.test(strip(O({ A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.hold', line: 2000 }).reason)), 'too far for M to stop in time: refused, with how far it gets');
  ok(/past the line/.test(strip(O({ A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.hold', line: 700 }).reason)), 'holding 25 s carries N past a 700 m line: refused');
  ok(/say how far along the line is/.test(O({ A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true } }).reason), 'stopping at the line with no line: asks for it');
  ok(/Give only one/.test(strip(O({ A: { u: 40, ends: true }, B: { u: 30, a: -2, hold: 25, ends: true }, find: 'A.hold', line: 975 }).reason)), 'the line fixes one of hold, rate, time: two given is refused');
  ok(/negative/.test(O({ A: { u: 40, hold: -1 }, B: { u: 30 } }).reason), 'a negative hold is refused');
  ok(!O({ A: { u: 0, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.hold', line: 975 }).ok, 'from rest to rest is no change of speed: refused');
  const late = O({ A: { u: 40, hold: 2, ends: true }, B: { u: 30, hold: 25, ends: true }, line: 975 });
  ok(late.events.some((x) => x.rest && x.first === 'B' && near(x.t, 46.75) && near(x.tFirst, 40)), 'one stopped earlier: the other comes to rest beside it later, and both times are said');
  ok(KITS.lanes.read({ 'A.u': 40, 'A.ends': 'line', where: 'rail' }).A.ends === true && KITS.lanes.read({}).where === 'road', 'the kit reads “at the line” and the setting');
  ok(wt.every((x) => !/the line|the start|road/.test(x.title + x.note)) && /When B reaches Y/.test(wt.map((x) => x.title).join()) && /975m from X/.test(strip(trains.notes.join(' '))),
     'on the tracks it says X and Y, never “the line”, “the start” or “road”');
  const kr = KITS.lanes.read({ where: 'lights', 'B.fig': 'motorcycle' });
  ok(kr.where === 'road' && kr.lights && kr.figs.B === 'motorcycle' && kr.figs.A === 'car', 'leaving traffic lights is the road with lights; each one’s figure is read');
  const vEnd = O({ A: { u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.V', line: 975 });
  ok(!/It stops there/.test(W(vEnd).map((x) => x.note).join(' ')) && /gets there at the same instant as B/.test(W(vEnd).map((x) => x.note).join(' ')), 'finding a V that is not 0: it does not claim it stops');
  ok(/far beyond any real vehicle/.test(strip(O({ A: { u: 40 }, B: { u: 30, hold: 25, ends: true }, line: 751 }).notes.join(' '))), 'a deceleration of 450 m s⁻² is said to be beyond any real vehicle');
  const lateA = W(O({ A: { t0: 5, u: 40, ends: true }, B: { u: 30, hold: 25, ends: true }, find: 'A.hold', line: 975 }));
  ok(lateA.some((x) => x.rows[0] && x.rows[0][1] === '40−5' && x.rows[0][2] === 't=35s'), 'a late starter’s own clock is worked first: 40 − 5 = 35 s');
});

group('Audit 2: the road, finding a hidden number', () => {
  ok(paren('20 - V') === '(20 - V)' && paren('V') === 'V' && paren('(V - 5)/2') === '(V - 5)/2' && paren('-3') === '(-3)',
    'paren brackets an expression with a top-level + or −, and nothing else');
  // a = −1: V(20 − (20 − V)), not V(20 − 20 − V)
  const m1 = solveOvertake({ A: { u: 20, a: -1 }, B: { u: 10 }, find: 'A.V', line: 200 });
  const row = strip(m1.found.rows[0].s);
  ok(m1.ok && /V\(20−\(20−V\)\)/.test(row), 'with a = −1 the time is bracketed where it is taken away', row);
  const one = solveOvertake({ A: { u: 10 }, B: { u: 5, a: 1 }, find: 'B.V', line: 200 });
  ok(one.ok && !/\/1|⁄1/.test(one.found.rows[0].s) && /V\(20−\(V−5\)\)/.test(strip(one.found.rows[0].s)), 'with a = 1 nothing is written over 1', strip(one.found.rows[0].s));
  // a rejected root says the right thing for a slowing car, and a negative speed is no speed
  const sl = solveOvertake({ A: { u: 10, a: -2 }, B: { u: 10 }, find: 'A.V', line: 50 });
  ok(!sl.ok || sl.rejected.every((c) => !/slow down to reach, against its acceleration/.test(c.why)), 'a slowing car is never told it would have to slow down');
  const neg = solveOvertake({ A: { u: 10 }, B: { u: 25, a: -2 }, find: 'B.V', line: 250 });
  ok(neg.ok && neg.rejected.some((c) => c.value < 0 && /speed along the road cannot be/.test(c.why)), 'a negative final speed is rejected because a speed cannot be negative');
  // every refusal says why, with the distance it can reach
  for (const [k, re] of [
    [{ A: { u: 8 }, B: { u: 2, a: 0.5 }, find: 'B.tau', at: 20 }, /only 140 m.*160 m/],
    [{ A: { u: 10 }, B: { u: 25, a: -1 }, find: 'B.V', line: 250 }, /still covers 312\.5 m.*250 m/],
    [{ A: { u: 10, a: -0.5 }, B: { u: 6 }, find: 'A.V', line: 90 }, /still covers 93\.75 m.*90 m/],
    [{ A: { u: 10, a: -1 }, B: { u: 12 }, find: 'A.V', line: 120 }, /keeping its starting speed.*only 100 m.*120 m/],
    [{ A: { u: 5 }, B: { u: 20 }, find: 'B.a', line: 100 }, /slowing to a stop.*200 m.*100 m/],
  ]) {
    const r = solveOvertake(k);
    ok(!r.ok && re.test(strip(r.reason).replace(/(\d)m\b/g, '$1 m')), `refused with its reason: ${JSON.stringify(k)}`, strip(r.reason));
  }
  // still changing speed at the moment they are level: answered, not refused
  const late = solveOvertake({ A: { u: 10 }, B: { tau: 30 }, find: 'B.V', line: 100 });
  ok(late.ok && near(late.found.value, 60), 'B still speeding up at the line: V = 60 (a = 2 for 30 s)', late.reason);
  const lateT = solveOvertake({ A: { u: 10 }, B: { V: 30, u: 2 }, find: 'B.tau', line: 500 });
  ok(lateT.ok && near(lateT.found.value, 87.5), 'B still speeding up at the line: its time is 87.5 s');
  // a deceleration that brings it to rest exactly at the line: it stops there
  const stop = solveOvertake({ A: { u: 10 }, B: { u: 20 }, find: 'B.a', line: 300 });
  ok(stop.ok && near(stop.found.value, -2 / 3) && near(stop.B.V, 0) && near(stop.B.pos(60), 300), 'slowing to rest at the line is accepted, and it stays at rest', stop.reason);
  // the Ready line does not say B twice
  const tb = solveOvertake({ A: { u: 10 }, B: { a: 1, u: 0 }, find: 'B.tau', line: 500 });
  ok(tb.ok && !/B’s\s*<span class="m">.*t/.test(tb.derived[0]) && /t/.test(strip(tb.derived[0])), 'the Ready line says t_B, not B’s t_B', tb.derived[0]);
  for (const k of [m1, one, neg, late, lateT, stop, tb]) for (const sec of overtakeWorking(k)) for (const r of sec.rows || []) {
    ok(!/undefined|NaN|Infinity/.test(r.f + r.s + r.r), 'no undefined, NaN or Infinity in the working');
  }
});

group('Audit 2: moving in a plane', () => {
  const still = solvePlane({ u: { x: 3, y: 3 }, a: { x: 0, y: 0 }, at: { moving: 'NE' } }).answers[0];
  ok(still.ok && /no acceleration/.test(strip(still.why)) && !/line of its acceleration/.test(strip(still.why)), 'no acceleration: its velocity never changes', strip(still.why));
  const due = solvePlane({ r0: { x: -5 }, u: { x: -2, y: 0 }, a: { x: 0.4, y: 0 }, at: { due: 'W' } }).answers[0];
  ok(due.ok && due.rows.some((r) => /t=12\.071/.test(strip(r.r))), 'due west until it comes back through O: the end time is worked', due.rows.map((r) => strip(r.r)).join(' | '));
  const twice = solvePlane({ u: { x: -2, y: 0 }, a: { x: 1, y: 0 }, at: { speed: 1 } });
  ok(KITS.plane.ending(twice).title === '1 m s⁻¹ at 1 s and again at 3 s.', 'a speed met twice is headlined twice', KITS.plane.ending(twice).title);
  const both = solvePlane({ u: { x: -2, y: 0 }, a: { x: 1, y: 0 }, at: { t: 2, speed: 1 } });
  ok(/^At 2 s/.test(KITS.plane.ending(both).title), 'the headline is the first thing asked, not the last', KITS.plane.ending(both).title);
  const back = solvePlane({ vT: { x: 6, y: 0 }, T: 4, a: { x: 3, y: -2 } });
  ok(KITS.plane.ending(back).title === `Initially ${num(back.speed0, 3, { trim: true })} m s⁻¹.`, 'the initial speed in the headline is the engine’s');
});

group('Audit 2: shared pieces', () => {
  ok(num(9.6e7, 3, { trim: true }) === '9.6 × 10⁷' && num(1e6, 3, { trim: true }) === '1 × 10⁶' && num(1e6, 3) === '1.000 × 10⁶', 'standard form trims its mantissa when asked, and only then');
  const h = mathHTML('(28vec(i) + 36vec(j)) [m]');
  ok((h.match(/class="m-nb"/g) || []).length === 2, 'a vector is held to its coefficient on one line');
  for (const id of ['lanes', 'journey', 'plane']) ok(KITS[id].hides.shows.includes('grid'), `${id} offers no grid switch that would do nothing`);
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  ok(/aria-describedby="\$\{id\}-h"/.test(app), 'each box’s hint is read with it');
  const plane = [...KITS.plane.fields, ...KITS.plane.rows.flatMap((r) => r.fields)].filter((f) => f.type !== 'choice');
  const names = plane.map((f) => strip(f.aria || `${KITS.plane.cols[f.col]}: ${f.label}`));
  ok(new Set(names).size === names.length, 'no two boxes on the vectors screen share a name', names.join(' / '));
  const lanes = KITS.lanes.fields.map((f) => `${KITS.lanes.cols[f.col]}: ${strip(f.label)}`);
  ok(new Set(lanes).size === lanes.length, 'no two boxes on the road screen share a name');
});

/* ── bounce: the papers it names, and what it must refuse ───────────── */
group('A stage to a level, a rebound off it, and the times at a level', () => {
  const s1 = toLevel({ t0: 0, x0: 2, u: 0, a: -9.8, kind: 'fall' }, 0);
  ok(near(s1.t1, Math.sqrt(4 / 9.8)), 'released from 2 m, it reaches the ground at √(2h/g)');
  const s2 = rebound(s1, 0.9, 0);
  ok(s2.kind === 'rebound' && near(s2.u, 0.9 * Math.sqrt(2 * 9.8 * 2)) && near(s2.vIn, -Math.sqrt(2 * 9.8 * 2)), 'the rebound leaves at k times the speed it arrived with, the other way');
  ok(near(s2.t1 - s2.t0, 2 * s2.u / 9.8), 'and is back at the ground after 2u/g');
  const m = staged([s1, s2]);
  const at1 = timesAt(m, 1);
  ok(at1.length === 3 && at1[0].v < 0 && at1[1].v > 0 && at1[2].v < 0, 'a level is passed on the way down, and up and down again after the bounce');
  ok(toLevel({ t0: 0, x0: 5, u: 1, a: 0 }, 0).t1 === Infinity, 'moving away with nothing to turn it, it never reaches the level');
});

group('Edexcel M1 Jun 2014 Q3: released from 2 m, rises to 1.5 m after the bounce', () => {
  const r = solveBounce({ start: 'drop', h: 2, H: 1.5, g: 9.8, axis: 'down' });
  ok(r.ok, 'it solves');
  ok(r.impacts[0].vIn.toFixed(2) === '6.26', '(a) 6.26 m s⁻¹ just before it strikes the ground — as the mark scheme', r.impacts[0].vIn);
  ok(r.impacts[0].vOut.toFixed(2) === '5.42', '(b) 5.42 m s⁻¹ just after — as the mark scheme', r.impacts[0].vOut);
  ok(r.impacts.length === 2 && r.f.tMax.toFixed(2) === '1.75', '(e) 1.75 s from release to the second impact — as the mark scheme', r.f.tMax);
  // (d) the sketch, down positive: up from 0 to +6.26, a jump to −5.42, then up to +5.42
  const t1 = r.impacts[0].t, e = 1e-6;
  ok(near(r.f.at(0).v, 0) && near(r.f.at(t1 - e).v, 6.26, 0.01) && near(r.f.at(t1 + e).v, -5.42, 0.01) && near(r.f.at(r.f.tMax).v, 5.42, 0.01),
     '(d) the velocity–time graph down positive: 0 to 6.26, a jump to −5.42, then up to 5.42');
  ok(r.f.jumps.length === 1 && near(r.f.jumps[0], t1), 'the graph is told where it jumps');
  const spec = KITS.bounce.graphs(r.f, r.f.tMax, { mark: '#0f0', disp: '#0ff', vel: '#f80', acc: '#80f' })[1];
  ok(spec.series[0].jumps === r.f.jumps && spec.series[0].dash === null, 'the velocity line jumps there, solid (vertical)');
  ok(/down \+ve/.test(spec.title), 'and its title says which way is positive, where no label can push it off');
  ok(near(r.f.at(0.3).a, 9.8) && near(solveBounce({ start: 'drop', h: 2, H: 1.5, g: 9.8 }).f.at(0.3).a, -9.8), 'a is +g down positive and −g up positive');
});

group('Edexcel M1 Jun 2018 Q4: thrown down from 2.5 m, rebounds at 10 m s⁻¹, to B 1 m up', () => {
  for (const [what, k] of [['the throw speed, 24', { U: 24 }], ['the impact speed, 25', { V: 25 }]]) {
    const r = solveBounce({ start: 'down', h: 2.5, ...k, w: 10, y: 1, stop: 'y', g: 9.8 });
    ok(r.ok, `given ${what}, it solves`);
    ok(near(r.params.U, 24) && near(r.params.V, 25), 'U = 24 and the impact speed 25 — the mark scheme’s (a), without the impulse');
    ok(r.stopAt && r.stopAt.since.toFixed(2) === '0.11' && r.stopAt.dir === 'up' && r.stopAt.after === 1, '(b) 0.11 s from the impact to B — as the mark scheme', r.stopAt?.since);
    ok(near(r.f.tMax, r.stopAt.t), '(c) the run, and its graph, end as it first passes B');
  }
  const r = solveBounce({ start: 'down', h: 2.5, U: 24, w: 10, y: 1, stop: 'y', g: 9.8, axis: 'down' });
  const t1 = r.impacts[0].t;
  ok(near(r.f.at(0).v, 24) && near(r.f.at(t1 - 1e-6).v, 25, 1e-4) && near(r.f.at(t1 + 1e-6).v, -10, 1e-4), '(c) the sketch down positive: from 24 up to 25, a jump to −10');
});

group('Bounce: the general case, and what it refuses', () => {
  const up = solveBounce({ start: 'up', h: 10, U: 5, e: 0.5, n: 4, y: 3, g: 9.8 });
  ok(up.ok && up.impacts.length === 4 && near(up.top0.H, 10 + 25 / 19.6), 'thrown up from 10 m: rises first, then four impacts');
  ok(up.impacts.every((x, i) => i === 0 || near(x.vOut, 0.5 * x.vIn)) && near(up.impacts[1].vIn, up.impacts[0].vOut), 'each bounce keeps the same half; it lands as fast as it left');
  ok(near(up.impacts[1].t - up.impacts[0].t, 2 * up.impacts[0].vOut / 9.8), 'the time between bounces is 2u/g');
  const sum = up.impacts[0].t + up.impacts.slice(0, -1).reduce((a, x) => a + x.gap, 0);
  ok(near(sum, up.f.tMax), 'the total is the fall and every flight between impacts');
  const ground = solveBounce({ start: 'up', h: 0, U: 9.8, w: 4.9, g: 9.8, n: 2 });
  ok(ground.ok && near(ground.impacts[0].t, 2) && near(ground.impacts[1].t, 3), 'thrown up from the ground: back down at 2u/g, then again 1 s later');
  const vh = solveBounce({ start: 'drop', V: 14, e: 0.5, g: 9.8 });
  ok(vh.ok && near(vh.params.h, 10), 'released, and given only the impact speed: the height comes out');
  const refuse = [
    [{ start: 'drop', h: 2, H: 3, g: 9.8 }, /faster than it hit/],
    [{ start: 'drop', h: 2, w: 0, g: 9.8 }, /stays on the ground/],
    [{ start: 'down', h: 2, U: 5, V: 4, w: 2, g: 9.8 }, /do not agree/],
    [{ start: 'down', U: 5, V: 4, w: 2, g: 9.8 }, /slower than it was thrown/],
    [{ start: 'down', h: 20, V: 5, w: 2, g: 9.8 }, /cannot arrive at only/],
    [{ start: 'drop', h: 2, w: 3, H: 0.1, g: 9.8 }, /do not agree/],
    [{ start: 'drop', h: 2, w: 3, g: 0 }, /needs gravity/],
    [{ start: 'drop', h: 2, w: 3, g: 9.8, n: 7 }, /Up to 6/],
    [{ start: 'drop', h: 2, w: 3, g: 9.8, n: 1.5 }, /whole number/],
    [{ start: 'drop', h: 2, w: 3, g: 9.8, y: 1, stop: 'y' }, /never .* up again|rises only/],
    [{ start: 'drop', h: 2, w: 3, g: 9.8, stop: 'y' }, /Give the height/],
    [{ start: 'drop', h: 0, w: 3, g: 9.8 }, /never leaves it/],
    [{ start: 'drop', h: -1, w: 3, g: 9.8 }, /cannot be negative/],
    [{ start: 'drop', h: 2, U: 3, w: 3, g: 9.8 }, /Released from rest/],
    [{ h: 2, w: 3, g: 9.8 }, /how it sets off/],
    [{ start: 'drop', h: 2, g: 9.8 }, /how it bounces/],
  ];
  for (const [k, re] of refuse) {
    const r = solveBounce(k);
    ok(!r.ok && re.test(strip(r.reason)), `refused: ${strip(r.reason || 'it solved').slice(0, 70)}`);
  }
  const whisker = solveBounce({ start: 'drop', h: 2, H: 2.02, g: 9.8, n: 4 });
  ok(whisker.ok && whisker.params.e === 1 && whisker.impacts.every((x) => near(x.vOut, x.vIn)), 'a rebound a rounding faster than the impact is taken as e = 1, never as gaining speed');
  ok(!solveBounce({ start: 'drop', h: 2, H: 2.2, g: 9.8 }).ok, 'and one clearly faster is refused');
  ok(!whisker.notes.some((x) => /means it left the ground at 6\.26/.test(strip(x))) && bounceWorking(whisker)[1].rows[0].f.includes('speed'), 'and nothing then claims the typed height gave the snapped speed');
  const frac = bounceWorking(solveBounce({ start: 'up', h: 3, U: 4, e: 0.7, g: 9.8, axis: 'down' }))[1].rows[0];
  ok(/0\.7×8\.65=6\.05/.test(strip(frac.s).replace(/\s/g, '')) && /u=−6\.05/.test(strip(frac.r).replace(/\s/g, '')), 'a fraction of the speed is worked in speeds; only the answer takes the sign', strip(frac.s) + ' | ' + strip(frac.r));
  ok(!solveBounce({ start: 'drop', h: 2, H: 1.5, g: 9.8, y: 0, stop: 'y' }).ok, 'stopping “at the ground after the bounce” is the next impact, and says so');
  const q6 = solveBounce({ start: 'drop', h: 2, H: 1.5, g: 9.8 });
  ok(near(q6.impacts[0].tTop, q6.impacts[0].t + q6.impacts[0].vOut / 9.8), 'the engine gives the time of each top; the stage only reads it');
  const nevr = solveBounce({ start: 'drop', h: 2, H: 1.5, g: 9.8, y: 3 });
  ok(nevr.ok && !nevr.crossings.length && nevr.notes.some((x) => /never/.test(strip(x))), 'a height it never reaches is said, not drawn');
  const w = bounceWorking(solveBounce({ start: 'drop', h: 2, H: 1.5, g: 9.8, axis: 'down', y: 1 }));
  ok(w.length === 5 && w.every((s) => s.rows.length), 'the working: the fall, the bounce, the flight, the total, the height');
  const e = KITS.bounce.ending(solveBounce({ start: 'drop', h: 2, H: 1.5, g: 9.8 }));
  ok(e.title === 'It hits the ground the second time 1.75 s after it set off.', 'the ending headlines the paper’s answer', e.title);
});

function ocrE() { return solvePlane({ vT: { x: 6, y: 0 }, T: 4, a: { x: 3, y: -2 } }); }
function e30() { return solveJourney({ a1: 0.5, a3: 0.25, T: 300, D: 6300 }); }

function K_never() {
  const e = KITS.pair.ending(solvePair({ A: { h: 0, u: 5 }, B: { h: 40, u: 0, t0: 3 }, g: 10 }));
  return e.real === false && /never met/.test(e.title) && !/collision ends/.test(e.body);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
