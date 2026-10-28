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
import { yScale } from '../js/render/graphs.js';
import { solveJourney, journeyWorking } from '../js/core/journey.js';

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
  const hud = KITS.journey.hud(e30().f, 300);
  ok(/rest/.test(hud.left[2].k) && hud.right.some((b) => b.v === '20×'), 'at B it says at rest, and the clock says it is a time-lapse');
});

function e30() { return solveJourney({ a1: 0.5, a3: 0.25, T: 300, D: 6300 }); }

function K_never() {
  const e = KITS.pair.ending(solvePair({ A: { h: 0, u: 5 }, B: { h: 40, u: 0, t0: 3 }, g: 10 }));
  return e.real === false && /never met/.test(e.title) && !/collision ends/.test(e.body);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
