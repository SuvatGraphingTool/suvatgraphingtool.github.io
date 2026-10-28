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

  /** The readouts on the stage: each particle's height and velocity, to the
      two places the answers are given to. */
  hud(f, t) {
    const s = f.at(t);
    return {
      left: [
        { k: 'Height of A', v: fmt(s.A.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity of A', v: fmt(s.A.v, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Height of B', v: fmt(s.B.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity of B', v: fmt(s.B.v, 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: fmt(t, 2), unit: 's' }],
    };
  },

  /* The three graphs, both particles on each. Vertical, so solid (rule 2).
     A's line is the quantity's own hue; B's is the second-object stone, as
     the second object is everywhere on this site, and each line carries its
     letter. B is drawn first so that where the two coincide — both at −g on
     the acceleration graph — A's line is the one on top, and a third tag
     says so. The meeting is a ring where the height lines cross. */
  graphs(f, t, P) {
    const { A, B, meet } = f, tMax = f.tMax;
    const both = (fnA, fnB, cA) => [
      { label: 'B', tag: 'B', fn: fnB, color: P.second, dash: null },
      { label: 'A', tag: 'A', fn: fnA, color: cA, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Height–time', unit: 'm', tMax, t,
        series: both((tt) => A.pos(tt), (tt) => B.pos(tt), P.disp),
        points: meet ? [{ t: meet.t, y: meet.x, color: P.mark }] : [] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: both((tt) => A.vel(tt), (tt) => B.vel(tt), P.vel),
        points: meet ? [{ t: meet.t, y: meet.vA, color: P.mark }, { t: meet.t, y: meet.vB, color: P.mark }] : [] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: both((tt) => A.acc(tt), (tt) => B.acc(tt), P.acc),
        note: Math.abs(A.g) > 1e-9 ? 'both −g once moving' : '' },
    ];
  },

  /** The card's sketch: the one vertical line, where each particle was at
      equal steps of time — A's marks to the left, B's to the right, the way
      down a lane further out than the way up — and the ring where they met. */
  thumb(s) {
    const r = solvePair(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const { A, B, meet, f } = r;
    const Y = (y) => 51.5 - (y / (f.top * 1.1)) * 44, X = 56;
    const dots = (p, side, color) => {
      const out = [];
      for (let i = 0; i <= 10; i++) {
        const t = (i / 10) * f.tMax;
        if (t < p.t0 - 1e-9) continue;
        const x = X + side * (f.rising(p, t) ? 8 : 17);
        out.push(`<circle cx="${x}" cy="${Y(p.pos(t)).toFixed(1)}" r="2.3" fill="${color}"/>`);
      }
      return out.join('');
    };
    const tower = (p, side) => {
      if (!(p.h > 0)) return '';
      const x0 = side > 0 ? X + 28 : X - 40, y = Y(p.h).toFixed(1);
      return `<rect x="${x0}" y="${y}" width="12" height="${(51.5 - Y(p.h)).toFixed(1)}" fill="var(--border-soft)" stroke="var(--border)" stroke-width="1"/>
        <line x1="${X + side * 4}" y1="${y}" x2="${side > 0 ? X + 28 : X - 28}" y2="${y}" stroke="var(--ink-faint)" stroke-width="1.6"/>`;
    };
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="2" y1="51.5" x2="118" y2="51.5" stroke="var(--border)" stroke-width="1"/>
      ${tower(A, -1)}${tower(B, 1)}
      <line x1="${X}" y1="51.5" x2="${X}" y2="4" stroke="var(--ink-faint)" stroke-width="1" stroke-dasharray="2 2.5"/>
      ${dots(A, -1, 'var(--vel)')}${dots(B, 1, 'var(--second)')}
      ${meet ? `<circle cx="${X}" cy="${Y(meet.x).toFixed(1)}" r="4.4" fill="none" stroke="var(--mark)" stroke-width="1.8"/>` : ''}
    </svg>`;
  },

  /** What the end of the run says: two rows of five, and what was assumed.
      Every sentence about what happened is the engine's own (solved.say). */
  ending(solved) {
    const { meet, rows } = solved;
    if (!meet) {
      return {
        eyebrow: solved.watched,
        title: solved.outcome === 'ground' ? 'Level only on the ground.' : 'They never met.',
        body: `<p>${solved.why}</p>
          <p>Nothing was steered here: the two motions are exactly the ones you set. Change a
          start time, a height or a velocity and run it again.</p>`,
        real: false,
      };
    }
    const cell = (x, dp = 2) => `<b>${num(x, dp, { trim: true })}</b>`;
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
            <span class="ph-name" role="cell"><b>${x.name}</b><em>${x.held ? 'still held' : `set off at ${M`t = ${num(x.t0, 2, { trim: true })} [s]`}`}</em></span>
            <span role="cell">${cell(x.u)}</span><span role="cell">${cell(x.v)}</span>
            <span role="cell">${cell(x.a)}</span><span role="cell">${cell(x.s)}</span>
            <span role="cell">${cell(x.t, 3)}</span>
          </div>`).join('')}
        <p class="ph-units">Up is positive. ${M`u`} and ${M`v`} in ${M`[m s^-1]`}, ${M`a`} in
          ${M`[m s^-2]`}, ${M`s`} in ${M`[m]`} from where each started, and each ${M`t`} is
          timed from when that particle set off — which is the ${M`t`} most papers ask for.</p>
      </div>`;
    const ex = (key) => solved.extras.find((x) => x.key === key)?.value;
    const tr = (x, dp = 2) => num(x, dp, { trim: true });
    const own = solved.moment.own.map((r) => `${tr(r.t, 3)} s after ${r.name} sets off`).join(', ');
    return {
      eyebrow: `Stopped at the collision, ${tr(meet.t, 3)} s in${own ? ` · ${own}` : ''}`,
      title: `They meet ${tr(meet.x)} m above the ground.`,
      body: `<p>Each one is SUVAT on its own, with ${M`a = -g`}; the meeting is the one instant both
          give the same height. Their speeds then differ by <b>${tr(ex('dSpeed'))} m s⁻¹</b>,
          and they close on each other at <b>${tr(ex('closing'))} m s⁻¹</b>.</p>${table}`,
      real: true,
    };
  },
};
