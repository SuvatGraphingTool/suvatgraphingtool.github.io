// kits/wall.js — a stone on ice that hits the boards and slides back, wired
// for the app. The engine is js/core/wall.js (SUVAT, F = ma, and the wall's
// impulse through js/core/impulse.js), the stage js/render/wall.js (the rink
// from above, the end boards at C). See design/components.md.

import { solveWall, wallWorking } from '../core/wall.js';
import * as stage from '../render/wall.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint) => ({ key, col, label, placeholder: '—', hint });

export const wall = {
  id: 'wall',
  verb: 'Slide',
  voice: {
    h: 'Back off the boards',
    sub: 'A stone slides on ice against a constant resistance, past A and B to the boards at C. It hits them, rebounds, and slides back until the same resistance stops it. Give its speeds at A and B and the distances; the resistance or its mass; and the wall’s impulse or the speed it rebounds with.',
  },
  fields: [
    fld('uA', 'line', 'Speed at A (m s⁻¹)', ''),
    fld('uB', 'line', 'Speed at B (m s⁻¹)', ''),
    fld('AB', 'line', 'AB (m)', ''),
    fld('AC', 'line', 'AC: A to the boards (m)', ''),
    fld('R', 'force', 'Resistance (N)', 'Constant, against the motion.'),
    fld('m', 'force', 'Or its mass (kg)', 'One of the two: F = ma finds the other.'),
    fld('I', 'wall', 'The wall’s impulse (N s)', 'Its size.'),
    fld('w', 'wall', 'Or the speed it rebounds with (m s⁻¹)', ''),
  ],
  cols: { line: 'Along the ice', force: 'The resistance', wall: 'At the boards' },
  rows: [],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolveFrom: 'A',
  read(v) { return { uA: v.uA, uB: v.uB, AB: v.AB, AC: v.AC, R: v.R, m: v.m, I: v.I, w: v.w }; },
  solve: solveWall,
  working: (solved) => wallWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'From A', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity, towards C +', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: num(f.acc(t), 3, { trim: true }), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* All along the line: dashed (rule 2); B, the wall and the rest ringed. */
  graphs(f, t, P) {
    const ring = (tt, y) => ({ t: tt, y, color: P.mark });
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'from A', tag: T`s`, fn: f.pos, color: P.disp, dash: [6, 4] }],
        points: [ring(f.tB, f.AB), { ...ring(f.tC, f.AC), label: 'C' }, ring(f.tMax, f.stopAt)] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: [6, 4] }],
        points: [ring(f.tC, f.vC), { ...ring(f.tC, -f.w), label: 'the wall' }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: f.acc, color: P.acc, dash: [6, 4] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#2b3540"/><rect x="0" y="14" width="104" height="32" fill="#eef5f8"/>
      <rect x="104" y="10" width="6" height="40" fill="#5a3b26"/><rect x="101" y="14" width="3" height="32" fill="#2f6db3"/>
      <path d="M24 14v32M60 14v32" stroke="#557" stroke-width="1.4"/>
      <circle cx="82" cy="30" r="6" fill="#8a8e93"/><rect x="78" y="28.5" width="8" height="3" rx="1.5" fill="#c8352b"/>
      <path d="M74 22h-16" stroke="var(--vel)" stroke-width="1.6" stroke-dasharray="3 2"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Back off the boards',
      title: `At rest ${num(s.tBack, 3, { trim: true })} s after the wall, ${num(s.back, 3, { trim: true })} m back.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
