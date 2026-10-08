// app.js — three screens, in order: scenario, values, flight.
//
// The whole app is SUVAT. Screen two asks for the five quantities and nothing
// else beyond what the chosen situation genuinely needs. Launch stays disabled
// until the engine can actually determine the motion, and says why not.

import { solveLaunch } from './core/solve.js';
import { trajectory } from './core/trajectory.js';
import { flight, timeAbove, heightForTime } from './core/projectile.js';
import { intercept, corners } from './core/intercept.js';
import { SCENARIOS, GROUPS, GRAVITY, byId } from './scenarios.js';
import { buildWorking, obstacleCheck, resolveAt } from './working.js';
import * as scene from './render/scene.js';
import * as exhibit from './render/exhibit.js';
import { siteFor } from './world/world.js';
import { dropToneCache } from './render/world2d.js';
import { drawGraph, graphSpecs } from './render/graphs.js';
import { fmt, palette, clamp } from './render/util.js';
import { M, num } from './notation.js';

const $ = (id) => document.getElementById(id);

/**
 * A number the way a student writes one.
 *
 * Papers give heights as fractions at least as often as decimals, and a box
 * that only takes 3.5 makes someone convert 7/2 by hand before they can ask
 * the question. Both are accepted, and so is a typed minus sign, because that
 * is the character this site prints everywhere and it is the one people copy.
 *
 * Returns undefined for empty, NaN for something that is not a number — the
 * caller needs to tell "cleared" from "mistyped".
 */
function parseValue(raw) {
  const s = String(raw ?? '').trim().replace(/[\u2212\u2013\u2014]/g, '-');
  if (!s) return undefined;
  const frac = s.match(/^([+-]?\d*\.?\d+)\s*\/\s*([+-]?\d*\.?\d+)$/);
  if (frac) {
    const b = parseFloat(frac[2]);
    return b === 0 ? NaN : parseFloat(frac[1]) / b;
  }
  return /^[+-]?\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN;
}

/* The five. Everything else is scenario-specific and shown only when needed. */
const SUVAT = [
  { k: 's', sym: 's', name: 'displacement',     unit: 'm' },
  { k: 'u', sym: 'u', name: 'initial velocity', unit: 'm s⁻¹' },
  { k: 'v', sym: 'v', name: 'final velocity',   unit: 'm s⁻¹' },
  { k: 'g', sym: 'a', name: 'acceleration',     unit: 'm s⁻²' },
  { k: 't', sym: 't', name: 'time',             unit: 's' },
];

const SHOWS = [
  { key: 'components',   label: 'Velocity components' },
  { key: 'ticks',        label: 'Equal time steps' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'apex',         label: 'Greatest height' },
  { key: 'range',        label: 'Horizontal displacement' },
  { key: 'grid',         label: 'Metre grid' },
  { key: 'ruler',        label: 'Height ruler' },
];
const EXTRAS = [
  { key: 'graphs',  label: 'Graphs against time' },
  { key: 'working', label: 'The working' },
  { key: 'energy',  label: 'Energy and momentum' },
];

const state = {
  step: 'scenario', id: null,
  given: {}, mass: 1,
  bounce: false, restitution: 0.7,
  t: 0, playing: false, launched: false, firedBefore: false,
  rate: 1,
  show: { path: true, velocity: true, apex: true, range: true, grid: false, ruler: true,
          components: false, ticks: false, acceleration: false },
  extras: { graphs: false, working: false, energy: false },
  options: false,
  resolve: false, hover: null, hoverMark: null,
  overview: false,
  aimed: true,                   // the hunter is pointing at the monkey
  guard: true,                   // stop the five being over-filled
};

const cam = scene.createCamera();
let scenario = null, solved = null, traj = null, second = null, ghost = null, dirty = true;

/* ── step 1 · scenario ──────────────────────────────────────────────── */
function buildScenarioScreen() {
  $('pgrid').innerHTML = GROUPS.map((g) => {
    const cards = SCENARIOS.filter((s) => s.group === g.id).map((s) => `
      <button class="pcard" data-id="${s.id}"${s.card ? ` data-card="${s.card}"` : ''}>
        ${thumb(s)}
        <b>${s.name}</b>
        ${s.sub ? `<span class="pc-sub">${s.sub}</span>` : ''}
        <p class="pc-note">${s.note}</p>
      </button>`).join('');
    return `<div class="pgroup">
      <div class="pglabel">${g.label}</div>
      ${g.blurb ? `<p class="pgblurb">${g.blurb}</p>` : ''}
      <div class="pgrid-row">${cards}</div></div>`;
  }).join('');
  for (const b of $('pgrid').querySelectorAll('.pcard')) {
    b.addEventListener('click', () => chooseScenario(b.dataset.id));
  }
}

/**
 * A small sketch of the situation, drawn from its own numbers.
 *
 * It shows the flight ALREADY FLOWN: a solid path, a hollow ring where the
 * object started and a filled dot where it ended up. A dot at the launch point
 * says "about to happen" and leaves you reading the card for which end is
 * which; a dot at the landing point says what the situation produced, which is
 * what you are choosing between.
 */
function thumb(s) {
  const g = s.params.g || 9.81;
  const theta = s.noAngle ? -90 : (s.aimAtTarget ? aimFor(s) : s.params.theta);
  const f = flight({ u: s.params.u || 0.001, theta, h: s.params.h, g });
  const pts = f.path(48);
  const second = s.second?.from ? s.second.from({ ...s.params, g, theta }, s.markers) : null;
  const sPts = second
    ? flight({ u: second.u, theta: second.theta, h: second.h ?? 0, g })
        .path(40).map((p) => ({ ...p, x: p.x + (second.x0 || 0) }))
    : null;

  const all = sPts ? pts.concat(sPts) : pts;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const lo = Math.min(0, ...xs), hi = Math.max(...xs);
  const top = Math.max(1, ...ys, s.markers?.target?.y ?? 0, s.markers?.heightLine ?? 0);

  // A vertical flight has no width at all, so give it some and centre it —
  // otherwise it is a line jammed against the left edge.
  const padX = Math.max((hi - lo) * 0.14, 6);
  const X0 = lo - padX, X1 = hi + padX;
  const X = (x) => 6 + ((x - X0) / (X1 - X0)) * 108;
  const Y = (y) => 51 - (y / (top * 1.14)) * 41;
  const d = (ps) => ps.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');

  const end = pts[pts.length - 1];
  const mk = s.markers || {};
  const bits = [];

  if (mk.heightLine != null) {
    bits.push(`<line x1="4" y1="${Y(mk.heightLine).toFixed(1)}" x2="116" y2="${Y(mk.heightLine).toFixed(1)}"
      stroke="var(--mark)" stroke-width="1.4" stroke-dasharray="4 3" opacity=".85"/>`);
  }
  if (s.params.h > 0.3) {
    bits.push(`<line x1="${X(0).toFixed(1)}" y1="${Y(s.params.h).toFixed(1)}" x2="${X(0).toFixed(1)}" y2="51.5"
      stroke="var(--ink-faint)" stroke-width="1.4"/>`);
  }
  if (sPts) {
    bits.push(`<path d="${d(sPts)}" fill="none" stroke="var(--second)" stroke-width="1.9"
      stroke-dasharray="5 3.5" stroke-linecap="round" opacity=".95"/>`);
    const se = sPts[sPts.length - 1];
    bits.push(`<circle cx="${X(se.x).toFixed(1)}" cy="${Y(se.y).toFixed(1)}" r="2.6" fill="var(--second)"/>`);
  }
  if (mk.target) {
    bits.push(`<circle cx="${X(mk.target.x).toFixed(1)}" cy="${Y(mk.target.y).toFixed(1)}" r="3.6"
      fill="none" stroke="var(--mark)" stroke-width="1.6"/>`);
  }

  return `<svg viewBox="0 0 120 60" aria-hidden="true">
    <line x1="2" y1="51.5" x2="118" y2="51.5" stroke="var(--border)" stroke-width="1"/>
    ${bits.join('')}
    <path d="${d(pts)}" fill="none" stroke="var(--vel)" stroke-width="2.3" stroke-linecap="round"/>
    <circle cx="${X(0).toFixed(1)}" cy="${Y(s.params.h).toFixed(1)}" r="2.6"
            fill="var(--card)" stroke="var(--vel)" stroke-width="1.6"/>
    <circle cx="${X(end.x).toFixed(1)}" cy="${Y(end.y).toFixed(1)}" r="3.4" fill="var(--vel)"/>
  </svg>`;
}

