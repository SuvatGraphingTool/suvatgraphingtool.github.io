// engine.test.mjs — proves the maths. Run with:  node test/engine.test.mjs
//
// These are hand-worked A-level answers. If a rebuild of the interface ever
// breaks a number on screen, run this first: it tells you whether the engine
// or the interface is at fault.

import { solve } from '../js/core/suvat.js';
import { flight, optimumAngle, timeAbove, heightForTime } from '../js/core/projectile.js';

let pass = 0, fail = 0;

function near(actual, expected, tol, label) {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) { pass++; console.log(`  ok   ${label}  =  ${actual.toFixed(4)}`); }
  else { fail++; console.log(`  FAIL ${label}  =  ${actual.toFixed(4)}  expected ${expected} (±${tol})`); }
}

function ok(cond, label) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}

function group(name, fn) { console.log(`\n${name}`); fn(); }

/* ── The five equations ─────────────────────────────────────────────────── */
group('SUVAT solver', () => {
  let r = solve({ u: 0, a: 9.81, t: 3 });               // ball dropped for 3 s
  near(r.values.s, 44.145, 1e-3, 'dropped 3 s: s');
  near(r.values.v, 29.43, 1e-3, 'dropped 3 s: v');

  r = solve({ u: 0, v: 27, t: 8 });                     // car 0 to 27 m/s in 8 s
  near(r.values.s, 108, 1e-9, 'car: s');
  near(r.values.a, 3.375, 1e-9, 'car: a');

  r = solve({ u: 5, v: 15, a: 2 });                     // v² = u² + 2as
  near(r.values.s, 50, 1e-9, 'v²=u²+2as: s');
  near(r.values.t, 5, 1e-9, 'v²=u²+2as: t');

  r = solve({ v: 12, a: -9.81, t: 1.5 });               // equation with no u
  near(r.values.s, 29.03625, 1e-5, 'no-u case: s');
  near(r.values.u, 26.715, 1e-9, 'no-u case: u');

  // Thrown up at 20, returns to the same height. The physical answer is the
  // NEGATIVE root with t = 4.077 s, not the trivial t = 0 at launch.
  r = solve({ u: 20, a: -9.81, s: 0 });
  near(r.values.v, -20, 1e-9, 'thrown up, back to start: v (negative root)');
  near(r.values.t, 4.07747, 1e-4, 'thrown up, back to start: t');

  // Passing 10 m on the WAY UP is the smaller positive root.
  r = solve({ u: 20, a: -9.81, s: 10 });
  near(r.values.t, 0.58353, 1e-4, 'reaches 10 m going up: t');

  // Three values that do not determine the motion must be refused, not guessed.
  r = solve({ u: 0, v: 0, a: 0 });
  if (!r.ok) { pass++; console.log('  ok   underdetermined case is refused'); }
  else { fail++; console.log('  FAIL underdetermined case returned an answer'); }

  // Fewer than three knowns is a prompt, not a crash.
  r = solve({ u: 5 });
  if (!r.ok && /3 known/.test(r.error)) { pass++; console.log('  ok   too few knowns is reported'); }
  else { fail++; console.log('  FAIL too few knowns not handled'); }
});

/* ── Projectiles ────────────────────────────────────────────────────────── */
group('Projectile model', () => {
  const f = flight({ u: 20, theta: 45, h: 0, g: 9.81 });
  near(f.tFlight, 2.8837, 1e-3, '45°, u=20: time of flight');
  near(f.range, 40.7747, 1e-3, '45°, u=20: range');
  near(f.apexHeight, 10.1937, 1e-3, '45°, u=20: greatest height');

  // Horizontal and vertical are independent: vx never changes.
  const v0 = f.vel(0), v1 = f.vel(1.7);
  near(v1.x - v0.x, 0, 1e-12, 'horizontal velocity is constant');
  near(v1.y - v0.y, -9.81 * 1.7, 1e-9, 'vertical velocity changes by -gt');

  // Complementary angles give equal range on level ground.
  const a = flight({ u: 20, theta: 30, h: 0, g: 9.81 });
  const b = flight({ u: 20, theta: 60, h: 0, g: 9.81 });
  near(a.range - b.range, 0, 1e-9, 'range(30°) equals range(60°)');

  // Dropped from 45 m.
  const d = flight({ u: 0, theta: 0, h: 45, g: 9.81 });
  near(d.tFlight, 3.0289, 1e-3, 'dropped from 45 m: time');
  near(d.vLanding, 29.7132, 1e-3, 'dropped from 45 m: landing speed');

  // Launched horizontally from a cliff: the fall time matches a pure drop.
  const c = flight({ u: 18, theta: 0, h: 60, g: 9.81 });
  const drop = flight({ u: 0, theta: 0, h: 60, g: 9.81 });
  near(c.tFlight - drop.tFlight, 0, 1e-9, 'horizontal launch falls in the same time as a drop');
  near(c.range, 18 * drop.tFlight, 1e-9, 'cliff range = u × fall time');

  // Optimum angle: 45° from the ground, less than 45° from a height.
  near(optimumAngle(20, 0, 9.81), 45, 1e-9, 'best angle from ground level');
  const opt = optimumAngle(20, 20, 9.81);
  if (opt < 45 && opt > 30) { pass++; console.log(`  ok   best angle from 20 m is ${opt.toFixed(2)}° (below 45°)`); }
  else { fail++; console.log(`  FAIL best angle from height came out ${opt.toFixed(2)}°`); }

  // Zero gravity: never lands.
  const z = flight({ u: 20, theta: 45, h: 0, g: 0 });
  if (!isFinite(z.tFlight)) { pass++; console.log('  ok   zero-g flight never lands'); }
  else { fail++; console.log('  FAIL zero-g flight returned a finite time'); }
});

