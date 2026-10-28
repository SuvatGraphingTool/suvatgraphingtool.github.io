// kits/pair.js — two particles in one vertical line, wired for the app.
//
// A KIT is one scenario family's pieces gathered in the shape js/app.js asks
// for, so a new family plugs in through one route instead of a flag tested in
// fifteen places. It owns no physics: the engine is js/core/pair.js, the
// stage js/render/column.js, and this file only says which boxes to show,
// how to read them, and how to lay out what the engine answered (rule 4).
// The interface is described in design/components.md.

import { solvePair, pairWorking } from '../core/pair.js';
import * as column from '../render/column.js';
import { M, num } from '../notation.js';

const fmt = (x, dp = 2) => num(x, dp);

/** The boxes on the values screen, in two columns, then g across both. */
const FIELDS = [
  { key: 'A.h',  col: 'A', label: 'Height it starts from (m)', hint: '0 if it starts on the ground.' },
  { key: 'A.u',  col: 'A', label: 'Initial velocity (m s⁻¹)', hint: 'Up is positive: thrown down is negative, dropped is 0.', say: 'dir' },
  { key: 'A.t0', col: 'A', label: 'When it sets off (s)', hint: 'Leave blank to start the clock with it.', optional: true },
  { key: 'B.h',  col: 'B', label: 'Height it starts from (m)', hint: 'For “dropped from 40 m”, type 40.' },
  { key: 'B.u',  col: 'B', label: 'Initial velocity (m s⁻¹)', hint: 'Up is positive: thrown down is negative, dropped is 0.', say: 'dir' },
  { key: 'B.t0', col: 'B', label: 'When it sets off (s)', hint: '“One second later” is 1. Blank is 0.', optional: true },
];

