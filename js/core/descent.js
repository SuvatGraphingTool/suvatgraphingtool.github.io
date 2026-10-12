// descent.js — a parachute drop: three phases, each one of them SUVAT.
//
// WHY THIS IS NOT projectile.js. Everywhere else on this site the whole
// motion has ONE acceleration, and that is the honest idealised model: no
// air, so nothing but gravity acts. A parachute is the one situation a
// student meets where pretending there is no air is not a simplification but
// a refusal to describe the thing at all — a canopy is a device for making
// drag enormous on purpose.
//
// So air comes in, and it comes in the way the exams let it in: NOT as a drag
// law, but as a STATED constant for each stretch of the fall. The motion is
// cut into three stretches, the acceleration is constant within each, and the
// five equations are applied to each in turn. That is exactly what an M1 or a
// v–t graph question does with a parachutist, and it is why the question is
// set: it is the first time most students have to notice that SUVAT describes
// a PHASE of a motion rather than a motion.
//
//   1 · free fall      released from rest, a = g downwards, for a time the
//                      student chooses — this phase is the ordinary model
//   2 · the canopy      net force upwards, so a constant deceleration, until
//                      the speed has dropped to the steady descent speed
//   3 · steady descent  a = 0, so constant velocity, the rest of the way down
//
// WHAT IS NOT MODELLED, and the ending card says all of it out loud: drag is
// not computed from speed anywhere, so phase 1 accelerates for ever rather
// than levelling off near a real skydiver's 55 m s⁻¹, and the canopy's
// opening is one instantaneous change of acceleration rather than the
// half-second snatch it really is. Both are the exam's simplifications, not
// this file's inventions, and neither is quietly smuggled in.
//
// SIGNS. Downwards is positive throughout — the direction of travel, which is
// the convention solve.js picks for a drop and the one a student is taught to
// choose. So phase 2's acceleration is negative, and every rearrangement
// below is the standard one with signed values substituted into it.
//
// NOTATION. Every formula goes through M`` — see js/notation.js. Nothing here
// decides what a symbol looks like.

import { M, num, signed } from '../notation.js';

const d = (x, p = 2) => num(x, p, { trim: true });
const sb = (x, p = 2) => signed(x, p, { trim: true });
const EPS = 1e-9;
const have = (x) => typeof x === 'number' && isFinite(x);

/** A refusal is a result: say what is missing or what cannot happen, and why. */
const no = (reason) => ({ ok: false, reason });

/**
 * The whole descent, worked out.
 *
 * @param {Object} k
 *   h        the height she jumps from (m)
 *   g        gravitational field strength (m s⁻², positive downwards)
 *   tOpen    how long she falls freely before the canopy opens (s)
 *   aChute   the deceleration the open canopy gives (m s⁻², a positive size)
 *   vTerm    the steady speed she settles to under the canopy (m s⁻¹)
 */
