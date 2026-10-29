// kits/twotrains.js — two trains between the same two stations, each in its
// own stages; wired for the app. Engine js/core/twotrains.js (the journey
// engine twice), stage js/render/twotrains.js; this file says which boxes to
// show, reads them, and lays out what the engine answered (rule 4).

import { solveTwoTrains, twoTrainsWorking } from '../core/twotrains.js';
import * as stage from '../render/twotrains.js';
import { M, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const N = 3;
const KIND = [{ v: '', label: '—' }, { v: 'up', label: 'speeds up' }, { v: 'hold', label: 'holds its speed' }, { v: 'down', label: 'slows down' }];
const stageRow = (n, i) => ({
  title: `Train ${n}, stage ${i}`,
  fields: [
    { key: `${n}${i}.kind`, type: 'choice', label: 'It', default: n === 'A' ? ['up', 'hold', 'down'][i - 1] : ['up', 'down', ''][i - 1], hint: '', options: KIND },
    { key: `${n}${i}.t`, label: 'For (s)', aria: `Train ${n}, stage ${i}: how long (s)`, placeholder: '—', hint: '' },
    { key: `${n}${i}.a`, label: 'Rate (m s⁻²)', aria: `Train ${n}, stage ${i}: the rate it speeds up or slows down (m s⁻²)`, placeholder: '—', hint: 'A size; blank to find it.' },
    { key: `${n}${i}.v`, label: 'Ends at (m s⁻¹)', aria: `Train ${n}, stage ${i}: the speed it ends at (m s⁻¹)`, placeholder: '—', hint: i === 1 ? 'Blank to find it.' : 'The last stage, blank: it comes to rest.' },
  ],
});

export const twotrains = {
  id: 'twotrains',
  verb: 'Depart',
  voice: {
    h: 'Two trains, one journey',
    sub: 'Two trains leave a station together from rest on parallel tracks and stop together at the next one, each in its own stages. Give what the paper says about each; '
      + 'a number left out of B’s journey is found from covering the same distance as A. Then: when are they at the same speed, and how far apart at a given time?',
  },
  fields: [
    { key: 'askT', col: 'ask', label: 'How far apart at time (s)', placeholder: '—', hint: 'Blank to skip.' },
  ],
  cols: { ask: 'What the paper asks' },
  rows: [...Array.from({ length: N }, (_, i) => stageRow('A', i + 1)), ...Array.from({ length: N }, (_, i) => stageRow('B', i + 1))],
  hides: { shows: ['components', 'apex', 'ruler', 'range', 'grid', 'acceleration'], extras: ['energy'], bounce: true },

  read(v) {
    const spec = (n) => ({ stages: Array.from({ length: N }, (_, i) => ({ kind: v[`${n}${i + 1}.kind`], t: v[`${n}${i + 1}.t`], a: v[`${n}${i + 1}.a`], v: v[`${n}${i + 1}.v`] }))
      .filter((s) => s.kind).map((s, i, all) => (i === all.length - 1 && s.kind === 'down' && s.v == null ? { ...s, v: 0 } : s)) });
    return { A: spec('A'), B: spec('B'), ask: { t: v.askT } };
  },
  solve: solveTwoTrains,
  working: (solved) => twoTrainsWorking(solved),
  render: stage.render,

  hud(f, t) {
    return {
      left: [
        { k: 'A from station 1', v: num(f.posA(t), 1), unit: 'm', hue: 'disp' },
        { k: 'B from station 1', v: num(f.posB(t), 1), unit: 'm', hue: 'disp' },
        { k: 'A’s speed', v: num(f.velA(t), 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'B’s speed', v: num(f.velB(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 1), unit: 's' }],
    };
  },

  /* Along the track, dashed (rule 2); A in its hue, B in stone; same speeds ringed. */
  graphs(f, t, P) {
    const pts = f.eq.map((te) => ({ t: te, y: f.velA(te), color: P.mark }));
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t,
        series: [{ label: 'B', tag: 'B', fn: f.posB, color: P.second, dash: [6, 4] }, { label: 'A', tag: 'A', fn: f.posA, color: P.disp, dash: [6, 4] }] },
      { canvas: 'g-v', title: 'Speed–time', unit: 'm s⁻¹', tMax: f.tMax, t, points: pts,
        series: [{ label: 'B', tag: 'B', fn: f.velB, color: P.second, dash: [6, 4] }, { label: 'A', tag: 'A', fn: f.velA, color: P.vel, dash: [6, 4] }] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t,
        series: [{ label: 'B', tag: 'B', fn: f.accB, color: P.second, dash: [6, 4] }, { label: 'A', tag: 'A', fn: f.accA, color: P.acc, dash: [6, 4] }] },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="8" y1="52" x2="116" y2="52" stroke="var(--border)"/>
      <path d="M8 52 L26 22 L92 22 L112 52" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-dasharray="5 3"/>
      <path d="M8 52 L60 10 L112 52" fill="none" stroke="var(--second)" stroke-width="2.2" stroke-dasharray="5 3"/>
    </svg>`;
  },

  ending(s) {
    const gapSay = s.gap != null ? `; ${tr(s.gap)} m apart at ${tr(s.f.ask)} s` : '';
    const title = s.spans.length ? `Same speed the whole time from t = ${tr(s.spans[0][0])} s to ${tr(s.spans[0][1])} s${gapSay}.`
      : s.eq.length ? `Same speed at t = ${s.eq.map((x) => tr(x)).join(' s and ')} s${gapSay}.` : `${tr(s.f.D)} m in ${tr(s.T)} s, never at the same speed between${gapSay}.`;
    return { eyebrow: 'Two trains, one journey', title, body: s.notes.map((x) => `<p>${x}</p>`).join(''), real: true };
  },
};