export const pair = {
  id: 'pair',
  verb: 'Set them off',
  voice: {
    h: 'How do the two set off?',
    sub: 'Two particles on <b>one vertical line</b>, each on its own clock. Give where each '
      + 'starts, how fast, and when — the engine finds where they meet, if they do.',
  },
  fields: FIELDS,
  cols: { A: 'Particle A', B: 'Particle B' },
  // The value of g, with the three the papers use one press away.
  g: [9.81, 9.8, 10],
  hides: { shows: ['components', 'apex', 'range', 'ruler'], extras: ['energy'], bounce: true },

  /** What a velocity box means, said back as the student types it. */
  dir(v) {
    if (!isFinite(v)) return '';
    return v > 0 ? 'upwards' : v < 0 ? 'downwards' : 'from rest — dropped';
  },

  read(vals) {
    const p = (n) => ({ h: vals[`${n}.h`], u: vals[`${n}.u`], t0: vals[`${n}.t0`] });
    return { A: p('A'), B: p('B'), g: vals.g };
  },
  solve: solvePair,
  working: (solved) => pairWorking(solved),
  render: column.render,

  /** The readouts on the stage: each particle's height and velocity. */
  hud(f, t) {
    const s = f.at(t);
    return {
      left: [
        { k: 'Height of A', v: fmt(s.A.x, 1), unit: 'm', hue: 'disp' },
        { k: 'Velocity of A', v: fmt(s.A.v, 1), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Height of B', v: fmt(s.B.x, 1), unit: 'm', hue: 'disp' },
        { k: 'Velocity of B', v: fmt(s.B.v, 1), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: fmt(t, 2), unit: 's' }],
    };
  },

  /* The three graphs, both particles on each. Vertical, so solid (rule 2);
     A takes the quantity's hue and B the second-object stone, as on the
     stage, and each line carries its letter. The meeting is marked where
     the two height lines cross. */
  graphs(f, t, P) {
    const { A, B, meet } = f, tMax = f.tMax;
    const pts = (fn) => (meet ? [{ t: meet.t, y: fn, color: P.mark }] : []);
    return [
      { canvas: 'g-s', title: 'Height–time', unit: 'm', tMax, t,
        series: [{ label: 'A', tag: 'A', fn: (tt) => A.pos(tt), color: P.disp, dash: null },
                 { label: 'B', tag: 'B', fn: (tt) => B.pos(tt), color: P.second, dash: null }],
        points: pts(meet?.x).map((p) => ({ ...p, label: 'they meet' })) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: [{ label: 'A', tag: 'A', fn: (tt) => A.vel(tt), color: P.vel, dash: null },
                 { label: 'B', tag: 'B', fn: (tt) => B.vel(tt), color: P.second, dash: null }],
        points: meet ? [{ t: meet.t, y: meet.vA, color: P.mark }, { t: meet.t, y: meet.vB, color: P.mark }] : [] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: [{ label: 'A', tag: 'A', fn: (tt) => A.acc(tt), color: P.acc, dash: null },
                 { label: 'B', tag: 'B', fn: (tt) => B.acc(tt), color: P.second, dash: null }] },
    ];
  },

  /** The card's sketch: both paths against time, and where they cross. */
  thumb(s) {
    const r = solvePair(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const { A, B, meet } = r, tEnd = r.f.tMax;
    const top = r.f.top;
    const X = (t) => 8 + (t / tEnd) * 104, Y = (y) => 51 - (y / (top * 1.12)) * 43;
    const path = (p) => Array.from({ length: 41 }, (_, i) => {
      const t = (i / 40) * tEnd; return `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(p.pos(t)).toFixed(1)}`;
    }).join(' ');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="2" y1="51.5" x2="118" y2="51.5" stroke="var(--border)" stroke-width="1"/>
      <path d="${path(B)}" fill="none" stroke="var(--second)" stroke-width="1.9" stroke-dasharray="5 3.5" stroke-linecap="round"/>
      <path d="${path(A)}" fill="none" stroke="var(--vel)" stroke-width="2.3" stroke-linecap="round"/>
      ${meet ? `<circle cx="${X(meet.t).toFixed(1)}" cy="${Y(meet.x).toFixed(1)}" r="3.6" fill="none" stroke="var(--mark)" stroke-width="1.8"/>` : ''}
    </svg>`;
  },

  /** What the end of the run says: two rows of five, and what was assumed. */
  ending(solved, e) {
    const { meet, rows, A, B } = solved;
    if (!meet) {
      return {
        eyebrow: `Watched until ${A.tLand > B.tLand ? 'A' : 'B'} reached the ground`,
        title: 'They never met.',
        body: `<p>${solved.notes[solved.notes.length - 1]}</p>
          <p>Nothing was steered here: the two motions are exactly the ones you set, and
          their heights are never equal while both are in the air. Change one start time,
          height or velocity and try again.</p>`,
      };
    }
    const cell = (x, dp = 2) => `<b>${fmt(x, dp)}</b>`;
    const table = `
      <div class="ph-tab" role="table" aria-label="Each particle, from when it set off to the meeting">
        <div class="ph-head" role="row">
          <span role="columnheader">Particle</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span>
          <span role="columnheader">${M`a`}</span><span role="columnheader">${M`s`}</span>
          <span role="columnheader">${M`t`}</span>
        </div>
        ${rows.map((x) => `
          <div class="ph-row" role="row" data-key="${x.name === 'A' ? 'first' : 'second'}">
            <span class="ph-name" role="cell"><b>${x.name}</b><em>${x.held ? 'still held' : `set off at ${fmt(x.name === 'A' ? A.t0 : B.t0, 2)} s`}</em></span>
            <span role="cell">${cell(x.u)}</span><span role="cell">${cell(x.v)}</span>
            <span role="cell">${cell(x.a)}</span><span role="cell">${cell(x.s)}</span>
            <span role="cell">${cell(x.t, 3)}</span>
          </div>`).join('')}
        <p class="ph-units">Up is positive. ${M`u`} and ${M`v`} in ${M`[m s^-1]`}, ${M`a`} in
          ${M`[m s^-2]`}, ${M`s`} in ${M`[m]`} from where each started, and each ${M`t`} is
          timed from when that particle set off — which is the ${M`t`} most papers ask for.</p>
      </div>`;
    const ex = (key) => solved.extras.find((x) => x.key === key)?.value;
    return {
      eyebrow: `They meet at t = ${num(meet.t, 3, { trim: true })} s`,
      title: `${fmt(meet.x, 2)} m above the ground.`,
      body: `<p>Each one is SUVAT on its own, with ${M`a = -g`}; the meeting is the one
          instant both give the same height. Their speeds then differ by
          <b>${fmt(ex('dSpeed'), 2)} m s⁻¹</b>, and they close on each other at
          <b>${fmt(ex('closing'), 2)} m s⁻¹</b>.</p>${table}`,
    };
  },
};

