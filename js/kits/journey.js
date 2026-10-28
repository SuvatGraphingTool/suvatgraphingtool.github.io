// kits/journey.js — a journey in three stages, from rest to rest, wired for
// the app. The engine is js/core/journey.js and the stage
// js/render/journey.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4). See design/components.md.

import { solveJourney, journeyWorking, RELATIONS } from '../core/journey.js';
import * as stage from '../render/journey.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (Math.abs(x) < 1 ? 4 : 2), { trim: true });
const KEYS = ['V', 't1', 't2', 't3', 'a1', 'a3', 'T', 'D'];

/** The eight, grouped the way the graph is: one column per stage, then the whole. */
const FIELDS = [
  { key: 'a1', col: 'up', label: `Acceleration ${M`a_1`} (m s⁻²)` },
  { key: 't1', col: 'up', label: `Time ${M`t_1`} (s)` },
  { key: 'V', col: 'steady', label: `Top speed ${M`V`} (m s⁻¹)` },
  { key: 't2', col: 'steady', label: `Time ${M`t_2`} (s)` },
  { key: 'a3', col: 'down', label: `Deceleration ${M`a_3`} (m s⁻²)`, hint: 'Its size: 0.25, not −0.25.' },
  { key: 't3', col: 'down', label: `Time ${M`t_3`} (s)` },
  { key: 'T', col: 'whole', label: `Whole time ${M`T`} (s)`, hint: '5 minutes is 300.' },
  { key: 'D', col: 'whole', label: `Whole distance ${M`D`} (m)`, hint: '6.3 km is 6300.' },
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
          options: Object.entries(RELATIONS).map(([v, r]) => ({ v, label: r.say })) },
        { key: 'rel.k', label: `The number ${M`k`}`, placeholder: '—',
          hint: `“Four times as long” is 4; “a third of” is ${M`1/3`}, and the box takes a fraction typed that way.` },
      ] },
    { title: 'Ask about a moment, if the paper does',
      fields: [
        { key: 'at.t', label: 'Speed at time (s)', placeholder: '—', hint: 'Its speed then, and where it is.' },
        { key: 'at.s', label: 'When it has gone (m)', placeholder: '—', hint: 'Halfway is half of D.' },
        { key: 'at.v', label: 'When its speed is (m s⁻¹)', placeholder: '—', hint: 'Usually twice: up, and braking.' },
      ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range'], extras: ['energy'], bounce: true },

  read(vals) {
    const k = Object.fromEntries(KEYS.map((q) => [q, vals[q]]));
    k.rel = vals['rel.kind'] ? { kind: vals['rel.kind'], k: vals['rel.k'] } : null;
    k.at = { t: vals['at.t'], s: vals['at.s'], v: vals['at.v'] };
    return k;
  },
  solve: solveJourney,
  working: (solved) => journeyWorking(solved),
  render: stage.render,

  hud(f, t) {
    const st = f.stageAt(t);
    return {
      left: [
        { k: 'Distance from A', v: num(f.pos(t).x, 1), unit: 'm', hue: 'disp' },
        { k: 'Speed', v: num(f.vel(t).x, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: st.kind === 'braking' ? 'Decelerating' : st.kind === 'steady' ? 'Steady' : 'Accelerating',
          v: num(Math.abs(f.accel(t)), 3), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
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
        shade: { index: 0, label: 'area = distance from A' } },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: [{ label: 'acceleration', fn: (tt) => f.accel(tt), color: P.acc, dash: [6, 4] }] },
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
          <div class="ph-row" role="row" data-key="${key === 'up' ? 'free' : key === 'down' ? 'canopy' : 'steady'}">
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
    const found = unknown ? `<p>The one unknown was ${M`${unknown === 'V' ? 'V' : `${unknown[0]}_${unknown[1]}`}`}: every stage
      was written in terms of it, and the area under the speed–time graph — the distance — fixed it at
      <b>${M`${tr(solved.x)} ${unknown === 'V' ? '[m s^-1]' : '[s]'}`}</b>.</p>` : '';
    const asked = answers.filter((a) => a.ok).map((a) => `<p>${a.text}</p>`).join('');
    return {
      eyebrow: `From A to B in ${tr(J.T)} s`,
      title: `${tr(J.D)} m, at up to ${tr(J.V)} m s⁻¹.`,
      body: `${found}${asked}${table}`,
      real: true,
    };
  },
};
