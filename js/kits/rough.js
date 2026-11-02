// kits/rough.js — a sledge projected up a rough snowy slope, wired for the
// app. The engine is js/core/rough.js (R, F = μR, F = ma up the slope, SUVAT
// to rest, and back down if μ < tan α), the stage js/render/rough.js. See
// design/components.md.

import { solveRough, roughWorking } from '../core/rough.js';
import * as stage from '../render/rough.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint) => ({ key, col, label, placeholder: '—', hint });

export const rough = {
  id: 'rough',
  verb: 'Push',
  voice: {
    h: 'Up a rough slope',
    sub: 'A sledge is sent up a line of greatest slope of a rough hillside. Friction and the weight’s component both slow it until it stops; then, if the slope is steep enough, it slides back down, friction now acting up the slope. Give its speed, the slope’s angle and the coefficient of friction — its mass too, for the forces in newtons.',
  },
  fields: [
    fld('u', 'start', 'Speed up the slope (m s⁻¹)', ''),
    fld('alpha', 'slope', 'The slope’s angle (°)', ''),
    fld('mu', 'slope', 'Coefficient of friction', ''),
    { ...fld('m', 'start', 'Its mass (kg)', 'For R and F in newtons; it cancels from a.'), optional: true },
  ],
  cols: { start: 'The sledge', slope: 'The slope' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolveFrom: 'where it started',
  resolveWords: { pos: 'going up the slope', neg: 'going down the slope', plus: 'Up the slope', line: 'along the slope' },
  read(v) { return { u: v.u, alpha: v.alpha, mu: v.mu, m: v.m, g: v.g }; },
  solve: solveRough,
  working: (solved) => roughWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Up the slope', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity, up +', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration, up +', v: num(f.acc(t), 3, { trim: true }), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along the slope: one line. The acceleration changes at the top: a break. */
  graphs(f, t, P) {
    const top = [{ t: f.tTop, y: f.sUp, color: P.mark, label: 'at rest' }];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'up the slope', tag: T`s`, fn: f.pos, color: P.disp, dash: null }], points: top },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: null }], points: [{ t: f.tTop, y: 0, color: P.mark }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: f.acc, color: P.acc, dash: null, breaks: [f.tTop] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#c9dbe8"/><path d="M0 50 L30 50 L112 26 L120 26 L120 60 L0 60Z" fill="#f4f7fa"/>
      <path d="M0 50 L30 50 L112 26" stroke="#9fb0c0" stroke-width="1.4" fill="none"/>
      <g transform="translate(66 39) rotate(-16)"><rect x="-10" y="-6" width="18" height="3" fill="#a86f38"/><path d="M-11 0 H8 Q12 0 11 -4" stroke="#3b2a1a" stroke-width="1.5" fill="none"/></g>
      <path d="M24 46 l-4 -8 l-4 8z M24 40 l-3 -6 l-3 6z" fill="#2e5a3e"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: s.stays ? 'Friction holds it' : 'It slides back',
      title: `${num(s.sUp, 3, { trim: true })} m up the slope${s.stays ? ', and there it stays.' : `, then back at ${num(s.vBack, 3, { trim: true })} m s⁻¹.`}`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