/** The sketch aims at the marker too, so the card matches what you will get. */
function aimFor(s) {
  const t = s.markers?.target;
  if (!t) return s.params.theta;
  return (Math.atan2(t.y - (s.params.h || 0), t.x) * 180) / Math.PI;
}

function chooseScenario(id) {
  scenario = byId(id);
  state.id = id;
  state.given = {};
  // The scenario picks the SITUATION, never the numbers. Every box starts
  // empty; the only thing it fixes is that a dropped object starts at rest,
  // which is what "dropped" means.
  if (scenario.noAngle) state.given.u = 0;
  state.theta = undefined;
  state.h = undefined;
  state.markers = JSON.parse(JSON.stringify(scenario.markers || {}));
  state.firedBefore = false; ghost = null;
  state.aimed = true;                  // the hunter starts pointing at it
  $('chosen').textContent = scenario.name;
  buildValuesScreen();
  // An exhibit opens on the experiment itself, not on a form. The gate is
  // `exhibit` rather than `intro`, because Monkey vs Hunter no longer has an
  // intro card to open with — its controls are on the scene — and it still
  // has to arrive at the scene. The values screen stays one click away for
  // anyone who would rather type the numbers.
  if (scenario.exhibit) {
    seedExhibit();
    recompute();
    if (traj) { state.launched = true; state.firedBefore = false; state.t = 0; state.playing = false; }
    buildLive();
    go('flight');
    if (scenario.intro) openIntro();
  } else { $('live').hidden = true; go('values'); }
}

/** Fill in the scenario's own starting numbers, so the stage has something to show. */
function seedExhibit() {
  const s = scenario.seed || {};
  if (s.u != null) state.given.u = s.u;
  if (s.g != null) state.given.g = s.g;
  if (s.h != null) state.h = s.h;
  buildValuesScreen();
}

/* ── the intro card ─────────────────────────────────────────────────── */
function openIntro() {
  const i = scenario.intro;
  if (!i) return;
  $('intro-eyebrow').textContent = scenario.place || 'Experiment';
  $('intro-title').textContent = i.title;
  $('intro-body').textContent = i.body;
  $('intro-models').innerHTML = i.models.map((mdl) => `
    <button class="imodel" data-u="${mdl.u}" aria-pressed="${state.given.u === mdl.u}">
      <span><b>${mdl.name}</b><br><span class="im-note">${mdl.note}</span></span>
      <span class="im-u">${mdl.u}<small>${i.unit}</small></span>
    </button>`).join('');
  for (const b of $('intro-models').children) {
    b.addEventListener('click', () => {
      state.given.u = parseFloat(b.dataset.u);
      for (const x of $('intro-models').children) x.setAttribute('aria-pressed', String(x === b));
      buildValuesScreen();
      recompute();
      dirty = true;
    });
  }
  $('intro').hidden = false;
}
function closeIntro() { $('intro').hidden = true; }

/* ── step 2 · the five values ───────────────────────────────────────── */
function buildValuesScreen() {
  $('suvat').innerHTML = SUVAT.map((f) => {
    const locked = (f.k === 'u' && scenario.noAngle);
    return `<div class="sbox" data-k="${f.k}" data-locked="${locked}">
      <div class="s-sym">${f.sym}</div>
      <div class="s-name">${f.name}</div>
      <input type="number" step="any" data-k="${f.k}" placeholder="—"
             value="${state.given[f.k] ?? ''}" aria-label="${f.name} in ${f.unit}"
             data-fixed="${locked}"${locked ? ' readonly' : ''}>
      <div class="s-unit">${f.unit}</div>
    </div>`;
  }).join('');

  for (const i of $('suvat').querySelectorAll('input')) {
    i.addEventListener('input', (e) => {
      if (e.target.readOnly) { e.target.value = state.given[e.target.dataset.k] ?? ''; return; }
      const raw = e.target.value.trim();
      const v = raw === '' ? undefined : parseFloat(raw);
      if (raw === '' || !isFinite(v)) delete state.given[e.target.dataset.k];
      else state.given[e.target.dataset.k] = v;
      recompute();
    });
  }

  // Only what this situation genuinely cannot do without.
  const rows = [];
  if (!scenario.noAngle && !scenario.lockAngle) {
    rows.push(`<div class="xrow wide" data-x="theta">
      <label for="x-theta">Angle of projection θ (°)</label>
      <div class="angle-ctl">
        <svg class="angle-dia" id="theta-dia" viewBox="0 0 132 96" aria-hidden="true">
          <path id="td-wedge" fill="var(--accent)" opacity=".16"></path>
          <line x1="16" y1="48" x2="126" y2="48" stroke="var(--ink-faint)"
                stroke-width="1.6" stroke-dasharray="5 4"></line>
          <line x1="16" y1="8" x2="16" y2="88" stroke="var(--border)" stroke-width="1.4"></line>
          <path id="td-arc" fill="none" stroke="var(--accent)" stroke-width="1.6"></path>
          <line id="td-ray" x1="16" y1="48" x2="126" y2="48" stroke="var(--vel)"
                stroke-width="3" stroke-linecap="round"></line>
          <circle cx="16" cy="48" r="3.4" fill="var(--vel)"></circle>
        </svg>
        <div class="angle-set">
          <input id="x-theta" type="text" inputmode="decimal" autocomplete="off"
                 value="${state.theta == null ? '' : fmt(state.theta, 2)}" placeholder="—"
                 aria-label="Angle of projection in degrees">
          <input id="theta-slider" type="range" min="-90" max="90" step="0.5"
                 value="${state.theta ?? 0}" aria-label="Angle of projection">
        </div>
      </div>
      <p class="xhint" id="x-theta-hint">${THETA_HINT}</p>
      <div class="angle-say" id="theta-say"></div></div>`);
  }
  rows.push(`<div class="xrow" data-x="h"><label for="x-h">Launch height h (m)</label>
    <input id="x-h" type="number" step="any" value="${state.h ?? ''}" placeholder="—">
    <p class="xhint">Optional. Blank means ground level, or it works the height out.</p></div>`);
  // Time above a line can be asked in either direction, so it is offered in
  // both. The height moves the line; the time asks the engine which line
  // would give that answer and moves it there.
  if (scenario.dragLine && state.markers?.heightLine != null) {
    rows.push(`<div class="xrow" data-x="line"><label for="x-line">Height of the line (m)</label>
      <input id="x-line" type="text" inputmode="decimal" autocomplete="off"
             value="${fmt(state.markers.heightLine, 2)}" placeholder="—">
      <p class="xhint" id="x-line-hint">A fraction works too — <b>7/2</b> is the same as <b>3.5</b>.</p></div>`);
    rows.push(`<div class="xrow" data-x="above"><label for="x-above">Time above the line (s)</label>
      <input id="x-above" type="text" inputmode="decimal" autocomplete="off" value="" placeholder="—">
      <p class="xhint" id="x-above-hint">Type the answer you want and the line moves to give it.</p></div>`);
  }
  rows.push(`<div class="xrow"><label>Gravitational field</label><div class="chips" id="g-chips">${
    GRAVITY.map((x) => `<button class="chip" data-g="${x.g}" aria-pressed="${state.given.g === x.g}">${x.label} ${x.g}</button>`).join('')
  }</div></div>`);
  $('extra').innerHTML = rows.join('');

  wireAngle();
  $('x-h').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value); state.h = isFinite(v) ? v : undefined; recompute();
  });
  wireLineBoxes();
  for (const b of $('g-chips').querySelectorAll('.chip')) {
    b.addEventListener('click', () => {
      state.given.g = parseFloat(b.dataset.g);
      for (const x of $('g-chips').querySelectorAll('.chip')) x.setAttribute('aria-pressed', String(x === b));
      $('suvat').querySelector('input[data-k="g"]').value = state.given.g;
      recompute();
    });
  }
  recompute();
}

/* ── solve ──────────────────────────────────────────────────────────── */
/** The angle that points the launch straight at the draggable target. */
function aimAngle() {
  const t = state.markers?.target;
  if (!t) return undefined;
  const h = state.h ?? 0;
  return (Math.atan2(t.y - h, t.x) * 180) / Math.PI;
}
/**
 * The boxes hold what the student typed and nothing else. The engine's answers
 * belong at the end of the flight, not spilled back over the form while it is
 * still being filled in.
 */
