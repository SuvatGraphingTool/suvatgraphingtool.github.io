// kits/height.js — a throw from a height (a cliff over the sea, a tower on
// level ground), wired for the app. The engine is the twelve's own, gathered
// by js/core/height.js; the stage is js/render/heights.js; the working is the
// twelve's buildWorking plus the asked-height rows. This file only says which
// boxes to show, reads them, and lays out what the engine answered (rule 4).

import { solveHeight, levelRows, PLACES } from '../core/height.js';
import { buildWorking } from '../working.js';
import * as stage from '../render/heights.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

const FIELDS = [
  { key: 'h', col: 'place', label: 'Height of the top (m)', placeholder: '—', hint: 'Above the sea, or the ground.' },
  { key: 'theta', col: 'throw', label: `Angle ${M`theta`} (°)`, placeholder: '—', hint: '90 straight up, 0 across, −90 straight down.' },
  { key: 'u', col: 'throw', label: `Speed ${M`u`} (m s⁻¹)`, placeholder: '—', hint: 'Or leave it blank and give one below.' },
];

export const height = {
  id: 'height',
  verb: 'Throw it',
  voice: {
    h: 'From how high, and how?',
    sub: 'A stone thrown from the top of a cliff into the sea, or from the top of a tower to the ground. '
      + 'Give the height and the angle, and the speed — or, instead of the speed, how fast it lands, how far out, or how long it takes.',
  },
  fields: FIELDS,
  cols: { place: 'Where from', throw: 'The throw' },
  rows: [
    { title: 'Where it is thrown from', fields: [
      { key: 'place', type: 'choice', label: 'It is', default: 'cliff', hint: 'A cliff stands over the sea; a tower over level ground.',
        options: [{ v: 'cliff', label: 'A cliff over the sea' }, { v: 'tower', label: 'A tower' }] },
    ] },
    { title: 'Or, in place of the speed', fields: [
      { key: 'v', label: 'Speed it lands at (m s⁻¹)', aria: 'In place of the speed: the speed it lands at (m s⁻¹)', placeholder: '—', hint: 'How fast it hits the sea or the ground.' },
      { key: 's', label: 'How far out it lands (m)', aria: 'In place of the speed: how far out it lands (m)', placeholder: '—', hint: 'Thrown at an angle only.' },
      { key: 't', label: 'Time in the air (s)', aria: 'In place of the speed: the time in the air (s)', placeholder: '—', hint: 'From the throw to landing.' },
    ] },
    { title: 'What the paper asks', fields: [
      { key: 'level', label: 'When is it this high above the throw? (m)', aria: 'When is it this height above where it was thrown from (m)', placeholder: '—', hint: 'Negative for below it.' },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(vals) {
    return { place: vals.place, h: vals.h, theta: vals.theta, u: vals.u, v: vals.v, s: vals.s, t: vals.t, level: vals.level, g: vals.g };
  },
  solve: solveHeight,
  working: (solved, t) => {
    if (!solved?.ok) return [];
    const out = buildWorking(solved.f, t);
    const rows = levelRows(solved);
    if (rows.length) out.push({ title: `When it is ${M`${tr(Math.abs(solved.level.rel))} [m]`} ${solved.level.rel >= 0 ? 'above' : 'below'} the throw`, rows,
      note: `Measured from where it was thrown, up positive: ${M`s`} is that height, and the two roots are on the way up and on the way down.` });
    return out;
  },
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t), below = f.place === 'cliff' ? 'the sea' : 'the ground';
    return {
      left: [
        { k: `Height above ${below}`, v: num(r.y, 2), unit: 'm', hue: 'disp' },
        ...(f.vertical ? [] : [{ k: 'Out from the edge', v: num(r.x, 2), unit: 'm', hue: 'disp' }]),
        { k: 'Vertical velocity', v: num(v.y, 2), unit: 'm s⁻¹', hue: 'vel' },
        ...(f.vertical ? [] : [{ k: 'Speed', v: num(Math.hypot(v.x, v.y), 2), unit: 'm s⁻¹', hue: 'vel' }]),
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Vertical solid; across dashed, and only when it moves across (rule 2).
     The moments at the asked height are ringed on the height line. */
  graphs(f, t, P) {
    const tMax = f.tMax, across = !f.vertical;
    const two = (fx, fy, c) => [
      ...(across ? [{ label: 'across', tag: T`x`, fn: fx, color: c, dash: [6, 4] }] : []),
      { label: 'up', tag: across ? T`y` : undefined, fn: fy, color: c, dash: null },
    ];
    const rings = (f.level?.times || []).map((tc) => ({ t: tc, y: f.pos(tc).y, color: P.mark }));
    return [
      { canvas: 'g-s', title: across ? 'Displacement–time' : 'Height–time', unit: 'm', tMax, t, points: rings,
        series: two((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: two((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: two(() => 0, () => -f.params.g, P.acc) },
    ];
  },

  /** The card's sketch: a cliff over the sea and the arc off its edge. */
  thumb(s) {
    const r = solveHeight(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const f = r.f, n = 30, pts = [];
    for (let i = 0; i <= n; i++) pts.push(f.pos((i / n) * f.tMax));
    const xm = Math.max(...pts.map((p) => p.x), 1), ym = Math.max(...pts.map((p) => p.y), f.params.h);
    const k = Math.min(70 / xm, 46 / ym), X = (x) => 42 + x * k, Y = (y) => 54 - y * k;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="54" width="120" height="6" fill="#6f8796" opacity="0.55"/>
      <path d="M0 ${Y(f.params.h).toFixed(1)} L42 ${Y(f.params.h).toFixed(1)} L38 54 L0 54 Z" fill="#8b8073" opacity="0.85"/>
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
  },

  ending(solved) {
    const { Pl, T: tt, vL, out, top, h, vertical } = solved;
    const title = `${Pl.lands.replace(/^./, (c) => c.toUpperCase())} ${vertical ? 'at the foot' : `${tr(out)} m out`}, at ${tr(vL)} m s⁻¹.`;
    const cell = (x) => `<b>${tr(x)}</b>`;
    const table = `
      <div class="ph-tab" role="table" aria-label="The throw, from the top to where it lands">
        <div class="ph-head" role="row">
          <span role="columnheader">From</span><span role="columnheader">${M`u`}</span><span role="columnheader">${M`H_max`}</span>
          <span role="columnheader">${M`t`}</span><span role="columnheader">lands at</span><span role="columnheader">out</span>
        </div>
        <div class="ph-row" role="row" data-key="first">
          <span class="ph-name" role="cell"><b>${M`${tr(h)} [m]`}</b><em>${Pl.top}</em></span>
          <span role="cell">${cell(solved.f.params.u)}</span><span role="cell">${cell(top)}</span><span role="cell">${cell(tt)}</span>
          <span role="cell">${cell(vL)}</span><span role="cell">${vertical ? '<b>—</b>' : cell(out)}</span></div>
        <p class="ph-units">${M`u`} and the landing speed in ${M`[m s^-1]`}; ${M`H_max`} above ${Pl.below}, in ${M`[m]`}; ${M`t`} in ${M`[s]`} in the air.</p>
      </div>`;
    return {
      eyebrow: `From a <span class="u">${tr(h)}</span> <span class="u">m</span> ${Pl.word}`,
      title,
      body: `${solved.notes.map((x) => `<p>${x}</p>`).join('')}${table}`,
      real: true,
    };
  },
};