export function descent(k = {}) {
  const { h, g, tOpen, aChute, vTerm } = k;

  /* ── what it cannot do without ─────────────────────────────────────── */
  const missing = [
    [!have(h) || h <= EPS, 'the height she jumps from'],
    [!have(g), 'the gravitational field — pick one below'],
    [!have(tOpen) || tOpen < 0, 'how long she falls before the canopy opens'],
    [!have(aChute) || aChute <= EPS, 'the deceleration the canopy gives'],
    [!have(vTerm) || vTerm <= EPS, 'the steady speed she settles to'],
  ].filter(([bad]) => bad).map(([, name]) => name);
  if (missing.length) {
    return no(missing.length === 1
      ? `Still needed: ${missing[0]}.`
      : `Still needed: ${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}.`);
  }
  if (g <= EPS) {
    return no('With no gravitational field she never falls, so there is nothing for a canopy to slow down. This one needs a field.');
  }

  /* ── 1 · free fall, a = g ──────────────────────────────────────────── */
  const tFree = Math.sqrt((2 * h) / g);        // if she never opened it at all
  if (tOpen >= tFree - 1e-9) {
    return no(`Falling freely from ${d(h)} m she reaches the ground after `
      + `${d(tFree)} s, and the canopy is set to open at ${d(tOpen)} s — so it never opens. `
      + `Open it sooner, or jump from higher up.`);
  }
  const v1 = g * tOpen;                        // speed when the canopy opens
  const s1 = 0.5 * g * tOpen * tOpen;          // how far she has fallen by then

  if (v1 <= vTerm + 1e-9) {
    return no(tOpen <= EPS
      ? `The canopy is open before she has started moving, so there is nothing to slow: `
        + `a drop cannot be brought DOWN to ${d(vTerm)} m s⁻¹ from rest. Let her fall first.`
      : `After ${d(tOpen)} s of free fall she is doing ${d(v1)} m s⁻¹, which is already at or `
        + `below the ${d(vTerm)} m s⁻¹ you have given as the steady speed — so the canopy has `
        + `nothing to slow down. Open it later, or give a slower steady speed.`);
  }

  /* ── 2 · the canopy, a constant deceleration ───────────────────────── */
  const a2 = -aChute;                          // downwards is positive
  const t2 = (vTerm - v1) / a2;                // v = u + at
  const s2 = (vTerm * vTerm - v1 * v1) / (2 * a2);   // v² = u² + 2as

  /* ── 3 · steady descent, a = 0 ─────────────────────────────────────── */
  const left = h - s1 - s2;
  // SHE CAN RUN OUT OF HEIGHT WHILE STILL SLOWING DOWN, and that is a result
  // rather than an error: open the canopy too late, or give it too gentle a
  // deceleration, and she arrives faster than the steady speed. The whole
  // phase 3 simply does not happen, and the ending says so.
  const stillSlowing = left < -1e-9;

  let phases, tMax, vLanding;
  if (stillSlowing) {
    // ½a2 τ² + v1 τ − (h − s1) = 0, and the root wanted is the first one.
    const rest = h - s1;
    const disc = v1 * v1 + 2 * a2 * rest;
    // disc < 0 would mean she stops in mid-air before reaching the ground,
    // which cannot happen here: she only gets this far if she runs out of
    // height before slowing to vTerm, and she is still moving at vTerm.
    const r = Math.sqrt(Math.max(0, disc));
    const tau = (-v1 + r) / a2;                // a2 is negative, so this is the smaller root
    vLanding = v1 + a2 * tau;
    tMax = tOpen + tau;
    phases = [
      phase1(tOpen, v1, s1, g),
      { ...phase2(tau, v1, vLanding, rest, a2, aChute), cut: true },
    ];
  } else {
    const t3 = left / vTerm;
    vLanding = vTerm;
    tMax = tOpen + t2 + t3;
    phases = [
      phase1(tOpen, v1, s1, g),
      phase2(t2, v1, vTerm, s2, a2, aChute),
      phase3(t3, vTerm, left),
    ];
  }

  // Each phase knows when it starts and what height it spans, so a renderer
  // never has to add the durations up itself.
  let t0 = 0, fallen = 0;
  for (const p of phases) {
    p.t0 = t0; p.fallen0 = fallen;
    p.y0 = h - fallen; p.y1 = h - (fallen + p.s);
    t0 += p.t; fallen += p.s;
  }

  const at = (t) => {
    const tt = Math.min(Math.max(t, 0), tMax);
    for (let i = phases.length - 1; i >= 0; i--) if (tt >= phases[i].t0 - 1e-12) return phases[i];
    return phases[0];
  };

  /** How far she has fallen, and how fast she is going, at any instant. */
  const fallenAt = (t) => {
    const tt = Math.min(Math.max(t, 0), tMax);
    const p = at(tt), tau = tt - p.t0;
    return p.fallen0 + p.u * tau + 0.5 * p.a * tau * tau;
  };
  const speedAt = (t) => {
    const tt = Math.min(Math.max(t, 0), tMax);
    const p = at(tt);
    return p.u + p.a * (tt - p.t0);
  };

  const pos = (t) => ({ x: 0, y: h - fallenAt(t) });
  const vel = (t) => ({ x: 0, y: -speedAt(t) });
  const speed = (t) => Math.abs(speedAt(t));
  /** World-up acceleration, so a canopy reads as a positive number. */
  const accel = (t) => -at(t).a;

  const f = {
    params: { u: 0, theta: -90, h, g, tOpen, aChute, vTerm },
    descent: true, phases, at, tOpen, aChute, vTerm,
    // The same shape every renderer in this app already consumes. A vertical
    // drop has no horizontal part and no apex above its launch, and saying so
    // in these fields is what stops the scene drawing a range bracket of zero
    // width and a greatest-height tick on the launch point.
    ux: 0, uy: 0, horiz: 0,
    tFlight: tMax, tMax, infinite: false,
    tApex: 0, apexHeight: h, apexInFlight: false,
    range: 0, bounces: 0,
    vLanding, landingAngle: -90,
    stillSlowing,
    pos, vel, speed, accel,
    angleAt: () => -90,
    kineticEnergy: (t) => 0.5 * (f.mass ?? 1) * speed(t) ** 2,
    momentum: (t) => (f.mass ?? 1) * speed(t),
    path(n = 240, tEnd = tMax) {
      const out = [];
      for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; out.push({ t, ...pos(t) }); }
      return out;
    },
    ticks(count = 10, tEnd = tMax) {
      const out = [];
      for (let i = 0; i <= count; i++) { const t = (i / count) * tEnd; out.push({ t, ...pos(t), v: vel(t) }); }
      return out;
    },
  };
  return { ok: true, f, phases, tMax, vLanding, stillSlowing,
           total: { t: tMax, s: h, v: vLanding } };
}

