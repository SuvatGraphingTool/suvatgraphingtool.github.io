// kits/force.js — a particle on a smooth horizontal plane moved by one
// constant force, in i and j, wired for the app. The engine is
// js/core/force.js (F = ma as a vector equation, then SUVAT in i and j by
// js/core/plane.js), the stage js/render/hovercraft.js (a model hovercraft on
// a frozen lake, its fan pushing one way). This file says which boxes to
// show, reads them, and lays out what the engine answered (rule 4). The
// readouts, the graphs and the card's sketch are the plane's own.

import { solveForce, forceWorking } from '../core/force.js';
import { vsrc } from '../core/plane.js';
import * as stage from '../render/hovercraft.js';
import { plane } from './plane.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const comp = (key, col, c, unit, hint) => ({ key, col, label: `${M`vec ${c}`} part (${unit})`, aria: `${key.split('.')[0]}: ${c} part (${unit})`, placeholder: '—', hint });

export const force = {
  ...plane,
  id: 'force',
  verb: 'Switch it on',
  resolveBearing: false,   // i and j are the paper's, not east and north: angles to i
  voice: {
    h: 'A constant force, in i and j',
    sub: `A particle on a smooth horizontal plane, moved by one constant force. Give its mass and its velocity at the start, `
      + `then what fixes the acceleration: its velocity at a later time, the force, or the acceleration itself — and what the paper asks.`,
  },
  fields: [
    { key: 'm', col: 'm', label: 'Mass (kg)', placeholder: '—', hint: `For the force in newtons: ${M`vec F = m vec a`}.` },
    comp('u.x', 'u', 'i', 'm s⁻¹', `For ${M`2vec(i) - 5vec(j)`}, 2 here …`), comp('u.y', 'u', 'j', 'm s⁻¹', '… and −5 here.'),
    comp('vT.x', 'vT', 'i', 'm s⁻¹', 'Its velocity at the later time …'), comp('vT.y', 'vT', 'j', 'm s⁻¹', '… the j part.'),
    { key: 'T', col: 'vT', label: 'At time (s)', placeholder: '—', hint: 'When it has that velocity.' },
  ],
  cols: { m: 'The particle', u: 'Velocity at the start', vT: 'Velocity at a later time' },
  rows: [
    { title: 'Or the force, if the paper gives that instead',
      fields: [comp('F.x', 'F', 'i', 'N', 'Leave the later velocity blank.'), comp('F.y', 'F', 'j', 'N', 'With the mass above.')] },
    { title: 'Or the acceleration',
      fields: [comp('a.x', 'a', 'i', 'm s⁻²', 'Leave the later velocity and the force blank.'), comp('a.y', 'a', 'j', 'm s⁻²', 'With the mass, it gives the force.')] },
    ...plane.rows.slice(1),
  ],
  read(vals) {
    const v = (n) => ({ x: vals[`${n}.x`], y: vals[`${n}.y`] });
    return { m: vals.m, u: v('u'), vT: v('vT'), T: vals.T, F: v('F'), a: v('a'), r0: v('r0'),
             at: { t: vals['at.t'], x: vals['at.x'], y: vals['at.y'], speed: vals['at.speed'], moving: vals['at.moving'], due: vals['at.due'],
                   par: { x: vals['par.x'], y: vals['par.y'] } } };
  },
  solve: solveForce,
  working: (solved) => forceWorking(solved),
  render: stage.render,

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#d6e2e9"/><path d="M0 0 H120 V8 Q60 13 0 9 Z" fill="#f3f6f8"/>
      <path d="M14 46 Q40 52 58 36 T104 8" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
      <g transform="translate(58 36) rotate(-62)"><rect x="-9" y="-6" width="18" height="12" rx="5" fill="#1d1f23"/><rect x="-7" y="-4.5" width="14" height="9" rx="3" fill="#2f5d8a"/><circle cx="-4" cy="0" r="3" fill="#2a2d33"/></g>
      <path d="M62 29 L68 18 M64 18 L68 17 L69 21" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
  },

  /* The title is plain text: the force (or the acceleration) in Unicode, then
     the plane's own headline for the first thing asked. */
  ending(solved) {
    const base = plane.ending(solved);
    const head = solved.F ? T`vec F = ${vsrc(solved.F)} [N]` : T`vec a = ${vsrc(solved.a)} [m s^-2]`;
    const asked = solved.answers.filter((a) => a.ok).length;
    return {
      ...base,
      eyebrow: `One constant force${solved.answers.length ? ` · ${base.eyebrow}` : ''}`,
      title: asked ? `${head}. ${base.title}` : `${head}; it starts at ${tr(solved.speed0)} m s⁻¹.`,
      body: `<p>${M`vec F = m vec a`} is a vector equation: each component on its own. With the acceleration known, every answer is two SUVAT equations — one for the ${M`vec i`} parts, one for the ${M`vec j`} parts — or one relation between them, solved for ${M`t`}.</p>${solved.notes.map((n) => `<p>${n}</p>`).join('')}`,
    };
  },
};
