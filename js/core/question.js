// question.js — turns an extracted exam question into engine parameters.
//
// This sits between the AI and the physics and is deliberately dumb: it does
// arithmetic the model is not allowed to do, and it refuses rather than guesses.
// Nothing here calls a network; it is pure and fully testable without a key.
//
// The model's job ends at "here are the numbers printed on the page". Every
// derived quantity — resolving tan α = 3/4 into degrees, working back from a
// range to a launch speed — happens here, in code, with tests behind it.

const DEG = 180 / Math.PI;

// The road's travellers, as the keys of FIGURES in js/render/figures.js. The
// one the question names first wins ("a car … a motorcycle leaves later" is
// the car's question); a person is a runner only when nothing else is named.
const TRAVELLERS = [
  ['motorcycle', /\b(motor ?cycle|motorbike|motor bike|moped|scooter)s?\b/],
  ['cyclist', /\b(cyclist|bicycle|bike|cycling)s?\b/],
  ['train', /\b(train|locomotive|tram)s?\b/],
  ['runner', /\b(runner|running|sprinter|athlete|jogger)s?\b/],
  ['lorry', /\b(lorry|lorries|truck|van|bus)s?\b/],
  ['car', /\b(car)s?\b/],
];
const PEOPLE = /\b(girl|boy|man|woman|person|child|student)s?\b/;
/** The traveller a piece of text names first, or undefined. */
export function travellerIn(text) {
  const said = String(text || '').toLowerCase();
  let best, at = Infinity;
  for (const [k, re] of TRAVELLERS) {
    const m = re.exec(said);
    if (m && m.index < at) { best = k; at = m.index; }
  }
  return best || (PEOPLE.test(said) ? 'runner' : undefined);
}

/* ── Angles ──────────────────────────────────────────────────────────────
   Papers give angles as trig ratios far more often than as degrees:
   sin α = 3/5, cos α = 4/5, tan α = 3/4, tan α = 7/24. Accept either. */

export function resolveAngle(angle) {
  if (!angle) return { ok: false, error: 'No angle given.' };

  let deg;
  if (typeof angle.degrees === 'number') {
    deg = angle.degrees;
  } else if (angle.ratio) {
    const { fn, num, den } = angle.ratio;
    if (!den) return { ok: false, error: 'Ratio has no denominator.' };
    const r = num / den;
    if (fn === 'tan') deg = Math.atan(r) * DEG;
    else if (fn === 'sin') {
      if (Math.abs(r) > 1) return { ok: false, error: `sin θ = ${num}/${den} is impossible — it must be between −1 and 1.` };
      deg = Math.asin(r) * DEG;
    } else if (fn === 'cos') {
      if (Math.abs(r) > 1) return { ok: false, error: `cos θ = ${num}/${den} is impossible — it must be between −1 and 1.` };
      deg = Math.acos(r) * DEG;
    } else return { ok: false, error: `Unknown ratio "${fn}".` };
  } else {
    return { ok: false, error: 'Angle is neither degrees nor a ratio.' };
  }

  if (angle.belowHorizontal) deg = -Math.abs(deg);
  if (!isFinite(deg)) return { ok: false, error: 'Angle did not resolve to a number.' };
  return { ok: true, degrees: deg };
}

/* ── Working backwards ───────────────────────────────────────────────────
   "A ball is projected from a 25 m cliff at 45° and lands 100 m away.
    Show that U = 28."  This exact shape is the single most common question
   in the sample, so it is worth solving properly rather than asking the
   student to guess the speed with a slider.

     R = u cosθ · t          and         0 = h + u sinθ · t − ½g t²
     eliminate t  →  u² = gR² / (2cos²θ (h + R tanθ))                      */

export function speedFromRange(R, thetaDeg, h, g) {
  const th = thetaDeg / DEG;
  const c = Math.cos(th);
  if (Math.abs(c) < 1e-9) return { ok: false, error: 'A vertical launch has no horizontal range.' };
  const denom = 2 * c * c * (h + R * Math.tan(th));
  if (denom <= 0) return { ok: false, error: 'No launch speed fits that range, angle and height.' };
  const u = R * Math.sqrt(g / denom);
  if (!isFinite(u) || u <= 0) return { ok: false, error: 'Launch speed did not resolve.' };
  return { ok: true, u };
}

