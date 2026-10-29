// kits/twoplane.js — two moving in a plane at constant velocities (ships,
// boats, birds), wired for the app. Engine js/core/twoplane.js, stage
// js/render/twoplane.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4).

import { solveTwoPlane, twoPlaneWorking } from '../core/twoplane.js';
import { COMPASS } from '../core/plane.js';
import * as stage from '../render/twoplane.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const part = (key, col, c, what, hint) => ({ key, col, label: `${M`vec ${c}`} part of ${what}`, aria: `${col}: the ${c} part of ${what}`, placeholder: '—', hint });

const FIELDS = [
  part('A.r0.x', 'A', 'i', 'its start', 'Where it is at t = 0.'), part('A.r0.y', 'A', 'j', 'its start', 'Blank is 0.'),
  part('A.v.x', 'A', 'i', 'its velocity', 'East is positive.'), part('A.v.y', 'A', 'j', 'its velocity', 'North is positive.'),
  part('B.r0.x', 'B', 'i', 'its start', 'Where it is at t = 0.'), part('B.r0.y', 'B', 'j', 'its start', 'Blank is 0.'),
  part('B.v.x', 'B', 'i', 'its velocity', '0 and 0 for something that stays put.'), part('B.v.y', 'B', 'j', 'its velocity', 'Or give it as p times a vector, below.'),
];
const compass = Object.entries(COMPASS).map(([v, c]) => ({ v, label: c.word.replace(/^./, (x) => x.toUpperCase()) }));

