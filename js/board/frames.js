// frames.js — what goes inside the whiteboard's HTML frames.
//
// Strings only, so the notation sweep can read every one of them in node.
// Every quantity, unit and number is set through js/notation.js (CLAUDE.md
// rule 1); every word the model wrote is escaped, because it is somebody
// else's text going into innerHTML; and every value shown as an answer is a
// field the engine filled in (rule 4) — nothing here does arithmetic.

import { M, num } from '../notation.js';
import { esc, solutionHTML, proseHTML } from '../ai/readout.js';

const n2 = (x) => num(x, 2, { trim: true });

/* The boxes a board offers for each kind of motion, as the values screen
   does: the five, and whatever else that situation is decided by. `k` is
   where the value lives — the five are keyed as js/app.js keys them, with the
   acceleration under g. */
const LAUNCH = [
  { k: 'u', sym: M`u`, unit: M`[m s^-1]`, say: 'launch speed' },
  { k: 'theta', sym: M`theta`, unit: '°', say: 'angle above the horizontal' },
  { k: 'h', sym: M`h`, unit: M`[m]`, say: 'launch height' },
  { k: 's', sym: M`s`, unit: M`[m]`, say: 'horizontal distance to landing' },
  { k: 'v', sym: M`v`, unit: M`[m s^-1]`, say: 'speed on landing' },
  { k: 't', sym: M`t`, unit: M`[s]`, say: 'time of flight' },
  { k: 'g', sym: M`a`, unit: M`[m s^-2]`, say: 'gravity, downwards' },
];
const ROAD = [
  { k: 's', sym: M`s`, unit: M`[m]`, say: 'distance from A to B' },
  { k: 'u', sym: M`u`, unit: M`[m s^-1]`, say: 'speed at A' },
  { k: 'v', sym: M`v`, unit: M`[m s^-1]`, say: 'speed at B' },
  { k: 'g', sym: M`a`, unit: M`[m s^-2]`, say: 'acceleration, negative if braking' },
  { k: 't', sym: M`t`, unit: M`[s]`, say: 'time from A to B' },
];
const DESCENT = [
  { k: 'h', sym: M`h`, unit: M`[m]`, say: 'height of the jump' },
  { k: 'tOpen', sym: 'free fall', unit: M`[s]`, say: 'before the canopy opens' },
  { k: 'aChute', sym: 'canopy', unit: M`[m s^-2]`, say: 'how hard it slows once open' },
  { k: 'vTerm', sym: 'steady', unit: M`[m s^-1]`, say: 'speed under the canopy' },
  { k: 'g', sym: M`g`, unit: M`[m s^-2]`, say: 'gravity' },
];

/** Which boxes this object's board shows, and what is in each. */
export function fieldsFor(o) {
  const sc = o.scenario;
  if (!sc) return [];
  if (sc.road) return ROAD.map((f) => ({ ...f, value: o.given[f.k] }));
  if (sc.descent) {
    const d = { ...(o.reading?.descent || {}), ...(o.descentEdits || {}) };
    return DESCENT.map((f) => ({ ...f, value: f.k === 'h' ? o.h : f.k === 'g' ? o.given.g : d[f.k] }));
  }
  return LAUNCH
    .filter((f) => !(f.k === 'theta' && (sc.noAngle || sc.lockAngle || sc.aimAtTarget)))
    .filter((f) => !(f.k === 'u' && sc.noAngle))
    .map((f) => ({ ...f, value: f.k === 'theta' ? o.theta : f.k === 'h' ? o.h : o.given[f.k] }));
}

/** How a value came to be in its box: the reading tags it, an edit is yours. */
function howOf(o, k, edited) {
  if (edited) return 'yours';
  const it = o.reading?.items?.find((i) => i.k === k || (k === 'g' && i.k === 'a'));
  return it ? it.how : '';
}
const HOW = { given: 'given', worked: 'worked out', assumed: 'assumed', yours: 'changed' };

