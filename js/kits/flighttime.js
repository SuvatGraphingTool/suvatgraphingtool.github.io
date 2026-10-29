// kits/flighttime.js — a launch given by its time in the air and its
// horizontal velocity in a letter, just clearing a wall, wired for the app.
// The engine is js/core/flighttime.js; the stage, the readouts and the graphs
// are the wall-in-a-letter's (js/kits/clears.js), reading the same shape of
// motion in the letter d. See design/components.md.

import { solveFlightTime, flightTimeWorking } from '../core/flighttime.js';
import { clears } from './clears.js';
import { M, num } from '../notation.js';

const tr = (x) => num(x, Math.abs(x) >= 100 ? 1 : 3, { trim: true });

export const flighttime = {
  id: 'flighttime',
  verb: 'Project it',
  voice: {
    h: 'In the air for a time, over a wall',
    sub: `Projected from O on level ground, it lands a given time later; its horizontal velocity is a multiple of a length ${M`d`}, and it just clears a wall that far from O. `
      + `Where it lands and the wall's height follow without ${M`d`}; its speed over the wall then finds ${M`d`}.`,
  },
  fields: [
    { key: 'T', col: 'flight', label: 'Time in the air (s)', placeholder: '—', hint: 'Until it hits the level ground again.' },
    { key: 'kx', col: 'flight', label: `Horizontal velocity (× ${M`d`}, m s⁻¹)`, placeholder: '—', hint: `Type 5/3 for ${M`(5/3)d`}.` },
    { key: 'm', col: 'flight', label: `Wall is this far from O (× ${M`d`})`, placeholder: '1', hint: `Blank: ${M`d`} itself.` },
  ],
  cols: { flight: 'The flight and the wall' },
  rows: [
    { title: 'One number more', fields: [
      { key: 'V', label: 'Speed over the wall (m s⁻¹)', aria: 'One number more: its speed as it passes over the wall (m s⁻¹)', placeholder: '—', hint: `Finds ${M`d`}.` },
      { key: 'd', label: `The length ${M`d`} (m)`, aria: 'One number more: the length d (m)', placeholder: '—', hint: 'Finds the speed over the wall.' },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: clears.hides,

  read(vals) {
    // the example keeps 5/3 as it is written, so its box shows a fraction
    const frac = (v) => { const m = typeof v === 'string' && v.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/); return m ? Number(m[1]) / Number(m[2]) : v; };
    return { T: vals.T, kx: frac(vals.kx), m: frac(vals.m), V: vals.V, d: vals.d, g: vals.g };
  },
  solve: solveFlightTime,
  working: (solved) => flightTimeWorking(solved),
  render: clears.render,
  hud: clears.hud,
  graphs: clears.graphs,
  thumb: clears.thumb,

  ending(s) {
    return {
      eyebrow: 'Over the wall, then down',
      title: s.given === 'V' ? `d = ${tr(s.d)} m.` : `Over the wall at ${tr(s.Vw)} m s⁻¹.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
