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

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, stroke, unview } from './util.js';
import { skyscape, fitSide, env, rng, softShadow, paper } from './scenery.js';
import { sledge, pine } from './rough.js';
import { pulse, ageOf, dust, flash } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
// 2 dp, but under 0.1 to 3 s.f., never a false 0
const s3 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));
const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });

/** A suitcase lying on its back, sliding: its base on y = 0, L px long, facing +x — a hard shell
    with ribs and a handle on its front end, no wheels touching (it slides, it does not roll). */
export function suitcase(g, L) {
  const E = env(), H = L * 0.42;
  g.save();
  softShadow(g, 0, 1, L * 0.55, 4, 0.7);
  const sh = g.createLinearGradient(0, -H, 0, 0); sh.addColorStop(0, E.night ? '#5d86b8' : '#5b93cf'); sh.addColorStop(1, E.night ? '#2c4f78' : '#2f5f93');
  g.fillStyle = sh; g.beginPath(); g.roundRect?.(-L / 2, -H, L, H, 6); g.fill();
  g.strokeStyle = withAlpha('#0d1c2c', 0.7); g.lineWidth = 1.4; g.stroke();
  g.strokeStyle = withAlpha('#ffffff', 0.25); g.lineWidth = 2;
  for (const f of [-0.3, -0.1, 0.1, 0.3]) { g.beginPath(); g.moveTo(L * f, -H + 4); g.lineTo(L * f, -4); g.stroke(); }
  // the zip round its middle, and the handle on the front end
  g.strokeStyle = withAlpha('#0d1c2c', 0.55); g.lineWidth = 1; g.beginPath(); g.moveTo(-L / 2 + 3, -H / 2); g.lineTo(L / 2 - 3, -H / 2); g.stroke();
  g.strokeStyle = '#2b2f36'; g.lineWidth = 3; g.beginPath(); g.moveTo(L / 2, -H * 0.3); g.lineTo(L / 2 + 6, -H * 0.3); g.lineTo(L / 2 + 6, -H * 0.7); g.lineTo(L / 2, -H * 0.7); g.stroke();
  g.fillStyle = '#f2c94c'; g.fillRect(-L * 0.38, -H * 0.85, L * 0.12, H * 0.25);       // a luggage tag
  g.restore();
}

