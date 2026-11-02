// kits/hill.js — a cyclist freewheeling down a slope, wired for the app. The
// engine is js/core/hill.js (the twelve's SUVAT solver, then F = ma along the
// slope), the stage js/render/hill.js (side on, at the slope's true angle,
// with the forces on a card). See design/components.md.

import { solveHill, hillWorking } from '../core/hill.js';
import * as stage from '../render/hill.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint) => ({ key, col, label, placeholder: '—', hint, optional: true });

export const hill = {
  id: 'hill',
  verb: 'Freewheel',
  voice: {
    h: 'Freewheeling downhill',
    sub: 'A cyclist freewheels straight down a slope with a constant acceleration. Give three of the five for the run — or the slope’s angle and two of them. With the mass of cyclist and bike, the engine finds the resultant force, and the angle the slope must have: with no resistance, and against a resistance you give.',
  },
  fields: [
    fld('u', 'run', 'Speed at the top (m s⁻¹)', ''),
    fld('v', 'run', 'Speed at the end (m s⁻¹)', ''),
    fld('s', 'run', 'Distance down the slope (m)', ''),
    fld('t', 'run', 'Time (s)', ''),
    fld('a', 'run', 'Acceleration (m s⁻²)', 'Or leave it to the angle.'),
    fld('m', 'force', 'Mass of cyclist and bike (kg)', 'For the force and the angle.'),
    fld('R', 'force', 'Resistance up the slope (N)', 'Blank: none.'),
    fld('alpha', 'force', 'Or the slope’s angle (°)', 'Then the acceleration follows.'),
  ],
  cols: { run: 'Down the slope', force: 'The forces' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolveFrom: 'the top',
  read(v) { return { u: v.u, v: v.v, s: v.s, t: v.t, a: v.a, m: v.m, R: v.R, alpha: v.alpha, g: v.g }; },
  solve: solveHill,
  working: (solved) => hillWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Down the slope', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Speed', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: num(f.acc(t), 3, { trim: true }), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along the slope: one line, so one series each. */
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
      <rect x="0" y="0" width="120" height="60" fill="#bcd7ea"/><path d="M0 18 L20 18 L104 46 L120 46 L120 60 L0 60Z" fill="#6f9a4f"/>
      <path d="M0 18 L20 18 L104 46 L120 46" stroke="#5b5f66" stroke-width="3" fill="none"/>
      <circle cx="54" cy="29" r="4" fill="none" stroke="#333" stroke-width="1.4"/><circle cx="64" cy="32.5" r="4" fill="none" stroke="#333" stroke-width="1.4"/>
      <path d="M54 29 L60 24 L64 32.5 M60 24 L58 18" stroke="#c8352b" stroke-width="1.6" fill="none"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Down the slope',
      title: s.alpha0 != null ? `A slope of ${num(s.alpha0, 2)}°${s.alphaR != null ? `, or ${num(s.alphaR, 2)}° against the resistance` : ''}.` : `${num(s.a, 3, { trim: true })} m s⁻² for ${num(s.t, 2)} s.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