export const twoplane = {
  id: 'twoplane',
  verb: 'Set off',
  voice: {
    h: 'Where does each start, and how does it move?',
    sub: `Two ships (or boats, or birds), each at a constant velocity: ${M`vec i`} is east and ${M`vec j`} north. `
      + 'Ask when one is due some direction of the other, when they are a given distance apart — or find a number p in one velocity from where they are at a given time.',
  },
  fields: FIELDS,
  cols: { A: 'A', B: 'B' },
  rows: [
    { title: 'Units, and what they are', fields: [
      { key: 'units', type: 'choice', label: 'Units', default: 'km', hint: '', options: [{ v: 'km', label: 'km and hours' }, { v: 'm', label: 'metres and seconds' }] },
      { key: 'look', type: 'choice', label: 'They are', default: 'ships', hint: '', options: [{ v: 'ships', label: 'ships or boats' }, { v: 'birds', label: 'birds' }] },
    ] },
    { title: 'Or A’s velocity from where it is later', fields: [
      { key: 'A.r1.x', label: `${M`vec i`} part`, aria: 'A’s later position: its i part', placeholder: '—', hint: 'Leave A’s velocity blank.' },
      { key: 'A.r1.y', label: `${M`vec j`} part`, aria: 'A’s later position: its j part', placeholder: '—', hint: '' },
      { key: 'A.t1', label: 'At time', aria: 'The time A is at that later position', placeholder: '—', hint: '“At 7.36 am”, from 7 am, is 0.6 h.' },
    ] },
    { title: 'Or find something about B', fields: [
      { key: 'find', type: 'choice', label: 'Find', hint: 'Then leave B’s velocity above blank.', options: [{ v: 'p', label: 'p, in B’s velocity' }, { v: 'B', label: 'where B is, from two sightings' }] },
      { key: 's1due', type: 'choice', label: 'B is first seen …', hint: '', options: compass },
      { key: 's1t', label: 'of A, at time', aria: 'The time of the first sighting', placeholder: '—', hint: '' },
      { key: 's2due', type: 'choice', label: 'then …', hint: '', options: compass },
      { key: 's2t', label: 'of A, at time', aria: 'The time of the second sighting', placeholder: '—', hint: 'B stays put: a lighthouse, a buoy.' },
    ] },
    { title: 'B’s velocity as p times a vector, when finding p', fields: [
      { key: 'B.w.x', label: `${M`vec i`} part`, aria: 'B’s velocity is p times a vector: its i part', placeholder: '—', hint: `For ${M`p(vec(i) + 2vec(j))`}, 1 here …` },
      { key: 'B.w.y', label: `${M`vec j`} part`, aria: 'B’s velocity is p times a vector: its j part', placeholder: '—', hint: '… and 2 here.' },
    ] },
    { title: 'What the paper asks', fields: [
      { key: 'due', type: 'choice', label: 'When is one due …', hint: '', options: compass },
      { key: 'bOfA', type: 'choice', label: 'of the other', default: 'AofB', hint: '“P is due west of Q”: A is P.', options: [{ v: 'AofB', label: 'A of B' }, { v: 'BofA', label: 'B of A' }] },
      { key: 'dueT', label: 'At time (with p to find)', aria: 'The time it is in that direction, to find p', placeholder: '—', hint: 'Only when finding p.' },
      { key: 'apart', label: 'When are they this far apart?', aria: 'A distance apart: when are they that far apart', placeholder: '—', hint: 'Often twice.' },
    ] },
  ],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration', 'ticks'], extras: ['energy'], bounce: true },

  read(vals) {
    const v2 = (p) => ({ x: vals[`${p}.x`], y: vals[`${p}.y`] });
    return { units: vals.units || 'km', look: vals.look || 'ships', find: vals.find || null,
      A: { r0: v2('A.r0'), v: v2('A.v'), r1: v2('A.r1'), t1: vals['A.t1'] }, B: { r0: v2('B.r0'), v: v2('B.v'), w: v2('B.w') },
      at: { due: vals.due, bOfA: vals.bOfA === 'BofA', dueT: vals.dueT, apart: vals.apart,
            sights: [{ due: vals.s1due, t: vals.s1t }, { due: vals.s2due, t: vals.s2t }] } };
  },
  solve(k) {
    const r = solveTwoPlane(k);
    if (r.ok) r.f.look = k.look;
    return r;
  },
  working: (solved) => twoPlaneWorking(solved),
  render: stage.render,

  hud(f, t) {
    const a = f.posA(t), b = f.posB(t), U = f.U;
    return {
      left: [
        { k: 'A at', v: `(${num(a.x, 2)}, ${num(a.y, 2)})`, unit: U.len, hue: 'disp' },
        { k: 'B at', v: `(${num(b.x, 2)}, ${num(b.y, 2)})`, unit: U.len, hue: 'disp' },
        { k: 'Apart', v: num(f.gap(t), 2), unit: U.len, hue: 'disp' },
        { k: 'A\u2019s speed', v: num(Math.hypot(f.A.v.x, f.A.v.y), 2), unit: U.speedText, hue: 'vel' },
        { k: 'B\u2019s speed', v: num(Math.hypot(f.B.v.x, f.B.v.y), 2), unit: U.speedText, hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: U.time }],
    };
  },

  /* Each one's i part dashed and j part solid (rule 2); A in the quantity's
     hue, B in the second-object stone. Velocity is constant; no acceleration. */
  graphs(f, t, P) {
    const U = f.U, two = (fn, c, who) => [
      { label: `${who} i`, tag: `${who} i`, fn: (tt) => fn(tt).x, color: c, dash: [6, 4] },
      { label: `${who} j`, tag: `${who} j`, fn: (tt) => fn(tt).y, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Position–time', unit: U.len, tMax: f.tMax, t, series: [...two(f.posB, P.second, 'B'), ...two(f.posA, P.disp, 'A')] },
      { canvas: 'g-v', title: 'Velocity–time', unit: U.speedText, tMax: f.tMax, t, series: [...two(() => f.B.v, P.second, 'B'), ...two(() => f.A.v, P.vel, 'A')] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: U.len === 'km' ? 'km h⁻²' : 'm s⁻²', tMax: f.tMax, t, series: [{ label: 'both', tag: 'A, B', fn: () => 0, color: P.acc, dash: null }] },
    ];
  },

  thumb(s) {
    const r = twoplane.solve(s.params);
    if (!r?.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const f = r.f, T = f.tMax, pts = (fn) => [0, T].map((t) => fn(t));
    const all = [...pts(f.posA), ...pts(f.posB)];
    const x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x)), y0 = Math.min(...all.map((p) => p.y)), y1 = Math.max(...all.map((p) => p.y));
    const k = Math.min(96 / ((x1 - x0) || 1), 44 / ((y1 - y0) || 1)), X = (x) => 12 + (x - x0) * k, Y = (y) => 52 - (y - y0) * k;
    const line = (fn, c) => { const [a, b] = pts(fn); return `<line x1="${X(a.x).toFixed(1)}" y1="${Y(a.y).toFixed(1)}" x2="${X(b.x).toFixed(1)}" y2="${Y(b.y).toFixed(1)}" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`; };
    return `<svg viewBox="0 0 120 60" aria-hidden="true">${line(f.posB, 'var(--second)')}${line(f.posA, 'var(--vel)')}</svg>`;
  },

  ending(solved) {
    const a = solved.answers.find((x) => x.kind === 'p') ? `p = ${tr(solved.p)}.`
      : solved.answers.find((x) => x.kind === 'due') ? `${tr(solved.answers.find((x) => x.kind === 'due').dist)} ${solved.U.len} apart at t = ${tr(solved.answers.find((x) => x.kind === 'due').t)} ${solved.U.time}.`
        : solved.answers.find((x) => x.kind === 'apart')?.times.length ? `At t = ${solved.answers.find((x) => x.kind === 'apart').times.map((x) => tr(x)).join(' and ')} ${solved.U.time}.` : 'Their tracks, from O.';
    return {
      eyebrow: `Two, at constant velocities`,
      title: a,
      body: solved.notes.map((x) => `<p>${x}</p>`).join(''),
      real: true,
    };
  },
};
