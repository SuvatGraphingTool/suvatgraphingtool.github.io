// kits/bench.js — off the edge of a bench or a table, moving across, wired
// for the app. The engine is js/core/bench.js (the twelve's projectile, θ = 0);
// the stage is js/render/bench.js. This file only says which boxes to show,
// reads them, and lays out what the engine answered (rule 4).

import { solveBench, benchWorking } from '../core/bench.js';
import * as stage from '../render/bench.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

export const bench = {
  id: 'bench',
  verb: 'Let it go',
  voice: {
    h: 'Off the edge, across',
    sub: 'A ball bearing fired off the end of a bench through two strips of foil, or a ball rolled off a table to the floor: it leaves the edge moving across, and from there only gravity acts. '
      + 'Give its speed — or the distance between the strips and the time between them, or the height of the edge and how far out it lands.',
  },
  fields: [
    { key: 'u', col: 'speed', label: `Speed it leaves at (m s⁻¹)`, placeholder: '—', hint: 'Across. Or leave it blank and give it below.' },
    { key: 'H', col: 'speed', label: 'Height of the edge above the floor (m)', placeholder: '—', hint: 'Blank if the paper never reaches the floor.' },
  ],
  cols: { speed: 'Off the edge' },
  rows: [
    { title: 'What it leaves', fields: [
      { key: 'look', type: 'choice', label: 'It is', default: 'foil', hint: 'Each is drawn as it is.',
        options: [{ v: 'foil', label: 'A bench, through two foil strips' }, { v: 'table', label: 'A table, to the floor' }] },
    ] },
    { title: 'The two strips', fields: [
      { key: 'd', label: 'Distance between them, across (m)', aria: 'The two strips: the distance between them, across (m)', placeholder: '—', hint: 'The first is at the edge.' },
      { key: 'tGap', label: 'Time between breaking them (s)', aria: 'The two strips: the time between breaking them (s)', placeholder: '—', hint: 'In place of the speed.' },
      { key: 'drop', label: 'Second centre lower by (m)', aria: 'The two strips: how much lower the second strip’s centre is (m)', placeholder: '—', hint: 'Is it broken at its centre?' },
    ] },
    { title: 'Or, in place of the speed', fields: [
      { key: 'R', label: 'How far out it lands (m)', aria: 'In place of the speed: how far out from the edge it lands (m)', placeholder: '—', hint: 'With the height of the edge.' },
    ] },
  ],
  g: [9.81, 9.8, 10],
  hides: { shows: ['ruler', 'range', 'grid', 'apex'], extras: ['energy'], bounce: true },

  read(vals) {
    return { look: vals.look, u: vals.u, H: vals.H, d: vals.d, tGap: vals.tGap, drop: vals.drop, R: vals.R, g: vals.g };
  },
  solve: solveBench,
  working: (solved) => benchWorking(solved),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    return {
      left: [
        { k: 'Out from the edge', v: num(r.x, 3), unit: 'm', hue: 'disp' },
        f.H ? { k: 'Height above the floor', v: num(f.H + r.y, 3), unit: 'm', hue: 'disp' } : { k: 'Dropped', v: num(-r.y, 3), unit: 'm', hue: 'disp' },
        { k: 'Vertical velocity', v: num(v.y, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Speed', v: num(Math.hypot(v.x, v.y), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 3), unit: 's' }],
    };
  },

  /* Across dashed, vertical solid (rule 2); measured from the edge. The
     second strip is ringed where it is reached. */
  graphs(f, t, P) {
    const two = (fx, fy, c) => [
      { label: 'across', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'up', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    const rings = f.t2 ? [{ t: f.t2, y: f.pos(f.t2).y, color: P.mark }] : [];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, points: rings, series: two((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: two((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: two(() => 0, () => -f.params.g, P.acc) },
    ];
  },

  /** The card's sketch: the end of a bench, two strips, the drop between. */
  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="24" width="34" height="36" fill="#a0764e" opacity="0.55"/><rect x="0" y="20" width="34" height="5" fill="#3d4247"/>
      <rect x="36" y="8" width="3" height="20" fill="#9aa1a8"/><rect x="92" y="18" width="3" height="20" fill="#9aa1a8"/>
      <path d="M36 18 Q70 20 104 34" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  },

  ending(solved) {
    const title = solved.atCentre === true ? 'Broken at its centre.'
      : solved.atCentre === false ? `${tr(Math.abs(solved.miss))} m ${solved.miss > 0 ? 'below' : 'above'} the ${solved.f.drop === 0 ? 'first strip\u2019s level' : 'centre'}.`
        : solved.fall != null ? `Dropped ${tr(solved.fall)} m at the second strip.`
          : solved.R != null ? `Lands ${tr(solved.R)} m out.` : `Leaves at ${tr(solved.u)} m s⁻¹.`;
    const cell = (x) => (x == null ? '<b>—</b>' : `<b>${tr(x)}</b>`);
    const table = `
      <div class="ph-tab" role="table" aria-label="Off the edge, to the second strip and the floor">
        <div class="ph-head" role="row">
          <span role="columnheader">Off</span><span role="columnheader">${M`u`}</span><span role="columnheader">${M`t`} at strip</span>
          <span role="columnheader">drop</span><span role="columnheader">${M`t`} to floor</span><span role="columnheader">out</span>
        </div>
        <div class="ph-row" role="row" data-key="first">
          <span class="ph-name" role="cell"><b>${solved.Lk.word}</b><em>${solved.Lk.edge}</em></span>
          <span role="cell">${cell(solved.u)}</span><span role="cell">${cell(solved.t2)}</span><span role="cell">${cell(solved.fall)}</span>
          <span role="cell">${cell(solved.T)}</span><span role="cell">${cell(solved.R)}</span></div>
        <p class="ph-units">${M`u`} in ${M`[m s^-1]`}; times in ${M`[s]`}; the drop and how far out in ${M`[m]`}, from the edge.</p>
      </div>`;
    return {
      eyebrow: `Off ${solved.Lk.edge}`,
      title,
      body: `${solved.notes.map((x) => `<p>${x}</p>`).join('')}${table}`,
      real: true,
    };
  },
};
