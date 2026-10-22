// app.js — three screens, in order: scenario, values, flight.
//
// The whole app is SUVAT. Screen two asks for the five quantities and nothing
// else beyond what the chosen situation genuinely needs. Launch stays disabled
// until the engine can actually determine the motion, and says why not.

import { solveLaunch } from './core/solve.js';
import { trajectory } from './core/trajectory.js';
import { flight, timeAbove, heightForTime, timeAtSpeed } from './core/projectile.js';
import { descent, solveDescent, descentWorking, resolveDescent } from './core/descent.js';
import { solveRoad, roadWorking } from './core/road.js';
import { intercept, corners } from './core/intercept.js';
import { recommend, paceNote } from './core/pace.js';
import { SCENARIOS, GROUPS, GRAVITY, byId } from './scenarios.js';
import { buildWorking, obstacleCheck, resolveAt } from './working.js';
import * as scene from './render/scene.js';
import * as exhibit from './render/exhibit.js';
import * as panes from './render/panes.js';
import { descentPanes, PRE } from './render/drop.js';
import * as range from './render/range.js';
import * as roadStage from './render/road.js';
import { siteFor } from './world/world.js';
import { nearestBranch } from './render/backdrops.js';
import { dropToneCache } from './render/world2d.js';
import { drawGraph, graphSpecs } from './render/graphs.js';
import { fmt, palette, clamp } from './render/util.js';
import { M, T, num } from './notation.js';
import { toApp } from './core/question.js';
import { createAsk } from './ai/ask.js';
import { readoutHTML } from './ai/readout.js';

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

/* ── how hard a ball bounces ─────────────────────────────────────────────
   The slider used to open at 0.7, which is a slider position rather than a
   measurement — and the one thing a student cannot do with a coefficient of
   restitution is guess a realistic one. A match football dropped onto firm
   ground is required to come back to between about two-thirds and three
   quarters of the height it fell from, and the height ratio is e², so e is
   about 0.8. That is where the control opens, it is named in the panel, and
   it is one click back from wherever the slider has been dragged.

   e is a property of the two surfaces, not of the field strength, so it does
   NOT follow the Earth / Moon / none chips. The same ball on the same ground
   on the Moon has the same e and simply takes longer over it. */
const EARTH_E = 0.8;

const state = {
  step: 'scenario', id: null,
  given: {}, mass: 1,
  // The parachute's own four, kept apart from `given` because they are not
  // three of the five: they describe three phases rather than one motion.
  descent: {},
  bounce: false, restitution: EARTH_E,
  t: 0, playing: false, launched: false, firedBefore: false,
  // The staging before the clock, in real seconds, or null when the clock is
  // the only thing running. See the pre-roll note in js/render/drop.js.
  pre: null,
  layout: 4,                     // how many panes, for a scenario that has them
  // 0.75x, AND IT STAYS THERE. Every fresh flight used to be handed a rate
  // worked out from its own duration — `recommend(tMax)` — so a short flight
  // opened at 0.16x and a long one at real time, and the number under the
  // stage changed every time you touched a value. That is a decision being
  // made for you, repeatedly, about something you did not ask to decide.
  // One speed, slightly under real time so a fast throw is still readable,
  // and the slider in the options panel for anyone who wants another.
  rate: 0.75, rateTouched: false,
  show: { path: true, velocity: true, apex: true, range: true, grid: false, ruler: true,
          // Equal time steps ON: the theme draws a flight as a curve with its
          // markers on it, and the spacing is the physics.
          components: false, ticks: true, acceleration: false },
  extras: { graphs: false, working: false, energy: false },
  options: false,
  resolve: false, hover: null, hoverMark: null,
  askT: null,                    // the instant the question named, if one did
  overview: false,
  aimed: true,                   // the hunter is pointing at the monkey
  guard: true,                   // stop the five being over-filled
};

const cam = scene.createCamera();
/* ── the window, for the scenarios that watch themselves in one ──────────
   A parachute drop is four views of one motion rather than one view with the
   graphs in a sidebar — see js/render/panes.js. The window keeps its own
   per-pane views, so zooming into the second the canopy works in survives a
   change of playback speed, a maximize and a restore. */
const win = panes.createWindow(4);
let paneSig = null;                 // the solve the panes were last built from
let scenario = null, solved = null, traj = null, second = null, ghost = null, dirty = true;

/** Does this scenario replace the single view with the pane window? */
const windowed = () => !!scenario?.descent;

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
  if (s.descent) return descentThumb(s);
  if (s.road) return roadThumb(s);
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

/**
 * The parachute's sketch: the drop as a line, marked at equal times.
 *
 * A descent has no width, so the shape of the path says nothing — the whole
 * story is in the SPACING. The dots are equally spaced in time, so they are
 * far apart at the top where she is in free fall, crowd together through the
 * canopy's deceleration, and then march down evenly at constant speed. That is
 * the velocity–time graph, read off a picture of the fall itself, and it is
 * what tells this card apart from Dropped at a glance.
 *
 * Drawn from the scenario's own illustrative numbers, like every other card.
 * Nothing here is pre-filled into the boxes.
 */
/* A road card: the road, A and B, and where the vehicle is at equal steps of
   time — the gaps widen because it is speeding up, which is the scenario. */
