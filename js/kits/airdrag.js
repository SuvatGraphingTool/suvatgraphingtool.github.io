// kits/airdrag.js — one fall, two models: with no air resistance and with a
// constant resistance, wired for the app. The engine is js/core/airdrag.js,
// the stage js/render/airdrag.js (a city street, the ball let go from the roof
// of a block, a ghost of it falling with no air resistance beside it). This
// file says which boxes to show, reads them, and lays out what the engine
// answered (rule 4).

import { solveAirDrag, airDragWorking } from '../core/airdrag.js';
import * as stage from '../render/airdrag.js';
import { T, num } from '../notation.js';

const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });

export const airdrag = {
  id: 'airdrag',
  verb: 'Let go',
  voice: {
    h: 'With and without air resistance',
    sub: 'A ball is let go and falls to the ground. Beside it, the same fall with no air resistance. Give the height, and the resistance with the mass — or its acceleration, or the speed it lands at.',
  },
  fields: [
    fld('h', 'fall', 'The height it falls (m)', '', false),
    fld('u', 'fall', 'Speed straight down when let go (m s⁻¹)', 'Blank or 0: from rest.'),
    fld('m', 'air', 'Its mass (kg)', 'With the resistance in newtons.'),
    fld('R', 'air', 'The air resistance (N)', 'Constant, against the motion.'),
    fld('a', 'air', 'Or: its acceleration with it (m s⁻²)', ''),
    fld('v', 'air', 'Or: the speed it lands at with it (m s⁻¹)', ''),
  ],
  cols: { fall: 'The fall', air: 'The air resistance' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'ticks', 'acceleration'], extras: ['energy'], bounce: true },

  resolveAxis: 'down',
  resolveObjects: (f) => [
    { name: 'With air resistance', pos: (t) => f.fallDrag(t), vel: f.velDrag, acc: f.accDrag, axis: 'down', from: 'where it was let go' },
    { name: 'With none', pos: (t) => f.fallFree(t), vel: f.velFree, acc: f.accFree, axis: 'down', from: 'where it was let go' },
  ],
  read(v) { return { h: v.h, u: v.u, m: v.m, R: v.R, a: v.a, v: v.v, g: v.g }; },
  solve: solveAirDrag,
  working: (s) => airDragWorking(s),
  render: stage.render,

  hud(f, t) {
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    const left = [
      { k: 'Fallen, with air resistance', v: num(f.fallDrag(t), 2), unit: 'm', hue: 'disp' },
      // on the ground, the speed it landed at, said so
      { k: t > f.t1 + 1e-9 ? 'Landed, with air resistance, at' : 'Speed, with air resistance', v: num(t > f.t1 + 1e-9 ? f.v1 : f.velDrag(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      { k: t > f.t0 + 1e-9 ? 'Landed, with none, at' : 'Speed, with none', v: num(t > f.t0 + 1e-9 ? f.v0 : f.velFree(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      { k: 'Acceleration, with air resistance', v: t <= f.t1 ? num(f.a, 3, { trim: true }) : '—', unit: t <= f.t1 ? 'm s⁻²' : '', hue: 'acc' },
    ];
    return { left: phone ? left.slice(1, 3) : left, right: [{ k: 'Time', v: num(t, 2), unit: 's' }] };
  },

  /* Straight down: solid (rule 2). The model with none in the second object's stone. */
  graphs(f, t, P) {
    // each line ends where its ball lands: nothing after it is claimed
    const upTo = (fn, tl) => (tt) => (tt > tl + 1e-9 ? NaN : fn(tt));
    return [
      { canvas: 'g-s', title: 'Distance fallen–time', unit: 'm', tMax: f.tMax, t, series: [
        { label: 'with none', tag: 'none', fn: upTo(f.fallFree, f.t0), color: P.second, dash: null },
        { label: 'with air resistance', tag: 'with', fn: upTo(f.fallDrag, f.t1), color: P.disp, dash: null }] },
      { canvas: 'g-v', title: 'Speed–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [
        { label: 'with none', tag: 'none', fn: upTo(f.velFree, f.t0), color: P.second, dash: null },
        { label: 'with air resistance', tag: 'with', fn: upTo(f.velDrag, f.t1), color: P.vel, dash: null }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [
        { label: 'with none', tag: 'none', fn: upTo(f.accFree, f.t0), color: P.second, dash: null },
        { label: 'with air resistance', tag: 'with', fn: upTo(f.accDrag, f.t1), color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#cfe3f0"/><rect x="0" y="52" width="120" height="8" fill="#8a8a90"/>
      <rect x="18" y="8" width="34" height="44" fill="#8d99a8"/><rect x="16" y="6" width="38" height="3" fill="#a6b1bd"/>
      <path d="M62 8 V40" stroke="var(--disp)" stroke-width="2"/><circle cx="62" cy="40" r="4" fill="#f0a83a"/>
      <path d="M80 8 V48" stroke="var(--second)" stroke-width="2"/><circle cx="80" cy="48" r="4" fill="none" stroke="var(--second)" stroke-width="1.6"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Two models of one fall',
      title: `${T`${num(s.v1, 3, { trim: true })} [m s^-1]`} with air resistance, ${T`${num(s.v0, 3, { trim: true })} [m s^-1]`} without.`,
      body: s.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
