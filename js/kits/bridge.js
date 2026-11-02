// kits/bridge.js — a throw from a footbridge, caught by a runner on the road
// below, wired for the app. The engine is js/core/bridge.js and the stage
// js/render/bridge.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4). See design/components.md.

import { solveBridge, bridgeWorking } from '../core/bridge.js';
import * as stage from '../render/bridge.js';
import { T, num } from '../notation.js';

const tr = (x) => num(x, 3, { trim: true });

export const bridge = {
  id: 'bridge',
  verb: 'Throw it',
  voice: {
    h: 'From the bridge, to the runner',
    sub: 'Someone on a footbridge throws a ball just as a runner passes underneath; the runner keeps a steady speed and catches it later, below where it was thrown. Give the speed, the time and the drop, and the engine finds the throw.',
  },
  fields: [
    { key: 'V', col: 'run', label: 'The runner’s speed (m s⁻¹)', placeholder: '—', hint: 'Constant, along the road.' },
    { key: 'T', col: 'run', label: 'Caught after (s)', placeholder: '—', hint: 'From the instant of the throw.' },
    { key: 'drop', col: 'run', label: 'Caught this far below the throw (m)', placeholder: '—', hint: 'Below the point of projection.' },
  ],
  cols: { run: 'The runner and the catch' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  /** Resolve: the ball, and the runner below at a steady V. */
  resolveObjects: (f) => [{ name: 'Ball', pos: f.pos, vel: f.vel }, { name: 'Runner', pos: (t) => ({ x: f.runner(t), y: 0 }), vel: () => ({ x: f.V, y: 0 }), acc: () => 0, axis: 'along' }],
  read(v) { return { V: v.V, T: v.T, drop: v.drop, g: v.g }; },
  solve: solveBridge,
  working: (solved) => bridgeWorking(solved),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    return {
      left: [
        { k: 'Ball, along the road', v: num(r.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Ball, above the throw', v: num(r.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Ball, vertical velocity', v: num(v.y, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Runner, along the road', v: num(f.runner(t), 2), unit: 'm', hue: 'disp' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* The ball across (dashed) and up (solid), rule 2; the runner across with it. */
  graphs(f, t, P) {
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [
        { label: 'ball across', tag: T`x`, fn: (tt) => f.pos(tt).x, color: P.disp, dash: [6, 4] },
        { label: 'ball up', tag: T`y`, fn: (tt) => f.pos(tt).y, color: P.disp, dash: null },
        { label: 'runner', tag: T`x_R`, fn: f.runner, color: P.second, dash: [2, 4] },
      ] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [
        { label: 'across', tag: T`v_x`, fn: (tt) => f.vel(tt).x, color: P.vel, dash: [6, 4] },
        { label: 'up', tag: T`v_y`, fn: (tt) => f.vel(tt).y, color: P.vel, dash: null },
      ] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [
        { label: 'across', tag: T`a_x`, fn: () => 0, color: P.acc, dash: [6, 4] },
        { label: 'up', tag: T`a_y`, fn: () => -f.params.g, color: P.acc, dash: null },
      ] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="50" width="120" height="10" fill="#55575c"/>
      <rect x="6" y="22" width="30" height="5" fill="#c9c2bb"/><rect x="18" y="27" width="6" height="23" fill="#9c948d"/>
      <path d="M24 16 Q48 -6 80 42" fill="none" stroke="var(--disp)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="82" cy="40" r="3" fill="#fff"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Caught on the run',
      title: `Thrown at ${tr(s.u)} m s⁻¹, ${num(Math.abs(s.alpha), 1)}° ${s.alpha >= 0 ? 'above' : 'below'} the horizontal.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
