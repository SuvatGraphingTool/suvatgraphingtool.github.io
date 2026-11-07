// dropramp.js — the stage for the same drop two ways: a warehouse's loading
// bay side on. On the left the loading dock, and from its edge a steel ramp
// (a hinged lip at the top, kerbs, a toe plate) down to a flatbed trolley; on
// the right the end of a roller conveyor at the same height — a dotted level
// line joins the two — over a second trolley standing in the open bay under
// its overhang. At the engine's t = 0 one parcel starts down the ramp and
// another tips off the conveyor and falls. Each lands on its trolley at the
// engine's moment: the deck and parcel dip together on the castors' springs,
// the parcel squashes, a puff of dust at the deck; the ramp's parcel settles
// flat onto the deck. Each one's velocity rides beside it, labelled. A card
// shows the forces the engine found on the parcel on the ramp, where there is
// room for it.
//
// Everything drawn is read from js/core/dropramp.js (rule 4).

import { loadingBay } from './runout.js';
import { parcel } from './figures.js';
import { paper, softShadow, env } from './scenery.js';
import { pulse, ageOf, dust } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, withAlpha, unview, hudBoxes, cssVar } from './util.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const tr = (x) => num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x) || 1))), { trim: true });
const ease = (u) => 1 - (1 - clamp(u, 0, 1)) ** 3;

/** A flatbed platform trolley: its deck's top at y from x0 to x1, sunk by `dip` px on its springs; a
    U-shaped tube handle with a grip at the right; swivel castors with forks and plates to the floor. */
function trolley(g, x0, x1, y, floorY, dip = 0) {
  const E = env(), tk = 10, yd = y + dip;
  softShadow(g, (x0 + x1) / 2, floorY + 1, (x1 - x0) * 0.55, 3, 0.7);
  const wr = Math.max(6, (floorY - y - tk) * 0.38);
  for (const x of [x0 + wr * 1.5, x1 - wr * 1.5]) {
    // the plate under the deck, the fork and its spring, the tyre with its hub
    g.fillStyle = '#4a4f57'; g.fillRect(x - wr * 0.7, yd + tk, wr * 1.4, 3);
    g.strokeStyle = '#6b7079'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - wr * 0.45, yd + tk + 3); g.lineTo(x - wr * 0.25, floorY - wr); g.moveTo(x + wr * 0.45, yd + tk + 3); g.lineTo(x + wr * 0.25, floorY - wr); g.stroke();
    g.strokeStyle = '#9aa0a8'; g.lineWidth = 1.2; g.beginPath();
    for (let i = 0; i <= 6; i++) { const yy = yd + tk + 3 + ((floorY - wr - yd - tk - 3) * i) / 6; g.lineTo(x + (i % 2 ? 3 : -3), yy); } g.stroke();
    g.fillStyle = '#1b1c20'; g.beginPath(); g.arc(x, floorY - wr, wr, 0, TAU); g.fill();
    g.fillStyle = '#8a9098'; g.beginPath(); g.arc(x, floorY - wr, wr * 0.42, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x - wr * 0.3, floorY - wr * 1.3, wr * 0.22, 0, TAU); g.fill();
  }
  // the deck: a steel platform with thickness, an anti-slip face and a rubber edge strip, bumpers at the corners
  const dg = g.createLinearGradient(0, yd, 0, yd + tk);
  dg.addColorStop(0, E.night ? '#4b78ae' : '#3a7cc4'); dg.addColorStop(1, E.night ? '#24426a' : '#1f4a80');
  g.fillStyle = dg; g.beginPath(); g.roundRect(x0, yd, x1 - x0, tk, 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = x0 + 4; x < x1 - 4; x += 6) g.fillRect(x, yd + 2, 2, 1);
  g.fillStyle = '#1b1c20'; g.fillRect(x0, yd + tk - 3, x1 - x0, 3);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x0 + 2, yd, x1 - x0 - 4, 1.5);
  for (const bx of [x0 - 3, x1 - 1]) { g.fillStyle = '#26272c'; g.beginPath(); g.roundRect(bx, yd + 1, 4, tk - 2, 1.5); g.fill(); }
  // the handle: a U of steel tube rising from the right end, a black grip across its top
  const hH = Math.max(36, (floorY - y) * 2.6), hx = x1 - 4;
  g.strokeStyle = E.night ? '#9aa0a8' : '#6b7079'; g.lineWidth = 3.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(hx, yd + 2); g.lineTo(hx + 6, yd - hH); g.stroke();
  g.strokeStyle = withAlpha(E.night ? '#9aa0a8' : '#6b7079', 0.55); g.beginPath(); g.moveTo(hx - 5, yd + 2); g.lineTo(hx + 1, yd - hH + 3); g.stroke();
  g.strokeStyle = '#1b1c20'; g.lineWidth = 5; g.beginPath(); g.moveTo(hx + 1, yd - hH + 1); g.lineTo(hx + 7, yd - hH); g.stroke();
}