/** Launch speed from the greatest height reached above the launch point. */
export function speedFromApex(riseAboveLaunch, thetaDeg, g) {
  const s = Math.sin(thetaDeg / DEG);
  if (Math.abs(s) < 1e-9) return { ok: false, error: 'A horizontal launch never rises.' };
  if (riseAboveLaunch < 0) return { ok: false, error: 'Rise above the launch point cannot be negative.' };
  return { ok: true, u: Math.sqrt(2 * g * riseAboveLaunch) / Math.abs(s) };
}

/* ── Extraction → engine ─────────────────────────────────────────────── */

// 9.81, the same number every scenario seeds and the same one GRAVITY offers
// for Earth. A paper that states its own value still wins — see toEngine —
// and plenty state 10; this is only what to assume when a question says
// nothing at all, and assuming a different number from the rest of the app
// meant a photographed question and a typed one could disagree.
const DEFAULT_G = 9.81;

/**
 * @param {Object} x  the extraction object (see worker/src/schema.js)
 * @returns {{ok, params?, markers?, missing?, derived?, notes?, error?}}
 *   params   { u, theta, h, g }  ready for flight()
 *   derived  anything this module worked out rather than read off the page —
 *            surfaced so the confirm screen can show it was calculated
 *   missing  fields the student still has to supply
 */
export function toEngine(x) {
  if (!x || typeof x !== 'object') return { ok: false, error: 'No question data.' };
  if (x.understood === false) {
    return { ok: false, error: x.note || 'Could not read a projectile question from that image.' };
  }

  const g = typeof x.g === 'number' && x.g > 0 ? x.g : DEFAULT_G;
  const notes = [];
  const derived = [];
  const missing = [];

  // Height. Absent means ground level, which is a real answer, not a gap.
  const h = typeof x.h === 'number' ? x.h : 0;

  // Angle.
  let theta = null;
  if (x.scenario === 'dropped') {
    theta = 0;
    notes.push('Dropped from rest, so there is no launch angle.');
  } else if (x.scenario === 'thrown_up') {
    theta = 90;
  } else if (x.scenario === 'thrown_down') {
    theta = -90;
  } else if (x.scenario === 'horizontal') {
    theta = 0;
  } else if (x.angle) {
    const a = resolveAngle(x.angle);
    if (!a.ok) return { ok: false, error: a.error };
    theta = a.degrees;
    if (x.angle.ratio) {
      const { fn, num, den } = x.angle.ratio;
      derived.push(`${fn} θ = ${num}/${den} → θ = ${theta.toFixed(2)}°`);
    }
  } else {
    missing.push('angle');
  }

  // Speed — given, or worked back from a range or an apex height.
  let u = typeof x.u === 'number' ? x.u : null;

  if (u === null && theta !== null) {
    if (typeof x.range === 'number') {
      const r = speedFromRange(x.range, theta, h, g);
      if (r.ok) {
        u = r.u;
        derived.push(`u from range ${x.range} m at ${theta.toFixed(2)}° from ${h} m → u = ${u.toFixed(2)} m s⁻¹`);
      } else notes.push(r.error);
    } else if (typeof x.apexAboveLaunch === 'number') {
      const r = speedFromApex(x.apexAboveLaunch, theta, g);
      if (r.ok) {
        u = r.u;
        derived.push(`u from a rise of ${x.apexAboveLaunch} m → u = ${u.toFixed(2)} m s⁻¹`);
      } else notes.push(r.error);
    }
  }

  if (x.scenario === 'dropped') u = 0;
  if (u === null) missing.push('launch speed');

  if (missing.length) {
    return {
      ok: false, needsInput: true, missing, notes, derived,
      partial: { u, theta, h, g },
      error: `Still need: ${missing.join(' and ')}.`,
    };
  }

  return {
    ok: true,
    params: { u, theta, h, g },
    markers: normaliseMarkers(x.markers),
    asks: Array.isArray(x.asks) ? x.asks : [],
    derived, notes,
    summary: x.summary || null,
  };
}

/** Obstacles, targets and height lines the scene should draw. */
function normaliseMarkers(m) {
  if (!m || typeof m !== 'object') return {};
  const out = {};
  if (typeof m.obstacleDistance === 'number') {
    out.obstacle = { x: m.obstacleDistance, height: typeof m.obstacleHeight === 'number' ? m.obstacleHeight : 0 };
  }
  if (typeof m.targetDistance === 'number') {
    out.target = { x: m.targetDistance, y: typeof m.targetHeight === 'number' ? m.targetHeight : 0 };
  }
  if (typeof m.heightLine === 'number') out.heightLine = m.heightLine;
  return out;
}

