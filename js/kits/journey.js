// kits/journey.js — a journey in three stages, from rest to rest, wired for
// the app. The engine is js/core/journey.js and the stage
// js/render/journey.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4). See design/components.md.

import { solveJourney, journeyWorking } from '../core/journey.js';
import * as stage from '../render/journey.js';
import { timeLapse } from '../core/pace.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (Math.abs(x) < 1 ? 4 : 2), { trim: true });
const KEYS = ['V', 't1', 't2', 't3', 'a1', 'a3', 'T', 'D'];

/** The eight, grouped the way the graph is: one column per stage, then the whole. */
const FIELDS = [
  { key: 'a1', col: 'up', label: `Acceleration ${M`a_1`} (m s⁻²)`, hint: 'From rest, so the rate it gains speed.' },
  { key: 't1', col: 'up', label: `Time ${M`t_1`} (s)`, hint: 'How long it takes to reach its top speed.' },
  { key: 'V', col: 'steady', label: `Top speed ${M`V`} (m s⁻¹)`, hint: 'Its greatest speed, held for the middle stage.' },
  { key: 't2', col: 'steady', label: `Time ${M`t_2`} (s)`, hint: 'How long it holds it. 0 if it never does.' },
  { key: 'a3', col: 'down', label: `Deceleration ${M`a_3`} (m s⁻²)`, hint: 'Its size: 0.25, not −0.25.' },
  { key: 't3', col: 'down', label: `Time ${M`t_3`} (s)`, hint: 'How long it takes to stop.' },
  { key: 'T', col: 'whole', label: `Whole time ${M`T`} (s)`, hint: 'A to B. 5 minutes is 300. A paper that calls one stage “T” means that stage.' },
  { key: 'D', col: 'whole', label: `Whole distance ${M`D`} (m)`, hint: 'A to B. 6.3 km is 6300.' },
];

