// scenarios.test.mjs — the claims the scenario cards make, and the physics
// behind them. Run: node test/scenarios.test.mjs
import { SCENARIOS, GROUPS, byId } from '../js/scenarios.js';
import { flight } from '../js/core/projectile.js';
import { descent } from '../js/core/descent.js';
import { descentPanes, plotSpec, planePose, PRE } from '../js/render/drop.js';
import { valueAt } from '../js/render/plot.js';
import { solveRoad, timeToReach, roadWorking } from '../js/core/road.js';
import { graphSpecs } from '../js/render/graphs.js';
import * as FIG from '../js/render/figures.js';

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
  // angle was added, eleven when the parachute arrived, and twelve with the
  // road — the first with no gravity in it.
  ok(SCENARIOS.length === 12, 'twelve scenarios in all');
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

/* ── the four panes ─────────────────────────────────────────────────────
   The window draws what js/render/drop.js hands it, and what it hands it is
   a list of exact segments rather than a function to sample — a straight line
   per phase for the velocity, a parabola per phase for the height, a flat per
   phase for the acceleration. See the note at the head of js/render/plot.js.

   The claim that has to be tested is that those segments ARE the engine. If
   they drift, the graph a student reads values off stops being the motion the
   working panel is describing, and nothing else in the app would notice. So
   this walks each series against the engine's own pos(), speed() and at()
   everywhere, including the middles of phases where a sampled curve would be
   right at the ends and wrong in between. */
