// kits/marks.js — a ball falling freely past two marks M and N (the top and
// bottom of a window, two points on a cliff), in numbers or in letters; wired
// for the app. Engine js/core/marks.js, stage js/render/marks.js; this file
// says which boxes to show, reads them, and lays out what the engine answered
// (rule 4).

import { solveMarks, marksWorking } from '../core/marks.js';
import { inLetters } from '../core/letters.js';
import * as stage from '../render/marks.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

export const marks = {
  id: 'marks',
  verb: 'Let it fall',
  voice: {
    h: 'Falling past two marks',
    sub: 'A ball falls freely past M and then N below it — the top and bottom of a window, or two marks on a cliff. Give two of the speed at M, the speed at N, the time between and the distance between, '
      + `or work in letters: the speed at N a multiple of ${M`u`}, the speed at M.`,
  },
  fields: [],
  rows: [
    { title: 'How the paper gives it', fields: [
      { key: 'mode', type: 'choice', label: 'In', default: 'numbers', hint: '', options: [{ v: 'numbers', label: 'numbers' }, { v: 'letters', label: 'letters: u at M' }] },
      { key: 'look', type: 'choice', label: 'Past', default: 'window', hint: 'The picture only.', options: [{ v: 'window', label: 'a window' }, { v: 'cliff', label: 'marks on a cliff' }] },
    ] },
    { title: 'In numbers: two of these', fields: [
      { key: 'vM', label: 'Speed at M (m s⁻¹)', aria: 'In numbers: the speed at M (m s⁻¹)', placeholder: '—', hint: 'Downwards.' },
      { key: 'vN', label: 'Speed at N (m s⁻¹)', aria: 'In numbers: the speed at N (m s⁻¹)', placeholder: '—', hint: '' },
      { key: 't', label: 'Time from M to N (s)', aria: 'In numbers: the time from M to N (s)', placeholder: '—', hint: '' },
      { key: 'h', label: 'Distance M to N (m)', aria: 'In numbers: the distance from M to N (m)', placeholder: '—', hint: 'A window’s height.' },
      { key: 'H', label: 'M above the ground (m)', aria: 'In numbers: how high M is above the ground (m)', placeholder: '—', hint: 'Optional: to the ground.' },
    ] },
    { title: 'In letters', fields: [
      { key: 'k', label: `Speed at N (× ${M`u`})`, aria: 'In letters: the speed at N as a multiple of u', placeholder: '—', hint: '3 for 3u.' },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(v) { return { mode: v.mode || 'numbers', look: v.look || 'window', vM: v.vM, vN: v.vN, t: v.t, h: v.h, H: v.H, k: v.k, g: v.g }; },
  solve: solveMarks,
  working: (solved) => marksWorking(solved),
  render: stage.render,

  hud(f, t) {
    const u = f.letters ? [`× ${T`u^2/g`}`, '× u', `× ${T`u/g`}`] : ['m', 'm s⁻¹', 's'];
    return {
      left: [
        { k: 'Fallen', v: num(f.pos(t), 3), unit: u[0], hue: 'disp' },
        { k: 'Speed', v: num(f.vel(t), 3), unit: u[1], hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 3), unit: u[2] }],
    };
  },

  /* Vertical, down positive: solid (rule 2); M and N ringed. */
  graphs(f, t, P) {
    const u = f.letters ? [`× ${T`u^2/g`}`, '× u', '× g'] : ['m', 'm s⁻¹', 'm s⁻²'];
    const nt = f.letters ? ` (t × ${T`u/g`})` : '';
    const pts = [[f.tM, f.yM], [f.tN, f.yN]].map(([tt, y]) => ({ t: tt, y, color: P.mark }));
    return [
      { canvas: 'g-s', title: `Distance fallen–time${nt}`, unit: u[0], tMax: f.tMax, t, points: pts, series: [{ label: 's', fn: f.pos, color: P.disp, dash: null }] },
      { canvas: 'g-v', title: `Speed–time${nt}`, unit: u[1], tMax: f.tMax, t, series: [{ label: 'v', fn: f.vel, color: P.vel, dash: null }] },
      { canvas: 'g-a', title: `Acceleration–time${nt}`, unit: u[2], tMax: f.tMax, t, series: [{ label: 'a', fn: f.acc, color: P.acc, dash: null }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="20" y="4" width="50" height="56" fill="#b8b0a4" opacity="0.5"/><rect x="54" y="20" width="12" height="18" fill="#9fb6c8"/>
      <circle cx="82" cy="30" r="4" fill="none" stroke="var(--ink)" stroke-width="1.6"/><line x1="82" y1="34" x2="82" y2="46" stroke="var(--vel)" stroke-width="2"/>
    </svg>`;
  },

  ending(s) {
    const title = s.letters ? `M to N in ${T`${inLetters(s.tL, 'u', 'g')}`}, ${T`${inLetters(s.hL, 'u^2', 'g')}`} apart.`
      : `M to N: ${tr(s.V.s)} m in ${tr(s.V.t)} s; dropped ${tr(s.above)} m above M.`;
    return { eyebrow: 'Falling past two marks', title, body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
