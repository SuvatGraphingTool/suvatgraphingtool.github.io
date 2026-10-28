// kits/plane.js — a particle moving in a plane with a constant acceleration
// vector, wired for the app. The engine is js/core/plane.js and the stage
// js/render/vectors.js; this file says which boxes to show, reads them, and
// lays out what the engine answered (rule 4). See design/components.md.

import { solvePlane, planeWorking, COMPASS, vsrc } from '../core/plane.js';
import * as stage from '../render/vectors.js';
import { timeLapse } from '../core/pace.js';
import { M, T, num } from '../notation.js';

const tr = (x, p) => num(x, p ?? (x !== 0 && Math.abs(x) < 1 ? 4 : 3), { trim: true });
const part = (key, col, c, unit, hint) => ({ key, col, label: `${c === 'x' ? `${M`vec i`} part` : `${M`vec j`} part`} (${unit})`, placeholder: '—', hint });

const FIELDS = [
  part('r0.x', 'r0', 'x', 'm', 'Blank is 0: it starts at O.'), part('r0.y', 'r0', 'y', 'm', `East is ${M`vec i`}, north is ${M`vec j`}.`),
  part('u.x', 'u', 'x', 'm s⁻¹', `For ${M`-vec(i) + 3vec(j)`}, type −1 here …`), part('u.y', 'u', 'y', 'm s⁻¹', '… and 3 here.'),
  part('a.x', 'a', 'x', 'm s⁻²', `For ${M`0.1vec(i) - 0.2vec(j)`}, 0.1 here …`), part('a.y', 'a', 'y', 'm s⁻²', '… and −0.2 here. 0 if it has none.'),
];

const compass = (key, label, hint) => ({
  key, type: 'choice', label, hint,
  options: Object.entries(COMPASS).map(([v, c]) => ({ v, label: c.word.replace(/^./, (x) => x.toUpperCase()) })),
});

