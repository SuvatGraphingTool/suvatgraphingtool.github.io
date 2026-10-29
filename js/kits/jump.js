// kits/jump.js — a parachute jump in stages (free fall, braking under the
// canopy, a steady fall to the ground), wired for the app. No new physics:
// the engine is the library's journey in stages (js/core/journey.js), read
// downwards; the stage is js/render/jump.js. This file says which boxes to
// show, reads them, and lays out what the engine answered (rule 4).

import { solveJourney, journeyWorking } from '../core/journey.js';
import * as stage from '../render/jump.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });

const FIELDS = [
  { key: 'D', col: 'drop', label: 'Height it jumps from (m)', placeholder: '—', hint: 'Above the ground. Or give the total time below.' },
  { key: 'T', col: 'drop', label: 'or the total time (s)', placeholder: '—', hint: 'From the jump to the ground.' },
  { key: 't1', col: 'free', label: 'Free fall for (s)', placeholder: '—', hint: 'Before the canopy opens.' },
  { key: 'v1', col: 'free', label: 'or until it is doing (m s⁻¹)', placeholder: '—', hint: 'Its speed when the canopy opens.' },
  { key: 'a2', col: 'brake', label: `Slowing at ${M`a`} (m s⁻²)`, placeholder: '—', hint: 'The size of the deceleration under the canopy.' },
  { key: 't2', col: 'brake', label: 'For (s)', placeholder: '—', hint: 'How long it slows down for.' },
  { key: 'v2', col: 'brake', label: 'or down to (m s⁻¹)', placeholder: '—', hint: 'The steady speed it then falls at.' },
];

export const jump = {
  id: 'jump',
  verb: 'Jump',
  voice: {
    h: 'How does the jump go?',
    sub: 'A parachutist steps out and falls freely, the canopy opens and slows them down, then they fall at a steady speed to the ground. '
      + 'Down is positive. Any two of a stage’s numbers fix it; the height or the total time fixes the rest.',
  },
  fields: FIELDS,
  cols: { drop: 'The drop', free: 'Free fall', brake: 'Under the canopy' },
  rows: [],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(vals) {
    return { g: vals.g, D: vals.D, T: vals.T, t1: vals.t1, v1: vals.v1, a2: vals.a2, t2: vals.t2, v2: vals.v2 };
  },
  solve(k) {
    const fail = (reason) => ({ ok: false, reason, derived: [], notes: [] });
    if (!(k.g > 0)) return fail('Choose the value of g the paper uses.');
    const r = solveJourney({ u: 0, D: k.D, T: k.T,
      stages: [{ kind: 'up', a: k.g, t: k.t1, v: k.v1 }, { kind: 'down', a: k.a2, t: k.t2, v: k.v2 }, { kind: 'hold' }] });
    // the engine says 'journey'; this one is a jump
    const word = (x) => String(x).replace(/\bjourney\b/g, 'jump').replace(/\bjourneys\b/g, 'jumps');
    if (!r.ok) return { ...r, reason: word(r.reason) };
    r.notes = r.notes.map(word);
    const D = r.f.pos(r.f.tMax).x;
    r.f.jump = { D };
    r.convention = 'Down is positive: every distance is how far it has fallen, every speed downwards.';
    return r;
  },
  working: (solved) => journeyWorking(solved).map((s) => ({ ...s, title: String(s.title).replace(/\bjourney\b/g, 'jump') })),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'Height above the ground', v: num(f.jump.D - f.pos(t).x, 1), unit: 'm', hue: 'disp' },
        { k: 'Fallen', v: num(f.pos(t).x, 1), unit: 'm', hue: 'disp' },
        { k: 'Speed, down', v: num(f.vel(t).x, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration, down', v: num(f.accel(t), 2), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }],
    };
  },

  /* Vertical, so solid (rule 2); down positive; broken where each stage starts. */
  graphs(f, t, P) {
    const cuts = f.stages.map((s) => s.t0).slice(1);
    return [
      { canvas: 'g-s', title: 'Distance fallen–time', unit: 'm', tMax: f.tMax, t, series: [{ label: 'fallen', fn: (tt) => f.pos(tt).x, color: P.disp, dash: null }] },
      { canvas: 'g-v', title: 'Velocity–time (down)', unit: 'm s⁻¹', tMax: f.tMax, t, series: [{ label: 'v', fn: (tt) => f.vel(tt).x, color: P.vel, dash: null }] },
      { canvas: 'g-a', title: 'Acceleration–time (down)', unit: 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'a', fn: (tt) => f.accel(tt), color: P.acc, dash: null, breaks: cuts }] },
    ];
  },

  thumb(s) {
    const r = jump.solve(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const f = r.f, n = 30, X = (t) => 10 + (t / f.tMax) * 100;
    const vMax = Math.max(...Array.from({ length: n + 1 }, (_, i) => f.vel((i / n) * f.tMax).x), 1);
    const d = Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * f.tMax; return `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${(52 - (f.vel(t).x / vMax) * 42).toFixed(1)}`; }).join(' ');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="8" y1="52" x2="114" y2="52" stroke="var(--border)" stroke-width="1"/>
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M96 14 a8 6 0 0 1 16 0 z" fill="var(--card)" stroke="var(--ink-faint)" stroke-width="1.2"/>
    </svg>`;
  },

  ending(solved) {
    const f = solved.f, st = f.stages;
    const title = `On the ground after ${tr(f.tMax)} s, from ${tr(f.jump.D)} m.`;
    const name = ['Free fall', 'Under the canopy', 'Steady'];
    const cell = (x) => `<b>${tr(x)}</b>`;
    const rows = st.map((s, i) => {
      const t1 = isFinite(s.t1) ? s.t1 : f.tMax, v = s.u + s.a * (t1 - s.t0), sx = f.pos(t1).x - s.x0;
      return `<div class="ph-row" role="row" data-key="${i ? 'second' : 'first'}"><span class="ph-name" role="cell"><b>${i + 1}</b><em>${name[i] || ''}</em></span>
        <span role="cell">${cell(s.u)}</span><span role="cell">${cell(v)}</span><span role="cell">${cell(s.a)}</span><span role="cell">${cell(sx)}</span><span role="cell">${cell(t1 - s.t0)}</span></div>`;
    }).join('');
    return {
      eyebrow: `A <span class="u">${tr(f.jump.D)}</span> <span class="u">m</span> jump`,
      title,
      body: `${solved.notes.map((x) => `<p>${x}</p>`).join('')}<div class="ph-tab" role="table" aria-label="Each stage of the jump">
        <div class="ph-head" role="row"><span role="columnheader">Stage</span><span role="columnheader">${M`u`}</span><span role="columnheader">${M`v`}</span>
          <span role="columnheader">${M`a`}</span><span role="columnheader">${M`s`}</span><span role="columnheader">${M`t`}</span></div>${rows}
        <p class="ph-units">Down is positive: speeds in ${M`[m s^-1]`}, ${M`a`} in ${M`[m s^-2]`}, ${M`s`} fallen in ${M`[m]`}, ${M`t`} in ${M`[s]`}.</p></div>`,
      real: true,
    };
  },
};
