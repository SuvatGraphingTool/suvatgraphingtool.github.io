// twoplane.js — the stage for two moving in a plane: a map seen from above,
// i east and j north at one scale, the sea for ships (with a coast where the
// tracks leave room, and the lighthouse on its rock when B is one) or the
// farmland far below for birds. The place fills the whole stage; the grid and
// the axes through O are laid over it.
//
// Each one's whole track faintly and the part travelled strongly — A in the
// displacement hue (a track is where it has been, not how fast: rule 2), B in
// the second-object stone — the ship (deck, bridge, funnel, wake, shadow) or
// the gull where it is now, pointing the way it goes, with its letter. The
// vector between them (from B to A) is drawn in the marker colour; at each
// moment the paper asks about, both places pulse and the line between them
// draws in, with its time. The compass belongs to the screen, not the sea: it
// stays put while the stage pans and zooms.
//
// Everything drawn is read from js/core/twoplane.js (rule 4).

import { seaFromAbove, skyFromAbove, fitPlanAround, planGrid, compassRose, lighthouseAbove, env } from './scenery.js';
import { pulse, ageOf, phaseOf } from './effects.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, niceStep, withAlpha, unview, cssVar, hudBoxes as hudOf } from './util.js';
import { T, num } from '../notation.js';

const ROWS = 5;             // the readouts' left column: the kit's hud(...).left
const TAU = Math.PI * 2;

/** Three significant figures, as a paper answers, with no trailing zeros (1, not 1.00). */
export const s3 = (x) => (x === 0 || !isFinite(x) ? num(x || 0, 0) : num(x, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x)))), { trim: true }));

/** A label beside a point on a line, off to the side (nx, ny) by d px: to the
    left or right of a steep line, above or below a flat one, never across it. */
export function beside(L, text, x, y, nx, ny, d, o) {
  if (Math.abs(nx) > Math.abs(ny) * 1.2) L.add(text, x + nx * d * 0.6, y, { ...o, align: nx > 0 ? 'left' : 'right' });
  else L.add(text, x + nx * d * 0.5, y + ny * d, { ...o, align: 'center' });
}

/**
 * A label placer for the words a stage hangs on its drawing — a time, a
 * distance, a speed, a letter. Each is placed round the point it names, at
 * the nearest spot that keeps clear of every drawn line (`line`), point and
 * box (`box`: the readouts, a ship, the compass) and of the words already
 * placed; then it goes to the stage's labels L, so the axis numbers keep off
 * it too. Queue with add(), place them all with flush(L) just before L.draw.
 */
// up-right, up-left, down-right, down-left, up, down, right, left, then between
const ORDER = [14, 10, 2, 6, 12, 4, 0, 8, 15, 13, 11, 9, 1, 3, 5, 7];
export function placer(g, w, h) {
  const obs = [], taken = [], q = [];
  const font = cssVar('--font', 'system-ui, sans-serif');
  return {
    line(pts, step = 5) {
      for (let i = 0; i < pts.length; i++) {
        obs.push(pts[i]);
        if (!i) continue;
        const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y);
        for (let s = step; s < d; s += step) obs.push({ x: a.x + ((b.x - a.x) * s) / d, y: a.y + ((b.y - a.y) * s) / d });
      }
    },
    point(x, y) { obs.push({ x, y }); },
    box(b) { taken.push(b); },
    /** Is this box free of everything drawn and held so far? */
    clear(x, y, bw, bh) {
      if (taken.some((b) => x < b.x + b.w && x + bw > b.x && y < b.y + b.h && y + bh > b.y)) return false;
      return !obs.some((p) => p.x > x - 3 && p.x < x + bw + 3 && p.y > y - 3 && p.y < y + bh + 3);
    },
    add(text, x, y, o = {}) { q.push({ text, x, y, o }); },
    flush(L) {
      q.sort((a, b) => (b.o.pri ?? 0) - (a.o.pri ?? 0));
      for (const it of q) {
        const size = Math.max(13, it.o.size ?? 13);
        g.save(); g.font = `${it.o.weight || 600} ${size}px ${font}`; const tw = g.measureText(it.text).width + 12; g.restore();
        const bh = size + 10;
        // The first spot, nearest first and in one fixed order of directions,
        // that is clear of everything wins outright: so a label stays in its
        // slot frame after frame until something actually takes it. If none
        // is clear, the least crowded one.
        let best = null;
        search:
        for (const d of [10, 18, 28, 40, 56, 76]) for (const k of ORDER) {
          const an = (k / 16) * TAU, cx = it.x + Math.cos(an) * (d + (tw / 2) * Math.abs(Math.cos(an))), cy = it.y + Math.sin(an) * (d + (bh / 2) * Math.abs(Math.sin(an)));
          const bx = cx - tw / 2, by = cy - bh / 2;
          if (bx < 3 || bx + tw > w - 3 || by < 3 || by + bh > h - 3) continue;
          if (taken.some((b) => bx < b.x + b.w && bx + tw > b.x && by < b.y + b.h && by + bh > b.y)) continue;
          let m = 12;
          for (const p of obs) { const dx = Math.max(bx - p.x, 0, p.x - bx - tw), dy = Math.max(by - p.y, 0, p.y - by - bh); if (dx < m && dy < m) m = Math.min(m, Math.hypot(dx, dy)); }
          const score = m * 10 - d;
          if (m >= 8) { best = { score, cx, cy, bx, by }; break search; }
          if (!best || score > best.score) best = { score, cx, cy, bx, by };
        }
        if (!best) best = { cx: it.x, cy: it.y - 24, bx: it.x - tw / 2, by: it.y - 24 - bh / 2 };
        taken.push({ x: best.bx, y: best.by, w: tw, h: bh });
        L.add(it.text, best.cx, best.cy, { ...it.o, align: 'center', size });
      }
      q.length = 0;
    },
  };
}