function showDerived(r) {
  const notes = [];
  if (r.convention) notes.push(r.convention);
  notes.push(...r.notes);
  if (r.moment) notes.push(r.moment.text);
  $('notes').innerHTML = notes.map((x) => `<li>${x}</li>`).join('');
}

function recompute() {
  const k = { ...state.given, theta: state.theta, h: state.h };
  if (scenario.noAngle) { k.u = 0; delete k.theta; }
  if (scenario.lockAngle) k.theta = scenario.params.theta;
  // AIMED, not angled. The hunter points straight at the monkey, so the angle
  // is a consequence of where the monkey is — drag it and the angle follows.
  // AIMED, not angled — while the student leaves it that way. The hunter
  // points straight at the monkey by default, and the angle is a consequence
  // of where the monkey is. Move the angle slider and it becomes yours, which
  // is the only way to find out that the aimed one always works.
  if (scenario.aimAtTarget && state.aimed) k.theta = aimAngle();

  solved = solveLaunch(k, { noAngle: scenario.noAngle,
                            lockAngle: scenario.lockAngle || scenario.aimAtTarget });

  const msg = $('solve-msg'), btn = $('launch');

  if (!solved.ok) {
    // Typeset maths arrives as markup, so every sink that can receive it takes
    // innerHTML. textContent here prints the tags at the student. See CLAUDE.md.
    msg.dataset.ok = 'false'; msg.innerHTML = solved.reason;
    $('notes').innerHTML = '';
    btn.disabled = true; btn.textContent = 'Launch';
    traj = null; refreshSteps(); applyGuard(); sayAngle(); return;
  }

  msg.dataset.ok = 'true';
  msg.innerHTML = solved.derived.length
    ? `Ready. The rest comes out as:  ${solved.derived.join('  ·  ')}`
    : 'Everything needed is here.';
  showDerived(solved);

  traj = trajectory({ ...solved.params, mass: state.mass,
                      restitution: state.bounce ? state.restitution : 0,
                      maxBounces: state.bounce ? 6 : 0 });
  second = buildSecond(solved.params);
  // THE CATCH ENDS IT. Aimed straight at the monkey, the banana arrives when
  // its horizontal displacement equals the monkey's — and watching it sail on
  // through would undo the whole point of the scenario.
  // WHAT HAPPENED, worked out by the engine and only displayed here. It used
  // to model exactly one failure — "too slow" — because the angle was computed
  // from the monkey and a vertical miss could not happen. Now that the angle
  // is the student's, it can.
  const tg = scenario.aimAtTarget ? state.markers?.target : null;
  if (tg && second) {
    const v = intercept(traj, tg, solved.params.g);
    state.verdict = { ...v, why: corners(v, solved.params.g, state.aimed, tg) };
    if (v.kind === 'caught') {
      // THE CATCH ENDS IT. Watching it sail on through would undo the point.
      traj = endAt(traj, v.t);
      second = endAt(second, v.t);
      state.caught = { t: v.t, y: tg.y - v.fall };
    } else {
      state.caught = null;
      // A miss is watched all the way past, or you cannot see HOW it missed.
      if (v.kind !== 'short') {
        const past = Math.min(traj.tMax, (tg.x / traj.horiz) * 1.35);
        traj = endAt(traj, past);
      }
    }
  } else { state.caught = null; state.verdict = null; }
  syncLive();
  btn.disabled = false;
  btn.textContent = solved.params.u < 0.05
    ? 'Release it'                      // a drop has no launch speed to quote
    : `Launch at ${fmt(solved.params.u, 1)} m s⁻¹`;
  showAbove();                   // the line's hint quotes the flight it belongs to
  refreshSteps();                // and Flight is reachable now that one exists
  applyGuard();
  sayAngle();
  if (state.theta === undefined) drawAngle(undefined);   // show what it found
  dirty = true;
}

/**
 * The second object is DERIVED from the first, never fixed. Hard-coding its
 * numbers only worked while the first object's numbers were pre-filled too —
 * the moment the student types their own, a fixed second object simply misses.
 */
function buildSecond(p) {
  const s = scenario.second;
  if (!s) return null;
  const q = s.from ? s.from(p, state.markers) : s;
  if (!q) return null;                   // the situation does not support one
  const f = flight({ u: q.u, theta: q.theta, h: q.h ?? 0, g: p.g });
  return q.x0 ? shift(f, q.x0) : f;
}

/**
 * The same flight, started x0 metres along. `flight()` always launches from
 * the origin, and a monkey hanging in a tree does not — so the whole thing is
 * slid sideways rather than the model being bent to allow it.
 */
/** The same flight, stopped early. Nothing is re-modelled; the clock is cut. */
function endAt(f, tEnd) {
  const T = Math.min(tEnd, f.tMax);
  // The range bar measures the flight that happened, not the one that would
  // have happened — a banana caught at 26 m did not travel 36.
  const reach = f.pos(T).x;
  return { ...f, tMax: T, tFlight: Math.min(f.tFlight, T), range: reach,
    pos: (t) => f.pos(Math.min(t, T)),
    vel: (t) => f.vel(Math.min(t, T)),
    path: (n, e = T) => f.path(n, Math.min(e, T)),
    ticks: (n, e = T) => f.ticks(n, Math.min(e, T)) };
}

function shift(f, x0) {
  const move = (p) => ({ ...p, x: p.x + x0 });
  return { ...f, x0,
    pos: (t) => move(f.pos(t)),
    path: (n, tEnd) => f.path(n, tEnd).map(move),
    ticks: (n, tEnd) => f.ticks(n, tEnd).map(move),
    range: f.range + x0 };
}

/* ── the angle question, answered where it is asked ──────────────────────
   A lot of exam questions give you everything except the angle of projection,
   and a student who has not been told otherwise assumes they are stuck. The
   app knew the answer and kept it in a list at the bottom of the screen.

   The answer is that you almost never need it. Any three of s, u, v, a, t
   determine the other two — that is the whole of SUVAT and it never mentions
   a direction. The angle is needed only to DRAW the arc, and when it is
   needed it can usually be recovered from the numbers you already have.

   So three things get said, between the five boxes and the angle box, which
   is where the question gets asked:

     · which kind of motion is being solved, and why
     · when the engine worked the angle out, that it did and from what
     · when the range equation gives TWO answers, what the other one is —
       and a way to take it

   The reasoning is written up in design/angles.md. */
function sayAngle() {
  const band = $('mode-say'), say = $('theta-say');
  if (band) { band.innerHTML = ''; band.removeAttribute('data-mode'); }
  if (say) say.innerHTML = '';
  if (!solved?.ok) return;

  const gaveTheta = (solved.given || []).includes('theta');
  const derived = !!solved.filled?.theta;

  if (band) {
    band.dataset.mode = solved.mode;
    band.innerHTML = solved.mode === '1d'
      ? `<b>Straight-line motion.</b> No angle was given and none can be worked out from
         these values — so the engine is solving the five along one line, which is the
         correct answer to a question that never mentioned a direction. Nothing is
         missing. Add the angle, or give where it lands, if you want the arc drawn.`
      : gaveTheta
        ? `<b>A two-dimensional arc</b> at the angle you gave, ${M`${fmt(solved.params.theta, 1)}`}°.`
        : derived
          ? `<b>A two-dimensional arc.</b> You did not give the angle and did not need to —
             the engine recovered it as ${M`theta = ${fmt(solved.params.theta, 1)}`}°.`
          : `<b>A two-dimensional arc</b> at ${M`theta = ${fmt(solved.params.theta, 1)}`}°.`;
  }

  if (!say) return;
  const bits = [];
  if (derived) {
    bits.push(`<b>Worked out, not needed.</b> ${solved.filled.theta} — from the values you
      already gave. Leaving this box blank is a normal thing to do and usually the
      right one.`);
  } else if (!gaveTheta && solved.mode === '1d') {
    bits.push(`<b>Leave it blank.</b> The five equations never mention an angle, so one is
      only wanted here to draw an arc. Without it the motion is solved along a line
      and every number is still exact.`);
  }
  if (solved.altTheta != null) {
    bits.push(`<b>There are two.</b> ${M`${fmt(solved.params.theta, 1)}`}° and
      ${M`${fmt(solved.altTheta, 1)}`}° both land in the same place — the low ball and the
      high ball. This is the shallower.
      <button class="linkish" id="theta-alt">Use ${fmt(solved.altTheta, 1)}° instead</button>`);
  }
  say.innerHTML = bits.join('<br><br>');
  $('theta-alt')?.addEventListener('click', () => {
    const v = solved.altTheta;
    state.theta = v;
    const box = $('x-theta');
    if (box) box.value = fmt(v, 2);
    const sld = $('theta-slider');
    if (sld) sld.value = String(clamp(v, +sld.min, +sld.max));
    drawAngle(v);
    recompute();
  });
}

