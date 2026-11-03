// course.js — the stage for a ship that changes course: the sea from above,
// i east and j north at one scale, with a coast where the course leaves room
// and on it the radar station that tracks the ship (its scanner turning, a
// sweep across the water); the submerged rock — shallow water paling over it,
// the rock dark beneath the surface, surge breaking over it now and then —
// with the isolated-danger buoy moored beside it (black, a red band, two black
// balls on top), bobbing.
//
// The course it was on runs faintly on to the rock; the track in the
// displacement hue, faint in full and strong to now; the ship (shipTop) with
// its wake, and a foam trail behind it that curls round the turn. Before the
// turn the station's warning goes out to the ship in rings; at the turn the
// place pulses with its time; at each moment the paper asks about, the line
// from the rock draws in with its time (due east of R at 1512; 4.72 km at
// 1600). Between them, the distance from the rock now.
//
// Everything drawn is read from js/core/course.js (rule 4): the art eases the
// ship's heading round the turn, but its position is the engine's.

import { seaFromAbove, fitPlanAround, planGrid, compassRose, env } from './scenery.js';
import { pulse, ageOf, phaseOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, dot, niceStep, withAlpha, unview, cssVar, hudBoxes as hudOf } from './util.js';
import { shipTop, placer, s3 } from './twoplane.js';
import { clockText } from '../core/course.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;

/**
 * A rock just under the surface, from above, at (x, y), r px across: the
 * shallow water pales over it, the rock shows dark through the water, weed on
 * it stirs, and every so often the swell breaks white over it (`phase`).
 */
export function rockSubmerged(g, x, y, r, phase = 0) {
  const E = env();
  g.save();
  // the shallows: paler, greener water fading out over a wide ring
  const sh = g.createRadialGradient(x, y, r * 0.3, x, y, r * 2.4);
  sh.addColorStop(0, E.night ? 'rgba(90,150,150,0.55)' : 'rgba(170,225,215,0.75)');
  sh.addColorStop(0.55, E.night ? 'rgba(60,120,125,0.25)' : 'rgba(140,205,200,0.35)');
  sh.addColorStop(1, 'rgba(140,205,200,0)');
  g.fillStyle = sh; g.beginPath(); g.ellipse(x, y, r * 2.4, r * 2.0, 0.3, 0, TAU); g.fill();
  // the rock beneath: an irregular dark shape, softened by the water over it
  const blob = (k, rot) => {
    g.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * TAU + rot, q = 0.7 + 0.3 * Math.abs(Math.sin(i * 2.3 + 0.7));
      g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r * q * k, y + Math.sin(a) * r * q * k * 0.8);
    }
    g.closePath();
  };
  const rg = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
  rg.addColorStop(0, E.night ? 'rgba(70,72,64,0.85)' : 'rgba(92,96,80,0.80)');
  rg.addColorStop(1, E.night ? 'rgba(25,32,32,0.75)' : 'rgba(48,62,58,0.70)');
  blob(1, 0); g.fillStyle = rg; g.fill();
  blob(0.62, 0.9); g.fillStyle = E.night ? 'rgba(20,26,26,0.45)' : 'rgba(40,50,44,0.45)'; g.fill();
  // weed on it, stirring with the swell
  g.strokeStyle = E.night ? 'rgba(90,120,70,0.5)' : 'rgba(96,128,62,0.65)'; g.lineWidth = 1.6; g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + 0.4, bx = x + Math.cos(a) * r * 0.45, by = y + Math.sin(a) * r * 0.36, sway = Math.sin(phase * 0.06 + i) * r * 0.12;
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + r * 0.2 + sway, by - r * 0.1, bx + r * 0.32 + sway * 1.6, by + r * 0.04); g.stroke();
  }
  // the water over it: a film of light, and the swell breaking white now and then
  g.fillStyle = E.night ? 'rgba(160,200,210,0.08)' : 'rgba(255,255,255,0.14)';
  g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.3, r * 0.6, r * 0.22, -0.4, 0, TAU); g.fill();
  const surge = (Math.sin(phase * 0.045) + 1) / 2;
  if (surge > 0.55) {
    const u = (surge - 0.55) / 0.45;
    g.strokeStyle = `rgba(255,255,255,${(E.night ? 0.35 : 0.7) * u})`; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x, y, r * (0.8 + i * 0.28 + (1 - u) * 0.3), Math.PI * (1.1 + i * 0.25), Math.PI * (1.55 + i * 0.25)); g.stroke(); }
    g.fillStyle = `rgba(255,255,255,${(E.night ? 0.25 : 0.5) * u})`;
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + phase * 0.01; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.7, 1.2 + (i % 3) * 0.5, 0, TAU); g.fill(); }
  }
  g.restore();
}

