// kits/dropramp.js — the same drop two ways, wired for the app: let fall
// straight down, or slid down a rough ramp from the same height. The engine is
// js/core/dropramp.js, the stage js/render/dropramp.js (a warehouse's loading
// bay: a ramp from the dock to one trolley, a conveyor's end over another).
// This file says which boxes to show, reads them, and lays out what the engine
// answered (rule 4).

import { solveDropRamp, dropRampWorking } from '../core/dropramp.js';
import * as stage from '../render/dropramp.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });

export const dropramp = {
  id: 'dropramp',
  verb: 'Let go',
  voice: {
    h: 'Dropped, or slid down a ramp',
    sub: 'A parcel is let go from rest a height above a trolley: dropped straight down, or slid down a rough ramp from the same height. Give the height, the ramp’s angle and its coefficient of friction (0 for smooth), and the mass for the forces in newtons.',
  },
  fields: [
    fld('h', 'drop', 'The height above the trolley (m)', '', false),
    fld('theta', 'ramp', 'The ramp’s angle to the horizontal (°)', ''),
    fld('thetaV', 'ramp', 'Or: its angle to the vertical (°)', '“60° to the vertical” is 30° to the horizontal.'),
    fld('mu', 'ramp', 'Coefficient of friction', 'Blank or 0: smooth.'),
    fld('m', 'ramp', 'The parcel’s mass (kg)', 'For the forces in newtons.'),
  ],
  cols: { drop: 'The drop', ramp: 'The ramp' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'ticks', 'acceleration'], extras: ['energy'], bounce: true },

  resolvePart: '',
  resolveEndWords: 'It reaches the trolley here: the engine follows it no further.',
  resolveObjects: (f) => [
    { name: 'Down the ramp', pos: f.sR, vel: f.velR, acc: f.accR, axis: 'along', from: 'the top of the ramp' },
    { name: 'Dropped', pos: f.fallD, vel: f.velD, acc: f.accD, axis: 'down', from: 'where it was let go' },
  ],
  resolveWords: { pos: 'going down the ramp', neg: 'going up the ramp', plus: 'Down the ramp', line: 'along the ramp' },
  read(v) { return { h: v.h, theta: v.theta, thetaV: v.thetaV, mu: v.mu, m: v.m, g: v.g }; },
  solve: solveDropRamp,
  working: (s) => dropRampWorking(s),
  render: stage.render,

  hud(f, t) {
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    const left = [
      { k: 'Down the ramp', v: num(f.sR(t), 2), unit: 'm', hue: 'disp' },
      { k: t > f.tR + 1e-9 ? 'Reached the trolley at' : 'Speed, down the ramp', v: num(t > f.tR + 1e-9 ? f.vR : f.velR(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      { k: t > f.tD + 1e-9 ? 'Dropped, landed at' : 'Speed, dropped', v: num(t > f.tD + 1e-9 ? f.vD : f.velD(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      { k: t <= f.tR ? 'Acceleration, down the ramp' : 'On the trolley, at rest: acceleration', v: t <= f.tR ? num(f.a, 3, { trim: true }) : '0', unit: 'm s⁻²', hue: 'acc' },
    ];
    return { left: phone ? left.slice(1, 3) : left, right: [{ k: 'Time', v: num(t, 2), unit: 's' }] };
  },

  /* Down a ramp and straight down: neither across, both solid (rule 2). Each line ends where it lands. */
  graphs(f, t, P) {
    const upTo = (fn, tl) => (tt) => (tt > tl + 1e-9 ? NaN : fn(tt));
    return [
      { canvas: 'g-s', title: 'Distance–time', unit: 'm', tMax: f.tMax, t, series: [
        { label: 'dropped', tag: 'dropped', fn: upTo(f.fallD, f.tD), color: P.second, dash: null },
        { label: 'down the ramp', tag: 'ramp', fn: upTo(f.sR, f.tR), color: P.disp, dash: null }] },
      { canvas: 'g-v', title: 'Speed–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [
        { label: 'dropped', tag: 'dropped', fn: upTo(f.velD, f.tD), color: P.second, dash: null },
        { label: 'down the ramp', tag: 'ramp', fn: upTo(f.velR, f.tR), color: P.vel, dash: null }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [
        { label: 'dropped', tag: 'dropped', fn: upTo(f.accD, f.tD), color: P.second, dash: null },
        { label: 'down the ramp', tag: 'ramp', fn: upTo(f.accR, f.tR), color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#c9ced4"/><rect x="0" y="52" width="120" height="8" fill="#93948f"/>
      <rect x="0" y="18" width="18" height="34" fill="#a7a29a"/><path d="M18 18 L58 44" stroke="#9ea4ab" stroke-width="4"/>
      <rect x="54" y="44" width="22" height="3" fill="#2f6db0"/><rect x="84" y="20" width="36" height="5" fill="#33363c"/>
      <rect x="88" y="44" width="22" height="3" fill="#2f6db0"/><rect x="92" y="32" width="10" height="8" fill="#b98a55"/><rect x="30" y="20" width="10" height="8" fill="#b98a55" transform="rotate(33 35 24)"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'The same drop, two ways',
      title: `${T`${num(s.vR, 3, { trim: true })} [m s^-1]`} down the ramp, ${T`${num(s.vD, 3, { trim: true })} [m s^-1]`} dropped.`,
      body: s.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
