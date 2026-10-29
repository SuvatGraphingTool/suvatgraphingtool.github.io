// kits/catcher.js — a ball thrown and caught by someone who sets off after it
// along the ground, wired for the app. The engine is js/core/catch.js (the
// twelve's projectile plus one straight-line run), the stage
// js/render/beach.js; this file only says which boxes to show, reads them,
// and lays out what the engine answered (rule 4).

import { solveCatch, catchWorking, FINDS } from '../core/catch.js';
import * as stage from '../render/beach.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

const FIELDS = [
  { key: 'h', col: 'throw', label: 'Height it leaves the hand (m)', optional: true, hint: 'Above the ground. Blank is 0.' },
  { key: 'u', col: 'throw', label: `Speed ${M`u`} (m s⁻¹)`, placeholder: '—', hint: 'The speed it is thrown at.' },
  { key: 'theta', col: 'throw', label: `Angle ${M`theta`} (°)`, placeholder: '—', hint: 'Above the horizontal.' },
  { key: 'yc', col: 'throw', label: 'Height it is caught at (m)', placeholder: '—', hint: 'Above the ground, on its way down.' },
  { key: 'c.t0', col: 'catcher', label: 'Sets off after (s)', optional: true, hint: 'How long after the throw. Blank is 0.' },
  { key: 'c.u', col: 'catcher', label: 'Speed it starts at (m s⁻¹)', optional: true, hint: 'From rest is 0. Blank is 0.' },
  { key: 'c.a', col: 'catcher', label: `Acceleration ${M`a`} (m s⁻²)`, placeholder: '—', hint: 'Constant, along the ground.' },
];

export const catcher = {
  id: 'catcher',
  verb: 'Throw it',
  voice: {
    h: 'Who throws, and who chases?',
    sub: 'A ball thrown forwards, and a dog (or anyone) who sets off after it along the ground with a constant acceleration and catches it. '
      + 'Give the throw, the catch height and the catcher — or leave one of the catcher’s numbers for the engine to find.',
  },
  fields: FIELDS,
  cols: { throw: 'The throw', catcher: 'The catcher' },
  rows: [
    { title: 'Find one of the catcher’s numbers, if the paper asks', fields: [
      { key: 'find', type: 'choice', label: 'Find', names: true, hint: 'Its box above is then left to the engine.',
        options: [{ v: 'c.a', label: `its acceleration ${M`a`}` }, { v: 'c.u', label: 'its starting speed' }, { v: 'c.t0', label: 'how long after it sets off' }] },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(vals) {
    const find = vals.find ? vals.find.slice(2) : null;
    const c = { t0: vals['c.t0'], u: vals['c.u'], a: vals['c.a'] };
    if (find) delete c[find];
    return { g: vals.g, h: vals.h, u: vals.u, theta: vals.theta, yc: vals.yc, c, find };
  },
  solve: solveCatch,
  working: (solved) => catchWorking(solved),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    return {
      left: [
        { k: 'Ball across', v: num(r.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Ball height', v: num(r.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Ball speed', v: num(Math.hypot(v.x, v.y), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Dog across', v: num(f.dog.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Dog speed', v: num(f.dog.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* The ball's across (dashed) and up (solid) in the quantity's hue, the
     dog's across (dashed) in the second-object stone; the catch ringed. */
  graphs(f, t, P) {
    const tMax = f.tMax, C = f.catchAt;
    const cut = [f.dog.t0];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t,
        series: [
          { label: 'dog', tag: 'dog', fn: (tt) => f.dog.pos(tt), color: P.second, dash: [6, 4], breaks: cut },
          { label: 'ball across', tag: T`x`, fn: (tt) => f.pos(tt).x, color: P.disp, dash: [6, 4] },
          { label: 'ball up', tag: T`y`, fn: (tt) => f.pos(tt).y, color: P.disp, dash: null },
        ],
        points: [{ t: C.t, y: C.x, color: P.mark }, { t: C.t, y: C.y, color: P.mark }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: [
          { label: 'dog', tag: 'dog', fn: (tt) => f.dog.vel(tt), color: P.second, dash: [6, 4], breaks: cut },
          { label: 'ball across', tag: T`x`, fn: (tt) => f.vel(tt).x, color: P.vel, dash: [6, 4] },
          { label: 'ball up', tag: T`y`, fn: (tt) => f.vel(tt).y, color: P.vel, dash: null },
        ] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: [
          { label: 'dog', tag: 'dog', fn: (tt) => f.dog.acc(tt), color: P.second, dash: [6, 4], breaks: cut },
          { label: 'ball across', tag: T`x`, fn: () => 0, color: P.acc, dash: [6, 4] },
          { label: 'ball up', tag: T`y`, fn: () => -f.g, color: P.acc, dash: null },
        ] },
    ];
  },

  thumb(s) {
    const r = solveCatch(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const f = r.f, pts = [];
    for (let i = 0; i <= 30; i++) pts.push(f.pos((i / 30) * f.tMax));
    const k = Math.min(100 / Math.max(r.xc, 1), 44 / f.apex.y), X = (x) => 10 + x * k, Y = (y) => 52 - y * k;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="52" width="120" height="8" fill="#cdbb94" opacity="0.7"/>
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="10" y1="51" x2="${X(r.xc).toFixed(1)}" y2="51" stroke="var(--second)" stroke-width="2" stroke-dasharray="4 3"/>
      <circle cx="${X(r.xc).toFixed(1)}" cy="${Y(f.catchAt.y).toFixed(1)}" r="3.6" fill="none" stroke="var(--mark)" stroke-width="1.6"/>
    </svg>`;
  },

  ending(solved) {
    const { find, catcher: c, tc, xc, gap } = solved;
    const title = find === 'a' ? `a = ${tr(c.a)} m s⁻².` : find === 'u' ? `It starts at ${tr(c.u)} m s⁻¹.` : find === 't0' ? `It sets off ${tr(c.t0)} s after the throw.`
      : Math.abs(gap) < 1e-3 * Math.max(1, xc) ? 'Caught.' : `${tr(Math.abs(gap))} m ${gap > 0 ? 'past it' : 'short'}.`;
    return {
      eyebrow: `Caught at <span class="u">${tr(tc)}</span> <span class="u">s</span>, <span class="u">${tr(xc)}</span> <span class="u">m</span> out`,
      title,
      body: solved.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
export { FINDS };
