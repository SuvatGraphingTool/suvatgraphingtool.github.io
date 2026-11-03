// kits/bicycle.js — two travellers, one bicycle, wired for the app: each
// walks part of the way and rides the bicycle the rest, setting off and
// arriving together. The engine is js/core/bicycle.js, the stage
// js/render/bicycle.js (a country road side on). This file says which boxes to
// show, reads them, and lays out what the engine answered (rule 4).

import { solveBicycle, bicycleWorking } from '../core/bicycle.js';
import * as stage from '../render/bicycle.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = false) => ({ key, col, label, placeholder: '—', hint, optional });

export const bicycle = {
  id: 'bicycle',
  verb: 'Set off',
  voice: {
    h: 'Two travellers, one bicycle',
    sub: 'A rides the bicycle first and leaves it at the roadside, then walks the rest; B walks until it finds the bicycle, then rides it. They set off together and arrive together. Give the four speeds and how long (or how far) A rides.',
  },
  fields: [
    fld('A.ride', 'A', 'A’s cycling speed (km h⁻¹)', ''),
    fld('A.rideT', 'A', 'A cycles for (h)', 'Or how far, below.', true),
    fld('A.rideD', 'A', 'Or: A cycles this far (km)', '', true),
    fld('A.walk', 'A', 'Then A walks at (km h⁻¹)', ''),
    fld('B.walk', 'B', 'B walks at (km h⁻¹)', 'From the start, until B finds the bicycle.'),
    fld('B.ride', 'B', 'Then B cycles at (km h⁻¹)', ''),
  ],
  cols: { A: 'A: rides, then walks', B: 'B: walks, then rides' },
  rows: [],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'ticks', 'acceleration'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  resolveEnds: true,
  resolveEndWords: 'They arrive together here: the journey is over.',
  resolveUnits: (f) => [f.U.len, f.U.speedText, f.U.len === 'km' ? 'km h⁻²' : 'm s⁻²', f.U.time],
  resolveObjects: (f) => [
    { name: 'A', pos: f.posA, vel: f.velA, acc: () => 0, from: 'the start' },
    { name: 'B', pos: f.posB, vel: f.velB, acc: () => 0, from: 'the start' },
  ],
  read(v) {
    return { units: 'km', A: { ride: v['A.ride'], rideT: v['A.rideT'], rideD: v['A.rideD'], walk: v['A.walk'] }, B: { walk: v['B.walk'], ride: v['B.ride'] } };
  },
  solve: solveBicycle,
  working: (s) => bicycleWorking(s),
  render: stage.render,

  hud(f, t) {
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    const left = [
      { k: 'A from the start', v: num(f.posA(t), 2), unit: f.U.len, hue: 'disp' },
      { k: 'B from the start', v: num(f.posB(t), 2), unit: f.U.len, hue: 'disp' },
      { k: t < f.tA1 ? 'A, cycling' : 'A, walking', v: num(f.velA(t), 2), unit: f.U.speedText, hue: 'vel' },
      { k: t < f.tB1 ? 'B, walking' : 'B, cycling', v: num(f.velB(t), 2), unit: f.U.speedText, hue: 'vel' },
    ];
    return { left: phone ? left.slice(0, 2) : left, right: [{ k: 'Time', v: num(t, 2), unit: f.U.time }] };
  },

  /* Along the road: dashed (rule 2). A in the quantity's hue, B in the second
     object's stone. The distance–time graph is the paper's own diagram. */
  graphs(f, t, P) {
    const U = f.U;
    return [
      { canvas: 'g-s', title: 'Distance–time', unit: U.len, tMax: f.tMax, t, series: [
        { label: 'B', tag: 'B', fn: f.posB, color: P.second, dash: [6, 4] },
        { label: 'A', tag: 'A', fn: f.posA, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Speed–time', unit: U.speedText, tMax: f.tMax, t, series: [
        { label: 'B', tag: 'B', fn: f.velB, color: P.second, dash: [6, 4] },
        { label: 'A', tag: 'A', fn: f.velA, color: P.vel, dash: [6, 4] }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: U.len === 'km' ? 'km h⁻²' : 'm s⁻²', tMax: f.tMax, t, series: [
        { label: 'each stage steady', tag: 'A, B', fn: () => 0, color: P.acc, dash: [6, 4] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#cfe3f0"/><path d="M0 34 Q30 24 60 32 T120 30 V40 H0 Z" fill="#9db87a"/>
      <rect x="0" y="40" width="120" height="20" fill="#5a5a60"/><path d="M0 50 H120" stroke="#e8e2d6" stroke-dasharray="6 5" stroke-width="1.4"/>
      <circle cx="46" cy="40" r="4" fill="none" stroke="#222" stroke-width="1.4"/><circle cx="56" cy="40" r="4" fill="none" stroke="#222" stroke-width="1.4"/>
      <path d="M46 40 L50 34 L56 40 M50 34 H55" stroke="#7d3e48" stroke-width="1.6" fill="none"/>
      <path d="M8 46 V40 M100 56 V50" stroke="var(--disp)" stroke-width="3"/><path d="M104 22 h8 v10 h-8 z" fill="#e3d6bf"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Arriving together',
      title: `${num(s.T, 3, { trim: true })} hours, and ${num(s.J, 3, { trim: true })} km.`,
      body: s.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