group('The four panes are the engine, read another way', () => {
  const SETUPS = [
    { h: 140, g: 9.81, tOpen: 3, aChute: 25, vTerm: 6 },
    { h: 1000, g: 9.81, tOpen: 12, aChute: 30, vTerm: 5 },
    { h: 400, g: 1.62, tOpen: 14, aChute: 8, vTerm: 4 },        // the Moon
    { h: 60, g: 9.81, tOpen: 3, aChute: 3, vTerm: 6 },          // lands still slowing
  ];
  for (const k of SETUPS) {
    const r = descent(k);
    const tag = `${k.h} m, open at ${k.tOpen} s, g = ${k.g}`;
    const panes = descentPanes(r.f);
    ok(panes.length === 4, `${tag} · four panes`);
    ok(panes.map((p) => p.id).join() === 'jump,vt,st,at',
       `${tag} · the jump, and the three graphs against time`);

    const seg = (id) => panes.find((p) => p.id === id).series[0].segs;
    // Downwards positive on all three, which is the convention descent.js
    // states and the one the ending card's table is in.
    const truth = {
      vt: (t) => r.f.speed(t),
      st: (t) => r.f.pos(t).y,
      at: (t) => r.f.at(t).a,
    };
    for (const id of ['vt', 'st', 'at']) {
      let worst = 0, where = 0;
      for (let i = 0; i <= 2000; i++) {
        const t = (i / 2000) * r.tMax;
        // A step function is read at the phase boundary by whichever side the
        // engine answers for, so boundaries are skipped for a–t alone.
        if (id === 'at' && r.phases.some((p) => Math.abs(t - (p.t0 + p.t)) < 1e-9)) continue;
        const d = Math.abs(valueAt(seg(id), t) - truth[id](t));
        if (d > worst) { worst = d; where = t; }
      }
      near(worst, 0, 1e-9, `${tag} · ${id} agrees with the engine everywhere (worst at t = ${where.toFixed(3)})`);
    }

    // One segment per phase, spanning that phase and no more.
    for (const id of ['vt', 'st', 'at']) {
      ok(seg(id).length === r.phases.length, `${tag} · ${id} has one segment per phase`);
      r.phases.forEach((p, i) => {
        near(seg(id)[i].t0 - p.t0, 0, 1e-12, `${tag} · ${id} segment ${i + 1} starts with its phase`);
        near(seg(id)[i].t1 - (p.t0 + p.t), 0, 1e-12, `${tag} · ${id} segment ${i + 1} ends with it`);
      });
    }
    // v–t and a–t are STRAIGHT, which is the whole reason they are exact;
    // s–t is a quadratic, which is the whole reason it needs a third number.
    ok(seg('vt').every((x) => x.kind === 'line'), `${tag} · v–t is straight lines`);
    ok(seg('at').every((x) => x.kind === 'line'), `${tag} · a–t is flats`);
    ok(seg('at').every((x) => Math.abs(x.y0 - x.y1) < 1e-12), `${tag} · and every flat really is flat`);
    ok(seg('st').every((x) => x.kind === 'quad'), `${tag} · s–t is parabolas`);

    // The whole flight fits in the frame each pane opens on, and zero is in
    // the frame of all three so the axis means something.
    for (const id of ['vt', 'st', 'at']) {
      const p = panes.find((x) => x.id === id);
      const vals = [];
      for (let i = 0; i <= 400; i++) vals.push(truth[id]((i / 400) * r.tMax));
      ok(Math.min(...vals) >= p.bounds.lo - 1e-9 && Math.max(...vals) <= p.bounds.hi + 1e-9,
         `${tag} · ${id} opens on a frame that holds the whole flight`);
      ok(p.bounds.lo <= 0 && p.bounds.hi >= 0, `${tag} · ${id} has zero in it`);
      near(p.bounds.t0, 0, 1e-12, `${tag} · ${id} starts the clock at zero`);
      near(p.bounds.t1 - r.tMax, 0, 1e-12, `${tag} · and ends it at the landing`);
    }

    // The area the v–t pane shades is the engine's own fallen distance.
    const vt = panes.find((p) => p.id === 'vt');
    near(vt.fallen(r.tMax) - k.h, 0, 1e-6, `${tag} · the shaded area is the whole drop`);
    near(vt.fallen(0), 0, 1e-12, `${tag} · and nothing at the start`);

    // The phase boundaries are ruled, and named by the phase they open.
    const ruled = vt.rules.map((x) => +x.t.toFixed(9));
    ok(ruled.join() === r.phases.slice(0, -1).map((p) => +(p.t0 + p.t).toFixed(9)).join(),
       `${tag} · every phase boundary is ruled`);
    ok(vt.rules.every((x, i) => x.name === r.phases[i + 1].name),
       `${tag} · and named by the phase it opens`);
  }

  /* THE PRE-ROLL HOLDS THE GRAPHS AT ZERO AND EMPTY. t = 0 is the release, so
     the aircraft, the door and the step out are outside the clock — and a flat
     line at zero would be a claim about a motion that has not happened. */
  const r = descent({ h: 140, g: 9.81, tOpen: 3, aChute: 25, vTerm: 6 });
  const vt = descentPanes(r.f).find((p) => p.id === 'vt');
  const during = plotSpec(vt, r.f, 4.2, 1.1);
  const after = plotSpec(vt, r.f, 4.2, null);
  ok(during.pre && during.t === 0, 'during the pre-roll the cursor is at zero and the pane says why');
  ok(!after.pre && after.t === 4.2, 'and once the clock starts it is the clock');
  ok(PRE.total > 0 && PRE.open0 < PRE.open1 && PRE.open1 <= PRE.exit,
     'the door finishes opening before she leaves through it');
});

/* ── the aircraft ───────────────────────────────────────────────────────
   It drops her and then follows her down, which is what a jump aircraft does.
   None of that is computed and none of it may be mistakable for her: the
   three properties below are what keep a second thing moving in the same sky
   from reading as a second object with a motion worth measuring. */