/* ── Extraction → the app's own screens ─────────────────────────────────
   toEngine above answers "what flight is this?" in one go. toApp answers a
   different question: "what would a student have picked, and what would they
   have typed?" — the scenario by its id in js/scenarios.js, and the values
   that go in its boxes. Nothing here finishes the motion. Whatever the
   question leaves out is left out, and js/core/solve.js finds it from what
   is there, exactly as it does for a student typing; that is CLAUDE.md rule 4.

   Every value comes back tagged with where it came from:
     given    in the question
     worked   worked out here, from something that was (a ratio, a rise)
     assumed  the question said nothing, and this is what nothing means      */

// Where each scenario starts, and what it fixes. Kept beside the ids the
// Worker's schema offers (worker/src/schema.js) — the test checks they agree
// with js/scenarios.js.
const GROUNDED = new Set(['up', 'arc', 'time-above']);
const LOCKED_THETA = { up: 90, down: -90, platform: 0, bullet: 0 };
const ONE_D = new Set(['up', 'down', 'dropped', 'parachute']);
export const APP_SCENARIOS = ['up', 'arc', 'dropped', 'down', 'platform-down', 'platform',
  'platform-angle', 'time-above', 'parachute', 'bullet', 'monkey', 'road'];

const isNum = (x) => typeof x === 'number' && isFinite(x);

/**
 * @param {Object} x  the extraction (see worker/src/schema.js)
 * @returns {{ok:true, id, given, theta, h, markers, descent, items, asks, summary, confidence, notes}
 *          |{ok:false, error}}
 *   given   the five boxes, keyed as js/app.js keys them: s u v g t
 *   items   [{ k, value, how: 'given'|'worked'|'assumed', ratio? }] for the readout
 */
