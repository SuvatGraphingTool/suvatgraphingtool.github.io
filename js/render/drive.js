// drive.js — the stage for a car (or a lorry) driven up a hill and down it,
// side on: a country road climbing a hillside from a village at its foot to
// the brow, a stone wall and trees along its far side, a crash barrier along
// its near side, marker posts where the paper's distance begins and ends.
// Driven up the hill it starts at the lower post in the near lane; driven
// down it starts at the upper post in the far lane, outlined in the second
// object's hue as its graph lines are. Each is held where its distance ends,
// its speed there flagged.
//
// The road's angle is marked at the foot. A road flatter than 7° is drawn at
// 7° and says so: a true 3° hill is too flat to see. The distance is a ruler
// under the road; a height it rises, when the paper gives one, a dimension at
// the top. A card fixed to the screen shows the forces along the road on
// each, from the engine: the driving force, the resistance, the weight's
// component, and their resultant, ma.
//
// THE MOMENTS: a puff of exhaust as each sets off; a ring and its speed
// where its distance ends. At the engine's own times.
//
// Everything drawn is read from js/core/drive.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, stroke, unview } from './util.js';
import { skyscape, fitSide, env, rng, paper, softShadow } from './scenery.js';
import { car, lorry, phaseFor, tree } from './figures.js';
import { pulse, ageOf, dust } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2, MIN_DRAW = 7;
const s3 = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });
// a force to four figures: 1475 N is not rounded to 1480
const s4 = (x) => num(Number(x.toPrecision(4)), 6, { trim: true });
const NAME = { up: 'Up the hill', down: 'Down the hill' };
// the car coming down is painted red, its tag and card heading too: two silver cars cannot be told apart
const DOWN_PAINT = '#b03a32', DOWN_INK = '#c2453c';

/** A cottage at the foot, its base on y = Y, x its left side, W wide: rendered walls, a slate roof, windows, a chimney. */
function cottage(g, x, Y, W, { seed = 1, lit = false } = {}) {
  const E = env(), r = rng(seed), H = W * (0.55 + r() * 0.15), roof = W * 0.38;
  const wall = ['#efe6d2', '#e3d3b4', '#f2ede2'][seed % 3];
  softShadow(g, x + W / 2, Y + 1, W * 0.6, 4, 0.5);
  g.fillStyle = E.night ? withAlpha(wall, 0.55) : wall; g.fillRect(x, Y - H, W, H);
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; g.strokeRect(x, Y - H, W, H);
  g.fillStyle = E.night ? '#3a3f48' : '#5c6470'; g.beginPath(); g.moveTo(x - 4, Y - H); g.lineTo(x + W * 0.5, Y - H - roof); g.lineTo(x + W + 4, Y - H); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#5a4a42' : '#8a6a58'; g.fillRect(x + W * 0.68, Y - H - roof * 0.9, W * 0.1, roof * 0.6);
  const win = lit ? '#ffd98a' : E.night ? '#2c3440' : '#9cb7cc';
  for (const fx of [0.18, 0.62]) { g.fillStyle = win; g.fillRect(x + W * fx, Y - H * 0.75, W * 0.2, H * 0.25); g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.strokeRect(x + W * fx, Y - H * 0.75, W * 0.2, H * 0.25); }
  g.fillStyle = ['#2f5f93', '#8c2f2a', '#2f6b45'][seed % 3]; g.fillRect(x + W * 0.42, Y - H * 0.42, W * 0.16, H * 0.42);
}

