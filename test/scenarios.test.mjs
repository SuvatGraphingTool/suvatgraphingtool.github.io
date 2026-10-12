// scenarios.test.mjs — the claims the scenario cards make, and the physics
// behind them. Run: node test/scenarios.test.mjs
import { SCENARIOS, GROUPS, byId } from '../js/scenarios.js';
import { flight } from '../js/core/projectile.js';
import { descent } from '../js/core/descent.js';

let pass = 0, fail = 0;
const near = (a, e, tol, label) => Math.abs(a - e) <= tol
  ? (pass++, console.log(`  ok   ${label} = ${a.toFixed(4)}`))
  : (fail++, console.log(`  FAIL ${label} = ${a.toFixed(4)}, expected ${e} (±${tol})`));
const ok = (c, label) => c ? (pass++, console.log(`  ok   ${label}`)) : (fail++, console.log(`  FAIL ${label}`));
const group = (n, f) => { console.log(`\n${n}`); f(); };

const build = (s, p, markers) => {
  const q = s.second.from(p, markers);
  if (!q) return null;
  const f = flight({ u: q.u, theta: q.theta, h: q.h ?? 0, g: p.g });
  const dx = q.x0 || 0;
  return { f, dx, pos: (t) => { const r = f.pos(t); return { x: r.x + dx, y: r.y }; } };
};

group('Fired and dropped — they land together, whatever the muzzle speed', () => {
  const s = byId('bullet');
  for (const [u, h, g] of [[120, 1.6, 9.81], [400, 1.6, 9.81], [12, 25, 9.81], [300, 2, 1.62]]) {
    const fired = flight({ u, theta: 0, h, g });
    const dropped = build(s, { u, theta: 0, h, g }, null);
    near(dropped.f.tFlight - fired.tFlight, 0, 1e-12,
         `u=${u} h=${h} g=${g} — difference in landing time`);
  }
  // the fired one does go somewhere, so the point is not trivially true
  const f = flight({ u: 120, theta: 0, h: 1.6, g: 9.81 });
  ok(f.range > 60, 'the fired bullet really does travel downrange');
  // and with no height there is nothing to drop
  ok(s.second.from({ u: 120, theta: 0, h: 0, g: 9.81 }, null) === null, 'no height, no second bullet');
});

group('Monkey vs Hunter — aimed straight at it, it cannot miss', () => {
  const s = byId('monkey');
  const aim = (m, h) => (Math.atan2(m.y - h, m.x) * 180) / Math.PI;

  for (const m of [{ x: 26, y: 11.5 }, { x: 8, y: 20 }, { x: 60, y: 4 }, { x: 15, y: 15 }]) {
    for (const u of [22, 40, 90]) {
      const h = 1.4, g = 9.81;
      const theta = aim(m, h);
      const banana = flight({ u, theta, h, g });
      const monkey = build(s, { u, theta, h, g }, { target: m });
      // when the banana reaches the monkey's x, are they in the same place?
      const tMeet = m.x / banana.horiz;
      const fell = m.y - 0.5 * g * tMeet * tMeet;
      if (fell < 0) { ok(true, `monkey (${m.x},${m.y}) u=${u} — lands first, out of reach`); continue; }
      const b = banana.pos(tMeet), k = monkey.pos(tMeet);
      near(Math.hypot(b.x - k.x, b.y - k.y), 0, 1e-9,
           `monkey (${m.x},${m.y}) u=${u} — gap at the meeting`);
    }
  }

  // aiming flat at a monkey on the ground still works, and a monkey at the
  // hunter's own height needs no elevation at all
  near(aim({ x: 30, y: 1.4 }, 1.4), 0, 1e-12, 'level with the muzzle, the aim is flat');
  ok(s.second.from({ u: 22, theta: 0, h: 1.4, g: 9.81 }, { target: { x: 10, y: 0 } }) === null,
     'a monkey on the sand is not hanging from anything');
});

group('Both sit under Interesting ones, with everything a card needs', () => {
  for (const id of ['bullet', 'monkey']) {
    const s = byId(id);
    ok(s.group === 'look', `${id} is an interesting one`);
    ok(!!s.backdrop && !!s.site, `${id} brings its own place`);
    ok((s.note || '').length > 80 && !!s.sub, `${id} says what it is for`);
  }
  // A bare count catches a scenario going missing by accident. Eleven became
  // nine when "Throw at a target" and "Two that collide" went — both built so
  // they could not fail, and a demonstration that cannot fail demonstrates
  // nothing (see design/presets.md) — ten when the missing downward
  // angle was added, and eleven when the parachute arrived.
  ok(SCENARIOS.length === 11, 'eleven scenarios in all');
  ok(new Set(SCENARIOS.map((x) => x.id)).size === SCENARIOS.length, 'and every id is its own');
  ok(SCENARIOS.every((x) => GROUPS.some((grp) => grp.id === x.group)), 'every one in a declared group');
});

