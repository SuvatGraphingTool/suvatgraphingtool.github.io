// kits/runout.js — down a slope (from rest or moving, smooth or rough) and on
// along rough level ground to rest, wired for the app. The engine is
// js/core/runout.js, the stage js/render/runout.js (a snowy hill and its
// flat, or a loading ramp and a warehouse floor). See design/components.md.

import { solveRunout, runoutWorking } from '../core/runout.js';
import * as stage from '../render/runout.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });
// 2 dp, but an acceleration under 0.1 to 3 s.f., never a false 0
const p2 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));

export const runout = {
  id: 'runout',
  verb: 'Let go',
  voice: {
    h: 'Down the slope and across the flat',
    sub: 'Something slides down a slope — from rest or already moving, smooth or rough — and on along rough level ground until friction stops it. Or, down a rough enough slope, it slows and stops before the bottom. Give the slope, how it starts, and the friction on the slope and on the ground.',
  },
  fields: [
    fld('alpha', 'slope', 'The slope’s angle (°)', '', false),
    fld('L', 'slope', 'Its length (m)', 'Blank, and a slowing slide says how long it can be.'),
    fld('u', 'slope', 'Speed at the top (m s⁻¹)', 'Blank or 0: from rest.'),
    fld('mu1', 'slope', 'Its coefficient of friction', 'All three blank: a smooth slope.'),
    fld('F1', 'slope', 'Or its friction force (N)', 'With the mass.'),
    fld('vB', 'slope', 'Or a speed further down (m s⁻¹)', 'With how far down, below.'),
    fld('dB', 'slope', 'that far down from the top (m)', ''),
    fld('vAsk', 'slope', 'When is its speed (m s⁻¹)?', 'A time on the slope.'),
    fld('m', 'ground', 'Its mass (kg)', 'For a friction force.'),
    fld('mu2', 'ground', 'The ground’s coefficient of friction', ''),
    fld('F2', 'ground', 'Or the ground’s friction force (N)', 'With the mass.'),
  ],
  cols: { slope: 'The slope', ground: 'The ground' },
  rows: [
    { title: 'Where it is', fields: [
      { key: 'look', type: 'choice', label: 'It is', default: 'snow', hint: 'Each is drawn as it is.',
        options: [{ v: 'snow', label: 'A sledge down a snowy hill' }, { v: 'ramp', label: 'A suitcase down a ramp' }] },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  // down the slope it is neither across nor up (solid); along the level, across (dashed)
  resolvePart: (f, t) => (f.phase(t) === 'slope' ? '' : 'x'),
  resolveFrom: 'the top of the slope',
  resolveWords: { pos: 'going the way it slides', neg: 'going back', plus: 'The way it slides', line: 'along its path' },
  read(v) { return { look: v.look ?? 'snow', alpha: v.alpha, L: v.L, u: v.u, mu1: v.mu1, F1: v.F1, vB: v.vB, dB: v.dB, vAsk: v.vAsk, m: v.m, mu2: v.mu2, F2: v.F2, g: v.g }; },
  solve: solveRunout,
  working: (solved) => runoutWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Along its path', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Speed', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: p2(f.acc(t)), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Along its path: down the slope, then the level. The acceleration changes at the foot, and again at rest. */
  graphs(f, t, P) {
    const cut = [f.tB, f.tRest].filter((x) => x > 0 && x < f.tMax);
    const marks = f.stopsOnSlope ? [] : [{ t: f.tB, y: f.sSlope, color: P.mark, label: 'the bottom' }];
    return [
      { canvas: 'g-s', title: 'Distance along its path–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'along its path', tag: T`s`, fn: f.pos, color: P.disp, dash: null }], points: marks },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: null }], points: f.stopsOnSlope ? [] : [{ t: f.tB, y: f.vBot, color: P.mark }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: f.acc, color: P.acc, dash: null, breaks: cut }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#c9dbe8"/><path d="M0 14 L10 14 L56 44 L120 44 L120 60 L0 60Z" fill="#f4f7fa"/>
      <path d="M0 14 L10 14 L56 44 L120 44" stroke="#9fb0c0" stroke-width="1.4" fill="none"/>
      <g transform="translate(30 27) rotate(33)"><rect x="-9" y="-6" width="16" height="3" fill="#a86f38"/><path d="M-10 0 H7 Q10 0 9 -4" stroke="#3b2a1a" stroke-width="1.4" fill="none"/></g>
      <path d="M58 52 H100" stroke="#2a9d8f" stroke-width="1.4" stroke-dasharray="4 3"/><circle cx="100" cy="44" r="4" fill="none" stroke="#e76f51" stroke-width="1.4"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: s.stopsOnSlope ? 'It stops on the slope' : 'To rest on the level',
      title: s.stopsOnSlope ? `It stops ${num(Number(s.dStop.toPrecision(3)), 6, { trim: true })} m down the slope.` : `It slides ${num(Number(s.s2.toPrecision(3)), 6, { trim: true })} m along the ground.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