/* ── the over-filling guard ──────────────────────────────────────────────
   Enter the landing speed, the acceleration and the angle and you have said
   enough: the motion is determined, and a displacement typed on top of that
   can only agree redundantly or contradict. The engine has always known this
   — runLine worked out which values it leaned on, which were spare and which
   disagreed — and then flattened all three into a sentence and threw the data
   away. It returns them now, so the interface can act on them.

   What acting on them means: once the motion is determined, the boxes that
   are still empty are closed, greyed, with one line saying why. Clearing a
   box you did fill opens them all again, so changing your mind costs nothing.

   It is a setting, on by default, and it lives beside the boxes rather than
   behind a panel reachable only from another screen. In both states it says
   what it is doing and offers the other one, which makes it the way out as
   well as the way in. It is remembered the way the theme is remembered,
   because that is the only persistence pattern this codebase has.

   The ANGLE is never locked. It is not one of the five, it is optional by
   design, and item 19's whole point is that a student should feel free to
   leave it blank or fill it in. */
function applyGuard() {
  const say = $('guard-say'), btn = $('guard-toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(state.guard));
  $('guard-ck').checked = state.guard;

  const determined = state.guard && !!solved?.ok;
  let shut = 0;
  for (const box of $('suvat').querySelectorAll('.sbox')) {
    const key = box.dataset.k;
    const input = box.querySelector('input');
    const scenarioLock = input.dataset.fixed === 'true';
    const empty = state.given[key] === undefined;
    const lock = scenarioLock || (determined && empty);
    if (lock && !scenarioLock) shut++;
    box.dataset.locked = String(lock);
    input.readOnly = lock;
    input.setAttribute('aria-disabled', String(lock));
  }

  if (!state.guard) {
    say.textContent = 'Extra values are allowed. The engine will still refuse ones that contradict.';
    btn.textContent = 'Guard them';
  } else if (shut) {
    say.textContent = `The motion is already determined, so the ${shut === 1 ? 'remaining box is' : `remaining ${shut} boxes are`} closed — anything typed there could only repeat or contradict what is here.`;
    btn.textContent = 'Let me fill them anyway';
  } else {
    say.textContent = 'Fill in any three. The rest will close once the motion is determined.';
    btn.textContent = 'Let me fill them anyway';
  }
}

function setGuard(on) {
  state.guard = on;
  try { localStorage.setItem('suvat-guard', on ? 'on' : 'off'); } catch {}
  applyGuard();
}

/* ── live controls, for an exhibit you play with ─────────────────────────
   Monkey vs Hunter opened onto a card offering three speeds. That is a menu,
   and the scenario is a toy: you want to move something and watch the answer
   move. Two sliders over the canvas do that, and both are live — every drag
   re-solves, rebuilds the flight and redraws.

   The angle is the interesting one, because offering it at all changes the
   premise. The hunter used to aim straight at the monkey BY CONSTRUCTION, so
   the demonstration could not fail and there was no such thing as a vertical
   miss. Touch the angle and the aim becomes yours — which is the only way to
   discover that the aimed one always works. One button puts it back. */
function buildLive() {
  const spec = scenario?.live;
  $('live').hidden = !spec;
  // AN EXHIBIT IGNORES THE CAMERA AND THE SHOW LIST. exhibit.js recomputes
  // its own projection every frame and never reads cam.scale, so Pitch /
  // Stadium / District are inert on it; and `show` is consulted once in the
  // whole file, for a key that is not in state.show, so none of the seven
  // checkboxes does anything either. Offering a control that cannot work is
  // worse than not offering it: the student concludes the app is broken.
  // Bounce goes the same way — a bullet does not bounce, and the monkey is
  // not a ball.
  const ex = !!scenario?.exhibit;
  $('band-seg').hidden = ex;
  $('rate-seg').hidden = false;
  $('shows').previousElementSibling.hidden = ex;   // its "Show" heading
  $('shows').hidden = ex;
  for (const el of document.querySelectorAll('.ck.inline')) el.hidden = ex;
  if (!spec) return;
  for (const [k, o] of Object.entries(spec)) {
    const el = $(`lv-${k}`);
    el.min = o.min; el.max = o.max; el.step = o.step;
  }
  syncLive();
}

/** Put the sliders and the readouts where the solve actually ended up. */
function syncLive() {
  if (!scenario?.live || !solved?.ok) return;
  const p = solved.params;
  const set = (k, v, dp, unit) => {
    const el = $(`lv-${k}`), out = $(`lv-${k}-v`);
    if (!el) return;
    if (document.activeElement !== el) el.value = String(clamp(v, +el.min, +el.max));
    out.textContent = `${fmt(v, dp)}${unit}`;
  };
  set('u', p.u, 1, '');
  set('theta', p.theta, 1, '°');
  $('lv-aim').setAttribute('aria-pressed', String(!!state.aimed));
}

function wireLive() {
  $('lv-u').addEventListener('input', (e) => {
    state.given.u = parseFloat(e.target.value);
    buildValuesScreen();              // the typed boxes agree with the slider
    recompute(); dirty = true;
  });
  $('lv-theta').addEventListener('input', (e) => {
    // TAKING THE AIM OVER. Until this happens the hunter points at the monkey
    // and the angle is a consequence of where it hangs.
    state.aimed = false;
    state.theta = parseFloat(e.target.value);
    recompute(); dirty = true;
  });
  $('lv-aim').addEventListener('click', () => {
    state.aimed = true;
    state.theta = undefined;
    recompute(); dirty = true;
  });
}

/* ── the angle of projection ─────────────────────────────────────────
   One of the most-used controls in the app, and until now a bare number box
   that would cheerfully accept −400°, 720° and 1e9 and hand every one of them
   to the solver. Three things that stay in sync replace it:

     a SLIDER, for finding the angle you want rather than knowing it
     a DIAGRAM, so you can see 38° instead of reading it
     a BOX, for the exact value a question gives you

   Typing wins. The box takes as many decimal places as you like and nothing
   rounds what you typed — the slider and the diagram follow it, and only when
   the app itself sets the box (from the slider) is it written to two places.

   ±90° INCLUSIVE, and the cap belongs HERE, at the boundary, not in the
   engine. Past 90° you are launching backwards, which this model does not
   describe. Negative means thrown downwards, which is a real exam setup and
   now has a scenario of its own. But solve.js derives θ by atan2 and by the
   range equation and can legitimately land outside ±90°; clamping there would
   break a correct answer, so js/core/ is left alone. */
const THETA_HINT = 'Optional — leave it blank and the engine works it out, or '
  + 'says it only needs a straight line. Anything from −90° to 90°; negative '
  + 'is thrown downwards.';
const THETA_LIMIT = 90;

function wireAngle() {
  const box = $('x-theta'), sld = $('theta-slider');
  if (!box) return;

  const set = (v, fromBox) => {
    state.theta = v;
    if (!fromBox) box.value = v == null ? '' : fmt(v, 2);
    if (sld) sld.value = String(v ?? 0);
    drawAngle(v);
    recompute();
  };

  box.addEventListener('input', (e) => {
    const v = parseValue(e.target.value);
    const hint = $('x-theta-hint');
    if (v === undefined) { say(hint, false, THETA_HINT); set(undefined, true); return; }
    if (!isFinite(v)) { say(hint, true, 'That is not an angle. Degrees, between −90 and 90.'); return; }
    if (Math.abs(v) > THETA_LIMIT) {
      // Say what was done and why. Rewriting the box under the cursor of
      // someone who is still typing is how a control loses their trust.
      const capped = clamp(v, -THETA_LIMIT, THETA_LIMIT);
      say(hint, true, `Angles stop at ${M`±90`}°. Past 90° the launch is backwards, which `
        + `this model does not describe, so ${M`${num(capped, 0)}`}° is what gets used.`);
      set(capped, true);
      return;
    }
    say(hint, false, THETA_HINT);
    set(v, true);
  });

  // Two decimal places is the DISPLAY, and only once typing has stopped: a
  // box that reformats between keystrokes eats digits out from under you.
  // The value itself keeps every place that was typed, and when the two
  // differ the hint says so rather than leaving a number on screen that is
  // not the number being used.
  box.addEventListener('blur', () => {
    if (state.theta == null) { box.value = ''; return; }
    const shown = fmt(state.theta, 2);
    box.value = shown;
    const exact = Math.abs(state.theta - Math.round(state.theta * 100) / 100) > 1e-12;
    say($('x-theta-hint'), false, exact
      ? `Shown to two places. Working with ${M`${num(state.theta, 10, { trim: true })}`}°, exactly as typed.`
      : THETA_HINT);
  });

  sld?.addEventListener('input', (e) => {
    say($('x-theta-hint'), false, THETA_HINT);
    set(parseFloat(e.target.value), false);
  });

  drawAngle(state.theta);
}

/**
 * The ray, the wedge and the arc, at whatever the box currently holds.
 *
 * The origin sits in the MIDDLE of the frame, not on its floor, because the
 * control covers −90° to +90° and a downward throw needs as much room as an
 * upward one. The ray is then drawn out to whichever edge it meets first, so
 * it fills the frame at every angle instead of poking through the top at 45°
 * and petering out at 5°.
 */
function drawAngle(theta) {
  const ray = $('td-ray'), arc = $('td-arc'), wedge = $('td-wedge');
  if (!ray) return;
  // WITH THE BOX BLANK, DRAW WHAT THE ENGINE FOUND. Leaving the diagram flat
  // while the panel underneath says "the engine recovered it as 20.4°" makes
  // the two disagree, and the picture is the part that gets believed.
  const own = isFinite(theta);
  const found = !own && solved?.ok ? solved.params.theta : undefined;
  const shown = own ? theta : found;
  const t = clamp(isFinite(shown) ? shown : 0, -THETA_LIMIT, THETA_LIMIT);
  const a = (t * Math.PI) / 180;
  const OX = 16, OY = 48, AR = 26;
  const ca = Math.cos(a), sa = Math.sin(a);
  const R = Math.min(
    ca > 1e-6 ? (126 - OX) / ca : Infinity,
    sa > 1e-6 ? (OY - 8) / sa : Infinity,
    sa < -1e-6 ? (OY - 88) / sa : Infinity,
  );
  const ex = OX + R * ca, ey = OY - R * sa;
  ray.setAttribute('x2', ex.toFixed(2));
  ray.setAttribute('y2', ey.toFixed(2));
  // Faint while it is the engine's answer rather than yours.
  ray.setAttribute('stroke', own ? 'var(--vel)' : (isFinite(found) ? 'var(--ink-muted)' : 'var(--ink-faint)'));

  // The arc runs from the horizontal round to the ray, either way.
  const ax = OX + AR, ay = OY;
  const bx = OX + AR * ca, by = OY - AR * sa;
  const sweep = t >= 0 ? 0 : 1;
  const flat = Math.abs(t) < 0.05;
  arc.setAttribute('d', flat ? ''
    : `M${ax.toFixed(2)} ${ay.toFixed(2)} A${AR} ${AR} 0 0 ${sweep} ${bx.toFixed(2)} ${by.toFixed(2)}`);
  wedge.setAttribute('d', flat ? ''
    : `M${OX} ${OY} L${ax.toFixed(2)} ${ay.toFixed(2)} A${AR} ${AR} 0 0 ${sweep} ${bx.toFixed(2)} ${by.toFixed(2)} Z`);
}

/* ── the line, from either end ───────────────────────────────────────
   Both boxes set the same one thing, so each has to show what the other did.
   The time box is the useful one in an exam — "for how long is it above 4 m"
   is usually asked the other way round, as "what height does it clear for
   1.2 s" — and it is the one that can be asked for something impossible, so
   it is the one that can refuse. The refusal comes from the engine, which is
   the only thing that knows the flight. */
function wireLineBoxes() {
  const hb = $('x-line'), tb = $('x-above');
  if (!hb) return;

  hb.addEventListener('input', (e) => {
    const v = parseValue(e.target.value);
    const hint = $('x-line-hint');
    if (v === undefined) { say(hint, false, 'A fraction works too — <b>7/2</b> is the same as <b>3.5</b>.'); return; }
    if (!isFinite(v) || v < 0) {
      say(hint, true, 'That is not a height. Try a number, or a fraction like 7/2.');
      return;
    }
    state.markers.heightLine = v;
    say(hint, false, 'A fraction works too — <b>7/2</b> is the same as <b>3.5</b>.');
    if (tb) tb.value = '';
    showAbove();
    dirty = true;
  });

  tb.addEventListener('input', (e) => {
    const v = parseValue(e.target.value);
    const hint = $('x-above-hint');
    if (v === undefined) { say(hint, false, 'Type the answer you want and the line moves to give it.'); return; }
    if (!traj) { say(hint, true, 'Fill in enough of the five first — there is no flight to put a line across yet.'); return; }
    if (!isFinite(v)) { say(hint, true, 'That is not a time. Try a number, or a fraction like 7/2.'); return; }
    const r = heightForTime(traj, v);
    if (!r.ok) { say(hint, true, r.reason); return; }
    state.markers.heightLine = r.height;
    hb.value = fmt(r.height, 2);
    say(hint, false, `A line at ${fmt(r.height, 2)} m gives exactly that.`);
    dirty = true;
  });

  showAbove();
}

/** Say how long the current line is cleared for, under the height box. */
function showAbove() {
  const hint = $('x-line-hint');
  if (!hint || !traj || state.markers?.heightLine == null) return;
  const r = timeAbove(traj, state.markers.heightLine);
  say(hint, false, r.above > 1e-9
    ? `It is above that for ${fmt(r.above, 2)} s. A fraction works too — <b>7/2</b> is the same as <b>3.5</b>.`
    : 'It never gets that high. A fraction works too — <b>7/2</b> is the same as <b>3.5</b>.');
}

/** Keep the boxes honest when the line is dragged rather than typed. */
function syncLineBoxes() {
  const hb = $('x-line');
  if (hb) hb.value = fmt(state.markers.heightLine, 2);
  const tb = $('x-above');
  if (tb) tb.value = '';
  showAbove();
}

// The engine's refusals are prose, but a hint can also carry a typeset
// quantity, so this sink takes innerHTML. See CLAUDE.md.
function say(el, bad, html) {
  if (!el) return;
  el.dataset.bad = String(!!bad);
  el.innerHTML = html;
}

/* ── step 3 · flight ────────────────────────────────────────────────── */
/* ── one decision before it runs ─────────────────────────────────────────
   The speed control lived in the flight bar, which meant it was unreachable
   until the flight screen had been entered at least once — so the first time
   you watched anything, you watched it at whatever speed it happened to be,
   and by the time you could slow it down you had already missed it.

   It is asked before the launch instead, over the blurred stage, using the
   same treatment the intro card already uses. The answer is remembered, so
   the tenth launch is Enter and Enter. A REPLAY IS NOT A LAUNCH and does not
   ask — asking every time something runs again is what would turn this into
   a wall. */
function launch() {
  if (!traj) return;
  closeIntro();
  go('flight');                 // so there is a stage to blur behind the card
  openPace();
}

function openPace() {
  $('pace-rate').value = String(state.rate);
  $('pace-val').textContent = `${state.rate}×`;
  $('pace').hidden = false;
  // FOCUS THE SLIDER, NOT THE BUTTON. Focusing the button meant the very
  // keypress that opened this card activated it on the way back up, so Enter
  // from the values screen blew straight through the card without it ever
  // being seen. The slider ignores Enter, which is handled below instead —
  // and it puts the left and right arrows on the speed, which is the thing
  // the card is for.
  $('pace-rate').focus();
}
function closePace() { $('pace').hidden = true; }

/** Keep the card and the flight bar saying the same thing. */
function syncRate() {
  $('pace-rate').value = String(state.rate);
  $('pace-val').textContent = `${state.rate}×`;
  for (const x of $('rate-seg').children) {
    x.setAttribute('aria-pressed', String(parseFloat(x.dataset.rate) === state.rate));
  }
}

function runFlight() {
  if (!traj) return;
  closePace();
  closeIntro();
  closeResolve();
  if (state.firedBefore) ghost = traj.path(260);
  state.firedBefore = true; state.launched = true;
  state.overview = false;               // every run starts from the panes
  state.t = 0; state.playing = true;
  cam.fit = true;
  setPlayIcon(true);
  hideDone();
  go('flight');
}

/* ── moving between the three screens ───────────────────────────────────
   go() used to set three things and nothing else, which is why jumping
   between steps costs nothing: the five boxes, the angle, the height, the
   markers, the solve and the camera all live outside it and simply persist.
   Two things did need deciding.

   A FLIGHT LEFT MID-PLAY used to keep running. state.playing stayed true, so
   coming back a minute later dropped you into the middle of a flight that had
   been going the whole time you were on another screen. It pauses on the way
   out instead: you come back to the frame you left, and press play.

   AND THE DONE CARD used to survive. #brand jumped to the scenario screen
   without hiding it, so a card could sit invisibly behind that screen and
   reappear later. Rather than patch the one handler that forgot, go() hides
   it whenever the destination is not the flight screen — there is nowhere
   else it means anything. */
function go(step) {
  if (state.step === 'flight' && step !== 'flight' && state.playing) {
    state.playing = false; setPlayIcon(false);
  }
  if (step !== 'flight') hideDone();
  state.step = step;
  $('app').dataset.step = step;
  $('options-btn').hidden = step !== 'flight';
  refreshSteps();
  dirty = true;
  requestAnimationFrame(() => { dirty = true; });
}

/**
 * Which steps you can reach from here, and which one you are on.
 *
 * A step that leads nowhere is disabled rather than left to land you on an
 * empty screen: Values needs a scenario to have values FOR, and Flight needs
 * the engine to be able to determine the motion, which is the same condition
 * the Launch button uses.
 *
 * The two exhibits open straight onto the flight screen and never show the
 * values screen on the way. Step 2 is still enabled for them, because they do
 * have values — their intro card's "Type my own numbers" goes exactly there —
 * and a step that works from one route and not another would be the
 * inconsistency, not the fix.
 */
function refreshSteps() {
  const reach = { scenario: true, values: !!scenario, flight: !!traj };
  for (const b of $('steps').querySelectorAll('.navstep')) {
    const to = b.dataset.s;
    const on = state.step === to;
    const can = reach[to] || on;
    b.setAttribute('aria-disabled', String(!can));
    if (on) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
    b.setAttribute('aria-label', can || on
      ? `Step ${b.querySelector('span').textContent}, ${b.textContent.slice(1)}`
      : (to === 'values' ? 'Values — pick a scenario first'
                         : 'Flight — fill in enough values first'));
  }
}

function togglePlay() {
  if (!traj) return;
  hideDone(); closeResolve();
  if (state.t >= traj.tMax) state.t = 0;
  state.playing = !state.playing; setPlayIcon(state.playing); dirty = true;
}
function setPlayIcon(on) {
  $('play-icon').innerHTML = on
    ? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
    : '<path d="M8 5v14l11-7z"/>';
  $('play').dataset.playing = String(on);
  $('play').setAttribute('aria-label', on ? 'Pause' : 'Play');
}

/* ── resolving one instant into components ──────────────────────────────
   Point at the object — or anywhere on the arc behind it — and the flight
   stops where it is and splits the velocity and the displacement into a
   horizontal part and a vertical part. It is the first line of every
   projectile answer, on the instant the student chose rather than on the
   instant the question chose. */
function openResolve(t) {
  if (!traj || state.step !== 'flight') return;
  hideDone();
  state.t = clamp(t ?? state.t, 0, traj.tMax);
  state.playing = false; setPlayIcon(false);
  state.resolve = true; state.hover = null;
  dirty = true;
}

function closeResolve() {
  if (!state.resolve) return;
  state.resolve = false;
  $('resolve').hidden = true;
  $('canvas-wrap').dataset.resolve = 'off';
  dirty = true;
}

function renderResolve(R) {
  const box = $('resolve');
  $('canvas-wrap').dataset.resolve = R ? 'on' : 'off';
  if (!R) { box.hidden = true; return; }

  $('res-title').innerHTML = `At ${M`t = ${fmt(R.t, 2)} [s]`}`;

  const row = (q, part) => `
    <div class="rrow" data-part="${part}">
      <div class="rrow-top"><span class="rrow-n">${q.name}</span>
        <b class="rrow-v">${fmt(q.value, 2)}<small>${q.unit}</small></b></div>
      <div class="rrow-f">${q.formula}${q.sub ? ` = ${q.sub}` : ''}</div>
      <div class="rrow-note">${q.note}</div>
    </div>`;
  // A vertical launch has no horizontal part and therefore no resultant to
  // find — printing a row of zeroes would teach the wrong thing.
  const block = (b) => `<div class="rblock" data-hue="${b.hue}">
      <div class="rb-h">${b.name}</div>
      ${R.vertical ? row(b.y, 'y') : row(b.x, 'x') + row(b.y, 'y') + row(b.r, 'r')}
    </div>`;
  $('res-blocks').innerHTML = block(R.velocity) + block(R.displacement);

  $('res-note').textContent = R.vertical
    ? 'Vertical motion only, so there is no horizontal component.'
    : R.after
      ? 'Past the bounce, u and θ no longer apply — so these are numbers, not formulas. The horizontal component is still unchanged.'
      : 'Up is positive. Drag the time slider to watch these change.';

  // The card stands on the side the object is not on, so it never covers the
  // thing it is describing.
  const bx = cam._map?.ball?.x;
  const wide = $('canvas-wrap').getBoundingClientRect().width;
  if (bx != null && wide > 0) box.dataset.side = bx < wide / 2 ? 'right' : 'left';
  box.hidden = false;
}

/* ── readouts, on the diagram ───────────────────────────────────────── */
function renderHud() {
  if (!traj) return;
  const p = traj.pos(state.t), v = traj.vel(state.t);
  const b = (k, val, unit, hue) =>
    `<div class="hbox"${hue ? ` data-hue="${hue}"` : ''}><div class="hbox-k">${k}</div>
     <div class="hbox-v">${val}<small>${unit}</small></div></div>`;
  // In a straight line the horizontal distance is always zero, so show the
  // signed displacement along the line instead — that is the s being solved.
  const line = solved?.mode === '1d';
  const h0 = solved?.params.h ?? 0;
  const toAxis = (y) => (solved?.axis === 'down' ? -y : y);
  const left = line
    ? [
        b('Displacement', fmt(toAxis(p.y - h0), 1), 'm', 'disp'),
        b('Height', fmt(p.y, 1), 'm', 'disp'),
        b('Speed', fmt(Math.hypot(v.x, v.y), 1), 'm s⁻¹', 'vel'),
      ]
    : [
        b('Height', fmt(p.y, 1), 'm', 'disp'),
        b('Horizontal distance', fmt(p.x, 1), 'm', 'disp'),
        b('Speed', fmt(Math.hypot(v.x, v.y), 1), 'm s⁻¹', 'vel'),
      ];
  if (state.extras.energy) {
    left.push(b('Kinetic energy', fmt(traj.kineticEnergy(state.t), 0), 'J'));
    left.push(b('Momentum', fmt(traj.momentum(state.t), 1), 'kg m s⁻¹'));
  }
  $('hud-left').innerHTML = left.join('');
  $('hud-right').innerHTML = b('Time', fmt(state.t, 2), 's');
  // An exhibit happens somewhere else and says where in its own `place`.
  // Falling back to siteFor meant the range and the beach were both captioned
  // "A goal kick from the west goal line".
  const site = siteFor(state.id);
  $('place').textContent = scenario?.place || site.place;
  $('place-note').textContent = scenario?.exhibit ? '' : (site.note || '');
}

/* ── the landing card: the whole of SUVAT, once it has settled ───────── */
const SYM = { s: 's', u: 'u', v: 'v', a: 'a', t: 't' };

function showDone() {
  if (!solved?.ok || state.step !== 'flight') return;
  const r = solved;

  $('done-eyebrow').textContent = traj.bounces > 0
    ? `First flight, then ${traj.bounces} ${traj.bounces === 1 ? 'bounce' : 'bounces'}`
    : `Flight complete in ${fmt(r.five.t.value, 2)} s`;
  $('done-title').textContent = title(r);
  $('done-conv').textContent = r.convention || '';

  $('done-five').innerHTML = Object.entries(r.five).map(([slot, x]) => `
    <div class="dcell" data-given="${x.given}">
      <div class="d-sym">${SYM[slot]}</div>
      <div class="d-name">${x.label}</div>
      <div class="d-val">${fmt(x.value, Math.abs(x.value) < 10 ? 2 : 1)}</div>
      <div class="d-unit">${x.unit}</div>
      <div class="d-from">${x.given ? 'you gave this' : 'worked out'}</div>
    </div>`).join('');

  $('done-extra').innerHTML = r.extras
    .map((x) => `<span class="dx">${x.label}<b>${fmt(x.value, x.unit === '°' ? 1 : 2)}${x.unit === '°' ? '' : ' '}${x.unit}</b></span>`)
    .join('');

  // Whatever still needs saying: an assumption, a second valid angle, or the
  // instant they actually asked about.
  const said = [];
  if (r.moment) said.push(r.moment.text);
  said.push(...r.notes);
  $('done-note').innerHTML = said.join(' ');

  $('done').hidden = false;
}

function title(r) {
  if (traj?.bounces > 0) return 'It finished bouncing';
  if (r.mode === '1d' && Math.abs(r.params.u) < 1e-9) return 'It hit the ground';
  if (r.mode === '1d' && r.params.h <= 1e-9) return 'It came back down';
  return 'It landed';
}

/**
 * Which card the end of a flight deserves.
 *
 * The SUVAT-five grid is the right answer almost everywhere: five boxes,
 * which were given and which were worked out. It is the wrong answer for the
 * range, where the whole result is that two of those numbers came out equal —
 * a grid makes you hunt for that, and the fact actually worth having is not in
 * the grid at all. So a scenario may bring its own ending.
 */
function showEnding() {
  if (!(scenario?.ending && second && solved?.ok && state.step === 'flight')) return showDone();
  if (scenario.ending.kind === 'monkey') return showMonkeyDone();
  return showRangeDone();
}

/**
 * The monkey's ending: what happened, and — when the picture is misleading —
 * why it is the picture at fault rather than the physics.
 *
 * The verdict comes from js/core/intercept.js and so do the corners worth
 * explaining. Nothing here decides anything; it chooses which of the
 * scenario's own paragraphs the run has earned.
 */
function showMonkeyDone() {
  const e = scenario.ending, v = state.verdict;
  if (!v) return showDone();
  const head = e[v.kind] || e.caught;
  const tg = state.markers.target;

  $('exdone-eyebrow').textContent = state.aimed
    ? 'Aimed straight at the monkey' : `Aimed at ${fmt(solved.params.theta, 1)}°`;
  $('exdone-title').textContent = head.title;

  const body = [];
  if (v.kind === 'caught') {
    body.push(`<p>The banana covered the <b>${fmt(tg.x, 1)} m</b> to the monkey in
      <b>${fmt(v.t, 2)} s</b>. In that time both of them fell
      <b>${fmt(v.fall, v.fall < 0.1 ? 3 : 2)} m</b> below where they would have been
      with no gravity at all — the same ${M`½g t^2`}, for both, which is why the
      two cancel and the aim survives.</p>`);
  } else if (v.kind === 'short') {
    body.push(`<p>The monkey was on the sand after <b>${fmt(v.landed, 2)} s</b>. The
      banana only reached <b>${fmt(v.reach, 1)} m</b> of the <b>${fmt(tg.x, 1)} m</b>
      it needed. It is not that the aim was wrong — it never arrived.</p>`);
  } else {
    body.push(`<p>The banana arrived after <b>${fmt(v.t, 2)} s</b> and passed
      <b>${fmt(Math.abs(v.gap), 2)} m</b> ${v.kind === 'high' ? 'over' : 'under'} the
      monkey. Both had fallen the same <b>${fmt(v.fall, 2)} m</b> by then — the shared
      fall was never the problem. The aim was ${fmt(Math.abs(solved.params.theta - (aimAngle() ?? 0)), 1)}°
      ${v.kind === 'high' ? 'above' : 'below'} the line to the monkey, and that is
      exactly what it missed by.</p>`);
  }
  $('exdone-body').innerHTML = body.join('');

  const why = (v.why || []).map((k) => e.why[k]).filter(Boolean);
  $('exdone-real-h').textContent = why.length ? 'Why' : '';
  $('exdone-real-lead').textContent = '';
  $('exdone-why').innerHTML = why.map(([k, t]) => `<li><b>${k}</b> — ${t}</li>`).join('');
  $('exdone-caveat').textContent = e.caveat;
  $('exdone-close').textContent = e.close || 'See the diagram';
  $('exdone-all').hidden = true;      // there is no second view to offer here
  $('exdone').hidden = false;
}

/**
 * The range's ending: the claim, the size of it in the student's own numbers,
 * and an honest account of what the idealised model is leaving out.
 *
 * Every number here is read back off the run. Nothing on this card computes
 * anything — house rule 4 — and nothing on it claims the engine modelled air,
 * spin or a round Earth, because it did not.
 */
function showRangeDone() {
  const e = scenario.ending;
  const p = solved.params;
  const tF = traj.tFlight ?? traj.tMax;
  const range = isFinite(traj.range) ? traj.range : traj.horiz * tF;

  $('exdone-eyebrow').textContent = `Both rounds in the air for ${fmt(tF, 2)} s`;
  $('exdone-title').textContent = e.title;

  // The size of it, which is the part a grid of five numbers cannot say. Then
  // WHY, as the one line of algebra that settles it: the time of the fall has
  // no u in it anywhere, so there is no muzzle speed that could change it.
  $('exdone-body').innerHTML = `
    <p>The fired round covered <b>${fmt(range, 0)} m</b>. The released one covered
       <b>none</b>. Both were in the air for the same ${fmt(tF, 2)} s — so
       ${fmt(p.u, 0)} m s⁻¹ of muzzle speed bought <b>no extra hang time at all</b>.</p>
    <span class="ex-eq">${M`t^2 = (2h)/g = (2 × ${fmt(p.h, 2)})/${fmt(p.g, 2)}`},
      so ${M`t = ${fmt(tF, 2)}`} s</span>
    <p>There is no ${M`u`} in it. Firing adds velocity sideways, the two components
       are independent, and the sideways one has nothing to do with how long the
       fall takes. Try the other rounds: the first number changes every time and
       the second one never does.</p>`;

  $('exdone-real-h').textContent = e.realTitle;
  $('exdone-real-lead').textContent = e.realLead;
  $('exdone-why').innerHTML = e.why.map(([k, v]) => `<li><b>${k}</b> — ${v}</li>`).join('');
  $('exdone-caveat').textContent = e.caveat;
  $('exdone-close').textContent = e.close || 'See the diagram';
  $('exdone-all').hidden = false;
  $('exdone').hidden = false;
}

function hideDone() { $('done').hidden = true; $('exdone').hidden = true; }

function renderWorking() {
  if (!state.extras.working || !traj) return;
  const parts = [];
  if (state.markers?.obstacle) {
    const c = obstacleCheck(traj, state.markers.obstacle);
    parts.push(`<div class="verdict" data-ok="${c.ok}">${c.text}</div>`);
  }
  for (const s of buildWorking(traj, state.t)) {
    parts.push(`<div class="step"><div class="step-h">${s.title}</div>` +
      s.rows.map((r) => `<div class="eq"><div class="eq-f">${r.f}</div><div class="eq-s">${r.s}</div>${r.r ? `<div class="eq-r">${r.r}</div>` : ''}</div>`).join('') +
      (s.note ? `<div class="step-n">${s.note}</div>` : '') + '</div>');
  }
  $('working').innerHTML = parts.join('');
}

/* ── loop ───────────────────────────────────────────────────────────── */
function draw() {
  if (state.step !== 'flight' || !traj) { dirty = false; return; }
  const R = state.resolve ? resolveAt(traj, state.t) : null;
  const opts = { traj, second, ghost, t: state.t, show: state.show, fired: state.launched,
                 verdict: state.verdict, overview: state.overview,
                 hoverMark: state.hoverMark,
                 markers: state.markers || {}, scenario, secondLabel: scenario.second?.label,
                 resolve: R, hover: state.hover };
  // An exhibit is staged rather than surveyed: its own plate and its own scale
  // on each axis, because a strobe photograph is not a survey of a place.
  if (scenario?.exhibit) exhibit.render($('scene'), cam, opts);
  else scene.render($('scene'), cam, opts);

  if (state.extras.graphs) {
    const P = palette();
    for (const spec of graphSpecs(traj, state.t, P)) drawGraph($(spec.canvas), spec);
  }
  renderHud(); renderWorking(); renderResolve(R);
  $('scrub').value = traj.tMax ? state.t / traj.tMax : 0;
  dirty = false;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.step === 'flight' && state.playing && traj) {
    state.t += dt * state.rate;
    const tStop = Math.max(traj.tMax, scenario?.exhibit && second ? second.tMax : 0);
    if (state.t >= tStop) {
      state.t = tStop; state.playing = false; setPlayIcon(false);
      showEnding();                     // only ever on a flight that ran its course
    }
    dirty = true;
  }
  // the camera travels rather than teleporting; while it is moving, so is
  // the frame
  if (state.step === 'flight' && scene.easeCamera(cam, dt)) dirty = true;
  if (dirty) draw();
  requestAnimationFrame(frame);
}