group('The intro models exist, and none of them changes the landing time', () => {
  const s = byId('bullet');
  ok(Array.isArray(s.intro?.models) && s.intro.models.length >= 3, 'three rounds to pick from');
  const h = 1.5, g = 9.81;
  const base = flight({ u: s.intro.models[0].u, theta: 0, h, g }).tFlight;
  for (const mdl of s.intro.models) {
    const f = flight({ u: mdl.u, theta: 0, h, g });
    near(f.tFlight - base, 0, 1e-12, `${mdl.name} (${mdl.u} m/s) lands at the same instant`);
    ok(f.range > 0, `${mdl.name} still goes somewhere — ${f.range.toFixed(0)} m`);
  }
  // and the ranges really are different, so the student sees something change
  const r = s.intro.models.map((mdl) => flight({ u: mdl.u, theta: 0, h, g }).range);
  ok(new Set(r.map((x) => x.toFixed(0))).size === r.length, 'each round has its own range');
});

group('The monkey\'s sliders span the reachable and the unreachable', () => {
  const s = byId('monkey');
  const m = s.markers.target, h = s.params.h, g = 9.81;
  const theta = Math.atan2(m.y - h, m.x);
  const reach = (u) => {
    const tMeet = m.x / (u * Math.cos(theta));
    return m.y - 0.5 * g * tMeet * tMeet >= 0;          // still above the sand
  };
  // Three preset buttons became two live sliders, so the claim the old test
  // made about the presets now belongs to the slider's RANGE: a student has
  // to be able to reach both the working case and the failing one without
  // leaving the control.
  ok(!!s.live?.u && !!s.live?.theta, 'it offers a speed and an angle, live');
  ok(reach(s.live.u.max), `the fastest the slider offers (${s.live.u.max}) gets there`);
  ok(!reach(s.live.u.min), `and the slowest (${s.live.u.min}) does not, so the failure is reachable`);
  ok(s.params.u >= s.live.u.min && s.params.u <= s.live.u.max,
     'and where it starts is inside its own range');

  // The angle slider has to reach past the aimed angle in both directions, or
  // "aim it wrong" is not something the control can express.
  const aimed = (theta * 180) / Math.PI;
  ok(s.live.theta.min < aimed && s.live.theta.max > aimed,
     `the angle slider spans the aimed ${aimed.toFixed(1)}° with room either side`);
  ok(s.live.theta.min < 0, 'including below the horizontal');
});

group('Both exhibits bring their own ending', () => {
  for (const id of ['bullet', 'monkey']) {
    const e = byId(id).ending;
    ok(!!e, `${id} has one`);
    ok(typeof e.caveat === 'string' && e.caveat.length > 60,
       `${id} says what the model leaves out`);
  }
  const m = byId('monkey').ending;
  for (const k of ['caught', 'high', 'low', 'short']) {
    ok(!!m[k]?.title, `the monkey can say "${k}"`);
  }
  for (const k of ['aimed', 'slow', 'fast', 'nog']) {
    ok(Array.isArray(m.why[k]) && m.why[k][1].length > 80,
       `and can explain "${k}" properly`);
  }
});

