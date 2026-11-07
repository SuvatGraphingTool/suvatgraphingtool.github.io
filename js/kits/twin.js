// kits/twin.js — two launched from one place, wired for the app.
//
// It owns no physics: the engine is js/core/twin.js (each launch the height
// engine's own), the stage the composer's (js/render/composed.js, which
// draws each one as what it is). This file says which boxes to show, reads
// them, and lays out what the engine answered (rule 4). It is reached through
// the composer (js/compose/registry.js, engine `twin`), which sets the place.

import { solveTwin } from '../core/twin.js';
import { height } from './height.js';
import { M, T, num } from '../notation.js';

/** Where one landed: straight down at the foot, or so far out. */
const where = (s) => (s.vertical || Math.abs(s.out) < 1e-9 ? s.Pl.foot : `${M`${tr(s.out)} [m]`} out`);
const tr = (x) => num(x, x !== 0 && Math.abs(x) < 1 ? 4 : 3, { trim: true });
const one = (n) => [
  { key: `${n}.u`, col: n, label: `Speed ${M`u`} (m s⁻¹)`, placeholder: '—', hint: 'How fast it is launched. 0 if it is dropped.' },
  { key: `${n}.theta`, col: n, label: `Angle ${M`theta`} (°)`, placeholder: '—', hint: '90 straight up, 0 across, −90 straight down.' },
  { key: `${n}.t0`, col: n, label: 'Sets off at (s)', optional: true, hint: '“One second later” is 1. Blank is 0.' },
];

export const twin = {
  id: 'twin',
  verb: 'Launch them',
  voice: { h: 'Two from one place', sub: 'Two launched from the same height, each at its own speed and angle, and perhaps one later than the other. The engine runs both on one clock.' },
  fields: [
    { key: 'h', col: 'place', label: 'Height they start at (m)', placeholder: '—', hint: 'Above what they land on.' },
    ...one('A'), ...one('B'),
  ],
  cols: { place: 'Where from', A: 'A', B: 'B' },
  g: [9.8, 9.81, 10],
  hides: { shows: ['ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(v) {
    const side = (n) => ({ u: v[`${n}.u`], theta: v[`${n}.theta`], t0: v[`${n}.t0`], name: v[`${n}.name`] });
    return { place: v.place, below: v.below, from: v.from, g: v.g, h: v.h, A: side('A'), B: side('B') };
  },
  solve: solveTwin,

  /** Each launch's own working, the height kit's, titled for what it is. */
  working(solved, t) {
    if (!solved?.ok) return [];
    const of = (s, name, t0) => height.working(s, Math.max(0, Math.min(t - t0, s.f.tMax)))
      .map((sec) => ({ ...sec, title: `${name.replace(/^./, (c) => c.toUpperCase())}${t0 > 0 ? `, timed from when it sets off at ${M`t = ${tr(t0)} [s]`}` : ''}: ${sec.title}` }));
    const { f } = solved;
    return [...of(solved.A, f.A.name, f.A.t0), ...of(solved.B, f.B.name, f.B.t0), {
      title: 'The two together',
      rows: [
        { f: M`t_A = t_0 + T`, s: M`${tr(f.A.t0)} + ${tr(solved.A.T)}`, r: M`t_A = ${tr(f.A.tLand)} [s]` },
        { f: M`t_B = t_0 + T`, s: M`${tr(f.B.t0)} + ${tr(solved.B.T)}`, r: M`t_B = ${tr(f.B.tLand)} [s]` },
      ],
      note: solved.notes.slice(-2).join(' '),
    }];
  },

  hud(f, t) {
    const a = f.A.pos(t), b = f.B.pos(t), va = f.A.vel(t), vb = f.B.vel(t);
    return {
      left: [
        { k: 'Height of A', v: num(a.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Speed of A', v: num(Math.hypot(va.x, va.y), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Height of B', v: num(b.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Speed of B', v: num(Math.hypot(vb.x, vb.y), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* A in the quantity's own hue, B in the second object's; across dashed,
     up solid (rule 2). Each line breaks where its own launch starts and ends. */
  graphs(f, t, P) {
    const { tMax } = f;
    const cuts = (m) => [m.t0, m.tLand].filter(isFinite);
    const four = (get, c) => ['A', 'B'].flatMap((n) => [
      { label: `${n} across`, tag: T`x_${n}`, fn: (tt) => get(f[n], tt).x, color: n === 'A' ? c : P.second, dash: [6, 4], breaks: cuts(f[n]) },
      { label: `${n} up`, tag: T`y_${n}`, fn: (tt) => get(f[n], tt).y, color: n === 'A' ? c : P.second, dash: null, breaks: cuts(f[n]) },
    ]);
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t, series: four((m, tt) => m.pos(tt), P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t, series: four((m, tt) => m.vel(tt), P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: ['A', 'B'].map((n) => ({ label: n, tag: n, fn: (tt) => (f[n].moving(tt) ? -f[n].f.params.g : 0), color: n === 'A' ? P.acc : P.second, dash: null, breaks: cuts(f[n]) })) },
    ];
  },

  thumb() {
    return '<svg viewBox="0 0 120 60" aria-hidden="true"><path d="M0 22 L40 22 L36 54 L0 54 Z" fill="#8b8073" opacity="0.85"/>'
      + '<path d="M40 22 Q 70 18 98 54" fill="none" stroke="var(--vel)" stroke-width="2.2"/><path d="M40 22 Q 55 26 70 54" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="4 3"/></svg>';
  },

  ending(solved) {
    const { f } = solved;
    return {
      eyebrow: solved.h > 0 ? `From ${tr(solved.h)} m above ${solved.Pl.below}` : `From ${solved.Pl.below}`,
      title: solved.first ? `${solved.first.replace(/^./, (c) => c.toUpperCase())} lands first.` : 'They land at the same moment.',
      body: solved.notes.slice(-2).map((x) => `<p>${x}</p>`).join('')
        + `<p>${f.A.name.replace(/^./, (c) => c.toUpperCase())} lands at ${M`t = ${tr(f.A.tLand)} [s]`}, ${where(solved.A)}; ${f.B.name} at ${M`t = ${tr(f.B.tLand)} [s]`}, ${where(solved.B)}.</p>`,
      real: true,
    };
  },
};
