// range.js — Dropping vs Firing a Bullet, on its own stage.
//
// Not the stadium. A round fired flat at 360 m s⁻¹ from 1.5 m lands about
// 200 m away, and a football ground contributes nothing to that question but
// noise. This is an indoor range instead: graphite walls, a concrete floor, a
// shooting bench, a rifle, and a release clamp holding the second round at the
// muzzle. A strobe fires ten times across the flight and freezes both rounds
// at each flash — the photograph the experiment is really about.
//
// STARTED BY HAND. One string pulls a slider that drops one round and fires
// the other on the same frame — see stringrig.js. The clock starts then.
//
// ONE TO ONE. A metre is the same number of pixels across as it is up, so the
// floor reads 1 m, 2 m, 5 m… and the fired round really does go a long way.
// The cost is that the whole flight no longer fits on one screen — so the
// moment the fired round reaches the edge, the stage SPLITS: the left pane
// stays on the dropped round, the right pane follows the fired one. Both panes
// keep the same scale and the same floor line, so a height on the left is the
// same height on the right, and the "same height" line runs straight across.
//
// NOTHING HERE COMPUTES PHYSICS (CLAUDE.md rule 4). Every position, time and
// height comes off f.pos / second.pos / f.tMax. The muzzle flash, recoil,
// smoke, the ejected case and the dust are STAGING: pixel-sized, timed off
// the clock, and none of them is a quantity.
//
// THE PLATE IS DARK IN BOTH THEMES, like a strobe photograph — the same
// decision js/render/exhibit.js made for the range.

import { fitCanvas, palette, fmt, clamp, labels, cssVar } from './util.js';
import { T, num } from '../notation.js';
import { room, light } from './workshop.js';
import * as SR from './stringrig.js';

const C = {
  wall0: '#1b1a1d', wall1: '#0c0b0b',
  baffle: 'rgba(255,255,255,0.035)', baffleEdge: 'rgba(0,0,0,0.45)',
  floor0: '#3b3935', floor1: '#1f1e1c', seam: 'rgba(0,0,0,0.35)',
  ink: '#f4f1ea', inkMid: 'rgba(244,241,234,0.72)', inkFaint: 'rgba(244,241,234,0.38)',
  rule: 'rgba(244,241,234,0.10)', ruleMajor: 'rgba(244,241,234,0.20)',
  gold: '#e3b341', goldHi: '#ffe08a', goldLo: '#7a5a12',
  orange: '#f97316', orangeHi: '#fdba74',
  steel: '#2a2c30', steelHi: '#4b4f57', steelLo: '#141518', black: '#0a0a0b',
  smoke: '200,196,188',
};

const U = { m: T`[m]`, s: T`[s]` };
const FLASHES = 10;

/* ── the frame ─────────────────────────────────────────────────────────
   Vertical: the floor near the bottom, the muzzle height plus headroom.
   Sideways: the rig and room to pull its string on the left, a little of the
   range in front. 1:1 — never squeezed. */
const PAD = { t: 70, b: 92 };
const BEHIND = 2.3;               // metres of rig and pull room behind the muzzle
function fitRange(cam, f, w, h) {
  if (w < 120 || h < 120) return;
  const H = Math.max(f.params.h, f.apexHeight, 0.2);
  const s = Math.max(10, Math.min((h - PAD.t - PAD.b) / (H * 1.3), (w - 40) / (BEHIND + 1.4)));
  cam._range = true; cam._kx = 1;
  cam.scale = s;
  cam.cx = (w / 2 - (20 + BEHIND * s)) / s;    // the muzzle sits BEHIND metres in from the left
  cam.cy = (h - PAD.b - h / 2) / s;           // the floor sits PAD.b above the bottom
  cam.want = null;
  cam.placed = true; cam._plate = 'range';
  cam.fit = false; cam.touched = false;
}

/* ── painters ─────────────────────────────────────────────────────────── */
const rr = (g, x, y, w, h, r) => {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};


/** The round itself: a copper-gold ogive, drawn at a size you can see. */
function round(g, x, y, ang, a = 1, ring = null) {
  const L = 18, D = 7;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(ang);
  if (ring) {
    g.strokeStyle = ring; g.lineWidth = 2; g.globalAlpha = a * 0.9;
    g.beginPath(); g.arc(0, 0, 15, 0, 7); g.stroke(); g.globalAlpha = a;
  }
  const gr = g.createLinearGradient(0, -D / 2, 0, D / 2);
  gr.addColorStop(0, C.goldHi); gr.addColorStop(0.45, C.gold); gr.addColorStop(1, C.goldLo);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(-L / 2, -D / 2); g.lineTo(L * 0.05, -D / 2);
  g.quadraticCurveTo(L * 0.42, -D / 2, L / 2, 0);
  g.quadraticCurveTo(L * 0.42, D / 2, L * 0.05, D / 2);
  g.lineTo(-L / 2, D / 2); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(-L / 2, -D / 2, 2, D);
  g.restore();
}

