// kits/posts.js — one constant acceleration past a row of posts, its speed at
// the first and its acceleration found from the distances and times between
// them; wired for the app. Engine js/core/posts.js; stage js/render/chain.js
// (the stage-by-stage road, its posts named). This file says which boxes to
// show, reads them, and lays out what the engine answered (rule 4).

import { solvePosts, postsWorking } from '../core/posts.js';
import * as stage from '../render/chain.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const PAIRS = [['P', 'Q'], ['Q', 'R'], ['R', 'S']];

export const posts = {
  id: 'posts',
  verb: 'Drive past',
  voice: {
    h: 'Past the posts, one acceleration',
    sub: 'A car with a constant acceleration passes a row of posts — P, then Q, then R. Give the distance and the time between each pair; '
      + `its speed at P and its acceleration are found, two equations from P solved together. A third stretch is checked against them.`,
  },
  fields: [
    { key: 'u', col: 'known', label: `Speed at P (m s⁻¹)`, placeholder: '—', hint: 'Blank to find it.' },
    { key: 'a', col: 'known', label: 'Acceleration (m s⁻²)', placeholder: '—', hint: 'Blank to find it.' },
  ],
  cols: { known: 'If the paper gives them' },
  rows: [
    { title: 'What moves', fields: [
      { key: 'look', type: 'choice', label: 'It is', default: 'car', hint: '', options: [{ v: 'car', label: 'A car' }, { v: 'cyclist', label: 'A cyclist' }, { v: 'train', label: 'A train' }] },
    ] },
    ...PAIRS.map(([p, q], i) => ({ title: `${p} to ${q}`, fields: [
      { key: `s${i + 1}`, label: 'Distance (m)', aria: `${p} to ${q}: the distance (m)`, placeholder: '—', hint: i === 2 ? 'Optional: checked against the rest.' : '' },
      { key: `t${i + 1}`, label: 'Time (s)', aria: `${p} to ${q}: the time (s)`, placeholder: '—', hint: '' },
    ] })),
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(v) {
    return { u: v.u, a: v.a, look: v.look, gaps: [1, 2, 3].map((i) => ({ s: v[`s${i}`], t: v[`t${i}`] })) };
  },
  solve: solvePosts,
  working: (solved) => postsWorking(solved),
  render: stage.render,

  hud(f, t) {
    const st = f.at(t);
    return {
      left: [
        { k: 'From P', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: num(f.acc(t), 3), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }, { k: 'Between', v: `${st.name}–${st.end}`, unit: '' }],
    };
  },

  /* Along the road: dashed (rule 2); each post ringed when passed. */
  graphs(f, t, P) {
    const rings = f.S.map((x) => ({ t: x.t1, y: x.x1, color: P.mark }));
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, points: rings, series: [{ label: 's', fn: f.pos, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'v', fn: f.vel, color: P.vel, dash: [6, 4] }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'a', fn: f.acc, color: P.acc, dash: [6, 4] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="4" y1="46" x2="116" y2="46" stroke="var(--border)" stroke-width="2"/>
      ${[14, 46, 104].map((x) => `<line x1="${x}" y1="46" x2="${x}" y2="18" stroke="var(--mark)" stroke-width="2"/>`).join('')}
    </svg>`;
  },

  ending(s) {
    return { eyebrow: 'Past the posts', title: `u = ${tr(s.u)} m s⁻¹, a = ${tr(s.a)} m s⁻².`, body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
