// kits/lanes.js — two on one straight road, wired for the app. The engine is
// js/core/overtake.js and the stage js/render/lanes.js; this file says which
// boxes to show, reads them, and lays out what the engine answered (rule 4).
// See design/components.md.

import { solveOvertake, overtakeWorking, FINDABLE } from '../core/overtake.js';
import * as stage from '../render/lanes.js';
import { timeLapse } from '../core/pace.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 2), { trim: true });
const KEYS = ['t0', 'x0', 'u', 'a', 'V', 'tau'];

const one = (n) => [
  { key: `${n}.t0`, col: n, label: 'Sets off at (s)', optional: true, hint: '“Ten seconds later” is 10. Blank is 0.' },
  { key: `${n}.u`, col: n, label: `Speed at the start ${M`u`} (m s⁻¹)`, optional: true, hint: 'From rest is 0. Blank is 0.' },
  { key: `${n}.a`, col: n, label: `Acceleration ${M`a`} (m s⁻²)`, placeholder: '—', hint: 'Negative to slow down.' },
  { key: `${n}.V`, col: n, label: `Speed it changes to ${M`V`} (m s⁻¹)`, placeholder: '—', hint: 'Then holds it. Blank: it keeps on accelerating.' },
  { key: `${n}.tau`, col: n, label: `Time it changes for ${M`t_${n}`} (s)`, placeholder: '—', hint: 'Any two of these three fix the third.' },
  { key: `${n}.x0`, col: n, label: 'Head start (m)', optional: true, hint: 'Ahead of the start line. Blank is 0.' },
];

