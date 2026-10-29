// kits/trip.js — a velocity–time graph of straight segments, forwards and
// back, wired for the app. Engine js/core/trip.js, stage js/render/trip.js;
// this file says which boxes to show, reads them, and lays out what the
// engine answered (rule 4).

import { solveTrip, tripWorking } from '../core/trip.js';
import * as stage from '../render/trip.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const N = 6;

const seg = (i) => ({
  title: `Segment ${i}`,
  fields: [
    { key: `s${i}.who`, type: 'choice', label: 'Moving', default: i <= 3 ? 'car' : 'foot', hint: '',
      options: [{ v: 'car', label: 'the car' }, { v: 'foot', label: 'on foot' }] },
    { key: `s${i}.u`, label: 'Starts at (m s⁻¹)', aria: `Segment ${i}: the velocity it starts at (m s⁻¹)`, optional: true, placeholder: '—', hint: i === 1 ? 'Blank: from rest.' : 'Blank: where the last ended.' },
    { key: `s${i}.v`, label: 'Ends at (m s⁻¹)', aria: `Segment ${i}: the velocity it ends at (m s⁻¹)`, placeholder: '—', hint: 'Negative is going back.' },
    { key: `s${i}.t`, label: 'For (s)', aria: `Segment ${i}: how long it lasts (s)`, placeholder: '—', hint: 'Blank: for the engine.' },
  ],
});

export const trip = {
  id: 'trip',
  verb: 'Set off',
  voice: {
    h: 'What does the graph do?',
    sub: 'A velocity–time graph of straight segments: each one from the velocity it starts at to the one it ends at, over its own time. '
      + 'Below zero is going back. Leave a moving segment’s time blank and say where it ends; leave a stop’s time blank and give the total time.',
  },
  fields: [
    { key: 'T', col: 'whole', label: 'Total time (s)', placeholder: '—', hint: 'Fixes a stop left blank.' },
    { key: 'back', col: 'whole', label: 'Ends back at the start of segment', placeholder: '—', hint: '“Back at the car”: the segment where the walk began.' },
  ],
  cols: { whole: 'The whole graph' },
  rows: Array.from({ length: N }, (_, i) => seg(i + 1)),
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(vals) {
    const segs = Array.from({ length: N }, (_, i) => ({ who: vals[`s${i + 1}.who`] || (i < 3 ? 'car' : 'foot'), u: vals[`s${i + 1}.u`], v: vals[`s${i + 1}.v`], t: vals[`s${i + 1}.t`] }));
    return { segs, T: vals.T, back: vals.back };
  },
  solve: solveTrip,
  working: (solved) => tripWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'From the start', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: num(f.acc(t), 2), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along the road, so dashed (rule 2); broken at every jump. */
  graphs(f, t, P) {
    const cuts = f.S.filter((s) => s.jump).map((s) => s.t0);
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'x', fn: (tt) => f.pos(tt), color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'v', fn: (tt) => f.vel(tt), color: P.vel, dash: [6, 4], breaks: cuts }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'a', fn: (tt) => f.acc(tt), color: P.acc, dash: [6, 4], breaks: f.S.map((s) => s.t0).slice(1) }] },
    ];
  },

  thumb(s) {
    const r = solveTrip(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const vs = r.S.flatMap((x) => [x.v0, x.v1, 0]), hi = Math.max(...vs), lo = Math.min(...vs);
    const X = (t) => 8 + (t / r.T) * 106, Y = (v) => 52 - ((v - lo) / ((hi - lo) || 1)) * 44;
    const d = r.S.map((x) => `M${X(x.t0).toFixed(1)} ${Y(x.v0).toFixed(1)} L${X(x.t1).toFixed(1)} ${Y(x.v1).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="8" y1="${Y(0).toFixed(1)}" x2="116" y2="${Y(0).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="5 3" stroke-linecap="round"/>
    </svg>`;
  },

  ending(solved) {
    const found = solved.S.filter((s) => s.found);
    const title = found.length ? found.map((s) => `t${String(s.i).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c])} = ${tr(s.t)} s`).join(', ') + '.' : `${tr(solved.D)} m in all.`;
    const cell = (x) => `<b>${tr(x)}</b>`;
    const rows = solved.S.map((s) => `<div class="ph-row" role="row" data-key="${s.who === 'foot' ? 'second' : 'first'}">
        <span class="ph-name" role="cell"><b>${s.i}</b><em>${s.who === 'foot' ? 'on foot' : 'the car'}</em></span>
        <span role="cell">${cell(s.v0)}</span><span role="cell">${cell(s.v1)}</span><span role="cell">${cell(s.a)}</span>
        <span role="cell">${cell(s.s)}</span><span role="cell">${cell(s.t)}</span></div>`).join('');
    const table = `<div class="ph-tab" role="table" aria-label="Each segment of the graph">
        <div class="ph-head" role="row"><span role="columnheader">Segment</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span><span role="columnheader">${M`a`}</span>
          <span role="columnheader">${M`s`}</span><span role="columnheader">${M`t`}</span></div>
        ${rows}
        <p class="ph-units">Velocities in ${M`[m s^-1]`}, forwards positive; ${M`a`} in ${M`[m s^-2]`}; ${M`s`} in ${M`[m]`}, below zero going back; ${M`t`} in ${M`[s]`}.</p></div>`;
    return {
      eyebrow: `Over <span class="u">${tr(solved.T)}</span> <span class="u">s</span>`,
      title,
      body: `${solved.notes.map((x) => `<p>${x}</p>`).join('')}${table}`,
      real: true,
    };
  },
};