function muzzleFlash(g, x, y, e) {
  if (e <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const R = 18 + 46 * e;
  const rg = g.createRadialGradient(x, y, 0, x, y, R);
  rg.addColorStop(0, `rgba(255,250,230,${e})`);
  rg.addColorStop(0.3, `rgba(255,190,80,${0.85 * e})`);
  rg.addColorStop(1, 'rgba(249,115,22,0)');
  g.fillStyle = rg; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
  g.fillStyle = `rgba(255,220,140,${0.9 * e})`;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3, len = R * (i % 2 ? 0.9 : 1.6);
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + Math.cos(a - 0.12) * len * 0.3, y + Math.sin(a - 0.12) * len * 0.3);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.lineTo(x + Math.cos(a + 0.12) * len * 0.3, y + Math.sin(a + 0.12) * len * 0.3);
    g.closePath(); g.fill();
  }
  g.restore();
}

function smoke(g, x, y, t) {
  if (t <= 0) return;
  for (let i = 0; i < 6; i++) {
    const tau = clamp((t - i * 0.012) / 0.6, 0, 1);
    if (tau <= 0 || tau >= 1) continue;
    const r = 5 + 34 * Math.sqrt(tau) + i * 2;
    const px = x + 10 + 70 * tau * (0.6 + i * 0.12), py = y - 6 - 30 * tau - i * 3;
    g.fillStyle = `rgba(${C.smoke},${0.12 * (1 - tau)})`;
    g.beginPath(); g.arc(px, py, r, 0, 7); g.fill();
  }
}

function dust(g, x, y, k) {
  g.save();
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const d = 10 + 16 * k + (i % 3) * 6;
    g.fillStyle = `rgba(${C.smoke},${0.28 - i * 0.015})`;
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, 5 + (i % 4) * 2.5, 0, 7); g.fill();
  }
  g.fillStyle = C.goldHi; g.globalAlpha = 0.85;
  g.beginPath(); g.ellipse(x, y, 10, 2.5, 0, 0, 7); g.fill();
  g.restore();
}

function pill(g, text, x, y, { color = C.ink, bg = 'rgba(10,10,11,0.82)', border = 'rgba(244,241,234,0.18)', size = 13, weight = 600, align = 'left' } = {}) {
  g.save();
  g.font = `${weight} ${size}px ${cssVar('--font', 'system-ui, sans-serif')}`;
  const tw = g.measureText(text).width, ph = size + 12, pw = tw + 22;
  const x0 = align === 'center' ? x - pw / 2 : align === 'right' ? x - pw : x;
  g.fillStyle = bg; rr(g, x0, y - ph / 2, pw, ph, ph / 2); g.fill();
  g.strokeStyle = border; g.lineWidth = 1; g.stroke();
  g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillText(text, x0 + 11, y + 0.5);
  g.restore();
  return pw;
}

/** A label with a dark halo — the plate is dark in both themes, so the page's
    own label halo (in --surface) would glow on it in the light theme. */
function text(g, str, x, y, { color = C.ink, align = 'left', size = 13, weight = 600 } = {}) {
  g.save();
  g.font = `${weight} ${Math.max(13, size)}px ${cssVar('--font', 'system-ui, sans-serif')}`;
  g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(10,10,11,0.9)'; g.lineWidth = 4; g.strokeText(str, x, y);
  g.fillStyle = color; g.fillText(str, x, y);
  g.restore();
}

/* ── the string release ───────────────────────────────────────────────
   One cord, one slider — see stringrig.js. The rig lives here, between
   frames, because the renderer is the only thing that knows where on the
   screen the muzzle is. js/app.js feeds it the pointer and the clock, and
   starts the flight on the frame it trips. */