group('The aircraft drops her, follows her down, and is never her', () => {
  const r = descent({ h: 140, g: 9.81, tOpen: 3, aChute: 25, vTerm: 6 });
  const h = 140, R = 300;

  // It hands over from the staging to the clock without a jump in either
  // coordinate — the one seam where the run-in and the descent could disagree.
  const last = planePose(PRE.total, 0, r.tMax, h, R);
  const first = planePose(null, 0, r.tMax, h, R);
  near(first.x - last.x, 0, 1e-9, 'the descent starts where the run-in finished');
  near(first.y - last.y, 0, 1e-9, 'and at the height she jumped from');

  // The run-in: off-frame, in to the release point, door shut then open.
  near(planePose(0, 0, r.tMax, h, R).x + R, 0, 1e-9, 'it comes in from a run away');
  near(planePose(PRE.total * PRE.exit, 0, r.tMax, h, R).x, 0, 1e-9,
       'and the door is over the release point when she leaves');
  near(planePose(PRE.total * PRE.open0, 0, r.tMax, h, R).open, 0, 1e-9, 'the door starts shut');
  near(planePose(PRE.total * PRE.open1, 0, r.tMax, h, R).open - 1, 0, 1e-9,
       'and is fully open before she goes through it');
  ok(planePose(PRE.total * 0.2, 0, r.tMax, h, R).y === h,
     'it flies level the whole way in, including while the door slides');

  // Through the fall: always out to the side, always far above her, always
  // sinking a fraction of what she falls, and fading as it recedes.
  let worstSide = Infinity, worstGap = Infinity, worstShare = 0;
  let outwards = true, fading = true, prevX = -Infinity, prevA = 2;
  for (let i = 0; i <= 400; i++) {
    const t = (i / 400) * r.tMax;
    const p = planePose(null, t, r.tMax, h, R);
    worstSide = Math.min(worstSide, p.x);                    // she is at x = 0
    worstGap = Math.min(worstGap, p.y - r.f.pos(t).y);       // and below it
    if (i) worstShare = Math.max(worstShare, (h - p.y) / (h - r.f.pos(t).y));
    if (p.x < prevX - 1e-12) outwards = false;
    if (p.alpha > prevA + 1e-12) fading = false;
    prevX = p.x; prevA = p.alpha;
  }
  ok(worstSide > 0.3 * R, `it is always out to the side (never nearer than ${worstSide.toFixed(0)} m)`);
  // ZERO AT t = 0 AND POSITIVE EVER AFTER. She leaves at the aircraft's own
  // height, so they share one instant and part company from there — a sink
  // that got ahead of her fall would put the aeroplane underneath the jumper.
  ok(worstGap >= -1e-9, `and never below her (closest ${worstGap.toFixed(3)} m)`);
  ok(planePose(null, r.tMax * 0.02, r.tMax, h, R).y > r.f.pos(r.tMax * 0.02).y,
     'already clear of her a fiftieth of the way in');
  ok(worstShare < 1, `so it never loses height faster than she falls (worst share ${worstShare.toFixed(3)})`);
  ok(outwards, 'it only ever goes further out');
  ok(fading, 'and only ever fainter');
  near(planePose(null, r.tMax, r.tMax, h, R).y - h * (1 - 0.58), 0, 1e-9,
       'by the landing it has glided down a fraction of her drop');
  ok(planePose(null, r.tMax, r.tMax, h, R).alpha < 0.5, 'and faded into the distance');
  ok(planePose(null, 0, r.tMax, h, R).tilt > 0, 'nose down once it is descending');
  ok(planePose(1, 0, r.tMax, h, R).tilt === 0, 'and level before it has dropped her');
});

/* The ending card lists what the model leaves out, and the aircraft is now on
   that list: she leaves from rest and falls vertically, so the aeroplane and
   the door are scenery. Checked here rather than left to the eye, because the
   whole value of that list is that it is complete. */
group('And the card says the aircraft was never modelled', () => {
  const e = byId('parachute').ending;
  const said = e.why.map(([k, v]) => `${k} ${v}`).join(' ').toLowerCase();
  ok(/aircraft is scenery/.test(e.why.map(([k]) => k).join(' ').toLowerCase()),
     'the list names the aircraft');
  ok(/from rest/.test(said) && /vertical/.test(said), 'and says she leaves from rest, falling vertically');
  ok(/one-dimensional/.test(said), 'because the engine is one-dimensional');
  ok(/before the clock starts/.test(said), 'and that the staging is outside the clock');
});


