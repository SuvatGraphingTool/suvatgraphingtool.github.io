// runout.js — the stage for something sliding down a slope and on along the
// level until friction stops it, side on, in one of two places:
//   snow  a sledge down a snowy hillside and out across the flat at its foot
//   ramp  a suitcase down a steel loading ramp onto a warehouse floor
// The slope's angle at its foot; its length beside it; where it reaches the
// bottom, a mark and its speed there; a ruler of the run-out along the level
// to where it stops. Down a rough enough slope it slows and may stop on the
// slope itself, short of the bottom.
//
// Everything drawn is read from js/core/runout.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, stroke } from './util.js';
import { skyscape, fitSide, env, interior, rng } from './scenery.js';
import { sledge, pine } from './rough.js';
import { pulse, ageOf, dust } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
// 2 dp, but under 0.1 to 3 s.f., never a false 0
const s3 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));
const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });

/** A suitcase side on, its base on y = 0, L px long, facing +x: a hard shell with ribs, a handle, two wheels. */
export function suitcase(g, L) {
  const E = env(), H = L * 0.72;
  g.save();
  const sh = g.createLinearGradient(0, -H, 0, 0); sh.addColorStop(0, E.night ? '#3b5f86' : '#4f86c0'); sh.addColorStop(1, E.night ? '#24405e' : '#2f5f93');
  g.fillStyle = sh; g.beginPath(); g.roundRect?.(-L / 2, -H, L, H - 4, 6); g.fill();
  g.strokeStyle = withAlpha('#0d1c2c', 0.6); g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = withAlpha('#ffffff', 0.18); g.lineWidth = 2;
  for (const f of [-0.25, 0, 0.25]) { g.beginPath(); g.moveTo(L * f, -H + 5); g.lineTo(L * f, -8); g.stroke(); }
  // the handle on top, the wheels at the foot
  g.strokeStyle = '#2b2f36'; g.lineWidth = 3; g.beginPath(); g.moveTo(-L * 0.14, -H); g.lineTo(-L * 0.14, -H - 6); g.lineTo(L * 0.14, -H - 6); g.lineTo(L * 0.14, -H); g.stroke();
  g.fillStyle = '#1b1d21'; for (const f of [-0.36, 0.36]) { g.beginPath(); g.arc(L * f, -3, 3.5, 0, TAU); g.fill(); }
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'runout') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const look = f.look;

  // ── the path in its own plane: the top of the slope up-left, the foot at (0, 0), the level to the right
  const al = f.alpha * D2R, ca = Math.cos(al), sa = Math.sin(al);
  const Ldraw = f.L ?? f.sSlope * 1.2, run = f.stopsOnSlope ? 0 : f.s2;
  const Ls = clamp(Math.min(w, h) * 0.13, phone ? 34 : 46, 84);
  const area = { left: phone ? 14 : HB[0].w + 20, right: w - 14, top: HB[0].h * (phone ? 1 : 0.55), bottom: h - 26 };
  let fit = fitSide({ xLo: -Ldraw * ca, xHi: Math.max(run, Ldraw * 0.2), yLo: 0, yHi: Ldraw * sa }, area, { sky: 0.5 });
  for (let pass = 0; pass < 2; pass++) {
    const k0 = fit.k;
    fit = fitSide({ xLo: -Ldraw * ca - (Ls * 0.8) / k0, xHi: Math.max(run, Ldraw * 0.2) + (Ls + 60) / k0, yLo: -110 / k0, yHi: Ldraw * sa + (Ls * 1.2) / k0 }, area, { sky: 0.5 });
  }
  const { k, X, Y } = fit;
  const at = (s) => (s <= Ldraw ? { x: X(-(Ldraw - s) * ca), y: Y((Ldraw - s) * sa), slope: true } : { x: X(s - Ldraw), y: Y(0), slope: false });
  // the engine's path starts at the top: its s runs down the slope (sSlope of it), then along the level
  const pathAt = (s) => (s <= f.sSlope ? at(s) : at(Ldraw + (s - f.sSlope)));
  const top = at(0), foot = at(Ldraw), oy = foot.y;

  // ── the place
  if (look === 'snow') {
    skyscape(g, 0, 0, w, Math.min(oy - 20, h * 0.8), { seed: 23, far: 'hills', sun: false });
    if (E.night) { g.fillStyle = withAlpha('#ffffff', 0.8); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 211.7) % w, (i * 37.1) % (oy * 0.6), 0.6 + (i % 3) * 0.3, 0, TAU); g.fill(); } }
    const snow = E.night ? '#c9d3dc' : '#f4f7fa', shade = E.night ? '#a9b6c2' : '#dbe4ec';
    const gr = g.createLinearGradient(0, top.y, 0, oy + 40); gr.addColorStop(0, snow); gr.addColorStop(1, shade);
    g.fillStyle = gr; g.beginPath(); g.moveTo(-20, top.y); g.lineTo(top.x, top.y); g.lineTo(foot.x, oy); g.lineTo(w + 20, oy); g.lineTo(w + 20, h + 20); g.lineTo(-20, h + 20); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,140,160,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-20, top.y); g.lineTo(top.x, top.y); g.lineTo(foot.x, oy); g.lineTo(w + 20, oy); g.stroke();
    { const r = rng(9); for (let i = 0; i < 12; i++) { const x = r() * w, y = oy + 18 + r() * (h - oy); g.fillStyle = withAlpha(shade, 0.6); g.beginPath(); g.ellipse(x, y, 30 + r() * 50, 4 + r() * 4, 0, 0, TAU); g.fill(); } }
    // pines up on the hilltop behind the start, and far out past where it stops
    for (const [x, y, s] of [[top.x - Ls * 1.6, top.y, 1], [top.x - Ls * 2.6, top.y, 0.8], [w - 40, oy, 0.9]]) if (x > 10 && x < w - 10) pine(g, x, y, Ls * 1.6 * s);
    { g.fillStyle = 'rgba(255,255,255,0.75)'; const hsh = (n) => { const z = Math.sin(n * 127.1 + 311.7) * 43758.5453; return z - Math.floor(z); };
      for (let i = 0; i < 50; i++) { const x = ((hsh(i) * (w + 20) + t * 18) % (w + 20)) - 10, y = ((hsh(i + 99) * (h + 20) + t * 40) % (h + 20)) - 10; g.beginPath(); g.arc(x, y, 1.2 + hsh(i + 7), 0, TAU); g.fill(); } }
  } else {
    interior(g, 0, 0, w, h, {});
    // the concrete floor, and the loading dock the ramp comes down from
    const fl = g.createLinearGradient(0, oy, 0, h); fl.addColorStop(0, E.night ? '#4a4b4f' : '#a9aaa6'); fl.addColorStop(1, E.night ? '#35363a' : '#8d8e8a');
    g.fillStyle = fl; g.fillRect(-20, oy, w + 40, h);
    g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 1; for (let x = (foot.x % 90) - 90; x < w; x += 90) { g.beginPath(); g.moveTo(x, oy); g.lineTo(x - 30, h); g.stroke(); }
    g.fillStyle = E.night ? '#2c2a29' : '#5c5650'; g.fillRect(-20, top.y, top.x + 22, oy - top.y);
    g.fillStyle = '#f2c94c'; for (let y = top.y + 4; y < oy - 6; y += 18) g.fillRect(top.x - 6, y, 6, 9);
    // the ramp: chequer plate on a steel frame
    const rg = g.createLinearGradient(top.x, top.y, foot.x, oy); rg.addColorStop(0, '#b8bdc4'); rg.addColorStop(1, '#8e949c');
    g.fillStyle = rg; g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(foot.x, oy); g.lineTo(foot.x, oy + 6); g.lineTo(top.x, top.y + 10); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#3c4046', 0.5); for (let i = 1; i < 14; i++) { const u = i / 14, x = top.x + (foot.x - top.x) * u, y = top.y + (oy - top.y) * u; g.beginPath(); g.moveTo(x - 3, y + 1); g.lineTo(x + 3, y + 5); g.stroke(); }
    g.strokeStyle = '#5b6068'; g.lineWidth = 3; for (let u = 0.3; u < 1; u += 0.35) { const x = top.x + (foot.x - top.x) * u, y = top.y + (oy - top.y) * u; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x, oy); g.stroke(); }
  }

  // ── the slope's angle at its foot, its length beside it, the run-out along the level
  { const R = clamp(k * Ldraw * 0.22, 36, 90);
    g.strokeStyle = P.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(foot.x, oy); g.lineTo(foot.x - R * 1.25, oy); g.stroke();
    g.beginPath(); g.arc(foot.x, oy, R, Math.PI + 0, Math.PI + al, false); g.stroke();
    // the arc runs from the level (to the left) up to the slope
    L.add(`${num(f.alpha, 1, { trim: true })}°`, foot.x - Math.cos(al / 2) * R * 1.25, oy - Math.sin(al / 2) * R * 1.25 + 2, { color: P.ink, pri: 10, size: 14, weight: 700, maxPush: 10 }); }
  if (f.L != null) {
    // into the hill, square to the slope: clear of what slides on top
    const nx = -sa, ny = ca, off = 22, a0 = { x: top.x + nx * off, y: top.y + ny * off }, a1 = { x: foot.x + nx * off, y: foot.y + ny * off };
    stroke(g, [a0, a1], { color: P.disp, width: 1.6 });
    for (const p of [a0, a1]) stroke(g, [{ x: p.x - nx * 6, y: p.y - ny * 6 }, { x: p.x + nx * 6, y: p.y + ny * 6 }], { color: P.disp, width: 1.6 });
    L.add(T`${num(f.L, 6, { trim: true })} [m]`, (a0.x + a1.x) / 2 + nx * 14, (a0.y + a1.y) / 2 + ny * 14, { color: P.disp, pri: 9, size: 14, weight: 700 });
  }

  // ── what slides: on the slope tilted with it, on the level flat
  const s = f.pos(t), q = pathAt(s), onSlope = s < f.sSlope - 1e-9;
  // tilts back to level over its own length as it reaches the foot
  // measured to the drawn foot, not to where it stops: stopping on the slope it stays tilted with it
  const blend = clamp((Ldraw - Math.min(s, f.sSlope)) / Math.max(1e-9, (Ls * 0.5) / k), 0, 1), rot = al * blend;
  g.save(); g.translate(q.x, q.y); g.rotate(rot);
  if (look === 'snow') sledge(g, Ls); else suitcase(g, Ls);
  g.restore();
  L.reserve({ x: q.x - Ls * 0.6, y: q.y - Ls * 0.8, w: Ls * 1.2, h: Ls * 0.8 });
  // its track in the snow
  if (look === 'snow' && s > 0) { const a0 = pathAt(0), pts = [a0]; if (s > f.sSlope) pts.push(foot); pts.push(q); stroke(g, pts.map((p) => ({ x: p.x, y: p.y - 1 })), { color: E.night ? '#8796a5' : '#a9b8c8', width: 2.4, alpha: 0.7 }); }

  // ── the reach of the bottom, and the run-out to rest
  if (!f.stopsOnSlope && t >= f.tB - 1e-9) {
    const e = ageOf(t, f.tB, f.tMax, 0.6);
    if (look === 'snow') dust(g, foot.x, oy, e.age, e.life, { size: 0.8 }); else pulse(g, foot.x, oy, e.age, e.life, P.mark, { radius: 16 });
    L.add(T`${sf(f.vBot)} [m s^-1] "at the bottom"`, foot.x + 8, oy + 30, { color: P.mark, pri: 10, size: 13, weight: 700, align: 'left', maxPush: 20 });
  }
  const stopP = pathAt(f.stopsOnSlope ? f.dStop : f.sSlope + f.s2);
  if (fired && t >= f.tRest - 1e-9) {
    const e = ageOf(t, f.tRest, f.tMax); pulse(g, stopP.x, stopP.y, e.age, e.life, P.mark, { radius: 24 });
    if (!f.stopsOnSlope) {
      // a ruler along the level from the foot to the stop: across, so dashed (rule 2)
      const y1 = oy + 58;
      stroke(g, [{ x: foot.x, y: y1 }, { x: stopP.x, y: y1 }], { color: P.disp, width: 1.6, dash: [6, 4] });
      for (const x of [foot.x, stopP.x]) stroke(g, [{ x, y: y1 - 6 }, { x, y: y1 + 6 }], { color: P.disp, width: 1.6 });
      L.add(T`${sf(f.s2)} [m] "along the ground"`, (foot.x + stopP.x) / 2, y1 + 16, { color: P.disp, pri: 10, size: 13, weight: 700, maxPush: 20 });
    } else L.add(T`"stops" ${sf(f.dStop)} [m] "down the slope"`, stopP.x, stopP.y - Ls - 10, { color: P.mark, pri: 10, size: 13, weight: 700, maxPush: 30 });
  }

  // ── the velocity and the acceleration: along the slope solid, along the level dashed (rule 2)
  const v = f.vel(t), A = f.acc(t), dirx = onSlope ? ca : 1, diry = onSlope ? sa : 0, dash = onSlope ? null : [6, 4];
  const row = (dd, val, max, col, unit, wd) => {
    const len = Math.min((Math.abs(val) / max) * 80, 80), sg = Math.sign(val);
    if (!(len >= 4)) return;
    // under the path, square off it
    const bx = q.x + (onSlope ? -sa : 0) * dd, by = q.y + (onSlope ? ca : 1) * dd;
    arrow(g, bx, by, bx + sg * dirx * len, by + sg * diry * len, { color: col, width: wd, head: Math.min(9, len * 0.6), dash });
    L.add(T`${s3(Math.abs(val))} [${unit}]`, bx - sg * dirx * 8, by - sg * diry * 8 + 4, { color: col, pri: 8, size: 13, weight: 700, align: sg > 0 ? 'right' : 'left', maxPush: 24 });
  };
  if (show.velocity !== false && Math.abs(v) >= 0.05) row(20, v, Math.max(f.u, f.vBot || 0, 1e-9), P.vel, 'm s^-1', 2.6);
  if (Math.abs(A) > 1e-9) row(42, A, Math.max(Math.abs(f.a1), Math.abs(f.a2 || 0), 1e-9), P.acc, 'm s^-2', 2.2);
  L.draw(g, w, h);
  return null;
}