/* ── options ────────────────────────────────────────────────────────── */
function buildOptions() {
  const mk = (list, store) => list.map((s) =>
    `<label class="ck"><input type="checkbox" data-k="${s.key}"${store[s.key] ? ' checked' : ''}>
     <span class="box-ck"></span>${s.label}</label>`).join('');
  $('shows').innerHTML = mk(SHOWS, state.show);
  $('extras').innerHTML = mk(EXTRAS, state.extras);
  for (const i of $('shows').querySelectorAll('input'))
    i.addEventListener('change', () => { state.show[i.dataset.k] = i.checked; dirty = true; });
  for (const i of $('extras').querySelectorAll('input'))
    i.addEventListener('change', () => {
      state.extras[i.dataset.k] = i.checked;
      $('graphs-wrap').hidden = !state.extras.graphs;
      $('working-wrap').hidden = !state.extras.working;
      dirty = true;
    });
}

/* ── chrome ─────────────────────────────────────────────────────────── */
function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  $('theme-btn').textContent = mode === 'dark' ? 'Light' : 'Dark';
  try { localStorage.setItem('suvat-theme', mode); } catch {}
  dropToneCache();
  dirty = true;
}

wireLive();
$('brand').addEventListener('click', () => go('scenario'));
for (const b of $('steps').querySelectorAll('.navstep')) {
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-disabled') === 'true') return;
    closeResolve();
    go(b.dataset.s);
  });
}
$('back-1').addEventListener('click', () => go('scenario'));
$('back-2').addEventListener('click', () => { hideDone(); closeResolve(); go('values'); });
$('launch').addEventListener('click', launch);
$('intro-go').addEventListener('click', () => { closeIntro(); launch(); });
$('guard-toggle').addEventListener('click', () => setGuard(!state.guard));
$('guard-ck').addEventListener('change', (e) => setGuard(e.target.checked));
$('pace-go').addEventListener('click', runFlight);
$('pace-back').addEventListener('click', () => { closePace(); go('values'); });
$('pace-rate').addEventListener('input', (e) => {
  state.rate = parseFloat(e.target.value);
  syncRate();
});
$('intro-values').addEventListener('click', () => { closeIntro(); go('values'); });
$('play').addEventListener('click', togglePlay);
const replay = () => { hideDone(); closeResolve(); state.t = 0; state.playing = true; setPlayIcon(true); dirty = true; };
$('replay').addEventListener('click', replay);
$('done-replay').addEventListener('click', replay);
$('done-close').addEventListener('click', hideDone);
$('done-values').addEventListener('click', () => { hideDone(); go('values'); });

