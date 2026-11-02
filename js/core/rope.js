// rope.js — a sledge (or box) pulled along rough ground, or up a rough slope,
// by a rope at an angle to the surface; then the rope is let go and friction
// (and on a slope the weight's component) brings it to rest. (Edexcel 6677 M1
// Nov 2004 Q7.)
//
// SUVAT with the one-step links the build rules allow: across the surface
// nothing moves, so R + T sin θ = m g cos α; the friction is μR; along the
// surface T cos θ − m g sin α − μR = ma. Let go, R = m g cos α and the
// deceleration is g(sin α + μ cos α); SUVAT takes it to rest
// (design/library/build-rules.md).
//
// CONVENTION. Along the surface, in the direction it is pulled, positive; α
// the surface's angle to the horizontal (0 on level ground); θ the rope's
// angle above the surface. Drawn from rest: the paper gives the speed it is
// let go at, not where it started, so the pull is drawn from rest to that speed.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const have = (x) => typeof x === 'number' && isFinite(x);
const d = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const sb = (x) => (x < 0 ? `(${d(x)})` : d(x));
const D2R = Math.PI / 180;

/**
 * @param k { m, mu, alpha | tanA, theta, T, a, v, g }
 *   m  its mass (kg);  mu  the coefficient of friction
 *   alpha  the surface's angle (°), 0 for level ground;  theta  the rope's angle above the surface (°)
 *   T  the tension (N) — or a, the acceleration while pulled
 *   v  its speed when the rope is let go (m s⁻¹)
 */
