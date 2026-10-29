// kits/letters.js — two particles projected straight up from O, the answers
// in terms of U and g; wired for the app. Engine js/core/letters.js, stage
// js/render/letters.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4).

import { solveLetters, lettersWorking, inLetters } from '../core/letters.js';
import * as stage from '../render/letters.js';
import { M, T, num } from '../notation.js';

export const letters = {
  id: 'letters',
  verb: 'Project them',
  voice: {
    h: 'Two thrown up, in letters',
    sub: 'P is projected straight up from O with speed U; Q follows from O with a speed that is a multiple of U — when P is at its greatest height, or a given time later. '
      + `Every answer comes out in terms of ${M`U`} and ${M`g`}. Give numbers for them too, to see each in metres and seconds.`,
  },
  fields: [
    { key: 'k', col: 'q', label: `Q’s speed (× ${M`U`})`, placeholder: '—', hint: '0.5 for half of U.' },
  ],
  cols: { q: 'Q' },
  rows: [
    { title: 'When Q is projected', fields: [
      { key: 'when', type: 'choice', label: 'Q goes', default: 'top', hint: '', options: [{ v: 'top', label: 'when P is at its greatest height' }, { v: 'after', label: 'a given time after P' }] },
      { key: 'c', label: `That time (× ${M`U/g`})`, aria: 'When Q is projected: the time after P, as a multiple of U over g', placeholder: '—', hint: 'Only for a given time after P.' },
    ] },
    { title: 'Numbers too (both, or neither)', fields: [
      { key: 'U', label: `${M`U`} (m s⁻¹)`, aria: 'Numbers too: U (m s⁻¹)', placeholder: '—', hint: '' },
      { key: 'gv', label: `${M`g`} (m s⁻²)`, aria: 'Numbers too: g (m s⁻²)', placeholder: '—', hint: '' },
    ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(v) { return { k: v.k, when: v.when || 'top', c: v.c, U: v.U, g: v.gv }; },
  solve: solveLetters,
  working: (solved) => lettersWorking(solved),
  render: stage.render,

  hud(f, t) {
    const u = f.num ? ['m', 'm s⁻¹', 's'] : ['× U²/g', '× U', '× U/g'];
    return {
      left: [
        { k: 'P’s height', v: num(f.yP(t), 3), unit: u[0], hue: 'disp' },
        { k: 'Q’s height', v: num(f.yQ(t), 3), unit: u[0], hue: 'disp' },
        { k: 'P’s velocity', v: num(f.vP(t), 3), unit: u[1], hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 3), unit: u[2] }],
    };
  },

  /* Vertical: solid (rule 2). Without numbers, in units of U/g, U²/g and U. */
  graphs(f, t, P) {
    const u = f.num ? ['m', 'm s⁻¹', 'm s⁻²'] : ['× U²/g', '× U', '× g'];
    const nt = f.num ? '' : ' (t × U/g)';
    return [
      { canvas: 'g-s', title: `Height–time${nt}`, unit: u[0], tMax: f.tMax, t, points: f.tc != null ? [{ t: f.tc, y: f.yc, color: P.mark }] : [],
        series: [{ label: 'P', tag: 'P', fn: f.yP, color: P.disp, dash: null }, { label: 'Q', tag: 'Q', fn: f.yQ, color: P.second, dash: null }] },
      { canvas: 'g-v', title: `Velocity–time${nt}`, unit: u[1], tMax: f.tMax, t,
        series: [{ label: 'P', tag: 'P', fn: f.vP, color: P.vel, dash: null }, { label: 'Q', tag: 'Q', fn: f.vQ, color: P.second, dash: null, breaks: [f.t0] }] },
      { canvas: 'g-a', title: `Acceleration–time${nt}`, unit: u[2], tMax: f.tMax, t,
        series: [{ label: 'P', tag: 'P', fn: () => -f.g, color: P.acc, dash: null }, { label: 'Q', tag: 'Q', fn: (tt) => (tt < f.t0 ? 0 : -f.g), color: P.second, dash: null, breaks: [f.t0] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="30" y1="52" x2="90" y2="52" stroke="var(--border)"/><line x1="60" y1="6" x2="60" y2="56" stroke="var(--border)" stroke-dasharray="3 4"/>
      <circle cx="54" cy="14" r="4" fill="none" stroke="var(--vel)" stroke-width="2"/><circle cx="66" cy="40" r="4" fill="none" stroke="var(--second)" stroke-width="2"/>
    </svg>`;
  },

  ending(s) {
    const title = s.met ? `They collide ${T`${inLetters(s.tau, 'U', 'g')}`} after Q is projected, ${Math.abs(s.yc) < 1e-9 ? 'at O' : `${T`${inLetters(Math.abs(s.yc), 'U^2', 'g')}`} ${s.yc > 0 ? 'above' : 'below'} O`}.` : 'They never collide.';
    return { eyebrow: 'Two thrown up, in letters', title, body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