function roadThumb(s) {
  const r = solveRoad(s.params);
  if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
  const f = r.f, X = (x) => 14 + (x / s.params.s) * 92;
  const dots = [];
  for (let i = 0; i <= 10; i++) {
    dots.push(`<circle cx="${X(f.pos((i / 10) * f.tMax).x).toFixed(1)}" cy="40" r="2.3" fill="var(--vel)"/>`);
  }
  const postAt = (x, l) => `<line x1="${X(x).toFixed(1)}" y1="44" x2="${X(x).toFixed(1)}" y2="20"
      stroke="var(--ink-faint)" stroke-width="1.4"/>
    <rect x="${(X(x) - 5).toFixed(1)}" y="12" width="10" height="9" rx="2" fill="var(--ink-faint)"/>`;
  return `<svg viewBox="0 0 120 60" aria-hidden="true">
    <rect x="2" y="42" width="116" height="6" fill="var(--border-soft)"/>
    <line x1="2" y1="42" x2="118" y2="42" stroke="var(--border)" stroke-width="1"/>
    <line x1="4" y1="45" x2="116" y2="45" stroke="var(--border)" stroke-width="0.8" stroke-dasharray="5 4"/>
    ${postAt(0)}${postAt(s.params.s)}
    <line x1="${X(s.params.s / 2).toFixed(1)}" y1="44" x2="${X(s.params.s / 2).toFixed(1)}" y2="24"
      stroke="var(--mark)" stroke-width="1.4" stroke-dasharray="3 2.5"/>
    ${dots.join('')}
  </svg>`;
}
function descentThumb(s) {
  const r = descent({ h: s.params.h, g: s.params.g || 9.81, ...s.descent });
  if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
  const f = r.f, h = s.params.h;
  const X = 60;
  const Y = (y) => 6 + (1 - y / (h * 1.04)) * 45.5;

  const marks = [];
  for (let i = 0; i <= 15; i++) {
    const t = (i / 15) * f.tMax;
    marks.push(`<circle cx="${X}" cy="${Y(f.pos(t).y).toFixed(1)}" r="2.1" fill="var(--vel)" opacity=".95"/>`);
  }
  // the canopy, at the height it opens
  const yo = Y(r.phases[0].y1);
  const canopy = `<path d="M${X - 13} ${yo.toFixed(1)} A 13 9 0 0 1 ${X + 13} ${yo.toFixed(1)}"
      fill="none" stroke="var(--mark)" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M${X - 13} ${yo.toFixed(1)} L${X} ${(yo + 7).toFixed(1)} M${X + 13} ${yo.toFixed(1)} L${X} ${(yo + 7).toFixed(1)}"
      fill="none" stroke="var(--mark)" stroke-width="1" opacity=".8"/>`;

  return `<svg viewBox="0 0 120 60" aria-hidden="true">
    <line x1="2" y1="51.5" x2="118" y2="51.5" stroke="var(--border)" stroke-width="1"/>
    <line x1="${X}" y1="${Y(h).toFixed(1)}" x2="${X}" y2="51.5"
          stroke="var(--vel)" stroke-width="1.2" opacity=".42"/>
    ${marks.join('')}
    ${canopy}
    <circle cx="${X}" cy="${Y(h).toFixed(1)}" r="2.6"
            fill="var(--card)" stroke="var(--vel)" stroke-width="1.6"/>
    <circle cx="${X}" cy="51.5" r="3.4" fill="var(--vel)"/>
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
  state.descent = {};
  state.mark = undefined;            // the point a road question times it at
  state.markers = JSON.parse(JSON.stringify(scenario.markers || {}));
  $('ask-at').hidden = !!scenario.road;
  state.firedBefore = false; ghost = null;
  state.aimed = true;                  // the hunter starts pointing at it
  // A NEW SCENARIO IS A NEW PLACE, so the view starts framed on it. Launching
  // asks for a fit of its own, which covered every scenario that goes through
  // the values screen — but an experiment opens straight onto the stage and
  // never launches, so picking the beach after the stadium drew the beach at
  // the stadium's scale: a two-metre throw across a frame 250 m wide.
  //
  // Twice, because the frame it is fitting to is about to change size: the
  // live sliders appear or disappear with the scenario, the stage bar grows a
  // row or loses one, and the canvas is told its new height only after the
  // browser has laid the page out. The first fit frames the canvas that is
  // there now, the second one the canvas that is there a frame later.
  scene.fitView(cam);
  requestAnimationFrame(() => { scene.fitView(cam); dirty = true; });
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
  } else {
    // buildLive() runs for EVERY scenario now, not only the exhibits. It is
    // the one place that decides which stage controls this situation can
    // honour — the bounce block is hidden on three of them — and skipping it
    // on the way out of one of those left that answer in place for whatever
    // was picked next.
    buildLive();
    go('values');
  }
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

/* ── step 2 · the five values ─────────────────────────────────────────
   Or, for the parachute, four numbers that are not three of the five — see
   buildDescentScreen below for why it gets a screen of its own. */
function buildValuesScreen() {
  if (scenario?.descent) return buildDescentScreen();
  $('suvat').hidden = false;
  valuesVoice(scenario.road ? 'road' : false);
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

  if (scenario.road) return buildRoadExtras();
  // Only what this situation genuinely cannot do without.
  const rows = [];
  if (!scenario.noAngle && !scenario.lockAngle) {
    rows.push(`<div class="xrow wide" data-x="theta">
      <label for="x-theta">Angle of projection θ (°)</label>
      <div class="angle-ctl">
        <svg class="angle-dia" id="theta-dia" viewBox="0 0 210 164" aria-hidden="true">
          <path id="td-wedge" fill="var(--accent)" opacity=".15"></path>
          <line x1="${AD.ox}" y1="${AD.oy}" x2="202" y2="${AD.oy}" stroke="var(--ink-faint)"
                stroke-width="1.5" stroke-dasharray="5 4"></line>
          <line x1="${AD.ox}" y1="10" x2="${AD.ox}" y2="154"
                stroke="var(--border)" stroke-width="1.4"></line>
          <!-- THE COMPONENTS USED TO BE DRAWN HERE, head to tail: a dashed
               line out along the axis to the foot of the vector, and a solid
               one standing up from the foot to the tip. They were the right
               figure in the wrong place. This control sets ONE quantity, the
               direction, and the vertical line the vector's tip dropped onto
               the axis was the most prominent mark in a picture of an angle —
               a right-angled triangle competing with the thing being set, and
               the dashed half of it lying along an axis that is already
               dashed. The resolve card on the flight draws that figure
               properly, against a motion, with both components labelled and
               numbered. Here it is an angle: an axis, a vector, and the angle
               between them. -->
          <path id="td-arc" fill="none" stroke="var(--accent)" stroke-width="1.8"></path>
          <!-- A VECTOR, not a line. It has a head, and its LENGTH NEVER
               CHANGES: what the control alters is the direction, so the
               direction is the only thing allowed to move. The old ray was
               drawn out to whichever frame edge it met first, which made it
               longest at 0° and shortest at 45° — a picture of u changing. -->
          <line id="td-ray" stroke="var(--vel)" stroke-width="3.4" stroke-linecap="round"></line>
          <path id="td-head" fill="var(--vel)"></path>
          <circle cx="${AD.ox}" cy="${AD.oy}" r="3.8" fill="var(--vel)"></circle>
          <text id="td-ang" text-anchor="middle" fill="var(--accent)"></text>
          <text id="td-u" text-anchor="middle" fill="var(--vel)">${T`u`}</text>
        </svg>
        <div class="angle-set">
          <input id="x-theta" type="text" inputmode="decimal" autocomplete="off"
                 value="${state.theta == null ? '' : fmt(state.theta, 2)}" placeholder="—"
                 aria-label="Angle of projection in degrees">
          <input id="theta-slider" type="range" min="${thetaRange().min}" max="${thetaRange().max}" step="0.5"
                 value="${state.theta ?? clamp(0, thetaRange().min, thetaRange().max)}"
                 aria-label="Angle of projection">${scenario.straightUp ? `
          <button type="button" class="chip theta-up" id="theta-up"
                  aria-pressed="${state.theta === 90}">Straight up · 90°</button>` : ''}
        </div>
      </div>
      <p class="xhint" id="x-theta-hint">${OPTIONAL_HINT}${
        thetaRange().min < 0 ? ` ${thetaWhy()}` : ''}</p>
      <div class="angle-say" id="theta-say"></div></div>`);
  }
  rows.push(`<div class="xrow" data-x="h"><label for="x-h">Launch height h (m)</label>
    <input id="x-h" type="number" step="any" value="${state.h ?? ''}" placeholder="—">
    <p class="xhint">${OPTIONAL_HINT}</p></div>`);
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

/* ── the two questions the screen can ask ────────────────────────────────
   "What do you already know?" is the right question for every scenario where
   the motion has one acceleration, which is all of them but one. A parachute
   drop has three, so the five boxes would be asking about a stretch of the
   fall without saying which — and the honest question is a different one.
   The wording lives in index.html and is read back out of it here, so there
   is one copy of the default and no chance of the two drifting apart. */
const VOICE = { el: null };
function valuesVoice(descentMode) {
  if (!VOICE.el) {
    VOICE.el = {
      h: document.querySelector('#screen-values .h-big'),
      sub: document.querySelector('#screen-values .h-sub'),
    };
    VOICE.was = { h: VOICE.el.h.innerHTML, sub: VOICE.el.sub.innerHTML };
  }
  VOICE.el.h.innerHTML = descentMode ? 'How is the jump set up?' : VOICE.was.h;
  if (descentMode === 'road') {
    VOICE.el.sub.innerHTML = 'Any three of the five give you the other two. Here <b>a</b> is the '
      + 'vehicle\u2019s own acceleration, not g — and braking is a negative one.';
    return;
  }
  VOICE.el.sub.innerHTML = descentMode
    ? 'Four numbers, and none of them is one of the five. The fall is in three '
      + 'phases and the five equations are applied to <b>each phase in turn</b> — '
      + 'which is the whole reason this question gets set.'
    : VOICE.was.sub;
}

/* ── the parachute's own four ────────────────────────────────────────────
   The five boxes are deliberately not offered. They describe a stretch of
   constant acceleration, and the point of this scenario is that the descent
   is three such stretches with different accelerations — so a single row of
   s, u, v, a, t could only be a question about one of them, with nothing on
   screen to say which. What is asked for instead is the SETUP: where she
   jumps from, when she pulls, how hard the canopy pulls back, and what it
   settles to. The engine works out all five for each phase from those, and
   the ending card shows them as three rows of five.

   Nothing is pre-filled, as everywhere else. The hints carry the real
   magnitudes instead, because a student who has never seen the question has
   no idea whether a canopy pulls 2 m s⁻² or 200. */
const DESCENT_ROWS = [
  { k: 'h', id: 'x-h', label: 'Height she jumps from h (m)',
    hint: 'A display team leaves the aircraft far higher than anything that fits on '
      + 'one screen; a hundred metres or so shows the whole descent at once.' },
  { k: 'tOpen', id: 'x-open', label: 'Free fall before the canopy opens (s)',
    hint: 'Long enough that she is really moving. From a hundred metres there are '
      + 'about four and a half seconds of fall to spend.' },
  { k: 'aChute', id: 'x-chute', label: 'Deceleration once it is open (m s⁻²)',
    hint: 'An opening is violent — somewhere around 20 to 30 m s⁻², which is two or '
      + 'three times g, upwards.' },
  { k: 'vTerm', id: 'x-vterm', label: 'Steady speed under the canopy (m s⁻¹)',
    hint: 'About 5 to 7 m s⁻¹ under a sport canopy: the speed you land at stepping '
      + 'off a two-metre wall.' },
];

function buildDescentScreen() {
  // The five boxes, the over-filling guard and the which-motion band all
  // belong to a one-acceleration solve. None of them has anything to say
  // here, and a control with nothing to say is worse than no control.
  $('suvat').innerHTML = '';
  $('suvat').hidden = true;
  $('guard').hidden = true;
  $('mode-say').innerHTML = '';
  valuesVoice(true);

  const val = (k) => (k === 'h' ? state.h : state.descent[k]);
  const rows = DESCENT_ROWS.map((r) => `
    <div class="xrow" data-x="${r.k}"><label for="${r.id}">${r.label}</label>
      <input id="${r.id}" type="text" inputmode="decimal" autocomplete="off"
             value="${val(r.k) ?? ''}" placeholder="—" aria-label="${r.label}">
      <p class="xhint">${r.hint}</p></div>`);
  rows.push(`<div class="xrow"><label>Gravitational field</label><div class="chips" id="g-chips">${
    GRAVITY.map((x) => `<button class="chip" data-g="${x.g}" aria-pressed="${state.given.g === x.g}">${x.label} ${x.g}</button>`).join('')
  }</div>
    <p class="xhint">The free fall is the only phase this governs. The other two are
      set by the canopy, and the engine uses the figures you gave for them.</p></div>`);
  $('extra').innerHTML = rows.join('');

  for (const r of DESCENT_ROWS) {
    $(r.id).addEventListener('input', (e) => {
      const v = parseValue(e.target.value);
      // A fraction is accepted here as everywhere else — papers quote a half
      // second as often as 0.5.
      const ok = v !== undefined && isFinite(v);
      if (r.k === 'h') state.h = ok ? v : undefined;
      else if (ok) state.descent[r.k] = v;
      else delete state.descent[r.k];
      recompute();
    });
  }
  for (const b of $('g-chips').querySelectorAll('.chip')) {
    b.addEventListener('click', () => {
      state.given.g = parseFloat(b.dataset.g);
      for (const x of $('g-chips').querySelectorAll('.chip')) x.setAttribute('aria-pressed', String(x === b));
      recompute();
    });
  }
  recompute();
}

/* ── the road's one extra: a point to time it at ────────────────────────
   No angle, no height, no field. What a road question asks next is "how long
   to reach the mid-point of AB?" — so that is the one thing offered beside
   the five, and the engine answers it (js/core/road.js, timeToReach). */
function buildRoadExtras() {
  $('mode-say').innerHTML = '';
  const mid = state.mark === 'mid';
  $('extra').innerHTML = `<div class="xrow" data-x="mark"><label for="x-mark">A point to time it at, from A (m)</label>
    <input id="x-mark" type="text" inputmode="decimal" autocomplete="off"
           value="${mid || state.mark == null ? '' : fmt(state.mark, 2)}" placeholder="—">
    <div class="chips"><button class="chip" id="x-mid" aria-pressed="${mid}">The mid-point of AB</button></div>
    <p class="xhint">${OPTIONAL_HINT} The engine works out when it gets there.</p></div>`;
  $('x-mark').addEventListener('input', (e) => {
    const v = parseValue(e.target.value);
    state.mark = v !== undefined && isFinite(v) ? v : undefined;
    $('x-mid').setAttribute('aria-pressed', 'false');
    recompute();
  });
  $('x-mid').addEventListener('click', () => {
    const on = state.mark !== 'mid';
    state.mark = on ? 'mid' : undefined;
    $('x-mid').setAttribute('aria-pressed', String(on));
    $('x-mark').value = '';
    recompute();
  });
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
  if (scenario?.descent) return recomputeDescent();
  if (scenario?.road) return recomputeRoad();
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
    if (!working()) {
      // Typeset maths arrives as markup, so every sink that can receive it takes
      // innerHTML. textContent here prints the tags at the student. See CLAUDE.md.
      msg.dataset.ok = 'false'; msg.innerHTML = solved.reason;
      $('notes').innerHTML = '';
      sayAngle();
    }
    btn.disabled = true; btn.textContent = 'Launch';
    traj = null; refreshSteps(); applyGuard(); return;
  }

  if (!working()) {
    msg.dataset.ok = 'true';
    msg.innerHTML = solved.derived.length
      ? `Ready. The rest comes out as:  ${solved.derived.join('  ·  ')}`
      : 'Everything needed is here.';
    showDerived(solved);
  }

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
  // Its label quotes a speed, so it waits with the rest of the prose — but
  // only the LABEL waits. Everything below this line still has to run on
  // every event: the figure is drawn from the engine's answer when the box is
  // blank, and a return here would freeze it mid-drag.
  if (!working()) {
    btn.textContent = solved.params.u < 0.05
      ? 'Release it'                    // a drop has no launch speed to quote
      : `Launch at ${fmt(solved.params.u, 1)} m s⁻¹`;
  }
  showAbove();                   // the line's hint quotes the flight it belongs to
  sayBounce();                   // and so does the restitution slider
  // THE BAR'S SLIDER HAS TO BE RIGHT THE MOMENT THERE IS A FLIGHT, not only
  // once the speed card has been through. The two experiments never open that
  // card — they arrive on the stage already set up — so until the slider lived
  // in the bar they ran at whatever state.rate happened to be, which was real
  // time, which for a round landing in half a second is a blink. The
  // recommendation no longer applies itself to every fresh flight: see the
  // note on `rate` in the state above. It is still what the pin points at and
  // what the speed card's own line offers, so the advice is still there — it
  // just does not reach in and change the speed under you.
  syncRate();
  refreshSteps();                // and Flight is reachable now that one exists
  applyGuard();
  if (!working()) sayAngle();
  if (state.theta === undefined) drawAngle(undefined);   // show what it found
  dirty = true;
}

/**
 * The road, solved — js/core/road.js, the five with nothing added. It answers
 * in the same shape as solveLaunch, so the message, the guard, the HUD, the
 * transport and the done card carry on without knowing which engine replied.
 */
function recomputeRoad() {
  const g = state.given;
  solved = solveRoad({ s: g.s, u: g.u, v: g.v, a: g.g, t: g.t, mark: state.mark });
  const msg = $('solve-msg'), btn = $('launch');
  if (!solved.ok) {
    if (!working()) { msg.dataset.ok = 'false'; msg.innerHTML = solved.reason; $('notes').innerHTML = ''; }
    btn.disabled = true; btn.textContent = 'Drive';
    traj = null; second = null; state.verdict = null; state.markers = {};
    refreshSteps(); applyGuard(); dirty = true; return;
  }
  if (!working()) {
    msg.dataset.ok = 'true';
    msg.innerHTML = `Ready. The rest comes out as:  ${solved.derived.join('  ·  ')}`;
    showDerived(solved);
  }
  traj = solved.f;
  traj.mass = state.mass;
  second = null; state.verdict = null; state.caught = null;
  // What the stage marks: the point, and the time the engine found for it.
  state.markers = solved.moment ? { mark: { s: solved.moment.s, t: solved.moment.t, mid: solved.moment.mid } } : {};
  btn.disabled = false;
  btn.textContent = 'Drive';
  syncRate(); refreshSteps(); applyGuard(); dirty = true;
}

/**
 * The parachute, solved.
 *
 * Deliberately a separate route rather than a flag through solveLaunch: that
 * function's whole contract is "any three of the five determine the other
 * two", and a three-phase descent has no such five. js/core/descent.js
 * answers in the same shape, so everything downstream of here — the message,
 * the notes, the HUD, the camera, the scrubber — carries on without knowing
 * which engine replied.
 */
function recomputeDescent() {
  solved = solveDescent({ h: state.h, g: state.given.g, ...state.descent });
  const msg = $('solve-msg'), btn = $('launch');

  if (!solved.ok) {
    msg.dataset.ok = 'false'; msg.innerHTML = solved.reason;
    $('notes').innerHTML = '';
    btn.disabled = true; btn.textContent = 'Jump';
    traj = null; second = null; state.verdict = null;
    refreshSteps(); dirty = true; return;
  }

  msg.dataset.ok = 'true';
  msg.innerHTML = `Ready. The rest comes out as:  ${solved.derived.join('  ·  ')}`;
  showDerived(solved);

  traj = solved.f;
  // Mass appears in exactly two places in this app, and neither of them is
  // the geometry: kinetic energy and momentum. trajectory() takes it as a
  // parameter; a descent is handed it the same way.
  traj.mass = state.mass;
  second = null; state.verdict = null; state.caught = null;

  btn.disabled = false;
  btn.textContent = 'Jump';
  refreshSteps(); dirty = true;
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
    // The engine's own derivation sometimes opens with "from s = …", which
    // dropped straight after a full stop read as a broken sentence — and
    // then said "from" twice. It is given something to hang off instead,
    // which works whichever form the derivation takes.
    bits.push(`<b>Worked out, not needed.</b> The engine had everything it needed without
      it — ${solved.filled.theta}. Leaving this box blank is a normal thing to do, and
      usually the right one.`);
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

  // NOTHING TO SAY UNTIL IT IS DOING SOMETHING. The idle state used to read
  // "Fill in any three. The rest will close once the motion is determined.",
  // directly under a subtitle already saying any three of the five give you
  // the other two — the same sentence twice, and an offer to unlock boxes
  // that were not locked. The row only appears once the guard has acted.
  const row = $('guard');
  if (!state.guard) {
    say.textContent = 'Extra values are allowed. The engine will still refuse ones that contradict.';
    btn.textContent = 'Guard them';
    row.hidden = false;
  } else if (shut) {
    say.textContent = `The motion is already determined, so the ${shut === 1 ? 'remaining box is' : `remaining ${shut} boxes are`} closed — anything typed there could only repeat or contradict what is here.`;
    btn.textContent = 'Let me fill them anyway';
    row.hidden = false;
  } else {
    row.hidden = true;
  }
}

/* ── what the restitution did ────────────────────────────────────────────
   A coefficient on its own means nothing to look at. The line under the
   slider quotes the engine's own first bounce — the height it fell from and
   the height it came back to — so the number on the slider has a consequence
   attached to it. Nothing here works that out: trajectory.js builds a fresh
   flight for each bounce and this reads the apex off the second one. */
function setRestitution(e) {
  state.restitution = e;
  $('rest-val').textContent = e.toFixed(2);
  $('rest-earth').hidden = Math.abs(e - EARTH_E) < 1e-9;
  cam.fit = true; recompute(); dirty = true;
}

function sayBounce() {
  const el = $('rest-say');
  if (!el) return;
  if (!state.bounce) { el.textContent = ''; return; }
  const seg = traj?.segments?.[1];
  if (!seg) {
    el.textContent = 'This flight has no bounce to shape — it either never lands or has stopped moving by the time it does.';
    return;
  }
  // apexHeight is already floored at the launch height, so a ball thrown
  // downwards reports the height it was thrown from rather than a rise it
  // never made.
  el.textContent = `It fell from ${fmt(traj.apexHeight, 2)} m and the first bounce takes it back to `
    + `${fmt(seg.f.apexHeight, 2)} m, then ${traj.bounces === 1 ? 'stops' : `${traj.bounces - 1} more`}.`;
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
  // THE CAMERA AND THE SHOW LIST WORK EVERYWHERE NOW. They used to be hidden
  // on an exhibit, and the reason was sound at the time: exhibit.js recomputes
  // its own projection every frame and never reads cam.scale, so framing the
  // whole flight was inert on it, and `show` was consulted once in that whole
  // file for a key that is not in state.show, so none of the seven checkboxes
  // did anything either. Offering a control that cannot work is worse than
  // not offering it.
  //
  // Both exhibits are drawn by scene.js now — same camera, same drag, same
  // seven options — so there is nothing left to hide.
  const ex = !!scenario?.exhibit;
  const wd = !!scenario?.descent;
  $('fit-btn').hidden = false;
  // THE SEVEN SHOW OPTIONS ARE THE DIAGRAM'S, and in the window there is no
  // diagram for them to be about: no components to resolve on a vertical
  // fall, no metre grid — graph axes are a graph, not the metre grid — and no
  // range to bracket. Same reason the bounce block is hidden: a control that
  // cannot do anything is worse than no control.
  $('shows').previousElementSibling.hidden = wd;      // its "Show" heading
  $('shows').hidden = wd;
  // And two of the three extras: the sidebar's three small graphs are the
  // window's own three panes at a worse size, and energy and momentum are
  // readouts in a HUD the window does not have.
  for (const k of ['graphs', 'energy']) {
    const box = $('extras').querySelector(`input[data-k="${k}"]`);
    if (!box) continue;
    box.closest('.ck').hidden = wd;
    if (wd && box.checked) { box.checked = false; state.extras[k] = false; }
  }
  if (wd) { $('graphs-wrap').hidden = true; }
  // A bullet does not bounce, a monkey is not a ball, and a parachutist under
  // a canopy does not bounce either — so the setting is not offered on any of
  // the three. It used to be an inline checkbox in the stage bar; it is a
  // block in the options panel now, and the same reason applies to it there.
  $('bounce-wrap').hidden = ex || !!scenario?.descent || !!scenario?.road;
  // A level road has no height, no greatest height and no components to
  // resolve, so those three of the seven are not offered there.
  for (const k of ['components', 'apex', 'ruler', 'range']) {
    const box = $('shows').querySelector(`input[data-k="${k}"]`);
    if (box) box.closest('.ck').hidden = !!scenario?.road;
  }
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
/**
 * ONE SENTENCE, UNDER EVERY OPTIONAL BOX, WORD FOR WORD THE SAME.
 *
 * The angle box used to carry three separate facts: that it was optional,
 * what the engine would do without it, and that the range was −90° to 90°
 * with negative meaning downwards. All three were true and none of them was
 * what a student standing in front of an exam question needs, which is
 * permission not to invent a number. The engine's behaviour is said by the
 * band above the box and by the line underneath it, both of which appear the
 * moment there is something to report; the range is enforced by the slider
 * and the clamp, so stating it was belt and braces.
 *
 * What is left is the rule, and the rule is the same for every optional
 * value on this screen, so it is written once.
 */
/* ── a control being dragged is not a control being read ─────────────────
   Every event from the angle slider ran a full recompute, and a full
   recompute rewrites four blocks of prose with numbers in them: what the
   engine worked out, its assumptions, which kind of motion is being solved,
   and how the angle was recovered — plus the Launch button, which quotes a
   speed. Sixty times a second, under a thumb that is still moving, that is
   four paragraphs reflowing and five numbers rattling, and none of it can be
   read while it is happening. It is the single noisiest thing on the screen
   and it is noisy exactly when somebody is trying to look at the picture.

   So the SOLVE still runs on every event — Launch has to be right, and the
   figure is drawn from the engine's own answer when the box is blank — and
   only the SAYING of it waits for the control to be still. One sixth of a
   second after the last movement everything catches up at once. Let go and
   it is already there; drag, and the screen holds still around the one thing
   you are moving. */
const CALM = 160;
let calmTimer = null;

/** True while a control is still being worked, so prose should hold. */
const working = () => calmTimer !== null;

/** Run it once the control has been still for a moment, and only then. */
function whenStill(fn) {
  clearTimeout(calmTimer);
  calmTimer = setTimeout(() => { calmTimer = null; fn(); }, CALM);
}

const OPTIONAL_HINT = '<b>Optional — only enter it if the question gives it.</b>';

/* ── WHICH ANGLES THIS SITUATION ALLOWS ─────────────────────────────────
   ±90° was the only limit, and ±90° is the limit of the MODEL rather than of
   any particular throw. Past 90° the launch is backwards, which nothing here
   describes — but well inside that, most scenarios have a narrower range
   still, and offering the rest is offering a flight that does not exist:

     Simple arc          from the ground, so upwards only. A downward angle
                         puts the ball under the floor before it has gone
                         anywhere, and flat never leaves the ground at all.
     Up and off a platform   the card says up. Down off the same platform is a
                         different card, and comparing the two is the point.
     Down and off a platform  the one place a negative angle IS the question.
     Monkey vs Hunter    the second place, for a different reason: the aim
                         follows the monkey, and a monkey below the muzzle has
                         to be aimed down at.

   A scenario states its own range in js/scenarios.js. The default is upwards
   only, because a downward throw is a deliberate setup rather than something
   to arrive at by dragging a slider past zero.

   THE CAP STILL BELONGS HERE, at the boundary, and not in the engine:
   solve.js derives θ by atan2 and by the range equation and can legitimately
   land outside a scenario's range, and clamping there would break a correct
   answer. js/core/ is left alone. */
const THETA_RANGE = { min: 0, max: 90 };
const thetaRange = () => scenario?.theta ?? THETA_RANGE;

/** Why this scenario stops where it does, in one sentence a student can use. */
function thetaWhy() {
  const { min, max } = thetaRange();
  if (max <= 0) return 'This one is thrown <b>below</b> the horizontal — that is the whole question, so the angle runs from 0° down to −90°.';
  if (min > 0) return 'Launched from the ground, so it has to go <b>up</b>: flat never leaves the floor and a downward angle starts underneath it.';
  if (min === 0) return 'Up or flat off the platform. For a throw aimed <b>downwards</b>, use <b>Down and off a platform</b> — same platform, negative angle.';
  return 'Aimed at the monkey, so it follows wherever the monkey hangs — below the horizontal included.';
}

function wireAngle() {
  const box = $('x-theta'), sld = $('theta-slider');
  if (!box) return;
  angleShown = null;              // a fresh figure arrives at its angle, not from zero

  const set = (v, fromBox) => {
    state.theta = v;
    // TRIMMED, NOT PADDED, WHEN THE APP IS THE ONE TYPING. The slider steps in
    // halves, so two fixed places made the box read 32.50, 33.00, 33.50 — a
    // trailing zero flickering on and off is the loudest digit on the screen
    // and it is carrying no information at all. Blur still pads it to two.
    if (!fromBox) box.value = v == null ? '' : num(v, 2, { trim: true });
    if (sld) sld.value = String(v ?? 0);
    $('theta-up')?.setAttribute('aria-pressed', String(v === 90));
    drawAngle(v);
    recompute();
  };
  // THROWN STRAIGHT UP IS AN ANGLE TOO. "How long is it more than 14.7 m
  // above O?" is asked of a vertical throw at least as often as of an arc,
  // and a slider is a poor way to land on exactly 90°.
  $('theta-up')?.addEventListener('click', () => set(90, false));

  box.addEventListener('input', (e) => {
    const v = parseValue(e.target.value);
    const hint = $('x-theta-hint');
    if (v === undefined) { say(hint, false, OPTIONAL_HINT); set(undefined, true); return; }
    const { min, max } = thetaRange();
    if (!isFinite(v)) {
      say(hint, true, `That is not an angle. Degrees, between ${M`${num(min, 0)}`}° and ${M`${num(max, 0)}`}°.`);
      return;
    }
    if (v < min || v > max) {
      // Say what was done and why. Rewriting the box under the cursor of
      // someone who is still typing is how a control loses their trust.
      const capped = clamp(v, min, max);
      say(hint, true, `This one takes ${M`${num(min, 0)}`}° to ${M`${num(max, 0)}`}°, so `
        + `${M`${num(capped, 0)}`}° is what gets used. ${thetaWhy()}`);
      set(capped, true);
      return;
    }
    say(hint, false, OPTIONAL_HINT);
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
      : OPTIONAL_HINT);
  });

  // THE SLIDER IS THE ONE THAT NEEDS THE QUIET. It is the only control on the
  // screen that fires continuously, and `whenStill` is what keeps the four
  // blocks of prose from reflowing under a thumb that is still moving. When it
  // stops, everything says itself at once.
  sld?.addEventListener('input', (e) => {
    say($('x-theta-hint'), false, OPTIONAL_HINT);
    // THE QUIET IS ARMED BEFORE THE SOLVE, not after it. Armed after, the
    // first event of every gesture still found working() false and reflowed
    // all four blocks — so a drag was silent except for one lurch at the
    // moment it started, which is the moment you are most likely to be
    // looking. Armed first, nothing moves from the first pixel.
    whenStill(() => { recompute(); });
    set(parseFloat(e.target.value), false);
  });

  drawAngle(state.theta);
}

/* ── the angle diagram's geometry, in one place ──────────────────────────
   The launch point sits in the MIDDLE of the frame's height, not on its
   floor, because the control covers −90° to +90° and a downward throw needs
   as much room as an upward one. `len` is then the largest arrow that still
   fits pointing straight up or straight down, with room above it for the
   head and the label: at 76 the tip of a vertical throw lands 6 px short of
   the frame, which is as long as the arrow can be without touching it.

   `arc` is the radius the angle is drawn at, and it is deliberately more than
   half the vector: the angle is what this control sets, so it should be the
   thing the eye lands on rather than a token mark near the origin. The degree
   label rides just outside it, on the bisector, so it sits inside the angle
   it names at every value.

   It is declared here rather than written into the markup twice, because the
   template needs the origin and drawAngle needs all of it, and two copies of
   a coordinate is how a diagram ends up with its arrow nailed to the wrong
   point. */
const AD = { ox: 32, oy: 82, len: 76, arc: 40, head: 13 };

/**
 * The launch velocity, as a vector, at whatever the box currently holds.
 *
 * IT IS A VECTOR AND NOT A LINE, which is the whole of what changed. A line
 * says "this direction"; a vector with a head says "this much, this way", and
 * the quantity being set here is the direction of a velocity. So it has a
 * head, and it keeps a CONSTANT LENGTH as it swings — the old ray was drawn
 * out to whichever frame edge it met first, so it was longest at 0° and
 * shortest at 45°, which draws u changing when only θ did.
 *
 * It was resolved into its two components here as well, head to tail. It is
 * not any more: see the note in the markup. That figure belongs on the
 * flight, where the resolve card draws it against a motion, which is the
 * point: this is where the student meets it first.
 */
/* ── the angle arrives rather than appearing ─────────────────────────────
   DRAGGING THE SLIDER USED TO REPAINT THE FIGURE ON EVERY EVENT, straight to
   whatever the control had just reported. At sixty events a second that is
   not a vector turning, it is a vector flickering, and the degrees underneath
   it were a counter being rattled rather than a number you could read. Typing
   a value, or taking the engine's other angle, was worse again: the arrow was
   simply somewhere else on the next frame, and the thing a diagram is FOR —
   seeing 38° as a direction rather than reading it as a figure — never
   happened, because nothing ever moved.

   So `drawAngle` now sets a TARGET and the frame loop eases towards it, with
   the same `1 − e^(−kt)` the camera travels on. Everything in the figure
   rides the eased value, the degrees included, so the number counts round
   with the arrow instead of jumping ahead of it. Nothing about what is being
   SOLVED is eased: state.theta is exact from the first event, and the engine
   has the real number the whole way. This is the picture catching up.

   `angleShown` is null before the first paint and after the panel is rebuilt,
   which is how a fresh screen lands on its value instead of sweeping up to it
   from zero. */
let angleWant = { theta: undefined }, angleShown = null;

function drawAngle(theta) {
  angleWant = { theta };
  if (angleShown == null) easeAngle(1);    // a first paint has nothing to travel from
}

/** Where the figure is being asked to point: the box, or the engine's answer. */
function angleTarget() {
  const own = isFinite(angleWant.theta);
  if (own) return angleWant.theta;
  return solved?.ok && isFinite(solved.params.theta) ? solved.params.theta : null;
}

function easeAngle(dt) {
  if (!$('td-ray')) { angleShown = null; return false; }
  const want = angleTarget();
  if (want == null) {
    if (angleShown === null) { paintAngle(undefined); return false; }
    angleShown = null; paintAngle(undefined); return false;
  }
  if (angleShown == null) { angleShown = want; paintAngle(want); return false; }
  const d = want - angleShown;
  // Below a twentieth of a degree there is nothing left to see, so it lands
  // exactly rather than creeping at it for ever.
  if (Math.abs(d) < 0.05) {
    if (angleShown !== want) { angleShown = want; paintAngle(want); }
    return false;
  }
  angleShown += d * (1 - Math.exp(-dt * 15));
  paintAngle(angleShown);
  return true;
}

function paintAngle(theta) {
  const ray = $('td-ray'), arc = $('td-arc'), wedge = $('td-wedge');
  if (!ray) return;
  const head = $('td-head');
  const angT = $('td-ang'), uT = $('td-u');
  // WITH THE BOX BLANK, DRAW WHAT THE ENGINE FOUND. Leaving the diagram flat
  // while the panel underneath says "the engine recovered it as 20.4°" makes
  // the two disagree, and the picture is the part that gets believed.
  //
  // WHOSE ANGLE IT IS COMES FROM THE BOX, not from the value being painted:
  // once there is anything at all to point at, the eased value is finite
  // either way, so asking it would have drawn the engine's own answer in the
  // colour that means "you typed this".
  const own = isFinite(angleWant.theta);
  const found = !own && solved?.ok ? solved.params.theta : undefined;
  const shown = theta;
  // The diagram draws the model's whole range, not the scenario's: when the
  // engine has RECOVERED an angle this picture is how you see what it found,
  // and clamping that into the control's range would draw a different throw
  // from the one being solved.
  const t = clamp(isFinite(shown) ? shown : 0, -90, 90);
  const a = (t * Math.PI) / 180;
  const { ox: OX, oy: OY, len: L, arc: AR, head: HL } = AD;
  const ca = Math.cos(a), sa = Math.sin(a);
  const ex = OX + L * ca, ey = OY - L * sa;

  // Faint while it is the engine's answer rather than yours.
  const hue = own ? 'var(--vel)' : (isFinite(found) ? 'var(--ink-muted)' : 'var(--ink-faint)');
  // The shaft stops short of the head, so the round cap cannot poke out
  // through the nose of it.
  ray.setAttribute('x1', OX); ray.setAttribute('y1', OY);
  ray.setAttribute('x2', (ex - ca * HL * 0.82).toFixed(2));
  ray.setAttribute('y2', (ey + sa * HL * 0.82).toFixed(2));
  ray.setAttribute('stroke', hue);

  // The head, as a triangle on the tip, pointing along the vector.
  const nx = -sa, ny = -ca;                    // unit normal to the direction
  const bw = HL * 0.40;                        // half the base
  head.setAttribute('d',
    `M${ex.toFixed(2)} ${ey.toFixed(2)} `
    + `L${(ex - ca * HL + nx * bw).toFixed(2)} ${(ey + sa * HL + ny * bw).toFixed(2)} `
    + `L${(ex - ca * HL - nx * bw).toFixed(2)} ${(ey + sa * HL - ny * bw).toFixed(2)} Z`);
  head.setAttribute('fill', hue);

  // The arc runs from the horizontal round to the vector, either way.
  const ax = OX + AR, ay = OY;
  const bx = OX + AR * ca, by = OY - AR * sa;
  const sweep = t >= 0 ? 0 : 1;
  const flat = Math.abs(t) < 0.05;
  arc.setAttribute('d', flat ? ''
    : `M${ax.toFixed(2)} ${ay.toFixed(2)} A${AR} ${AR} 0 0 ${sweep} ${bx.toFixed(2)} ${by.toFixed(2)}`);
  wedge.setAttribute('d', flat ? ''
    : `M${OX} ${OY} L${ax.toFixed(2)} ${ay.toFixed(2)} A${AR} ${AR} 0 0 ${sweep} ${bx.toFixed(2)} ${by.toFixed(2)} Z`);

  // The value, on the bisector of the wedge so it sits inside the angle it
  // names. T`` rather than M``: this is SVG, which cannot take the markup a
  // typeset fraction needs, and a degree sign is all it has to set.
  const half = a / 2;
  angT.setAttribute('x', (OX + Math.cos(half) * (AR + 17)).toFixed(2));
  angT.setAttribute('y', (OY - Math.sin(half) * (AR + 17) + 5).toFixed(2));
  angT.textContent = flat ? '' : T`${num(Math.abs(t), Math.abs(t) % 1 ? 1 : 0)}°`;

  // `u` beside the middle of the shaft, offset on whichever side the wedge is
  // NOT, so the two labels never land on each other: the wedge opens between
  // the horizontal and the vector, so for an upward throw it is below-right
  // of the shaft and the label goes above-left, and for a downward one both
  // swap.
  const sgn = t >= 0 ? 1 : -1;
  uT.setAttribute('x', (OX + ca * L * 0.52 + sgn * -sa * 14).toFixed(2));
  uT.setAttribute('y', (OY - sa * L * 0.52 + sgn * -ca * 14 + 5).toFixed(2));
  uT.setAttribute('fill', hue);
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
  // A SPEED THE FLIGHT ASKED FOR, until somebody says otherwise. The card
  // opens on whatever this particular flight needs — which for a round that
  // lands in half a second is nothing like what it is for a lobbed ball — so
  // the common case is still Enter and Enter, and the common case is now also
  // the right one. Once a student has moved the slider themselves that choice
  // stands, and the pin and the note say when it has stopped making sense.
  // SHOW IT BEFORE MEASURING IT. The pin is placed from the slider's own
  // width, and a slider inside a hidden card has none — syncing first put the
  // pin at zero and hid it for having nowhere to go.
  $('pace').hidden = false;
  syncLayoutPick();
  syncRate();
  // FOCUS THE SLIDER, NOT THE BUTTON. Focusing the button meant the very
  // keypress that opened this card activated it on the way back up, so Enter
  // from the values screen blew straight through the card without it ever
  // being seen. The slider ignores Enter, which is handled below instead —
  // and it puts the left and right arrows on the speed, which is the thing
  // the card is for.
  $('pace-rate').focus();
}
function closePace() { $('pace').hidden = true; }

/**
 * Keep the card and the flight bar saying the same thing.
 *
 * ONE SETTING, ONE KIND OF CONTROL. The bar used to carry four buttons —
 * real time, 0.75x, 0.5x, 0.25x — and the card a slider over the whole range,
 * which made them look like two different settings that happened to interact.
 * Worse, the four named four of a hundred reachable speeds AS IF they were
 * the choices, and the speed most short flights actually want is not among
 * them: a round that lands in half a second asks for about 0.14x, and the
 * slowest button on offer was nearly twice that. The bar has the slider now,
 * with the same recommendation pin, placed by the same calc.
 */
function syncRate() {
  const value = Math.round(state.rate * 100);
  const shown = `${num(state.rate, 2)}×`;
  $('pace-rate').value = String(value);
  $('pace-val').textContent = shown;
  // Not while it is being dragged: writing to a slider under the thumb is how
  // a drag turns jumpy. Same guard syncLive already uses.
  const bar = $('bar-rate');
  if (document.activeElement !== bar) bar.value = String(value);
  $('bar-rate-val').textContent = shown;

  const tMax = traj?.tMax;
  const note = $('pace-note'), use = $('pace-use');
  const pins = [$('pace-pin'), $('bar-rate-pin')];
  if (!(tMax > 0)) {
    note.textContent = '';
    for (const p of pins) p.hidden = true;
    use.hidden = true;
    return;
  }

  const best = recommend(tMax);
  const r = paceNote(value, tMax);
  note.textContent = r.text;
  note.dataset.ok = String(r.ok);
  use.hidden = r.ok;
  // The bar has no room for the sentence, so it says the same verdict the
  // only way a bar can: the pin is where the flight asked for, and the
  // readout goes off-colour when the setting is nowhere near it.
  $('bar-rate-val').dataset.ok = String(r.ok);

  // The thumb travels between half a thumb in at each end, so the pin has to
  // travel the same path or it points at a number next to the one it means.
  // Stated as a percentage rather than measured in pixels: measuring put the
  // pin five pixels out, because the card's scrollbar comes and goes with the
  // length of this very note and the slider is a different width by the time
  // the answer is used. A calc cannot go stale — and it is the same calc for
  // both sliders, whatever width each of them happens to be.
  const THUMB = 24;
  for (const p of pins) {
    p.style.left = `calc(${best}% - ${(best * THUMB / 100).toFixed(3)}px + ${THUMB / 2}px)`;
    p.hidden = false;
  }
}

/* ── putting the window up, and keeping it current ───────────────────────
   The pane list carries the engine's own exact segments, so a fresh set of
   numbers is a fresh set of panes — but mounting throws the chrome away, and
   a student who has zoomed one pane into the second the canopy works in has
   not asked to be zoomed back out. So it is keyed on the solve: same numbers,
   same panes, untouched views. js/render/panes.js keeps the views across a
   remount of the same four ids in any case, which covers the rest. */
function syncPanes() {
  // The picker is only ever offered by a scenario that has panes to pick
  // between, and it is asked here as well as on the way into the speed card:
  // the card is one route onto this screen and the step navigation is
  // another, and a control left over from the last scenario is worse than one
  // that was never offered.
  syncLayoutPick();
  const on = windowed() && !!traj && !!solved?.ok;
  $('canvas-wrap').dataset.panes = on ? 'on' : 'off';
  $('panes').hidden = !on;
  $('t-read').hidden = !on;
  // One view and one button on the stage bar, or four views with a button
  // each. Never both.
  $('fit-btn').hidden = on;
  if (!on) { paneSig = null; return; }
  const sig = JSON.stringify(solved.params);
  if (sig === paneSig) return;
  paneSig = sig;
  panes.mount($('panes'), win, descentPanes(traj), { change: () => { dirty = true; } });
  panes.setLayout(win, state.layout);
}

/** Which layout the speed card is offering, and which one is chosen. */
function syncLayoutPick() {
  const row = $('lay-row');
  $('lay').hidden = !windowed();
  for (const b of row.children) {
    b.setAttribute('aria-checked', String(parseInt(b.dataset.n, 10) === state.layout));
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
  // THE AIRCRAFT, THE DOOR AND THE STEP OUT, none of which is inside t. See
  // the pre-roll note in js/render/drop.js for why it is outside the clock.
  state.pre = windowed() ? 0 : null;
  cam.fit = true;
  setPlayIcon(true);
  hideDone();
  if (armRange()) { go('flight'); return; }
  go('flight');
}

/* THE BULLET WAITS FOR ITS STRING. Every way into a run of the range — Run
   it, Go, Replay, the ending card's Replay — arms the rig and stops at t = 0;
   the pull (or ▶) is what starts the clock. See js/render/stringrig.js. */
function armRange() {
  if (scenario?.stage !== 'range') return false;
  state.t = 0; state.playing = false; state.pre = null; setPlayIcon(false);
  range.rigReset(); dirty = true;
  return true;
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
  if (step !== 'flight') { hideDone(); closeAskAt(); }
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
  // THE BULLET IS STARTED BY ITS STRING. Play trips the rig the same way a
  // pull does; play after the landing re-arms it and waits for the next pull.
  if (scenario?.stage === 'range') {
    if (state.t >= traj.tMax) { state.t = 0; state.playing = false; setPlayIcon(false); range.rigReset(); dirty = true; return; }
    if (!state.playing && state.t === 0 && range.rigArmed()) range.rigTrip();
  }
  if (state.t >= traj.tMax) { state.t = 0; state.pre = windowed() ? 0 : null; }
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
  // NOT IN THE WINDOW. The card resolves the instant you pointed at on the
  // diagram, and in the window the gesture on every pane is pan and zoom —
  // there is nothing to point at. What it was for is on screen instead: the
  // three graphs carry the velocity, the height and the acceleration at the
  // cursor, with axes to read them off.
  if (windowed()) return;
  // NOR ON THE ROAD. The card resolves a velocity into its two components,
  // and a vehicle on a level road has only one.
  if (scenario?.road) return;
  hideDone(); closeAskAt();
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

  $('res-note').textContent = R.phase
    // A descent's card has to say which PHASE this instant belongs to, because
    // u and a change twice on the way down and the formulas above quote the
    // phase's own. The engine says it; this prints it.
    ? R.convention
    : R.vertical
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

/* ── asking for an instant instead of pointing at one ───────────────────
   Clicking the ball resolves the instant you can see, which answers "what is
   it doing now". A question asks the other way round: resolve it AT 1.4 s, or
   at the moment it is doing 18 m s⁻¹. Neither of those is anywhere the
   pointer can reach, and scrubbing for them by hand is guesswork.

   Both boxes name ONE instant, so each shows what the other did — the same
   arrangement the height line and the time above it already use, for the same
   reason. The speed box is the interesting one, because a speed is usually
   reached TWICE: once slowing on the way up and once gaining it back coming
   down. Both are offered. The engine finds them (js/core/projectile.js); this
   only picks which one was wanted. */
// NOTHING UNTIL THERE IS SOMETHING. Both hints used to carry a standing line
// of instruction, which meant the card opened with four lines of prose around
// two boxes. They are empty now and fill only with a fact or a refusal — the
// speed at the instant you typed, or the engine's reason it cannot. The rows
// collapse when empty, so the card is the heading and the boxes until it has
// earned another line.
const AT_T_HINT = '';
const AT_V_HINT = '';

function openAskAt() {
  if (!traj || state.step !== 'flight' || windowed() || scenario?.road) return;
  hideDone(); closeResolve();
  state.playing = false; setPlayIcon(false);
  // It opens on the instant already on screen, so Resolve it always resolves
  // something — and the student can see which instant they are editing.
  state.askT = clamp(state.t, 0, traj.tMax);
  $('at-t').value = fmt(state.askT, 2);
  $('at-v').value = '';
  $('at-picks').innerHTML = '';
  say($('at-t-hint'), false, atTimeSay(state.askT));
  say($('at-v-hint'), false, AT_V_HINT);
  $('askat').hidden = false;
  $('canvas-wrap').dataset.ask = 'on';
  $('ask-at').setAttribute('aria-pressed', 'true');
  $('at-t').focus();
  $('at-t').select();
  dirty = true;
}

function closeAskAt() {
  $('askat').hidden = true;
  $('canvas-wrap').dataset.ask = 'off';
  $('ask-at').setAttribute('aria-pressed', 'false');
}

/** What the object is doing at an instant the student has just named. */
function atTimeSay(t) {
  if (!traj) return AT_T_HINT;
  const v = traj.vel(t), p = traj.pos(t);
  return `${M`${fmt(Math.hypot(v.x, v.y), 2)} [m s^-1]`}, `
    + `${M`${fmt(p.y, 2)} [m]`} up`;
}

/** Which way it is going at an instant, for telling two answers apart. */
function wayAt(t) {
  const vy = traj.vel(t).y;
  return Math.abs(vy) < 0.05 ? 'at the top of the arc'
    : vy > 0 ? 'on the way up' : 'on the way down';
}

/** The two or more instants that share a speed, offered as a choice. */
function showPicks(times) {
  const box = $('at-picks');
  if (times.length < 2) { box.innerHTML = ''; return; }
  box.innerHTML = times.map((t, i) => `
    <button class="askat-pick" data-t="${t}" aria-pressed="${i === 0}">
      <b>${M`t = ${fmt(t, 2)} [s]`}</b>
      ${wayAt(t)}, ${M`${fmt(traj.pos(t).y, 2)} [m]`} up
    </button>`).join('');
  for (const b of box.children) {
    b.addEventListener('click', () => {
      state.askT = parseFloat(b.dataset.t);
      for (const x of box.children) x.setAttribute('aria-pressed', String(x === b));
      $('at-t').value = fmt(state.askT, 2);
      say($('at-t-hint'), false, atTimeSay(state.askT));
    });
  }
}

function wireAskAt() {
  const tb = $('at-t'), vb = $('at-v');

  tb.addEventListener('input', (e) => {
    const hint = $('at-t-hint');
    const v = parseValue(e.target.value);
    $('at-picks').innerHTML = '';
    vb.value = '';
    if (v === undefined) { state.askT = null; say(hint, false, AT_T_HINT); return; }
    if (!isFinite(v)) { say(hint, true, 'That is not a time. Seconds, or a fraction like 7/2.'); return; }
    if (!traj) { say(hint, true, 'There is no flight to look along yet.'); return; }
    if (v < 0 || v > traj.tMax) {
      // Say what was done rather than rewriting the box under the cursor.
      const held = clamp(v, 0, traj.tMax);
      state.askT = held;
      say(hint, true, `The flight runs from ${M`t = 0`} to ${M`t = ${fmt(traj.tMax, 2)}`} s, `
        + `so ${M`${fmt(held, 2)}`} s is what gets used.`);
      return;
    }
    state.askT = v;
    say(hint, false, atTimeSay(v));
  });

  vb.addEventListener('input', (e) => {
    const hint = $('at-v-hint');
    const v = parseValue(e.target.value);
    if (v === undefined) { $('at-picks').innerHTML = ''; say(hint, false, AT_V_HINT); return; }
    if (!isFinite(v)) { say(hint, true, 'That is not a speed. Try a number, or a fraction like 7/2.'); return; }
    if (!traj) { say(hint, true, 'There is no flight to look along yet.'); return; }
    const r = timeAtSpeed(traj, v);
    if (!r.ok) { $('at-picks').innerHTML = ''; say(hint, true, r.reason); return; }
    state.askT = r.times[0];
    tb.value = fmt(state.askT, 2);
    showPicks(r.times);
    say(hint, false, r.constant
      ? 'It travels at that speed from start to finish, so any instant will do — this is the launch.'
      : r.times.length > 1
        ? `It is doing that ${r.times.length === 2 ? 'twice' : `${r.times.length} times`} — pick one.`
        : `That happens once, at ${M`t = ${fmt(state.askT, 2)}`} s.`);
    say($('at-t-hint'), false, atTimeSay(state.askT));
  });

  const go = () => {
    if (!traj) return;
    if (state.askT == null) { say($('at-t-hint'), true, 'Name a time or a speed first.'); return; }
    const t = state.askT;
    closeAskAt();
    openResolve(t);
  };
  $('at-go').addEventListener('click', go);
  $('at-cancel').addEventListener('click', closeAskAt);
  $('ask-at').addEventListener('click', () => {
    if ($('askat').hidden) openAskAt(); else closeAskAt();
  });
  for (const el of [tb, vb]) {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeAskAt(); }
    });
  }
}

/* ── readouts, on the diagram ───────────────────────────────────────── */
function renderHud() {
  if (!traj) return;
  // An exhibit happens somewhere else and says where in its own `place`.
  // Falling back to siteFor meant the range and the monkey were both captioned
  // "A goal kick from the west goal line".
  const site = siteFor(state.id);
  $('place').textContent = scenario?.place || site.place;
  $('place-note').textContent = scenario?.plate ? '' : (site.note || '');
  // In the window there is no corner for a readout to sit in, and the clock
  // is in the transport where all four panes share it.
  if (windowed()) { $('hud-left').innerHTML = ''; $('hud-right').innerHTML = ''; return; }
  const p = traj.pos(state.t), v = traj.vel(state.t);
  const b = (k, val, unit, hue) =>
    `<div class="hbox"${hue ? ` data-hue="${hue}"` : ''}><div class="hbox-k">${k}</div>
     <div class="hbox-v">${val}<small>${unit}</small></div></div>`;
  // In a straight line the horizontal distance is always zero, so show the
  // signed displacement along the line instead — that is the s being solved.
  if (scenario?.road) {
    $('hud-left').innerHTML = [
      b('Displacement from A', fmt(p.x, 1), 'm', 'disp'),
      b('Velocity', fmt(v.x, 1), 'm s⁻¹', 'vel'),
      b('Acceleration', fmt(traj.params.a, 2), 'm s⁻²', 'acc'),
      ...(state.extras.energy ? [b('Kinetic energy', fmt(traj.kineticEnergy(state.t), 0), 'J'),
                                 b('Momentum', fmt(traj.momentum(state.t), 1), 'kg m s⁻¹')] : []),
    ].join('');
    $('hud-right').innerHTML = b('Time', fmt(state.t, 2), 's');
    return;
  }
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
  // WHICH PHASE, and what the acceleration is doing in it. On a parachute
  // drop this is the number the whole scenario is about: it reads 9.81 down,
  // then flips to the canopy's deceleration upwards, then goes to zero.
  if (scenario?.descent && traj.at) {
    const ph = traj.at(state.t);
    left.push(b(ph.name, Math.abs(ph.a) < 1e-9 ? '0' : fmt(Math.abs(ph.a), 2),
                Math.abs(ph.a) < 1e-9 ? 'm s⁻²' : `m s⁻² ${ph.a > 0 ? 'down' : 'up'}`, 'acc'));
  }
  if (state.extras.energy) {
    left.push(b('Kinetic energy', fmt(traj.kineticEnergy(state.t), 0), 'J'));
    left.push(b('Momentum', fmt(traj.momentum(state.t), 1), 'kg m s⁻¹'));
  }
  $('hud-left').innerHTML = left.join('');
  $('hud-right').innerHTML = b('Time', fmt(state.t, 2), 's');
}

/* ── the landing card: the whole of SUVAT, once it has settled ───────── */
const SYM = { s: 's', u: 'u', v: 'v', a: 'a', t: 't' };

function showDone() {
  if (!solved?.ok || state.step !== 'flight') return;
  const r = solved;

  $('done-eyebrow').textContent = traj.bounces > 0
    ? `First flight, then ${traj.bounces} ${traj.bounces === 1 ? 'bounce' : 'bounces'}`
    : r.mode === 'road' ? `From A to B in ${fmt(r.five.t.value, 2)} s`
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
  if (r.mode === 'road') return r.params.a < 0 ? 'It braked from A to B' : 'It reached B';
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
  // The parachute has no second object and its answer is not five numbers but
  // three rows of five, so it brings its own card. It is gated on the solve
  // rather than on `second`.
  if (scenario?.descent && solved?.ok && state.step === 'flight') return showDescentDone();
  if (!(scenario?.ending && second && solved?.ok && state.step === 'flight')) return showDone();
  if (scenario.ending.kind === 'monkey') return showMonkeyDone();
  return showRangeDone();
}

/**
 * The parachute's ending: SUVAT, three times, side by side.
 *
 * The SUVAT-five grid is the wrong shape for this one and the reason is the
 * lesson. One row of five says "this is the motion"; the whole point here is
 * that no single row of five describes the fall, and three of them do. So the
 * card is a table with one row per phase, and every figure in it was computed
 * by js/core/descent.js — this function reads them out and arranges them.
 *
 * The sketch beside it is the velocity–time graph, and it is EXACT rather
 * than illustrative: within a phase the acceleration is constant, so the
 * speed is linear in time, so three straight segments through the phase
 * boundaries is not an approximation of the curve — it is the curve.
 */
function showDescentDone() {
  const e = scenario.ending, p = solved.params, ph = solved.phases;
  const land = solved.vLanding;

  $('exdone-eyebrow').textContent =
    `Down in ${fmt(solved.tMax, 2)} s · landing at ${fmt(land, 2)} m s⁻¹`;
  $('exdone-title').textContent = solved.stillSlowing
    ? 'She was still slowing down when she reached the ground.'
    : e.title;

  const cell = (x, dp = 2) => `<b>${fmt(x, dp)}</b>`;
  const table = `
    <div class="ph-tab" role="table" aria-label="Each phase, solved on its own">
      <div class="ph-head" role="row">
        <span role="columnheader">Phase</span>
        <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span>
        <span role="columnheader">${M`a`}</span><span role="columnheader">${M`s`}</span>
        <span role="columnheader">${M`t`}</span>
      </div>
      ${ph.map((x, i) => `
        <div class="ph-row" role="row" data-key="${x.key}">
          <span class="ph-name" role="cell"><b>${i + 1} · ${x.name}</b><em>${x.sub}</em></span>
          <span role="cell">${cell(x.u)}</span><span role="cell">${cell(x.v)}</span>
          <span role="cell">${cell(x.a)}</span><span role="cell">${cell(x.s)}</span>
          <span role="cell">${cell(x.t)}</span>
        </div>`).join('')}
      <div class="ph-row ph-sum" role="row">
        <span class="ph-name" role="cell"><b>The whole descent</b><em>the ${
          ph.length === 3 ? 'three' : 'two'} added up</em></span>
        <span role="cell">${cell(0)}</span><span role="cell">${cell(land)}</span>
        <span role="cell">—</span><span role="cell">${cell(p.h)}</span>
        <span role="cell">${cell(solved.tMax)}</span>
      </div>
      <p class="ph-units">Downwards is positive. ${M`u`} and ${M`v`} in ${M`[m s^-1]`},
        ${M`a`} in ${M`[m s^-2]`}, ${M`s`} in ${M`[m]`}, ${M`t`} in ${M`[s]`} — and each
        ${M`t`} is timed from the start of its own phase.</p>
    </div>`;

  const why = solved.stillSlowing
    ? `<p>The canopy never finished its job: there was not enough height left to
        bring her from ${fmt(ph[0].v, 1)} m s⁻¹ down to the ${fmt(p.vTerm, 1)} m s⁻¹ you
        asked for, so she arrived at <b>${fmt(land, 2)} m s⁻¹</b> instead — still
        decelerating. The row below the free fall is cut short for that reason, and
        there is no third row at all.</p>`
    : `<p>No single row of five describes this fall, and that is the whole point of
        the question. Each phase has its own constant acceleration, so each one is
        a separate SUVAT problem — and the only thing they share is that the
        ${M`v`} of one is the ${M`u`} of the next.</p>`;

  $('exdone-body').innerHTML = `${why}${table}${vtSketch(ph, solved, p)}`;

  $('exdone-real-h').textContent = e.realTitle;
  $('exdone-real-lead').textContent = e.realLead;
  $('exdone-why').innerHTML = e.why.map(([k, v]) => `<li><b>${k}</b> — ${v}</li>`).join('');
  $('exdone-caveat').textContent = e.caveat;
  $('exdone-close').textContent = e.close || 'See the diagram';
  $('exdone-all').hidden = true;        // there is no second view to offer
  $('exdone').hidden = false;
}

/**
 * The velocity–time graph, drawn from the phases themselves.
 *
 * Exact, not illustrative: constant acceleration within a phase means speed
 * is linear in time, so the polyline through the phase boundaries IS the
 * graph. The area under it is the height she fell, which is the other half of
 * what a v–t graph is for, so it is shaded and labelled with the engine's own
 * figure rather than with one measured off the picture.
 */
function vtSketch(ph, r, p) {
  const W = 420, H = 150, L = 44, B = 26, T = 12, R = 14;
  const vMax = Math.max(...ph.map((x) => Math.max(x.u, x.v))) * 1.12;
  const X = (t) => L + (t / r.tMax) * (W - L - R);
  const Y = (v) => T + (1 - v / vMax) * (H - T - B);

  // one point per phase boundary, in order
  const pts = [{ t: 0, v: ph[0].u }];
  for (const x of ph) pts.push({ t: x.t0 + x.t, v: x.v });
  const d = pts.map((q, i) => `${i ? 'L' : 'M'}${X(q.t).toFixed(1)} ${Y(q.v).toFixed(1)}`).join(' ');
  const area = `${d} L${X(r.tMax).toFixed(1)} ${Y(0).toFixed(1)} L${X(0).toFixed(1)} ${Y(0).toFixed(1)} Z`;

  const ticks = ph.slice(0, -1).map((x) => `
    <line x1="${X(x.t0 + x.t).toFixed(1)}" y1="${T}" x2="${X(x.t0 + x.t).toFixed(1)}" y2="${Y(0).toFixed(1)}"
          stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3"/>`).join('');

  return `<figure class="vt">
    <svg viewBox="0 0 ${W} ${H}" role="img"
         aria-label="Speed against time: it rises in free fall, drops sharply as the canopy opens, then stays level.">
      <path d="${area}" fill="var(--vel)" opacity=".12"/>
      ${ticks}
      <line x1="${L}" y1="${Y(0).toFixed(1)}" x2="${W - R}" y2="${Y(0).toFixed(1)}" stroke="var(--axis, var(--ink-faint))" stroke-width="1.5"/>
      <line x1="${L}" y1="${T}" x2="${L}" y2="${Y(0).toFixed(1)}" stroke="var(--axis, var(--ink-faint))" stroke-width="1.5"/>
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.6" stroke-linejoin="round"/>
      <text x="${L - 6}" y="${(Y(ph[0].v) + 4).toFixed(1)}" text-anchor="end">${fmt(ph[0].v, 1)}</text>
      <text x="${L - 6}" y="${(Y(0) + 4).toFixed(1)}" text-anchor="end">0</text>
      <text x="${(W - R).toFixed(1)}" y="${(Y(0) + 18).toFixed(1)}" text-anchor="end">${fmt(r.tMax, 2)} s</text>
      <text x="${L}" y="${(Y(0) + 18).toFixed(1)}" text-anchor="start">0</text>
    </svg>
    <figcaption>Speed against time, in ${M`[m s^-1]`} — straight lines, because the
      acceleration is constant inside each phase. The shaded area is how far she
      fell: ${M`${fmt(p.h, 0)} [m]`}.</figcaption>
  </figure>`;
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
  // THE OVERVIEW IS THE PLATE'S, and the plate is not what drew this. On the
  // side-on view both whole paths are already on screen at one honest scale,
  // which is what this button existed to go and fetch.
  $('exdone-all').hidden = !scenario.plate;
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
  // A descent's working is its three phases, each one solved on its own, and
  // it comes from the engine that solved them. See descentWorking().
  for (const s of (scenario?.descent ? descentWorking(traj, state.t)
                   : scenario?.road ? roadWorking(solved)
                   : buildWorking(traj, state.t))) {
    parts.push(`<div class="step"><div class="step-h">${s.title}</div>` +
      s.rows.map((r) => `<div class="eq"><div class="eq-f">${r.f}</div><div class="eq-s">${r.s}</div>${r.r ? `<div class="eq-r">${r.r}</div>` : ''}</div>`).join('') +
      (s.note ? `<div class="step-n">${s.note}</div>` : '') + '</div>');
  }
  $('working').innerHTML = parts.join('');
}