export function toApp(x) {
  if (!x || typeof x !== 'object') return { ok: false, error: 'Nothing came back from the reader.' };
  if (x.understood === false) {
    // Not a question — often just "hello". The reader's note is its answer,
    // said to the student, so it is a reply rather than an error.
    return x.note
      ? { ok: false, error: x.note, chat: true }
      : { ok: false, error: 'That did not read as a projectile or falling-object question.' };
  }
  let id = x.scenario;
  // A vertical throw with a line to stay above is Time above a line at 90°,
  // whichever card the reader reached for: only that one draws the line.
  const upLine = id === 'up' && isNum(x.heightLine);
  if (upLine) id = 'time-above';
  if (!APP_SCENARIOS.includes(id)) {
    return { ok: false, error: 'That is a motion question, but not one of the situations this playground can set up yet. Pick the closest scenario and type the numbers in.' };
  }

  // The Worker sends the angle and the target flat (see worker/src/schema.js
  // for why); the older nested shape is still accepted.
  if (!x.angle && (isNum(x.angleDegrees) || x.ratioFn)) {
    x = { ...x, angle: x.ratioFn && isNum(x.ratioNum) && isNum(x.ratioDen)
      ? { ratio: { fn: x.ratioFn, num: x.ratioNum, den: x.ratioDen }, belowHorizontal: !!x.belowHorizontal }
      : { degrees: x.angleDegrees, belowHorizontal: !!x.belowHorizontal } };
  }
  if (!x.target && isNum(x.targetX) && isNum(x.targetY)) x = { ...x, target: { x: x.targetX, y: x.targetY } };

  const items = [];
  const notes = [];
  const given = {};
  const put = (k, value, how, extra) => items.push({ k, value, how, ...extra });

  // ALONG A ROAD there is no gravity, no height and no angle: the five are
  // the five, a is the vehicle's own (negative is braking), and "from rest"
  // and "comes to rest" are real zeros. The a box is keyed g in js/app.js,
  // as it is for every scenario.
  if (id === 'road') {
    for (const k of ['s', 'u', 'v', 't']) {
      if (isNum(x[k]) && !(k === 't' && x[k] <= 0)) { given[k] = x[k]; put(k, x[k], 'given'); }
    }
    if (isNum(x.a)) { given.g = x.a; put('a', x.a, 'given'); }
    let mark;
    if (x.atMidpoint === true) { mark = 'mid'; put('mark', null, 'given', { mid: true }); }
    else if (isNum(x.atDisplacement)) { mark = x.atDisplacement; put('mark', mark, 'given'); }
    // What is moving, so the stage can draw it: the reader's own word for it,
    // or the first traveller its summary names. Lorry when it names none.
    const who = travellerIn(`${typeof x.object === 'string' ? x.object : ''} ${typeof x.summary === 'string' ? x.summary : ''}`);
    return {
      ok: true, id, given, theta: undefined, h: undefined, markers: {}, descent: {}, mark, who, items, notes,
      asks: Array.isArray(x.asks) ? x.asks.filter((q) => typeof q === 'string').slice(0, 6) : [],
      summary: typeof x.summary === 'string' ? x.summary : '',
      confidence: ['high', 'medium', 'low'].includes(x.confidence) ? x.confidence : 'medium',
    };
  }

  // g — stated, or the 9.81 every scenario seeds.
  if (isNum(x.g) && x.g > 0) { given.g = x.g; put('g', x.g, 'given'); }
  else { given.g = DEFAULT_G; put('g', DEFAULT_G, 'assumed'); }

  // h — measured from the ground. The ground scenarios start on it.
  let h;
  if (isNum(x.h)) { h = x.h; put('h', h, 'given'); }
  else if (GROUNDED.has(id)) { h = 0; put('h', 0, 'assumed'); }

  // θ — fixed by the scenario, given, or worked from a ratio.
  let theta;
  if (id === 'dropped' || id === 'parachute') theta = undefined;
  else if (id in LOCKED_THETA) theta = LOCKED_THETA[id];
  else if (upLine) { theta = 90; put('theta', 90, 'given', { vertical: true }); }
  else if (x.angle) {
    const a = resolveAngle(x.angle);
    if (!a.ok) return { ok: false, error: a.error };
    theta = a.degrees;
    // The card says which way it is aimed, so a sign the reader lost is
    // restored by the scenario it chose.
    if (id === 'platform-down') theta = -Math.abs(theta);
    if (x.angle.ratio) put('theta', theta, 'worked', { ratio: { ...x.angle.ratio } });
    else put('theta', theta, 'given', theta === 90 && id === 'time-above' ? { vertical: true } : {});
  }

  // The five.
  // A launch speed of nothing is a drop, and a drop has its own card. On any
  // other card a zero is the reader filling a gap, not reading a number.
  if (id === 'dropped') given.u = 0;
  else if (isNum(x.u) && x.u > 0) { given.u = x.u; put('u', x.u, 'given'); }
  // A landing speed the reader could not have read: nothing lands at rest,
  // and nothing launched from above the ground lands at the speed it left.
  // Readers invent both, so both are dropped rather than handed to the engine.
  const vOk = isNum(x.v) && Math.abs(x.v) >= 0.5 && !(x.v === x.u && (h ?? 0) > 0);
  if (vOk && id !== 'parachute') { given.v = Math.abs(x.v); put('v', given.v, 'given'); }
  if (isNum(x.t) && x.t > 0 && id !== 'parachute') { given.t = x.t; put('t', x.t, 'given'); }
  // s is the horizontal distance to the landing. In a straight line there
  // is none, and a height the reader put there is already in h.
  if (isNum(x.s) && !ONE_D.has(id)) { given.s = x.s; put('s', x.s, 'given'); }

  // A speed worked back from a greatest height, when the speed is not given.
  if (given.u === undefined && isNum(x.apexAboveLaunch)) {
    const th = theta ?? 90;
    const r = speedFromApex(x.apexAboveLaunch, th, given.g);
    if (r.ok) {
      given.u = r.u;
      put('u', r.u, 'worked', { rise: x.apexAboveLaunch });
    } else notes.push(r.error);
  }

  // What only some scenarios carry.
  const markers = {};
  if (id === 'time-above' && isNum(x.heightLine)) {
    markers.heightLine = x.heightLine;
    put('line', x.heightLine, 'given');
  }
  if (id === 'monkey' && x.target && isNum(x.target.x) && isNum(x.target.y)) {
    markers.target = { x: x.target.x, y: x.target.y };
  }
  const descent = {};
  if (id === 'parachute') {
    // A reader that missed the descent fields usually put the free-fall time
    // in t and the steady speed in v, which is what they are.
    const d = { tOpen: x.t, vTerm: x.v, ...(x.descent || {}) };
    for (const k of ['tOpen', 'aChute', 'vTerm']) if (isNum(x[k])) d[k] = x[k];
    for (const k of ['tOpen', 'aChute', 'vTerm']) {
      if (isNum(d[k]) && d[k] !== 0) { descent[k] = Math.abs(d[k]); put(k, descent[k], 'given'); }
    }
  }

  return {
    ok: true, id, given, theta, h, markers, descent, items, notes,
    asks: Array.isArray(x.asks) ? x.asks.filter((a) => typeof a === 'string').slice(0, 6) : [],
    summary: typeof x.summary === 'string' ? x.summary : '',
    confidence: ['high', 'medium', 'low'].includes(x.confidence) ? x.confidence : 'medium',
  };
}