$('exdone-replay').addEventListener('click', replay);
$('exdone-close').addEventListener('click', hideDone);
// THE PROOF, kept back until the end. One frame, both whole paths, and every
// exposure of both rounds — so the two columns of flashes are side by side and
// visibly falling in lockstep. It is squeezed sideways, and it says so in the
// footer, which is exactly why it is not the view you watch the flight in.
$('exdone-all').addEventListener('click', () => {
  state.overview = true; hideDone(); dirty = true;
});
$('scrub').addEventListener('input', (e) => {
  if (!traj) return;
  hideDone();
  state.playing = false; setPlayIcon(false);
  state.t = parseFloat(e.target.value) * traj.tMax; dirty = true;
});
$('res-close').addEventListener('click', closeResolve);
$('res-go').addEventListener('click', () => {
  closeResolve();
  if (traj && state.t < traj.tMax - 1e-6) { state.playing = true; setPlayIcon(true); }
  dirty = true;
});
for (const b of $('rate-seg').children) {
  b.addEventListener('click', () => {
    state.rate = parseFloat(b.dataset.rate);
    syncRate();                 // the card and the bar are one setting
  });
}
for (const b of $('band-seg').children) {
  b.addEventListener('click', () => {
    scene.setBand(cam, b.dataset.band);
    for (const x of $('band-seg').children) x.setAttribute('aria-pressed', String(x === b));
    dirty = true;
  });
}
$('bounce-ck').addEventListener('change', (e) => {
  state.bounce = e.target.checked;
  $('bounce-opts').hidden = !state.bounce;
  cam.fit = true; recompute(); dirty = true;
});
$('restitution').addEventListener('input', (e) => {
  state.restitution = parseFloat(e.target.value);
  $('rest-val').textContent = state.restitution.toFixed(2);
  cam.fit = true; recompute(); dirty = true;
});
$('theme-btn').addEventListener('click', () =>
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
$('options-btn').addEventListener('click', () => {
  state.options = !state.options;
  $('options-btn').setAttribute('aria-pressed', String(state.options));
  $('main').dataset.options = state.options ? 'on' : 'off';
  dirty = true;
});

document.addEventListener('keydown', (e) => {
  // The speed card first, and above the input guard: its slider IS an input,
  // and Enter on a slider means nothing, so it can mean "go".
  if (!$('pace').hidden) {
    if (e.key === 'Enter') { e.preventDefault(); runFlight(); }
    else if (e.key === 'Escape') { closePace(); go('values'); }
    return;
  }
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (state.step === 'values' && e.key === 'Enter' && !$('launch').disabled) { launch(); return; }
  if (state.step !== 'flight') return;
  if (e.key === 'Escape') { if (state.resolve) closeResolve(); else hideDone(); return; }
  if (e.key === 'r' || e.key === 'R') {
    if (state.resolve) closeResolve(); else if (state.launched) openResolve(state.t);
    return;
  }
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'ArrowRight') { hideDone(); state.playing = false; setPlayIcon(false); state.t = Math.min(traj.tMax, state.t + traj.tMax / 60); dirty = true; }
  else if (e.key === 'ArrowLeft')  { hideDone(); state.playing = false; setPlayIcon(false); state.t = Math.max(0, state.t - traj.tMax / 60); dirty = true; }
});