export function solveRope(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  const g = have(k.g) ? k.g : 9.8;
  if (!(g > 0)) return fail('g is the size of the acceleration due to gravity: a positive number.');
  if (!have(k.m)) return fail('Still needed: its mass.');
  if (!(k.m > 0)) return fail('The mass is a positive number of kilograms.');
  if (!have(k.mu)) return fail('Still needed: the coefficient of friction.');
  if (!(k.mu >= 0)) return fail('A coefficient of friction is 0 or more.');
  if (have(k.alpha) && have(k.tanA)) return fail('Give the slope’s angle or its tangent, not both.');
  if (have(k.tanA) && !(k.tanA >= 0)) return fail('The slope’s tangent is 0 or more.');
  // a slope given as tan α (as the papers often give it) is the same angle
  const alpha = have(k.alpha) ? k.alpha : have(k.tanA) ? Math.atan(k.tanA) / D2R : 0, theta = have(k.theta) ? k.theta : 0;
  if (!(alpha >= 0 && alpha < 90)) return fail('The surface’s angle is 0 (level) or more, below 90°.');
  if (!(theta >= 0 && theta < 90)) return fail('The rope’s angle above the surface is 0 or more, below 90°.');
  if (have(k.T) === have(k.a)) return fail(have(k.T) ? 'Give the tension or the acceleration, not both: one fixes the other.' : 'Still needed: the tension in the rope, or its acceleration while it is pulled.');
  // its speed when the rope is let go: without one, only the pull is shown (for the stage's own few seconds)
  if (have(k.v) && !(k.v > 0)) return fail('Its speed when the rope is let go is a positive number.');
  const { m, mu } = k, letGo = have(k.v), sa = Math.sin(alpha * D2R), ca = Math.cos(alpha * D2R), st = Math.sin(theta * D2R), ct = Math.cos(theta * D2R);
  const W = snap(m * g), Wd = snap(m * g * sa), Wn = snap(m * g * ca);
  const pull = [], free = [];
  const lvl = alpha === 0, slant = theta !== 0;

  // ── a slope given by its tangent: the sine and cosine the working uses, from it
  if (have(k.tanA) && k.tanA > 0) {
    const hyp = Math.hypot(1, k.tanA);
    pull.push({ f: M`tan alpha = ${d(k.tanA)}`, s: M`sin alpha = ${d(snap(k.tanA / hyp))}, cos alpha = ${d(snap(1 / hyp))}`, r: M`alpha = ${d(snap(alpha))}°` });
  }
  // ── while it is pulled: across the surface, then along it
  let T, a, R;
  if (have(k.T)) {
    T = k.T; if (!(T > 0)) return fail('The tension is a positive number of newtons.');
    R = snap(Wn - T * st); if (Math.abs(R) < 1e-9) R = 0;
    if (R < 0) return fail(`Pulling at ${M`${d(theta)}°`} with ${M`${d(T)} [N]`} would lift it off the ${lvl ? 'ground' : 'slope'}: the rope’s pull across the surface is more than the weight’s.`);
    a = snap((T * ct - Wd - mu * R) / m);
    if (!(a > 0)) return fail(lvl ? `Pulled with ${M`${d(T)} [N]`} it does not speed up: friction is at least as big as the pull along the ground. Give a bigger tension.`
      : `Pulled with ${M`${d(T)} [N]`} it is not pulled up the slope: the weight’s component${mu > 0 ? ' and friction are' : ' is'} at least as big as the pull along it. Give a bigger tension.`);
  } else {
    a = k.a; if (!(a > 0)) return fail('Pulled from rest it speeds up: the acceleration is a positive number.');
    T = snap((m * a + Wd + mu * Wn) / (ct + mu * st));
    R = snap(Wn - T * st);
    if (R < 0) return fail('That acceleration needs a pull so hard along that rope it would lift it off the surface.');
  }
  const F = snap(mu * R);
  pull.push(slant
    ? { f: lvl ? M`R + T sin theta = m g` : M`R + T sin theta = m g cos alpha`, s: lvl ? M`R + ${have(k.T) ? d(T) : 'T'} sin ${d(theta)}° = ${d(m)} * ${d(g)}` : M`R + ${have(k.T) ? d(T) : 'T'} sin ${d(theta)}° = ${d(m)} * ${d(g)} cos ${d(alpha)}°`, r: have(k.T) ? M`R = ${d(R)} [N]` : M`R = ${d(Wn)} - T sin ${d(theta)}°` }
    : { f: lvl ? M`R = m g` : M`R = m g cos alpha`, s: lvl ? M`R = ${d(m)} * ${d(g)}` : M`R = ${d(m)} * ${d(g)} cos ${d(alpha)}°`, r: M`R = ${d(R)} [N]` });
  if (have(k.T)) {
    if (mu > 0) pull.push({ f: M`F = mu R`, s: M`F = ${d(mu)} * ${d(R)}`, r: M`F = ${d(F)} [N]` });
    const lhs = `${slant ? `${d(T)} cos ${d(theta)}°` : d(T)}${lvl ? '' : ` - ${d(m)} * ${d(g)} sin ${d(alpha)}°`}${mu > 0 ? ` - ${d(F)}` : ''}`;
    pull.push({ f: M`${slant ? 'T cos theta' : 'T'}${lvl ? '' : ' - m g sin alpha'}${mu > 0 ? ' - F' : ''} = ma`, s: M`${lhs} = ${d(m)}a`, r: M`a = ${d(a)} [m s^-2]` });
  } else {
    pull.push({ f: M`${slant ? 'T cos theta' : 'T'}${lvl ? '' : ' - m g sin alpha'}${mu > 0 ? ' - mu R' : ''} = ma`,
      s: M`T${slant ? ` cos ${d(theta)}°` : ''}${lvl ? '' : ` - ${d(m)} * ${d(g)} sin ${d(alpha)}°`}${mu > 0 ? ` - ${d(mu)}(${slant ? `${d(Wn)} - T sin ${d(theta)}°` : d(R)})` : ''} = ${d(m)} * ${d(a)}`, r: M`T = ${d(T)} [N]` });
    if (slant) pull.push({ f: M`R = m g${lvl ? '' : ' cos alpha'} - T sin theta`, s: M`R = ${d(Wn)} - ${d(T)} sin ${d(theta)}°`, r: M`R = ${d(R)} [N]` });
  }
  // with no release speed, the stage shows the pull for its own few seconds (the paper gives no time)
  const SHOW = 3, v = letGo ? k.v : snap(a * SHOW);
  const t1 = snap(v / a), s1 = snap((v * v) / (2 * a));
  if (letGo) pull.push({ f: M`v = u + at`, s: M`${d(v)} = 0 + ${d(a)}t`, r: M`t = ${d(t1)} [s] "from rest"` });

  // ── let go: friction (and the weight's component) against it, to rest
  const R2 = Wn, a2 = snap(-g * (sa + mu * ca)), F2 = snap(mu * R2);
  if (letGo && !(a2 < 0)) return fail('Let go on level ground with no friction it would never stop: give a coefficient of friction.');
  const s2 = letGo ? snap((v * v) / (-2 * a2)) : 0, t2 = letGo ? snap(v / -a2) : 0;
  const along = lvl ? '' : '-m g sin alpha ', alongS = lvl ? '' : `-${d(m)} * ${d(g)} sin ${d(alpha)}° `;
  if (letGo) {
    free.push({ f: lvl ? M`R = m g` : M`R = m g cos alpha`, s: lvl ? M`R = ${d(m)} * ${d(g)}` : M`R = ${d(m)} * ${d(g)} cos ${d(alpha)}°`, r: M`R = ${d(R2)} [N]` });
    // with no friction (μ = 0) there is no μR term
    free.push(mu > 0 ? { f: M`${along}- mu R = ma`, s: M`${alongS}- ${d(mu)} * ${d(R2)} = ${d(m)}a`, r: M`a = ${d(a2)} [m s^-2]` }
      : { f: M`-m g sin alpha = ma`, s: M`${alongS}= ${d(m)}a`, r: M`a = ${d(a2)} [m s^-2]` });
    free.push({ f: M`v^2 = u^2 + 2as`, s: M`0 = ${d(v)}^2 + 2 * ${sb(a2)}s`, r: M`s = ${d(s2)} [m]` });
    free.push({ f: M`v = u + at`, s: M`0 = ${d(v)} + ${sb(a2)}t`, r: M`t = ${d(t2)} [s]` });
  }
  // on a slope, at rest: does it stay, or slide back? (asked even with no release speed)
  const stays = lvl || mu >= sa / ca - 1e-12;
  const aBack = stays ? null : snap(-g * (sa - mu * ca));
  if (!lvl) free.push({ f: M`mu >= tan alpha "to stay"`, s: M`${d(mu)} ${stays ? '>=' : '<'} tan ${d(alpha)}° = ${d(snap(sa / ca))}`, r: stays ? 'it stays at rest' : 'it slides back down' });
  // the acceleration back down, a size down the slope (up the slope is positive)
  if (!stays) free.push({ f: mu > 0 ? M`mu R - m g sin alpha = ma` : M`-m g sin alpha = ma`, s: mu > 0 ? M`${d(mu)} * ${d(R2)} - ${d(m)} * ${d(g)} sin ${d(alpha)}° = ${d(m)}a` : M`-${d(m)} * ${d(g)} sin ${d(alpha)}° = ${d(m)}a`, r: M`a = ${d(aBack)} [m s^-2]` });

  // sliding back is shown for a while — never past where it started; with no release, the pull alone
  const tRel = letGo ? t1 : snap(SHOW + 1), tRest = letGo ? snap(t1 + t2) : tRel;
  const tBack = !letGo || stays ? 0 : Math.min(Math.max(1, t2), Math.sqrt((2 * (s1 + s2)) / -aBack));
  const tMax = letGo ? snap(tRest + (stays ? Math.max(0.8, tRest * 0.12) : tBack)) : SHOW;
  const pos = (t) => {
    const c = Math.min(Math.max(t, 0), tMax);
    if (c <= tRel) return 0.5 * a * c * c;
    if (c <= tRest) { const u = c - tRel; return s1 + v * u + 0.5 * a2 * u * u; }
    if (stays) return s1 + s2;
    const u = c - tRest; return s1 + s2 + 0.5 * aBack * u * u;
  };
  const vel = (t) => { const c = Math.min(Math.max(t, 0), tMax); return c <= tRel ? a * c : c <= tRest ? v + a2 * (c - tRel) : stays ? 0 : aBack * (c - tRest); };
  const acc = (t) => (t < tRel ? a : t < tRest ? a2 : stays ? 0 : aBack);
  const phase = (t) => (t < tRel ? 'pull' : t < tRest ? 'free' : stays ? 'rest' : 'back');
  // the forces on it at each moment, along the way it is pulled +: the tension (while pulled),
  // the normal reaction, and friction — against the sliding, or at rest on a slope just what
  // holds it (static friction, m g sin α up the slope); on level ground at rest, none
  const Frest = lvl ? 0 : snap(m * g * sa);
  const forces = (t) => {
    const p = phase(t);
    if (p === 'pull') return { T, R, F: -F, phase: p };
    if (p === 'free') return { T: null, R: R2, F: -F2, phase: p };
    if (p === 'rest') return { T: null, R: R2, F: Frest, phase: p, holding: !lvl };
    return { T: null, R: R2, F: F2, phase: p };
  };

  // what slows it once let go, and what it pulls against, in words that fit the case
  const against = [mu > 0 ? 'friction' : null, lvl ? null : 'the weight’s component'].filter(Boolean);
  const notes = [
    `Pulled, ${slant ? (R === 0 ? `the rope is on the point of lifting it off the ${lvl ? 'ground' : 'slope'}; ` : `the rope lifts a little, so the ${lvl ? 'ground' : 'slope'} pushes back with only ${M`${d(R)} [N]`}; `) : ''}the pull along the surface${against.length ? ` beats ${against.join(' and ')}` : ''}: it speeds up at ${M`${d(a)} [m s^-2]`}${have(k.a) ? `, which needs a tension of ${M`${d(T)} [N]`}` : ''}.`,
    letGo ? `Let go at ${M`${d(v)} [m s^-1]`}, ${against.length ? `${against.join(' and ')} ${against.length > 1 ? 'slow' : 'slows'} it` : 'nothing slows it'}, at ${M`${d(-a2)} [m s^-2]`}: it slides ${M`${d(s2)} [m]`} more, for ${M`${d(t2)} [s]`}.`
      : `No speed is given for letting go: the stage shows the pull for its first ${SHOW} s from rest.`,
  ];
  if (!lvl) notes.push(stays ? `At rest, ${M`mu = ${d(mu)}`} is at least ${M`tan ${d(alpha)}° = ${d(snap(sa / ca))}`}: friction holds it there.` : `${letGo ? 'At rest' : 'If it comes to rest'}, ${M`mu = ${d(mu)}`} is less than ${M`tan ${d(alpha)}° = ${d(snap(sa / ca))}`}: it slides back down, at ${M`${d(-aBack)} [m s^-2]`} down the slope.`);
  // what it found, not what was given
  const derived = [`${M`R = ${d(R)} [N]`}`, have(k.a) ? `${M`T = ${d(T)} [N]`}` : `${M`a = ${d(a)} [m s^-2]`}`, ...(letGo ? [`${M`${d(s2)} [m]`} after it is let go`] : []), ...(aBack != null ? [`back down at ${M`${d(-aBack)} [m s^-2]`}`] : [])];

  const f = { kind: 'rope', look: lvl ? 'level' : 'slope', m, mu, alpha, tanA: have(k.tanA) ? k.tanA : null, theta, g, T, a, R, F, a2, R2, v, s1, s2, t1, t2, tRel, tRest, tMax, tFlight: tMax, stays, aBack, W, Wd, Wn,
    letGo, pos, vel, acc, phase, forces, tMid: snap(Math.min(tRel, tMax) / 2), tSlide: snap((tRel + tRest) / 2), params: { u: 0, theta: 0, h: 0, g } };
  return { ok: true, mode: 'rope', T, a, R, F, a2, s2, t2, aBack, backDown: aBack != null ? snap(-aBack) : null, stays, letGo, pull, free, rows: [...pull, ...free], notes, derived, f };
}

/** The working: pulled, then let go — as the paper goes. */
export function ropeWorking(s) {
  if (!s?.ok) return [];
  return [
    { title: 'Pulled by the rope', rows: s.pull, note: `Along the surface, the way it is pulled, is positive. Across it nothing moves${s.f.theta ? ', and the rope’s pull has a part across it too' : ''}. The time from rest is the stage’s: the paper gives only the speed when it is let go.` },
    ...(s.free.length ? [{ title: s.letGo ? 'Let go: to rest' : 'If it comes to rest', rows: s.free, note: !s.letGo ? 'At rest on the slope, does friction hold it? If not, it slides back with friction now up the slope.' : s.f.mu === 0 ? 'With the rope gone nothing pulls it on, and the slope has no friction: only the weight’s component acts along it.' : s.f.theta ? 'With the rope gone the normal reaction goes back to the whole of the weight’s part across the surface, and friction is against the motion.' : 'With the rope gone friction is still against the motion, and now nothing pulls it on.' }] : []),
  ];
}
