// kits/bounce.js — a ball that hits the ground and bounces, wired for the
// app. The engine is js/core/bounce.js and the stage js/render/bounce.js;
// this file says which boxes to show, reads them, and lays out what the
// engine answered (rule 4). See design/components.md.

import { solveBounce, bounceWorking, ordinal, sf, MAX_IMPACTS } from '../core/bounce.js';
import * as stage from '../render/bounce.js';
import { M, num } from '../notation.js';

const fmt = (x, dp = 2) => num(x, dp);
const tr = (x, p = 2) => num(x, p, { trim: true });

/** The throw in one column, the bounce in the other; then what to watch. */
const FIELDS = [
  { key: 'start', col: 'throw', type: 'choice', label: 'How it sets off',
    options: [{ v: 'drop', label: 'Released from rest' }, { v: 'down', label: 'Thrown down' }, { v: 'up', label: 'Thrown up' }] },
  { key: 'h', col: 'throw', label: 'Height it starts from (m)', hint: 'Above the ground. Leave blank if the paper gives the other two.' },
  { key: 'U', col: 'throw', label: 'Speed it is thrown with (m s⁻¹)', hint: 'A size: the chips above say which way. Released from rest is 0.' },
  { key: 'V', col: 'throw', label: 'Speed it hits the ground with (m s⁻¹)', hint: 'Just before the first impact. Any two of these three will do.' },
  { key: 'w', col: 'bounce', label: 'Speed it rebounds with (m s⁻¹)', hint: 'Just after the first impact.' },
  { key: 'H', col: 'bounce', label: 'Greatest height after the bounce (m)', hint: 'How high it rises again, from the ground.' },
  { key: 'e', col: 'bounce', label: 'Fraction of its speed it keeps', hint: 'Rebound speed ÷ impact speed: “half its speed” is 0.5; a third, type with a slash. Give one of these three.' },
];

