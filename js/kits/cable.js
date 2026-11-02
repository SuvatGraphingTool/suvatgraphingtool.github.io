// kits/cable.js — a lift on its cable with a passenger: the journey's three
// stages, and in each the cable's tension and the floor's push, wired for the
// app. The engine is js/core/cable.js (the journey's engine, then F = ma for
// the forces), the stage js/render/cable.js (the lift's stage and a card of
// free-body diagrams). See design/components.md.

import { solveCable, cableWorking } from '../core/cable.js';
import { lift } from './lift.js';
import * as stage from '../render/cable.js';
import { num } from '../notation.js';

export const cable = {
  ...lift,
  id: 'cable',
  verb: 'Go up',
  voice: {
    h: 'The lift, its cable and its floor',
    sub: 'A lift with a passenger rises from rest on its cable: it speeds up, travels steadily, then slows to a stop. Give the stages (and how far it rises, if that is what fixes them) and the two masses: the engine finds the motion, then the cable’s tension and the floor’s push on the passenger in each stage.',
  },
  fields: [
    { key: 'a1', col: 'up', label: 'Speeds up at (m s⁻²)', placeholder: '—', hint: 'From rest.' },
    { key: 'V', col: 'up', label: 'to a top speed of (m s⁻¹)', placeholder: '—', hint: 'Or the time below.' },
    { key: 't1', col: 'up', label: 'for (s)', placeholder: '—', hint: '' },
    { key: 't2', col: 'steady', label: 'Then steady for (s)', placeholder: '—', hint: 'Or leave it to the height.' },
    { key: 'D', col: 'steady', label: 'Rising (m) in all', placeholder: '—', hint: 'The area under the v–t graph.' },
    { key: 't3', col: 'down', label: 'Then slows to rest in (s)', placeholder: '—', hint: 'Uniformly.' },
    { key: 'a3', col: 'down', label: 'Or slows at (m s⁻²)', placeholder: '—', hint: 'In place of the time.' },
    { key: 'M', col: 'mass', label: 'The lift’s mass (kg)', placeholder: '—', hint: '' },
    { key: 'm', col: 'mass', label: 'The passenger’s mass (kg)', placeholder: '—', hint: 'For the floor’s push.', optional: true },
  ],
  cols: { up: 'Speeding up', steady: 'Steady', down: 'Slowing down', mass: 'The masses' },
  g: [9.8, 9.81, 10],
  read(v) { return { a1: v.a1, V: v.V, t1: v.t1, t2: v.t2, D: v.D, t3: v.t3, a3: v.a3, M: v.M, m: v.m, g: v.g }; },
  solve: solveCable,
  working: (solved) => cableWorking(solved),
  render: stage.render,

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="30" y="2" width="40" height="56" fill="#c4b2a1"/><rect x="44" y="2" width="12" height="56" fill="#2c2a30"/>
      <rect x="45" y="24" width="10" height="12" fill="#c9ced6"/><path d="M50 2 V24" stroke="#c9ccd2" stroke-width="1"/>
      <rect x="84" y="24" width="18" height="10" fill="none" stroke="#333" stroke-width="1.4"/>
      <path d="M93 24 V8 M89 12 L93 8 L97 12 M93 34 V48 M89 44 L93 48 L97 44" stroke="#333" stroke-width="1.6" fill="none"/>
    </svg>`;
  },

  ending(s) {
    return { ...lift.ending(s), title: `Tension ${num(s.T1, 1, { trim: true })} N speeding up, ${num(s.T3, 1, { trim: true })} N slowing.` };
  },
};