addEventListener('resize', () => {
  if (!cam.touched) cam.fit = true;
  dirty = true;
});
const pickScene = () => ({ markers: state.markers, scenario, traj, t: state.t,
                           fired: state.launched });
const resolveHooks = {
  // The INSTANT under the pointer, or null — not a bare yes/no. The ring and
  // the highlight have to land where the pointer actually is.
  hover(t) {
    const next = t == null ? null : { t };
    if ((state.hover?.t ?? null) !== (next?.t ?? null)) { state.hover = next; dirty = true; }
  },
  mark(kind) { if (state.hoverMark !== kind) { state.hoverMark = kind; dirty = true; } },
  click(t) { openResolve(t); },
};

scene.attachControls($('scene'), cam, () => { dirty = true; },
  pickScene,
  (kind, world) => {
    if (kind === 'obstacle') { state.markers.obstacle.x = Math.max(0.5, world.x); state.markers.obstacle.height = Math.max(0, world.y); }
    else if (kind === 'target') {
      state.markers.target.x = Math.max(0.5, world.x);
      state.markers.target.y = Math.max(0, world.y);
      // Dragging the monkey moves the aim, the flight and the verdict, so it
      // has to re-solve rather than only redraw.
      recompute();
    }
    else if (kind === 'heightLine') {
      state.markers.heightLine = scene.snapHeight(Math.max(0, world.y));
      syncLineBoxes();                    // the boxes follow the drag
    }
    dirty = true;
  },
  resolveHooks);

/* ── boot ───────────────────────────────────────────────────────────── */
let guard = null;
try { guard = localStorage.getItem('suvat-guard'); } catch {}
state.guard = guard !== 'off';         // on unless it was deliberately turned off

let saved = null;
try { saved = localStorage.getItem('suvat-theme'); } catch {}
applyTheme(saved || 'light');
buildScenarioScreen();
buildOptions();
go('scenario');
requestAnimationFrame(frame);

window.SUVAT = { state, get traj() { return traj; }, get solved() { return solved; },
                 cam, choose: chooseScenario, launch, runFlight, go,
                 showDone, hideDone, openResolve, closeResolve,
                 redraw() { recompute(); draw(); } };
