// kits/vtgraph.js — a velocity–time graph of straight pieces: the greatest
// acceleration, the displacement as area, when it is back where it started;
// wired for the app. Engine js/core/vtgraph.js, stage js/render/vtgraph.js;
// this file says which boxes to show, reads them, and lays out what the
// engine answered (rule 4).

import { solveVt, vtWorking } from '../core/vtgraph.js';
import * as stage from '../render/vtgraph.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const N = 8;

export const vtgraph = {
  id: 'vtgraph',
  verb: 'Play it',
  voice: {
    h: 'Read the velocity–time graph',
    sub: 'An object on a line, its velocity a graph of straight pieces: the gradient of each is its acceleration, the area under it its displacement — below the axis is going back. '
      + 'Give the velocity at the start and each corner; it finds the greatest acceleration and every time it is back where it started.',
  },
  fields: [
    { key: 'v0', col: 'start', label: 'Velocity at t = 0 (m s⁻¹)', placeholder: '—', hint: '0 from rest.' },
  ],
  cols: { start: 'The start' },
  rows: [
    ...Array.from({ length: N }, (_, i) => ({ title: `Corner ${i + 1}`, fields: [
      { key: `p${i + 1}.t`, label: 'At t (s)', aria: `Corner ${i + 1}: the time (s)`, optional: true, placeholder: '—', hint: '' },
      { key: `p${i + 1}.v`, label: 'v is (m s⁻¹)', aria: `Corner ${i + 1}: the velocity (m s⁻¹)`, optional: true, placeholder: '—', hint: i === 0 ? 'Below zero is going back.' : '' },
    ] })),
    { title: 'What the paper asks', fields: [
      { key: 'askS', label: 'When is it this far from the start (m)', aria: 'When is it this displacement from the start (m)', placeholder: '0', hint: 'Blank: when it is back where it started.' },
      { key: 'askT', label: 'Displacement and velocity at time (s)', aria: 'The displacement and velocity at this time (s)', placeholder: '—', hint: '' },
    ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(v) {
    return { v0: v.v0, pts: Array.from({ length: N }, (_, i) => ({ t: v[`p${i + 1}.t`], v: v[`p${i + 1}.v`] })), ask: { t: v.askT, s: v.askS } };
  },
  solve: solveVt,
  working: (solved) => vtWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Displacement', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: num(f.acc(t), 3), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along the line: dashed (rule 2); the acceleration breaks at each corner. */
  graphs(f, t, P) {
    const rings = f.times.map((tz) => ({ t: tz, y: f.target, color: P.mark }));
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, points: rings, series: [{ label: 'x', fn: f.pos, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'v', fn: f.vel, color: P.vel, dash: [6, 4] }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'a', fn: f.acc, color: P.acc, dash: [6, 4], breaks: f.S.map((s) => s.t0).slice(1) }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="8" y1="26" x2="116" y2="26" stroke="var(--border)"/>
      <path d="M8 26 L30 38 L42 14 L70 14 L82 48 L100 48 L116 26" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="5 3"/>
    </svg>`;
  },

  ending(s) {
    const list = (ts) => ts.map((x) => `t = ${tr(x)} s`).join(ts.length > 2 ? ', ' : ' and ');
    const where = Math.abs(s.target) < 1e-9 ? 'back at the start' : `${tr(s.target)} m from the start`;
    const title = `${s.times.length ? `${where.replace(/^./, (c) => c.toUpperCase())} at ${list(s.times)}` : `Never ${where}${s.rests.length ? ' except at rest' : ''}`}; greatest acceleration ${tr(s.aMax)} m s⁻².`;
    return { eyebrow: 'A velocity–time graph', title,
      body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