let RIG = null, RIG_F = null, VIEW = null, SPLIT = null, SPLIT_F = null;
export function rigPointer(kind, X, Y) {
  if (!RIG || !VIEW) return false;
  const p = { x: (X - VIEW.mX) / VIEW.k, y: (Y - VIEW.mY) / VIEW.k };
  const reach = 26 / Math.min(1, VIEW.k);
  if (kind === 'down') {
    if (RIG.latched || X > VIEW.x1) return false;
    if (SR.nearest(RIG, p, reach) > 0) { SR.grab(RIG, p); return true; }
    return false;
  }
  if (kind === 'move') {
    if (SR.isHeld(RIG)) { SR.drag(RIG, p); RIG.hover = true; return true; }
    RIG.hover = !RIG.latched && X <= VIEW.x1 && SR.nearest(RIG, p, reach) > 0;
    return false;
  }
  return SR.release(RIG);
}
/** Advance the cord and the rod. Returns 'fire' on the frame it trips. */
export function rigStep(dt) {
  if (!RIG) return null;
  RIG.idle = SR.isHeld(RIG) ? 0 : RIG.idle + dt;
  return SR.step(RIG, dt) ? 'fire' : 'moving';
}
export function rigReset() { RIG_F = null; SPLIT = null; }
export function rigTrip() { if (RIG && !RIG.latched) SR.trip(RIG); }
export const rigArmed = () => !!RIG && !RIG.latched;
export const rigHover = () => !!RIG && RIG.hover;

const ease = (x) => 1 - Math.pow(1 - x, 3);

