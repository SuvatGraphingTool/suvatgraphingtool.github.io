// kits/lift.js — a lift in its shaft: up from rest, steady, then slowing to a
// stop, wired for the app. The engine is the journey's (js/core/journey.js,
// three stages rest to rest); the stage is js/render/lift.js, a building cut
// away to show the shaft; the graphs are the journey's. See
// design/components.md.

import { solveJourney, journeyWorking } from '../core/journey.js';
import { journey } from './journey.js';
import * as stage from '../render/lift.js';
import { num } from '../notation.js';


export const lift = {
  id: 'lift',
  verb: 'Go up',
  voice: {
    h: 'The lift',
    sub: 'A lift rises from rest: it speeds up for a time, travels at a steady speed, then slows to a stop. Give the three stages and the engine finds the top speed and how far it rises — the area under its velocity–time graph.',
  },
  fields: [
    { key: 'a1', col: 'up', label: 'Speeds up at (m s⁻²)', placeholder: '—', hint: 'From rest.' },
    { key: 't1', col: 'up', label: 'for (s)', placeholder: '—', hint: '' },
    { key: 't2', col: 'steady', label: 'Then steady for (s)', placeholder: '—', hint: '' },
    { key: 't3', col: 'down', label: 'Then slows to rest in (s)', placeholder: '—', hint: 'Uniformly.' },
    { key: 'a3', col: 'down', label: 'Or slows at (m s⁻²)', placeholder: '—', hint: 'In place of the time.' },
  ],
  cols: { up: 'Speeding up', steady: 'Steady', down: 'Slowing down' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['apex', 'ruler', 'range', 'grid', 'components'], extras: ['energy'], bounce: true },

  read(v) { return { a1: v.a1, t1: v.t1, t2: v.t2, t3: v.t3, a3: v.a3 }; },
  solve: solveJourney,
  working: (solved) => journeyWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Height risen', v: num(f.pos(t).x, 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity, up', v: num(f.vel(t).x, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration, up', v: num(f.accel(t), 2), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },
  graphs: journey.graphs,

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="40" y="2" width="40" height="56" fill="#c4b2a1"/><rect x="54" y="2" width="12" height="56" fill="#2c2a30"/>
      <rect x="55" y="22" width="10" height="12" fill="#c9ced6"/><path d="M60 2 V22" stroke="#c9ccd2" stroke-width="1"/>
      <path d="M86 50 L94 30 L106 30 L114 50" fill="none" stroke="var(--vel)" stroke-width="2"/>
    </svg>`;
  },

  ending(s) {
    return { ...journey.ending(s), eyebrow: 'At rest at the top', title: `It rises ${num(s.f.range, 2, { trim: true })} m.` };
  },
};
