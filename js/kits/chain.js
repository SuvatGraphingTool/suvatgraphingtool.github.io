// kits/chain.js — a motion along one line in stages, one after another, wired
// for the app. Engine js/core/chain.js (the twelve's five-equation solver, once
// per stage), stage js/render/chain.js; this file says which boxes to show,
// reads them, and lays out what the engine answered (rule 4).

import { solveChain, chainWorking } from '../core/chain.js';
import * as stage from '../render/chain.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const N = 4;
const KEYS = [['u', 'Starts at (m s⁻¹)', 'the velocity it starts at (m s⁻¹)'], ['v', 'Ends at (m s⁻¹)', 'the velocity it ends at (m s⁻¹)'],
  ['a', 'Acceleration (m s⁻²)', 'its acceleration (m s⁻²)'], ['s', 'Distance (m)', 'the distance it covers (m)'], ['t', 'Time (s)', 'how long it lasts (s)']];

const stageRow = (i) => ({
  title: `Stage ${i}`,
  fields: KEYS.map(([key, label, aria]) => ({ key: `s${i}.${key}`, label, aria: `Stage ${i}: ${aria}`, optional: true, placeholder: '—',
    hint: key === 'u' ? (i === 1 ? '0 from rest.' : 'Blank: where the last ended.') : key === 'a' ? 'Negative slows it; 0 steady.' : '' })),
});

export const chain = {
  id: 'chain',
  verb: 'Set off',
  voice: {
    h: 'Stage by stage',
    sub: 'A motion along one line in stages, one after another, each with its own constant acceleration. For each stage give any three of what the paper says — '
      + 'the speed it ends at is the speed the next one starts at. A stage short of one number can take it from the whole distance or the whole time.',
  },
  fields: [
    { key: 'S', col: 'whole', label: 'The whole distance (m)', placeholder: '—', hint: 'Fills one stage’s distance left blank.' },
    { key: 'T', col: 'whole', label: 'The whole time (s)', placeholder: '—', hint: 'Fills one stage’s time left blank.' },
  ],
  cols: { whole: 'The whole motion' },
  rows: [
    { title: 'What moves', fields: [
      { key: 'look', type: 'choice', label: 'It is', default: 'car', hint: 'Drawn as it is.',
        options: [{ v: 'car', label: 'A car' }, { v: 'cyclist', label: 'A cyclist' }, { v: 'train', label: 'A train' }] },
    ] },
    ...Array.from({ length: N }, (_, i) => stageRow(i + 1)),
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(vals) {
    const stages = Array.from({ length: N }, (_, i) => Object.fromEntries(KEYS.map(([key]) => [key, vals[`s${i + 1}.${key}`]])));
    return { look: vals.look, stages, S: vals.S, T: vals.T };
  },
  solve: solveChain,
  working: (solved) => chainWorking(solved),
  render: stage.render,

  hud(f, t) {
    const stg = f.S.find((x) => t <= x.t1 + 1e-12) || f.S[f.S.length - 1];
    return {
      left: [
        { k: 'From the start', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: num(f.acc(t), 3), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }, { k: 'Stage', v: String(stg.i), unit: '' }],
    };
  },

  /* Along the line, so dashed (rule 2); the acceleration breaks at each join. */
  graphs(f, t, P) {
    const joins = f.S.map((x) => x.t0).slice(1);
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 's', fn: (tt) => f.pos(tt), color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'v', fn: (tt) => f.vel(tt), color: P.vel, dash: [6, 4] }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'a', fn: (tt) => f.acc(tt), color: P.acc, dash: [6, 4], breaks: joins }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="8" y1="52" x2="116" y2="52" stroke="var(--border)" stroke-width="1"/>
      <path d="M8 18 L48 34 L112 8" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="5 3" stroke-linecap="round"/>
      <line x1="48" y1="10" x2="48" y2="52" stroke="var(--mark)" stroke-width="1.4"/>
    </svg>`;
  },

  ending(solved) {
    const cell = (x) => `<b>${tr(x)}</b>`;
    const rows = solved.S.map((x) => `<div class="ph-row" role="row" data-key="${x.i % 2 ? 'first' : 'second'}">
        <span class="ph-name" role="cell"><b>${x.i}</b><em>stage</em></span>
        <span role="cell">${cell(x.u)}</span><span role="cell">${cell(x.v)}</span><span role="cell">${cell(x.a)}</span>
        <span role="cell">${cell(x.s)}</span><span role="cell">${cell(x.t)}</span></div>`).join('');
    const table = `<div class="ph-tab" role="table" aria-label="Each stage">
        <div class="ph-head" role="row"><span role="columnheader">Stage</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span><span role="columnheader">${M`a`}</span>
          <span role="columnheader">${M`s`}</span><span role="columnheader">${M`t`}</span></div>
        ${rows}
        <p class="ph-units">Velocities in ${M`[m s^-1]`}, forwards positive; ${M`a`} in ${M`[m s^-2]`}; ${M`s`} in ${M`[m]`}; ${M`t`} in ${M`[s]`}.</p></div>`;
    return {
      eyebrow: solved.S.length === 1 ? 'One stage' : `${solved.S.length} stages`,
      title: `${tr(solved.dist)} m travelled in ${tr(solved.Ttot)} s: an average speed of ${tr(solved.avg)} m s⁻¹.`,
      body: `${solved.notes.map((x) => `<p>${x}</p>`).join('')}${table}`,
      real: true,
    };
  },
};
