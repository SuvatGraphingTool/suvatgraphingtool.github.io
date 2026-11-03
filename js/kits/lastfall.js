// kits/lastfall.js — the last stretch of a fall, wired for the app: let go
// from rest (or thrown down) from the top of a tower or a cliff, its speed at a
// point above the ground tied to its speed at the ground, or the last stretch's
// time given. The engine is js/core/lastfall.js, the stage
// js/render/lastfall.js. See design/components.md.

import { solveLastFall, lastFallWorking } from '../core/lastfall.js';
import * as stage from '../render/lastfall.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });

export const lastfall = {
  id: 'lastfall',
  verb: 'Let go',
  voice: {
    h: 'The last stretch of a fall',
    sub: 'A stone is let go from the top of a tower and falls freely to the ground. The question says only how it passes a point above the ground — its speed there a set amount less than at the ground, or a fraction of it, or how long the last stretch takes. From that, its speed at the ground and the height it fell from.',
  },
  fields: [
    fld('p', 'point', 'The point’s height above the ground (m)', '', false),
    fld('dv', 'point', 'Its speed there is less than at the ground by (m s⁻¹)', '“V − 10 at the point, V at the ground”: 10.'),
    fld('k', 'point', 'Or: at the ground it is this many times faster', 'Twice as fast: 2.'),
    fld('tau', 'point', 'Or: the last stretch takes (s)', ''),
    fld('u', 'start', 'Speed straight down when let go (m s⁻¹)', 'Blank or 0: from rest.'),
  ],
  cols: { point: 'The point above the ground', start: 'Where it starts' },
  rows: [
    { title: 'Where it is', fields: [
      { key: 'look', type: 'choice', label: 'It falls from', default: 'tower', hint: '',
        options: [{ v: 'tower', label: 'The top of a tower' }, { v: 'cliff', label: 'The edge of a cliff' }] },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'down',
  resolveEnds: true,
  resolveObjects: (f) => [{ name: '', pos: f.pos, vel: f.vel, acc: f.acc, from: 'where it was let go' }],
  read(v) {
    const mode = v.tau != null && v.tau !== '' ? 'time' : v.k != null && v.k !== '' ? 'ratio' : 'diff';
    return { look: v.look === 'cliff' ? 'cliff' : 'tower', mode, p: v.p, dv: v.dv, k: v.k, tau: v.tau, u: v.u, g: v.g };
  },
  solve(k) {
    // one of the three ways the last stretch is given, and only one
    const n = ['dv', 'k', 'tau'].filter((q) => typeof k[q] === 'number' && isFinite(k[q])).length;
    if (n > 1) return { ok: false, reason: 'Give one of the three — the difference in speed, the multiple, or the time for the last stretch — not more.', derived: [], notes: [] };
    return solveLastFall(k);
  },
  working: (solved) => lastFallWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Height above the ground', v: num(f.H - f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity, down +', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration, down +', v: num(f.g, 2), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* One vertical line, down positive: solid (rule 2). Each line stops at the ground. */
  graphs(f, t, P) {
    const upTo = (fn) => (tt) => (tt > f.tG + 1e-9 ? NaN : fn(tt));
    return [
      { canvas: 'g-s', title: 'Distance fallen–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'fallen', tag: T`s`, fn: upTo(f.pos), color: P.disp, dash: null }], points: [{ t: f.tP, y: f.H - f.p, color: P.mark }, { t: f.tG, y: f.H, color: P.mark }] },
      { canvas: 'g-v', title: 'Velocity–time, down +', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: upTo(f.vel), color: P.vel, dash: null }], points: [{ t: f.tP, y: f.vP, color: P.mark }, { t: f.tG, y: f.V, color: P.mark }] },
      { canvas: 'g-a', title: 'Acceleration–time, down +', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: upTo(f.acc), color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#cfe3f0"/><rect x="0" y="50" width="120" height="10" fill="#7fa65a"/>
      <rect x="30" y="8" width="26" height="42" fill="#c4b6aa"/><path d="M30 8 h4 v-4 h4 v4 h4 v-4 h4 v4 h4 v-4 h4 v4 h2" fill="#c4b6aa"/>
      <rect x="56" y="34" width="8" height="3" fill="#c0392b"/><circle cx="66" cy="22" r="3" fill="#6d665c"/>
      <path d="M90 8 V50 M86 8 h8 M86 50 h8" stroke="#2a9d8f" stroke-width="1.4"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'At the ground',
      title: `${num(Number(s.V.toPrecision(3)), 6, { trim: true })} m s⁻¹ at the ground, from ${num(Number(s.H.toPrecision(3)), 6, { trim: true })} m up.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
