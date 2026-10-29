// collide.js — the stage for two particles on a horizontal surface, each with
// its own constant acceleration: an ice rink seen from above at one scale both
// ways, i across and j up, O and the axes laid on the ice.
//
// THE PLACE. The paper's "smooth horizontal surface" is drawn as rink ice that
// fills the whole stage: night ice under arena lights in the dark theme, pale
// morning ice in the light one, with skate scratches, the lights' reflections,
// and the boards round the edge throwing a soft shadow onto it. The i and j
// grid is etched faintly into the ice; the axes through O lie on top.
//
// THE OBJECTS. Each particle is an ice-hockey puck from above — vulcanised
// black rubber with a knurled rim, a printed centre in its own colour (A the
// displacement hue its path is drawn in, B the second-object magenta) and its
// letter on it, so no letter label can pile up where they meet. Its velocity
// now is an arrow in the velocity hue for both (rule 2: colour is the
// quantity). Each path faintly in full, strongly so far.
//
// THE MOMENT. At the engine's collision time (f.tc, the end of the run) the
// two pucks meet rim to rim, the ice flashes and sprays, a ring spreads, and a
// contact mark stays on the ice with the time and the position vector. The
// pucks are discs drawn about points; so that two discs never sit on top of
// each other, when they are within a puck's width they are drawn pressed rim
// to rim along the line they close on — a drawing offset of at most a radius,
// never a number: the mark and every label sit at the engine's own point.
// At the asked time each one's position is pinned, with a key on the screen.
//
// Everything drawn is read from js/core/collide.js (rule 4).

import { flash, pulse, phaseOf, ageOf } from './effects.js';
import { env, rng, softShadow } from './scenery.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, niceStep, fmt, withAlpha, unview } from './util.js';
import { vsrc } from '../core/plane.js';
import { T, num } from '../notation.js';

const HUD = 250, HUD_H = 290, TAU = Math.PI * 2;
/** Three significant figures, trailing zeros dropped (14 → 14, 9.6923 → 9.69). */
const s3 = (x) => {
  if (!isFinite(x) || Math.abs(x) < 1e-12) return num(0, 0);
  return num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))), { trim: true });
};
const r3 = (x) => (Math.abs(x) < 1e-12 ? 0 : Number(x.toPrecision(3)));

/* ── the rink ──────────────────────────────────────────────────────────── */