/** Keep labels off a drawn line: reserve small boxes along it. */
export function keepOff(L, pts, pad = 7) {
  let last = null;
  for (const p of pts) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < pad * 1.4) continue;
    L.reserve({ x: p.x - pad, y: p.y - pad, w: pad * 2, h: pad * 2 }); last = p;
  }
}

/**
 * A ship seen from above, centred at (x, y), s px long, heading at angle a
 * (radians, screen: 0 east, positive clockwise): a dark hull trimmed in its
 * identity colour, a planked deck with hatches, the bridge and funnel aft;
 * its shadow on the water, the bow wave and the wake behind it (`wake` 0..1,
 * 0 for a ship at rest), the foam drifting with `phase`.
 */
export function shipTop(g, x, y, s, a, color, P, { wake = 1, phase = 0, part = 'all' } = {}) {
  const E = env(), L2 = s / 2, b = s * 0.15;
  const hull = () => {
    g.beginPath(); g.moveTo(L2, 0);
    g.bezierCurveTo(L2 * 0.8, -b * 0.75, L2 * 0.55, -b, L2 * 0.3, -b);
    g.lineTo(-L2 * 0.82, -b); g.quadraticCurveTo(-L2, -b, -L2, -b * 0.55); g.lineTo(-L2, b * 0.55);
    g.quadraticCurveTo(-L2, b, -L2 * 0.82, b); g.lineTo(L2 * 0.3, b);
    g.bezierCurveTo(L2 * 0.55, b, L2 * 0.8, b * 0.75, L2, 0); g.closePath();
  };
  g.save(); g.translate(x, y); g.rotate(a);
  if (wake > 0 && part !== 'hull') {
    const wl = s * 1.05 * wake;
    // the churned water straight behind, widening and fading
    const wg = g.createLinearGradient(-L2, 0, -L2 - wl, 0);
    wg.addColorStop(0, 'rgba(255,255,255,0.75)'); wg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = wg; g.beginPath(); g.moveTo(-L2 + 3, -b * 0.75); g.lineTo(-L2 - wl, -b * 2.2); g.lineTo(-L2 - wl, b * 2.2); g.lineTo(-L2 + 3, b * 0.75); g.closePath(); g.fill();
    // the two arms of the wake from the bow, opening behind
    for (const side of [-1, 1]) {
      const sg = g.createLinearGradient(L2 * 0.6, 0, -L2 - wl * 1.2, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = sg; g.lineWidth = 1.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(L2 * 0.6, side * b * 0.9); g.quadraticCurveTo(-L2 * 0.2, side * b * 1.9, -L2 - wl * 0.9, side * (b + wl * 0.3)); g.stroke();
    }
    // flecks of foam, carried back
    g.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 9; i++) {
      const u = ((i / 9 + phase * 0.013) % 1), fx = -L2 - u * wl, fy = Math.sin(i * 2.7) * b * (0.6 + u * 1.6);
      g.globalAlpha = 1 - u; g.beginPath(); g.arc(fx, fy, 1.2 + (i % 3) * 0.4, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  if (part === 'wake') { g.restore(); return; }
  // its shadow, thrown down and to the right on the screen whatever the heading
  const sx = Math.cos(-a) * 3 - Math.sin(-a) * 4, sy = Math.sin(-a) * 3 + Math.cos(-a) * 4;
  g.save(); g.translate(sx, sy); hull(); g.fillStyle = withAlpha('#000000', 0.35); g.fill(); g.restore();
  // the hull, lit along one side, trimmed in its colour
  const hg = g.createLinearGradient(0, -b, 0, b);
  hg.addColorStop(0, E.night ? '#4a5568' : '#4f5d70'); hg.addColorStop(1, E.night ? '#1e2530' : '#2a3340');
  hull(); g.fillStyle = hg; g.fill();
  g.strokeStyle = color; g.lineWidth = 2.2; g.stroke();
  // the deck
  g.save(); g.scale(0.84, 0.72); hull(); g.restore();
  const dg = g.createLinearGradient(0, -b, 0, b);
  dg.addColorStop(0, E.night ? '#8f877d' : '#d8cfc2'); dg.addColorStop(1, E.night ? '#635c55' : '#a99f92');
  g.fillStyle = dg; g.fill();
  g.strokeStyle = withAlpha('#000000', 0.12); g.lineWidth = 0.8;
  for (const yy of [-b * 0.35, 0, b * 0.35]) { g.beginPath(); g.moveTo(-L2 * 0.8, yy); g.lineTo(L2 * 0.6, yy); g.stroke(); }
  // three hatches forward, each lit on its upper edge
  const hatch = ['#7a6b5c', '#5f6d76', '#857a66'];
  for (let i = 0; i < 3; i++) {
    const hx = L2 * 0.42 - i * L2 * 0.3, hw = L2 * 0.24;
    g.fillStyle = hatch[i]; g.beginPath(); g.roundRect(hx - hw, -b * 0.5, hw, b, 1.5); g.fill();
    g.fillStyle = withAlpha('#ffffff', 0.25); g.fillRect(hx - hw, -b * 0.5, hw, 1.4);
  }
  // the bridge, aft: white, with the bridge wings and a band of windows
  g.fillStyle = withAlpha('#000000', 0.3); g.beginPath(); g.roundRect(-L2 * 0.8 + 2, -b * 0.82 + 2, L2 * 0.36, b * 1.64, 2); g.fill();
  const bg = g.createLinearGradient(0, -b, 0, b); bg.addColorStop(0, '#fbf8f3'); bg.addColorStop(1, '#c9c2ba');
  g.fillStyle = bg; g.beginPath(); g.roundRect(-L2 * 0.8, -b * 0.82, L2 * 0.36, b * 1.64, 2); g.fill();
  g.fillRect(-L2 * 0.5, -b * 1.08, L2 * 0.07, b * 2.16);
  g.fillStyle = '#2c3440'; g.fillRect(-L2 * 0.47, -b * 0.7, L2 * 0.03, b * 1.4);
  // the funnel, banded in its colour
  g.fillStyle = '#2c3440'; g.beginPath(); g.ellipse(-L2 * 0.66, 0, b * 0.42, b * 0.36, 0, 0, TAU); g.fill();
  g.strokeStyle = color; g.lineWidth = 1.8; g.stroke();
  // the bow wave
  if (wake > 0) {
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(L2 * 0.55, -b * 1.15); g.quadraticCurveTo(L2 * 1.06, 0, L2 * 0.55, b * 1.15); g.stroke();
  }
  // a masthead light by night
  if (E.night) { const lg = g.createRadialGradient(-L2 * 0.4, 0, 0, -L2 * 0.4, 0, 7); lg.addColorStop(0, 'rgba(255,240,210,0.9)'); lg.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = lg; g.beginPath(); g.arc(-L2 * 0.4, 0, 7, 0, TAU); g.fill(); }
  g.restore();
}

/** A lighthouse on the map, standing at (x, y) — kept for any caller; the
    stage itself draws lighthouseAbove (js/render/scenery.js) on its rock. */
export function lighthouse(g, x, y, color, P) { lighthouseAbove(g, x, y, 34); }

/**
 * A gull seen from above, centred at (x, y), wingspan s px, flying at angle a:
 * a white body and head, long grey wings with black tips that beat with
 * `flap` (−1..1), a yellow bill, its identity colour as a ring on its back,
 * and its shadow on the ground far below.
 */
export function birdTop(g, x, y, s, a, color, { flap = 0 } = {}) {
  const span = (s / 2) * (0.82 + 0.18 * flap), sw = 0.05 * s * flap;
  const wing = (side, k = 1) => {
    const Y = (v) => side * v;
    g.beginPath(); g.moveTo(s * 0.05, Y(s * 0.05));
    g.quadraticCurveTo(s * 0.07, Y(span * 0.45), -s * 0.02 - sw, Y(span * 0.78));
    g.quadraticCurveTo(-s * 0.08 - sw, Y(span * 1.0 * k), -s * 0.16 - sw, Y(span * 0.98 * k));
    g.quadraticCurveTo(-s * 0.12, Y(span * 0.5), -s * 0.11, Y(s * 0.05)); g.closePath();
  };
  const body = () => { g.beginPath(); g.ellipse(-s * 0.02, 0, s * 0.19, s * 0.06, 0, 0, TAU); };
  g.save(); g.translate(x, y);
  // its shadow far below: soft, down and to the right
  g.save(); g.translate(s * 0.28, s * 0.4); g.rotate(a); g.fillStyle = 'rgba(0,0,0,0.16)';
  wing(-1); g.fill(); wing(1); g.fill(); body(); g.fill(); g.restore();
  g.rotate(a);
  for (const side of [-1, 1]) {
    const wg = g.createLinearGradient(s * 0.06, 0, -s * 0.14, 0);
    wg.addColorStop(0, '#e9e8ea'); wg.addColorStop(1, '#9ea2a9');
    wing(side); g.fillStyle = wg; g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.9; g.stroke();
    // black tips, with a white spot
    g.save(); wing(side); g.clip();
    g.fillStyle = '#26262b'; g.fillRect(-s * 0.3, side > 0 ? span * 0.74 : -span * 1.1, s * 0.4, span * 0.36);
    g.fillStyle = '#f4f4f4'; g.beginPath(); g.arc(-s * 0.1 - sw, side * span * 0.9, s * 0.015, 0, TAU); g.fill();
    g.restore();
  }
  // the tail, the body, the head and bill
  g.fillStyle = '#f0eeec'; g.beginPath(); g.moveTo(-s * 0.18, -s * 0.035); g.lineTo(-s * 0.3, -s * 0.06); g.lineTo(-s * 0.3, s * 0.06); g.lineTo(-s * 0.18, s * 0.035); g.closePath(); g.fill();
  const bg = g.createLinearGradient(0, -s * 0.06, 0, s * 0.06); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#cfcbc8');
  body(); g.fillStyle = bg; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8; g.stroke();
  g.beginPath(); g.arc(s * 0.17, 0, s * 0.05, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(s * 0.21, -s * 0.016); g.lineTo(s * 0.27, 0); g.lineTo(s * 0.21, s * 0.016); g.closePath(); g.fill();
  g.strokeStyle = color; g.lineWidth = 2.2; g.beginPath(); g.arc(-s * 0.02, 0, s * 0.05, 0, TAU); g.stroke();
  g.restore();
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true } = o;
  if (!f || f.kind !== 'twoplane') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const birds = f.look === 'birds';
  const U = f.U, tr = s3;

  // ── the frame: both whole tracks and O, one scale both ways, as large as
  //    the canvas allows with a ship's length all round and nothing that
  //    moves under the readouts or the compass
  const n = 80, ptsA = [], ptsB = [];
  for (let i = 0; i <= n; i++) { const tt = (i / n) * f.tMax; ptsA.push(f.posA(tt)); ptsB.push(f.posB(tt)); }
  const all = [...ptsA, ...ptsB, { x: 0, y: 0 }];
  const box = { xLo: Math.min(...all.map((p) => p.x)), xHi: Math.max(...all.map((p) => p.x)), yLo: Math.min(...all.map((p) => p.y)), yHi: Math.max(...all.map((p) => p.y)) };
  const sp = Math.max(box.xHi - box.xLo, box.yHi - box.yLo, 1);
  for (const [lo, hi] of [['xLo', 'xHi'], ['yLo', 'yHi']]) { const m = Math.max(0, sp * 0.25 - (box[hi] - box[lo])) / 2; box[lo] -= m; box[hi] += m; }
  const S = birds ? clamp(Math.min(w, h) * 0.17, 68, 96) : clamp(Math.min(w, h) * 0.13, 54, 76);
  const pad = S * 1.05;    // a ship's length all round: the ship, its wake, or a gull's wings
  const hudBoxes = hudOf(w, ROWS);   // the readouts, where they really are
  const cR = phone ? 19 : 24, cX = w - cR - (phone ? 12 : 20), cY = h - cR - (phone ? 14 : 22);
  const compassBox = { x: cX - cR - 4, y: cY - cR - 24, w: cR * 2 + 8, h: cR * 2 + 28 };
  const F = fitPlanAround(box, all, { left: pad, right: w - pad, top: pad, bottom: h - pad }, { avoid: [...hudBoxes, compassBox], margin: pad * 0.7 });
  const { X, Y } = F;
  const px = (p) => ({ x: X(p.x), y: Y(p.y) });

  // ── the place, filling the stage; land kept off the tracks
  const trackPx = [...ptsA, ...ptsB].map(px);
  const still = (v) => Math.hypot(v.x, v.y) < 1e-9;
  const lightB = f.lighthouse && still(f.B.v);
  const phase = (t / Math.max(f.tMax, 1e-9)) * 160;
  const sea = birds ? skyFromAbove(g, 0, 0, w, h, { phase: phase * 0.6 }) : seaFromAbove(g, 0, 0, w, h, { phase, avoid: [...trackPx, { x: X(0), y: Y(0) }], coast: true, hud: true,
    islands: lightB ? [{ x: X(f.B.r0.x), y: Y(f.B.r0.y) + 6, r: 30 }] : [] });

  if (sea?.light && !lightB) lighthouseAbove(g, sea.light.x, sea.light.y, 30, { beam: (t / Math.max(f.tMax, 1e-9)) * TAU * 3 + 1 });

  // the words: kept off the readouts (top left, and on a laptop the clock
  // top right), the compass, every line drawn and each other
  const Q = placer(g, w, h);
  const off = (pts) => Q.line(pts);
  const hold = (b) => { L.reserve(b); Q.box(b); };
  // and off the axes, where they can be
  Q.line([{ x: 0, y: F.Y(0) }, { x: w, y: F.Y(0) }], 10); Q.line([{ x: F.X(0), y: 0 }, { x: F.X(0), y: h }], 10);
  for (const b of [...hudBoxes, compassBox]) hold(b);
  Q.point(F.X(0), F.Y(0));
  Q.line(ptsA.map(px)); Q.line(ptsB.map(px));

  // ── the grid and the axes through O
  const step = niceStep(Math.max(box.xHi - box.xLo, box.yHi - box.yLo), phone ? 5 : 8);
  const dp = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  // the grid's words are placed once against what never moves, in their own
  // labels, so they hold still; everything else keeps off them
  const Ls = labels();
  for (const b of [...hudBoxes, compassBox]) Ls.reserve(b);
  const gridWords = planGrid(g, Ls, F, w, h, P, { step, fmt: (x) => num(x, dp), nameI: T`vec(i) [${U.len}]`, nameJ: T`vec(j) [${U.len}]`, clear: Q.clear,
    jTop: F.X(0) < hudBoxes[0].x + hudBoxes[0].w + 10 ? hudBoxes[0].h + 14 : 16 });
  for (const b of gridWords) hold(b);

  // ── the ships' wakes on the water, under the tracks
  // a wake builds as a ship gets under way: none at the start, full soon after
  const wakeOn = clamp(t / Math.max(1e-9, f.tMax * 0.1), 0, 1);
  if (!birds) for (const [pos, v] of [[f.posB, f.B.v], [f.posA, f.A.v]]) {
    const q = px(pos(t));
    if (!still(v) && fired && wakeOn > 0) shipTop(g, q.x, q.y, S, Math.atan2(-v.y, v.x), P.ink, P, { wake: wakeOn, phase: phase * 3, part: 'wake' });
  }

  // ── each track, faint in full and strong to now
  const track = (pts, pos, color) => {
    const full = pts.map(px);
    stroke(g, full, { color, width: 1.8, alpha: 0.45 });
    const so = []; for (let i = 0; i <= 60; i++) so.push(px(pos((i / 60) * t)));
    stroke(g, so, { color: cssVar('--surface', '#131210'), width: 5.5, alpha: 0.45 });
    stroke(g, so, { color, width: 3 });

  };
  track(ptsB, f.posB, P.second);
  track(ptsA, f.posA, P.disp);

  // ── each asked moment, once the clock reaches it: both places pulse and
  //    the line between them draws in, with its time
  const times = [];
  for (const an of f.answers) for (const ta of an.times || [an.t]) if (ta >= 0) times.push(ta);
  for (const ta of times) {
    if (t < ta - 1e-9) continue;
    const pa = px(f.posA(ta)), pb = px(f.posB(ta));
    const { age, life } = ageOf(t, ta, f.tMax);
    const u = phaseOf(age, life * 0.6), grow = u == null ? 1 : 1 - (1 - u) ** 3;
    const end = { x: pb.x + (pa.x - pb.x) * grow, y: pb.y + (pa.y - pb.y) * grow };
    stroke(g, [pb, end], { color: cssVar('--surface', '#131210'), width: 5, alpha: 0.4 });
    stroke(g, [pb, end], { color: P.mark, width: 2.2 });
    off([pb, pa], 8);
    for (const q of [pa, pb]) {
      pulse(g, q.x, q.y, age, life, P.mark, { radius: 40 });
      dot(g, q.x, q.y, 5.5, { fill: P.mark, stroke: cssVar('--surface', '#131210'), width: 2 });
    }
    // its time, by the line, clear of it and of the tracks
    const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
    const word = f.due && !phone && an0(f.answers, ta)?.kind === 'due' ? T`"A due ${f.due.word} of B," t = ${tr(ta)} [${U.time}]` : T`t = ${tr(ta)} [${U.time}]`;
    Q.add(word, mx, my, { color: P.mark, pri: 8, size: 14, weight: 700 });
  }

  // ── the vector between them now (from B to A), and how far apart
  const a = px(f.posA(t)), b = px(f.posB(t));
  const atAsked = times.some((ta) => Math.abs(ta - t) < f.tMax * 0.01);
  if (Math.hypot(a.x - b.x, a.y - b.y) > 60 && !atAsked) {
    arrow(g, b.x, b.y, a.x, a.y, { color: P.mark, width: 1.8, head: 10, alpha: 0.9 });
    off([b, a], 8);
    Q.add(T`${tr(f.gap(t))} [${U.len}] "apart"`, (a.x + b.x) / 2, (a.y + b.y) / 2, { color: P.mark, pri: 6, size: 13, weight: 700 });
  }

  // ── where each is: the ship (or gull, or the lighthouse), and its letter
  const flap = Math.sin((t / Math.max(f.tMax, 1e-9)) * TAU * 9);
  const place = (pos, v, color, name) => {
    const q = px(pos(t)), heading = Math.atan2(-v.y, v.x), rest = still(v);
    if (rest && lightB && name === 'B') lighthouseAbove(g, q.x, q.y, 36, { beam: (t / Math.max(f.tMax, 1e-9)) * TAU * 3 - 1 });
    else if (birds) birdTop(g, q.x, q.y, S, rest ? -Math.PI / 2 : heading, color, { flap: rest ? 0 : flap });
    else shipTop(g, q.x, q.y, S, rest ? -Math.PI / 2 : heading, color, P, { wake: rest || !fired ? 0 : wakeOn, phase: phase * 3, part: 'hull' });
    const R = birds ? S * 0.42 : S * 0.4;
    if (rest && lightB && name === 'B') hold({ x: q.x - 16, y: q.y - 46, w: 32, h: 54 });
    else hold({ x: q.x - R, y: q.y - R, w: R * 2, h: R * 2 });
    Q.add(name, q.x, q.y, { color, pri: 9, size: 16, weight: 800 });
  };
  place(f.posB, f.B.v, P.second, 'B');
  place(f.posA, f.A.v, P.disp, 'A');

  Q.flush(L);
  Ls.draw(g, w, h);
  L.draw(g, w, h);

  // ── the compass: the screen's, not the sea's
  unview(g);
  compassRose(g, cX, cY, cR, P);
  return null;
}

/** The answer an asked time belongs to. */
function an0(answers, ta) { return answers.find((an) => (an.times || [an.t]).some((x) => Math.abs(x - ta) < 1e-9)); }