/* ── the three phases, each as the exam would set it out ──────────────── */

function phase1(t, v1, s1, g) {
  return {
    key: 'free', name: 'Free fall',
    sub: 'released from rest, nothing but gravity',
    u: 0, v: v1, a: g, s: s1, t,
    // The equations this phase is solved by, and what they give. Everything
    // here is already computed; these are the lines that show the working.
    rows: [
      { f: M`v = u + at`, s: M`v = 0 + ${d(g)} × ${d(t)} = ${d(v1)} [m s^-1]` },
      { f: M`s = ut + ½at^2`, s: M`s = ½ × ${d(g)} × ${d(t)}^2 = ${d(s1)} [m]` },
    ],
    note: 'The ordinary model: no air in it at all, so she simply gains '
      + `${d(g)} m s⁻¹ every second.`,
  };
}

function phase2(t, u, v, s, a, aChute) {
  return {
    key: 'canopy', name: 'The canopy opens',
    sub: 'a constant deceleration, as the question states it',
    u, v, a, s, t,
    rows: [
      { f: M`t = (v - u)/a`, s: M`t = (${d(v)} - ${d(u)})/${sb(a)} = ${d(t)} [s]` },
      { f: M`s = (v^2 - u^2)/(2a)`, s: M`s = (${d(v * v)} - ${d(u * u)})/(2 × ${sb(a)}) = ${d(s)} [m]` },
    ],
    note: `Air resistance now exceeds her weight, so the acceleration is upwards — `
      + `${d(aChute)} m s⁻² against a fall of ${d(u)} m s⁻¹. It is a stated constant, `
      + 'not something worked out from her speed.',
  };
}

function phase3(t, v, s) {
  return {
    key: 'steady', name: 'Steady descent',
    sub: 'drag balances weight, so no acceleration at all',
    u: v, v, a: 0, s, t,
    rows: [
      { f: `${M`a = 0`}, so ${M`s = vt`}`, s: M`t = s/v = ${d(s)}/${d(v)} = ${d(t)} [s]` },
    ],
    note: 'Constant velocity: the two forces are equal and opposite, which is what '
      + 'terminal velocity means.',
  };
}

/* ══ the answer, assembled the way solve.js assembles its own ══════════
   app.js reads one object off the engine whatever the scenario — whether the
   motion is determined, what it worked out, what it had to assume, which
   convention it chose. This returns the same shape so that nothing in the
   interface has to know which engine answered. */
export function solveDescent(k = {}) {
  const r = descent(k);
  if (!r.ok) {
    return { ok: false, reason: r.reason, derived: [], notes: [], filled: {},
             given: [], used: [], spare: [], clash: [] };
  }
  const { f, phases, tMax, vLanding, stillSlowing } = r;
  const p = f.params;

  const derived = [
    M`"speed when it opens" = ${d(p.g * p.tOpen)} [m s^-1]`,
    M`"total time down" = ${d(tMax)} [s]`,
    M`"landing speed" = ${d(vLanding)} [m s^-1]`,
  ];

  const notes = [];
  if (stillSlowing) {
    notes.push(`She reaches the ground before the canopy has finished slowing her, so she `
      + `lands at ${d(vLanding)} m s⁻¹ rather than at the ${d(p.vTerm)} m s⁻¹ you asked for. `
      + `Open it earlier, or give it a harder deceleration.`);
  }
  notes.push(`Each phase is solved on its own, and the five equations are applied to it `
    + `three times over — they describe a stretch of constant acceleration, which is `
    + `what each phase is and what the whole descent is not.`);

  const extras = [
    { key: 'vOpen', label: 'speed as it opens', value: p.g * p.tOpen, unit: 'm s⁻¹' },
    { key: 'hOpen', label: 'height as it opens', value: phases[0].y1, unit: 'm' },
    { key: 'vLand', label: 'landing speed', value: vLanding, unit: 'm s⁻¹' },
    { key: 'h', label: 'height of the jump', value: p.h, unit: 'm' },
  ].filter((x) => isFinite(x.value));

  return {
    ok: true, mode: '1d', axis: 'down', params: p, f, phases,
    tMax, vLanding, stillSlowing,
    derived, notes, extras, filled: {},
    given: ['h', 'g', 't', 'a', 'v'], used: [], spare: [], clash: [],
    five: null, moment: null, answer: null, altTheta: null, assumedH: false,
    convention: 'Taking downwards as positive, and timing each phase from its own start.',
  };
}

