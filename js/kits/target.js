// kits/target.js — a projectile that has to pass one point, wired for the
// app. The engine is js/core/target.js and the stage js/render/target.js;
// this file says which boxes to show, reads them, and lays out what the
// engine answered (rule 4). See design/components.md.

import { solveTarget, targetWorking } from '../core/target.js';
import * as stage from '../render/target.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const deg = (x) => num(x, 2, { trim: true });

const FIELDS = [
  { key: 'h0', col: 'launch', label: 'Height it leaves from (m)', optional: true, hint: 'Above the ground. Blank is 0.' },
  { key: 'u', col: 'launch', label: `Speed ${M`u`} (m s⁻¹)`, placeholder: '—', hint: 'Or give its components below.' },
  { key: 'theta', col: 'launch', label: `Angle ${M`theta`} (°)`, placeholder: '—', hint: 'Above the horizontal; negative is below it.' },
  { key: 'd', col: 'point', label: 'How far out it is (m)', placeholder: '—', hint: 'Across from the launch.' },
  { key: 'H', col: 'point', label: 'Height of its top (m)', placeholder: '—', hint: 'Above the ground: the top of the wall, net or tree, or the point.' },
  { key: 'tAt', col: 'point', label: 'or above it at time (s)', placeholder: '—', hint: '“After 2⁄5 s it is above the net” is 0.4.' },
];

