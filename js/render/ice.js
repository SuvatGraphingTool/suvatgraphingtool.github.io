// ice.js — the stage for a stone sliding to rest down the ice, from above:
// a curling sheet between its boards, pebbled ice, the lines A, B and C drawn
// across it where the paper puts them, and the house — its rings — round D,
// where the stone comes to rest. The granite stone with its coloured handle,
// turning slowly as it slides (its curl), a faint track behind it.
//
// Each line lights as the stone crosses it, with the speed it had there; the
// distances between them are dimensioned below the sheet — in metres once the
// paper has fixed the scale, or over a while it has not. All along the line,
// so the velocity arrow is dashed (rule 2); the deceleration points back.
//
// Everything drawn is read from js/core/ice.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, cssVar } from './util.js';
import { env, rng } from './scenery.js';
import { pulse, ageOf, flash } from './effects.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const s3 = (x) => num(x, x !== 0 && Math.abs(x) < 10 ? 2 : 1, { trim: true });

/** A curling stone from above at (x, y), radius r, its handle turned to `rot`. */
function stoneTop(g, x, y, r, rot, handle = '#c8352b') {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + r * 0.18, y + r * 0.22, r * 1.02, r * 0.98, 0, 0, TAU); g.fill();
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  gr.addColorStop(0, '#b9bcc0'); gr.addColorStop(0.7, '#7d8186'); gr.addColorStop(1, '#4e5257');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  // the granite's speckle and the striking band
  const R = rng(7);
  for (let i = 0; i < 40; i++) { const a = R() * TAU, q = Math.sqrt(R()) * r * 0.92; g.fillStyle = R() < 0.5 ? 'rgba(30,30,34,0.35)' : 'rgba(235,235,240,0.35)'; g.fillRect(x + Math.cos(a + rot * 0.3) * q, y + Math.sin(a + rot * 0.3) * q, 1.4, 1.4); }
  g.strokeStyle = 'rgba(30,32,36,0.55)'; g.lineWidth = Math.max(1.5, r * 0.12); g.beginPath(); g.arc(x, y, r * 0.86, 0, TAU); g.stroke();
  // the handle: a coloured bar over a dark boss, turned by the curl
  g.translate(x, y); g.rotate(rot);
  g.fillStyle = '#26292e'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill();
  g.fillStyle = handle; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.roundRect?.(-r * 0.62, -r * 0.13, r * 1.0, r * 0.26, r * 0.12); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-r * 0.55, -r * 0.1, r * 0.8, r * 0.06);
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'ice') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520, E = env();
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const over = (x) => (f.scaled ? T`${s3(x)} [m]` : T`${s3(x)}/a`);

  // ── the frame: A just right of the readouts, the house round D with room past it
  const left = HB[0].w + (phone ? 18 : 40), right = w - (phone ? 30 : 60);
  const span = f.AD, k = (right - left) / (span * 1.08 + 1e-9), X = (x) => left + x * k;
  const sheetH = clamp(h * 0.34, 96, 170), cy = clamp(h * 0.58, HB[0].h * 0.35 + sheetH / 2, h - sheetH / 2 - 54);
  const top = cy - sheetH / 2, bot = cy + sheetH / 2;
  const houseR = clamp(sheetH * 0.42, 34, 70);

  // ── the arena: dark round the sheet, the boards, the pebbled ice
  g.fillStyle = E.night ? '#141a20' : '#2b3540'; g.fillRect(0, 0, w, h);
  const glow = g.createLinearGradient(0, top - 60, 0, bot + 60);
  glow.addColorStop(0, 'rgba(255,255,255,0)'); glow.addColorStop(0.5, 'rgba(180,210,230,0.10)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, top - 60, w, sheetH + 120);
  const ice = g.createLinearGradient(0, top, 0, bot);
  ice.addColorStop(0, E.night ? '#c9d6de' : '#eef5f8'); ice.addColorStop(0.5, E.night ? '#d8e3ea' : '#f8fbfd'); ice.addColorStop(1, E.night ? '#c3d0d8' : '#e8f0f4');
  g.fillStyle = ice; g.fillRect(-10, top, w + 20, sheetH);
  { const R = rng(13); g.fillStyle = 'rgba(120,150,170,0.22)'; for (let i = 0; i < 520; i++) g.fillRect(R() * w, top + R() * sheetH, 1.2, 1.2); }
  g.fillStyle = '#5a3b26'; g.fillRect(-10, top - 9, w + 20, 9); g.fillRect(-10, bot, w + 20, 9);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-10, top - 9, w + 20, 2); g.fillRect(-10, bot, w + 20, 2);
  // the crowd along the far side, and the rink's lights on the ice
  { const R = rng(29), rowsY = [top - 30, top - 48, top - 66].filter((y) => y > 6);
    for (const [j, y] of rowsY.entries()) for (let x0 = (j % 2) * 7; x0 < w; x0 += 14) {
      const c = ['#3d4b5c', '#5b4a44', '#4a5a48', '#6a5d4d', '#3f3f55'][Math.floor(R() * 5)];
      g.fillStyle = withAlpha(c, E.night ? 0.8 : 0.9); g.beginPath(); g.arc(x0 + R() * 4, y + R() * 3, 5, 0, TAU); g.fill();
      g.fillRect(x0 - 5 + R() * 4, y + 4, 10, 8);
    } }
  for (let i = 0; i < 5; i++) { const lx = (i + 0.5) * (w / 5); const lg = g.createRadialGradient(lx, cy, 0, lx, cy, sheetH * 0.7); lg.addColorStop(0, 'rgba(255,255,255,0.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(lx - sheetH, top, sheetH * 2, sheetH); }
  // the hack, the foot-block the stone is thrown from, before A
  { const hx = Math.max(12, X(0) - Math.min(70, (X(0) - 10) * 0.6)); g.fillStyle = '#1f2328'; g.fillRect(hx - 5, cy - 9, 10, 7); g.fillRect(hx - 5, cy + 2, 10, 7); }
  // the centre line, faint
  g.strokeStyle = 'rgba(60,80,100,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-10, cy); g.lineTo(w + 10, cy); g.stroke();

  // ── the house round D: blue, white, red, white button
  const Dx = X(f.AD);
  for (const [r, c] of [[1, '#2f6db3'], [0.66, '#f8fbfd'], [0.34, '#c8352b'], [0.12, '#f8fbfd']]) { g.fillStyle = withAlpha(c, 0.82); g.beginPath(); g.arc(Dx, cy, houseR * r, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(60,80,100,0.35)'; g.beginPath(); g.moveTo(Dx, top); g.lineTo(Dx, bot); g.stroke();

  // ── the lines A, B, C (and D): each lit once the stone has crossed it, with its speed
  const ink = cssVar('--ink', '#e8eaee');
  for (const m of f.marks) {
    const x = X(m.x), crossed = t >= m.t - 1e-9;
    g.strokeStyle = m.id === 'D' ? 'rgba(0,0,0,0)' : crossed ? withAlpha(P.mark, 0.95) : 'rgba(40,60,80,0.55)';
    g.lineWidth = crossed ? 3 : 2;
    if (m.id !== 'D') { g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); }
    L.add(m.id, x, top - 24, { color: crossed ? P.mark : ink, pri: 9, size: 16, weight: 800 });
    if (crossed && fired) {
      const { age, life } = ageOf(t, m.t, f.tMax);
      pulse(g, x, cy, age, life, P.mark, { radius: 36 });
      if (m.id === 'D') flash(g, x, cy, age, life, { color: P.mark });
      L.add(m.id === 'D' ? 'at rest' : T`${s3(m.v)} [m s^-1]`, x, top - 44, { color: m.id === 'D' ? P.mark : P.vel, pri: 8, size: 13, weight: 700 });
    }
  }

  // ── the distances, dimensioned under the sheet: AB, BC, CD
  const dimY = bot + 30;
  const dim = (x0, x1, txt) => {
    const a = X(x0), b = X(x1);
    g.strokeStyle = P.disp; g.lineWidth = 1.4; g.beginPath(); g.moveTo(a, dimY); g.lineTo(b, dimY); g.stroke();
    for (const q of [a, b]) { g.beginPath(); g.moveTo(q, dimY - 6); g.lineTo(q, dimY + 6); g.stroke(); }
    L.add(txt, (a + b) / 2, dimY + 16, { color: P.disp, pri: 7, size: 13, weight: 700 });
  };
  const xs = f.marks.map((m) => m.x);
  for (let i = 0; i + 1 < xs.length; i++) dim(xs[i], xs[i + 1], over(xs[i + 1] - xs[i]));

  // ── the stone: its track, the stone turning, and its arrows
  const x = X(f.pos(t)), v = f.vel(t), r = clamp(sheetH * 0.14, 11, 22);
  if (t > 0) { g.strokeStyle = 'rgba(120,150,170,0.45)'; g.lineWidth = r * 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(X(0), cy); g.lineTo(x, cy); g.stroke(); }
  stoneTop(g, x, cy, r, f.pos(t) * 0.04 * (f.scaled ? 1 : 3) + 0.4);
  L.reserve({ x: x - r - 4, y: cy - r - 4, w: 2 * r + 8, h: 2 * r + 8 });
  if (show.velocity !== false && v > 1e-9) {
    const len = clamp((v / f.uA) * 110, 18, 110);
    arrow(g, x + r + 2, cy - r - 10, x + r + 2 + len, cy - r - 10, { color: P.vel, width: 2.6, head: 10, dash: [6, 4] });
    L.add(T`${s3(v)} [m s^-1]`, x + r + 8 + len, cy - r - 10, { color: P.vel, pri: 8, size: 14, weight: 700, align: 'left' });
  }
  if (show.acceleration !== false && t < f.tMax - 1e-9) {
    arrow(g, x - r - 2, cy + r + 10, x - r - 2 - 46, cy + r + 10, { color: P.acc, width: 2.2, head: 9, dash: [6, 4] });
    L.add(f.scaled ? T`${s3(f.a)} [m s^-2]` : T`a`, x - r - 54, cy + r + 10, { color: P.acc, pri: 6, size: 13, weight: 700, align: 'right' });
  }
  if (!f.scaled) L.add('not to scale: each distance is over a', w / 2, h - 14, { color: P.muted, pri: 5, size: 13 });

  L.draw(g, w, h);
  return null;
}
