// kits/clears.js — a projectile that just clears a wall and lands beyond it,
// every length a multiple of a, wired for the app. Engine js/core/clears.js,
// stage js/render/clears.js; this file says which boxes to show, reads them,
// and lays out what the engine answered (rule 4).

import { solveClears, clearsWorking, ka } from '../core/clears.js';
import * as stage from '../render/clears.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

export const clears = {
  id: 'clears',
  verb: 'Project it',
  voice: {
    h: 'Over the wall, in a letter',
    sub: 'Projected from O on level ground, it just clears a wall and lands beyond it. Every length is a multiple of one letter, a: give the multiples, and the angle follows from them alone. '
      + 'Then the speed of projection, or a itself, fixes the rest.',
  },
  fields: [
    { key: 'P', col: 'wall', label: `Wall is this far from O (× ${M`a`})`, placeholder: '—', hint: '1 for a.' },
    { key: 'Q', col: 'wall', label: `Wall is this high (× ${M`a`})`, placeholder: '—', hint: '0.5 for half of a.' },
    { key: 'beyond', col: 'wall', label: `Lands this far beyond it (× ${M`a`})`, placeholder: '—', hint: 'Past the wall, not from O.' },
  ],
  cols: { wall: 'The wall and the landing' },
  rows: [
    { title: 'One number more', fields: [
      { key: 'u', label: 'Speed of projection (m s⁻¹)', aria: 'One number more: the speed of projection (m s⁻¹)', placeholder: '—', hint: `Finds ${M`a`}.` },
      { key: 'a', label: `The length ${M`a`} (m)`, aria: 'One number more: the length a (m)', placeholder: '—', hint: 'Finds the speed.' },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(vals) {
    return { P: vals.P, Q: vals.Q, beyond: vals.beyond, u: vals.u, a: vals.a, g: vals.g };
  },
  solve: solveClears,
  working: (solved) => clearsWorking(solved),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    return {
      left: [
        { k: 'Across from O', v: num(r.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Height', v: num(r.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Vertical velocity', v: num(v.y, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Speed', v: num(Math.hypot(v.x, v.y), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Across dashed, up solid (rule 2); the moment it clears the wall ringed. */
  graphs(f, t, P) {
    const two = (fx, fy, c) => [
      { label: 'across', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'up', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, points: [{ t: f.tWall, y: f.wall.H, color: P.mark }],
        series: two((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: two((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: two(() => 0, () => -f.params.g, P.acc) },
    ];
  },

  /** The card's sketch: an arc that grazes a brick wall and lands beyond. */
  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="54" width="120" height="6" fill="#7c9a63" opacity="0.6"/>
      <rect x="31" y="38" width="6" height="16" fill="#a4553d"/>
      <path d="M6 54 Q50 -4 112 54" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  },

  ending(s) {
    const cell = (x) => `<b>${tr(x)}</b>`;
    const table = `
      <div class="ph-tab" role="table" aria-label="The launch found from the wall and the landing">
        <div class="ph-head" role="row">
          <span role="columnheader">${M`theta`}</span><span role="columnheader">${M`u`}</span><span role="columnheader">${M`a`}</span>
          <span role="columnheader">${M`H`}</span><span role="columnheader">${M`t`}</span><span role="columnheader">lands</span>
        </div>
        <div class="ph-row" role="row" data-key="first">
          <span role="cell">${cell(s.theta)}</span><span role="cell">${cell(s.u)}</span><span role="cell">${cell(s.a)}</span>
          <span role="cell">${cell(s.Hmax)}</span><span role="cell">${cell(s.T)}</span><span role="cell">${cell(s.R * s.a)}</span></div>
        <p class="ph-units">${M`theta`} in degrees; ${M`u`} in ${M`[m s^-1]`}; ${M`a`}, the greatest height ${M`H`} = ${M`${ka(s.c * s.tan * s.tan / 2)}`} and where it lands in ${M`[m]`}; ${M`t`} in the air, in ${M`[s]`}.</p>
      </div>`;
    return {
      eyebrow: `Just clears, then lands`,
      title: `${tr(s.theta)}° whatever a is; here a = ${tr(s.a)}.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}${table}`,
      real: true,
    };
  },
};
