// kits/towards.js — two projectiles thrown towards each other from A and B,
// one perhaps a moment after the other; wired for the app. Engine
// js/core/towards.js, stage js/render/towards.js; this file says which boxes
// to show, reads them, and lays out what the engine answered (rule 4).

import { solveTowards, towardsWorking } from '../core/towards.js';
import * as stage from '../render/towards.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const one = (n) => [
  { key: `${n}.u`, col: n, label: `${n}’s speed (m s⁻¹)`, placeholder: '—', hint: '' },
  { key: `${n}.theta`, col: n, label: `Angle above the horizontal (°)`, aria: `${n}: the angle above the horizontal (°)`, placeholder: '—', hint: n === 'A' ? 'Towards B.' : 'Towards A.' },
  { key: `${n}.h`, col: n, label: 'From a height of (m)', aria: `${n}: the height it is thrown from (m)`, placeholder: '0', hint: 'Blank: the ground.' },
];

export const towards = {
  id: 'towards',
  verb: 'Throw them',
  voice: {
    h: 'Thrown towards each other',
    sub: 'Two projectiles thrown towards each other in one vertical plane, from A and B on level ground (or from a height), B perhaps a moment after A. '
      + 'Across, each moves at a steady speed, so they are level across at one moment: do they collide, and how high?',
  },
  fields: [...one('A'), ...one('B'), { key: 'B.t0', col: 'B', label: 'Thrown after A by (s)', placeholder: '0', hint: 'Blank: together.' }],
  cols: { A: 'From A', B: 'From B' },
  rows: [
    { title: 'How far apart', fields: [
      { key: 'D', label: 'A to B (m)', aria: 'How far apart: A to B (m)', placeholder: '—', hint: 'Or leave it blank and choose below.' },
      { key: 'range', type: 'choice', label: 'AB is', default: 'given', hint: '', options: [{ v: 'given', label: 'the distance given' }, { v: 'range', label: 'A’s range' }] },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(v) {
    const p = (n) => ({ u: v[`${n}.u`], theta: v[`${n}.theta`], h: v[`${n}.h`], t0: v[`${n}.t0`] });
    return { g: v.g, A: p('A'), B: p('B'), D: v.D, range: v.range === 'range' };
  },
  solve: solveTowards,
  working: (solved) => towardsWorking(solved),
  render: stage.render,

  hud(f, t) {
    const a = f.posA(t), b = f.posB(t);
    return {
      left: [
        { k: 'A: across, up', v: `${num(a.x, 1)}, ${num(a.y, 2)}`, unit: 'm', hue: 'disp' },
        { k: 'B: across, up', v: `${num(b.x, 1)}, ${num(b.y, 2)}`, unit: 'm', hue: 'disp' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Across dashed, up solid (rule 2); A in its hue, B in stone. */
  graphs(f, t, P) {
    const two = (fn, c, who) => [
      { label: `${who} across`, tag: T`${who}, x`, fn: (tt) => fn(tt).x, color: c, dash: [6, 4] },
      { label: `${who} up`, tag: T`${who}, y`, fn: (tt) => fn(tt).y, color: c, dash: null },
    ];
    const pts = f.outcome === 'collide' ? [{ t: f.t, y: f.yA, color: P.mark }] : [];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, points: pts, series: [...two(f.posB, P.second, 'B'), ...two(f.posA, P.disp, 'A')] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [...two(f.velB, P.second, 'B'), ...two(f.velA, P.vel, 'A')] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [
        { label: 'B up', tag: 'B', fn: (tt) => (tt >= f.B.t0 && tt <= f.B.t0 + f.B.f.tFlight ? -f.g : 0), color: P.second, dash: null, breaks: [f.B.t0, f.B.t0 + f.B.f.tFlight] },
        { label: 'A up', tag: 'A', fn: (tt) => (tt <= f.A.f.tFlight ? -f.g : 0), color: P.acc, dash: null, breaks: [f.A.f.tFlight] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="4" y1="54" x2="116" y2="54" stroke="var(--border)"/>
      <path d="M8 54 Q50 0 92 54" fill="none" stroke="var(--vel)" stroke-width="2.2"/><path d="M112 54 Q70 0 28 54" fill="none" stroke="var(--second)" stroke-width="2.2"/>
      <circle cx="60" cy="22" r="5" fill="none" stroke="var(--mark)" stroke-width="2"/>
    </svg>`;
  },

  ending(s) {
    const title = s.outcome === 'collide' ? `They collide ${tr(s.yA)} m up, at t = ${tr(s.t)} s.`
      : s.outcome === 'pass' ? `They pass ${tr(Math.abs(s.yA - s.yB))} m apart in height.` : 'They never collide.';
    return { eyebrow: 'Thrown towards each other', title, body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