/** The sticky of given values. Every box can be changed, and the board re-solves. */
export function givenHTML(o, idx, edited = new Set()) {
  const rows = fieldsFor(o).map((f) => {
    const have = typeof f.value === 'number' && isFinite(f.value);
    const how = have ? howOf(o, f.k, edited.has(f.k)) : '';
    return `<label class="bd-in" title="${esc(f.say)}">
      <span class="bd-sym">${f.sym}</span>
      <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false"
             data-obj="${idx}" data-k="${f.k}" value="${have ? n2(f.value).replace('−', '-') : ''}"
             placeholder="?" aria-label="${esc(f.say)}">
      <span class="bd-unit">${f.unit}</span>
      <span class="bd-how" data-how="${how}">${HOW[how] || ''}</span>
    </label>`;
  }).join('');
  return `<p class="bd-say">${esc(o.reading?.summary || '')}</p>
    <div class="bd-ins">${rows}</div>
    <p class="bd-tip">Change any value, or fill in a blank — the board works it out again.</p>`;
}

/** The engine's answers, from fields it filled in. */
export function answersHTML(o) {
  const name = o.scenario ? `<p class="bd-kicker">${esc(o.scenario.name)}</p>` : '';
  const asks = o.reading?.asks?.length
    ? `<p class="bd-asks"><b>It asks for</b> ${o.reading.asks.map(esc).join(', ')}</p>` : '';
  if (!o.ok) {
    return `${name}<div class="bd-need"><b>Not enough to run it yet.</b> ${o.reason || ''}</div>${asks}`;
  }
  const f = o.traj, rows = [];
  const row = (label, maths) => rows.push(`<li><span>${label}</span><span>${maths}</span></li>`);
  if (o.scenario.road) {
    const p = f.params;
    row('Distance', M`s = ${n2(p.s)} [m]`);
    row('Speed at A', M`u = ${n2(p.u)} [m s^-1]`);
    row('Speed at B', M`v = ${n2(p.v)} [m s^-1]`);
    row('Acceleration', M`a = ${n2(p.a)} [m s^-2]`);
    row('Time', M`t = ${n2(p.t)} [s]`);
  } else if (o.scenario.descent) {
    row('Time to land', M`t = ${n2(f.tMax)} [s]`);
    if (typeof o.solved.vLanding === 'number') row('Landing speed', M`v = ${n2(o.solved.vLanding)} [m s^-1]`);
  } else if (o.verdict?.kind === 'caught') {
    // Caught, so it never landed: the flight ends at the catch.
    row('Caught after', M`t = ${n2(o.verdict.t)} [s]`);
    row('Greatest height', `${M`${n2(f.apexHeight)} [m]`} above the ground`);
  } else {
    if (isFinite(f.tFlight)) row('Time of flight', M`t = ${n2(f.tFlight)} [s]`);
    if (isFinite(f.range) && Math.abs(f.range) > 1e-6) row('Lands', `${M`${n2(f.range)} [m]`} from the launch`);
    row('Greatest height', `${M`${n2(f.apexHeight)} [m]`} above the ground`);
    if (typeof f.vLanding === 'number' && isFinite(f.vLanding)) row('Speed on landing', M`v = ${n2(f.vLanding)} [m s^-1]`);
  }
  if (o.above) {
    const L = M`${n2(o.above.line)} [m]`;
    row(`Above ${L}`, o.above.above > 1e-9 ? M`${n2(o.above.above)} [s]` : 'never');
  }
  if (o.verdict && o.verdict.kind !== 'caught') {
    const say = { caught: 'caught', high: 'passes above', low: 'passes below', short: 'falls short' }[o.verdict.kind];
    if (say) row('The banana', say);
  }
  const derived = o.solved?.derived?.length
    ? `<p class="bd-derived"><b>From what was given:</b> ${o.solved.derived.join('  ·  ')}</p>` : '';
  return `${name}<ul class="bd-results">${rows.join('')}</ul>${derived}${asks}`;
}

/** The engine's worked solution — js/working.js and friends, laid out. */
export function workingHTML(o) {
  if (!o.ok) return `<p class="bd-tip">The working appears once there is enough to solve it.</p>`;
  return solutionHTML(o.steps, { moment: o.solved?.moment });
}

/** A sticky note: the model's own words, escaped and tidied. */
export function noteHTML(text) { return proseHTML(text); }
