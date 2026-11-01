// kits/rocket.js — a firework rocket, driven up then free, wired for the app.
// The engine is js/core/rocket.js and the stage js/render/rocket.js; this file
// says which boxes to show, reads them, and lays out what the engine answered
// (rule 4). See design/components.md.

import { solveRocket, rocketWorking } from '../core/rocket.js';
import * as stage from '../render/rocket.js';
import { T, num } from '../notation.js';

const tr = (x) => num(x, 3, { trim: true });

export const rocket = {
  id: 'rocket',
  verb: 'Light it',
  voice: {
    h: 'The firework rocket',
    sub: 'A rocket from rest at ground level is driven straight up with a constant acceleration until it burns out, then moves freely under gravity. Give how long it burns and one thing about the burn; ask its height at a moment after.',
  },
  fields: [
    { key: 'T', col: 'burn', label: 'It burns for (s)', placeholder: '—', hint: 'From the launch to burn-out.' },
    { key: 's1', col: 'burn', label: 'Rising this far meanwhile (m)', placeholder: '—', hint: 'Or give its acceleration, or its speed at burn-out.' },
    { key: 'a', col: 'burn', label: 'Or its acceleration (m s⁻²)', placeholder: '—', hint: '' },
    { key: 'v1', col: 'burn', label: 'Or its speed at burn-out (m s⁻¹)', placeholder: '—', hint: '' },
    { key: 'at', col: 'ask', label: 'Its height at time (s)', placeholder: '—', hint: 'From the launch. Optional.' },
  ],
  cols: { burn: 'While it burns', ask: 'Asked' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['apex', 'ruler', 'range', 'grid', 'components'], extras: ['energy'], bounce: true },

  read(v) { return { T: v.T, s1: v.s1, a: v.a, v1: v.v1, at: v.at, g: v.g }; },
  solve: solveRocket,
  working: (solved) => rocketWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Height', v: num(f.pos(t).y, 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity, up', v: num(f.vel(t).y, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration, up', v: num(f.accel(t), 2), unit: 'm s⁻²', hue: 'acc' },
        { k: 'Stage', v: t <= f.T ? 'burning' : 'free', unit: '', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* All vertical, so every line solid (rule 2); burn-out ringed. */
  graphs(f, t, P) {
    return [
      { canvas: 'g-s', title: 'Height–time', unit: 'm', tMax: f.tMax, t, points: [{ t: f.T, y: f.s1, color: P.mark }, ...(f.at ? [{ t: f.at.t, y: f.at.y, color: P.mark }] : [])],
        series: [{ label: 'height', tag: T`h`, fn: (tt) => f.pos(tt).y, color: P.disp, dash: null }] },
      { canvas: 'g-v', title: 'Velocity–time, up positive', unit: 'm s⁻¹', tMax: f.tMax, t, points: [{ t: f.T, y: f.v1, color: P.mark }],
        series: [{ label: 'velocity', tag: T`v`, fn: (tt) => f.vel(tt).y, color: P.vel, dash: null }] },
      { canvas: 'g-a', title: 'Acceleration–time, up positive', unit: 'm s⁻²', tMax: f.tMax, t,
        series: [{ label: 'acceleration', tag: T`a`, fn: f.accel, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <defs><linearGradient id="rk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2140"/><stop offset="1" stop-color="#7a5a7a"/></linearGradient></defs>
      <rect x="0" y="0" width="120" height="54" fill="url(#rk)"/><rect x="0" y="54" width="120" height="6" fill="#5d7a4a"/>
      <path d="M60 54 V24" stroke="#ffd27a" stroke-width="1.6" opacity="0.8"/><path d="M57 18 h6 v8 h-6z" fill="#c8323a"/><path d="M57 18 l3 -4 l3 4z" fill="#e8e2d6"/>
      <g stroke-width="1.4"><path d="M84 14 l10 -6" stroke="#ff6b6b"/><path d="M84 14 l12 2" stroke="#ffd93d"/><path d="M84 14 l6 10" stroke="#6bcbff"/><path d="M84 14 l-8 8" stroke="#c77dff"/><path d="M84 14 l-4 -9" stroke="#7dff9a"/></g>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Burnt out, risen, fallen',
      title: s.at ? `At t = ${tr(s.at.t)} s it is ${tr(s.at.y)} m up.` : `It reaches ${tr(s.Htop)} m.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