/* ── the working panel, phase by phase ──────────────────────────────────
   The same shape js/working.js returns, so the panel does not care which
   engine filled it: a title, rows of formula and substitution, and a note. */
export function descentWorking(f, t) {
  const here = f.at(t);
  const steps = f.phases.map((p, i) => ({
    title: `${i + 1} · ${p.name} — ${p.t0 > 0 ? `from ${M`t = ${d(p.t0)} [s]`}` : 'from rest'}`,
    rows: [
      { f: `Taking downwards as positive: ${M`u = ${sb(p.u)}`}, ${M`a = ${sb(p.a)}`}`,
        s: M`"for" ${d(p.t)} [s]`,
        r: `${M`v = ${d(p.v)} [m s^-1]`} after ${M`s = ${d(p.s)} [m]`}` },
      ...p.rows,
    ],
    note: p === here ? `This is the phase she is in now. ${p.note}` : p.note,
  }));

  const fallen = f.params.h - f.pos(t).y;
  steps.push({
    title: `At ${M`t = ${d(t)} [s]`} — ${here.name.toLowerCase()}`,
    rows: [
      { f: M`v = u + at`,
        s: M`v = ${sb(here.u)} + ${sb(here.a)} × ${d(t - here.t0)} = ${d(f.speed(t))} [m s^-1]`,
        r: M`"speed" = ${d(f.speed(t))} [m s^-1]` },
      { f: M`s = ut + ½at^2`,
        s: M`s = ${sb(here.u)} × ${d(t - here.t0)} + ½ × ${sb(here.a)} × ${d(t - here.t0)}^2 = ${d(fallen - here.fallen0)} [m]`,
        r: `${M`"fallen in all" = ${d(fallen)} [m]`}, so ${M`"height" = ${d(f.pos(t).y)} [m]`}` },
    ],
    note: 'The time in these two is measured from the start of this phase, not from '
      + 'the jump — which is the single commonest way to lose the marks on this question.',
  });
  return steps;
}

/* ── resolving one instant of a descent ─────────────────────────────────
   The resolve card asks the same question everywhere: split this instant
   into components. A vertical descent has no horizontal part, so the card
   shows one row of each — and the formulas it quotes have to belong to the
   PHASE she is in, because u and a change twice on the way down. */
export function resolveDescent(f, t) {
  const here = f.at(t);
  const tau = t - here.t0;
  const v = f.speed(t);
  const fallen = f.params.h - f.pos(t).y;
  const sPhase = fallen - here.fallen0;

  const sign = (x) => (x > EPS ? 'downwards' : x < -EPS ? 'upwards' : 'neither up nor down');

  return {
    t, vertical: true, after: false,
    vx: 0, vy: -v, speed: v,
    sx: 0, sy: -fallen, dist: fallen,
    height: f.pos(t).y,
    phase: here,
    velocity: {
      name: 'Velocity', hue: 'vel',
      x: null,
      y: {
        name: 'Speed downwards',
        formula: M`v = u + at`,
        sub: M`${sb(here.u)} + ${sb(here.a)} × ${d(tau)} = ${d(v)}`,
        // POSITIVE, because this card has said downwards is positive and the
        // substitution under it works in those signs. A headline of −19.43
        // over a line reading = 19.43 is the card disagreeing with itself.
        value: v, unit: 'm s⁻¹',
        note: here.a > EPS
          ? `gaining ${M`${d(here.a)} [m s^-1]`} each second — free fall`
          : here.a < -EPS
            ? `losing ${M`${d(-here.a)} [m s^-1]`} each second — the canopy`
            : 'constant — drag balances weight',
      },
      r: null,
      angle: 90, dir: 'downwards',
    },
    displacement: {
      name: 'Displacement', hue: 'disp',
      x: null,
      y: {
        name: 'Fallen in this phase',
        formula: M`s = ut + ½at^2`,
        sub: M`${sb(here.u)} × ${d(tau)} + ½ × ${sb(here.a)} × ${d(tau)}^2 = ${d(sPhase)}`,
        value: sPhase, unit: 'm',
        note: `${M`${d(fallen)} [m]`} fallen in all, so ${M`${d(f.pos(t).y)} [m]`} above the ground`,
      },
      r: null,
      angle: 90, dir: sign(sPhase),
    },
    // PROSE ONLY, no typeset maths: the card drops this into #res-note with
    // textContent, which is the right call there and would print the markup.
    convention: `Downwards is positive here, and the time is measured from the start `
      + `of this phase — ${here.name.toLowerCase()}, which began at ${d(here.t0)} s.`,
  };
}
