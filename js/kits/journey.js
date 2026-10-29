// kits/journey.js — a journey in stages, wired for the app. The engine is
// js/core/journey.js and the stage js/render/journey.js; this file says which
// boxes to show, reads them, and lays out what the engine answered (rule 4).
// See design/components.md.
//
// The values screen is built a stage at a time, because the paper describes
// it a stage at a time: how many stages, then for each one what it does —
// speeds up, holds its speed, slows down — and the numbers the paper gives
// for it. Choosing what a stage does changes which boxes it has, so those
// choices rebuild the screen (`rebuild`), keeping everything typed.

import { solveJourney, journeyWorking, MAX_STAGES, figure } from '../core/journey.js';
import * as stage from '../render/journey.js';
import { FIGURES } from '../render/figures.js';
import { timeLapse } from '../core/pace.js';
import { M, num } from '../notation.js';

// one rule for every figure of a journey, the working's (core/journey.js)
const tr = (x) => figure(x);
const WHO = ['car', 'train', 'runner', 'cyclist', 'motorcycle'];
// the chips say it short; the engine's messages say it in full (KINDS)
const KIND_CHIPS = [{ v: 'up', label: 'speeds up' }, { v: 'hold', label: 'steady' }, { v: 'down', label: 'slows down' }];

/** The boxes one stage has, once the student has said what it does. */
function stageFields(i, kind) {
  const pick = { key: `k${i}`, type: 'choice', rebuild: true, full: true, label: 'It', options: KIND_CHIPS };
  if (!kind) return [pick];
  if (kind === 'hold') {
    return [pick, { key: `t${i}`, label: `Time ${M`t_${i}`} (s)`, hint: 'How long it holds its speed — the speed it had at the start of this stage.' }];
  }
  return [pick,
    { key: `v${i}`, label: `End speed ${M`v_${i}`} (m s⁻¹)`, hint: kind === 'down' ? '0 if it stops. Blank if this is the V to find.' : 'Blank if this is the V to find.' },
    { key: `a${i}`, label: `Rate ${M`a_${i}`} (m s⁻²)`, hint: `Its size: 0.4, not −0.4. Blank if not given.` },
    { key: `t${i}`, label: `Time ${M`t_${i}`} (s)`, hint: 'How long it takes. Blank if not given.' }];
}

