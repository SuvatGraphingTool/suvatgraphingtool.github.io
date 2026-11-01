// kits/roof.js — above the roof: a particle thrown up beside a building is
// above its roof for a given time, which gives the building's height; then a
// second thrown up from the roof, and when the two are level. The engine is
// js/core/roof.js, which hands the two particles to js/core/pair.js; the
// stage, readouts and graphs are the vertical pair's (js/kits/pair.js), the
// tower with a person on its roof. See design/components.md.

import { solveRoof, roofWorking } from '../core/roof.js';
import { pair } from './pair.js';
import { num } from '../notation.js';

const tr = (x) => num(x, 3, { trim: true });

export const roof = {
  id: 'roof',
  verb: 'Throw them',
  voice: {
    h: 'Above the roof',
    sub: 'A particle thrown straight up beside a building is above its roof for a time; that time gives the building’s height. Then a second particle thrown up from the roof a moment later: when are they level?',
  },
  fields: [
    { key: 'u', col: 'A', label: 'Thrown up from the ground at (m s⁻¹)', placeholder: '—', hint: 'The first particle, beside the building.' },
    { key: 'above', col: 'A', label: 'Above the roof for (s)', placeholder: '—', hint: 'Finds the building’s height.' },
    { key: 'h', col: 'A', label: 'Or the building’s height (m)', placeholder: '—', hint: 'Finds the time above the roof.' },
    { key: 'B.u', col: 'B', label: 'Thrown up from the roof at (m s⁻¹)', placeholder: '—', hint: 'The second particle.' },
    { key: 'B.t0', col: 'B', label: 'This much after the first (s)', placeholder: '0', hint: 'Blank: together.' },
  ],
  cols: { A: 'The first, from the ground', B: 'The second, from the roof' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: pair.hides,

  read(v) { return { u: v.u, above: v.above, h: v.h, B: { u: v['B.u'], t0: v['B.t0'] }, g: v.g }; },
  solve: solveRoof,
  working: (solved) => roofWorking(solved),
  render: pair.render,
  hud: pair.hud,
  graphs: pair.graphs,
  thumb: pair.thumb,

  ending(s) {
    const e = pair.ending(s);
    return { ...e, eyebrow: `A ${tr(s.h)} m building`, body: `${s.notes.slice(0, 1).map((x) => `<p>${x}</p>`).join('')}${e.body}` };
  },
};