export const target = {
  id: 'target',
  verb: 'Launch it',
  voice: {
    h: 'What does it have to pass?',
    sub: 'A projectile and one point it must pass: the top of a wall, a net or a tree, a wall it hits, or a target. '
      + 'Give the launch and the point and the engine says whether it clears and by how much — or leave one number out and it is found from the point.',
  },
  fields: FIELDS,
  cols: { launch: 'The launch', point: 'The point' },
  rows: [
    { title: 'Or the launch as its two components', fields: [
      { key: 'ux', label: 'Across (m s⁻¹)', aria: 'Launch velocity: across (m s⁻¹)', placeholder: '—', hint: `For ${M`(30vec(i) - 1.4vec(j))`}, 30 here …` },
      { key: 'uy', label: 'Up (m s⁻¹)', aria: 'Launch velocity: up (m s⁻¹)', placeholder: '—', hint: '… and −1.4 here. Thrown horizontally is 0.' },
    ] },
    { title: 'What is at the point', fields: [
      { key: 'kind', type: 'choice', label: 'It is', hint: 'A wall, net or tree it does not clear, it hits. A wall it hits stops it there.',
        options: [{ v: 'wall', label: 'A wall' }, { v: 'net', label: 'A net' }, { v: 'tree', label: 'A tree' }, { v: 'face', label: 'A wall it hits' }, { v: 'point', label: 'A target point' }] },
    ] },
    { title: 'Find from the point, if the paper asks', fields: [
      { key: 'find', type: 'choice', label: 'Find', names: true,
        hint: 'Its box above is then left to the engine. From the time or the greatest height, leave the speed and the angle blank.',
        options: [{ v: 'theta', label: `the angle ${M`theta`}` }, { v: 'u', label: `the speed ${M`u`}` },
                  { v: 'T', label: 'both, from the time to it' }, { v: 'apex', label: 'both, from its greatest height' }] },
      { key: 'T', label: 'Time to reach it (s)', aria: 'Find from: the time to reach the point (s)', placeholder: '—', hint: '“After 2.4 s it hits the wall”.' },
      { key: 'top', label: 'Its greatest height (m)', aria: 'Find from: its greatest height above the ground (m)', placeholder: '—', hint: 'Above the ground.' },
      { key: 'pick', type: 'choice', label: 'Of two answers, fly', hint: 'Both are worked; the other is drawn faintly.',
        options: [{ v: 'steep', label: 'the steeper' }, { v: 'flat', label: 'the flatter' }] },
    ] },
    { title: 'A mark on the ground, if the paper has one', fields: [
      { key: 'flag', label: 'A flag or mark at (m)', aria: 'A mark on the ground: its distance (m)', placeholder: '—', hint: 'How far short of it, or past it, it lands.' },
    ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['ruler', 'range', 'grid'], extras: ['energy'], bounce: true },

  read(vals) {
    const k = { g: vals.g };
    for (const key of ['h0', 'u', 'theta', 'ux', 'uy', 'd', 'H', 'tAt', 'T', 'top', 'flag', 'kind', 'find', 'pick']) k[key] = vals[key];
    // the box for the number being found is ignored, as the hint says
    if (k.find === 'theta' || k.find === 'u') delete k[k.find];
    return k;
  },
  solve: solveTarget,
  working: (solved) => targetWorking(solved),
  render: stage.render,

  hud(f, t) {
    const r = f.pos(t), v = f.vel(t);
    return {
      left: [
        { k: 'Across', v: num(r.x, 2), unit: 'm', hue: 'disp' },
        { k: 'Height', v: num(r.y, 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity across', v: num(v.x, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Velocity up', v: num(v.y, 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' }, { k: 'Speed', v: num(f.speed(t), 2), unit: 'm s⁻¹' }],
    };
  },

  /* Each graph has its two components: across dashed, up solid (rule 2).
     The moment it reaches the point is ringed on both lines. */
  graphs(f, t, P) {
    const F = f.F, tMax = f.tMax;
    const ring = F.at?.reached ? [F.at.t] : [];
    const pair = (fx, fy, c) => [
      { label: 'across', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'up', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax, t,
        series: pair((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp),
        points: ring.flatMap((ta) => [{ t: ta, y: f.pos(ta).x, color: P.mark }, { t: ta, y: f.pos(ta).y, color: P.mark }]) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: pair((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel),
        points: ring.flatMap((ta) => [{ t: ta, y: f.vel(ta).x, color: P.mark }, { t: ta, y: f.vel(ta).y, color: P.mark }]) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: pair(() => 0, () => -f.g, P.acc) },
    ];
  },

  /** The card's sketch: two paths through one treetop, and the ground. */
  thumb(s) {
    const r = solveTarget(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const paths = r.flights.map((fl) => Array.from({ length: 31 }, (_, i) => { const tt = (i / 30) * fl.end; return { x: fl.x(tt), y: fl.y(tt) }; }));
    const all = paths.flat();
    const xm = Math.max(...all.map((p) => p.x), r.P?.d ?? 0, r.flag ?? 0) || 1, ym = Math.max(...all.map((p) => p.y), r.P?.H ?? 0) || 1;
    const k = Math.min(104 / xm, 46 / ym);
    const X = (x) => 8 + x * k, Y = (y) => 53 - y * k;
    const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    const obstacle = r.P && r.P.H != null
      ? `<line x1="${X(r.P.d).toFixed(1)}" y1="53" x2="${X(r.P.d).toFixed(1)}" y2="${Y(r.P.H).toFixed(1)}" stroke="var(--ink-muted)" stroke-width="3"/>` : '';
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="2" y1="53" x2="118" y2="53" stroke="var(--border)" stroke-width="1"/>
      ${obstacle}
      ${paths.map((p, i) => `<path d="${d(p)}" fill="none" stroke="var(--vel)" stroke-width="${i === r.pick ? 2.2 : 1.4}" opacity="${i === r.pick ? 1 : 0.45}" stroke-linecap="round"/>`).join('')}
    </svg>`;
  },

  /* The title is plain text, so it says the headline in words and numbers;
     the table carries each answer. */
  ending(solved) {
    const { flights, shown: S, find, K, kind, P } = solved;
    const a = S.at;
    const title = find === 'theta' ? (flights.length > 1 ? `θ = ${deg(flights[1].theta)}° or ${deg(flights[0].theta)}°.` : `θ = ${deg(S.theta)}°.`)
      : find ? `${tr(S.u)} m s⁻¹ at ${deg(S.theta)}°.`
        : !a ? `Lands ${tr(S.R)} m out.`
          : !a.reached ? `Lands before ${K.the}.`
            : K.hits ? `Hits ${K.the} ${tr(a.y)} m up.`
              : a.clear == null ? `${tr(a.y)} m up, ${tr(P.d)} m out.`
                : Math.abs(a.clear) < 1e-6 ? (kind === 'point' ? 'Through the point.' : `Just clears ${K.the}.`)
                  : kind === 'point' ? `${tr(Math.abs(a.clear))} m ${a.clear > 0 ? 'above' : 'below'} the point.`
                    : a.clear > 0 ? `Clears ${K.the} by ${tr(a.clear)} m.` : `Hits ${K.the} ${tr(-a.clear)} m below the top.`;
    const cell = (x, p) => (x == null ? '<b>—</b>' : `<b>${tr(x, p)}</b>`);
    const row = (fl, i) => `<div class="ph-row" role="row" data-key="${i === solved.pick ? 'first' : 'second'}">
        <span class="ph-name" role="cell"><b>${M`theta = ${deg(fl.theta)}°`}</b><em>${i === solved.pick ? 'flown' : 'the other answer'}</em></span>
        <span role="cell">${cell(fl.u)}</span><span role="cell">${cell(fl.at?.reached ? fl.at.t : null)}</span>
        <span role="cell">${cell(fl.at?.reached ? fl.at.y : null)}</span><span role="cell">${cell(fl.top)}</span>
        <span role="cell">${cell(fl.hits ? null : fl.R)}</span></div>`;
    const table = P ? `
      <div class="ph-tab" role="table" aria-label="Each launch, and where it is at the point">
        <div class="ph-head" role="row">
          <span role="columnheader">Launch</span>
          <span role="columnheader">${M`u`}</span><span role="columnheader">${M`t`} at it</span>
          <span role="columnheader">${M`y`} at it</span><span role="columnheader">${M`H_max`}</span>
          <span role="columnheader">lands</span>
        </div>
        ${flights.map(row).join('')}
        <p class="ph-units">${M`u`} in ${M`[m s^-1]`}; ${M`t`} in ${M`[s]`} from the launch; heights and the landing distance in ${M`[m]`}, from the ground and from the launch.</p>
      </div>` : '';
    return {
      eyebrow: P ? `${K.word === 'point' ? 'A point' : `A ${K.word}`} <span class="u">${tr(P.d)}</span> <span class="u">m</span> out${P.H != null ? `, <span class="u">${tr(P.H)}</span> <span class="u">m</span> up` : ''}` : 'Its path',
      title,
      body: `${solved.notes.map((n) => `<p>${n}</p>`).join('')}${table}`,
      real: true,
    };
  },
};