function rink(g, w, h) {
  const E = env(), night = E.night, R = rng(41);
  // the arena floor beyond the boards
  g.fillStyle = night ? '#141317' : '#8d8a87'; g.fillRect(0, 0, w, h);
  const m = 7, rad = Math.min(64, Math.min(w, h) * 0.14), bw = 9;
  const ix = m + bw, iy = m + bw, iw = w - 2 * (m + bw), ih = h - 2 * (m + bw);
  // the boards: a cream cap with a darker outer lip, seen from above
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
  g.fillStyle = night ? '#7d7672' : '#f1ebe2'; g.beginPath(); g.roundRect(m, m, w - 2 * m, h - 2 * m, rad + bw); g.fill();
  g.restore();
  g.strokeStyle = night ? '#57504d' : '#c9bfb2'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(m + 0.75, m + 0.75, w - 2 * m - 1.5, h - 2 * m - 1.5, rad + bw); g.stroke();
  // the ice
  g.save(); g.beginPath(); g.roundRect(ix, iy, iw, ih, rad); g.clip();
  const base = g.createLinearGradient(0, iy, 0, iy + ih);
  base.addColorStop(0, night ? '#3a4b56' : '#f3f8fa'); base.addColorStop(0.55, night ? '#304049' : '#e4eef3'); base.addColorStop(1, night ? '#26343d' : '#d2e0e8');
  g.fillStyle = base; g.fillRect(ix, iy, iw, ih);
  // cloudy depth in the ice: wide soft patches, a little lighter and a little bluer
  for (let i = 0; i < 9; i++) {
    const cx = ix + R() * iw, cy = iy + R() * ih, rr = 80 + R() * 180;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
    const tone = R() < 0.5 ? (night ? 'rgba(120,160,185,' : 'rgba(255,255,255,') : (night ? 'rgba(10,20,30,' : 'rgba(150,185,205,');
    gr.addColorStop(0, tone + (night ? 0.10 : 0.30) + ')'); gr.addColorStop(1, tone + '0)');
    g.fillStyle = gr; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  // skate scratches: long shallow arcs, mostly with the length of the rink
  g.lineCap = 'round';
  for (let i = 0; i < Math.round((iw * ih) / 2600); i++) {
    const cx = ix + R() * iw, cy = iy + R() * ih, len = 30 + R() * 140, a = (R() - 0.5) * 1.3 + (R() < 0.5 ? 0 : Math.PI / 2) * 0.35;
    const bend = (R() - 0.5) * 0.6, dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    g.strokeStyle = night ? `rgba(200,225,240,${0.05 + R() * 0.07})` : R() < 0.6 ? `rgba(255,255,255,${0.35 + R() * 0.35})` : `rgba(120,150,170,${0.1 + R() * 0.14})`;
    g.lineWidth = 0.6 + R() * 0.9;
    g.beginPath(); g.moveTo(cx - dx, cy - dy); g.quadraticCurveTo(cx - dy * bend * 2, cy + dx * bend * 2, cx + dx, cy + dy); g.stroke();
  }
  // the arena lights, reflected: soft bright pools in a row
  const n = Math.max(2, Math.round(iw / 300));
  for (let i = 0; i < n; i++) {
    const cx = ix + iw * (i + 0.5) / n + (R() - 0.5) * 40, cy = iy + ih * (0.28 + R() * 0.12);
    g.save(); g.translate(cx, cy); g.scale(1, 0.55);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 120);
    gr.addColorStop(0, night ? 'rgba(255,240,222,0.22)' : 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill(); g.restore();
  }
  // the boards' shadow on the ice, strongest under the far (top and left) boards
  const sh = 22;
  for (const [x0, y0, x1, y1, a] of [[ix, iy, ix, iy + sh, 0.5], [ix, iy, ix + sh, iy, 0.42], [ix, iy + ih, ix, iy + ih - sh * 0.6, 0.22], [ix + iw, iy, ix + iw - sh * 0.6, iy, 0.22]]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, `rgba(0,0,0,${night ? a : a * 0.45})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  }
  // the snow the skates push against the boards: a ragged pale band round the edge
  g.save(); g.beginPath(); g.roundRect(ix, iy, iw, ih, rad); g.roundRect(ix + 13, iy + 13, iw - 26, ih - 26, Math.max(0, rad - 13)); g.clip('evenodd');
  for (let i = 0; i < Math.round((iw + ih) * 1.1); i++) {
    const side = R(), u = R(), d = Math.pow(R(), 1.8) * 14;
    const px = side < 0.5 ? ix + u * iw : (side < 0.75 ? ix + d : ix + iw - d), py = side < 0.25 ? iy + d : side < 0.5 ? iy + ih - d : iy + u * ih;
    g.fillStyle = night ? `rgba(225,236,244,${0.05 + R() * 0.08})` : `rgba(255,255,255,${0.3 + R() * 0.35})`;
    g.beginPath(); g.arc(px, py, 0.8 + R() * 1.8, 0, TAU); g.fill();
  }
  g.restore();
  g.restore();
  // the ice's edge against the boards: a crisp white kick line
  g.strokeStyle = night ? 'rgba(236,230,222,0.55)' : 'rgba(255,255,255,0.95)'; g.lineWidth = 1.4;
  g.beginPath(); g.roundRect(ix, iy, iw, ih, rad); g.stroke();
  // the stanchions of the glass along the boards
  g.fillStyle = night ? '#48423f' : '#b2a797';
  for (let x = ix + rad; x < ix + iw - rad; x += 84) for (const y of [m + 2, h - m - 6]) g.fillRect(x, y, 3, 4);
  for (let y = iy + rad; y < iy + ih - rad; y += 84) for (const x of [m + 2, w - m - 6]) g.fillRect(x, y, 4, 3);
  return { ix, iy, iw, ih, rad };
}

/* ── the puck ──────────────────────────────────────────────────────────── */

/** An ice-hockey puck seen from above at (x, y), r px in radius: black rubber
    with a knurled rim and a highlight, its centre printed in `color`, and its
    letter on it when there is room (r ≥ 11). A soft shadow under it. */
export function puck(g, x, y, r, color, P, letter = null) {
  softShadow(g, x + r * 0.22, y + r * 0.42, r * 1.3, r * 0.95, 0.75);
  g.save();
  // the side of the puck, just showing below the face
  g.fillStyle = '#060607'; g.beginPath(); g.arc(x, y + r * 0.12, r, 0, TAU); g.fill();
  // the face
  const fc = g.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x, y, r);
  fc.addColorStop(0, '#55555c'); fc.addColorStop(0.45, '#26262b'); fc.addColorStop(1, '#101013');
  g.fillStyle = fc; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  // the knurled rim
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
  const nk = Math.max(16, Math.round(r * 2.2));
  for (let i = 0; i < nk; i++) {
    const a = (i / nk) * TAU;
    g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.84, y + Math.sin(a) * r * 0.84); g.lineTo(x + Math.cos(a) * r * 0.97, y + Math.sin(a) * r * 0.97); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r - 0.6, 0, TAU); g.stroke();
  // the printed centre, in the puck's own colour
  const ci = g.createRadialGradient(x - r * 0.2, y - r * 0.25, 0, x, y, r * 0.66);
  ci.addColorStop(0, mix(color, '#ffffff', 0.35)); ci.addColorStop(1, color);
  g.fillStyle = ci; g.beginPath(); g.arc(x, y, r * 0.64, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.stroke();
  // the light catching the near edge
  g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1.4, r * 0.12); g.lineCap = 'round';
  g.beginPath(); g.arc(x, y, r * 0.88, Math.PI * 1.08, Math.PI * 1.42); g.stroke();
  if (letter && r >= 11) {
    g.font = `800 ${Math.max(13, Math.round(r * 0.95))}px ${fontOf()}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(letter, x, y + 0.5);
    g.fillStyle = '#ffffff'; g.fillText(letter, x, y + 0.5);
  }
  g.restore();
}

function fontOf() {
  try { return getComputedStyle(document.documentElement).getPropertyValue('--font').trim() || 'system-ui, sans-serif'; } catch { return 'system-ui, sans-serif'; }
}

/** Two #rrggbb colours mixed, u of the way from a to b. */
function mix(a, b, u) {
  const p = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(String(c).trim()); return m ? [0, 8, 16].map((s) => (parseInt(m[1], 16) >> (16 - s)) & 255) : null; };
  const A = p(a), B = p(b); if (!A || !B) return a;
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * u)).join(',')})`;
}

/** Chips of ice thrown out from (x, y) at a collision, glinting and settling. */
function iceSpray(g, x, y, age, life) {
  const u = phaseOf(age, life); if (u == null) return;
  const R = rng(57), e = 1 - (1 - u) ** 3;
  g.save();
  for (let i = 0; i < 22; i++) {
    const a = R() * TAU, sp = 26 + R() * 46, s = 1.5 + R() * 2.4;
    const px = x + Math.cos(a) * sp * e, py = y + Math.sin(a) * sp * e;
    g.fillStyle = `rgba(240,250,255,${0.9 * (1 - u)})`;
    g.save(); g.translate(px, py); g.rotate(a + u * 3);
    g.beginPath(); g.moveTo(-s, 0); g.lineTo(0, -s * 0.6); g.lineTo(s, 0); g.lineTo(0, s * 0.6); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}

/** The pin for where one is at the asked time: a solid map pin in its colour. */
function pin(g, x, y, color) {
  softShadow(g, x + 3, y + 2, 7, 3, 0.7);
  g.save();
  g.fillStyle = color; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y - 9); g.arc(x, y - 12, 6, Math.PI * 0.8, Math.PI * 0.2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y - 12, 2.2, 0, TAU); g.fill();
  g.restore();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'collide') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), E = env();
  const L = labels(), held = [];
  const reserve = (b) => { held.push(b); L.reserve(b); };
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const phone = w < 520;

  // ── the frame: both paths and O, one scale both ways
  const n = 120, pa = [], pb = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; pa.push(f.posA(tt)); pb.push(f.posB(tt)); }
  const all = [...pa, ...pb, { x: 0, y: 0 }];
  let x0 = Math.min(...all.map((p) => p.x)), x1 = Math.max(...all.map((p) => p.x)), y0 = Math.min(...all.map((p) => p.y)), y1 = Math.max(...all.map((p) => p.y));
  const span = Math.max(x1 - x0, y1 - y0, 1);
  x0 -= span * 0.08; x1 += span * 0.08; y0 -= span * 0.08; y1 += span * 0.08;
  const left = phone ? 34 : HUD + 40, right = w - (phone ? 34 : 60), top = phone ? 112 : 64, bottom = h - (phone ? (f.at != null ? 72 : 40) : 46);
  const k = Math.min((right - left) / (x1 - x0), (bottom - top) / (y1 - y0));
  const ox = left + ((right - left) - (x1 - x0) * k) / 2, oy = top + ((bottom - top) - (y1 - y0) * k) / 2;
  const X = (x) => ox + (x - x0) * k, Y = (y) => oy + (y1 - y) * k;
  const Xi = (px) => x0 + (px - ox) / k, Yi = (py) => y1 - (py - oy) / k;

  // ── the rink fills the stage; the grid is etched into it, the axes lie on top
  const ice = rink(g, w, h);
  const step = niceStep(Math.max(x1 - x0, y1 - y0), 8);
  const gx0 = Xi(ice.ix), gx1 = Xi(ice.ix + ice.iw), gy0 = Yi(ice.iy + ice.ih), gy1 = Yi(ice.iy);
  const etch = E.night ? 'rgba(200,225,240,0.13)' : 'rgba(70,105,130,0.17)';
  g.save(); g.beginPath(); g.roundRect(ice.ix, ice.iy, ice.iw, ice.ih, ice.rad); g.clip();
  for (let x = Math.ceil(gx0 / step) * step; x <= gx1; x += step) stroke(g, [{ x: X(x), y: ice.iy }, { x: X(x), y: ice.iy + ice.ih }], { color: etch, width: 1 });
  for (let y = Math.ceil(gy0 / step) * step; y <= gy1; y += step) stroke(g, [{ x: ice.ix, y: Y(y) }, { x: ice.ix + ice.iw, y: Y(y) }], { color: etch, width: 1 });
  stroke(g, [{ x: ice.ix, y: Y(0) }, { x: ice.ix + ice.iw, y: Y(0) }], { color: P.axis, width: 1.8 });
  stroke(g, [{ x: X(0), y: ice.iy }, { x: X(0), y: ice.iy + ice.ih }], { color: P.axis, width: 1.8 });
  g.restore();
  // keep labels off the readouts
  if (phone) reserve({ x: 0, y: 0, w, h: 100 });
  else { reserve({ x: 0, y: 0, w: HUD, h: HUD_H }); reserve({ x: w - 160, y: 0, w: 160, h: 64 }); }
  for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step)
    if (Math.abs(x) > 1e-9) L.add(fmt(x, step < 1 ? 1 : 0), X(x), Y(0) + 15, { color: P.muted, align: 'center', pri: 1, size: 13, maxPush: 0 });
  for (let y = Math.ceil(y0 / step) * step; y <= y1 + 1e-9; y += step)
    if (Math.abs(y) > 1e-9) L.add(fmt(y, step < 1 ? 1 : 0), X(0) - 9, Y(y), { color: P.muted, align: 'right', pri: 1, size: 13, maxPush: 0 });
  L.add('O', X(0) - 9, Y(0) + 15, { color: P.ink, align: 'right', pri: 6, size: 15, weight: 700 });
  L.add(T`vec(i) [m]`, ice.ix + ice.iw - 14, Y(0) - 15, { color: P.strong, align: 'right', pri: 5, size: 14, weight: 700, maxPush: 40 });
  L.add(T`vec(j) [m]`, X(0) + 10, Math.max(ice.iy + 16, phone ? 110 : 20), { color: P.strong, align: 'left', pri: 5, size: 14, weight: 700, maxPush: 40 });

  // ── each path, faint in full and strong to now
  const PX = (p) => ({ x: X(p.x), y: Y(p.y) });
  const casing = E.night ? 'rgba(10,16,22,0.55)' : 'rgba(255,255,255,0.75)';
  const cA = P.disp, cB = P.second;
  const track = (pts, pos, color) => {
    const full = pts.map(PX);
    stroke(g, full, { color, width: 2, alpha: 0.42 });
    const so = []; for (let i = 0; i <= 60; i++) so.push(PX(pos((i / 60) * t)));
    stroke(g, so, { color: casing, width: 6 });
    stroke(g, so, { color, width: 3.2 });
    for (let i = 0; i < full.length; i += 3) reserve({ x: full[i].x - 7, y: full[i].y - 7, w: 14, h: 14 });
  };
  track(pb, f.posB, cB); track(pa, f.posA, cA);

  // ── where the pucks are drawn: at the engine's points, kept rim to rim
  const r = phone ? 14 : 16;
  let qa = PX(f.posA(t)), qb = PX(f.posB(t));
  {
    const tv = f.tc ?? t, va = f.velA(tv), vb = f.velB(tv);
    let nx = va.x - vb.x, ny = -(va.y - vb.y), nl = Math.hypot(nx, ny);
    if (nl < 1e-9) { nx = qb.x - qa.x; ny = qb.y - qa.y; nl = Math.hypot(nx, ny); }
    if (nl > 1e-9 && Math.hypot(qb.x - qa.x, qb.y - qa.y) < 2 * r) {
      nx /= nl; ny /= nl;
      const s = (qb.x - qa.x) * nx + (qb.y - qa.y) * ny, c = (qb.x - qa.x) * -ny + (qb.y - qa.y) * nx;
      const need = Math.sqrt(Math.max(0, 4 * r * r - c * c)), push = Math.max(0, need - s) / 2;
      qa = { x: qa.x - nx * push, y: qa.y - ny * push }; qb = { x: qb.x + nx * push, y: qb.y + ny * push };
    }
  }

  // ── the asked time: where each one was, pinned
  const atShown = f.at != null && t >= f.at - 1e-9 && !(f.tc != null && Math.abs(f.at - f.tc) < 1e-9);
  if (atShown) for (const [pos, c] of [[f.posB, cB], [f.posA, cA]]) {
    const q = PX(pos(f.at)); pin(g, q.x, q.y, c);
    reserve({ x: q.x - 8, y: q.y - 20, w: 16, h: 22 });
  }

  // ── the collision: a flash and spray, a ring, and a mark that stays
  const hit = f.tc != null && t >= f.tc - 1e-9;
  if (hit) {
    const cx = X(f.where.x), cy = Y(f.where.y);
    const { age, life } = ageOf(t, f.tc, f.tMax);
    // the mark on the ice: a scuffed star where they met, and a ring round it
    g.save(); g.strokeStyle = withAlpha(E.night ? '#e8f4fb' : '#6f8a9b', 0.55); g.lineWidth = 1.4; g.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.2, l = (i % 2 ? 0.7 : 1) * r * 1.9; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke(); }
    g.restore();
    pulse(g, cx, cy, age, life, P.mark, { radius: 64 });
    g.save(); g.strokeStyle = casing; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, r * 2.15, 0, TAU); g.stroke();
    g.strokeStyle = P.mark; g.lineWidth = 2.8; g.beginPath(); g.arc(cx, cy, r * 2.15, 0, TAU); g.stroke(); g.restore();
    reserve({ x: cx - r * 2.4, y: cy - r * 2.4, w: r * 4.8, h: r * 4.8 });
  }

  // ── the pucks, with their velocity now (both in the velocity hue)
  const vMax = Math.max(...[0, f.tMax].flatMap((tt) => [f.velA(tt), f.velB(tt)]).map((v) => Math.hypot(v.x, v.y)), 1e-6);
  const ARROW = phone ? 50 : 64;
  for (const [vel, q] of [[f.velB, qb], [f.velA, qa]]) {
    const v = vel(t), sp = Math.hypot(v.x, v.y);
    if (show.velocity === false || sp < 1e-9) continue;
    const len = r + 12 + (sp / vMax) * ARROW, ex = q.x + (v.x / sp) * len, ey = q.y - (v.y / sp) * len;
    arrow(g, q.x, q.y, ex, ey, { color: P.vel, width: 2.8, head: 11 });
    for (let i = 1; i <= 6; i++) { const u = i / 6; reserve({ x: q.x + (ex - q.x) * u - 7, y: q.y + (ey - q.y) * u - 7, w: 14, h: 14 }); }
  }
  puck(g, qb.x, qb.y, r, cB, P, 'B');
  puck(g, qa.x, qa.y, r, cA, P, 'A');
  for (const q of [qa, qb]) reserve({ x: q.x - r - 2, y: q.y - r - 2, w: 2 * r + 4, h: 2 * r + 4 });
  if (hit) {
    const cx = X(f.where.x), cy = Y(f.where.y), { age, life } = ageOf(t, f.tc, f.tMax);
    flash(g, cx, cy, age, life, { radius: 58 });
    iceSpray(g, cx, cy, age, life);
    // the label goes ahead of where they came from, where neither path runs
    const ua = f.velA(f.tc), ub = f.velB(f.tc), la = Math.hypot(ua.x, ua.y) || 1, lb = Math.hypot(ub.x, ub.y) || 1;
    let dx = ua.x / la + ub.x / lb, dy = -(ua.y / la + ub.y / lb); const dl = Math.hypot(dx, dy);
    if (dl < 0.2) { dx = 1; dy = 0; } else { dx /= dl; dy /= dl; }
    const wh = { x: r3(f.where.x), y: r3(f.where.y) };
    const l1 = 'collide at ' + T`t = ${s3(f.tc)} [s]`, l2 = T`(${vsrc(wh)}) [m]`;
    g.save(); g.font = `700 14px ${fontOf()}`; const tw = Math.max(g.measureText(l1).width, g.measureText(l2).width) + 12; g.restore();
    const blocked = phone ? [{ x: 0, y: 0, w, h: 100 }] : [{ x: 0, y: 0, w: HUD, h: HUD_H }, { x: w - 160, y: 0, w: 160, h: 64 }];
    const a0 = Math.atan2(dy, dx), rr = r * 2.6 + 14;
    let best = null;
    for (const ext of [0, 26, 52]) for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.2, -2.2, Math.PI]) {
      if (best) break;
      const ux = Math.cos(a0 + da), uy = Math.sin(a0 + da);
      const al = ux < -0.35 ? 'right' : ux > 0.35 ? 'left' : 'center';
      const ax = cx + ux * (rr + ext), ay = cy + uy * (rr + ext + 10);
      const bx = al === 'left' ? ax : al === 'right' ? ax - tw : ax - tw / 2, box = { x: bx - 8, y: ay - 24, w: tw + 16, h: 48 };
      if (box.x < 8 || box.y < 8 || box.x + box.w > w - 8 || box.y + box.h > h - 8) continue;
      if ([...blocked, ...held].some((q) => box.x < q.x + q.w && box.x + box.w > q.x && box.y < q.y + q.h && box.y + box.h > q.y)) continue;
      best = { ax, ay, al };
    }
    best ??= { ax: cx, ay: cy + rr + 10, al: 'center' };
    L.add(l1, best.ax, best.ay - 10, { color: P.mark, align: best.al, pri: 9, size: 14, weight: 700 });
    L.add(l2, best.ax, best.ay + 10, { color: P.mark, align: best.al, pri: 8, size: 14, weight: 700 });
  }
  L.draw(g, w, h);

  // ── the key, on the screen rather than the ice: what the pins mean
  if (atShown) {
    unview(g);
    const K = labels(), text = 'where each is at ' + T`t = ${s3(f.at)} [s]`;
    g.save(); g.font = `600 14px ${fontOf()}`; const tw = g.measureText(text).width; g.restore();
    const cw = tw + 74, ch = 40, kx = phone ? (w - cw) / 2 : 24, ky = h - ch - (phone ? 12 : 24);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 12; g.shadowOffsetY = 3;
    g.fillStyle = E.night ? '#2a2326' : '#fffaf5'; g.beginPath(); g.roundRect(kx, ky, cw, ch, 9); g.fill(); g.restore();
    g.save(); g.strokeStyle = E.night ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'; g.lineWidth = 1; g.beginPath(); g.roundRect(kx + 0.5, ky + 0.5, cw - 1, ch - 1, 9); g.stroke(); g.restore();
    pin(g, kx + 20, ky + ch / 2 + 9, cA); pin(g, kx + 38, ky + ch / 2 + 9, cB);
    K.add(text, kx + 56, ky + ch / 2, { color: P.ink, align: 'left', pri: 9, size: 14, weight: 600, bg: false });
    K.draw(g, w, h);
  }
  return null;
}
