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


/* ── journey-3: the papers it names ─────────────────────────────────── */
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
  ok(/<path/.test(K.thumb(byId('journey-3'))), 'the card has a sketch from its own numbers');
  const end = K.ending(e30());
  ok(/6300/.test(end.title) && /ph-tab/.test(end.body) && (end.body.match(/ph-row/g) || []).length >= 4, 'the ending: a row of five per stage, and the total');
});
group('A journey: what critic round 1 found, kept found', () => {
  const J = (k) => solveJourney(k);
  const W = (k) => journeyWorking(J(k)).map((st) => ({ title: strip(st.title), rows: st.rows.map((r) => [strip(r.f), strip(r.s), strip(r.r)]), note: strip(st.note) }));
  const as22 = W({ V: 25, T: 700, D: 15000, rel: { kind: 't3=k*t1', k: 4 }, at: { t: 572 } });
  const at = as22.find((x) => /572/.test(x.title));
  ok(at && at.rows[0][1] === '25×128160' && at.rows[0][2] === 'v=20m s−1', 'the speed at 572 s from exact numbers: 25 × 128⁄160 = 20, no rounded rate');
  const ial = W({ t1: 60, t3: 30, T: 270, D: 4500, at: { v: 5 } }).find((x) => /doing/.test(x.title));
  ok(ial.rows[0][1] === '5×6020' && ial.rows[1][1] === '270−5×3020', 'the times at a speed from V, t₁, t₃ and T, exactly');
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
  ok(!known.dependsOn && /Every time followed from what was given/.test(strip(KITS.journey.ending(known).body))
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
  ok(/is negative, and a top speed cannot be/.test(strip(neg)), 'a negative root for V is called negative, not circularly');
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

/* ── deep audit 2: what it found, and the fixes ─────────────────────── */
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

function ocrE() { return solvePlane({ vT: { x: 6, y: 0 }, T: 4, a: { x: 3, y: -2 } }); }
function e30() { return solveJourney({ a1: 0.5, a3: 0.25, T: 300, D: 6300 }); }

function K_never() {
  const e = KITS.pair.ending(solvePair({ A: { h: 0, u: 5 }, B: { h: 40, u: 0, t0: 3 }, g: 10 }));
  return e.real === false && /never met/.test(e.title) && !/collision ends/.test(e.body);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
