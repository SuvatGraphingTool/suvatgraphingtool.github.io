// models.js — one braking question asked under three models: a car at speed
// u sees a speed-limit sign a distance D ahead and brakes at a.
//
//   model 1 — brakes all the way to the sign;
//   model 2 — brakes down to the limit, then holds it to the sign;
//   model 3 — holds u for the reaction time, then does as model 2.
//
// Each is the library's journey in stages (js/core/journey.js); nothing here
// is new physics. What this file adds is what each model does when the
// numbers do not let it do what it says — it stops short of the sign, or
// reaches the sign still above the limit, or passes it before braking — said
// in those words and still drawn, rather than refusing all three.
//
// THE ENGINE CALCULATES (CLAUDE.md rule 4).

import { solveJourney } from './journey.js';
import { snap } from './numeric.js';
import { M, num } from '../notation.js';

const d = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const have = (x) => typeof x === 'number' && isFinite(x);

/** One model as a journey that ends at the sign (or where it stops). */
function lane(spec, say, note) {
  const r = solveJourney(spec);
  if (!r.ok) return null;
  const tEnd = r.f.tMax, xEnd = r.f.pos(tEnd).x;
  return { say, note, r, tSign: snap(tEnd), vSign: snap(r.f.vel(tEnd).x), xEnd: snap(xEnd),
    pos: (t) => r.f.pos(Math.min(t, tEnd)).x, vel: (t) => (t >= tEnd ? r.f.vel(tEnd).x : r.f.vel(t).x), acc: (t) => (t >= tEnd ? 0 : r.f.accel(t)) };
}

export function solveModels(k = {}) {
  const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
  for (const [key, name] of [['u', 'speed'], ['D', 'distance to the sign'], ['a', 'deceleration']]) if (!(k[key] > 0)) return fail(`Give the ${name} as a positive number.`);
  if (!(k.limit > 0) || !(k.limit < k.u)) return fail('The speed limit is below the speed it starts at, and above zero.');
  const react = have(k.react) ? k.react : 0;
  if (react < 0) return fail('The reaction time is a time after the sign is seen: give it as 0 or more.');
  const { u, D, a, limit } = k;
  // how far braking takes: to rest, and to the limit
  const toRest = u * u / (2 * a), toLimit = (u * u - limit * limit) / (2 * a), thinking = u * react;
  const models = [];
  // model 1: brakes all the way to the sign — or stops before it
  models.push(toRest < D - 1e-9
    ? lane({ u, stages: [{ kind: 'down', a, v: 0 }] }, 'slows all the way to the sign',
      `It stops after ${M`${d(snap(toRest))} [m]`}, ${M`${d(snap(D - toRest))} [m]`} short of the sign.`)
    : lane({ u, D, stages: [{ kind: 'down', a }] }, 'slows all the way to the sign', null));
  // model 2: to the limit, then holds it — or still above the limit at the sign
  models.push(toLimit > D + 1e-9
    ? lane({ u, D, stages: [{ kind: 'down', a }] }, 'slows to the limit, then holds it',
      `Braking from the moment it is seen, it is still above the limit when it reaches the sign: it needs ${M`${d(snap(toLimit))} [m]`} to slow to it.`)
    : lane({ u, D, stages: [{ kind: 'down', a, v: limit }, { kind: 'hold' }] }, 'slows to the limit, then holds it', null));
  // model 3: reacts first
  const say3 = react > 0 ? 'reacts, slows to the limit, holds it' : 'no reaction time: as model 2';
  if (thinking >= D - 1e-9) {
    models.push(lane({ u, D, stages: [{ kind: 'hold' }] }, say3, `It passes the sign during the reaction time: in ${M`${d(react)} [s]`} at ${M`${d(u)} [m s^-1]`} it covers ${M`${d(snap(thinking))} [m]`}.`));
  } else if (thinking + toLimit > D + 1e-9) {
    models.push(lane({ u, D, stages: [...(react > 0 ? [{ kind: 'hold', t: react }] : []), { kind: 'down', a }] }, say3,
      `${react > 0 ? 'After reacting it' : 'It'} is still above the limit when it reaches the sign: it needs ${M`${d(snap(thinking + toLimit))} [m]`} in all.`));
  } else {
    models.push(lane({ u, D, stages: [...(react > 0 ? [{ kind: 'hold', t: react }] : []), { kind: 'down', a, v: limit }, { kind: 'hold' }] }, say3, null));
  }
  if (models.some((m) => !m)) return fail('Those numbers do not fit one of the models.');
  const notes = models.map((m, i) => (m.note ? `Model ${i + 1}: ${m.note}${m.xEnd >= D - 1e-9 ? ` It reaches the sign at ${M`t = ${d(m.tSign)} [s]`}, at ${M`${d(m.vSign)} [m s^-1]`}.` : ''}`
    : `Model ${i + 1}, which ${m.say}, reaches the sign at ${M`t = ${d(m.tSign)} [s]`}, at ${M`${d(m.vSign)} [m s^-1]`}.`));
  const derived = models.map((m, i) => (m.note && m.xEnd < D - 1e-9 ? `model ${i + 1}: stops ${M`${d(snap(D - m.xEnd))} [m]`} short`
    : `model ${i + 1}: ${M`t = ${d(m.tSign)} [s]`}, ${M`${d(m.vSign)} [m s^-1]`}`));
  return { ok: true, models, D, u, limit, notes, derived };
}