/** The end of a roller conveyor: its end drum at (x, y) (the top of the belt), running off past the
    right edge — a light steel side frame with rollers, a rubber belt with a sheen, a guard rail, a
    hazard-striped end plate; its legs set back behind `clearTo` so the bay under its overhang is open. */
function conveyor(g, x, y, w, floorY, clearTo) {
  const E = env(), th = 14, x1 = w + 20;
  // the legs and their bracing, behind the frame and back from the open bay
  g.strokeStyle = E.night ? '#59606a' : '#7d848d'; g.lineWidth = 5;
  const legs = []; for (let lx = Math.max(clearTo + 10, x + 40); lx < x1; lx += 150) legs.push(lx);
  for (const lx of legs) { g.beginPath(); g.moveTo(lx, y + th); g.lineTo(lx, floorY - 3); g.stroke(); g.fillStyle = '#3c4046'; g.fillRect(lx - 9, floorY - 4, 18, 4); }
  g.lineWidth = 2; for (let i = 1; i < legs.length; i++) { g.beginPath(); g.moveTo(legs[i - 1], floorY - 20); g.lineTo(legs[i], y + th + 14); g.stroke(); }
  // the side frame: light steel, lit along its top edge
  const fg = g.createLinearGradient(0, y, 0, y + th);
  fg.addColorStop(0, E.night ? '#8d949c' : '#b9bfc6'); fg.addColorStop(1, E.night ? '#5a6068' : '#80878f');
  g.fillStyle = fg; g.fillRect(x, y + 2, x1 - x, th);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(x, y + 2, x1 - x, 1.5);
  // rollers showing through the frame, each a hub
  for (let rx = x + 14; rx < x1; rx += 18) { g.fillStyle = '#3a3e45'; g.beginPath(); g.arc(rx, y + 2 + th / 2, th * 0.32, 0, TAU); g.fill(); g.fillStyle = '#b9bfc6'; g.beginPath(); g.arc(rx, y + 2 + th / 2, th * 0.1, 0, TAU); g.fill(); }
  // the belt on top: dark rubber with a sheen
  g.fillStyle = '#1e1f23'; g.fillRect(x, y - 2, x1 - x, 4);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y - 2, x1 - x, 1);
  // the end drum and its axle, and the hazard plate under it
  g.fillStyle = '#5b6068'; g.beginPath(); g.arc(x, y + th / 2, th / 2 + 2, 0, TAU); g.fill();
  g.fillStyle = '#c9ced6'; g.beginPath(); g.arc(x, y + th / 2, 2.5, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.rect(x - 4, y + th + 2, 26, 10); g.clip();
  for (let i = -2; i < 8; i++) { g.fillStyle = i % 2 ? '#1e1f23' : '#e8c242'; g.beginPath(); g.moveTo(x - 4 + i * 6, y + th + 12); g.lineTo(x + 2 + i * 6, y + th + 2); g.lineTo(x + 8 + i * 6, y + th + 2); g.lineTo(x + 2 + i * 6, y + th + 12); g.closePath(); g.fill(); }
  g.restore();
  // the guard rail along its far side
  g.strokeStyle = '#e8c242'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 10, y - 16); g.lineTo(x1, y - 16); g.stroke();
  for (let px = x + 10; px < x1; px += 60) { g.beginPath(); g.moveTo(px, y - 16); g.lineTo(px, y); g.stroke(); }
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'dropramp') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, phone ? 2 : 4); for (const b of HB) L.reserve(b);
  const th = (f.theta * Math.PI) / 180, sn = Math.sin(th), cs = Math.cos(th);

  // ── the frame: dock face, the ramp's run, its trolley, the open bay and the drop lane, its height — fitted
  //    to the stage both ways and centred, not pinned to its bottom
  const pl = clamp(Math.min(w, h) * (phone ? 0.11 : 0.075), 34, 62), deckH = Math.round(pl * 0.62);
  const dockFace = phone ? pl * 1.6 : pl * 2.2, trolleyW = pl * 2.6, gap = pl * 1.4, laneW = trolleyW + pl * 1.6;
  const runM = f.L * cs;
  const bandTop = phone ? HB[0].y + HB[0].h + 30 : 60, bandBot = h - 24;
  // on a laptop the dock's edge, where the ramp starts, stands right of the readouts
  const dockMin = phone ? 12 + dockFace : Math.max(12 + dockFace, HB[0].x + HB[0].w + 30);
  const availW = w - 24 - dockMin - trolleyW - gap - laneW, availH = bandBot - bandTop - pl - 50 - deckH;
  const k = Math.max(4, Math.min(availW / runM, availH / f.h));
  const contentW = runM * k + trolleyW + gap + laneW;
  const dockX = Math.max(dockMin, (w - contentW) / 2), footX = dockX + runM * k;
  const contentH = pl + 50 + f.h * k + deckH, top0 = bandTop + Math.max(0, (bandBot - bandTop - contentH) / 2);
  const topY = top0 + pl + 50, deckY = topY + f.h * k, floorY = deckY + deckH;
  const sa = sn, ca = cs, out = { x: sn, y: -cs };
  // the bay, with its racking pushed past the right edge: the trolleys stand clear in front of the wall
  loadingBay(g, { w, h, oy: floorY, top: { x: dockX, y: topY }, foot: { x: w + 40, y: deckY }, Ls: pl, sa, ca, out, ramp: false });

  // ── the drop lane: its trolley in the open bay under the conveyor's overhang
  const t2x0 = footX + trolleyW + gap, dropX = t2x0 + trolleyW / 2;
  conveyor(g, dropX - pl * 0.5, topY, w, floorY, t2x0 + trolleyW + pl * 0.5);
  // the same height: a dotted level from the dock's edge to the conveyor's belt
  g.save(); g.setLineDash([2, 6]); g.lineCap = 'round'; stroke(g, [{ x: dockX, y: topY }, { x: dropX - pl * 0.5, y: topY }], { color: P.muted, width: 1.4, alpha: 0.8 }); g.restore();

  // ── the ramp: a steel channel in grip tape from a hinged lip on the dock's edge to a toe plate on the deck
  g.save(); g.translate(dockX, topY); g.rotate(th);
  const len = f.L * k, tk = Math.max(8, pl * 0.18);
  g.fillStyle = '#9ea4ab'; g.fillRect(0, 0, len, tk);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, tk * 0.6, len, tk * 0.4);
  g.fillStyle = E.night ? '#2a2a2e' : '#3a3a40'; g.fillRect(0, -2, len, 3);
  g.fillStyle = 'rgba(255,255,255,0.2)'; for (let x = 4; x < len; x += 5) g.fillRect(x, -2 + ((x * 7) % 3), 1, 1);
  g.fillStyle = '#e8c242'; for (let x = 0; x < len; x += 26) g.fillRect(x, -5, 12, 3);   // the kerb's hazard stripe, on top
  g.fillStyle = '#7d838c'; g.fillRect(-pl * 0.5, -2, pl * 0.5, 4); g.fillRect(len - 2, tk - 4, pl * 0.4, 4);
  g.restore();
  for (const u of [0.35, 0.7]) {
    const x = dockX + runM * k * u, y = topY + f.h * k * u + tk;
    g.fillStyle = '#5b6068'; g.fillRect(x - 3, y, 6, floorY - y); g.fillStyle = '#3c4046'; g.fillRect(x - 8, floorY - 3, 16, 3);
    g.strokeStyle = '#6b7079'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y + (floorY - y) * 0.5); g.lineTo(x - runM * k * 0.12, floorY - 2); g.stroke();
  }
  // its length, as a dimension parallel to it, offset above
  { const n = { x: sn, y: -cs }, off = pl * 1.25, a0 = { x: dockX + n.x * off, y: topY + n.y * off }, a1 = { x: footX + n.x * off, y: deckY + n.y * off };
    stroke(g, [a0, a1], { color: P.disp, width: 1.4 });
    for (const p of [a0, a1]) stroke(g, [{ x: p.x - n.x * 6, y: p.y - n.y * 6 }, { x: p.x + n.x * 6, y: p.y + n.y * 6 }], { color: P.disp, width: 1.4 });
    L.add(T`${tr(f.L)} [m]`, (a0.x + a1.x) / 2 + n.x * 14, (a0.y + a1.y) / 2 + n.y * 14, { color: P.disp, size: 13, weight: 700 }); }

  // ── the landings: the deck and its parcel dip together on the springs, and come back
  const dipOf = (tl) => { if (!fired || t < tl) return 0; const u = (t - tl) / 0.35; return u >= 1 ? 0 : Math.sin(u * Math.PI) * (1 - u) * 8; };
  const dipR = dipOf(f.tR), dipD = dipOf(f.tD);
  trolley(g, footX - 2, footX + trolleyW, deckY, floorY, dipR);
  trolley(g, t2x0, t2x0 + trolleyW, deckY, floorY, dipD);

  // ── the height and the angle
  const dimX = t2x0 + trolleyW + pl * 0.9;
  stroke(g, [{ x: dimX, y: topY }, { x: dimX, y: deckY }], { color: P.disp, width: 1.6 });
  for (const y of [topY, deckY]) stroke(g, [{ x: dimX - 6, y }, { x: dimX + 6, y }], { color: P.disp, width: 1.6 });
  L.add(T`${tr(f.h)} [m]`, dimX + 10, (topY + deckY) / 2, { color: P.disp, size: 14, weight: 700, align: 'left' });
  const ar = clamp(pl * 1.2, 40, 80);
  g.strokeStyle = P.ink; g.lineWidth = 1.4; g.beginPath(); g.moveTo(footX, deckY); g.lineTo(footX - ar * 1.25, deckY); g.stroke();
  g.beginPath(); g.arc(footX, deckY, ar, Math.PI, Math.PI + th); g.stroke();
  // the angle's label below the deck line, under the arc, clear of the ramp and its legs
  L.add(T`theta = ${tr(f.theta)}°`, footX - ar * 0.75, deckY + deckH * 0.5 + 10, { color: P.ink, size: 14, weight: 700, align: 'center' });

  // ── the parcels
  // down the ramp, then settling flat onto the deck as it arrives (art round the engine's moment)
  const sR = f.sR(t), settle = fired && t > f.tR ? ease((t - f.tR) / 0.15) : 0;
  const rampAt = (s) => ({ x: dockX + s * cs * k, y: topY + s * sn * k });
  const pR0 = rampAt(sR), nU = { x: sn, y: -cs };
  const cR0 = { x: pR0.x + nU.x * pl * 0.36, y: pR0.y + nU.y * pl * 0.36 };
  const cR1 = { x: footX + pl * 0.9, y: deckY + dipR - pl * 0.36 };
  const cR = { x: cR0.x + (cR1.x - cR0.x) * settle, y: cR0.y + (cR1.y - cR0.y) * settle };
  const sqR = fired && t > f.tR && t - f.tR < 0.15 ? 1 - 0.15 * Math.sin(((t - f.tR) / 0.15) * Math.PI) : 1;
  g.save(); g.translate(cR.x, cR.y + pl * 0.36 * (1 - sqR)); g.scale(1 / sqR, sqR); parcel(g, 0, 0, pl, P, { spin: th * (1 - settle) }); g.restore();
  // dropped: straight down from rest, no tumble; a squash as it lands, riding the deck's dip
  const yD = topY + f.fallD(t) * k, landedD = fired && t >= f.tD;
  const sqD = landedD && t - f.tD < 0.15 ? 1 - 0.18 * Math.sin(((t - f.tD) / 0.15) * Math.PI) : 1;
  const cDy = (landedD ? deckY + dipD : yD) - pl * 0.36;
  g.save(); g.translate(dropX, cDy + pl * 0.36 * (1 - sqD)); g.scale(1 / sqD, sqD); parcel(g, 0, 0, pl, P, { spin: 0 }); g.restore();
  // the dust where each lands, at the deck
  for (const [tl, x] of [[f.tR, cR1.x], [f.tD, dropX]]) {
    if (!fired || t < tl - 1e-9) continue;
    const { age, life } = ageOf(t, tl, f.tMax);
    dust(g, x, deckY, age, life, { size: clamp(pl / 40, 0.8, 1.4) });
  }
  // the lanes' captions, above the parcels and below the readouts' band
  const capY = Math.max(phone ? bandTop - 10 : 26, topY - pl - 14);
  L.add('down the ramp', dockX + 8, capY, { color: P.ink, size: 13, weight: 700, align: 'left' });
  L.add('dropped', dropX, capY, { color: P.ink, size: 13, weight: 700, align: 'center' });
  // each one's velocity while it moves (solid: neither is across, rule 2), from its centre, labelled
  if (fired && t > 0) {
    const vs = clamp(pl * 1.8, 60, 110) / f.vD;
    if (t < f.tR) {
      const lv = Math.max(40, f.velR(t) * vs), ax = cR.x + nU.x * pl * 0.75, ay = cR.y + nU.y * pl * 0.75;
      arrow(g, ax, ay, ax + cs * lv, ay + sn * lv, { color: P.vel, width: 2.6, head: 10 });
      L.add(T`v`, ax + cs * lv + 10, ay + sn * lv - 6, { color: P.vel, size: 14, weight: 700, align: 'left' });
    }
    if (t < f.tD) {
      const lv = Math.max(40, f.velD(t) * vs), ax = dropX + pl * 0.85;
      arrow(g, ax, cDy, ax, Math.min(deckY - 4, cDy + lv), { color: P.vel, width: 2.6, head: 10 });
      L.add(T`v`, ax + 10, cDy + lv * 0.5, { color: P.vel, size: 14, weight: 700, align: 'left' });
    }
  }
  for (const [tl, x, v] of [[f.tR, cR1.x, f.vR], [f.tD, dropX, f.vD]]) {
    if (!fired || t < tl - 1e-9) continue;
    const { age, life } = ageOf(t, tl, f.tMax);
    pulse(g, x, deckY + 2, age, life, P.mark, { radius: pl * 0.9 });
    L.add(T`${tr(v)} [m s^-1]`, x, deckY - pl * 1.35, { color: P.vel, size: 14, weight: 700, align: 'center' });
  }

  // ── the forces card: below the readouts on the left, over the dock's face, where there is room; else left out
  const below = HB[0].y + HB[0].h + 10, card = { cw: 220, chh: 168 };
  const showCard = !phone && f.forces && h - below - 20 >= card.chh && 14 + card.cw < dockX + 40;
  if (showCard) { card.cx = 14; card.cy = below; L.reserve({ x: card.cx, y: card.cy, w: card.cw, h: card.chh }); }
  L.draw(g, w, h);

  unview(g);
  const fade = !fired || t <= f.tR ? 1 : 1 - clamp((t - f.tR) / 0.3, 0, 1);
  if (showCard && fade > 0) {
    const { cw, chh, cx, cy } = card, Fz = f.forces;
    g.save(); g.globalAlpha = fade;
    paper(g, cx, cy, cw, chh);
    const txt = (s0, x, y, c, al = 'left') => { g.save(); g.font = `700 13px ${cssVar('--font', 'system-ui, sans-serif')}`; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s0, x, y); g.restore(); };
    txt('The forces on the parcel', cx + 12, cy + 16, P.muted);
    const sc = (chh * 0.28) / Fz.weight, small = Fz.R * sc < 16 || (Fz.F > 1e-9 && Fz.F * sc < 16);
    if (small) txt('(not to scale)', cx + 12, cy + 33, P.muted);
    // a short hatched incline inside the card, the parcel on it
    const bx = cx + cw * 0.42, by = cy + chh * 0.6, half = 15, n2 = { x: sn, y: -cs };
    const iL = cw * 0.3;
    g.save(); g.translate(bx, by); g.rotate(th);
    g.strokeStyle = withAlpha(P.ink, 0.6); g.lineWidth = 1.4; g.beginPath(); g.moveTo(-iL, half); g.lineTo(iL, half); g.stroke();
    g.lineWidth = 1; for (let x = -iL + 4; x < iL; x += 7) { g.beginPath(); g.moveTo(x, half); g.lineTo(x - 5, half + 6); g.stroke(); }
    parcel(g, 0, 0, half * 2, P, { spin: 0 });
    g.restore();
    const flo = (x) => Math.max(18, x);
    // the weight from its centre, R from the face it rests on, friction along that face, up the slope
    const cF = { x: bx + n2.x * -half, y: by + n2.y * -half };
    arrow(g, bx, by, bx, by + half + flo(Fz.weight * sc), { color: P.ink, width: 2.2, head: 8 });
    arrow(g, bx + n2.x * half, by + n2.y * half, bx + n2.x * (half + flo(Fz.R * sc)), by + n2.y * (half + flo(Fz.R * sc)), { color: P.ink, width: 2.2, head: 8 });
    if (Fz.F > 1e-9) arrow(g, cF.x, cF.y, cF.x - cs * flo(Fz.F * sc) - cs * half, cF.y - sn * flo(Fz.F * sc) - sn * half, { color: P.ink, width: 2.2, head: 8 });
    txt(T`mg = ${tr(Fz.weight)} [N]`, bx + 10, by + half + flo(Fz.weight * sc) - 6, P.ink);
    txt(T`R = ${tr(Fz.R)} [N]`, bx + n2.x * (half + flo(Fz.R * sc)) + 8, by + n2.y * (half + flo(Fz.R * sc)), P.ink);
    if (Fz.F > 1e-9) txt(T`F = ${tr(Fz.F)} [N]`, cx + 12, cy + chh - 14, P.ink);
    g.restore();
  }
  return null;
}