export const journey = {
  id: 'journey',
  verb: 'Set off',
  voice: {
    h: 'What does the paper give?',
    sub: 'From rest, up to a top speed, steady, then braking to rest. Fill in what the paper '
      + 'gives and leave the rest blank — four things that tie the stages together are enough, '
      + 'and the area under the speed–time graph does the rest.',
  },
  fields: FIELDS,
  cols: { up: 'Speeding up', steady: 'Steady', down: 'Braking', whole: 'Whole journey' },
  rows: [
    { title: 'A relation between two stages, if the paper gives one',
      fields: [
        { key: 'rel.kind', type: 'choice', label: 'Which one',
          options: [
            { v: 't3=k*t1', label: `braking time = ${M`k`} × accelerating time` },
            { v: 'a3=k*a1', label: `deceleration = ${M`k`} × acceleration` },
            { v: 't1=k*t2', label: `accelerating time = ${M`k`} × steady time` },
          ] },
        { key: 'rel.k', label: `The number ${M`k`}`, placeholder: '—', narrow: true,
          hint: '“Four times as long” is 4. A third: type it with a slash.' },
      ] },
    { title: 'Ask about a moment, if the paper does',
      fields: [
        { key: 'at.t', label: 'Speed at time (s)', placeholder: '—', hint: 'Its speed then, and where it is.' },
        { key: 'at.s', label: 'When it has gone (m)', placeholder: '—', hint: 'Halfway is half of D.' },
        { key: 'at.v', label: 'When its speed is (m s⁻¹)', placeholder: '—', hint: 'Usually twice: up, and braking.' },
      ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range'], extras: ['energy'], bounce: true },

  /* A TIME-LAPSE. A train between stations takes minutes, and five minutes
     of a dot crossing a track is not a demonstration. So the clock runs at a
     whole multiple of real time chosen to fit the journey into about fifteen
     seconds, and the stage says so beside the clock. Nothing in the physics
     changes: t is still the journey's own time. */
  lapse: (f) => timeLapse(f.tMax),

  read(vals) {
    const k = Object.fromEntries(KEYS.map((q) => [q, vals[q]]));
    k.rel = vals['rel.kind'] || vals['rel.k'] != null ? { kind: vals['rel.kind'], k: vals['rel.k'] } : null;
    k.at = { t: vals['at.t'], s: vals['at.s'], v: vals['at.v'] };
    return k;
  },
  solve: solveJourney,
  working: (solved) => journeyWorking(solved),
  render: stage.render,

  /** The readouts, named as the road names them: displacement from A,
      velocity, acceleration — braking is a negative one. */
  hud(f, t, { rate = 1 } = {}) {
    const done = t >= f.tMax - 1e-9, lapse = timeLapse(f.tMax);
    return {
      left: [
        { k: 'Displacement from A', v: num(f.pos(t).x, 1), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t).x, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: done ? 'Acceleration, at rest at B' : 'Acceleration', v: done ? '0' : tr(f.accel(t)), unit: 'm s⁻²', hue: 'acc' },
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
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t,
        series: [{ label: 'from A', fn: (tt) => f.pos(tt).x, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t, points: rings,
        series: [{ label: 'velocity', fn: (tt) => f.vel(tt).x, color: P.vel, dash: [6, 4] }],
        shade: { index: 0, label: 'area = displacement from A', color: P.disp } },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: [{ label: 'acceleration', fn: (tt) => f.accel(tt), color: P.acc, dash: [6, 4],
                   breaks: [f.J.t1, f.J.t1 + f.J.t2] }] },
    ];
  },

  /** The card's sketch: the trapezium, with the area under it shaded. */
  thumb(s) {
    const r = solveJourney(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const J = r.J, X = (t) => 10 + (t / J.T) * 100, Y = (v) => 50 - (v / J.V) * 36;
    const d = `M${X(0)} ${Y(0)} L${X(J.t1).toFixed(1)} ${Y(J.V)} L${X(J.t1 + J.t2).toFixed(1)} ${Y(J.V)} L${X(J.T)} ${Y(0)}`;
    const marks = Array.from({ length: 11 }, (_, i) => {
      const x = 10 + (r.f.pos((i / 10) * J.T).x / J.D) * 100;
      return `<circle cx="${x.toFixed(1)}" cy="56" r="1.8" fill="var(--vel)"/>`;
    }).join('');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <path d="${d} Z" fill="var(--disp)" opacity=".16"/>
      <line x1="8" y1="50" x2="114" y2="50" stroke="var(--border)" stroke-width="1"/>
      <line x1="${X(J.t1).toFixed(1)}" y1="50" x2="${X(J.t1).toFixed(1)}" y2="${Y(J.V)}" stroke="var(--ink-faint)" stroke-width="1" stroke-dasharray="2 2"/>
      <line x1="${X(J.t1 + J.t2).toFixed(1)}" y1="50" x2="${X(J.t1 + J.t2).toFixed(1)}" y2="${Y(J.V)}" stroke="var(--ink-faint)" stroke-width="1" stroke-dasharray="2 2"/>
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="5 3" stroke-linejoin="round"/>
      ${marks}
    </svg>`;
  },

  /** Three rows of five, one per stage, and what was assumed. */
  ending(solved) {
    const { J, unknown, answers } = solved;
    const cell = (x, p) => `<b>${tr(x, p)}</b>`;
    const rows = [
      ['up', 'Speeding up', `from rest to ${tr(J.V)} m s⁻¹`, 0, J.V, J.a1, J.s1, J.t1],
      ['steady', 'Steady', `at ${tr(J.V)} m s⁻¹`, J.V, J.V, 0, J.s2, J.t2],
      ['down', 'Braking', 'to rest at B', J.V, 0, -J.a3, J.s3, J.t3],
    ].filter((x) => x[7] > 1e-9);
    const table = `
      <div class="ph-tab" role="table" aria-label="Each stage, solved on its own">
        <div class="ph-head" role="row">
          <span role="columnheader">Stage</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span>
          <span role="columnheader">${M`a`}</span><span role="columnheader">${M`s`}</span>
          <span role="columnheader">${M`t`}</span>
        </div>
        ${rows.map(([key, name, sub, u, v, a, s, t]) => `
          <div class="ph-row" role="row" data-key="stage">
            <span class="ph-name" role="cell"><b>${name}</b><em>${sub}</em></span>
            <span role="cell">${cell(u)}</span><span role="cell">${cell(v)}</span>
            <span role="cell">${cell(a)}</span><span role="cell">${cell(s)}</span>
            <span role="cell">${cell(t)}</span>
          </div>`).join('')}
        <div class="ph-row ph-sum" role="row">
          <span class="ph-name" role="cell"><b>A to B</b><em>the stages added up</em></span>
          <span role="cell">${cell(0)}</span><span role="cell">${cell(0)}</span>
          <span role="cell">—</span><span role="cell">${cell(J.D)}</span><span role="cell">${cell(J.T)}</span>
        </div>
        <p class="ph-units">The direction of travel is positive, so braking is a negative ${M`a`}. ${M`u`} and ${M`v`} in
          ${M`[m s^-1]`}, ${M`a`} in ${M`[m s^-2]`}, ${M`s`} in ${M`[m]`}, ${M`t`} in ${M`[s]`}, each stage timed from its own start.</p>
      </div>`;
    const found = unknown ? `<p>The one unknown was ${M`${unknown === 'V' ? 'V' : `${unknown[0]}_${unknown[1]}`}`}${solved.dependsOn
      ? ': every stage that depended on it was written in terms of it, and' : '. Every time followed from what was given, and'} ${solved.fixedBy} fixed it at
      <b>${M`${tr(solved.x)} ${unknown === 'V' ? '[m s^-1]' : '[s]'}`}</b>.</p>` : '';
    const asked = answers.filter((a) => a.ok).map((a) => `<p>${a.text}</p>`).join('');
    return {
      eyebrow: `From A to B in ${tr(J.T)} <span class="u">s</span>`,
      title: `${tr(J.D)} m, at up to ${tr(J.V)} m s⁻¹.`,
      body: `${found}${asked}${table}`,
      real: true,
    };
  },
};
