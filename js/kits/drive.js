// kits/drive.js — a car (or a lorry) with a constant driving force against a
// constant resistance, driven up a hill and down it, wired for the app. The
// engine is js/core/drive.js, the stage js/render/drive.js (a road over a
// hillside, the two of them on it). See design/components.md.

import { solveDrive, driveWorking } from '../core/drive.js';
import * as stage from '../render/drive.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });
const WAY = { up: 'up the hill', down: 'down the hill' };
const FROM = { up: 'the lower marker post', down: 'the upper marker post' };

export const drive = {
  id: 'drive',
  verb: 'Drive',
  voice: {
    h: 'Up the hill and down it',
    sub: 'A car with a steady driving force, against a steady resistance, on a road up a hill. Driven up it, the weight’s component down the slope works against it; driven down it, the same component helps. Give the forces and the road for the speed after a distance — or the speed at the end, and leave a force blank to find it.',
  },
  fields: [
    fld('m', 'car', 'Its mass (kg)', '', false),
    fld('D', 'car', 'The driving force (N)', 'Blank, with the speed at the end: found.'),
    fld('R', 'car', 'The resistance to motion (N)', 'Blank: none — or, with the speed at the end, found.'),
    fld('u', 'car', 'Speed at the start (m s⁻¹)', 'Blank or 0: from rest.'),
    fld('v', 'car', 'Speed at the end (m s⁻¹)', 'Given, one way only: a force left blank is found.'),
    fld('s', 'road', 'The distance driven (m)', '', false),
    fld('sinA', 'road', 'The sine of the road’s angle', 'As the papers give it: 0.05.'),
    fld('alpha', 'road', 'Or the road’s angle (°)', ''),
    fld('h', 'road', 'Or how far it rises over the distance (m)', '“The top is 25 m above the bottom”.'),
  ],
  cols: { car: 'The car', road: 'The road' },
  rows: [
    { title: 'Which way', fields: [
      { key: 'way', type: 'choice', label: 'Driven', default: 'both', hint: 'Each from its own start, over the same distance.',
        options: [{ v: 'both', label: 'Up the hill, and down it' }, { v: 'up', label: 'Up the hill' }, { v: 'down', label: 'Down the hill' }] },
      { key: 'look', type: 'choice', label: 'It is', default: 'car', hint: '',
        options: [{ v: 'car', label: 'A car' }, { v: 'lorry', label: 'A lorry' }] },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'along',
  // along the road up a slope: neither across nor up, so solid (rule 2)
  resolvePart: '',
  // held at the end at rest: no acceleration claimed, so Resolve says 'At rest', never 'momentarily'
  resolveObjects: (f) => f.ways.map((n) => ({ name: f.ways.length > 1 ? `Driven ${WAY[n]}` : '', pos: f[n].pos, vel: f[n].vel,
    acc: (t) => (t >= f[n].t - 1e-9 && Math.abs(f[n].v) < 1e-9 ? 0 : f[n].acc(t)), from: FROM[n] })),
  resolveWords: { pos: 'forwards', neg: 'backwards', plus: 'The way it drives', line: 'along the road' },
  resolveEnds: true,
  // a sine as the papers write it, 1/20, is a fraction: read it as one
  read(v) {
    const frac = (x) => { const m = typeof x === 'string' && x.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/); return m ? Number(m[1]) / Number(m[2]) : x; };
    return { way: v.way ?? 'both', look: v.look ?? 'car', m: v.m, D: v.D, R: v.R, u: v.u, v: v.v, s: v.s, sinA: frac(v.sinA), alpha: v.alpha, h: v.h, g: v.g };
  },
  solve: (k) => { const r = solveDrive(k); if (r.ok) r.f.look = k.look === 'lorry' ? 'lorry' : 'car'; return r; },
  working: (solved) => driveWorking(solved),
  render: stage.render,

  hud(f, t) {
    const two = f.ways.length > 1;
    // on a phone the two cars' readouts would cover most of the stage: their velocities alone
    const narrow = typeof window !== 'undefined' && window.innerWidth < 520;
    const rows = f.ways.flatMap((n) => {
      // held where its distance ends: the readouts are its values there, and say so
      const w = f[n], end = t >= w.t - 1e-9, who = two ? `${n === 'up' ? 'Up' : 'Down'}${end ? (narrow ? ' (end)' : ', at the end') : ''}: ` : end ? 'At the end: ' : '';
      if (two && narrow) return [{ k: `${who}velocity`, v: num(w.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' }];
      return [
        { k: two ? `${who}along the road` : `${who}${who ? 'along' : 'Along'} the road`, v: num(w.pos(t), 2), unit: 'm', hue: 'disp' },
        { k: two ? `${who}velocity` : `${who}${who ? 'velocity' : 'Velocity'}`, v: num(w.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        // held at the end the model gives no acceleration: none shown, as the water's readouts do
        ...(two ? [] : [{ k: 'Acceleration', v: end && t > w.t + 1e-9 ? '—' : num(w.a, 2), unit: end && t > w.t + 1e-9 ? '' : 'm s⁻²', hue: 'acc' }]),
      ];
    });
    return { left: rows, right: [{ k: 'Time', v: num(t, 2), unit: 's' }] };
  },

  /* Each from its own start, along the road the way it drives. Along a slope, so solid (rule 2).
     Up the hill in the quantity's own hue, down it in the second object's; each line stops where its distance ends. */
  graphs(f, t, P) {
    const two = f.ways.length > 1;
    const lines = (q, color, label, sym) => f.ways.map((n) => {
      const w = f[n];
      return { label: two ? `${label}, ${WAY[n]}` : label, tag: two ? n : sym,
        fn: (tt) => (tt > w.t + 1e-9 ? NaN : w[q](tt)), color: n === 'down' && two ? P.second : color, dash: null };
    }).reverse();
    const ends = (q) => f.ways.map((n) => ({ t: f[n].t, y: f[n][q](f[n].t), color: P.mark }));
    return [
      { canvas: 'g-s', title: 'Distance along the road–time', unit: 'm', tMax: f.tMax, t, series: lines('pos', P.disp, 'along the road', T`s`), points: ends('pos') },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: lines('vel', P.vel, 'velocity', T`v`), points: ends('vel') },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: lines('acc', P.acc, 'acceleration', T`a`) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#cfe3f0"/><path d="M0 46 L20 46 L104 22 L120 22 L120 60 L0 60Z" fill="#7fa65a"/>
      <path d="M0 46 L20 46 L104 22 L120 22" stroke="#4d5157" stroke-width="5" fill="none"/>
      <path d="M20 46 L104 22" stroke="#ffffff" stroke-width="0.8" stroke-dasharray="4 4" fill="none"/>
      <g transform="translate(40 40) rotate(-16)"><rect x="-10" y="-8" width="20" height="6" rx="2" fill="#7f90a6"/><circle cx="-6" cy="-1" r="2" fill="#222"/><circle cx="6" cy="-1" r="2" fill="#222"/></g>
      <g transform="translate(86 27) rotate(-16)"><rect x="-10" y="-8" width="20" height="6" rx="2" fill="#d4a017"/><circle cx="-6" cy="-1" r="2" fill="#222"/><circle cx="6" cy="-1" r="2" fill="#222"/></g>
    </svg>`;
  },

  ending(s) {
    const f4 = (x) => num(Number(x.toPrecision(4)), 6, { trim: true });
    const one = (n) => (s.find === 'D' ? `The driving force is ${f4(s.D)} N.` : s.find === 'R' ? `The resistance is ${f4(s.R)} N.`
      : `${n === 'up' ? 'Up' : 'Down'} the hill: ${num(Number((n === 'up' ? s.vUp : s.vDown).toPrecision(3)), 6, { trim: true })} m s⁻¹.`);
    const ways = s.f.ways;
    return {
      eyebrow: s.find ? `Driven ${WAY[ways[0]]}` : ways.length > 1 ? 'Both ways' : `Driven ${WAY[ways[0]]}`,
      title: s.find ? one(ways[0]) : ways.map(one).join(' '),
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
