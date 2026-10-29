// kits/lanes.js — two on one straight road, wired for the app. The engine is
// js/core/overtake.js and the stage js/render/lanes.js; this file says which
// boxes to show, reads them, and lays out what the engine answered (rule 4).
// See design/components.md.

import { solveOvertake, overtakeWorking, named, railWords } from '../core/overtake.js';
import * as stage from '../render/lanes.js';
import { timeLapse } from '../core/pace.js';
import { FIGURES } from '../render/figures.js';
import { M, num } from '../notation.js';

// the precision the working uses: three places, four for a rate under 1
const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const KEYS = ['t0', 'x0', 'u', 'hold', 'a', 'V', 'tau'];
// what may travel on the road; on the tracks it is always a train
const ROAD = ['car', 'motorcycle', 'lorry', 'cyclist', 'runner'];

const one = (n) => [
  { key: `${n}.t0`, col: n, label: 'Sets off at (s)', optional: true, hint: '“Ten seconds later” is 10. Blank is 0.' },
  { key: `${n}.u`, col: n, label: `Speed at the start ${M`u`} (m s⁻¹)`, optional: true, hint: 'From rest is 0. Blank is 0.' },
  { key: `${n}.hold`, col: n, label: `Holds that speed for ${M`T_${n}`} (s)`, optional: true, hint: 'First, before it changes speed. Blank is 0.' },
  { key: `${n}.a`, col: n, label: `Acceleration ${M`a`} (m s⁻²)`, placeholder: '—', hint: 'Negative to slow down.' },
  { key: `${n}.V`, col: n, label: `Speed it changes to ${M`V`} (m s⁻¹)`, placeholder: '—', hint: 'Then holds it. Blank: it keeps on accelerating.' },
  { key: `${n}.tau`, col: n, label: `Time it changes for ${M`t_${n}`} (s)`, placeholder: '—', hint: 'Any two of these three fix the third.' },
  { key: `${n}.ends`, col: n, type: 'choice', label: 'Its change of speed ends at the line',
    options: [{ v: 'line', label: 'Yes — it stops (or reaches V) there' }],
    hint: '“Comes to rest at the line”: press this and leave its V blank (press again to undo). The line then fixes whichever of its hold, rate or time changing is missing.' },
  { key: `${n}.fig`, col: n, type: 'choice', label: 'What it is, on the road',
    options: ROAD.map((k) => ({ v: k, label: FIGURES[k].label })),
    hint: 'Only the picture. Blank is a car; on the tracks both are trains.' },
  { key: `${n}.x0`, col: n, label: 'Head start (m)', optional: true, hint: 'Ahead of the start line. Blank is 0.' },
];