group('Along a straight road: the lorry question, answered by the engine', () => {
  // "passes A at u m/s, 10 s later passes B at 34 m/s, AB = 240 m.
  //  Find (a) u, (b) the time from A to the mid-point of AB."
  const r = solveRoad({ s: 240, v: 34, t: 10, mark: 'mid' });
  ok(r.ok, 'three of the five are enough');
  near(r.params.u, 14, 1e-9, '(a) u');
  near(r.params.a, 2, 1e-9, 'and a');
  near(r.moment.t, 6, 1e-9, '(b) the time to the mid-point');
  near(r.moment.v, 26, 1e-9, 'and the speed there');
  near(r.f.pos(r.moment.t).x, 120, 1e-9, 'the motion is at the mid-point then');
  near(r.f.pos(10).x, 240, 1e-9, 'and at B after 10 s');
  near(r.f.vel(10).x, 34, 1e-9, 'doing 34');
  ok(r.five.u.given === false && r.five.s.given === true, 'the done card knows what was given');
  const W = roadWorking(r);
  ok(W.length === 4, 'working: the three, two unknowns, and the mid-point');
});

group('Along a straight road: braking, and what cannot happen', () => {
  const b = solveRoad({ u: 20, v: 0, s: 50 });
  near(b.params.a, -4, 1e-9, 'braking from 20 to rest in 50 m is a = −4');
  near(b.params.t, 5, 1e-9, 'and takes 5 s');
  ok(b.notes.some((n) => /braking/.test(n)), 'and says it is braking');
  ok(!solveRoad({ u: 20, a: -4, s: 60 }).ok, 'it never reaches 60 m braking at 4 from 20');
  ok(!solveRoad({ s: 240, v: 34 }).ok, 'two of the five are refused');
  const clash = solveRoad({ s: 240, v: 34, t: 10, u: 15 });
  ok(!clash.ok && /do not agree/.test(clash.reason), 'four that disagree are refused, and it says so');
  const spare = solveRoad({ s: 240, v: 34, t: 10, u: 14 });
  ok(spare.ok && spare.notes.some((n) => /more than enough/.test(n)), 'four that agree run, with a note');
  const steady = solveRoad({ u: 12, a: 0, t: 5, mark: 30 });
  near(steady.moment.t, 2.5, 1e-9, 'no acceleration: 30 m at 12 m/s takes 2.5 s');
  ok(!timeToReach(solveRoad({ s: 240, v: 34, t: 10 }).f, 500).ok, 'a point past B is not reached while watched');
});

group('Along a straight road: the scenario and its graphs', () => {
  const s = byId('road');
  ok(s.group === 'line' && GROUPS.some((g) => g.id === 'line'), 'it has a group of its own');
  ok(s.road && s.stage === 'road', 'its own engine and its own stage');
  ok((s.note || '').length > 80 && !!s.sub, 'it says what it is for');
  ok(solveRoad(s.params).ok, 'the card sketch is a motion the engine accepts');
  const r = solveRoad({ s: 240, v: 34, t: 10 });
  const P = { disp: 'd', vel: 'v', acc: 'a' };
  const specs = graphSpecs(r.f, 4, P);
  ok(specs.every((g) => g.series.length === 1 && g.series[0].dash), 'one line per graph, dashed: it is all horizontal');
  const vt = specs.find((g) => g.canvas === 'g-v').series[0].fn;
  // the trapezium: the area under v–t from 0 to 10 is AB
  let area = 0; const n = 1000;
  for (let i = 0; i < n; i++) area += vt((i + 0.5) * (10 / n)) * (10 / n);
  near(area, 240, 1e-6, 'area under the velocity–time line');
});

