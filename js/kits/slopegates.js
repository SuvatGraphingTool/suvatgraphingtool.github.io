// kits/slopegates.js — a particle sent up a rough slope past three timed
// marks, wired for the app. The engine is js/core/slopegates.js, the stage
// js/render/slopegates.js (a lab: a sanded board on the bench, light gates at
// P, Q and R, a timer). This file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4).

import { solveSlopeGates, slopeGatesWorking } from '../core/slopegates.js';
import * as stage from '../render/slopegates.js';
import { M, T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = false) => ({ key, col, label, placeholder: '—', hint, optional });

export const slopegates = {
  id: 'slopegates',
  verb: 'Send it up',
  voice: {
    h: 'Up a rough slope, timed past three marks',
    sub: 'A particle is sent up a line of greatest slope past P, Q and R. Give the two stretches and how long each takes: they give its deceleration and the speed it set off with. Give the slope’s angle too, and F = ma gives the coefficient of friction.',
  },
  fields: [
    fld('d1', 'stretch', 'PQ (m)', ''),
    fld('t1', 'stretch', 'Time from P to Q (s)', ''),
    fld('d2', 'stretch', 'QR (m)', ''),
    fld('t2', 'stretch', 'Time from Q to R (s)', ''),
    fld('theta', 'slope', 'The slope’s angle (°)', 'For the coefficient of friction. Blank: only the motion.', true),
  ],
  cols: { stretch: 'The two stretches', slope: 'The slope' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'ticks', 'acceleration'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolvePart: '',
  resolveWords: { pos: 'up the slope', neg: 'down the slope', plus: 'up the slope +', line: 'the slope' },
  resolveObjects: (f) => [{ name: '', pos: f.pos, vel: f.vel, acc: f.acc, from: 'P, up the slope' }],
  read(v) {
    return { d1: v.d1, t1: v.t1, d2: v.d2, t2: v.t2, theta: v.theta, g: v.g };
  },
  solve: solveSlopeGates,
  working: (s) => slopeGatesWorking(s),
  render: stage.render,

  hud(f, t) {
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    const left = [
      { k: 'Up the slope from P', v: num(f.pos(t), 3), unit: 'm', hue: 'disp' },
      { k: 'Velocity, up +', v: num(f.vel(t), 3), unit: 'm s⁻¹', hue: 'vel' },
      { k: 'Acceleration, up +', v: num(f.acc(t), 3), unit: 'm s⁻²', hue: 'acc' },
    ];
    return { left: phone ? left.slice(0, 2) : left, right: [{ k: 'Time', v: num(t, 2), unit: 's' }] };
  },

  /* Along a slope: neither across nor up, so solid (rule 2). */
  graphs(f, t, P) {
    return [
      { canvas: 'g-s', title: 'Displacement–time, up +', unit: 'm', tMax: f.tMax, t, series: [{ label: 'up the slope', tag: T`s`, fn: f.pos, color: P.disp, dash: null }] },
      { canvas: 'g-v', title: 'Velocity–time, up +', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: null }] },
      { canvas: 'g-a', title: 'Acceleration–time, up +', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: f.acc, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#d9d8cb"/><rect x="0" y="46" width="120" height="14" fill="#3a3e44"/>
      <path d="M8 44 L112 36" stroke="#c9a476" stroke-width="4"/>
      <path d="M24 42 V22 M58 40 V20 M92 37 V17" stroke="#6e747c" stroke-width="2.4"/>
      <circle cx="24" cy="30" r="2" fill="#50e678"/><circle cx="58" cy="28" r="2" fill="#ff463c"/><circle cx="92" cy="25" r="2" fill="#ff463c"/>
      <rect x="40" y="35" width="8" height="5" fill="#d9a066"/><path d="M46 31 L60 30" stroke="var(--vel)" stroke-width="2"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: s.mu != null ? 'Friction, from its timing' : 'Its deceleration, from its timing',
      title: s.mu != null ? `${T`mu = ${num(s.mu, 3, { trim: true })}`}.` : `It slows at ${T`${num(s.dec, 3, { trim: true })} [m s^-2]`}.`,
      body: s.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
