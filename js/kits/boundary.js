// kits/boundary.js — a ball struck towards a fielder on the boundary, wired
// for the app. The engine is js/core/boundary.js and the stage
// js/render/boundary.js (a cricket ground: the batter, the fielder on the
// rope, the reach drawn at the boundary). This file says which boxes to show,
// reads them, and lays out what the engine answered (rule 4).

import { solveBoundary, boundaryWorking } from '../core/boundary.js';
import * as stage from '../render/boundary.js';
import { M, T, num } from '../notation.js';

const tr = (x, p = 3) => num(x, p, { trim: true });
const s3 = (x) => num(x, Math.min(6, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x) || 1)))));

export const boundary = {
  id: 'boundary',
  verb: 'Hit it',
  voice: {
    h: 'Can the fielder catch it?',
    sub: 'A ball struck at a speed and an angle, and a fielder standing on the boundary who can catch it only below a height above the point it was struck from. '
      + 'Give the hit, the distance to the boundary and that height: the engine says whether it is caught, carries the fielder, or comes down short. Give the mass for its momentum.',
  },
  fields: [
    { key: 'u', col: 'hit', label: `Speed ${M`u`} (m s⁻¹)`, placeholder: '—', hint: 'The speed it leaves the bat at.' },
    { key: 'theta', col: 'hit', label: `Angle ${M`theta`} (°)`, placeholder: '—', hint: 'Above the horizontal.' },
    { key: 'm', col: 'hit', label: 'Mass of the ball (kg)', placeholder: '—', optional: true, hint: 'For its momentum. A cricket ball is about 0.16 kg.' },
    { key: 'd', col: 'field', label: 'Distance to the boundary (m)', placeholder: '—', hint: 'Along the ground, from the batter to the fielder on the boundary.' },
    { key: 'L', col: 'field', label: `The fielder catches it below ${M`L`} (m)`, placeholder: '—', hint: 'Above the height it was struck from: a leaping catch is about 3 m.' },
  ],
  cols: { hit: 'The hit', field: 'The fielder' },
  rows: [],
  g: [9.81, 9.8, 10],
  hides: { shows: ['ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveEndWords: 'Caught here, or down: the engine follows it no further.',
  read(v) { return { u: v.u, theta: v.theta, d: v.d, L: v.L, m: v.m, g: v.g }; },
  solve: solveBoundary,
  working: (s) => boundaryWorking(s),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    // a phone keeps two, so the flight is not behind them (js/render/boundary.js HUD_PHONE)
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    const all = [
      { k: 'Across', v: num(r.x, 2), unit: 'm', hue: 'disp' },
      { k: 'Height', v: num(r.y, 2), unit: 'm', hue: 'disp' },
      { k: 'Velocity across', v: num(v.x, 2), unit: 'm s⁻¹', hue: 'vel' },
      { k: 'Velocity up', v: num(v.y, 2), unit: 'm s⁻¹', hue: 'vel' },
      { k: 'Speed', v: num(f.speed(t), 2), unit: 'm s⁻¹', hue: 'vel' },
    ];
    return { left: phone ? [all[1], all[4]] : all, right: [{ k: 'Time', v: num(t, 2), unit: 's' }] };
  },

  /* Each graph has its two components: across dashed, up solid (rule 2).
     The moment it reaches the boundary is ringed on both lines. */
  graphs(f, t, P) {
    const tMax = f.tMax;
    const ring = f.verdict !== 'short' ? [f.tAt] : [];
    const pair = (fx, fy, c) => [
      { label: 'across', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'up', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t,
        series: pair((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp),
        points: ring.flatMap((ta) => [{ t: ta, y: f.pos(ta).x, color: P.mark }, { t: ta, y: f.pos(ta).y, color: P.mark }]) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: pair((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel),
        points: ring.flatMap((ta) => [{ t: ta, y: f.vel(ta).x, color: P.mark }, { t: ta, y: f.vel(ta).y, color: P.mark }]) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: pair(() => 0, () => -f.g, P.acc) },
    ];
  },

  /** The card's sketch: the arc from the bat, the fielder's reach at the rope, the stand. */
  thumb(s) {
    const r = solveBoundary(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const xm = Math.max(r.R, r.d) * 1.12, k = Math.min(100 / xm, 40 / r.H);
    const X = (x) => 8 + x * k, Y = (y) => 52 - y * k;
    const pts = r.f.path(30, r.T).map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="52" width="120" height="8" fill="#5f9a48"/>
      <rect x="${X(r.d + 5).toFixed(1)}" y="40" width="${(120 - X(r.d + 5)).toFixed(1)}" height="12" fill="#8e9298"/>
      <rect x="${(X(r.d) - 1.5).toFixed(1)}" y="${Y(r.L).toFixed(1)}" width="3" height="${(52 - Y(r.L)).toFixed(1)}" fill="var(--mark)" opacity="0.5"/>
      <path d="${pts}" fill="none" stroke="var(--vel)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${X(0).toFixed(1)}" cy="49" r="2.5" fill="#f6f3ea"/><circle cx="${(X(r.d) + 2).toFixed(1)}" cy="48" r="2.5" fill="#f6f3ea"/>
    </svg>`;
  },

  ending(s) {
    // to three significant figures, as the verdict under it gives its answer
    const title = s.verdict === 'catch' ? `Caught, ${s3(s.at.y)} m above where it was struck.`
      : s.verdict === 'over' ? `Over the fielder: ${s3(s.at.y)} m up at the boundary.`
        : `Down ${s3(s.R)} m out, short of the boundary.`;
    return {
      eyebrow: `A boundary ${tr(s.d)} m away, a reach of ${tr(s.L)} m`,
      title,
      body: `<p>${s.verdictHTML}</p>${s.notes.map((n) => `<p>${n}</p>`).join('')}`,
      real: true,
    };
  },
};
