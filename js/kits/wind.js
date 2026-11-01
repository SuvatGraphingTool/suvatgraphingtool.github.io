// kits/wind.js — an aircraft flying through moving air, wired for the app.
// The engine is js/core/wind.js and the stage js/render/wind.js (from above,
// the velocity triangle on a card). See design/components.md.

import { solveWind, windWorking } from '../core/wind.js';
import * as stage from '../render/wind.js';
import { T, num } from '../notation.js';

const three = (b) => String(Math.round(b) % 360).padStart(3, '0');

export const wind = {
  id: 'wind',
  verb: 'Fly',
  voice: {
    h: 'Flying in a wind',
    sub: 'An aircraft’s velocity through the air plus the wind’s gives its velocity over the ground. Give its air speed and heading — or the track it must keep — and the wind, and the engine finds the speed and bearing over the ground.',
  },
  fields: [
    { key: 'V', col: 'plane', label: 'Speed through the air (m s⁻¹)', placeholder: '—', hint: '' },
    { key: 'heading', col: 'plane', label: 'Heading, a bearing (°)', placeholder: '—', hint: 'Due north is 0, due east 90.' },
    { key: 'track', col: 'plane', label: 'Or the track it must keep (°)', placeholder: '—', hint: 'Finds the heading.' },
    { key: 'W', col: 'air', label: 'Wind speed (m s⁻¹)', placeholder: '—', hint: '' },
    { key: 'wind', col: 'air', label: 'The air moves towards (°)', placeholder: '—', hint: '“Moving due east” is 90.' },
  ],
  cols: { plane: 'The aircraft', air: 'The air' },
  rows: [],
  hides: { shows: ['apex', 'ruler', 'range', 'grid', 'components'], extras: ['energy'], bounce: true },

  read(v) { return { V: v.V, heading: v.heading, track: v.track, W: v.W, wind: v.wind }; },
  solve: solveWind,
  working: (solved) => windWorking(solved),
  render: stage.render,

  hud(f, t) {
    const p = f.pos(t);
    return {
      left: [
        { k: 'East of the start', v: num(p.x, 0), unit: 'm', hue: 'disp' },
        { k: 'North of the start', v: num(p.y, 0), unit: 'm', hue: 'disp' },
        { k: 'Speed over the ground', v: num(f.R, 1), unit: 'm s⁻¹', hue: 'vel' },
        { k: 'Bearing over the ground', v: three(f.rb), unit: '°', hue: 'vel' },
      ],
      right: [{ k: 'Time', v: num(t, 1), unit: 's' }],
    };
  },

  /* East dashed (horizontal), north solid (vertical) — rule 2. */
  graphs(f, t, P) {
    const two = (fx, fy, c) => [
      { label: 'east', tag: T`x`, fn: fx, color: c, dash: [6, 4] },
      { label: 'north', tag: T`y`, fn: fy, color: c, dash: null },
    ];
    return [
      { canvas: 'g-s', title: 'Displacement–time', unit: 'm', tMax: f.tMax, t, series: two((tt) => f.pos(tt).x, (tt) => f.pos(tt).y, P.disp) },
      { canvas: 'g-v', title: 'Velocity–time', unit: 'm s⁻¹', tMax: f.tMax, t, series: two(() => f.vx, () => f.vy, P.vel) },
      { canvas: 'g-a', title: 'Acceleration–time', unit: 'm s⁻²', tMax: f.tMax, t, series: two(() => 0, () => 0, P.acc) },
    ];
  },

  thumb() {
    return `<svg viewBox="0 0 120 60" aria-hidden="true">
      <rect x="0" y="0" width="120" height="60" fill="#b4b07a"/><ellipse cx="30" cy="20" rx="18" ry="7" fill="#000" opacity="0.12"/>
      <path d="M60 50 l6 -30" stroke="var(--disp)" stroke-width="1.4" stroke-dasharray="3 3"/>
      <path d="M62 30 v-14 M56 24 h12 M59 34 h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M80 44 h18" stroke="var(--vel)" stroke-width="1.6" stroke-dasharray="4 3"/>
    </svg>`;
  },

  ending(s) {
    return {
      eyebrow: s.given === 'heading' ? 'Over the ground' : 'The heading that holds the track',
      title: s.given === 'heading' ? `${num(s.R, 1)} m s⁻¹ on a bearing of ${three(s.bearing)}°.` : `Head ${three(s.heading)}°; over the ground ${num(s.R, 1)} m s⁻¹.`,
      body: `${s.notes.map((x) => `<p>${x}</p>`).join('')}`,
      real: true,
    };
  },
};
