// kits/ceiling.js — a ball kicked straight up indoors, under a ceiling;
// wired for the app. Engine js/core/ceiling.js, stage js/render/ceiling.js;
// this file says which boxes to show, reads them, and lays out what the
// engine answered (rule 4).

import { solveCeiling, ceilingWorking } from '../core/ceiling.js';
import * as stage from '../render/ceiling.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

export const ceiling = {
  id: 'ceiling',
  verb: 'Kick it up',
  voice: {
    h: 'Under the ceiling',
    sub: 'A ball kicked or thrown straight up, indoors: does it reach the ceiling, and if so when and how fast? '
      + 'Give its speed, or the greatest height it reaches outdoors, and the height of the ceiling.',
  },
  fields: [
    { key: 'h', col: 'kick', label: 'Leaves from (m above the floor)', placeholder: '0', hint: 'Blank: the floor.' },
    { key: 'u', col: 'kick', label: 'Speed up (m s⁻¹)', placeholder: '—', hint: 'Or give the greatest height instead.' },
    { key: 'top', col: 'kick', label: 'Or its greatest height (m above the floor)', placeholder: '—', hint: 'As it would rise with no ceiling.' },
    { key: 'C', col: 'hall', label: 'Ceiling height (m)', placeholder: '—', hint: 'Above the floor. Blank: outdoors.' },
  ],
  cols: { kick: 'The kick', hall: 'The hall' },
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(v) { return { g: v.g, h: v.h, u: v.u, top: v.top, C: v.C }; },
  solve: solveCeiling,
  working: (solved) => ceilingWorking(solved),
  render: stage.render,

  hud(f, t) {
    return { left: [{ k: 'Height above the floor', v: num(f.pos(t), 2), unit: 'm', hue: 'disp' }, { k: 'Vertical velocity', v: num(f.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' }],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }] };
  },

  /* Vertical: solid (rule 2); the ceiling moment ringed. */
  graphs(f, t, P) {
    const pts = f.hit ? [{ t: f.hit.t, y: f.C, color: P.mark }] : [];
    return [
      { canvas: 'g-s', title: 'Height–time', unit: 'm', tMax: f.tMax, t, points: pts, series: [{ label: 'y', fn: f.pos, color: P.disp, dash: null }] },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'v', fn: f.vel, color: P.vel, dash: null }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'a', fn: f.acc, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="10" y="4" width="100" height="6" fill="#9a9488" opacity="0.6"/><line x1="10" y1="56" x2="110" y2="56" stroke="var(--border)" stroke-width="2"/>
      <line x1="60" y1="54" x2="60" y2="16" stroke="var(--disp)" stroke-width="2" stroke-dasharray="3 3"/><circle cx="60" cy="16" r="4" fill="none" stroke="var(--ink)" stroke-width="1.6"/>
    </svg>`;
  },

  ending(s) {
    const title = s.hit ? `It reaches the ceiling at t = ${tr(s.hit.t)} s, at ${tr(s.hit.v)} m s⁻¹.` : s.f.C != null ? `It turns ${tr(s.f.gap)} m below the ceiling.` : `It rises to ${tr(s.Hmax)} m.`;
    return { eyebrow: 'Under the ceiling', title, body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
