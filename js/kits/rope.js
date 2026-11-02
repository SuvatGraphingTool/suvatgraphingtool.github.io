// kits/rope.js — a sledge pulled by a rope over rough snow, level or up a
// slope, then let go and sliding to rest, wired for the app. The engine is
// js/core/rope.js (R, F = μR and F = ma while pulled and after), the stage
// js/render/rope.js (a snowfield, the sledge, the person pulling, the
// free-body diagram on a card). See design/components.md.

import { solveRope, ropeWorking } from '../core/rope.js';
import * as stage from '../render/rope.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = false) => ({ key, col, label, placeholder: '—', hint, optional });
// 2 dp, but an acceleration under 0.1 to 3 s.f., never a false 0
const p2 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));

export const rope = {
  id: 'rope',
  verb: 'Pull',
  voice: {
    h: 'Pulled by a rope',
    sub: 'A sledge is pulled over rough snow by a rope — along level ground or up a slope, the rope at an angle to the surface — then let go, and friction brings it to rest. Give its mass, the coefficient of friction, the tension (or its acceleration), and its speed when the rope is let go.',
  },
  fields: [
    fld('m', 'pull', 'Its mass (kg)', ''),
    fld('T', 'pull', 'The tension in the rope (N)', 'Or its acceleration below.', true),
    fld('a', 'pull', 'Or its acceleration while pulled (m s⁻²)', 'Then the tension is found.', true),
    fld('theta', 'pull', 'The rope’s angle above the surface (°)', 'Blank: along the surface.', true),
    fld('v', 'pull', 'Its speed when the rope is let go (m s⁻¹)', ''),
    fld('mu', 'ground', 'Coefficient of friction', ''),
    fld('alpha', 'ground', 'The slope’s angle (°)', 'Blank: level ground.', true),
    fld('tanA', 'ground', 'Or the slope’s tan α', 'As the papers often give it.', true),
  ],
  cols: { pull: 'The pull', ground: 'The ground' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolvePart: '',     // along a slope or level ground pulled by a rope: drawn solid, as the stage draws it
  resolveFrom: 'where it started',
  resolveWords: { pos: 'going the way it is pulled', neg: 'sliding back', plus: 'The way it is pulled', line: 'along the surface' },
  read(v) { return { m: v.m, T: v.T, a: v.a, theta: v.theta, v: v.v, mu: v.mu, alpha: v.alpha, tanA: v.tanA, g: v.g }; },
  solve: solveRope,
  working: (solved) => ropeWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Along the surface', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: p2(f.acc(t)), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along one line; the acceleration changes when the rope is let go, and again at rest. */
  graphs(f, t, P) {
    const cut = [f.tRel, f.tRest];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'along the surface', tag: T`s`, fn: f.pos, color: P.disp, dash: null }], points: [{ t: f.tRel, y: f.s1, color: P.mark, label: 'let go' }, { t: f.tRest, y: f.s1 + f.s2, color: P.mark }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: null }], points: [{ t: f.tRel, y: f.v, color: P.mark }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: f.acc, color: P.acc, dash: null, breaks: cut }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="44" fill="#c9dbe8"/><rect x="0" y="44" width="120" height="16" fill="#f4f7fa"/>
      <g transform="translate(40 44)"><rect x="-12" y="-7" width="22" height="3" fill="#a86f38"/><path d="M-13 0 H8 Q12 0 11 -4" stroke="#3b2a1a" stroke-width="1.5" fill="none"/></g>
      <path d="M51 41 L78 30" stroke="#c9a86a" stroke-width="1.4"/><circle cx="82" cy="20" r="3" fill="#d9a988"/><path d="M82 23 V34 L78 44 M82 34 L86 44 M82 26 L78 30" stroke="#5f7392" stroke-width="2.2" fill="none"/>
      <path d="M14 44 l-5 -10 l-5 10z" fill="#2e5a3e"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Let go, to rest',
      title: `${num(Number(s.s2.toPrecision(3)), 6, { trim: true })} m after the rope is let go${s.stays ? '.' : ', then it slides back.'}`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