export const lanes = {
  id: 'lanes',
  verb: 'Set them off',
  voice: {
    h: 'How does each one go?',
    sub: 'Two on one straight road. Each starts at some speed, changes speed at a steady rate '
      + 'until it reaches a speed it then holds. The engine finds every moment they are level — '
      + 'or, if the paper hides one number, finds it from where they are level.',
  },
  fields: [...one('A'), ...one('B')],
  cols: { A: 'A', B: 'B' },
  rows: [
    { title: 'Find one number from where they are level, if the paper asks',
      fields: [
        { key: 'find', type: 'choice', label: 'Which number', names: true,
          options: ['A', 'B'].flatMap((n) => [
            { v: `${n}.a`, label: `${n}’s ${M`a`}` },
            { v: `${n}.V`, label: `${n}’s ${M`V`}` },
            { v: `${n}.tau`, label: `${n}’s ${M`t_${n}`}` },
          ]),
          hint: 'Its box above is then left to the engine. They finish together, or one passes the other at a given place: that is the line.' },
        { key: 'line', label: 'Level at a line (m)', placeholder: '—', hint: 'The finish, or where one passes the other.' },
        { key: 'at', label: 'or level at a time (s)', placeholder: '—', hint: 'Only if the paper gives a time.' },
      ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range'], extras: ['energy'], bounce: true },
  lapse: (f) => timeLapse(f.tMax),

  read(vals) {
    const p = (n) => Object.fromEntries(KEYS.map((q) => [q, vals[`${n}.${q}`]]));
    const k = { A: p('A'), B: p('B'), line: vals.line, at: vals.at, find: vals.find || null };
    // the box for the number being found is ignored, as the hint says
    if (k.find) { const [n, q] = k.find.split('.'); delete k[n][q]; }
    return k;
  },
  solve: solveOvertake,
  working: (solved) => overtakeWorking(solved),
  render: stage.render,

  hud(f, t, { rate = 1 } = {}) {
    const s = f.at(t), lapse = timeLapse(f.tMax);
    return {
      left: [
        { k: 'A from the start', v: num(s.A.x, 1), unit: 'm', hue: 'disp' },
        { k: 'A’s velocity', v: num(s.A.v, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'B from the start', v: num(s.B.x, 1), unit: 'm', hue: 'disp' },
        { k: 'B’s velocity', v: num(s.B.v, 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' },
              ...(lapse > 1 ? [{ k: 'Time-lapse', v: `${num(rate * lapse, 1, { trim: true })}×`, unit: 'real time' }] : [])],
    };
  },

  /* Both on each graph, dashed (along the road), A in the quantity's hue and
     B in the second-object stone, lettered; each line broken where its
     acceleration changes; the moments they are level ringed on s–t. */
  graphs(f, t, P) {
    const { A, B, events } = f, tMax = f.tMax;
    const cuts = (p) => p.stages.flatMap((st) => [st.t0, st.t1]).filter(isFinite);
    const pair = (fnA, fnB, cA) => [
      { label: 'B', tag: 'B', fn: fnB, color: P.second, dash: [6, 4], breaks: cuts(B) },
      { label: 'A', tag: 'A', fn: fnA, color: cA, dash: [6, 4], breaks: cuts(A) },
    ];
    const rings = events.filter((e) => e.kind !== 'start').map((e) => ({ t: e.t, y: e.x, color: P.mark }));
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t, points: rings,
        series: pair((tt) => A.pos(tt), (tt) => B.pos(tt), P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: pair((tt) => A.vel(tt), (tt) => B.vel(tt), P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: pair((tt) => A.acc(tt), (tt) => B.acc(tt), P.acc) },
    ];
  },

  /** The card's sketch: both speed–time graphs, crossing. */
  thumb(s) {
    const r = solveOvertake(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const { A, B, f } = r;
    const X = (t) => 10 + (t / f.tMax) * 100, Y = (v) => 50 - (v / f.vMax) * 38;
    const path = (p) => Array.from({ length: 41 }, (_, i) => {
      const t = (i / 40) * f.tMax; return `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(p.vel(t)).toFixed(1)}`;
    }).join(' ');
    const lane = (p, y, c) => Array.from({ length: 9 }, (_, i) => {
      const x = 10 + ((p.pos((i / 8) * f.tMax)) / f.top) * 100;
      return `<circle cx="${x.toFixed(1)}" cy="${y}" r="1.7" fill="${c}"/>`;
    }).join('');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="8" y1="50" x2="114" y2="50" stroke="var(--border)" stroke-width="1"/>
      <path d="${path(B)}" fill="none" stroke="var(--second)" stroke-width="2" stroke-dasharray="5 3"/>
      <path d="${path(A)}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="5 3"/>
      ${lane(A, 54, 'var(--vel)')}${lane(B, 58, 'var(--second)')}
    </svg>`;
  },

  ending(solved) {
    const { found, events, extras } = solved;
    const ex = (key) => extras.find((x) => x.key === key)?.value;
    const main = events.find((e) => e.kind === 'overtake' || e.kind === 'line') || events.find((e) => e.kind === 'level');
    const title = found
      ? `${found.who}’s ${FINDABLE[found.what]} is ${tr(found.value)} ${found.what === 'a' ? 'm s⁻²' : found.what === 'V' ? 'm s⁻¹' : 's'}.`
      : main ? (main.kind === 'overtake' ? `${main.ahead} overtakes ${main.ahead === 'A' ? 'B' : 'A'}.` : 'They are level.')
        : 'They are never level after the start.';
    const at = main ? solved.f.at(main.t) : null;
    const cell = (x, p) => `<b>${tr(x, p)}</b>`;
    const row = (p, s) => {
      const moving = Math.max(0, main.t - p.t0);
      return `<div class="ph-row" role="row" data-key="${p.name === 'A' ? 'first' : 'second'}">
        <span class="ph-name" role="cell"><b>${p.name}</b><em>${p.t0 > 0 ? `set off at ${M`t = ${tr(p.t0)} [s]`}` : 'from the start'}</em></span>
        <span role="cell">${cell(p.u)}</span><span role="cell">${cell(s.v)}</span>
        <span role="cell">${cell(p.a)}</span><span role="cell">${cell(s.x - p.x0)}</span>
        <span role="cell">${cell(moving, 3)}</span></div>`;
    };
    const table = main ? `
      <div class="ph-tab" role="table" aria-label="Each one, from when it set off to the moment they are level">
        <div class="ph-head" role="row">
          <span role="columnheader">On the road</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span>
          <span role="columnheader">${M`a`}</span><span role="columnheader">${M`s`}</span>
          <span role="columnheader">${M`t`}</span>
        </div>
        ${row(solved.A, at.A)}${row(solved.B, at.B)}
        <p class="ph-units">At the moment they are level. ${M`a`} is the rate while it changes speed; ${M`v`} its velocity then;
          ${M`s`} in ${M`[m]`} from where it started and ${M`t`} in ${M`[s]`} from when it set off — the time a paper usually asks for.</p>
      </div>` : '';
    const dv = ex('dv');
    return {
      eyebrow: main ? `Level at ${tr(main.t, 3)} <span class="u">s</span>, ${tr(main.x)} <span class="u">m</span> from the start` : 'Never level after the start',
      title,
      // the found number is the title, so it is not said again under it
      body: `${solved.notes.slice(found ? 1 : 0).map((n) => `<p>${n}</p>`).join('')}${dv != null ? `<p>Their speeds at the line differ by <b>${tr(dv)} m s⁻¹</b>.</p>` : ''}${table}`,
      real: true,
    };
  },
};