/** A white marker post with a red reflector, base at (x, Y), H tall. */
function marker(g, x, Y, H) {
  g.fillStyle = '#f4f4f0'; g.fillRect(x - 2.5, Y - H, 5, H);
  g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = 1; g.strokeRect(x - 2.5, Y - H, 5, H);
  g.fillStyle = '#d0342c'; g.fillRect(x - 2.5, Y - H + 4, 5, 7);
  g.fillStyle = '#2b2f36'; g.fillRect(x - 2.5, Y - H * 0.35, 5, 3);
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'drive') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520, compact = phone || h < 380 || w < 760;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const two = f.ways.length > 1;
  const HB = hudBoxes(w, two ? 4 : 3); for (const b of HB) L.reserve(b);
  // the forces along the road on each, from the engine; a found force says so
  const items = (n) => { const W = f[n], found = (q) => (f.find === q ? ' "found"' : ''); return [
    { txt: T`D = ${s4(W.D)} [N]${found('D')}`, sg: 1, size: W.D },
    ...(W.R > 1e-9 || f.find === 'R' ? [{ txt: T`R = ${s4(W.R)} [N]${found('R')}`, sg: -1, size: W.R }] : []),
    { txt: T`m g sin alpha = ${s4(f.W)} [N]`, sg: n === 'up' ? -1 : 1, size: f.W },
  ]; };
  const heading = two ? 'Along the road, the way each drives +' : 'Along the road, forwards +';
  // the card side by side, one column a way, as wide as its words, low enough to sit on the grass under the brow
  g.save(); g.font = '700 13px system-ui, sans-serif';
  const colW = Math.max(150, ...f.ways.flatMap((n) => [...items(n), { txt: T`m a = ${s4(f[n].net)} [N]` }].map((x) => g.measureText(x.txt).width + 52)));
  const cardW = compact ? 0 : Math.max(colW * f.ways.length, g.measureText(heading).width + 24), cardH = 122;
  // on a small stage the forces are a caption instead: its lines built here, so the road can keep clear of it
  const capLines = [];
  if (!cardW) for (const n of f.ways) {
    const parts = [`${two ? `${n === 'up' ? 'Up' : 'Down'}: ` : ''}${items(n).map((x) => `${x.sg > 0 ? '→' : '←'} ${x.txt}`).join(', ')}`, T`m a = ${s4(f[n].net)} [N]`];
    let line = '';
    for (const part of parts.join(', ').split(', ')) { const next = line ? `${line}, ${part}` : part; if (line && g.measureText(next).width + 14 > w - 20) { capLines.push(line); line = part; } else line = next; }
    if (line) capLines.push(line);
  }
  g.restore();
  const capH = capLines.length ? 8 + 18 * capLines.length : 0;
  if (cardW) L.reserve({ x: w - cardW - 16, y: h - cardH - 16, w: cardW, h: cardH });
  if (capH) L.reserve({ x: 10, y: h - capH - 8, w: w - 20, h: capH });

  // ── the road in its own plane: the slope from its foot (0, 0) up to the right, the paper's
  // distance from ℓ = e to ℓ = e + s on it, flat road on past each end
  const ad = Math.max(f.alpha, MIN_DRAW) * D2R, ca = Math.cos(ad), sa = Math.sin(ad), steeper = f.alpha < MIN_DRAW - 1e-9;
  const e = f.s * 0.1, S = f.s + 2 * e;
  let Lc = clamp(Math.min(w, h) * 0.15, phone ? 40 : 56, 100) * (f.look === 'lorry' ? 1.45 : 1);
  // the readouts on the left sit over the low end's sky: the road need only clear the ones on the right
  // on a phone too the road climbs under the right-hand readouts only: the left-hand ones sit over the low end's sky
  const area = { left: phone ? 10 : HB[0].w - 10, right: w - 14, top: HB[1].h + 8, bottom: h - (capH ? capH + 18 : 22) };
  let fit = fitSide({ xLo: -S * 0.05, xHi: S * ca * 1.05, yLo: 0, yHi: S * sa }, area, { sky: 0.45 });
  // room under the road for the ruler's ticks; and where the card sits, the road kept above it
  let lift = phone ? 70 : 120;
  for (let pass = 0; pass < 5; pass++) {
    // never a car longer than a third of the distance it drives
    Lc = Math.min(Lc, Math.max(24, f.s * fit.k * 0.3));
    const k0 = fit.k, over = (Lc * 1.3 + 40) / k0;
    fit = fitSide({ xLo: -S * 0.04 - Lc * 0.6 / k0, xHi: S * ca + Lc * 0.6 / k0, yLo: -lift / k0, yHi: S * sa + over }, area, { sky: 0.45 });
    if (!cardW) continue;
    const xw = (w - cardW - 16 - fit.X(0)) / fit.k, roadY = fit.Y(clamp(xw, 0, S * ca) * Math.tan(ad)), clear = h - cardH - 16 - 26;
    if (roadY > clear) lift += roadY - clear; else break;
  }
  const { k, X, Y } = fit;
  const at = (l) => (l <= 0 ? { x: X(l), y: Y(0) } : l >= S ? { x: X(S * ca + (l - S)), y: Y(S * sa) } : { x: X(l * ca), y: Y(l * sa) });
  const foot = at(0), brow = at(S), along = { x: ca, y: -sa }, out = { x: -sa, y: -ca };
  const off = (p, d) => ({ x: p.x + out.x * d, y: p.y + out.y * d });
  const road = [{ x: -40, y: foot.y }, foot, brow, { x: w + 40, y: brow.y }];
  // two lanes: the near one on the kerb's line, the far one a lane's width beyond it (seen a little from above)
  const laneW = two ? clamp(Lc * 0.26, 10, 22) : 0;

  // ── the place: the sky and far hills, the fields behind the road, the hillside under it
  skyscape(g, 0, 0, w, brow.y + 10, { seed: 41, far: 'hills', sun: !E.night });
  const back = E.night ? '#33502f' : '#8fb768', backDark = E.night ? '#2b4628' : '#7ca457';
  g.fillStyle = back; g.beginPath(); g.moveTo(-20, brow.y + 10); g.lineTo(w + 20, brow.y + 10); g.lineTo(w + 20, brow.y); g.lineTo(brow.x, brow.y); g.lineTo(foot.x, foot.y); g.lineTo(-20, foot.y); g.closePath(); g.fill();
  // field boundaries across the far slope
  { g.strokeStyle = withAlpha(backDark, 0.9); g.lineWidth = 2; const r = rng(5);
    for (let i = 1; i < 4; i++) { const yy = brow.y + 10 + ((foot.y - brow.y - 10) * i) / 4; g.beginPath(); g.moveTo(-20, yy); g.quadraticCurveTo(w * 0.5, yy - 10 - r() * 8, w + 20, yy - 4); g.stroke(); } }
  // the hillside under the road, darker towards the bottom, with a few tufts
  { const gr = g.createLinearGradient(0, brow.y, 0, h); gr.addColorStop(0, E.night ? '#2f4a2c' : '#73a04f'); gr.addColorStop(1, E.night ? '#223820' : '#567f3b');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-40, foot.y); g.lineTo(foot.x, foot.y); g.lineTo(brow.x, brow.y); g.lineTo(w + 40, brow.y); g.lineTo(w + 40, h + 20); g.lineTo(-40, h + 20); g.closePath(); g.fill();
    const r = rng(11); g.strokeStyle = withAlpha(E.night ? '#1b2e1a' : '#47702f', 0.6); g.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) { const x = r() * w, y = foot.y + 30 + r() * (h - foot.y); const top = Math.min(y, brow.y + 30 + (x - brow.x < 0 ? (foot.y - brow.y) * ((brow.x - x) / Math.max(1, brow.x - foot.x)) : 0)); if (y < top) continue; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 5); g.moveTo(x, y); g.lineTo(x + 2, y - 5); g.stroke(); } }
  // the village at the foot, behind the road; trees along the far side of the climb and at the brow
  { const cw = clamp(Lc * 0.75, 40, 70);
    for (let i = 0, x = foot.x - cw * 1.3; i < 3 && x > -cw; i++, x -= cw * 1.35) cottage(g, x - cw, foot.y - 12, cw, { seed: i + 1, lit: E.night });
    for (const [u, sz] of [[0.2, 1], [0.45, 0.85], [0.72, 1.1], [1.0, 0.95]]) { const p = off(at(S * u), 12 + laneW); if (p.x > 10 && p.x < w - 10) tree(g, p.x, p.y, Lc * 1.15 * sz, { seed: Math.round(u * 40) }); }
    for (const dx of [Lc * 1.2, Lc * 2.6]) { const x = brow.x + dx; if (x < w - 20) tree(g, x, brow.y - 12, Lc * 1.25, { seed: Math.round(dx) }); } }
  // a dry-stone wall along the far verge of the climb
  { const a = off(foot, 10 + laneW), b = off(brow, 10 + laneW), hgt = 9;
    g.fillStyle = E.night ? '#6c6a64' : '#a59d8e'; g.beginPath(); g.moveTo(-20, a.y); g.lineTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(w + 20, b.y); g.lineTo(w + 20, b.y - hgt); g.lineTo(b.x + out.x * hgt, b.y + out.y * hgt); g.lineTo(a.x + out.x * hgt, a.y + out.y * hgt); g.lineTo(-20, a.y - hgt); g.closePath(); g.fill();
    g.strokeStyle = withAlpha('#3d3a35', 0.4); g.lineWidth = 1;
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 11);
    for (let i = 0; i <= n; i++) { const u = i / n, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, j = (i % 2) * 4; g.beginPath(); g.moveTo(x + out.x * j, y + out.y * j); g.lineTo(x + out.x * (j + 4), y + out.y * (j + 4)); g.stroke(); }
    g.beginPath(); g.moveTo(a.x + out.x * 4.5, a.y + out.y * 4.5); g.lineTo(b.x + out.x * 4.5, b.y + out.y * 4.5); g.stroke(); }

  // ── the road: tarmac with its near kerb, a dashed centre line, a crash barrier along the near side
  g.save(); g.lineJoin = 'round';
  stroke(g, road.map((p) => off(p, 2 + laneW / 2)), { color: E.night ? '#2f3237' : '#4d5157', width: 14 + laneW });
  stroke(g, road.map((p) => off(p, -5)), { color: E.night ? '#8a8d92' : '#bfc2c6', width: 2 });
  g.strokeStyle = withAlpha('#ffffff', 0.8); g.lineWidth = 1.4; g.setLineDash([10, 9]); g.beginPath(); road.forEach((p, i) => { const q = off(p, 3 + laneW / 2); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.stroke(); g.setLineDash([]);
  g.restore();
  { const d0 = -14, rail = road.map((p) => off(p, d0 - 8));
    for (let i = 0; i < 3; i++) { const a = road[i], b = road[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.floor(len / 34));
      for (let j = 0; j < n; j++) { const u = j / n, p = off({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, d0); g.fillStyle = '#6f757d'; g.fillRect(p.x - 1.5, p.y - 12, 3, 13); } }
    stroke(g, rail, { color: E.night ? '#9aa1aa' : '#c3c8ce', width: 4 }); stroke(g, rail, { color: withAlpha('#3c4046', 0.5), width: 1 }); }
  // a hill sign at the foot, on the near side
  { const p = off(at(-S * 0.03), -30), z = 15;
    g.fillStyle = '#6f757d'; g.fillRect(p.x - 1.5, p.y - z * 2.6, 3, z * 2.6);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#d0342c'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(p.x, p.y - z * 4.2); g.lineTo(p.x + z, p.y - z * 2.5); g.lineTo(p.x - z, p.y - z * 2.5); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#1c1d21'; g.beginPath(); g.moveTo(p.x - z * 0.55, p.y - z * 2.8); g.lineTo(p.x + z * 0.55, p.y - z * 2.8); g.lineTo(p.x + z * 0.55, p.y - z * 3.4); g.closePath(); g.fill(); }
  // marker posts where the distance begins and ends
  // on the near verge, under the barrier: never poking up through a car standing at its post
  for (const l of [e, e + f.s]) { const p = off(at(l), -30); marker(g, p.x, p.y, 16); }

  // ── the road's angle at the foot: the horizontal on along the flat, the arc up to the road
  // drawn on the grass under the road, from the near kerb: the horizontal, the arc, a faint wedge between
  { const R = clamp(k * S * 0.32, 70, 160), F = off(foot, -8), ink = E.night ? '#e8eef4' : '#22303c';
    g.fillStyle = withAlpha(ink, 0.12); g.beginPath(); g.moveTo(F.x, F.y); g.arc(F.x, F.y, R, -ad, 0); g.closePath(); g.fill();
    stroke(g, [F, { x: F.x + R * 1.15, y: F.y }], { color: ink, width: 1.4, dash: [4, 4], alpha: 0.9 });
    stroke(g, [F, { x: F.x + R * 1.1 * Math.cos(ad), y: F.y - R * 1.1 * Math.sin(ad) }], { color: ink, width: 1.4, alpha: 0.9 });
    g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.arc(F.x, F.y, R, -ad, 0); g.stroke();
    // as the paper gave it: the angle, or its sine (from the height risen, too)
    const tag = f.angleGiven === 'alpha' ? `${num(f.alpha, 1, { trim: true })}°` : T`sin alpha = ${s4(f.sinA)}`;
    // left of the foot, under the flat, clear of the climb's arrows; a road flatter than 7° is drawn at 7°, and the label says so
    // under the horizontal, by the arc
    L.add(steeper ? `${tag}, drawn steeper` : tag, F.x + R * 0.55, F.y + 18, { color: ink, pri: 11, size: 14, weight: 700, align: 'left', maxPush: 40, push: 'down' }); }

  // ── the distance: a ruler under the road (solid: along the slope), and the height it rises at the top when given
  { const d = laneW + Lc * 0.42 + (two ? 96 : 40), a0 = off(at(e), d), a1 = off(at(e + f.s), d);
    stroke(g, [a0, a1], { color: P.disp, width: 1.6 });
    for (const p of [a0, a1]) stroke(g, [off(p, -6), off(p, 6)], { color: P.disp, width: 1.6 });
    // nothing written over the ruler or its ticks
    for (let u = 0; u <= 1.0001; u += 0.1) L.reserve({ x: a0.x + (a1.x - a0.x) * u - 7, y: a0.y + (a1.y - a0.y) * u - 7, w: 14, h: 14 });
    for (const [l, a] of [[e, a0], [e + f.s, a1]]) stroke(g, [off(at(l), 30), a], { color: P.disp, width: 1, alpha: 0.35 });
    L.add(T`${s3(f.s)} [m]`, (a0.x + a1.x) / 2 + out.x * 14, (a0.y + a1.y) / 2 + out.y * 14, { color: P.disp, pri: 10, size: 14, weight: 700, maxPush: 16 });
    if (f.h != null) {
      const top = at(e + f.s), lo = at(e), xR = top.x + Lc * 0.75;
      stroke(g, [lo, { x: xR + 6, y: lo.y }], { color: P.muted, width: 1, dash: [4, 4], alpha: 0.7 });
      stroke(g, [{ x: xR, y: lo.y }, { x: xR, y: top.y }], { color: P.disp, width: 1.6 });
      for (const y of [lo.y, top.y]) stroke(g, [{ x: xR - 6, y }, { x: xR + 6, y }], { color: P.disp, width: 1.6 });
      L.add(T`${s3(f.h)} [m]`, xR + 8, (lo.y + top.y) / 2, { color: P.disp, pri: 10, size: 14, weight: 700, align: 'left', maxPush: 16 });
    } }

  // ── each vehicle: where it is along the road, from its own start
  const draw = f.look === 'lorry' ? lorry : car;
  const cars = f.ways.map((n) => {
    const W = f[n], d = W.pos(t), l = n === 'up' ? e + d : e + f.s - d, dir = n === 'up' ? 1 : -1;
    const lane = two && n === 'down' ? laneW : 0, p = off(at(l), lane);
    return { n, W, d, l, dir, lane, p };
  });
  // the far lane first, so the near one passes in front of it
  for (const c of [...cars].sort((a, b) => b.lane - a.lane)) {
    const { n, W, d, dir, p } = c;
    if (fired && t > 0 && t < 1.2) { const ex = off({ x: p.x - dir * along.x * Lc * 0.55, y: p.y - dir * along.y * Lc * 0.55 }, 4), e0 = ageOf(t, 0, f.tMax, 1.2); dust(g, ex.x, ex.y, e0.age, e0.life, { size: 1.5, color: E.night ? '#d4d8de' : '#6f757d', n: 16 }); }
    g.save(); g.translate(p.x, p.y); g.rotate(-ad);
    // the one coming down painted red, so the two are told apart from the back of the room
    draw(g, dir * Lc / 2, 0, Lc, P, { dir, phase: phaseFor(f.look, Lc, d * k), paint: two && n === 'down' ? DOWN_PAINT : null, ring: two && n === 'down' ? withAlpha('#5a1612', 0.9) : null });
    g.restore();
    for (let i = -1; i <= 1; i++) { const q = { x: p.x + along.x * i * Lc * 0.33, y: p.y + along.y * i * Lc * 0.33 }; L.reserve({ x: q.x - Lc * 0.2, y: q.y - Lc * 0.45, w: Lc * 0.4, h: Lc * 0.45 }); }
    // which is which: a tag above each, in the hue its graph lines take
    // the one coming down tagged above it, the one going up below the road: they never cover each other
    if (two) { const q = n === 'down' ? off(p, Lc * 0.42 + 14) : off(p, -22), txt = n === 'up' ? 'up the hill' : 'down the hill';
      g.save(); g.font = '700 13px system-ui, sans-serif'; const tw = g.measureText(txt).width + 14;
      g.fillStyle = n === 'down' ? DOWN_PAINT : '#55657a'; g.beginPath(); g.roundRect?.(q.x - tw / 2, q.y - 10, tw, 20, 10); g.fill();
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, q.x, q.y + 1); g.restore();
      L.reserve({ x: q.x - tw / 2, y: q.y - 10, w: tw, h: 20 }); }
    // where its distance ends: a ring and its speed there
    if (fired && t >= W.t - 1e-9) {
      const endP = at(n === 'up' ? e + f.s : e), a = ageOf(t, W.t, f.tMax);
      pulse(g, endP.x, endP.y, a.age, a.life, P.mark, { radius: Lc * 0.7 });
      const q = off(endP, Lc * 0.42 + (two ? 32 : 16));
      L.add(`${two ? `${n}: ` : ''}${T`${s3(W.v)} [m s^-1] "after" ${s3(f.s)} [m]`}`, q.x, q.y, { color: P.vel, pri: 11, size: 13, weight: 700, maxPush: 40 });
    }
  }

  // a way the engine found does not cover the distance: its car stays at its post, and says why
  for (const st of f.stalled || []) {
    const l = st.name === 'up' ? e : e + f.s, dir = st.name === 'up' ? 1 : -1, p = at(l);
    g.save(); g.globalAlpha = 0.75; g.translate(p.x, p.y); g.rotate(-ad); draw(g, dir * Lc / 2, 0, Lc, P, { dir, phase: 0 }); g.restore();
    L.reserve({ x: p.x - Lc * 0.5, y: p.y - Lc * 0.45, w: Lc, h: Lc * 0.45 });
    const q = off(p, -26);
    L.add(`${st.name === 'up' ? 'Up the hill' : 'Down the hill'}: ${st.short}`, q.x, q.y, { color: P.ink, pri: 12, size: 13, weight: 700, push: 'down' });
  }

  // ── the velocity and the acceleration of each, along the road (solid: along a slope, rule 2):
  // the one going up under the road, the one coming down above its far lane
  const vMax = Math.max(1e-9, f.u, ...f.ways.map((n) => f[n].v)), aMax = Math.max(1e-9, ...f.ways.map((n) => Math.abs(f[n].a)));
  for (const c of cars) {
    const { W, dir, p } = c, under = !two || c.n === 'up';
    const rowAt = (i) => (under ? off(p, -((two ? 46 : 30) + i * 22)) : off(p, laneW + Lc * 0.42 + 38 + i * 22));
    const row = (i, val, max, col, unit, wd) => {
      // one scale for both, so they compare; never shorter than a readable arrow
      const len = clamp((Math.abs(val) / max) * 80, 14, 80), sg = Math.sign(val) * dir;
      const b = rowAt(i);
      const tip = { x: b.x + sg * along.x * len, y: b.y + sg * along.y * len };
      arrow(g, b.x, b.y, tip.x, tip.y, { color: col, width: wd, head: Math.min(9, len * 0.6) });
      // the arrow itself kept clear of every label
      L.reserve({ x: Math.min(b.x, tip.x) - 4, y: Math.min(b.y, tip.y) - 5, w: Math.abs(tip.x - b.x) + 8, h: Math.abs(tip.y - b.y) + 10 });
      // past the arrow's tip; a quantity is never dropped: it may move further, on a leader
      L.add(T`${s3(Math.abs(val))} [${unit}]`, tip.x + sg * along.x * 6, tip.y + sg * along.y * 6, { color: col, pri: 10, size: 13, weight: 700, align: sg > 0 ? 'left' : 'right' });
    };
    const moving = t < W.t - 1e-9 || !fired;
    // held where its distance ends, it is not shown moving: its speed there is on its flag
    if (moving && show.velocity !== false && Math.abs(W.vel(t)) >= 0.05) row(0, W.vel(t), vMax, P.vel, 'm s^-1', 2.6);
    if (moving && Math.abs(W.a) > 1e-9) row(1, W.a, aMax, P.acc, 'm s^-2', 2.2);
  }
  L.draw(g, w, h);

  // ── the forces along the road on each, from the engine: a card, or on a small stage a caption
  unview(g);
  if (cardW) {
    const cx = w - cardW - 16, cy = h - cardH - 16, lab = (txt, x, y, col, al = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
    paper(g, cx, cy, cardW, cardH);
    lab(heading, cx + 12, cy + 16, P.muted);
    // each force a short arrow, forwards to the right or back to the left, beside its size
    const cw = cardW / f.ways.length;
    f.ways.forEach((n, i) => {
      const x0 = cx + i * cw, y0 = cy + 38, W = f[n];
      if (i) stroke(g, [{ x: x0, y: cy + 30 }, { x: x0, y: cy + cardH - 10 }], { color: P.muted, width: 1, alpha: 0.35 });
      lab(NAME[n], x0 + 12, y0, n === 'down' && two ? DOWN_INK : P.ink);
      items(n).forEach((it, j) => {
        const y = y0 + 19 + j * 17, mid = x0 + 22;
        arrow(g, mid - it.sg * 9, y, mid + it.sg * 9, y, { color: P.ink, width: 1.8, head: 6 });
        lab(it.txt, x0 + cw - 10, y, P.ink, 'right');
      });
      // a force, so in ink: the hues are for velocity, displacement and acceleration
      lab(T`m a = ${s4(W.net)} [N]`, x0 + cw - 10, y0 + 19 + 3 * 17, P.ink, 'right');
    });
  } else {
    g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
    // the lines built above (each force with its way, wrapped, never squeezed under 13px)
    const lines = capLines, tw = Math.min(w - 20, Math.max(...lines.map((x) => g.measureText(x).width)) + 14), bh = capH;
    paper(g, 10, h - bh - 8, tw, bh); g.fillStyle = P.ink; lines.forEach((x, i) => g.fillText(x, 17, h - bh - 8 + 13 + i * 18)); g.restore();
  }
  return null;
}