/* ══ the renderer ═══════════════════════════════════════════════════════ */
export function render(canvas, cam, o) {
  const { traj: f, second, t: tRaw, show = {}, fired = true } = o;
  if (!f) return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  if (cam.fit || !cam._range) fitRange(cam, f, w, h);
  const s = cam.scale, k = s / 200, DX = SR.DROP_DX * k;

  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const t2 = second ? clamp(tRaw, 0, second.tMax) : 0;
  const H = f.params.h;
  const reach = isFinite(f.range) ? f.range : f.horiz * f.tMax;
  const dtF = f.tMax / FLASHES;
  const landed = fired && tRaw >= f.tMax - 1e-9;
  const sinceFlash = t > 0 ? t - Math.floor(t / dtF + 1e-9) * dtF : 1;
  const flash = t > 0 && t <= f.tMax + 1e-9 ? Math.exp(-sinceFlash / 0.008) : 0;

  const sy = (y) => h / 2 - (y - cam.cy) * s;
  const py = (Y) => (h / 2 - Y) / s + cam.cy;
  const floorY = sy(0), mY = sy(H);
  const pF = f.pos(t), pS = second ? second.pos(t2) : null;

  if (f !== RIG_F || !RIG) { RIG = SR.create(H * 200); RIG_F = f; }
  if (t > 0 && !RIG.latched) SR.trip(RIG);       // scrubbed past the start: it has fired
  RIG.floorY = (floorY - mY) / k;

  /* ── one pane, or two ──────────────────────────────────────────────────
     `ox` is where world x = 0 (the muzzle) lands on the screen. Before the
     split there is one pane, the camera's. The split is triggered by the
     fired round reaching the right-hand edge, and eases in over a third of a
     second: the left pane slides to centre the drop, the right pane opens and
     follows the fired round. Same scale and same floor in both. */
  const ox0 = w / 2 - cam.cx * s;
  if (f !== SPLIT_F || t === 0) { SPLIT = null; SPLIT_F = f; }
  if (!SPLIT && t > 0 && ox0 + pF.x * s > w - 60) SPLIT = { at: performance.now() };
  const e = SPLIT ? ease(clamp((performance.now() - SPLIT.at) / 350, 0, 1)) : 0;
  const xdEnd = Math.round(clamp(w * 0.42, 260, 520));
  const xd = SPLIT ? w + (xdEnd - w) * e : w;
  const left = { x0: 0, x1: xd, ox: ox0 + ((xdEnd * 0.6 - DX) - ox0) * e, main: true };
  const right = SPLIT ? { x0: xd, x1: w, ox: (xd + w) / 2 - pF.x * s, main: false } : null;
  const mX = left.ox;
  VIEW = { k, mX, mY, x1: left.x1 };
  const rulerX = w - 70;

  const pane = (p) => {
    const sx = (x) => p.ox + x * s, pu = (X) => (X - p.ox) / s;
    g.save(); g.beginPath(); g.rect(p.x0, 0, p.x1 - p.x0, h); g.clip();
    const rm = { w, h, s, X: sx, Y: sy, u0: pu(p.x0), u1: pu(p.x1), landU: reach, poleU: 0.42, lampU: -1.0 };
    room(g, rm);

    // floor distances, true metres
    const step = [1, 2, 5, 10, 20, 25, 50, 100, 250, 500].find((d) => d * s > 80) || 500;
    for (let d = step; d <= reach * 1.001; d += step) {
      const X = sx(d); if (X < p.x0 + 24 || X > p.x1 - 24) continue;
      g.fillStyle = C.inkFaint; g.fillRect(X - 0.5, floorY + 2, 1, 10);
      text(g, `${fmt(d, 0)} ${U.m}`, X, floorY + 26, { color: C.inkMid, align: 'center' });
    }
    g.fillStyle = C.gold; g.fillRect(p.x0, floorY - 1, p.x1 - p.x0, 2);
    if (show.grid !== false) {
      const hs = [0.05, 0.1, 0.2, 0.5, 1, 2, 5].find((d) => d * s >= 40) || 5;
      for (let y = hs; y <= py(PAD.t * 0.4); y += hs) {
        const Y = sy(y); if (Y < 4 || Y > floorY - 2) continue;
        const major = Math.abs(y / (hs * 2) - Math.round(y / (hs * 2))) < 1e-6;
        g.fillStyle = major ? C.ruleMajor : C.rule; g.fillRect(p.x0, Y, Math.min(p.x1, rulerX - 8) - p.x0, 1);
      }
    }

    // the pistol and the rig
    smoke(g, sx(0), mY, t);
    g.save(); g.translate(sx(0), mY); g.scale(k, k);
    SR.drawGun(g, RIG, t > 0 ? 10 * Math.exp(-t / 0.025) : 0, RIG.p / SR.TRAVEL);
    SR.drawRod(g, RIG);
    g.restore();

    const shadow = (X, y) => {
      const q = clamp(1 - y / Math.max(H, 1e-6), 0, 1);
      g.fillStyle = `rgba(0,0,0,${0.15 + 0.4 * q})`; g.beginPath(); g.ellipse(X, floorY + 3, 14 - 6 * q, 2.5, 0, 0, 7); g.fill();
    };
    if (show.path !== false && t > 0) {
      const pts = f.path(200, t);
      g.save(); g.strokeStyle = P.vel; g.lineWidth = 2.2; g.globalAlpha = 0.85; g.beginPath();
      pts.forEach((q, i) => (i ? g.lineTo(sx(q.x), sy(q.y)) : g.moveTo(sx(q.x), sy(q.y)))); g.stroke(); g.restore();
      if (pS) { g.save(); g.strokeStyle = C.ink; g.lineWidth = 2; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(sx(0) + DX, mY); g.lineTo(sx(pS.x) + DX, sy(pS.y)); g.stroke(); g.restore(); }
    }
    // strobe exposures
    const nDone = t > 0 ? Math.min(FLASHES, Math.floor(t / dtF + 1e-9)) : 0;
    for (let i = 1; i <= nDone; i++) {
      const tk = i * dtF, a = 0.22 + 0.5 * (i / Math.max(1, nDone));
      const pf = f.pos(tk), ps = second ? second.pos(Math.min(tk, second.tMax)) : null;
      const Xf = sx(pf.x), Yf = sy(pf.y);
      if (ps) {
        const Xs = sx(ps.x) + DX, Ys = sy(ps.y);
        g.save(); g.setLineDash([5, 5]); g.strokeStyle = C.gold; g.globalAlpha = 0.25 + 0.35 * (i / nDone);
        g.lineWidth = 1.4; g.beginPath(); g.moveTo(Xs, Ys); g.lineTo(Xf, Yf); g.stroke(); g.restore();
        round(g, Xs, Ys, 0, a * 0.9);
      }
      round(g, Xf, Yf, Math.atan2(-f.vel(tk).y, f.vel(tk).x), a);
    }
    // now
    if (pS) {
      const XS = sx(pS.x) + DX, YS = sy(pS.y);
      shadow(XS, pS.y); round(g, XS, YS, 0, 1, C.ink);
      if (!landed) text(g, o.secondLabel || 'released', XS - 22, YS + (t > 0 ? 0 : -24), { color: C.ink, align: 'right', size: 14, weight: 700 });
    }
    if (t > 0) {
      const XF = sx(pF.x), YF = sy(pF.y);
      shadow(XF, pF.y);
      if (!landed) {
        const len = 70, sg = g.createLinearGradient(XF - len, YF, XF, YF);
        sg.addColorStop(0, 'rgba(249,115,22,0)'); sg.addColorStop(1, 'rgba(253,186,116,0.9)');
        g.fillStyle = sg; g.fillRect(XF - len, YF - 2, len, 4);
      }
      round(g, XF, YF, Math.atan2(-f.vel(t).y, f.vel(t).x), 1, P.vel);
      if (!landed) text(g, 'fired', XF + 20, YF - 20, { color: C.orangeHi, size: 14, weight: 700 });
    }
    muzzleFlash(g, sx(0) + 4, mY, t > 0 ? clamp(1 - t / 0.03, 0, 1) : 0);
    if (landed) { dust(g, sx(pF.x), floorY, 1); if (pS) dust(g, sx(pS.x) + DX, floorY, 1); }

    g.save(); g.translate(sx(0), mY); g.scale(k, k); SR.drawString(g, RIG); g.restore();
    light(g, rm, flash, p.main ? sx(0) - 0.4 * s : sx(pF.x), mY + 0.2 * s);
    g.restore();
  };

  pane(left);
  if (right) pane(right);

  /* ── across both panes ──────────────────────────────────────────────── */
  if (right) {
    g.fillStyle = C.black; g.fillRect(xd - 2, 0, 4, h);
    g.fillStyle = 'rgba(227,179,65,0.6)'; g.fillRect(xd - 2.5, 0, 1, h); g.fillRect(xd + 1.5, 0, 1, h);
  }
  if (pS && t > 0 && !landed) {
    const XS = left.ox + pS.x * s + DX, YS = sy(pS.y);
    const XF = (right || left).ox + pF.x * s;
    g.save(); g.setLineDash([7, 5]); g.strokeStyle = C.gold; g.lineWidth = 1.8;
    g.beginPath(); g.moveTo(XS + 14, YS); g.lineTo(Math.max(XF - 14, XS + 14), YS); g.lineTo(rulerX - 80, YS); g.stroke(); g.restore();
    const lx = right ? xd + 70 : (XS + XF) / 2;
    if (right || XF - XS > 110) text(g, 'same height', lx, YS - 15, { color: C.goldHi, align: 'center', size: 14, weight: 700 });
    pill(g, `${fmt(pS.y, 2)} ${U.m}`, rulerX - 8, YS, { color: C.black, bg: C.gold, border: C.gold, align: 'right', weight: 700 });
  }

  // the ruler, on the right edge
  if (show.ruler !== false) {
    const yHi = py(PAD.t * 0.4), step = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10].find((d) => d * s >= 40) || 10, minor = step / 5;
    g.fillStyle = 'rgba(10,10,11,0.8)'; rr(g, rulerX - 6, sy(yHi) - 8, 72, floorY - sy(yHi) + 8, 6); g.fill();
    g.fillStyle = C.gold; g.fillRect(rulerX, sy(yHi), 2, floorY - sy(yHi));
    for (let y = 0; y <= yHi; y += minor) {
      const Y = sy(y), q = Math.round(y / minor);
      g.fillStyle = q % 5 === 0 ? C.gold : 'rgba(227,179,65,0.55)'; g.fillRect(rulerX + 2, Y - 0.5, q % 5 === 0 ? 12 : 6, 1);
      if (q % 5 === 0 && q > 0) text(g, `${num(y, 2, { trim: true })} ${U.m}`, rulerX + 18, Y, { color: C.goldHi });
    }
  }

  // captions
  let x = 16;
  x += pill(g, 'Strobe · 10 flashes', x, 24) + 8;
  pill(g, 'true scale · 1 : 1', x, 24, { color: C.goldHi, border: 'rgba(227,179,65,0.45)' });
  if (right && e > 0.6) {
    pill(g, 'B · dropped', 16, 60);
    pill(g, `A · fired · ${fmt(pF.x, 1)} ${U.m} downrange`, xd + 14, 60, { color: C.orangeHi });
  }
  if (landed) pill(g, `both land at ${fmt(f.tMax, 2)} ${U.s}`, right ? (xd + w) / 2 : w / 2, right ? 102 : PAD.t * 0.55 + 34, { color: C.black, bg: C.gold, border: C.gold, align: 'center', size: 15, weight: 700 });
  if (!RIG.latched && !SR.isHeld(RIG) && RIG.idle > 0.8) {
    const E = SR.stringEnd(RIG), bob = Math.sin(performance.now() / 260) * 4;
    text(g, '← pull the string', mX + E.x * k - 30 + bob, mY + E.y * k + 1, { color: C.goldHi, align: 'right', size: 15, weight: 700 });
  }

  const sxL = (x) => left.ox + x * s, pxL = (X) => (X - left.ox) / s;
  cam._map = { sx: sxL, sy, px: pxL, py, su: sxL, pu: pxL, u0: 0, ball: { x: (right || left).ox + pF.x * s, y: sy(pF.y) } };
  return { sx: sxL, sy };
}