/**
 * An isolated-danger buoy, the mark moored over a rock: a black float with a
 * broad red band, a short tower and its topmark of two black balls, seen from
 * high and a little to the side, with its shadow and the rings it makes as it
 * bobs (`phase`). s is its height in px. At night its white light flashes.
 */
export function dangerBuoy(g, x, y, s = 22, phase = 0) {
  const E = env(), bob = Math.sin(phase * 0.09) * s * 0.06, lean = Math.sin(phase * 0.07 + 1) * 0.08;
  g.save();
  // rings on the water round it
  for (let i = 0; i < 2; i++) {
    const u = ((phase * 0.012 + i / 2) % 1);
    g.strokeStyle = `rgba(255,255,255,${(1 - u) * (E.night ? 0.25 : 0.5)})`; g.lineWidth = 1.2;
    g.beginPath(); g.ellipse(x, y, s * (0.45 + u * 0.7), s * (0.18 + u * 0.28), 0, 0, TAU); g.stroke();
  }
  // its shadow, down and to the right
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + s * 0.35, y + s * 0.12, s * 0.42, s * 0.16, 0.2, 0, TAU); g.fill();
  g.translate(x, y + bob); g.rotate(lean);
  // the float: black, a red band, lit from the left
  const w = s * 0.42;
  const fg = g.createLinearGradient(-w, 0, w, 0); fg.addColorStop(0, '#4a4a4f'); fg.addColorStop(0.45, '#1d1d21'); fg.addColorStop(1, '#0c0c0e');
  g.fillStyle = fg; g.beginPath(); g.ellipse(0, 0, w, w * 0.42, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-w * 0.8, 0); g.lineTo(-w * 0.55, -s * 0.5); g.lineTo(w * 0.55, -s * 0.5); g.lineTo(w * 0.8, 0); g.closePath(); g.fill();
  const rb = g.createLinearGradient(-w, 0, w, 0); rb.addColorStop(0, '#e2483a'); rb.addColorStop(0.5, '#b8261d'); rb.addColorStop(1, '#7c140f');
  g.fillStyle = rb; g.beginPath(); g.moveTo(-w * 0.7, -s * 0.18); g.lineTo(-w * 0.62, -s * 0.34); g.lineTo(w * 0.62, -s * 0.34); g.lineTo(w * 0.7, -s * 0.18); g.closePath(); g.fill();
  // the tower and its two black balls
  g.strokeStyle = '#141416'; g.lineWidth = Math.max(1.5, s * 0.07);
  g.beginPath(); g.moveTo(0, -s * 0.5); g.lineTo(0, -s * 0.78); g.stroke();
  for (const yy of [-s * 0.86, -s * 1.06]) {
    const bg = g.createRadialGradient(-s * 0.03, yy - s * 0.03, 0, 0, yy, s * 0.1);
    bg.addColorStop(0, '#55555b'); bg.addColorStop(1, '#0d0d10');
    g.fillStyle = bg; g.beginPath(); g.arc(0, yy, s * 0.1, 0, TAU); g.fill();
  }
  // at night, its light: two short white flashes in a cycle
  if (E.night) {
    const c = (phase * 0.02) % 1, on = c < 0.06 || (c > 0.12 && c < 0.18);
    if (on) {
      const lg = g.createRadialGradient(0, -s * 0.62, 0, 0, -s * 0.62, s * 0.7);
      lg.addColorStop(0, 'rgba(255,255,240,0.95)'); lg.addColorStop(1, 'rgba(255,255,240,0)');
      g.fillStyle = lg; g.beginPath(); g.arc(0, -s * 0.62, s * 0.7, 0, TAU); g.fill();
    }
  }
  g.restore();
}

