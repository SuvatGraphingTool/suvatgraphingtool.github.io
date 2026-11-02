// kits/sink.js — a ball projected straight up from A that lands on soft ground
// and sinks into it, wired for the app. The engine is js/core/sink.js (SUVAT
// to the ground, then F = ma and SUVAT to rest in it), the stage
// js/render/sink.js (a field cut away to its soil, with a magnifier that
// replays the sink slowly). See design/components.md.

import { solveSink, sinkWorking } from '../core/sink.js';
import * as stage from '../render/sink.js';
import { T, num } from '../notation.js';

// three significant figures, as the papers give a force or a depth
const sf3 = (x) => Number(x.toPrecision(3));
const fld = (key, col, label, hint, optional = true) => ({ key, col, label, placeholder: '—', hint, optional });

export const sink = {
  id: 'sink',
  verb: 'Throw',
  voice: {
    h: 'Into soft ground',
    sub: 'A ball is projected straight up from a point A above the ground and moves freely under gravity until it lands. The ground is soft: it sinks in against a constant resistance until it stops. Give A’s height and one of the launch speed, the greatest height or the landing speed; then the mass, and the resistance or how far it sinks.',
  },
  fields: [
    fld('h', 'air', 'A’s height above the ground (m)', '', false),
    fld('u', 'air', 'Speed up at A (m s⁻¹)', 'Or one of the next two.'),
    fld('H', 'air', 'Or its greatest height above A (m)', ''),
    fld('vL', 'air', 'Or its speed reaching the ground (m s⁻¹)', ''),
    fld('y', 'air', 'A height above A, to find when (m)', 'Below A: negative.'),
    fld('m', 'ground', 'Its mass (kg)', 'Needed with the resistance.'),
    fld('R', 'ground', 'The ground’s resistance (N)', 'Or how far it sinks.'),
    fld('depth', 'ground', 'Or how far it sinks (m)', '2.5 cm is 0.025 m.'),
  ],
  cols: { air: 'In the air', ground: 'In the ground' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  resolveAxis: 'vertical',
  resolveFrom: 'A',
  read(v) { return { h: v.h, u: v.u, H: v.H, vL: v.vL, y: v.y, m: v.m, R: v.R, depth: v.depth, g: v.g }; },
  solve: solveSink,
  working: (solved) => sinkWorking(solved),
  render: stage.render,

  hud(f, t) {
    const y = f.pos(t) + f.h;
    return {
      left: [
        y >= -1e-9 ? { k: 'Above the ground', v: num(Math.max(0, y), 2), unit: 'm', hue: 'disp' }
          : { k: 'Into the ground', v: num(-y, 3, { trim: true }), unit: 'm', hue: 'disp' },
        { k: 'Velocity, up +', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration, up +', v: num(f.acc(t), 1, { trim: true }), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* One vertical line, up from A. In the ground the acceleration is thousands of
     m s⁻² for a few thousandths of a second: off any scale the flight can use,
     so the a–t graph leaves it out and says so. */
  graphs(f, t, P) {
    const cut = [f.tLand, f.tRest];
    const land = [{ t: f.tLand, y: -f.h, color: P.mark, label: 'lands' }];
    const accAir = (tt) => (tt >= f.tLand && tt < f.tRest ? NaN : f.acc(tt));
    const note = `${T`"in the ground" +${num(-f.a, 1, { trim: true })} [m s^-2]`} for ${T`${num(f.tSink, 4, { trim: true })} [s]`}, off the scale`;
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'up from A', tag: T`s`, fn: f.pos, color: P.disp, dash: null, breaks: cut }], points: land },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'velocity', tag: T`v`, fn: f.vel, color: P.vel, dash: null, breaks: cut }], points: [{ t: f.tLand, y: -f.vL, color: P.mark }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'acceleration', tag: T`a`, fn: accAir, color: P.acc, dash: null, breaks: cut }], note, notePri: 6 },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="38" fill="#bcd7ea"/><rect x="0" y="36" width="120" height="4" fill="#6f9a4f"/>
      <rect x="0" y="40" width="120" height="20" fill="#7e5a3c"/><ellipse cx="62" cy="40" rx="12" ry="9" fill="#4a3020"/>
      <circle cx="62" cy="45" r="4.2" fill="#e8e2d6" stroke="#5b4636" stroke-width="1"/>
      <path d="M60 6 V34" stroke="#ffffff" stroke-width="1.4" opacity="0.8"/>
      <circle cx="96" cy="44" r="12" fill="#7e5a3c" stroke="#2c2f36" stroke-width="2.2"/><circle cx="96" cy="48" r="3.4" fill="#e8e2d6"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: 'Into the ground',
      title: s.R != null ? `${num(sf3(s.R), 2, { trim: true })} N of resistance stops it ${num(sf3(s.depth), 4, { trim: true })} m down.` : `It stops ${num(sf3(s.depth), 4, { trim: true })} m down.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
