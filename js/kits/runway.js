// kits/runway.js — an aircraft taking off along a runway, wired for the app.
// The engine is js/core/runway.js (the twelve's SUVAT solver, and the runway
// left over); the stage is js/render/runway.js, an airfield. See
// design/components.md.

import { solveRunway, runwayWorking } from '../core/runway.js';
import * as stage from '../render/runway.js';
import { T, num } from '../notation.js';

const tr = (x) => num(x, 3, { trim: true });

export const runway = {
  id: 'runway',
  verb: 'Take off',
  voice: {
    h: 'Take-off',
    sub: 'An aircraft rolls along a runway from A with a constant acceleration and leaves the ground at C. Give any three of its speed at A, its take-off speed, its acceleration, the time and the distance, and the runway’s length to find what is left beyond C.',
  },
  fields: [
    { key: 'u', col: 'run', label: 'Speed at A (m s⁻¹)', placeholder: '—', hint: '' },
    { key: 'v', col: 'run', label: 'Take-off speed at C (m s⁻¹)', placeholder: '—', hint: '' },
    { key: 'a', col: 'run', label: 'Acceleration (m s⁻²)', placeholder: '—', hint: '' },
    { key: 't', col: 'run', label: 'Time from A to C (s)', placeholder: '—', hint: '' },
    { key: 's', col: 'run', label: 'Distance AC (m)', placeholder: '—', hint: 'Any three of these five.' },
    { key: 'L', col: 'way', label: 'The runway AB (m)', placeholder: '—', hint: '1.2 km is 1200. Optional.' },
  ],
  cols: { run: 'The take-off run', way: 'The runway' },
  rows: [],
  hides: { shows: ['apex', 'ruler', 'range', 'grid', 'components'], extras: ['energy'], bounce: true },

  read(v) { return { u: v.u, v: v.v, a: v.a, t: v.t, s: v.s, L: v.L }; },
  solve: solveRunway,
  working: (solved) => runwayWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Distance from A', v: num(f.pos(t).x, 1), unit: 'm', hue: 'disp' },
        { k: 'Speed', v: num(f.vel(t).x, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: num(f.a, 2), unit: 'm s⁻²', hue: 'acc' },
        { k: 'Runway left', v: f.L ? num(f.remaining(t), 1) : '—', unit: f.L ? 'm' : '', hue: 'disp' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along the runway, so dashed (rule 2); lift-off ringed. */
  graphs(f, t, P) {
    return [
      { canvas: 'g-s', title: 'Distance from A–time', unit: 'm', tMax: f.tMax, t, points: [{ t: f.t, y: f.s, color: P.mark }],
        series: [{ label: 'distance', tag: T`s`, fn: (tt) => f.pos(tt).x, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, points: [{ t: f.t, y: f.v, color: P.mark }],
        series: [{ label: 'velocity', tag: T`v`, fn: (tt) => f.vel(tt).x, color: P.vel, dash: [6, 4] }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t,
        series: [{ label: 'acceleration', tag: T`a`, fn: () => f.a, color: P.acc, dash: [6, 4] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="44" fill="#cfe1ee"/><rect x="0" y="44" width="120" height="16" fill="#7c9a63"/>
      <rect x="4" y="44" width="112" height="6" fill="#4f5258"/><path d="M10 47 h8 M30 47 h8 M50 47 h8 M70 47 h8 M90 47 h8" stroke="#eee" stroke-width="1"/>
      <path d="M96 40 l-30 2 l-6 -6 l-3 0 l2 7 l-2 0 l28 1 z" fill="#ffffff" stroke="#2f5d9b"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Airborne',
      title: s.BC != null ? `${tr(s.BC)} m of runway to spare.` : `It leaves the ground ${tr(s.AC)} m from A.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