export const lanes = {
  id: 'lanes',
  verb: 'Set them off',
  voice: {
    h: 'How does each one go?',
    sub: 'Two side by side, on one straight road or on parallel tracks. Each starts at some speed, '
      + 'may hold it for a while, then changes speed at a steady rate until it reaches a speed it holds — '
      + 'or comes to rest at the line. The engine finds every moment they are level — '
      + 'or, if the paper hides one number, finds it from where they are level.',
  },
  fields: [...one('A'), ...one('B')],
  cols: { A: 'A', B: 'B' },
  rows: [
    { title: 'Where they are',
      fields: [
        { key: 'where', type: 'choice', label: 'Drawn as',
          options: [{ v: 'road', label: 'On one road' }, { v: 'lights', label: 'Leaving traffic lights' }, { v: 'rail', label: 'Two trains on parallel tracks' }],
          hint: 'Only the picture and its words change. On the tracks, the start is the post X and the line the post Y.' },
      ] },
    { title: 'Find one number from where they are level, if the paper asks',
      fields: [
        { key: 'find', type: 'choice', label: 'Which number', names: true,
          options: ['A', 'B'].flatMap((n) => [
            { v: `${n}.a`, label: `${n}’s ${M`a`}` },
            { v: `${n}.V`, label: `${n}’s ${M`V`}` },
            { v: `${n}.tau`, label: M`t_${n}` },
            { v: `${n}.hold`, label: M`T_${n}` },
          ]),
          hint: 'Its box above is then left to the engine. They finish together, stop together, or one passes the other at a given place: that is the line.' },
        { key: 'line', label: 'Level at a line (m)', placeholder: '—', hint: 'The finish, or where one passes the other.' },
        { key: 'at', label: 'or level at a time (s)', placeholder: '—', hint: 'Only if the paper gives a time.' },
      ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },
  lapse: (f) => timeLapse(f.tMax),

  read(vals) {
    const p = (n) => ({ ...Object.fromEntries(KEYS.map((q) => [q, vals[`${n}.${q}`]])), ends: vals[`${n}.ends`] === 'line' });
    const where = vals.where || 'road';
    const k = { A: p('A'), B: p('B'), line: vals.line, at: vals.at, find: vals.find || null,
      where: where === 'lights' ? 'road' : where, lights: where === 'lights',
      figs: { A: vals['A.fig'] || 'car', B: vals['B.fig'] || 'car' } };
    // the box for the number being found is ignored, as the hint says
    if (k.find) { const [n, q] = k.find.split('.'); delete k[n][q]; }
    return k;
  },
  // what it is drawn as is the stage's, carried on the motion untouched
  solve: (k) => {
    const r = solveOvertake(k);
    if (r.ok) Object.assign(r.f, { figs: k.figs || { A: 'car', B: 'car' }, lights: !!k.lights });
    return r;
  },
  working: (solved) => overtakeWorking(solved),
  render: stage.render,

  hud(f, t, { rate = 1 } = {}) {
    const s = f.at(t), lapse = timeLapse(f.tMax), from = f.where === 'rail' ? 'from X' : 'from the start';
    return {
      left: [
        { k: `A ${from}`, v: num(s.A.x, 1), unit: 'm', hue: 'disp' },
        { k: 'A’s velocity', v: num(s.A.v, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: `B ${from}`, v: num(s.B.x, 1), unit: 'm', hue: 'disp' },
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
    // where the two speed–time graphs cross: the same speed, for an instant
    const same = (f.crossings || []).map((c) => ({ t: c.t, y: c.v, color: P.mark }));
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t, points: rings,
        series: pair((tt) => A.pos(tt), (tt) => B.pos(tt), P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t, points: same,
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
    const main = events.find((e) => ['overtake', 'line', 'time'].includes(e.kind)) || events.find((e) => e.kind === 'level');
    const later = solved.later;
    const unit = { a: 'm s⁻²', V: 'm s⁻¹', tau: 's', hold: 's' };
    const title = found
      ? `${named(found.who, found.what)} is ${tr(found.value)} ${unit[found.what]}.`
      : main ? (main.kind === 'overtake' ? `${main.ahead} overtakes ${main.ahead === 'A' ? 'B' : 'A'}.`
        : main.rest ? (main.first ? `${main.first === 'A' ? 'B' : 'A'} comes to rest beside ${main.first}.` : 'They come to rest together.') : 'They are level.')
        : later ? `Not level ${solved.before === 'then' ? 'by then' : 'before the line'}.`
          : 'They are never level after the start.';
    const at = main ? solved.f.at(main.t) : null;
    const cell = (x, p) => `<b>${tr(x, p)}</b>`;
    // each one's own time, from the engine where it has it
    const ownT = (p) => main.own[p.name];
    const row = (p, s) => {
      const moving = Math.max(0, ownT(p));
      return `<div class="ph-row" role="row" data-key="${p.name === 'A' ? 'first' : 'second'}">
        <span class="ph-name" role="cell"><b>${p.name}</b><em>${p.t0 > 0 ? `set off at ${M`t = ${tr(p.t0)} [s]`}` : 'from the start'}</em></span>
        <span role="cell">${cell(p.u)}</span><span role="cell">${cell(s.v)}</span>
        <span role="cell">${cell(p.a)}</span><span role="cell">${cell(s.x - p.x0)}</span>
        <span role="cell">${cell(moving, 3)}</span></div>`;
    };
    const table = main ? `
      <div class="ph-tab" role="table" aria-label="Each one, from when it set off to the moment they are level">
        <div class="ph-head" role="row">
          <span role="columnheader">${solved.where === 'rail' ? 'On the tracks' : 'On the road'}</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span>
          <span role="columnheader">${M`a`}</span><span role="columnheader">${M`s`}</span>
          <span role="columnheader">${M`t`}</span>
        </div>
        ${row(solved.A, at.A)}${row(solved.B, at.B)}
        <p class="ph-units">At the moment they are level. ${M`a`} is the rate while it changes speed; ${M`v`} its velocity then;
          ${M`s`} in ${M`[m]`} from where it started and ${M`t`} in ${M`[s]`} from when it set off — the time a paper usually asks for.</p>
      </div>` : '';
    // two at rest at the line have no difference in speed to report
    const dv = ex('vA') === 0 && ex('vB') === 0 ? null : ex('dv');
    const say = solved.where === 'rail' ? railWords : (x) => x;
    return {
      eyebrow: say(main ? `Level at ${tr(main.t, 3)} <span class="u">s</span>, ${tr(main.x)} <span class="u">m</span> from the start`
        : later ? `Level only later, at ${tr(later.t, 3)} <span class="u">s</span>` : 'Never level after the start'),
      title: say(title),
      // the found number is the title, so it is not said again under it
      body: say(`${solved.notes.slice(found ? 1 : 0).map((n) => `<p>${n}</p>`).join('')}${dv != null ? `<p>Their speeds at the line differ by <b>${tr(dv)} m s⁻¹</b>.</p>` : ''}${table}`),
      real: true,
    };
  },
};