group('The figures: every traveller draws, with no NaN, either way round, at any phase', () => {
  // A canvas that draws nothing and fails on any coordinate that is not a
  // finite number: a figure with a NaN in it is a figure that silently vanishes.
  let bad = 0, calls = 0;
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => { calls++; if (args.some((a) => typeof a === 'number' && !isFinite(a))) bad++; return { addColorStop() {} }; };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  const P = new Proxy({}, { get: () => '#888' });
  const labels = { add() {} };
  for (const [kind, f] of Object.entries(FIG.FIGURES)) {
    ok(typeof f.draw === 'function' && f.label && f.noun && f.verb && f.size > 0, `${kind}: drawn, named, and sized`);
    ok(['road', 'rail', 'track'].includes(f.ground), `${kind}: stands on a road, rails or a track`);
    bad = 0; calls = 0;
    for (const dir of [1, -1]) for (const phase of [0, 0.25, 0.5, 0.99]) {
      for (const L of [20, 90, 160]) f.draw(ctx, 300, 200, L, P, { dir, phase, ring: '#f0f' });
    }
    ok(bad === 0 && calls > 20, `${kind}: ${calls} canvas calls, every coordinate finite`);
  }
  bad = 0;
  FIG.runner(ctx, 100, 100, 70, P, { still: true });
  FIG.train(ctx, 100, 100, 140, P, { cars: 3 });
  FIG.particle(ctx, 100, 100, 10, P);   // the ball is ballSprite, which reads the page's CSS
  for (const lit of ['red', 'amber', 'green', null]) FIG.trafficLights(ctx, 100, 100, 90, P, { lit });
  FIG.post(ctx, labels, 100, 100, 'X', '#0f0', P, { dashed: true, height: 60 });
  for (const gr of ['road', 'rail', 'track']) FIG.surface(ctx, gr, 0, 800, 100, P);
  ok(bad === 0, 'the still runner, a three-car train, a particle, lights, a post and the three surfaces: all finite');
  // the phase: wraps into [0, 1), rolls without slipping, and goes backwards
  for (const kind of Object.keys(FIG.FIGURES)) {
    const p = [0, 37, 1e4, -55].map((px) => FIG.phaseFor(kind, 80, px));
    ok(p.every((x) => x >= 0 && x < 1), `${kind}: phase stays in [0, 1)`);
  }
  near(FIG.phaseFor('car', 100, 2 * Math.PI * 10), 0, 1e-9, 'a car wheel of radius 10 px turns once in 2π·10 px');
  near(FIG.phaseFor('car', 100, Math.PI * 10), 0.5, 1e-9, 'and half a turn in half that');
  // the runner's planted foot stays where it was put while she runs over it
  {
    const L = 100, per = FIG.FIGURES.runner.cycle * L, xs = [];
    for (let i = 0; i <= 18; i++) {
      const ph = (i / 18) * 0.45, X = ph * per;
      let tx = 0, strokes = [], cur = [];
      const rec = new Proxy({}, { get(t, k) { if (k in t) return t[k];
        if (String(k).startsWith('create')) return () => ({ addColorStop() {} });
        return (...a) => { if (k === 'translate') tx = a[0]; if (k === 'beginPath') cur = []; if (k === 'moveTo' || k === 'lineTo') cur.push(a); if (k === 'stroke') strokes.push(cur); }; },
        set(t, k, v) { t[k] = v; return true; } });
      FIG.runner(rec, X, 0, L, P, { phase: ph });
      // the near leg: of the three-point limbs drawn, the stance one is the one whose foot is on the ground
      const legs = strokes.filter((st) => st.length === 3 && Math.abs(st[2][1]) < 1e-6);
      const foot = legs[legs.length - 1][2];
      xs.push({ x: tx + foot[0], y: foot[1] });
    }
    const drift = Math.max(...xs.map((p) => p.x)) - Math.min(...xs.map((p) => p.x));
    ok(xs.every((p) => Math.abs(p.y) < 1e-6) && drift < 2, `runner: the foot in stance stays on the ground, drifting ${drift.toFixed(2)} px over the stance`);
  }
  ok(FIGURES_ROAD_SAY(), 'the road says the traveller in its notes: a cyclist braking does not turn round');
});

function FIGURES_ROAD_SAY() {
  const r = solveRoad({ u: 10, a: -2, t: 8, who: 'cyclist' });
  const lorry = solveRoad({ u: 10, a: -2, t: 8 });
  return r.notes.some((n) => /a cyclist braking does not/.test(n)) && lorry.notes.some((n) => /a lorry braking does not/.test(n));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