/* ── a line across the flight ───────────────────────────────────────────
   Hand-worked from Jan 09 Q6e's shape: u = 24, θ = 40°, h = 0.9, g = 9.81.
   u_y = 24 sin 40° = 15.4270, apex = 0.9 + u_y²/(2g) = 13.0299,
   t of flight = (u_y + √(u_y² + 2gh))/g = 3.2024. */
group('Time above a line, both ways round', () => {
  const f = flight({ u: 24, theta: 40, h: 0.9, g: 9.81 });

  // Above the launch point: two crossings, Δt = 2√(u_y² − 2g(L − h))/g.
  near(timeAbove(f, 6).above, 2.3943, 5e-4, 'above 6 m for');
  near(timeAbove(f, 12).above, 0.9165, 5e-4, 'above 12 m for');
  ok(timeAbove(f, 6).crosses === 2, 'a line above the launch is crossed twice');

  // At the apex the interval closes; above it there is none at all.
  near(timeAbove(f, f.apexHeight).above, 0, 1e-6, 'above the apex itself for');
  ok(timeAbove(f, f.apexHeight + 1).above === 0, 'a line over the apex is never cleared');

  // Below the launch point it starts above the line, so t1 is zero and the
  // interval runs to the single downward crossing.
  const low = timeAbove(f, 0.4);
  ok(low.t1 === 0 && low.crosses === 1, 'a line below the launch is crossed once, on the way down');
  // t = (u_y + √(u_y² + 2g(h − L)))⁄g = (15.4269 + √(237.989 + 9.81))⁄9.81
  near(low.above, 3.1772, 5e-4, 'above 0.4 m for');
  near(timeAbove(f, 0).above, f.tFlight, 1e-9, 'above the ground for the whole flight');

  // The two cases have to agree where they meet, or the inverse is not
  // single-valued and typing a time would be ambiguous.
  near(timeAbove(f, 0.9 - 1e-9).above, timeAbove(f, 0.9 + 1e-9).above, 1e-5,
       'the two cases agree at the launch height');
});

group('Asking for a time gives back the line that produces it', () => {
  const f = flight({ u: 24, theta: 40, h: 0.9, g: 9.81 });
  for (const want of [0.25, 1, 1.5, 2, 2.5, 3, 3.19]) {
    const r = heightForTime(f, want);
    ok(r.ok, `${want} s is possible`);
    near(timeAbove(f, r.height).above, want, 1e-9, `and a line at ${r.height.toFixed(4)} m gives`);
  }
  // 1.5 s, worked by hand: L = apex − g(Δt)²⁄8 = 13.0299 − 9.81 × 2.25 ⁄ 8
  near(heightForTime(f, 1.5).height, 10.2708, 5e-4, 'the line for 1.5 s above it');

  // It refuses rather than guessing.
  ok(!heightForTime(f, 5).ok, 'longer than the whole flight is refused');
  ok(/3\.20 s/.test(heightForTime(f, 5).reason), 'and the refusal quotes the flight it has');
  ok(!heightForTime(f, 0).ok, 'zero seconds is refused');
  ok(!heightForTime(f, -2).ok, 'a negative time is refused');
  ok(!heightForTime(flight({ u: 24, theta: 40, h: 0.9, g: 0 }), 1).ok,
     'with no gravity there is no interval to match');

  // A flight thrown flat has no upward half at all, so every line is the
  // one-crossing case. The round trip still has to hold.
  const flat = flight({ u: 20, theta: 0, h: 25, g: 9.81 });
  const r = heightForTime(flat, 1.2);
  ok(r.ok, 'a flat throw can still be asked for a time');
  near(timeAbove(flat, r.height).above, 1.2, 1e-9, 'and it comes back exactly');
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
