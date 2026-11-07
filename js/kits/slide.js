// kits/slide.js — something let go from rest that slides down a rough slope,
// wired for the app. The engine is js/core/slide.js (R, F = μR and F = ma down
// the slope, then SUVAT from rest — or the motion first, and μ from it), the
// stage js/render/slide.js (a lifeboat slipway, a house roof, or a wedge on a
// lab bench). See design/components.md.

import { solveSlide, slideWorking } from '../core/slide.js';
import * as stage from '../render/slide.js';
import { T, num } from '../notation.js';

// as the stage prints them: 2 dp, but an acceleration under 0.1 to 3 s.f., never a false 0
const p2 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));
const fld = (key, col, label, hint) => ({ key, col, label, placeholder: '—', hint, optional: true });

export const slide = {
  id: 'slide',
  verb: 'Let go',
  voice: {
    h: 'Down a rough slope',
    sub: 'Something let go from rest slides down a line of greatest slope of a rough surface: the weight’s component pulls it on, friction holds it back. Give the slope’s angle and the coefficient of friction and one of the run — or two of the run, and the engine finds the coefficient of friction. Its mass gives the forces in newtons.',
  },
  fields: [
    { key: 'alpha', col: 'slope', label: 'The slope’s angle (°)', placeholder: '—', hint: '' },
    fld('mu', 'slope', 'Coefficient of friction', 'Or leave it out and give two of the run.'),
    fld('m', 'slope', 'Its mass (kg)', 'For the forces; it cancels from a.'),
    fld('s', 'run', 'How far it slides (m)', ''),
    fld('t', 'run', 'For how long (s)', ''),
    fld('v', 'run', 'Its speed at the end (m s⁻¹)', ''),
  ],
  cols: { slope: 'The slope', run: 'The run, from rest' },
  rows: [
    { title: 'Where it is', fields: [
      { key: 'look', type: 'choice', label: 'It is', default: 'slipway', hint: 'Each is drawn as it is.',
        options: [{ v: 'slipway', label: 'A lifeboat down its slipway' }, { v: 'roof', label: 'A tile down a roof' }, { v: 'plane', label: 'A block down a wedge' }] },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolvePart: '',     // along a slope: neither across (dashed) nor up (rule 2)
  resolveEnds: true,   // the run stops at its end: the engine follows it no further
  resolveFrom: 'where it was let go',
  resolveWords: { pos: 'going down the slope', neg: 'going up the slope', plus: 'Down the slope', line: 'along the slope' },
  read(v) { return { look: v.look ?? 'slipway', alpha: v.alpha, mu: v.mu, m: v.m, s: v.s, t: v.t, v: v.v, g: v.g }; },
  solve: solveSlide,
  working: (solved) => slideWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Down the slope', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Speed', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: p2(f.acc(t)), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Down the slope: one line, so one series each. */
  graphs(f, t, P) {
    const end = (y) => [{ t: f.tMax, y, color: P.mark }];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'down the slope', tag: T`s`, fn: f.pos, color: P.disp, dash: null }], points: end(f.s) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: null }], points: end(f.v) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: f.acc, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#bcd7ea"/><rect x="0" y="44" width="120" height="16" fill="#3f7ea6"/>
      <path d="M0 14 L22 14 L96 46 L0 46Z" fill="#8c7d6c"/><path d="M14 14 L104 52" stroke="#c9c2b8" stroke-width="4"/>
      <rect x="2" y="2" width="20" height="12" fill="#ebe6dc"/><path d="M0 2 L12 -4 L24 2Z" fill="#59606b"/>
      <g transform="translate(58 33) rotate(23.5)"><path d="M-12 -4 H10 Q14 -4 12 0 H-11Z" fill="#22355e"/><rect x="-12" y="-6" width="22" height="2.4" fill="#e8732a"/><rect x="-5" y="-10" width="8" height="4" fill="#f5f6f8"/></g>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Down the slope',
      title: s.f.muGiven ? `${num(s.v, 3, { trim: true })} m s⁻¹ after ${num(s.s, 3, { trim: true })} m.` : (s.mu === 0 ? 'A smooth slope: no friction.' : `${T`mu = ${num(s.mu, 3)}`}: the coefficient of friction.`),
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