/**
 * A coastguard radar station on the shore, from above, at (x, y), s px
 * across: a fenced compound, the operations building with its flat roof and
 * plant, the lattice tower, and on it the scanner — a long bar turning with
 * `spin` (radians), its sweep fanning faintly over the ground and the sea.
 */
export function radarStation(g, x, y, s = 44, spin = 0) {
  const E = env();
  g.save(); g.translate(x, y);
  // the sweep: a faint fan behind the turning scanner
  for (let i = 0; i < 10; i++) {
    g.fillStyle = `rgba(255,255,255,${(E.night ? 0.05 : 0.07) * (1 - i / 10)})`;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, s * 2.6, spin - (i + 1) * 0.05, spin - i * 0.05); g.closePath(); g.fill();
  }
  // the compound: gravel inside a fence
  g.fillStyle = E.night ? '#3d3b37' : '#bdb6a8';
  g.beginPath(); g.roundRect(-s * 0.62, -s * 0.5, s * 1.24, s * 1.0, s * 0.06); g.fill();
  g.strokeStyle = E.night ? 'rgba(200,200,190,0.35)' : 'rgba(70,70,64,0.6)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.stroke(); g.setLineDash([]);
  // the building: a flat roof, lit from the top left, its plant and a shadow
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-s * 0.48 + 3, s * 0.02 + 3, s * 0.62, s * 0.36);
  const roof = g.createLinearGradient(-s * 0.48, 0, s * 0.14, s * 0.4);
  roof.addColorStop(0, E.night ? '#8d8c88' : '#f2efe8'); roof.addColorStop(1, E.night ? '#5c5b57' : '#c9c4b8');
  g.fillStyle = roof; g.fillRect(-s * 0.48, s * 0.02, s * 0.62, s * 0.36);
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.strokeRect(-s * 0.48, s * 0.02, s * 0.62, s * 0.36);
  g.fillStyle = E.night ? '#4a4a4a' : '#8f8b84';
  g.fillRect(-s * 0.4, s * 0.09, s * 0.12, s * 0.08); g.fillRect(-s * 0.22, s * 0.09, s * 0.08, s * 0.08);
  // the windows' glow at night, along the south wall
  if (E.night) { g.fillStyle = 'rgba(255,214,140,0.8)'; for (let i = 0; i < 4; i++) g.fillRect(-s * 0.44 + i * s * 0.15, s * 0.36, s * 0.08, s * 0.025); }
  // the lattice tower, square, with its shadow thrown down and to the right
  const tx = s * 0.3, ty = -s * 0.18, tw = s * 0.2;
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(tx - tw / 2 + 4, ty + tw / 2 + 2); g.lineTo(tx + s * 0.75, ty + s * 0.95); g.lineTo(tx + s * 0.62, ty + s * 1.0); g.lineTo(tx - tw / 2 + 1, ty + tw / 2 + 5); g.fill();
  g.strokeStyle = E.night ? '#b8b8b8' : '#6a6d72'; g.lineWidth = 1.2;
  g.strokeRect(tx - tw / 2, ty - tw / 2, tw, tw);
  g.beginPath(); g.moveTo(tx - tw / 2, ty - tw / 2); g.lineTo(tx + tw / 2, ty + tw / 2); g.moveTo(tx + tw / 2, ty - tw / 2); g.lineTo(tx - tw / 2, ty + tw / 2); g.stroke();
  // the scanner on top: a long white bar, turning
  g.save(); g.translate(tx, ty); g.rotate(spin);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-s * 0.36 + 3, -s * 0.035 + 3, s * 0.72, s * 0.07);
  const bar = g.createLinearGradient(0, -s * 0.04, 0, s * 0.04); bar.addColorStop(0, '#ffffff'); bar.addColorStop(1, '#b9bcc2');
  g.fillStyle = bar; g.beginPath(); g.roundRect(-s * 0.36, -s * 0.035, s * 0.72, s * 0.07, s * 0.03); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = '#5b5f66'; g.beginPath(); g.arc(0, 0, s * 0.05, 0, TAU); g.fill();
  g.restore();
  // a red warning light on the tower, brighter by night
  const lit = E.night ? 0.95 : 0.7;
  g.fillStyle = `rgba(230,60,50,${lit})`; g.beginPath(); g.arc(tx + tw / 2, ty - tw / 2, 2.2, 0, TAU); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'course') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const U = f.U, tr = s3, A = f.answers;
  const when = (x) => (f.clocked ? clockText(f.clock(x)) : T`t = ${tr(x)} [${U.time}]`);

  // ── the frame: the whole track, the rock, the old course to it, and O
  const n = 90, pts = [];
  for (let i = 0; i <= n; i++) pts.push(f.pos((i / n) * f.tMax));
  const all = [...pts, { x: 0, y: 0 }, ...(f.R ? [f.R] : [])];
  const box = { xLo: Math.min(...all.map((p) => p.x)), xHi: Math.max(...all.map((p) => p.x)), yLo: Math.min(...all.map((p) => p.y)), yHi: Math.max(...all.map((p) => p.y)) };
  const sp = Math.max(box.xHi - box.xLo, box.yHi - box.yLo, 1);
  for (const [lo, hi] of [['xLo', 'xHi'], ['yLo', 'yHi']]) { const m = Math.max(0, sp * 0.25 - (box[hi] - box[lo])) / 2; box[lo] -= m; box[hi] += m; }
  const S = clamp(Math.min(w, h) * 0.095, 38, 54);
  const pad = S * 0.95;
  const hudBoxes = hudOf(w, phone ? 3 : (f.R ? 5 : 4));
  const cR = phone ? 19 : 24, cX = w - cR - (phone ? 12 : 20), cY = h - cR - (phone ? 14 : 22);
  const compassBox = { x: cX - cR - 4, y: cY - cR - 24, w: cR * 2 + 8, h: cR * 2 + 28 };
  const F = fitPlanAround(box, all, { left: pad, right: w - pad, top: pad, bottom: h - pad }, { avoid: [...hudBoxes, compassBox], margin: pad * 0.7 });
  const { X, Y } = F;
  const px = (p) => ({ x: X(p.x), y: Y(p.y) });
  const phase = (t / Math.max(f.tMax, 1e-9)) * 200;

  // ── the sea, a coast kept off the course and the rock, and the station on it
  const trackPx = pts.map(px), Rp = f.R ? px(f.R) : null;
  const ring = Rp ? Array.from({ length: 12 }, (_, i) => ({ x: Rp.x + Math.cos((i / 12) * TAU) * 40, y: Rp.y + Math.sin((i / 12) * TAU) * 40 })) : [];
  const sea = seaFromAbove(g, 0, 0, w, h, { phase, avoid: [...trackPx, ...ring, { x: X(0), y: Y(0) }], coast: true, hud: true });
  const station = sea?.light || null;
  if (station) radarStation(g, station.x, station.y, phone ? 40 : 54, phase * 0.09);

  // the words: kept off the readouts, the compass, the lines and each other
  const Q = placer(g, w, h);
  const hold = (b) => { L.reserve(b); Q.box(b); };
  for (const b of [...hudBoxes, compassBox]) hold(b);
  Q.line([{ x: 0, y: Y(0) }, { x: w, y: Y(0) }], 10); Q.line([{ x: X(0), y: 0 }, { x: X(0), y: h }], 10);
  Q.point(X(0), Y(0)); Q.line(trackPx);
  if (station) hold({ x: station.x - 30, y: station.y - 26, w: 60, h: 52 });

  // ── the grid and the axes through O
  const step = niceStep(Math.max(box.xHi - box.xLo, box.yHi - box.yLo), phone ? 5 : 8);
  const dp = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  const Ls = labels();
  for (const b of [...hudBoxes, compassBox]) Ls.reserve(b);
  const gridWords = planGrid(g, Ls, F, w, h, P, { step, fmt: (x) => num(x, dp), nameI: T`vec(i) [${U.len}]`, nameJ: T`vec(j) [${U.len}]`, clear: Q.clear,
    jTop: X(0) < hudBoxes[0].x + hudBoxes[0].w + 10 ? hudBoxes[0].h + 14 : 16 });
  for (const b of gridWords) hold(b);

  // ── the rock and its buoy
  if (Rp) {
    rockSubmerged(g, Rp.x, Rp.y, phone ? 13 : 16, phase);
    dangerBuoy(g, Rp.x + 26, Rp.y - 14, phone ? 18 : 22, phase);
    hold({ x: Rp.x - 18, y: Rp.y - 40, w: 58, h: 56 });
    Q.add('R', Rp.x, Rp.y, { color: P.ink, pri: 9, size: 16, weight: 800 });
  }

  // ── the course it was on, faint, on to the rock (from the turn, once it turns)
  if (Rp && f.tHit != null) {
    const from = f.tc != null && t >= f.tc ? px(f.Pc) : px(f.pos(Math.min(t, f.tc ?? t)));
    const fade = f.tc != null && t > f.tc ? clamp(1 - (t - f.tc) / (f.tMax * 0.5), 0.35, 1) : 1;
    g.save(); g.setLineDash([1, 7]); g.lineCap = 'round';
    stroke(g, [from, Rp], { color: P.disp, width: 2.2, alpha: 0.55 * fade });
    g.restore();
    Q.line([from, Rp], 8);
    if (!phone && Math.hypot(from.x - Rp.x, from.y - Rp.y) > 120) Q.add(f.tc != null && t >= f.tc ? 'its old course' : `on course for R, ${when(f.tHit)}`, (from.x + Rp.x) / 2, (from.y + Rp.y) / 2, { color: P.muted, pri: 2, size: 13, weight: 600 });
  }

  // ── the foam trail behind the ship, curling round the turn
  const trail = [];
  const back = f.tMax * 0.1;
  for (let i = 0; i <= 30; i++) { const tt = t - back * (1 - i / 30); if (tt >= 0) trail.push(px(f.pos(tt))); }
  if (fired && trail.length > 1) {
    const E = env();
    for (let i = 1; i < trail.length; i++) {
      const u = i / trail.length;
      stroke(g, [trail[i - 1], trail[i]], { color: E.night ? '#cfe3ea' : '#ffffff', width: 2 + u * 7, alpha: 0.32 * u });
    }
  }

  // ── the track: faint in full, strong to now
  stroke(g, trackPx, { color: P.disp, width: 1.8, alpha: 0.45 });
  const so = []; for (let i = 0; i <= 80; i++) so.push(px(f.pos((i / 80) * t)));
  stroke(g, so, { color: cssVar('--surface', '#131210'), width: 5.5, alpha: 0.45 });
  stroke(g, so, { color: P.disp, width: 3 });

  // ── the warning: rings from the station to the ship before the turn
  if (station && f.tc != null) {
    const w0 = f.tc - f.tMax * 0.14;
    if (t > w0 && t < f.tc + f.tMax * 0.02) {
      const sh = px(f.pos(t)), ang = Math.atan2(sh.y - station.y, sh.x - station.x), D = Math.hypot(sh.x - station.x, sh.y - station.y);
      const k = (t - w0) / (f.tc - w0);
      for (let i = 0; i < 4; i++) {
        const u = ((k * 3 + i / 4) % 1), R = 14 + u * D;
        g.strokeStyle = withAlpha(P.ink, (1 - u) * 0.7); g.lineWidth = 2;
        g.beginPath(); g.arc(station.x, station.y, R, ang - 0.22, ang + 0.22); g.stroke();
      }
    }
  }

  // ── the turn: the place pulses, with its time
  if (f.tc != null && t >= f.tc - 1e-9) {
    const q = px(f.Pc), { age, life } = ageOf(t, f.tc, f.tMax);
    pulse(g, q.x, q.y, age, life, P.mark, { radius: 40 });
    dot(g, q.x, q.y, 5.5, { fill: P.mark, stroke: cssVar('--surface', '#131210'), width: 2 });
    Q.add(phone ? `turns, ${when(f.tc)}` : `changes course, ${when(f.tc)}`, q.x, q.y, { color: P.mark, pri: 8, size: 14, weight: 700 });
  }

  // ── each moment asked about, once the clock reaches it: the line from the rock draws in
  const asked = [];
  if (A.due) asked.push({ t: A.due.t, word: `due ${A.due.word} of R, ${when(A.due.t)}`, short: when(A.due.t) });
  if (A.at && f.R) asked.push({ t: A.at.t, word: T`${tr(A.at.dist)} [${U.len}] "from R," ${when(A.at.t)}`, short: T`${tr(A.at.dist)} [${U.len}], ${when(A.at.t)}` });
  for (const an of asked) {
    if (!Rp || t < an.t - 1e-9) continue;
    const q = px(f.pos(an.t)), { age, life } = ageOf(t, an.t, f.tMax);
    const u = phaseOf(age, life * 0.6), grow = u == null ? 1 : 1 - (1 - u) ** 3;
    const end = { x: Rp.x + (q.x - Rp.x) * grow, y: Rp.y + (q.y - Rp.y) * grow };
    stroke(g, [Rp, end], { color: cssVar('--surface', '#131210'), width: 5, alpha: 0.4 });
    stroke(g, [Rp, end], { color: P.mark, width: 2.2 });
    Q.line([Rp, q], 8);
    pulse(g, q.x, q.y, age, life, P.mark, { radius: 40 });
    dot(g, q.x, q.y, 5.5, { fill: P.mark, stroke: cssVar('--surface', '#131210'), width: 2 });
    Q.add(phone ? an.short : an.word, (q.x + Rp.x) / 2, (q.y + Rp.y) / 2, { color: P.mark, pri: 8, size: 14, weight: 700 });
  }

  // ── how far from the rock now, between the moments asked about
  const now = px(f.pos(t));
  const atAsked = [...asked.map((a) => a.t), ...(f.tc != null ? [f.tc] : [])].some((ta) => Math.abs(ta - t) < f.tMax * 0.03);
  // (not while it heads straight for the rock: the old course is that line, and says so)
  const v = f.vel(t), toR = Rp ? Math.abs((Rp.x - now.x) * -v.y - (Rp.y - now.y) * v.x) / (Math.hypot(v.x, v.y) * Math.hypot(Rp.x - now.x, Rp.y - now.y) || 1) : 1;
  if (Rp && Math.hypot(now.x - Rp.x, now.y - Rp.y) > 70 && !atAsked && fired && t > 0 && toR > 0.05) {
    stroke(g, [Rp, now], { color: P.mark, width: 1.4, alpha: 0.6 });
    Q.line([Rp, now], 8);
    Q.add(T`${tr(f.dist(t))} [${U.len}] "from R"`, (now.x + Rp.x) / 2, (now.y + Rp.y) / 2, { color: P.mark, pri: 5, size: 13, weight: 700 });
  }

  // ── the ship: its heading eased round the turn (art only; where it is is the engine's)
  const v1 = f.legs[0].v, v2 = f.legs[1]?.v;
  const hd = (v) => Math.atan2(-v.y, v.x);
  let a = hd(f.vel(t));
  if (v2 && Math.hypot(v2.x, v2.y) > 1e-9 && t >= f.tc) {
    const k = clamp((t - f.tc) / (f.tMax * 0.04), 0, 1), e = 1 - (1 - k) ** 2;
    let da = hd(v2) - hd(v1); da = ((da + Math.PI) % TAU + TAU) % TAU - Math.PI;
    a = hd(v1) + da * e;
  }
  const moving = Math.hypot(f.vel(t).x, f.vel(t).y) > 1e-9;
  const wake = fired && moving ? clamp(t / Math.max(1e-9, f.tMax * 0.08), 0, 1) : 0;
  if (wake > 0) shipTop(g, now.x, now.y, S, a, P.ink, P, { wake, phase: phase * 3, part: 'wake' });
  shipTop(g, now.x, now.y, S, a, P.disp, P, { wake, phase: phase * 3, part: 'hull' });
  hold({ x: now.x - S * 0.4, y: now.y - S * 0.4, w: S * 0.8, h: S * 0.8 });
  Q.add('S', now.x, now.y, { color: P.disp, pri: 9, size: 16, weight: 800 });

  Q.flush(L);
  Ls.draw(g, w, h);
  L.draw(g, w, h);
  unview(g);
  compassRose(g, cX, cY, cR, P);
  return null;
}
