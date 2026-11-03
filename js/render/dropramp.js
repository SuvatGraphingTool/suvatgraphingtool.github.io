// dropramp.js — the stage for the same drop two ways: a warehouse's loading
// bay side on. On the left the loading dock, and from its edge a steel ramp
// down to a flatbed trolley, its surface faced in grip tape; on the right the
// end of a conveyor at the same height over a second trolley. At the engine's
// t = 0 one parcel starts down the ramp and another tips off the conveyor and
// falls. Each lands on its trolley at the engine's moment — the trolley jolts
// on its castors, a ring — with its speed on a plate. A card shows the forces
// on the parcel on the ramp: its weight, the normal reaction, and friction up
// the slope.
//
// Everything drawn is read from js/core/dropramp.js (rule 4).

import { loadingBay } from './runout.js';
import { parcel } from './figures.js';
import { paper, softShadow, env } from './scenery.js';
import { pulse, ageOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha, unview, hudBoxes, cssVar } from './util.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const tr = (x) => num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x) || 1))), { trim: true });

/** A flatbed trolley: its deck at y, from x0 to x1, a push handle at the right, castors to the floor. */
function trolley(g, x0, x1, y, floorY, jolt = 0) {
  const E = env(), dy = jolt;
  softShadow(g, (x0 + x1) / 2, floorY + 1, (x1 - x0) * 0.55, 3, 0.7);
  const wr = Math.max(4, (floorY - y) * 0.32);
  for (const x of [x0 + wr * 1.6, x1 - wr * 1.6]) {
    g.fillStyle = '#5b6068'; g.fillRect(x - 2, y + dy + 4, 4, floorY - wr * 2 - y - dy - 4);
    g.fillStyle = '#1e1f23'; g.beginPath(); g.arc(x, floorY - wr, wr, 0, TAU); g.fill();
    g.fillStyle = '#9aa0a8'; g.beginPath(); g.arc(x, floorY - wr, wr * 0.35, 0, TAU); g.fill();
  }
  const dg = g.createLinearGradient(0, y + dy, 0, y + dy + 8);
  dg.addColorStop(0, E.night ? '#3e6aa0' : '#2f6db0'); dg.addColorStop(1, E.night ? '#24426a' : '#1f4a80');
  g.fillStyle = dg; g.beginPath(); g.roundRect(x0, y + dy, x1 - x0, 8, 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x0 + 2, y + dy, x1 - x0 - 4, 1.5);
  g.strokeStyle = E.night ? '#8a9098' : '#5b6068'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1 - 2, y + dy + 2); g.lineTo(x1 + 6, y + dy - (floorY - y) * 2.2); g.stroke();
}

