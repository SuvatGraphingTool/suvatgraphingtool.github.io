// kits/ice.js — a stone sliding to rest down the ice past lines A, B and C,
// wired for the app. The engine is js/core/ice.js (the speeds alone give the
// ratio of the distances; one more number scales them), the stage
// js/render/ice.js (a curling sheet from above). See design/components.md.

import { solveIce, iceWorking } from '../core/ice.js';
import * as stage from '../render/ice.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint) => ({ key, col, label, placeholder: '—', hint });

export const ice = {
  id: 'ice',
  verb: 'Slide',
  voice: {
    h: 'Down the ice',
    sub: 'A stone slides down the ice with a constant deceleration, past lines A, B and C, and comes to rest at D. Give its speeds at A, B and C: the ratio of the distances follows from those alone. Then give one more — where it rests, one of the distances, or the deceleration — and every distance and time follows.',
  },
  fields: [
    fld('uA', 'speeds', 'Speed at A (m s⁻¹)', ''),
    fld('uB', 'speeds', 'Speed at B (m s⁻¹)', ''),
    fld('uC', 'speeds', 'Speed at C (m s⁻¹)', 'Blank if there is no C.'),
    fld('AD', 'scale', 'A to where it rests, AD (m)', 'One of these four fixes the scale.'),
    fld('AB', 'scale', 'Or AB (m)', ''),
    fld('BC', 'scale', 'Or BC (m)', ''),
    fld('a', 'scale', 'Or its deceleration (m s⁻²)', 'Its size.'),
  ],
  cols: { speeds: 'Its speeds', scale: 'One more, to scale it' },
  rows: [],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolveFrom: 'A',
  /** Unscaled, every distance and time is a number over a. */
  resolveUnits: (f) => (f.scaled ? null : [`× ${T`1/a`}`, 'm s⁻¹', '× a', `× ${T`1/a`}`]),
  read(v) { return { uA: v.uA, uB: v.uB, uC: v.uC, AD: v.AD, AB: v.AB, BC: v.BC, a: v.a }; },
  solve: solveIce,
  working: (solved) => iceWorking(solved),
  render: stage.render,

  hud(f, t) {
    const u = f.scaled ? ['m', 's'] : [`× ${T`1/a`}`, `× ${T`1/a`}`];
    return {
      left: [
        { k: 'From A', v: num(f.pos(t), 2), unit: u[0], hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Deceleration', v: f.scaled ? num(-f.acc(t), 3, { trim: true }) : (f.acc(t) !== 0 ? 'a' : '0'), unit: f.scaled ? 'm s⁻²' : '', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: u[1] }],
    };
  },

  /* All along the line: dashed (rule 2); the lines A, B, C ringed. */
  graphs(f, t, P) {
    const marks = f.marks.filter((m) => m.t > 0);
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: f.scaled ? 'm' : '× 1⁄a', tMax: f.tMax, t, series: [{ label: 'from A', tag: T`s`, fn: f.pos, color: P.disp, dash: [6, 4] }], points: marks.map((m) => ({ t: m.t, y: m.x, color: P.mark, label: m.id })) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: [6, 4] }], points: marks.map((m) => ({ t: m.t, y: m.v, color: P.mark, label: m.id })) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: f.scaled ? 'm s⁻²' : '× a', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: f.acc, color: P.acc, dash: [6, 4] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#2b3540"/><rect x="0" y="14" width="120" height="32" fill="#eef5f8"/>
      <circle cx="98" cy="30" r="14" fill="#2f6db3"/><circle cx="98" cy="30" r="9" fill="#f8fbfd"/><circle cx="98" cy="30" r="5" fill="#c8352b"/>
      <path d="M30 14v32M55 14v32M74 14v32" stroke="#557" stroke-width="1.4"/>
      <circle cx="42" cy="30" r="6" fill="#8a8e93"/><rect x="38" y="28.5" width="8" height="3" rx="1.5" fill="#c8352b"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: s.scaled ? 'At rest at D' : 'From the speeds alone',
      title: s.ratioSrc ? `AB : BC = ${s.ratioSrc.replace(/<[^>]+>/g, '')}.` : s.scaled ? `It rests ${num(s.AD, 3, { trim: true })} m past A.` : 'Each distance is over a.',
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