export const bounce = {
  id: 'bounce',
  verb: 'Let it go',
  voice: {
    h: 'How does it fall, and how does it bounce?',
    sub: 'A ball leaves a height, hits <b>horizontal ground</b> and rebounds. Give how it sets off and two '
      + 'of its height, its speed then and its speed at the ground; then one thing about the bounce. '
      + 'The engine does each flight as SUVAT, and the bounce is what you give it.',
  },
  fields: FIELDS,
  cols: { throw: 'The throw', bounce: 'The bounce' },
  rows: [
    { title: 'What to watch, and what to ask',
      fields: [
        { key: 'n', label: 'Impacts to watch', placeholder: '2', hint: `“Until it hits the ground for the second time” is 2. Up to ${MAX_IMPACTS}.` },
        { key: 'y', label: 'A height to ask about (m)', placeholder: '—', hint: 'Every time it is there: B in the paper. Optional.' },
        { key: 'stop', type: 'choice', label: 'Stop the run',
          options: [{ v: 'y', label: 'there, after the bounce' }],
          hint: 'The first time it reaches that height after the first impact: for a sketch “until it first passes B”. Otherwise it stops at the last impact.' },
      ] },
    { title: 'Which way is positive',
      fields: [
        { key: 'axis', type: 'choice', label: 'Sign convention',
          options: [{ v: 'up', label: 'Up is positive' }, { v: 'down', label: 'Down is positive' }],
          hint: 'Use the paper’s, for its velocity–time graph. Blank is up.' },
      ] },
  ],
  g: [9.8, 9.81, 10],
  hides: { shows: ['components', 'range', 'ruler'], extras: ['energy'], bounce: true },

  read(vals) {
    const k = {};
    for (const key of ['start', 'h', 'U', 'V', 'w', 'H', 'e', 'n', 'y', 'stop', 'axis']) k[key] = vals[key];
    k.g = vals.g;
    return k;
  },
  solve: solveBounce,
  working: (solved) => bounceWorking(solved),
  render: stage.render,

  /** The readouts: height, and the velocity and acceleration in the chosen convention. */
  hud(f, t) {
    const s = f.at(t), pos = f.sign > 0 ? 'up' : 'down';
    const hits = f.impacts.filter((x) => t >= x.t - 1e-9).length;
    return {
      left: [
        { k: 'Height', v: fmt(s.y, 2), unit: 'm', hue: 'disp' },
        { k: `Velocity, ${pos} positive`, v: fmt(s.v, 2), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Acceleration', v: tr(s.a), unit: 'm s⁻²', hue: 'acc' },
      ],
      right: [{ k: 'Time', v: fmt(t, 2), unit: 's' }, { k: 'Impacts', v: String(hits), unit: `of ${f.impacts.length}` }],
    };
  },

  /* The three graphs. Everything is vertical, so every line is solid (rule 2).
     The velocity jumps at each impact — drawn as the papers sketch it, the
     line stopping and starting again with an upright between in the neutral
     axis colour (a jump, not a horizontal velocity, so not the velocity hue);
     the convention is a note that outranks every label on it but the title; the value
     at the start, either side of the first impact and at the end are named.
     The acceleration is g throughout, broken only at the instants of impact,
     where the model says nothing. */
  graphs(f, t, P) {
    const tMax = f.tMax, J = f.jumps, pos = f.sign > 0 ? 'up' : 'down';
    const e = tMax * 1e-6;
    const first = f.impacts[0] && f.impacts[0].t < tMax - 1e-9 ? f.impacts[0] : null;
    const vPts = [];
    for (const x of f.impacts.filter((q) => q.t < tMax - 1e-9)) {
      const before = f.at(x.t - e).v, after = f.at(x.t + e).v;
      // each value named beside its ring, the lower one from above so it stays off the time axis
      const lab = (v, o) => (x === first ? { label: tr(v), dy: v < o ? -16 : 16 } : {});
      vPts.push({ t: x.t, y: before, color: P.mark, ...lab(before, after) },
                { t: x.t, y: after, color: P.mark, ...lab(after, before) });
    }
    // the value it starts at and the value it ends at, named as the sketches name them
    const v0 = f.at(0).v, vEnd = f.at(tMax).v;
    if (Math.abs(v0) > 1e-9) vPts.push({ t: 0, y: v0, color: P.mark, label: tr(v0), dx: 12, dy: v0 > 0 ? -14 : 14 });
    vPts.push({ t: tMax, y: vEnd, color: P.mark, label: tr(vEnd), dy: vEnd > 0 ? 16 : -16 });
    const cross = (fn) => f.crossings.filter((c) => c.dir !== 'start').map((c) => ({ t: c.t, y: fn(c.t), color: P.mark }));
    return [
      { canvas: 'g-s', title: 'Height–time', unit: 'm', tMax, t,
        series: [{ label: 'height', fn: (tt) => f.at(tt).y, color: P.disp, dash: null }],
        points: cross((tt) => f.at(tt).y) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t, note: `${pos} is positive`, notePri: 8,
        series: [{ label: 'velocity', fn: (tt) => f.at(tt).v, color: P.vel, dash: null, jumps: J }],
        points: [...vPts, ...cross((tt) => f.at(tt).v)] },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: [{ label: 'acceleration', fn: (tt) => f.at(tt).a, color: P.acc, dash: null, breaks: J }],
        note: J.length ? 'g between impacts' : '' },
    ];
  },

  /** The card's sketch: its height against time, the impacts ringed. */
  thumb(s) {
    const r = solveBounce(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    return stage.sketch(r.f);
  },

  /** The end of the run: each impact in a row, and what was assumed. */
  ending(solved) {
    const { impacts, stopAt, crossings, params: { y }, sign } = solved;
    const last = impacts[impacts.length - 1];
    const cell = (x) => `<b>${sf(x)}</b>`;
    const rows = impacts.map((x, i) => {
      const leaves = x.t < solved.f.tMax - 1e-9;
      return `
        <div class="ph-row" role="row" data-key="stage">
          <span class="ph-name" role="cell"><b>${ordinal(x.k)[0].toUpperCase()}${ordinal(x.k).slice(1)} impact</b><em>${i === 0 ? 'from the start' : `after the ${ordinal(x.k - 1)} bounce`}</em></span>
          <span role="cell">${cell(x.t)}</span><span role="cell">${cell(x.vIn)}</span>
          <span role="cell">${leaves || !stopAt ? cell(x.vOut) : '—'}</span><span role="cell">${leaves ? cell(x.H) : '—'}</span>
          <span role="cell">${i < impacts.length - 1 ? cell(x.gap) : '—'}</span>
        </div>`;
    }).join('');
    const table = `
      <div class="ph-tab" role="table" aria-label="Each impact: when, how fast in and out, how high it rises after, and how long until the next">
        <div class="ph-head" role="row">
          <span role="columnheader">Impact</span>
          <span role="columnheader">${M`t`}</span><span role="columnheader">in</span>
          <span role="columnheader">out</span><span role="columnheader">rises to</span>
          <span role="columnheader">to next</span>
        </div>${rows}
        <p class="ph-units">${M`t`} in ${M`[s]`} from the start; “in” and “out” are the speeds just before and just
          after, in ${M`[m s^-1]`} — sizes, so the same in either convention; “rises to” is the greatest height after it, in
          ${M`[m]`}; “to next” is the time in the air until the next impact, in ${M`[s]`}. All to three significant figures.</p>
      </div>`;
    const conv = sign > 0 ? 'up' : 'down';
    // every time it is at the height asked about, said in full
    const way = { up: 'going up', down: 'coming down', top: 'at the top' };
    const at = crossings.filter((c) => c.dir !== 'start').map((c) => (c.after === 0
      ? `${sf(c.t)} <span class="u">s</span> after it set off, ${way[c.dir]}`
      : `${sf(c.since)} <span class="u">s</span> after the ${ordinal(c.after)} impact, ${way[c.dir]}`));
    const atB = y == null ? '' : `<p>At ${tr(y)} <span class="u">m</span> up: ${at.length ? at.join('; ') : 'never, in this run'}.</p>`;
    // the eyebrow is set in capitals, so its unit is wrapped to stay a unit
    if (stopAt) {
      return {
        eyebrow: `Stopped as it first reaches ${tr(y)} <span class="u">m</span> up after the bounce`,
        title: `${tr(y)} m up again, ${sf(stopAt.since)} s after the bounce.`,
        body: `<p>Each flight is SUVAT with the one acceleration ${M`g`}; the bounce is what you gave it, and takes
            no time. On the velocity–time graph, with ${conv} positive, the line stops at the impact and starts again on the
            other side of zero — a jump, not a slope.</p>${atB}${table}`,
        real: true,
      };
    }
    return {
      eyebrow: `Watched to the ${ordinal(last.k)} impact`,
      title: `It hits the ground the ${ordinal(last.k)} time ${sf(last.t)} s after it set off.`,
      body: `<p>Each flight is SUVAT with the one acceleration ${M`g`}; the bounce is what you gave it, and takes
          no time. On the velocity–time graph, with ${conv} positive, every impact is a jump from one side of zero
          to the other, and every flight between is a straight line of gradient ${M`${conv === 'up' ? '-' : ''}g`}.</p>${atB}${table}`,
      real: true,
    };
  },
};