export const plane = {
  id: 'plane',
  verb: 'Set it moving',
  voice: {
    h: 'What does the paper give, as vectors?',
    sub: `A particle moving in a plane: ${M`vec i`} is east and ${M`vec j`} is north. Give where it starts, `
      + `its velocity and its acceleration as their two parts — then what the paper asks: a time, a direction, `
      + 'a coordinate or a speed.',
  },
  fields: FIELDS,
  cols: { r0: 'Starts at', u: 'Initial velocity', a: 'Acceleration' },
  rows: [
    { title: 'Or a velocity at a later time, if the paper gives that instead',
      fields: [
        { key: 'vT.x', label: `${M`vec i`} part (m s⁻¹)`, placeholder: '—', hint: 'Leave the initial velocity blank above.' },
        { key: 'vT.y', label: `${M`vec j`} part (m s⁻¹)`, placeholder: '—', hint: 'Its velocity at that time.' },
        { key: 'T', label: 'At time (s)', placeholder: '—', hint: 'When it has that velocity.' },
      ] },
    { title: 'What the paper asks',
      fields: [
        { key: 'at.t', label: 'At time (s)', placeholder: '—', hint: 'Its velocity, speed and position then.' },
        { key: 'at.x', label: `When ${M`x`} is (m)`, placeholder: '—', hint: `It passes a point with this ${M`vec i`} part.` },
        { key: 'at.y', label: `When ${M`y`} is (m)`, placeholder: '—', hint: `… or with this ${M`vec j`} part.` },
        { key: 'at.speed', label: 'When its speed is (m s⁻¹)', placeholder: '—', hint: 'Often twice.' },
      ] },
    { title: 'Directions', fields: [
      compass('at.moving', 'When it is moving', 'Its velocity points that way.'),
      compass('at.due', 'When it is due … of O', 'It is in that direction from the origin.'),
    ] },
    { title: 'Or moving parallel to a vector', fields: [
      { key: 'par.x', label: `${M`vec i`} part`, placeholder: '—', hint: `For “parallel to ${M`vec(i) + 2vec(j)`}”, 1 here …` },
      { key: 'par.y', label: `${M`vec j`} part`, placeholder: '—', hint: '… and 2 here.' },
    ] },
  ],
  // the grid is the map's own, always drawn: a switch for it would do nothing
  hides: { shows: ['apex', 'ruler', 'range', 'grid'], extras: ['energy'], bounce: true },
  lapse: (f) => timeLapse(f.tMax),

  read(vals) {
    const v = (n) => ({ x: vals[`${n}.x`], y: vals[`${n}.y`] });
    return { r0: v('r0'), u: v('u'), a: v('a'), vT: v('vT'), T: vals.T,
             at: { t: vals['at.t'], x: vals['at.x'], y: vals['at.y'], speed: vals['at.speed'], moving: vals['at.moving'], due: vals['at.due'],
                   par: { x: vals['par.x'], y: vals['par.y'] } } };
  },
  solve: solvePlane,
  working: (solved) => planeWorking(solved),
  render: stage.render,

  hud(f, t, { rate = 1 } = {}) {
    const r = f.r(t), v = f.vel(t), lapse = timeLapse(f.tMax);
    return {
      left: [
        { k: 'Position', v: T`${vsrc(r, 2)}`, unit: 'm', hue: 'disp' },
        { k: 'Distance from O', v: num(f.dist(t), 2), unit: 'm', hue: 'disp' },
        { k: 'Velocity', v: T`${vsrc(v, 2)}`, unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Speed', v: num(f.speed(t), 2), unit: 'm s⁻¹', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 2), unit: 's' },
              ...(lapse > 1 ? [{ k: 'Time-lapse', v: `${num(rate * lapse, 1, { trim: true })}×`, unit: 'real time' }] : [])],
    };
  },

  /* Each graph has its two components: the i part dashed and the j part
     solid — east is across the page, north up it, as on the stage (rule 2). */
  graphs(f, t, P) {
    const tMax = f.tMax;
    // a ring marks a moment; an answer that holds the whole time has none
    const rings = (f.answers || []).filter((a) => a.ok && !a.always).flatMap((a) => a.times || [a.t]);
    const pair = (fx, fy, c) => [
      { label: 'i part', tag: T`vec(i)`, fn: fx, color: c, dash: [6, 4] },
      { label: 'j part', tag: T`vec(j)`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Position–time', unit: 'm', tMax, t,
        series: pair((tt) => f.r(tt).x, (tt) => f.r(tt).y, P.disp),
        points: rings.flatMap((ta) => [{ t: ta, y: f.r(ta).x, color: P.mark }, { t: ta, y: f.r(ta).y, color: P.mark }]) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax, t,
        series: pair((tt) => f.vel(tt).x, (tt) => f.vel(tt).y, P.vel),
        points: rings.flatMap((ta) => [{ t: ta, y: f.vel(ta).x, color: P.mark }, { t: ta, y: f.vel(ta).y, color: P.mark }]) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax, t,
        series: pair(() => f.a.x, () => f.a.y, P.acc) },
    ];
  },

  /** The card's sketch: the path from O, seen from above, and north. */
  thumb(s) {
    const r = solvePlane(s.params);
    if (!r.ok) return '<svg viewBox="0 0 120 60" aria-hidden="true"></svg>';
    const pts = r.f.path(40);
    const xs = [0, ...pts.map((p) => p.x)], ys = [0, ...pts.map((p) => p.y)];
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min(90 / (x1 - x0 || 1), 46 / (y1 - y0 || 1));
    const X = (x) => 14 + (x - x0) * k, Y = (y) => 53 - (y - y0) * k;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <line x1="${X(x0).toFixed(1)}" y1="${Y(0).toFixed(1)}" x2="${X(x1).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
      <line x1="${X(0).toFixed(1)}" y1="${Y(y0).toFixed(1)}" x2="${X(0).toFixed(1)}" y2="${Y(y1).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
      <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="${X(0).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="2.4" fill="var(--card)" stroke="var(--vel)" stroke-width="1.5"/>
      <path d="M110 18 L110 6 M106 10 L110 5 L114 10" fill="none" stroke="var(--ink-faint)" stroke-width="1.4"/>
    </svg>`;
  },

  /* The title is plain text, so it says the headline in words and numbers;
     the eyebrow and the body carry the maths. */
  ending(solved) {
    const ok = solved.answers.filter((a) => a.ok), asked = solved.answers.length;
    const head = (a) => {
      // plain text: a compass word, or the vector in Unicode bold italic
      const w = a.D ? (a.D.src ? a.D.plain : a.D.word) : '';
      if (a.always) {
        if (a.kind === 'moving') return `Moving ${w} ${a.until != null ? `until ${tr(a.until)} s` : a.t > 0 ? `from ${tr(a.t)} s on` : 'the whole time'}.`;
        if (a.kind === 'due') return `${a.D.src ? 'In that direction from' : `Due ${w} of`} O${a.short && /until/.test(a.short) ? ', until it comes back' : ''}.`;
        if (a.kind === 'passes') return `${a.c} = ${tr(a.X)} the whole time.`;
        if (a.kind === 'speed') return `${tr(a.S)} m s⁻¹ the whole time.`;
      }
      if (a.kind === 'moving') return `${a.D.src ? `${w.replace(/^./, (c) => c.toUpperCase())}` : `Moving ${w}`} at ${tr(a.t)} s, at ${tr(a.speed)} m s⁻¹, ${tr(a.dist)} m from O.`;
      if (a.kind === 'due') return `Due ${w} of O at ${tr(a.t)} s, ${tr(a.dist)} m away.`;
      if (a.kind === 'passes') return `${a.c} = ${tr(a.X)} at ${tr(a.t)} s.`;
      if (a.kind === 'speed') return `${tr(a.S)} m s⁻¹ at ${tr(a.t)} s.`;
      return `At ${tr(a.t)} s: ${tr(a.speed)} m s⁻¹, ${tr(a.dist)} m from O.`;
    };
    const u = solved.u;
    const title = solved.pre.length && !ok.length ? `Initially ${tr(Math.hypot(u.x, u.y))} m s⁻¹.`
      : ok.length ? head(ok[ok.length - 1]) : asked ? 'None of those happens.' : 'Its path, from O.';
    return {
      eyebrow: asked ? `${asked} ${asked === 1 ? 'question' : 'questions'} asked · ${ok.length} answered` : 'Its path, from O',
      title,
      body: `<p>Each answer is two SUVAT equations — one for the ${M`vec i`} parts, one for the ${M`vec j`} parts —
          or one relation between them, solved for ${M`t`}.</p>${solved.notes.map((n) => `<p>${n}</p>`).join('')}`,
      real: true,
    };
  },
};