/* ── loop ───────────────────────────────────────────────────────────── */
function draw() {
  // syncPanes BEFORE the early return as well as after it. With no flight to
  // draw there is nothing for a window to be a window onto, and leaving four
  // panes of the last one mounted is the same stale-control problem the
  // options panel has — so it is taken down on the way out, not only put up
  // on the way in.
  if (state.step !== 'flight' || !traj) { syncPanes(); dirty = false; return; }
  syncPanes();
  const R = state.resolve
    ? (scenario?.descent ? resolveDescent(traj, state.t) : resolveAt(traj, state.t))
    : null;
  const opts = { traj, second, ghost, t: state.t, show: state.show, fired: state.launched,
                 verdict: state.verdict, overview: state.overview,
                 hoverMark: state.hoverMark,
                 markers: state.markers || {}, scenario, secondLabel: scenario.second?.label,
                 resolve: R, hover: state.hover };
  /* ── which renderer, and why there are two ────────────────────────────
     `plate` hands a scenario to js/render/exhibit.js instead of to the
     side-on view: the strobe photograph, with its own dark plate, its own
     exposures and — for the range — two panes at one shared scale.

     ONE SCENARIO SETS IT, and the reason it is one rather than two has
     changed. The plate used to cost a scenario everything the ordinary view
     gives, because exhibit.js worked out its own projection every frame and
     never read the camera: you could not drag it, could not zoom it, and the
     view button did nothing. Both experiments were moved off it for that.

     The plate reads the camera now — see fitPlate in that file — so Monkey vs
     Hunter is back on it: the grid, the branches and the exposures, WITH the
     drag, the zoom, the view button and the graphs rather than instead of
     them. The range stays on the side-on view, because its answer is two
     panes at one scale and that mode is not camera-driven. */
  /* ── or four panes, for the one motion that needs four ────────────────
     The window is the whole flight view for a parachute drop: a sky with an
     aircraft in it, and the velocity, the height and the acceleration against
     time, all four sharing this one `t`. See js/render/panes.js for the
     window and js/render/drop.js for what this scenario puts in it. */
  if (windowed()) {
    panes.render(win, { f: traj, t: state.t, pre: state.pre, fired: state.launched });
    // The clock, for all four of them. Typeset, so innerHTML — CLAUDE.md
    // rule 1 — and it reads zero for the whole of the pre-roll because the
    // pre-roll is outside the clock and nothing in it has been measured.
    $('t-read').innerHTML = M`t = ${fmt(state.pre == null ? state.t : 0, 2)} [s]`;
  } else if (scenario?.stage === 'range') range.render($('scene'), cam, opts);
  else if (scenario?.stage === 'road') roadStage.render($('scene'), cam, opts);
  else if (scenario?.plate) exhibit.render($('scene'), cam, opts);
  else scene.render($('scene'), cam, opts);

  if (state.extras.graphs) {
    const P = palette();
    for (const spec of graphSpecs(traj, state.t, P)) drawGraph($(spec.canvas), spec);
  }
  renderHud(); renderWorking(); renderResolve(R);
  $('scrub').value = traj.tMax ? state.t / traj.tMax : 0;
  // The view button lights up while the whole flight IS what you are looking
  // at, and dims the moment a pan or a zoom takes you off it — so it reads as
  // the way back rather than as a mode you are in.
  $('fit-btn').setAttribute('aria-pressed', String(!cam.touched));
  dirty = false;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  /* ── the staging, and then the clock ──────────────────────────────────
     THE PRE-ROLL RUNS IN REAL SECONDS, not in playback seconds. The speed
     control answers "how fast should the physics go", and a drop that asks
     for a tenth of real time would otherwise spend half a minute watching an
     aeroplane. Nothing in here is part of t: the clock starts at zero the
     moment she is clear of the door, which is what the engine means by t = 0. */
  if (state.step === 'flight' && state.playing && traj && state.pre != null) {
    state.pre += dt;
    if (state.pre >= PRE.total) { state.pre = null; state.t = 0; }
    dirty = true;
  } else if (state.step === 'flight' && state.playing && traj) {
    state.t += dt * state.rate;
    const tStop = Math.max(traj.tMax, scenario?.exhibit && second ? second.tMax : 0);
    if (state.t >= tStop) {
      state.t = tStop; state.playing = false; setPlayIcon(false);
      showEnding();                     // only ever on a flight that ran its course
    }
    dirty = true;
  }
  // The angle figure travels too, on its own screen, and it is the only thing
  // on that screen that moves — so it is asked every frame rather than being
  // hung off `dirty`, which belongs to the canvas.
  if (state.step === 'values') easeAngle(dt);
  // the camera travels rather than teleporting; while it is moving, so is
  // the frame
  if (state.step === 'flight' && scene.easeCamera(cam, dt)) dirty = true;
  // The string release: the rope swings between frames, and the flight
  // starts on the frame the rod trips. See js/render/stringrig.js.
  if (state.step === 'flight' && scenario?.stage === 'range') {
    if (range.rigStep(dt) === 'fire' && !state.playing) {
      hideDone(); closeResolve(); state.t = 0; state.playing = true; setPlayIcon(true);
    }
    dirty = true;
  }
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
wireAskAt();
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
  state.rate = parseInt(e.target.value, 10) / 100;
  state.rateTouched = true;     // their choice now, not the recommendation's
  syncRate();
});
$('pace-use').addEventListener('click', () => {
  if (!traj) return;
  state.rate = recommend(traj.tMax) / 100;
  state.rateTouched = false;    // back under the recommendation's wing
  syncRate();
  $('pace-rate').focus();
});
$('intro-values').addEventListener('click', () => { closeIntro(); go('values'); });
$('play').addEventListener('click', togglePlay);
const replay = () => {
  hideDone(); closeResolve();
  if (armRange()) return;
  state.t = 0; state.pre = windowed() ? 0 : null;
  state.playing = true; setPlayIcon(true); dirty = true;
};
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
  // Naming an instant ends the staging: the student has asked to be at a
  // time, and every time there is belongs to the flight.
  state.pre = null;
  state.playing = false; setPlayIcon(false);
  state.t = parseFloat(e.target.value) * traj.tMax; dirty = true;
});
$('res-close').addEventListener('click', closeResolve);
$('res-go').addEventListener('click', () => {
  closeResolve();
  if (traj && state.t < traj.tMax - 1e-6) { state.playing = true; setPlayIcon(true); }
  dirty = true;
});
$('bar-rate').addEventListener('input', (e) => {
  state.rate = parseInt(e.target.value, 10) / 100;
  state.rateTouched = true;     // their choice now, not the recommendation's
  syncRate();                   // the card and the bar are one setting
});
// ONE VIEW, and the button that goes back to it. See the note above fitView
// in js/render/scene.js for why Pitch / Stadium / Wide went.
$('fit-btn').addEventListener('click', () => { scene.fitView(cam); dirty = true; });
$('bounce-ck').addEventListener('change', (e) => {
  state.bounce = e.target.checked;
  $('bounce-opts').hidden = !state.bounce;
  cam.fit = true; recompute(); dirty = true;
});
$('restitution').addEventListener('input', (e) => {
  setRestitution(parseFloat(e.target.value));
});
$('rest-earth').addEventListener('click', () => {
  setRestitution(EARTH_E);
  $('restitution').focus();
});
for (const b of $('lay-row').children) {
  b.addEventListener('click', () => {
    state.layout = parseInt(b.dataset.n, 10);
    try { localStorage.setItem('suvat-panes', String(state.layout)); } catch {}
    syncLayoutPick();
    // The choice is the layout to come BACK to as well as the one to show, so
    // it goes through setLayout rather than being poked into the window.
    panes.setLayout(win, state.layout);
    dirty = true;
  });
}
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
  // The question card owns Escape while it is open; its own inputs handle
  // Enter, so only the outside case is caught here.
  if (!$('askat').hidden) {
    if (e.key === 'Escape') { e.preventDefault(); closeAskAt(); }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
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
  else if (e.key === 'ArrowRight') { hideDone(); state.pre = null; state.playing = false; setPlayIcon(false); state.t = Math.min(traj.tMax, state.t + traj.tMax / 60); dirty = true; }
  else if (e.key === 'ArrowLeft')  { hideDone(); state.pre = null; state.playing = false; setPlayIcon(false); state.t = Math.max(0, state.t - traj.tMax / 60); dirty = true; }
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

/* The string comes first. On the bullet stage a press on the string is the
   string's, not a pan — so these listen in the capture phase, ahead of
   attachControls below, and keep the event when they use it. */
{
  const el = $('scene');
  const on = () => scenario?.stage === 'range' && state.step === 'flight';
  const at = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  for (const [type, kind] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up'], ['pointercancel', 'up']]) {
    el.addEventListener(type, (e) => {
      if (!on()) return;
      if (range.rigPointer(kind, ...at(e))) {
        e.stopImmediatePropagation();
        if (kind === 'down') el.setPointerCapture?.(e.pointerId);
        el.style.cursor = kind === 'up' ? 'grab' : 'grabbing';
        dirty = true;
      } else if (kind === 'move' && range.rigHover()) el.style.cursor = 'grab';
    }, { capture: true });
  }
}
scene.attachControls($('scene'), cam, () => { dirty = true; },
  pickScene,
  (kind, world) => {
    if (kind === 'obstacle') { state.markers.obstacle.x = Math.max(0.5, world.x); state.markers.obstacle.height = Math.max(0, world.y); }
    else if (kind === 'target') {
      // ON A BRANCH, OR NOWHERE. A monkey dropped at an arbitrary point hangs
      // off nothing, and the scenario's whole premise is that it was holding
      // something. Where the scenario has a tree, the drag snaps to the
      // nearest of its branches; where it does not, the point is free.
      if (scenario.branches) {
        const b = nearestBranch(world.x, world.y);
        state.markers.target.x = b.x;
        state.markers.target.y = b.y;
      } else {
        state.markers.target.x = Math.max(0.5, world.x);
        state.markers.target.y = Math.max(0, world.y);
      }
      // Dragging the monkey moves the aim, the flight and the verdict, so it
      // has to re-solve rather than only redraw.
      recompute();
    }
    else if (kind === 'aimLine') {
      // DRAGGING THE LINE IS SETTING THE ANGLE, and setting the angle is
      // taking the aim off the monkey — the same thing the slider does, so it
      // goes through the same two pieces of state and the slider follows it.
      const dx = world.x, dy = world.y - (state.h ?? 0);
      if (Math.hypot(dx, dy) > 0.2) {
        const lim = scenario.theta || { min: -90, max: 90 };
        state.aimed = false;
        state.theta = clamp((Math.atan2(dy, dx) * 180) / Math.PI, lim.min, lim.max);
        recompute();
      }
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

let lay = null;
try { lay = localStorage.getItem('suvat-panes'); } catch {}
if (lay === '1' || lay === '2' || lay === '4') state.layout = parseInt(lay, 10);

let saved = null;
try { saved = localStorage.getItem('suvat-theme'); } catch {}
applyTheme(saved || 'light');
buildScenarioScreen();
buildOptions();
go('scenario');
requestAnimationFrame(frame);

// CANVAS TEXT IS PAINTED, NOT LAID OUT. HTML reflows the moment a webfont
// arrives; a canvas keeps whatever pixels it already drew, so every label
// measured and drawn before the face landed stays in the fallback —
// wrong metrics, wrong widths for the collision test that places them, and
// visibly lighter than the page around it. One more frame once the fonts are
// in costs nothing and fixes all of it.
document.fonts?.ready.then(() => { dirty = true; });

// ASK FOR THE MATHS FACE BEFORE AN EQUATION NEEDS IT. A webfont is fetched
// when something that uses it is first painted, and the first thing on this
// site to use Merriweather upright is a formula — so without this, the first
// equation a student sees appears in the system serif and swaps a moment
// later. The five box symbols are italic and were pulling the italic subset in
// on their own; the upright one had nothing to trigger it until the solve
// message appeared. The sample string names the subsets wanted: latin for the
// letters, digits and the real minus sign, greek for theta.
for (const face of ['560 1em "Merriweather"', 'italic 560 1em "Merriweather"']) {
  document.fonts?.load(face, 'vuat 0123456789 θ −').catch(() => {});
}

/* ── Ask Suvat ───────────────────────────────────────────────────────────
   The chat box on the first screen. What comes back from the reader is the
   SCENARIO and the values the question GIVES — js/core/question.js turns it
   into the boxes a student would have filled in, and from here on it is
   exactly the route a typed question takes: chooseScenario, the five, and
   recompute, where solveLaunch works out the rest or says what is missing.
   Nothing on this route calculates a flight that the engine did not. */
function applyReading(x) {
  const r = toApp(x);
  if (!r.ok) return r;
  chooseScenario(r.id);
  closeIntro();
  Object.assign(state.given, r.given);
  if (r.theta !== undefined && !scenario.lockAngle && !scenario.noAngle && !scenario.aimAtTarget) {
    state.theta = r.theta;
  }
  if (r.h !== undefined) state.h = r.h;
  if (r.markers.heightLine != null && state.markers) state.markers.heightLine = r.markers.heightLine;
  if (r.markers.target && state.markers) state.markers.target = r.markers.target;
  if (scenario.descent) state.descent = { ...r.descent };
  if (scenario.road) state.mark = r.mark;
  buildValuesScreen();              // which recomputes
  // The answer is shown where the question was asked; the flight waits for
  // the student to ask for it.
  go('scenario');
  // A line to stay above is a question about it, and the engine answers it
  // here the same way it does under the line's own box (showAbove).
  const above = traj && scenario.dragLine && state.markers?.heightLine != null
    ? { line: state.markers.heightLine, ...timeAbove(traj, state.markers.heightLine) } : null;
  return { ok: true, runnable: !!traj, html: readoutHTML(r, { name: scenario.name, solved, above }) };
}
const ask = createAsk({
  apply: applyReading,
  run: () => { if (!traj) return; if (scenario.exhibit) runFlight(); else launch(); },
  edit: () => go('values'),
});
$('ask-top').addEventListener('click', () => { go('scenario'); requestAnimationFrame(ask.focus); });

window.SUVAT = { state, get traj() { return traj; }, get solved() { return solved; },
                 cam, win, choose: chooseScenario, launch, runFlight, go,
                 showDone, showEnding, hideDone, openResolve, closeResolve,
                 openAskAt, closeAskAt, easeAngle, applyReading,
                 redraw() { recompute(); draw(); } };