/** A child sitting on a sledge, leaning back, holding its rope: on the deck at (0, 0), facing +x, size L (the sledge's length). */
function rider(g, L, P) {
  const E = env(), skin = E.night ? '#b08a74' : '#d9a988', coat = E.night ? '#b0413a' : '#d24a3c', trousers = '#2f3340';
  g.save(); g.translate(0, -L * 0.22);
  g.lineCap = 'round';
  // legs bent forward along the deck, knees up, boots at the curl
  g.strokeStyle = trousers; g.lineWidth = L * 0.09; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-L * 0.12, -L * 0.04); g.lineTo(L * 0.1, -L * 0.16); g.lineTo(L * 0.28, -L * 0.04); g.stroke();
  g.fillStyle = '#1c1d21'; g.beginPath(); g.ellipse(L * 0.32, -L * 0.05, L * 0.055, L * 0.035, 0, 0, TAU); g.fill();
  // body leaning back, arms forward to the rope, mitts on it
  g.strokeStyle = coat; g.lineWidth = L * 0.13; g.beginPath(); g.moveTo(-L * 0.12, -L * 0.06); g.lineTo(-L * 0.2, -L * 0.36); g.stroke();
  g.strokeStyle = coat; g.lineWidth = L * 0.06; g.beginPath(); g.moveTo(-L * 0.18, -L * 0.3); g.lineTo(L * 0.05, -L * 0.2); g.stroke();
  g.fillStyle = '#2e6fb4'; g.beginPath(); g.arc(L * 0.07, -L * 0.2, L * 0.035, 0, TAU); g.fill();
  // a scarf, its end streaming back
  g.strokeStyle = '#f2c94c'; g.lineWidth = L * 0.04; g.beginPath(); g.moveTo(-L * 0.24, -L * 0.37); g.lineTo(-L * 0.15, -L * 0.37); g.moveTo(-L * 0.22, -L * 0.37); g.lineTo(-L * 0.34, -L * 0.33); g.stroke();
  // head with a bobble hat
  g.fillStyle = skin; g.beginPath(); g.arc(-L * 0.22, -L * 0.45, L * 0.075, 0, TAU); g.fill();
  g.fillStyle = '#2e6fb4'; g.beginPath(); g.arc(-L * 0.22, -L * 0.48, L * 0.078, Math.PI, 0); g.fill();
  g.fillStyle = '#f4f7fa'; g.beginPath(); g.arc(-L * 0.22, -L * 0.56, L * 0.03, 0, TAU); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'runout') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520, compact = phone || h < 340 || w < 760;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const look = f.look, hasForces = f.m != null;
  const cardW = compact || !hasForces ? 0 : 230, cardH = 170;
  if (cardW) L.reserve({ x: w - cardW - 16, y: h - cardH - 16, w: cardW, h: cardH });

  // ── the path in its own plane: the top of the slope up-left, the foot at (0, 0), the level to the right
  const al = f.alpha * D2R, ca = Math.cos(al), sa = Math.sin(al);
  const Ldraw = f.L ?? f.sSlope * 1.2, run = f.stopsOnSlope ? 0 : f.s2;
  const Ls = clamp(Math.min(w, h) * 0.13, phone ? 34 : 46, 84);
  const area = { left: phone ? 10 : HB[0].w + 20, right: w - (cardW ? cardW + 30 : 14), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - (compact && hasForces ? 52 : 26) };
  const sky = phone ? 0.35 : 0.5;
  let fit = fitSide({ xLo: -Ldraw * ca, xHi: Math.max(run, Ldraw * 0.2), yLo: 0, yHi: Ldraw * sa }, area, { sky });
  for (let pass = 0; pass < 2; pass++) {
    const k0 = fit.k, padL = (Ls * 1.8) / k0, padR = (phone ? Ls * 1.0 : Ls + 60) / k0;
    fit = fitSide({ xLo: -Ldraw * ca - padL, xHi: Math.max(run, Ldraw * 0.2) + padR, yLo: -100 / k0, yHi: Ldraw * sa + (Ls * 1.6) / k0 }, area, { sky });
  }
  const { k, X, Y } = fit;
  const at = (s) => (s <= Ldraw ? { x: X(-(Ldraw - s) * ca), y: Y((Ldraw - s) * sa) } : { x: X(s - Ldraw), y: Y(0) });
  const pathAt = (s) => (s <= f.sSlope ? at(s) : at(Ldraw + (s - f.sSlope)));
  const top = at(0), foot = at(Ldraw), oy = foot.y;
  const out = { x: sa, y: -ca };                    // out of the slope, on screen (up and to the right)

  // ── the place
  if (look === 'snow') {
    skyscape(g, 0, 0, w, oy, { seed: 23, far: 'hills', sun: false });
    if (E.night) { g.fillStyle = withAlpha('#ffffff', 0.8); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc((i * 211.7) % w, (i * 37.1) % (oy * 0.6), 0.6 + (i % 3) * 0.3, 0, TAU); g.fill(); } }
    const snow = E.night ? '#c9d3dc' : '#f4f7fa', shade = E.night ? '#a9b6c2' : '#dbe4ec', face = E.night ? '#b9c5d0' : '#e6edf3';
    // the flat, then the hill: rising on to the left past the start, a rounded brow, a slightly shaded face, a soft foot
    g.fillStyle = shade; g.fillRect(-20, oy, w + 40, h - oy + 20);
    const gr = g.createLinearGradient(0, oy, 0, h); gr.addColorStop(0, snow); gr.addColorStop(1, shade);
    g.fillStyle = gr; g.fillRect(-20, oy, w + 40, h - oy + 20);
    const brow = { x: top.x - 14, y: top.y - 3 }, rise = { x: -20, y: top.y - Math.max(10, (top.x + 20) * 0.08) };
    g.fillStyle = face; g.beginPath(); g.moveTo(rise.x, rise.y); g.quadraticCurveTo(top.x - 30, top.y - 2, brow.x, brow.y);
    g.quadraticCurveTo(top.x, top.y, top.x + ca * 10, top.y + sa * 10); g.lineTo(foot.x - ca * 14, oy - sa * 14);
    g.quadraticCurveTo(foot.x, oy, foot.x + 18, oy); g.lineTo(-20, oy); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,140,160,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(rise.x, rise.y); g.quadraticCurveTo(top.x - 30, top.y - 2, brow.x, brow.y);
    g.quadraticCurveTo(top.x, top.y, top.x + ca * 10, top.y + sa * 10); g.lineTo(foot.x - ca * 14, oy - sa * 14); g.quadraticCurveTo(foot.x, oy, foot.x + 18, oy); g.lineTo(w + 20, oy); g.stroke();
    // a snow crest along the brow's own curve
    g.strokeStyle = withAlpha('#ffffff', 0.85); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(top.x - 30, top.y - 2); g.quadraticCurveTo(top.x - 10, top.y - 3, top.x + ca * 8, top.y + sa * 8); g.stroke();
    { const r = rng(9);
      for (let i = 0; i < 14; i++) { const x = r() * w, y = oy + 16 + r() * (h - oy); g.fillStyle = withAlpha(shade, 0.7); g.beginPath(); g.ellipse(x, y, 30 + r() * 50, 4 + r() * 4, 0, 0, TAU); g.fill(); }
      g.strokeStyle = withAlpha(E.night ? '#8796a5' : '#c3cfdb', 0.7); g.lineWidth = 1.2;
      for (let i = 0; i < 16; i++) { const x = r() * w, y = oy + 12 + r() * (h - oy); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 3, x + 22 + r() * 16, y); g.stroke(); }
      g.fillStyle = withAlpha('#ffffff', E.night ? 0.6 : 0.9); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r() * w, oy + 6 + r() * (h - oy), 0.8 + r(), 0, TAU); g.fill(); } }
    // pines along the rising hill behind the start, and far out past where it stops
    for (const [x, sz] of [[top.x - Ls * 1.4, 1], [top.x - Ls * 2.3, 0.85], [top.x - Ls * 3.2, 0.95]]) if (x > 8) pine(g, x, top.y - 2 - (top.x - x) * 0.08, Ls * 1.5 * sz);
    if (w - 36 > at(Ldraw + run).x + Ls * 1.5) pine(g, w - 36, oy, Ls * 1.4);
    { g.fillStyle = 'rgba(255,255,255,0.75)'; const hsh = (n) => { const z = Math.sin(n * 127.1 + 311.7) * 43758.5453; return z - Math.floor(z); };
      for (let i = 0; i < 50; i++) { const x = ((hsh(i) * (w + 20) + t * 18) % (w + 20)) - 10, y = ((hsh(i + 99) * (h + 20) + t * 40) % (h + 20)) - 10; g.beginPath(); g.arc(x, y, 1.2 + hsh(i + 7), 0, TAU); g.fill(); } }
  } else {
    // the warehouse: a corrugated back wall, steel columns, racking with boxes, lamps hung from the trusses
    const wall = g.createLinearGradient(0, 0, 0, oy); wall.addColorStop(0, E.night ? '#2b3036' : '#c9ced4'); wall.addColorStop(1, E.night ? '#3a4047' : '#dde1e5');
    g.fillStyle = wall; g.fillRect(0, 0, w, oy);
    g.strokeStyle = withAlpha('#000000', 0.08); g.lineWidth = 2; for (let x = 0; x < w; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, oy); g.stroke(); }
    g.strokeStyle = E.night ? '#4a5058' : '#8d949c'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 26); g.lineTo(w, 26); g.stroke();
    for (let x = 30; x < w; x += 120) { g.beginPath(); g.moveTo(x, 26); g.lineTo(x + 60, 8); g.lineTo(x + 120, 26); g.stroke(); }
    for (let x = 90; x < w; x += 240) {
      g.fillStyle = E.night ? '#3f4650' : '#6f7882'; g.fillRect(x - 6, 26, 12, oy - 26);
      g.fillStyle = '#2b2f36'; g.fillRect(x + 50, 26, 2, 18); g.fillStyle = E.night ? '#ffe29a' : '#fff4cf'; g.beginPath(); g.arc(x + 51, 48, 7, Math.PI, 0); g.fill();
      if (E.night) { const lg = g.createRadialGradient(x + 51, 50, 2, x + 51, 50, 90); lg.addColorStop(0, 'rgba(255,226,154,0.25)'); lg.addColorStop(1, 'rgba(255,226,154,0)'); g.fillStyle = lg; g.fillRect(x - 40, 40, 180, 120); }
    }
    { const r = rng(17), rackY = oy - 6;
      for (let x = foot.x + 30; x < w - 20; x += 150) {
        g.strokeStyle = '#d06a2a'; g.lineWidth = 3; for (const dx of [0, 110]) { g.beginPath(); g.moveTo(x + dx, rackY); g.lineTo(x + dx, rackY - 120); g.stroke(); }
        g.strokeStyle = '#2f6db0'; for (const lv of [40, 80, 120]) { g.beginPath(); g.moveTo(x, rackY - lv); g.lineTo(x + 110, rackY - lv); g.stroke(); }
        for (const lv of [0, 40, 80]) for (let bx = x + 6; bx < x + 100; bx += 34) { const bh = 18 + r() * 14; g.fillStyle = r() < 0.5 ? '#b98a55' : '#a8794a'; g.fillRect(bx, rackY - lv - bh - 2, 28, bh); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(bx + 11, rackY - lv - bh - 2, 6, bh); }
      } }
    // the floor: a concrete slab with joints, a yellow aisle line, scuffs
    const fl = g.createLinearGradient(0, oy, 0, h); fl.addColorStop(0, E.night ? '#4a4b4f' : '#b4b5b1'); fl.addColorStop(1, E.night ? '#35363a' : '#93948f');
    g.fillStyle = fl; g.fillRect(-20, oy, w + 40, h);
    g.strokeStyle = withAlpha('#000000', 0.18); g.lineWidth = 1; for (let x = (foot.x % 140) - 140; x < w; x += 140) { g.beginPath(); g.moveTo(x, oy); g.lineTo(x - 40, h); g.stroke(); }
    g.fillStyle = '#e8c242'; g.fillRect(-20, oy + 12, w + 40, 4);
    { const r = rng(4); g.fillStyle = withAlpha('#000000', 0.08); for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(r() * w, oy + 20 + r() * (h - oy), 10 + r() * 30, 2 + r() * 3, 0, 0, TAU); g.fill(); } }
    // the loading dock: a concrete face with rubber bumpers and a steel edge, a roller shutter above, boxes on top
    const dockR = top.x - 2;
    g.fillStyle = E.night ? '#5a5853' : '#a7a29a'; g.fillRect(-20, top.y, dockR + 20, oy - top.y);
    g.strokeStyle = withAlpha('#000000', 0.15); for (let y = top.y + 14; y < oy; y += 14) { g.beginPath(); g.moveTo(-20, y); g.lineTo(dockR, y); g.stroke(); }
    g.fillStyle = '#6b7079'; g.fillRect(-20, top.y - 3, dockR + 20, 4);
    g.fillStyle = '#1d1e21'; for (let y = top.y + 10; y < oy - 12; y += 30) g.fillRect(dockR - 6, y, 8, 16);
    const shH = Math.min(top.y - 30, Ls * 2.2);
    if (shH > 20) { g.fillStyle = E.night ? '#565c64' : '#9aa1aa'; g.fillRect(Math.max(-20, dockR - Ls * 2.4), top.y - shH, Ls * 2.2, shH); g.strokeStyle = withAlpha('#000000', 0.18); for (let y = top.y - shH + 5; y < top.y; y += 5) { g.beginPath(); g.moveTo(Math.max(-20, dockR - Ls * 2.4), y); g.lineTo(dockR - Ls * 0.2, y); g.stroke(); } }
    if (dockR - Ls * 0.6 > 0) { g.fillStyle = '#b98a55'; g.fillRect(dockR - Ls * 0.95, top.y - 22, 26, 22); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(dockR - Ls * 0.95 + 10, top.y - 22, 6, 22); }
    // the ramp: a thick steel channel with a kerb, a hinged lip at the top and a toe plate at the foot, square legs on base plates
    const th = 9, nx = -sa, ny = ca;
    g.fillStyle = '#9ea4ab'; g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(foot.x, oy); g.lineTo(foot.x + nx * th, oy + ny * th); g.lineTo(top.x + nx * th, top.y + ny * th); g.closePath(); g.fill();
    g.strokeStyle = '#5b6068'; g.lineWidth = 2; g.beginPath(); g.moveTo(top.x - out.x * 5, top.y - out.y * 5 - 0); g.lineTo(foot.x - out.x * 5 + 0, oy - out.y * 5); g.stroke();
    g.strokeStyle = withAlpha('#3c4046', 0.45); g.lineWidth = 1; for (let i = 1; i < 20; i++) { const u = i / 20, x = top.x + (foot.x - top.x) * u, y = top.y + (oy - top.y) * u; g.beginPath(); g.moveTo(x - 2, y + 2); g.lineTo(x + 2, y + 5); g.stroke(); }
    g.fillStyle = '#7d838c'; g.fillRect(top.x - 12, top.y - 2, 14, 4); g.fillRect(foot.x - 2, oy - 2, 12, 3);
    for (const u of [0.35, 0.7]) { const x = top.x + (foot.x - top.x) * u, y = top.y + (oy - top.y) * u + th; g.fillStyle = '#5b6068'; g.fillRect(x - 3, y, 6, oy - y); g.fillStyle = '#3c4046'; g.fillRect(x - 7, oy - 3, 14, 3); }
  }

  // ── the slope's angle at its foot: a dark ink that reads on snow, its label inside the opening
  { const R = clamp(k * Ldraw * 0.22, 48, 96), ink = look === 'snow' ? (E.night ? '#e8eef4' : '#33404c') : P.ink;
    g.strokeStyle = ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(foot.x, oy); g.lineTo(foot.x - R * 1.25, oy); g.stroke();
    g.beginPath(); g.arc(foot.x, oy, R, Math.PI, Math.PI + al, false); g.stroke();
    // at the left end of its baseline, where nothing that slides ever reaches
    L.add(`${num(f.alpha, 1, { trim: true })}°`, foot.x - R * 1.35, oy - 9, { color: ink, pri: 11, size: 14, weight: 700, maxPush: 10, align: 'right' }); }
  // the slope's length, above the surface clear of what slides; or, stopping on the slope, how far down it went
  const rulerOff = look === 'snow' ? Ls * 0.95 + 14 : Ls * 0.45 + 14;
  const sRuler = (s0, s1, label, solid) => {
    const p0 = at(s0), p1 = at(s1), a0 = { x: p0.x + out.x * rulerOff, y: p0.y + out.y * rulerOff }, a1 = { x: p1.x + out.x * rulerOff, y: p1.y + out.y * rulerOff };
    stroke(g, [a0, a1], { color: P.disp, width: 1.6 });
    for (const p of [a0, a1]) stroke(g, [{ x: p.x - out.x * 6, y: p.y - out.y * 6 }, { x: p.x + out.x * 6, y: p.y + out.y * 6 }], { color: P.disp, width: 1.6 });
    // faint extension lines from the path's ends to the ruler's ticks
    for (const [p, a] of [[p0, a0], [p1, a1]]) stroke(g, [p, a], { color: P.disp, width: 1, alpha: 0.35 });
    L.add(label, (a0.x + a1.x) / 2 + out.x * 14, (a0.y + a1.y) / 2 + out.y * 14, { color: P.disp, pri: 9, size: 14, weight: 700, maxPush: 16 });
  };
  if (f.L != null && !(f.stopsOnSlope && t >= f.tRest - 1e-9) && !(!f.stopsOnSlope && t >= f.tB - 1e-9 && t < f.tB + Math.max(0.8, (f.tRest - f.tB) * 0.4))) sRuler(0, Ldraw, T`${num(f.L, 6, { trim: true })} [m]`);

  // ── what slides: tilted with the slope, levelling over its own length at the foot (a little chatter as it does)
  const s = f.pos(t), q = pathAt(s), onSlope = s < f.sSlope - 1e-9 || f.stopsOnSlope;
  const blend = clamp((Ldraw - Math.min(s, f.sSlope)) / Math.max(1e-9, (Ls * 0.5) / k), 0, 1);
  const chatter = blend > 0 && blend < 1 ? Math.sin(t * 60) * 0.03 * (1 - Math.abs(blend * 2 - 1)) : 0;
  // the stop ring is drawn under the object, and wider than it
  if (fired && t >= f.tRest - 1e-9) { const stopP = pathAt(f.stopsOnSlope ? f.dStop : f.sSlope + f.s2), e = ageOf(t, f.tRest, f.tMax); pulse(g, stopP.x, stopP.y, e.age, e.life, P.mark, { radius: Ls * 0.8 }); }
  if (look === 'snow' && s > 0) {
    const pts = [pathAt(0)]; if (s > f.sSlope) pts.push(foot); pts.push(q);
    for (const off of [-2, 2]) stroke(g, pts.map((p) => ({ x: p.x, y: p.y + off * 0.5 - 1 })), { color: E.night ? '#8796a5' : '#a9b8c8', width: 2, alpha: 0.7 });
  }
  g.save(); g.translate(q.x, q.y); g.rotate(al * blend + chatter);
  if (look === 'snow') { sledge(g, Ls); rider(g, Ls, P); } else suitcase(g, Ls);
  g.restore();
  for (let i = -1; i <= 1; i++) { const c = pathAt(Math.max(0, s + (i * Ls * 0.33) / k)); L.reserve({ x: c.x - Ls * 0.2, y: c.y - Ls * 0.55, w: Ls * 0.4, h: Ls * 0.55 }); }

  // ── the foot of the slope: snow sprayed forward of the runners (or a clank on the toe plate), its speed there flagged
  if (!f.stopsOnSlope && t >= f.tB - 1e-9) {
    const e = ageOf(t, f.tB, f.tMax, 0.7);
    if (look === 'snow') dust(g, foot.x + Ls * 0.3, oy, e.age, e.life, { size: 1.4, color: '#ffffff', n: 18 });
    else flash(g, foot.x + 4, oy - 2, e.age, e.life * 0.6, { radius: 14 });
    // the speed it reaches the bottom with, on a flag above the foot, while it is near
    if (t < f.tB + Math.max(0.8, (f.tRest - f.tB) * 0.4)) {
      // the pole starts above the object, so it never spears it; the words to the right of the foot
      const fy = oy - Ls * 1.6; stroke(g, [{ x: foot.x, y: oy - Ls * 1.0 }, { x: foot.x, y: fy + 4 }], { color: P.vel, width: 1.4, alpha: 0.8 });
      L.add(T`${sf(f.vBot)} [m s^-1] "at the bottom"`, foot.x + 6, fy, { color: P.vel, pri: 10, size: 13, weight: 700, maxPush: 16, align: 'left' });
    } else L.add(T`${sf(f.vBot)} [m s^-1] "at the bottom"`, foot.x + 4, oy + 120, { color: P.vel, pri: 8, size: 13, weight: 700, align: 'left', maxPush: 16 });
  }
  // ── at rest: the run-out along the level (dashed: across, rule 2), or how far down the slope (solid, along it)
  if (fired && t >= f.tRest - 1e-9) {
    if (!f.stopsOnSlope) {
      const stopP = pathAt(f.sSlope + f.s2), y1 = oy + 70;
      stroke(g, [{ x: foot.x, y: y1 }, { x: stopP.x, y: y1 }], { color: P.disp, width: 1.6, dash: [6, 4] });
      for (const x of [foot.x, stopP.x]) stroke(g, [{ x, y: y1 - 6 }, { x, y: y1 + 6 }], { color: P.disp, width: 1.6 });
      L.add(T`${sf(f.s2)} [m] "along the ground"`, (foot.x + stopP.x) / 2, y1 + 16, { color: P.disp, pri: 10, size: 13, weight: 700, maxPush: 20 });
    } else sRuler(0, f.dStop, T`"stops" ${sf(f.dStop)} [m] "down the slope"`);
  }

  // ── the velocity and the acceleration: two rows under the path — solid down the slope, dashed on the level
  const v = f.vel(t), A = f.acc(t), dir = onSlope ? { x: ca, y: sa } : { x: 1, y: 0 }, into = onSlope ? { x: -sa, y: ca } : { x: 0, y: 1 }, dash = onSlope ? null : [6, 4];
  const row = (dd, val, max, col, unit, wd) => {
    const len = Math.min((Math.abs(val) / max) * 80, 80), sg = Math.sign(val);
    if (!(len >= 4)) return;
    const bx = q.x + into.x * dd, by = q.y + into.y * dd;
    arrow(g, bx, by, bx + sg * dir.x * len, by + sg * dir.y * len, { color: col, width: wd, head: Math.min(9, len * 0.6), dash });
    L.add(T`${s3(Math.abs(val))} [${unit}]`, bx - sg * dir.x * 8, by - sg * dir.y * 8 + 4, { color: col, pri: 9, size: 13, weight: 700, align: sg > 0 ? 'right' : 'left', maxPush: 24 });
  };
  if (show.velocity !== false && Math.abs(v) >= 0.05) row(22, v, Math.max(f.u, f.vBot || 0, 1e-9), P.vel, 'm s^-1', 2.6);
  if (Math.abs(A) > 1e-9) row(46, A, Math.max(Math.abs(f.a1), Math.abs(f.a2 || 0), 1e-9), P.acc, 'm s^-2', 2.2);
  L.draw(g, w, h);

  // ── the forces on it for this moment (from the engine): a card, or on a small stage a caption
  const FF = f.forces?.(t);
  // no mass, no forces in newtons: say so where the card would be
  if (!FF) { unview(g); g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle'; const txt = 'Give its mass for the forces in newtons'; const tw = g.measureText(txt).width + 14; paper(g, w - tw - 16, h - 38, tw, 24); g.fillStyle = P.muted; g.fillText(txt, w - tw - 9, h - 26); g.restore(); }
  if (FF) {
    unview(g);
    const where = FF.phase === 'rest' ? (FF.holding ? 'Held on the slope' : 'At rest') : FF.slope ? 'Down the slope' : 'On the level';
    const items = [...(FF.slope ? [T`m g sin alpha = ${sf(FF.W)} [N]`] : []), T`R = ${sf(FF.R)} [N]`, Math.abs(FF.F) > 1e-9 ? T`F = ${sf(Math.abs(FF.F))} [N] ${FF.holding ? '"holding it"' : '"against it"'}` : 'no friction'];
    if (cardW) {
      const cx = w - cardW - 16, cy = h - cardH - 16, lab = (txt, x, y, col, al2 = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = al2; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
      paper(g, cx, cy, cardW, cardH);
      lab(`${where}: the forces`, cx + 12, cy + 16, P.muted);
      // the body on its surface, tilted with it, arrows to one scale
      const bx = cx + 60, by = cy + 88, big = Math.max(FF.R, f.m * f.g, 1e-9), sc = 34 / big, tilt = FF.slope ? al : 0, Lm = (x) => (x > 1e-9 ? Math.max(14, x * sc) : 0);
      g.save(); g.translate(bx, by); g.rotate(tilt);
      g.strokeStyle = withAlpha(P.ink, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-46, 10); g.lineTo(46, 10); g.stroke();
      g.fillStyle = withAlpha(P.ink, 0.1); g.strokeStyle = P.ink; g.beginPath(); g.roundRect?.(-14, -10, 28, 20, 3); g.fill(); g.stroke();
      if (Lm(FF.R)) arrow(g, 0, -10, 0, -10 - Lm(FF.R), { color: P.ink, width: 2.2, head: 8 });
      if (Lm(Math.abs(FF.F))) { const sgn = Math.sign(FF.F); arrow(g, sgn * 14, 10, sgn * (14 + Lm(Math.abs(FF.F))), 10, { color: P.ink, width: 2.2, head: 7 }); }
      g.restore();
      arrow(g, bx, by + 10, bx, by + 10 + Lm(f.m * f.g), { color: P.ink, width: 2.2, head: 8 });
      items.forEach((it, i) => lab(it, cx + cardW - 10, cy + 40 + i * 20, P.ink, 'right'));
      lab(T`m g = ${sf(f.m * f.g)} [N]`, cx + cardW - 10, cy + cardH - 14, P.muted, 'right');
    } else {
      g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
      const parts = [where.toLowerCase(), ...items], one = parts.join(', '), lines = g.measureText(one).width + 14 <= w - 20 ? [one] : [parts.slice(0, 2).join(', '), parts.slice(2).join(', ')];
      const tw = Math.max(...lines.map((x) => g.measureText(x).width)) + 14, bh = 8 + 18 * lines.length;
      paper(g, 10, h - bh - 8, tw, bh); g.fillStyle = P.ink; lines.forEach((x, i) => g.fillText(x, 17, h - bh - 8 + 13 + i * 18)); g.restore();
    }
  }
  return null;
}