/** The end of a roller conveyor at (x, y), running back to the right: belt, rollers, legs to the floor. */
function conveyor(g, x, y, x1, floorY) {
  const E = env(), th = 12;
  g.fillStyle = E.night ? '#2a2c30' : '#33363c'; g.fillRect(x, y, x1 - x, th);
  g.fillStyle = 'rgba(255,255,255,0.12)'; for (let xx = x + 6; xx < x1; xx += 14) g.fillRect(xx, y + 1, 6, 2);
  g.fillStyle = '#8a9098'; g.beginPath(); g.arc(x, y + th / 2, th / 2, 0, TAU); g.fill();
  g.fillStyle = E.night ? '#6a7078' : '#8d949c';
  for (const lx of [x + 16, x1 - 20]) { g.fillRect(lx - 3, y + th, 6, floorY - y - th); g.fillRect(lx - 9, floorY - 4, 18, 4); }
  g.strokeStyle = E.night ? '#6a7078' : '#8d949c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 16, y + th + 20); g.lineTo(x1 - 20, floorY - 30); g.stroke();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'dropramp') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, phone ? 2 : 4); for (const b of HB) L.reserve(b);
  const th = (f.theta * Math.PI) / 180, sn = Math.sin(th), cs = Math.cos(th);

  // ── one scale: the ramp's run and the drop lane beside it, the height up to the dock
  const floorY = h - clamp(h * 0.1, 30, 60), deckH = clamp(h * 0.06, 18, 34), deckY = floorY - deckH;
  const runM = f.L * cs, left = phone ? 20 : Math.max(HB[0].x + HB[0].w + 40, 60);
  // room on the right for the ramp's trolley, the conveyor's lane and its trolley, and the height
  const rightRoom = phone ? 190 : 360;
  const k = Math.min((w - left - rightRoom) / runM, (deckY - (phone ? 170 : 90)) / f.h);
  const dockX = left + (phone ? 10 : 30), topY = deckY - f.h * k, footX = dockX + runM * k;
  const Ls = clamp(k * 0.5, 30, 60), pl = clamp(k * 0.42, 26, 50);
  const sa = sn, ca = cs, out = { x: sn, y: -cs };
  // (its racking starts past the right edge: the trolleys and the drop lane stand clear in front of the wall)
  loadingBay(g, { w, h, oy: floorY, top: { x: dockX, y: topY }, foot: { x: w + 40, y: deckY }, Ls, sa, ca, out, ramp: false });
  // the drop lane: the conveyor's end at the same height over its own trolley, right of the ramp's trolley
  const dropX = footX + (phone ? 100 : 190), convEnd = dropX - pl * 0.1;
  conveyor(g, convEnd, topY + pl * 0.36, Math.min(w + 10, convEnd + 260), floorY);
  // ── the ramp: a steel channel from the dock's edge down to the trolley, grip tape on its face
  g.save(); g.translate(dockX, topY); g.rotate(th);
  const len = (f.L * k), tk = 9;
  g.fillStyle = '#9ea4ab'; g.fillRect(0, 0, len, tk);
  g.fillStyle = E.night ? '#2a2a2e' : '#3a3a40'; g.fillRect(0, -2, len, 3);
  g.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 4; x < len; x += 5) g.fillRect(x, -2 + ((x * 7) % 3), 1, 1);
  g.fillStyle = '#e8c242'; for (let x = 0; x < len; x += 26) g.fillRect(x, tk - 3, 12, 3);
  g.restore();
  for (const u of [0.4, 0.75]) { const x = dockX + runM * k * u, y = topY + f.h * k * u + tk; g.fillStyle = '#5b6068'; g.fillRect(x - 3, y, 6, floorY - y); g.fillStyle = '#3c4046'; g.fillRect(x - 7, floorY - 3, 14, 3); }
  // the trolleys, each jolting as its parcel lands
  const jolt = (tl) => (fired && t >= tl && t - tl < 0.2 ? Math.sin(((t - tl) / 0.2) * Math.PI) * 3 : 0);
  trolley(g, footX - 4, footX + pl * 2.6, deckY, floorY, jolt(f.tR));
  trolley(g, dropX - pl * 1.3, dropX + pl * 1.3, deckY, floorY, jolt(f.tD));

  // ── the height and the angle
  const dimX = dropX + pl * 1.3 + 20;
  stroke(g, [{ x: dimX, y: topY }, { x: dimX, y: deckY }], { color: P.disp, width: 1.6 });
  for (const y of [topY, deckY]) stroke(g, [{ x: dimX - 6, y }, { x: dimX + 6, y }], { color: P.disp, width: 1.6 });
  L.add(T`${tr(f.h)} [m]`, dimX + 10, (topY + deckY) / 2, { color: P.disp, size: 14, weight: 700, align: 'left' });
  const ar = clamp(k * 0.5, 40, 80);
  g.strokeStyle = P.ink; g.lineWidth = 1.4; g.beginPath(); g.moveTo(footX, deckY); g.lineTo(footX - ar * 1.2, deckY); g.stroke();
  g.beginPath(); g.arc(footX, deckY, ar, Math.PI, Math.PI + th); g.stroke();
  L.add(T`theta = ${tr(f.theta)}°`, footX - ar - 12, deckY - 12, { color: P.ink, size: 14, weight: 700, align: 'right' });
  L.add(T`${tr(f.L)} [m]`, dockX + runM * k * 0.45 + sn * 30, topY + f.h * k * 0.45 - cs * 30, { color: P.disp, size: 13, weight: 700 });

  // ── the parcels: one sliding down the ramp, one falling off the conveyor
  const sR = f.sR(t), rx = dockX + sR * cs * k, ry = topY + sR * sn * k;
  const nU = { x: sn, y: -cs };
  parcel(g, rx + nU.x * pl * 0.36, ry + nU.y * pl * 0.36, pl, P, { spin: th });
  const yD = topY + f.fallD(t) * k;
  const dropping = fired && t > 0 && t < f.tD;
  parcel(g, dropX, yD - pl * 0.36, pl, P, { spin: dropping ? Math.min(0.5, t * 0.8) : 0 });
  L.add('down the ramp', dockX + 10, topY - 22, { color: P.ink, size: 13, weight: 700, align: 'left' });
  L.add('dropped', dropX, topY - 22, { color: P.ink, size: 13, weight: 700, align: 'center' });
  // each one's velocity while it moves (solid: neither is across, rule 2), and its landing
  if (fired && t > 0) {
    const vs = clamp(k * 0.3, 40, 110) / f.vD;
    if (t < f.tR) { const v = f.velR(t) * vs; arrow(g, rx + nU.x * pl * 0.9, ry + nU.y * pl * 0.9, rx + nU.x * pl * 0.9 + cs * Math.max(14, v), ry + nU.y * pl * 0.9 + sn * Math.max(14, v), { color: P.vel, width: 2.4, head: 9 }); }
    if (t < f.tD) { const v = f.velD(t) * vs; arrow(g, dropX + pl * 0.8, yD - pl * 0.36, dropX + pl * 0.8, yD - pl * 0.36 + Math.max(14, v), { color: P.vel, width: 2.4, head: 9 }); }
  }
  for (const [tl, x, y, v] of [[f.tR, footX + pl * 0.6, deckY, f.vR], [f.tD, dropX, deckY, f.vD]]) {
    if (!fired || t < tl - 1e-9) continue;
    const { age, life } = ageOf(t, tl, f.tMax);
    pulse(g, x, y - pl * 0.3, age, life, P.mark, { radius: pl });
    L.add(T`${tr(v)} [m s^-1]`, x, y - pl * 1.3, { color: P.vel, size: 14, weight: 700, align: 'center' });
  }
  L.draw(g, w, h);

  // ── the forces on the parcel on the ramp, on a card: weight down, the normal reaction, friction up the slope
  unview(g);
  if (!phone && f.m != null && !(fired && t > f.tR + 1e-9)) {
    const cw = phone ? 150 : 210, chh = phone ? 140 : 180, cx = phone ? 10 : 14, cy = phone ? HB[0].y + HB[0].h + 10 : h - chh - 14;
    paper(g, cx, cy, cw, chh);
    const txt = (s0, x, y, c, al = 'left') => { g.save(); g.font = `700 13px ${cssVar('--font', 'system-ui, sans-serif')}`; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s0, x, y); g.restore(); };
    txt(phone ? 'The forces' : 'The forces on the parcel', cx + 12, cy + 16, P.muted);
    const bx = cx + cw * 0.42, by = cy + chh * 0.58, W = f.m * f.g, sc = (chh * 0.3) / W;
    g.save(); g.translate(bx, by); g.rotate(th);
    g.strokeStyle = withAlpha(P.ink, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-cw * 0.35, 12); g.lineTo(cw * 0.35, 12); g.stroke();
    g.fillStyle = '#b98a55'; g.fillRect(-14, -12, 28, 24);
    g.restore();
    arrow(g, bx, by, bx, by + W * sc, { color: P.ink, width: 2.2, head: 8 });
    const R = W * Math.cos(th), F = f.mu * R;
    arrow(g, bx, by, bx + nU.x * R * sc, by + nU.y * R * sc, { color: P.ink, width: 2.2, head: 8 });
    if (F > 1e-9) arrow(g, bx, by, bx - cs * Math.max(14, F * sc), by - sn * Math.max(14, F * sc), { color: P.ink, width: 2.2, head: 8 });
    txt(T`mg = ${tr(W)} [N]`, bx + 8, by + W * sc - 4, P.ink);
    txt(T`R = ${tr(R)} [N]`, bx + nU.x * R * sc + 6, by + nU.y * R * sc - 6, P.ink);
    if (F > 1e-9) txt(T`F = ${tr(F)} [N]`, bx - cs * Math.max(14, F * sc) - 6, by - sn * Math.max(14, F * sc) - 10, P.ink, 'right');
  }
  return null;
}
