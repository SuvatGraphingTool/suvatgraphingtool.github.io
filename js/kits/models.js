// kits/models.js — one braking question under three models, compared: a car
// at speed sees a speed-limit sign ahead. No new physics: each model is the
// library's journey in stages (js/core/journey.js) — model 1 slows all the
// way to the sign; model 2 slows to the limit, then holds it; model 3 does
// the same after a reaction time at full speed. The stage is
// js/render/models.js. This file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4).

import { journeyWorking } from '../core/journey.js';
import { solveModels } from '../core/models.js';
import * as stage from '../render/models.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

const FIELDS = [
  { key: 'u', col: 'car', label: `Speed at first ${M`u`} (m s⁻¹)`, placeholder: '—', hint: 'When the driver sees the sign.' },
  { key: 'D', col: 'car', label: 'Distance to the sign (m)', placeholder: '—', hint: 'From where it is at t = 0.' },
  { key: 'a', col: 'car', label: `Deceleration ${M`a`} (m s⁻²)`, placeholder: '—', hint: 'Its size, the same in every model.' },
  { key: 'limit', col: 'sign', label: 'Speed limit on the sign (m s⁻¹)', placeholder: '—', hint: 'Models 2 and 3 slow to this, then hold it.' },
  { key: 'react', col: 'sign', label: 'Reaction time (s)', placeholder: '—', hint: 'Model 3 holds full speed this long first. 0 or blank: none.' },
];

export const models = {
  id: 'models',
  verb: 'Drive',
  voice: {
    h: 'How fast, how far, how hard?',
    sub: 'A car at speed, and a speed-limit sign ahead. Three models of what the driver does, side by side on one clock: '
      + 'brake all the way to the sign; brake to the limit and hold it; react first, then do the same.',
  },
  fields: FIELDS,
  cols: { car: 'The car', sign: 'The sign' },
  rows: [],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration', 'ticks'], extras: ['energy'], bounce: true },

  read(vals) { return { u: vals.u, D: vals.D, a: vals.a, limit: vals.limit, react: vals.react }; },
  solve(k) {
    const r = solveModels(k);
    if (!r.ok) return r;
    const M3 = r.models;
    const tMax = Math.max(...M3.map((m) => m.tSign)) * 1.08;
    const f = { kind: 'models', models: M3, D: k.D, u: k.u, limit: k.limit, tMax, tFlight: tMax,
      pos: (t) => M3[0].pos(t), vel: (t) => M3[0].vel(t), params: { u: k.u, theta: 0, h: 0, g: 0 },
      bounces: 0, segments: [], horiz: null, kineticEnergy: () => 0, momentum: () => 0,
      path(n = 200, tEnd = tMax) { const o = []; for (let i = 0; i <= n; i++) { const t = (i / n) * tEnd; o.push({ t, x: M3[0].pos(t), y: 0 }); } return o; } };
    return { ok: true, mode: 'models', axis: 'along', f, models: M3, notes: r.notes, derived: r.derived,
      params: f.params, convention: 'Along the road towards the sign is positive.' };
  },
  working: (solved) => solved.models.flatMap((m, i) => journeyWorking(m.r).map((s) => ({ ...s, title: `Model ${i + 1}: ${String(s.title).replace(/\bjourney\b/g, 'drive to the sign')}` }))),
  render: stage.render,

  hud(f, t) {
    return {
      left: f.models.map((m, i) => ({ k: `Model ${i + 1}`, v: num(m.vel(t), 2), unit: 'm s⁻¹', hue: 'vel' })),
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* All three along the road, so dashed (rule 2); model 1 in the quantity's
     hue, model 2 in the second-object stone, model 3 in strong ink. */
  graphs(f, t, P) {
    const c = [null, P.second, P.strong];
    const three = (fn, c0) => f.models.map((m, i) => ({ label: `model ${i + 1}`, tag: String(i + 1), fn: (tt) => fn(m, tt), color: c[i] || c0, dash: [6, 4] }));
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: three((m, tt) => m.pos(tt), P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: three((m, tt) => m.vel(tt), P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: three((m, tt) => m.acc(tt), P.acc) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      ${[14, 32, 50].map((y, i) => `<line x1="6" y1="${y}" x2="114" y2="${y}" stroke="var(--border)" stroke-width="1"/><rect x="${22 + i * 14}" y="${y - 7}" width="14" height="6" rx="2" fill="var(--card)" stroke="var(--ink-faint)" stroke-width="1"/>`).join('')}
      <circle cx="96" cy="8" r="6" fill="#fff" stroke="#d33a3a" stroke-width="2"/>
      <line x1="96" y1="14" x2="96" y2="52" stroke="var(--ink-faint)" stroke-width="1.2"/>
    </svg>`;
  },

  ending(solved) {
    const M3 = solved.models;
    const cell = (x) => `<b>${tr(x)}</b>`;
    const rows = M3.map((m, i) => `<div class="ph-row" role="row" data-key="${['first', 'second', 'third'][i]}"><span class="ph-name" role="cell"><b>Model ${i + 1}</b><em>${m.does}</em></span>
      <span role="cell">${cell(m.tSign)}</span><span role="cell">${cell(m.vSign)}</span></div>`).join('');
    return {
      eyebrow: `Three models, one sign`,
      title: M3.map((m, i) => (m.xEnd < solved.f.D - 1e-9 ? `${i + 1}: stops short` : `${i + 1}: ${tr(m.tSign)} s`)).join(' · ') + '.',
      body: `${solved.notes.map((x) => `<p>${x}</p>`).join('')}<div class="ph-tab" role="table" aria-label="Each model at the sign">
        <div class="ph-head" role="row"><span role="columnheader">Model</span><span role="columnheader">${M`t`}</span><span role="columnheader">${M`v`}</span></div>${rows}
        <p class="ph-units">${M`t`} in ${M`[s]`} when it reaches the sign; ${M`v`} in ${M`[m s^-1]`} as it passes it.</p></div>`,
      real: true,
    };
  },
};
