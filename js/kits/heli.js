// kits/heli.js — a helicopter at a constant height over the sea, wired for
// the app. The engine is js/core/heli.js (on plane.js's motion) and the stage
// js/render/heli.js (from above: the lighthouse, the rock, the helicopter).
// See design/components.md.

import { solveHeli, heliWorking } from '../core/heli.js';
import * as stage from '../render/heli.js';
import { M, T, num } from '../notation.js';

const three = (b) => String(Math.round(((b % 360) + 360) % 360) % 360).padStart(3, '0');
const part = (key, col, c, unit, hint, what) => ({ key, col, label: `${what}, ${c === 'x' ? `${M`vec i`} part` : `${M`vec j`} part`} (${unit})`, aria: `${key}: its ${c === 'x' ? 'i' : 'j'} part (${unit})`, placeholder: '—', hint });

export const heli = {
  id: 'heli',
  verb: 'Fly',
  voice: {
    h: 'A helicopter over the sea',
    sub: `A helicopter at a constant height, with a constant acceleration: ${M`vec i`} is east and ${M`vec j`} north. Give where it is at the start (over the lighthouse), its velocity then — blank if it is hovering — and its acceleration; then ask: its speed and bearing at a time, when it is a distance from where it set off, or whether it passes directly over a rock.`,
  },
  fields: [
    part('r0.x', 'start', 'x', 'm', 'Over the lighthouse. Blank is 0: the origin.', 'Position'), part('r0.y', 'start', 'y', 'm', '', 'Position'),
    part('u.x', 'start', 'x', 'm s⁻¹', 'Its velocity then. Blank: hovering.', 'Velocity'), part('u.y', 'start', 'y', 'm s⁻¹', '', 'Velocity'),
    part('a.x', 'acc', 'x', 'm s⁻²', 'Its acceleration, constant.', 'Acceleration'), part('a.y', 'acc', 'y', 'm s⁻²', '', 'Acceleration'),
    { key: 'T', col: 'ask', label: 'At time (s)', placeholder: '—', hint: 'Its speed and bearing then.' },
    { key: 'D', col: 'ask', label: 'When it is this far from the start (m)', placeholder: '—', hint: '' },
    part('P.x', 'ask', 'x', 'm', 'A rock: does it pass directly over it?', 'The rock'), part('P.y', 'ask', 'y', 'm', '', 'The rock'),
  ],
  cols: { start: 'At the start', acc: 'Its acceleration', ask: 'Asked' },
  rows: [],
  hides: { shows: ['apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'ij',
  resolveBearing: true,   // i east, j north
  read(v) {
    const pair = (k) => ({ x: v[`${k}.x`], y: v[`${k}.y`] });
    return { r0: pair('r0'), u: pair('u'), a: pair('a'), T: v.T, D: v.D, P: pair('P') };
  },
  solve: solveHeli,
  working: (solved) => heliWorking(solved),
  render: stage.render,

  hud(f, t) {
    const p = f.pos(t), v = f.vel(t), s = Math.hypot(v.x, v.y);
    // four, so a short stage beside a long parts strip still shows them all
    // (three on a phone, where the sea needs the room for the lighthouse; the
    // stage's caption says the bearing at a moment the paper asks about); the
    // distance from the start is on the Resolve card
    const phone = typeof matchMedia === 'function' && matchMedia('(max-width: 560px)').matches;
    const left = [
        { k: 'East of O', v: num(p.x, 1), unit: 'm', hue: 'disp' },
        { k: 'North of O', v: num(p.y, 1), unit: 'm', hue: 'disp' },
        { k: 'Speed', v: num(s, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Bearing', v: s > 1e-9 ? three((Math.atan2(v.x, v.y) * 180) / Math.PI) : '—', unit: '°', hue: 'vel' },
    ];
    return { left: phone ? left.slice(0, 3) : left, right: [{ k: 'Time', v: num(t, 1), unit: 's' }] };
  },

  /* East dashed (horizontal), north solid (vertical) — rule 2. */
  graphs(f, t, P) {
    const two = (fx, fy, c) => [
      { label: 'east', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'north', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Position–time', unit: 'm', tMax: f.tMax, t, series: two((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: two((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: two(() => f.a.x, () => f.a.y, P.acc) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#6f98a6"/>
      <path d="M22 44 Q60 50 96 16" fill="none" stroke="var(--disp)" stroke-width="1.6" stroke-dasharray="3 3"/>
      <circle cx="22" cy="44" r="6" fill="#efe9e2"/><circle cx="22" cy="44" r="2.4" fill="#3b4250"/>
      <ellipse cx="96" cy="16" rx="7" ry="3" fill="#d6402f"/><circle cx="96" cy="16" r="11" fill="#20242b" opacity="0.18"/>
      <path d="M87 16 h-10" stroke="#f6f7f8" stroke-width="2"/>
      <circle cx="70" cy="40" r="4" fill="#4f4842"/>
    </svg>`;
  },

  ending(s) {
    const P = s.answers.P;
    return {
      eyebrow: P ? (P.over ? 'Directly over the rock' : 'Never over the rock') : 'Over the sea',
      title: P?.over ? `Over the rock after ${num(P.t, 3, { trim: true })} s.` : s.answers.T ? `${num(s.answers.T.speed, 3, { trim: true })} m s⁻¹ on ${three(s.answers.T.bearing)}°.` : s.answers.D ? `${num(s.answers.D.D, 3, { trim: true })} m out after ${num(s.answers.D.t, 3, { trim: true })} s.` : 'Its path, from over the lighthouse.',
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