export const journey = {
  id: 'journey',
  verb: 'Set off',
  voice: {
    h: 'What does the paper give?',
    sub: 'Set the journey out a stage at a time: each one speeds up, holds its speed, or slows down. '
      + 'Fill in what the paper gives and leave the rest blank — a speed it leaves out is its V. '
      + 'The area under the speed–time graph is the distance, and that finds the one thing left.',
  },
  fields: [],
  /** The rows, from what has been chosen so far: the journey, then one row
      per stage, then a relation, a moment to ask about, and who it is. */
  rows(vals) {
    // the shape is not a number the paper gives: three stages, a car, until
    // the student says otherwise (`default`)
    const n = Math.min(MAX_STAGES, Math.max(1, +vals.n || 3));
    return [
      { title: 'From A to B',
        fields: [
          { key: 'n', type: 'choice', rebuild: true, default: '3', label: 'How many stages', options: Array.from({ length: MAX_STAGES - 1 }, (_, j) => ({ v: String(j + 2), label: String(j + 2) })) },
          { key: 'u', label: `Speed at A, ${M`u`} (m s⁻¹)`, hint: '0 if it starts from rest.' },
          { key: 'T', label: `Whole time ${M`T`} (s)`, hint: 'A to B. 5 minutes is 300.' },
          { key: 'D', label: `Whole distance ${M`D`} (m)`, hint: 'A to B. 6.3 km is 6300.' },
        ] },
      ...Array.from({ length: n }, (_, j) => ({ title: `Stage ${j + 1}`, fields: stageFields(j + 1, vals[`k${j + 1}`]) })),
      { title: 'A relation between two stages, if the paper gives one',
        fields: [
          { key: 'rel.kind', type: 'choice', label: 'Between their', options: [{ v: 't', label: 'times' }, { v: 'a', label: 'rates' }] },
          { key: 'rel.x', label: 'Stage', placeholder: '—', narrow: true, aria: 'The stage that is k times the other' },
          { key: 'rel.k', label: `is ${M`k`} times`, placeholder: '—', narrow: true, aria: 'k, the number of times' },
          { key: 'rel.y', label: 'stage', placeholder: '—', narrow: true, aria: 'The other stage' },
        ],
        hint: `“The braking time is four times the accelerating time”: stage 3 is 4 times stage 1, between their times. A third: type ${M`k`} with a slash.` },
      { title: 'Ask about a moment, if the paper does',
        fields: [
          { key: 'at.t', label: 'At time (s)', placeholder: '—', hint: 'Its speed then, and how far it has gone.' },
          { key: 'at.s', label: 'When it has gone (m)', placeholder: '—', hint: 'Halfway is half of D.' },
          { key: 'at.v', label: 'When its speed is (m s⁻¹)', placeholder: '—', hint: 'Every time it is.' },
        ] },
      { title: 'Who is travelling',
        fields: [{ key: 'who', type: 'choice', default: 'car', label: 'The picture only: the physics is the same', options: WHO.map((v) => ({ v, label: FIGURES[v].label })) }] },
    ];
  },
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  /* A TIME-LAPSE. A train between stations takes minutes, and five minutes
     of a dot crossing a track is not a demonstration. So the clock runs at a
     whole multiple of real time chosen to fit the journey into about fifteen
     seconds, and the stage says so beside the clock. Nothing in the physics
     changes: t is still the journey's own time. */
  lapse: (f) => timeLapse(f.tMax),

  read(vals) {
    const n = Math.min(MAX_STAGES, Math.max(1, +vals.n || 3));
    const stages = Array.from({ length: n }, (_, j) => {
      const i = j + 1, kind = vals[`k${i}`];
      return kind === 'hold' ? { kind, t: vals[`t${i}`] } : { kind, v: vals[`v${i}`], a: vals[`a${i}`], t: vals[`t${i}`] };
    });
    const rel = ['rel.kind', 'rel.x', 'rel.k', 'rel.y'].some((q) => vals[q] != null)
      ? { kind: vals['rel.kind'], x: vals['rel.x'], y: vals['rel.y'], k: vals['rel.k'] } : null;
    return { u: vals.u, stages, T: vals.T, D: vals.D, rel, at: { t: vals['at.t'], s: vals['at.s'], v: vals['at.v'] }, who: vals.who };
  },
  solve(k) {
    const r = solveJourney(k);
    if (r.ok) r.f.who = FIGURES[k.who] ? k.who : 'car';
    return r;
  },
  working: (solved) => journeyWorking(solved),
  render: stage.render,

  /** The readouts, named as the road names them: displacement from A,
      velocity, acceleration — slowing down is a negative one. */
  hud(f, t, { rate = 1 } = {}) {
    const done = t >= f.tMax - 1e-9, lapse = timeLapse(f.tMax), stopped = done && f.vel(t).x === 0;
    const st = done ? null : f.stageAt(t);
    return {
      left: [
        { k: 'Displacement from A', v: num(f.pos(t).x, 1), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t).x, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: stopped ? 'Acceleration, at rest at B' : done ? 'Acceleration, at B' : `Acceleration, stage ${st.i}`, v: stopped ? '0' : tr(f.accel(t)), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' },
              ...(lapse > 1 ? [{ k: 'Time-lapse', v: `${num(rate * lapse, 1, { trim: true })}×`, unit: 'real time' }] : [])],
    };
  },

  /* Along a track every quantity is horizontal, so every line is dashed, as
     on the road. The speed–time graph is the one the question is about: its
     area is the distance, shaded to the cursor, and the instants a question
     asked about are ringed. */
  graphs(f, t, P) {
    const tMax = f.tMax;
    const rings = (f.answers || []).flatMap((a) => a.times || (a.t != null ? [a.t] : []))
      .map((ta) => ({ t: ta, y: f.vel(ta).x, color: P.mark }));
    const breaks = f.stages.slice(0, -1).map((st) => st.t1);
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t,
        series: [{ label: 'from A', fn: (tt) => f.pos(tt).x, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t, points: rings,
        series: [{ label: 'velocity', fn: (tt) => f.vel(tt).x, color: P.vel, dash: [6, 4] }],
        shade: { index: 0, label: 'area = displacement from A', color: P.disp } },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: [{ label: 'acceleration', fn: (tt) => f.accel(tt), color: P.acc, dash: [6, 4], breaks }] },
    ];
  },

  /** The card's sketch: the speed–time graph, with the area under it shaded. */
  thumb(s) {
    const r = solveJourney(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const J = r.J, top = Math.max(...J.w) || 1, X = (t) => 10 + (t / J.T) * 100, Y = (v) => 50 - (v / top) * 36;
    const pts = [[0, J.w[0]]];
    for (let i = 1, t0 = 0; i <= J.n; i++) { t0 += J.t[i]; pts.push([t0, J.w[i]]); }
    const d = pts.map(([t, v], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const marks = Array.from({ length: 11 }, (_, i) => {
      const x = 10 + (r.f.pos((i / 10) * J.T).x / J.D) * 100;
      return `<circle cx="${x.toFixed(1)}" cy="56" r="1.8" fill="var(--vel)"/>`;
    }).join('');
    const corners = pts.slice(1, -1).map(([t, v]) => `<line x1="${X(t).toFixed(1)}" y1="50" x2="${X(t).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--ink-faint)" stroke-width="1" stroke-dasharray="2 2"/>`).join('');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <path d="${d} L${X(J.T)} 50 L${X(0)} 50 Z" fill="var(--disp)" opacity=".16"/>
      <line x1="8" y1="50" x2="114" y2="50" stroke="var(--border)" stroke-width="1"/>
      ${corners}
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="5 3" stroke-linejoin="round"/>
      ${marks}
    </svg>`;
  },

  /** A row of five per stage, and what was assumed. */
  ending(solved) {
    const { J, answers } = solved;
    const cell = (x) => `<b>${tr(x)}</b>`;
    const WORD = { up: 'Speeding up', hold: 'Steady', down: 'Slowing down' };
    const rows = [];
    for (let i = 1; i <= J.n; i++) {
      if (J.t[i] < 1e-9) continue;
      const k = J.kinds[i - 1], u = J.w[i - 1], v = J.w[i];
      const sub = k === 'hold' ? `at ${tr(v)} m s⁻¹` : v === 0 ? 'to rest' : u === 0 ? `from rest to ${tr(v)} m s⁻¹` : `${tr(u)} to ${tr(v)} m s⁻¹`;
      rows.push([`${i}. ${WORD[k]}`, sub, u, v, k === 'down' ? -J.a[i] : J.a[i], J.s[i], J.t[i]]);
    }
    const table = `
      <div class="ph-tab" role="table" aria-label="Each stage, solved on its own">
        <div class="ph-head" role="row">
          <span role="columnheader">Stage</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span>
          <span role="columnheader">${M`a`}</span><span role="columnheader">${M`s`}</span>
          <span role="columnheader">${M`t`}</span>
        </div>
        ${rows.map(([name, sub, u, v, a, s, t]) => `
          <div class="ph-row" role="row" data-key="stage">
            <span class="ph-name" role="cell"><b>${name}</b><em>${sub}</em></span>
            <span role="cell">${cell(u)}</span><span role="cell">${cell(v)}</span>
            <span role="cell">${cell(a)}</span><span role="cell">${cell(s)}</span>
            <span role="cell">${cell(t)}</span>
          </div>`).join('')}
        <div class="ph-row ph-sum" role="row">
          <span class="ph-name" role="cell"><b>A to B</b><em>the stages added up</em></span>
          <span role="cell">${cell(J.w[0])}</span><span role="cell">${cell(J.w[J.n])}</span>
          <span role="cell">—</span><span role="cell">${cell(J.D)}</span><span role="cell">${cell(J.T)}</span>
        </div>
        <p class="ph-units">The direction of travel is positive, so slowing down is a negative ${M`a`}. ${M`u`} and ${M`v`} in
          ${M`[m s^-1]`}, ${M`a`} in ${M`[m s^-2]`}, ${M`s`} in ${M`[m]`}, ${M`t`} in ${M`[s]`}, each stage timed from its own start.</p>
      </div>`;
    // what was found, and what found it: one unknown nearly always, two in
    // turn when a relation ties two times and the speed is still to find
    const unitOf = (st) => (st.unknown.speed ? '[m s^-1]' : '[s]');
    const val = (st) => `<b>${M`${tr(st.x)} ${unitOf(st)}`}</b>`;
    const steps = solved.steps || [];
    const found = steps.length === 1
      ? `<p>The one unknown was ${M`${steps[0].unknown.sym}`}${steps[0].dependsOn
        ? ': everything that depended on it was written in terms of it, and' : '. Everything else followed from what was given, and'} ${steps[0].fixedBy} fixed it at ${val(steps[0])}.</p>`
      : steps.length ? `<p>${steps.map((st, k) => `${k ? 'then' : 'First'} ${M`${st.unknown.sym}`} came from ${st.fixedBy.replace(/,$/, '')}: ${val(st)}`).join('; ')}.</p>` : '';
    const asked = answers.filter((a) => a.ok).map((a) => `<p>${a.text}</p>`).join('');
    const top = Math.max(...J.w);
    return {
      eyebrow: `From A to B in ${tr(J.T)} <span class="u">s</span>`,
      title: `${tr(J.D)} m, at up to ${tr(top)} m s⁻¹.`,
      body: `${found}${asked}${table}`,
      real: true,
    };
  },
};
