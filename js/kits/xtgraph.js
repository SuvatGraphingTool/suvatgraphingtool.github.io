// kits/xtgraph.js — a displacement–time graph of straight pieces, then a
// constant acceleration given as a formula; wired for the app. Engine
// js/core/xtgraph.js, stage js/render/xtgraph.js; this file says which boxes
// to show, reads them, and lays out what the engine answered (rule 4).

import { solveXt, xtWorking } from '../core/xtgraph.js';
import * as stage from '../render/xtgraph.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const N = 6;

export const xtgraph = {
  id: 'xtgraph',
  verb: 'Play it',
  voice: {
    h: 'Read the displacement–time graph',
    sub: 'A particle on a line, at rest on the flat pieces and at a steady velocity on the sloping ones. Give where it starts and each corner after it; leave one corner’s time blank and give the speed to have it found. '
      + 'After the last corner it may move with a constant acceleration, given as a formula in t.',
  },
  fields: [
    { key: 'x0', col: 'graph', label: 'At t = 0, x is (m)', placeholder: '—', hint: 'The displacement from A.' },
    { key: 'speed', col: 'graph', label: 'Speed of every sloping piece (m s⁻¹)', placeholder: '—', hint: 'Fills a blank corner time; checks the rest.' },
  ],
  cols: { graph: 'The graph' },
  rows: [
    ...Array.from({ length: N }, (_, i) => ({ title: `Corner ${i + 1}`, fields: [
      { key: `p${i + 1}.t`, label: 'At t (s)', aria: `Corner ${i + 1}: the time (s)`, optional: true, placeholder: '—', hint: i === 0 ? 'One may be blank: T.' : '' },
      { key: `p${i + 1}.x`, label: 'x is (m)', aria: `Corner ${i + 1}: the displacement (m)`, optional: true, placeholder: '—', hint: '' },
    ] })),
    { title: 'After the last corner, a formula', fields: [
      { key: 'c0', label: `${M`c_0`}`, aria: 'After the graph: the constant c0', placeholder: '—', hint: `In ${M`x = c_0 + c_1 t + c_2 t^2`}. Blank all three to stop at the graph.` },
      { key: 'c1', label: `${M`c_1`}`, aria: 'After the graph: the coefficient of t, c1', placeholder: '—', hint: '' },
      { key: 'c2', label: `${M`c_2`}`, aria: 'After the graph: the coefficient of t squared, c2', placeholder: '—', hint: '' },
      { key: 'tailSpeed', label: 'When is its speed (m s⁻¹)', aria: 'After the graph: when is its speed this (m s⁻¹)', placeholder: '—', hint: '' },
    ] },
    { title: 'Velocity at these times', fields: [1, 2, 3].map((j) => ({ key: `ask${j}`, label: `t (s)`, aria: `The velocity at time ${j} asked (s)`, placeholder: '—', hint: '' })) },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(v) {
    return { x0: v.x0, speed: v.speed, pts: Array.from({ length: N }, (_, i) => ({ t: v[`p${i + 1}.t`], x: v[`p${i + 1}.x`] })),
      tail: { c0: v.c0, c1: v.c1, c2: v.c2, speed: v.tailSpeed }, ask: { ts: [v.ask1, v.ask2, v.ask3] } };
  },
  solve: solveXt,
  working: (solved) => xtWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Displacement from A', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along the line: dashed (rule 2); the velocity jumps at each corner. */
  graphs(f, t, P) {
    const cuts = f.S.map((s) => s.t1);
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'x', fn: (tt) => f.pos(tt), color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'v', fn: (tt) => f.vel(tt), color: P.vel, dash: [6, 4], breaks: cuts }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'a', fn: (tt) => f.acc(tt), color: P.acc, dash: [6, 4], breaks: [f.tEnd] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="8" y1="30" x2="116" y2="30" stroke="var(--border)" stroke-width="1"/>
      <path d="M8 14 L28 14 L40 30 L58 30 L74 50 L100 22" fill="none" stroke="var(--disp)" stroke-width="2.2" stroke-linejoin="round"/>
    </svg>`;
  },

  ending(s) {
    const title = s.blankT != null ? `T = ${tr(s.blankT)} s; ${tr(s.dist)} m travelled.` : `${tr(s.dist)} m travelled, ${tr(Math.abs(s.disp))} m from where it started.`;
    const after = s.tail?.ts?.length ? ` Speed ${tr(s.tail.speed)} m s⁻¹ at t = ${tr(s.tail.ts[0])} s.` : '';
    const rows = s.S.map((x) => `<div class="ph-row" role="row" data-key="${x.i % 2 ? 'first' : 'second'}">
        <span class="ph-name" role="cell"><b>${x.i}</b><em>${Math.abs(x.v) < 1e-9 ? 'at rest' : x.v > 0 ? 'forwards' : 'back'}</em></span>
        <span role="cell"><b>${tr(x.t0)}</b></span><span role="cell"><b>${tr(x.t1)}</b></span><span role="cell"><b>${tr(x.v)}</b></span><span role="cell"><b>${tr(Math.abs(x.x1 - x.x0))}</b></span></div>`).join('');
    const table = `<div class="ph-tab" role="table" aria-label="Each piece of the graph">
        <div class="ph-head" role="row"><span role="columnheader">Piece</span><span role="columnheader">from</span><span role="columnheader">to</span>
          <span role="columnheader">${M`v`}</span><span role="columnheader">distance</span></div>${rows}
        <p class="ph-units">Times in ${M`[s]`}; ${M`v`} in ${M`[m s^-1]`}, away from A positive; distance in ${M`[m]`}.</p></div>`;
    return { eyebrow: 'A displacement–time graph', title: title + after, body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}${table}`, real: true };
  },
};
