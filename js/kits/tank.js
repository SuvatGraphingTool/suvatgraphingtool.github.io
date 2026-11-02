// kits/tank.js — a particle let go above a liquid, falling freely to its
// surface and on down through it against a constant resistance to the bottom,
// wired for the app. The engine is js/core/tank.js, the stage
// js/render/tank.js (a diving pool cut away, or a tall glass tank of oil in a
// laboratory). See design/components.md.

import { solveTank, tankWorking } from '../core/tank.js';
import * as stage from '../render/tank.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });
const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });

export const tank = {
  id: 'tank',
  verb: 'Let go',
  voice: {
    h: 'Into the water',
    sub: 'Something is let go above a liquid — dropped from rest, or thrown straight down — and falls freely to the surface, then on down through the liquid against a constant resistance to the bottom. In the liquid it may still speed up, or slow down. Give the heights, then the resistance and the mass, or its acceleration in the liquid.',
  },
  fields: [
    fld('h', 'air', 'Height above the surface (m)', '', false),
    fld('u', 'air', 'Speed straight down when let go (m s⁻¹)', 'Blank or 0: dropped from rest.'),
    fld('D', 'liquid', 'Depth of the liquid (m)', '', false),
    fld('m', 'liquid', 'Its mass (kg)', 'With the resistance; or with the acceleration, to find the resistance.'),
    fld('R', 'liquid', 'The resistance in the liquid (N)', 'Or its acceleration there, below.'),
    fld('aL', 'liquid', 'Or its acceleration in the liquid, down + (m s⁻²)', 'Slowing down: negative.'),
  ],
  cols: { air: 'In the air', liquid: 'In the liquid' },
  rows: [
    { title: 'Where it is', fields: [
      { key: 'look', type: 'choice', label: 'It is', default: 'pool', hint: 'Each is drawn as it is.',
        options: [{ v: 'pool', label: 'A diving brick into a pool' }, { v: 'lab', label: 'A ball bearing into a tank of oil' }] },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'down',
  resolveObjects: (f) => [{ name: '', pos: f.pos, vel: f.vel, acc: f.acc, from: 'where it was let go' }],
  resolveEnds: true,
  read(v) { return { look: v.look === 'lab' ? 'lab' : 'pool', h: v.h, u: v.u, D: v.D, m: v.m, R: v.R, aL: v.aL, g: v.g }; },
  solve: solveTank,
  working: (solved) => tankWorking(solved),
  render: stage.render,

  hud(f, t) {
    const y = f.pos(t) - f.h, end = t >= f.tB - 1e-9, at = end ? (f.stops ? 'At rest: ' : 'At the bottom: ') : '';
    return {
      left: [
        { k: `${at}${at ? 'down' : 'Down'} from the start${y > 1e-9 ? `, ${num(y, 2)} m below the surface` : ''}`, v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: `${at}${at ? 'velocity' : 'Velocity'}, down +`, v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        // past the end the model has no acceleration to give: none is shown
        { k: end && t > f.tB + 1e-9 ? 'Acceleration: the model ends here' : 'Acceleration, down +', v: end && t > f.tB + 1e-9 ? '—' : num(f.acc(t), 2), unit: end && t > f.tB + 1e-9 ? '' : 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* One vertical line, down positive: solid (rule 2). The acceleration steps at the surface, and again at the bottom. */
  graphs(f, t, P) {
    const cut = [f.t1].filter((x) => x > 1e-9 && x < f.tMax);
    // each line stops at the bottom (or at rest): the paper's graph runs from release to there
    const upTo = (fn) => (tt) => (tt > f.tB + 1e-9 ? NaN : fn(tt));
    // rings only: a label here would push the axis numbers off their gridlines
    const surf = f.t1 > 1e-9 ? [{ t: f.t1, y: f.h, color: P.mark }] : [];
    const end = { t: f.tB, color: P.mark };
    return [
      { canvas: 'g-s', title: 'Displacement–time, down +', unit: 'm', tMax: f.tMax, t, series: [{ label: 'down from the start', tag: T`s`, fn: upTo(f.pos), color: P.disp, dash: null, breaks: cut }], points: [...surf, { ...end, y: f.h + f.sIn }] },
      { canvas: 'g-v', title: 'Velocity–time, down +', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: upTo(f.vel), color: P.vel, dash: null, breaks: cut }], points: [...(f.t1 > 1e-9 ? [{ t: f.t1, y: f.v1, color: P.mark }] : []), { ...end, y: f.v2 }] },
      { canvas: 'g-a', title: 'Acceleration–time, down +', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: upTo(f.acc), color: P.acc, dash: null, breaks: cut }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#dfe9f1"/><rect x="18" y="22" width="84" height="38" fill="#5fb3d9"/>
      <rect x="18" y="22" width="84" height="3" fill="#9fd6ee"/><rect x="14" y="20" width="4" height="40" fill="#c9ced4"/><rect x="102" y="20" width="4" height="40" fill="#c9ced4"/>
      <path d="M60 4 V20" stroke="#ffffff" stroke-width="1.4" opacity="0.9"/><path d="M60 26 V46" stroke="#ffffff" stroke-width="1.4" opacity="0.6"/>
      <rect x="56" y="46" width="8" height="5" rx="1" fill="#2c2f36"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: s.stops ? 'At rest in the liquid' : 'At the bottom',
      title: s.stops ? `It stops ${sf(s.sStop)} m below the surface.` : `It reaches the bottom at ${sf(s.v2)} m s⁻¹.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