group('The parachute: three phases, each one of them SUVAT', () => {
  const s = byId('parachute');
  ok(s.group === 'look', 'it is an interesting one');
  ok(!!s.descent && !!s.ending, 'and brings its own numbers to sketch with, and its own ending');

  const SETUPS = [
    { h: 100, g: 9.81, tOpen: 3, aChute: 25, vTerm: 6 },
    { h: 1000, g: 9.81, tOpen: 12, aChute: 30, vTerm: 5 },
    { h: 250, g: 9.81, tOpen: 4.5, aChute: 18, vTerm: 7 },
    { h: 400, g: 1.62, tOpen: 14, aChute: 8, vTerm: 4 },        // the Moon
    { h: s.params.h, g: s.params.g, ...s.descent },             // the card's own
  ];

  for (const k of SETUPS) {
    const r = descent(k);
    if (!r.ok) { ok(false, `${k.h} m, open at ${k.tOpen} s — refused: ${r.reason}`); continue; }
    const tag = `${k.h} m, open at ${k.tOpen} s, g = ${k.g}`;

    // Every phase has to satisfy the five equations on its own. This is the
    // claim the ending card's table makes, row by row.
    for (const p of r.phases) {
      near(p.v - (p.u + p.a * p.t), 0, 1e-9, `${tag} · ${p.name}: v = u + at`);
      near(p.v * p.v - (p.u * p.u + 2 * p.a * p.s), 0, 1e-6, `${tag} · ${p.name}: v² = u² + 2as`);
      near(p.s - (p.u * p.t + 0.5 * p.a * p.t * p.t), 0, 1e-9, `${tag} · ${p.name}: s = ut + ½at²`);
    }

    // And they have to join up: the v of one is the u of the next, the
    // distances add to the height, the times add to the total.
    for (let i = 1; i < r.phases.length; i++) {
      near(r.phases[i].u - r.phases[i - 1].v, 0, 1e-9, `${tag} · phase ${i + 1} starts where ${i} ended`);
    }
    near(r.phases.reduce((a, p) => a + p.s, 0) - k.h, 0, 1e-6, `${tag} · the phases add up to the drop`);
    near(r.phases.reduce((a, p) => a + p.t, 0) - r.tMax, 0, 1e-9, `${tag} · and to the total time`);

    // The flight the renderer gets has to agree with the table, at the ends
    // and in the middle of every phase.
    near(r.f.pos(0).y - k.h, 0, 1e-9, `${tag} · it starts at the top`);
    near(r.f.pos(r.tMax).y, 0, 1e-6, `${tag} · and ends on the ground`);
    near(r.f.speed(r.tMax) - r.vLanding, 0, 1e-9, `${tag} · landing at the speed it reports`);
    near(r.f.speed(0), 0, 1e-12, `${tag} · and from rest`);
    for (const p of r.phases) {
      near(r.f.pos(p.t0).y - p.y0, 0, 1e-6, `${tag} · ${p.name} begins where it says`);
      near(r.f.speed(p.t0 + p.t / 2) - (p.u + p.a * p.t / 2), 0, 1e-9, `${tag} · ${p.name} mid-phase speed`);
      near(r.f.accel(p.t0 + p.t / 2) + p.a, 0, 1e-9, `${tag} · ${p.name} acceleration, up as positive`);
    }
    // THE AREA UNDER THE v–t GRAPH IS THE DISTANCE FALLEN, which is what the
    // ending card's shaded sketch claims in so many words. Checked by
    // integrating the speed the engine reports, not by re-deriving it.
    let area = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) area += r.f.speed(((i + 0.5) / N) * r.tMax) * (r.tMax / N);
    near(area - k.h, 0, k.h * 2e-4, `${tag} · the area under the v–t graph is the drop`);
    // and it is monotonic: she only ever goes down
    let worst = 0;
    for (let i = 1; i <= 400; i++) {
      const a = r.f.pos(((i - 1) / 400) * r.tMax).y, b = r.f.pos((i / 400) * r.tMax).y;
      worst = Math.max(worst, b - a);
    }
    near(worst, 0, 1e-9, `${tag} · she never goes back up`);
  }

  // The canopy really does change the answer: open it later and she lands harder.
  const base = descent({ h: 300, g: 9.81, tOpen: 4, aChute: 20, vTerm: 6 });
  const late = descent({ h: 300, g: 9.81, tOpen: 6, aChute: 20, vTerm: 6 });
  ok(base.ok && late.ok, 'two openings, both of them possible');
  ok(late.tMax < base.tMax, `pulling later gets you down sooner (${late.tMax.toFixed(2)} s against ${base.tMax.toFixed(2)} s)`);
  near(base.vLanding - late.vLanding, 0, 1e-9, 'and both still land at the steady speed');
});

group('And it refuses what cannot happen, instead of drawing it', () => {
  const cases = [
    [{ h: 100, g: 9.81, tOpen: 9, aChute: 25, vTerm: 6 }, /never opens/, 'a canopy pulled after she has landed'],
    [{ h: 100, g: 9.81, tOpen: 0, aChute: 25, vTerm: 6 }, /nothing to slow/, 'a canopy open before she moves'],
    [{ h: 100, g: 9.81, tOpen: 0.4, aChute: 25, vTerm: 6 }, /nothing to slow down/, 'a steady speed above the opening speed'],
    [{ h: 100, g: 0, tOpen: 3, aChute: 25, vTerm: 6 }, /never falls/, 'no gravitational field'],
    [{ h: 100, g: 9.81 }, /Still needed/, 'not enough to go on'],
    [{ h: 100, g: 9.81, tOpen: 3, aChute: 0, vTerm: 6 }, /Still needed/, 'a canopy that does nothing'],
  ];
  for (const [k, re, label] of cases) {
    const r = descent(k);
    ok(!r.ok && re.test(r.reason), `${label} — ${r.ok ? 'ALLOWED' : r.reason.slice(0, 64)}`);
  }

  // Running out of height while still slowing is NOT a refusal: it happens,
  // and she lands faster than the steady speed she was heading for.
  const r = descent({ h: 60, g: 9.81, tOpen: 3, aChute: 3, vTerm: 6 });
  ok(r.ok && r.stillSlowing, 'too gentle a canopy is a result, not an error');
  ok(r.phases.length === 2, 'there is no steady phase to report');
  ok(r.vLanding > 6, `and she lands at ${r.vLanding.toFixed(2)} m s⁻¹ rather than 6`);
  near(r.f.pos(r.tMax).y, 0, 1e-6, 'still ending exactly on the ground');
  near(r.f.speed(r.tMax) - r.vLanding, 0, 1e-9, 'at the speed it reports');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
