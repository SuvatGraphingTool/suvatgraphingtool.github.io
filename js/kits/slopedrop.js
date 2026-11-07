// kits/slopedrop.js — one particle sent down a smooth slope while another is
// let fall from a point level with its start, wired for the app. The engine is
// js/core/slopedrop.js, the stage js/render/slopedrop.js (a physics lab: an
// air track on a trestle, a clamp stand and an electromagnet). This file says
// which boxes to show, reads them, and lays out what the engine answered (rule 4).

import { solveSlopeDrop, slopeDropWorking } from '../core/slopedrop.js';
import * as stage from '../render/slopedrop.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });

export const slopedrop = {
  id: 'slopedrop',
  verb: 'Let go',
  voice: {
    h: 'Down the slope, and straight down',
    sub: 'P is sent down a smooth slope from X; at the same instant Q is let go from Y, level with X out over the slope, and falls freely. They meet on the slope directly below Y. Give P’s speed and its acceleration down the slope (or the slope’s angle).',
  },
  fields: [
    fld('u', 'P', 'P’s speed down the slope at X (m s⁻¹)', '', false),
    fld('a', 'P', 'P’s acceleration down the slope (m s⁻²)', 'Or the slope’s angle, below: on a smooth slope one gives the other.'),
    fld('theta', 'P', 'Or: the slope’s angle to the horizontal (°)', ''),
    fld('w', 'Q', 'Q’s speed straight down at Y (m s⁻¹)', 'Blank or 0: let go from rest.'),
  ],
  cols: { P: 'P, down the slope', Q: 'Q, from Y' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'ticks', 'acceleration'], extras: ['energy'], bounce: true },

  resolveEnds: true,
  resolveEndWords: 'They meet here: the engine follows them no further.',
  resolvePart: '',
  resolveWords: { pos: 'going down the slope', neg: 'going up the slope', plus: 'Down the slope', line: 'along the slope' },
  resolveObjects: (f) => [
    { name: 'P', pos: (t) => f.posP(t).s, vel: f.velP, acc: () => f.a, axis: 'along', from: 'X, down the slope' },
    { name: 'Q', pos: (t) => f.posQ(t).s, vel: f.velQ, acc: () => f.g, axis: 'down', from: 'Y' },
  ],
  read(v) {
    return { u: v.u, a: v.a, theta: v.theta, w: v.w, g: v.g };
  },
  solve: solveSlopeDrop,
  working: (s) => slopeDropWorking(s),
  render: stage.render,

  hud(f, t) {
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    const left = [
      { k: 'P down the slope', v: num(f.posP(t).s, 2), unit: 'm', hue: 'disp' },
      { k: 'Q fallen', v: num(f.posQ(t).s, 2), unit: 'm', hue: 'disp' },
      { k: 'P’s speed', v: num(f.velP(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      { k: 'Q’s speed', v: num(f.velQ(t), 2), unit: 'm s⁻¹', hue: 'vel' },
    ];
    return { left: phone ? left.slice(2) : left, right: [{ k: 'Time', v: num(t, 2), unit: 's' }] };
  },

  /* P along the slope and Q straight down: neither is across, so both solid
     (rule 2); P in the quantity's hue, Q in the second object's stone. */
  graphs(f, t, P) {
    return [
      { canvas: 'g-s', title: 'Distance–time', unit: 'm', tMax: f.tMax, t, series: [
        { label: 'Q fallen', tag: 'Q', fn: (tt) => f.posQ(tt).s, color: P.second, dash: null },
        { label: 'P down the slope', tag: 'P', fn: (tt) => f.posP(tt).s, color: P.disp, dash: null }] },
      { canvas: 'g-v', title: 'Speed–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [
        { label: 'Q', tag: 'Q', fn: f.velQ, color: P.second, dash: null },
        { label: 'P', tag: 'P', fn: f.velP, color: P.vel, dash: null }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [
        { label: 'Q', tag: 'Q', fn: () => f.g, color: P.second, dash: null },
        { label: 'P', tag: 'P', fn: () => f.a, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#d9d8cb"/><rect x="0" y="52" width="120" height="8" fill="#b9b5a8"/>
      <path d="M10 14 L104 52" stroke="#9aa0a8" stroke-width="4"/>
      <path d="M14 13 L56 30" stroke="var(--disp)" stroke-width="2.2"/>
      <path d="M62 16 V34" stroke="var(--second)" stroke-width="2.2"/>
      <rect x="57" y="6" width="10" height="8" rx="2" fill="#d08040"/><circle cx="62" cy="18" r="3" fill="#c9ced6"/>
      <path d="M14 14 H62" stroke="#888" stroke-width="1" stroke-dasharray="2 3"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'They meet below Y',
      title: `After ${num(s.T, 4, { trim: true })} s, on the slope at ${num(s.theta, 3, { trim: true })}°.`,
      body: s.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
