// rope.js — the stage for a sledge pulled by a rope over snow, on level
// ground or up a slope: a winter sky, pines, the snowfield, the sledge
// (js/render/rough.js's) and the person pulling it, walking ahead with the
// rope in their hand at the rope's angle to the surface. When the rope is
// let go the person stops, the rope drops from the sledge, and the sledge
// slides on to rest, leaving its track; on a slope too steep for the
// friction it then slides back.
//
// A card fixed to the screen is the free-body diagram for the moment: while
// pulled, the tension along the rope, the normal reaction, the weight and
// friction; let go, the rope's arrow is gone and the reaction is the whole
// weight's part across the surface.
//
// Everything drawn is read from js/core/rope.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, unview, stroke } from './util.js';
import { skyscape, fitSide, env, paper, rng } from './scenery.js';
import { runner, phaseFor } from './figures.js';
import { sledge, pine } from './rough.js';
import { pulse, ageOf, dust } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
// 2 dp, but under 0.1 to 3 s.f., never a false 0
const s3 = (x) => (Math.abs(x) >= 0.1 || x === 0 ? num(x, 2) : num(Number(x.toPrecision(3)), 6, { trim: true }));
const sf = (x) => num(Number(x.toPrecision(3)), 6, { trim: true });
// tan α as the paper gives it: a simple fraction when it is one (5/12), else 3 s.f.
const fracOf = (x) => { for (let q = 1; q <= 24; q++) { const p = Math.round(x * q); if (Math.abs(p / q - x) < 1e-9) return q === 1 ? `${p}` : `${p}/${q}`; } return num(Number(x.toPrecision(3)), 6, { trim: true }); };
const ease = (u) => { const c = clamp(u, 0, 1); return c * c * (3 - 2 * c); };

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'rope') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const compact = phone || h < 320 || w < 720;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);
  const cardW = compact ? 0 : 236, cardH = 190;
  if (cardW) L.reserve({ x: w - cardW - 16, y: h - cardH - 16, w: cardW, h: cardH });

  // ── the surface in its own plane: the run from where it starts (0, 0) along the way it is pulled;
  //    room ahead for the person and the rope, and under the surface for the arrows and the ruler
  const al = f.alpha * D2R, ca = Math.cos(al), sa = Math.sin(al);
  const far = f.s1 + f.s2, Ls = clamp(Math.min(w, h) * 0.16, phone ? 40 : 52, 100), Lp = Ls * 1.25;
  const th = f.theta * D2R, attachH = Ls * 0.16;
  const ropeLen = clamp(f.theta > 0 ? (Lp * 0.42 - attachH) / Math.sin(th) : Ls * 1.6, Ls * 1.2, phone ? Ls * 1.8 : Ls * 2.4);
  const area = { left: phone ? 14 : HB[0].w + 20, right: w - (cardW ? cardW + 30 : 14), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - (compact ? 52 : 26) };
  const baseBox = { xLo: -far * 0.06, xHi: far * ca, yLo: 0, yHi: far * sa };
  let fit = fitSide(baseBox, area, { sky: 0.45 });
  for (let pass = 0; pass < 2; pass++) {
    const k0 = fit.k, ahead = (ropeLen + Lp * 0.8) / k0, under = 120 / k0, above = (Lp * 1.2) / k0;
    fit = fitSide({ xLo: baseBox.xLo - Ls / k0, xHi: baseBox.xHi + ahead, yLo: -under, yHi: baseBox.yHi + above }, area, { sky: 0.45 });
  }
  const { k, X, Y } = fit;
  const along = (s) => ({ x: X(s * ca), y: Y(s * sa) });
  const ext = (Ls * 0.6) / k;                       // the incline starts this far back, so the sledge sits on it at s = 0
  const o0 = along(-ext), end = along(far + (ropeLen + Lp) / k);
  const nx = sa, ny = -ca;                          // the normal out of the surface, on screen (up)
  // where the hand is when the rope is let go (for keeping the far pines clear of it)
  const handAt0 = () => { const b = along(f.s1); return { x: b.x + ca * Ls * 0.5 + nx * attachH + Math.cos(al + th) * ropeLen, y: 0 }; };
  const uw = { x: ca, y: -sa };                     // the way it is pulled, on screen

  // ── winter sky; the far snowfield with pines on it (behind the track, never on it); the snow surface
  // the horizon sits on the level ground at the start, not the far end of a slope
  const surfY = clamp(o0.y, h * 0.35, h * 0.8);
  skyscape(g, 0, 0, w, Math.min(surfY - 30, h * 0.75), { seed: 47, far: 'hills', sun: false });
  const snow = E.night ? '#c9d3dc' : '#f4f7fa', shade = E.night ? '#a9b6c2' : '#dbe4ec';
  const bandY = Math.min(surfY - 30, h * 0.75);
  g.fillStyle = E.night ? '#b7c3ce' : '#e6edf3'; g.fillRect(0, bandY, w, h - bandY);
  // the far pines, kept clear of where the person lets go and of the start (they would stand in a thicket)
  { const r = rng(5), keep = [X(0), handAt0().x]; for (let i = 0; i < (phone ? 6 : 9); i++) { const x = r() * w, hp = Lp * (0.6 + r() * 0.5); const y0 = bandY + 6 + r() * 10; if (keep.some((kx) => Math.abs(x - kx) < Lp)) continue; pine(g, x, y0, hp); } }
  const sg = g.createLinearGradient(0, end.y, 0, o0.y + 60); sg.addColorStop(0, snow); sg.addColorStop(1, shade);
  g.fillStyle = sg; g.beginPath(); g.moveTo(-20, o0.y); g.lineTo(o0.x, o0.y); g.lineTo(end.x, end.y); g.lineTo(w + 20, end.y); g.lineTo(w + 20, h + 20); g.lineTo(-20, h + 20); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(120,140,160,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-20, o0.y); g.lineTo(o0.x, o0.y); g.lineTo(end.x, end.y); g.lineTo(w + 20, end.y); g.stroke();
  // drifts and wind-cut ridges in the snow, sparkles that catch the light
  { const r = rng(11);
    for (let i = 0; i < 14; i++) { const x = r() * w, y = surfY + 20 + r() * (h - surfY); g.fillStyle = withAlpha(shade, 0.6); g.beginPath(); g.ellipse(x, y, 30 + r() * 60, 4 + r() * 5, 0, 0, TAU); g.fill(); }
    g.strokeStyle = withAlpha(E.night ? '#8796a5' : '#c3cfdb', 0.7); g.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) { const x = r() * w, y = surfY + 14 + r() * (h - surfY); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 3, x + 22 + r() * 16, y); g.stroke(); }
    g.fillStyle = withAlpha('#ffffff', E.night ? 0.6 : 0.9); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r() * w, surfY + 6 + r() * (h - surfY), 0.8 + r(), 0, TAU); g.fill(); } }
  // falling snow, drifting with the clock
  { g.fillStyle = 'rgba(255,255,255,0.75)'; const hsh = (n) => { const z = Math.sin(n * 127.1 + 311.7) * 43758.5453; return z - Math.floor(z); };
    for (let i = 0; i < 60; i++) { const x = ((hsh(i) * (w + 20) + t * 18) % (w + 20)) - 10, y = ((hsh(i + 99) * (h + 20) + t * 40) % (h + 20)) - 10; g.beginPath(); g.arc(x, y, 1.2 + hsh(i + 7), 0, TAU); g.fill(); } }
  // on a slope, the angle at its foot
  if (f.alpha > 0) {
    const R = clamp(k * far * 0.2, 40, 90);
    g.strokeStyle = P.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(o0.x, o0.y); g.lineTo(o0.x + R * 1.25, o0.y); g.stroke();
    g.beginPath(); g.arc(o0.x, o0.y, R, -al, 0); g.stroke();
    L.add(f.tanA != null ? T`tan alpha = ${fracOf(f.tanA)}` : `${num(f.alpha, 1, { trim: true })}°`, o0.x + Math.cos(-al / 2) * R * 1.25, o0.y + Math.sin(-al / 2) * R * 1.25 + 4, { color: P.ink, pri: 10, size: 14, weight: 700, maxPush: 12 });
  }

  // ── the sledge's track: two runner ruts, as far as it has got
  const s = f.pos(t), q = along(s), reached = Math.max(0, f.pos(Math.min(t, f.tRest)));
  { const a0 = along(0), b0 = along(reached);
    for (const off of [-2, 2]) stroke(g, [{ x: a0.x + nx * off, y: a0.y + ny * off - 1 }, { x: b0.x + nx * off, y: b0.y + ny * off - 1 }], { color: E.night ? '#8796a5' : '#a9b8c8', width: 2, alpha: 0.7 }); }

  // ── under the surface: the let-go tick, and the ruler of how far it slid after
  const rel = along(f.s1), stop = along(far), dn = (p, dd) => ({ x: p.x - nx * dd, y: p.y - ny * dd });
  if (t >= f.tRel - 1e-9) {
    // its own band under the arrows' rows: the tick down to it, the words beside it, away from the motion
    stroke(g, [dn(rel, 2), dn(rel, 60)], { color: P.mark, width: 1.6 });
    const lp = dn(rel, 72);
    L.add(T`"let go at" ${sf(f.v)} [m s^-1]`, lp.x - 6, lp.y, { color: P.mark, pri: 10, size: 13, weight: 700, align: 'right', maxPush: 20 });
  }
  // a ruler only for a slide long enough to show one; a short one's distance goes in the stop's words
  const longSlide = Math.hypot(stop.x - rel.x, stop.y - rel.y) >= 40;
  if (t >= f.tRest - 1e-9 && longSlide) {
    const a1 = dn(rel, 92), b1 = dn(stop, 92);
    // a dimension along level ground is across: dashed (rule 2); along a slope, solid
    stroke(g, [a1, b1], { color: P.disp, width: 1.6, dash: f.alpha === 0 ? [6, 4] : null });
    for (const p of [a1, b1]) stroke(g, [{ x: p.x - nx * 6, y: p.y - ny * 6 }, { x: p.x + nx * 6, y: p.y + ny * 6 }], { color: P.disp, width: 1.6 });
    const mp = dn({ x: (rel.x + stop.x) / 2, y: (rel.y + stop.y) / 2 }, 106);
    L.add(T`${sf(f.s2)} [m] "after it was let go"`, mp.x, mp.y, { color: P.disp, pri: 10, size: 13, weight: 700, maxPush: 20 });
  }

  // ── the person pulling: ahead of the sledge, leaning into it, the rope in their hands at θ to the surface.
  //    Let go, they open their hand, slow over half a second and step off the track behind it
  const pulled = t < f.tRel - 1e-9, since = pulled ? 0 : t - f.tRel;
  const ropeFrom = (sPos) => { const b = along(sPos); return { x: b.x + uw.x * Ls * 0.5 + nx * attachH, y: b.y + uw.y * Ls * 0.5 + ny * attachH }; };
  const handAt = (sPos) => { const fr = ropeFrom(sPos); return { x: fr.x + Math.cos(al + th) * ropeLen, y: fr.y - Math.sin(al + th) * ropeLen }; };
  const hRel = handAt(f.s1);
  const sP = pulled ? s : f.s1 + (Math.min(since, 0.5) * f.v * 0.5 - 0.5 * f.v * Math.min(since, 0.5) ** 2) * 0.6;   // a few slowing steps
  const hand = handAt(sP), feetS = ((hand.x - X(0)) / k + (Lp * 0.12) / k) / ca, feet = along(feetS);
  const aside = ease(since / 0.4), scaleP = 1 - 0.15 * aside, liftP = Ls * 0.25 * aside;
  const drawPerson = () => runner(g, feet.x, feet.y - liftP, Lp * scaleP, P, { dir: 1, still: since > 0.5, phase: phaseFor('runner', Lp, sP * k * 0.6), reach: pulled ? hand : null, lean: pulled ? 0.32 : 0.14 * (1 - ease(since / 0.5)) });
  // behind the track once let go (drawn first), in front of it while pulling
  if (!pulled) drawPerson();
  // the sledge, on the surface (blending onto the incline from the level snow at its foot)
  g.save(); g.translate(q.x, q.y); g.rotate(-al); sledge(g, Ls); g.restore();
  for (let i = -1; i <= 1; i++) { const c = along(s + (i * Ls * 0.33) / k); L.reserve({ x: c.x - Ls * 0.2, y: c.y - Ls * 0.4, w: Ls * 0.4, h: Ls * 0.4 }); }
  // the rope: taut to the hand while pulled; let go it stays tied to the sledge and sags to the snow ahead of it
  { const fr = ropeFrom(s);
    g.strokeStyle = '#c9a86a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(fr.x, fr.y);
    if (pulled) g.lineTo(hand.x, hand.y);
    else {
      const u = ease(since / 0.3), tip = along(s + (ropeLen * 0.9) / k), taut = { x: fr.x + Math.cos(al + th) * ropeLen, y: fr.y - Math.sin(al + th) * ropeLen };
      const endP = { x: taut.x + (tip.x - taut.x) * u, y: taut.y + (tip.y - 2 - taut.y) * u }, mid = { x: (fr.x + endP.x) / 2, y: (fr.y + endP.y) / 2 + 6 * u };
      g.quadraticCurveTo(mid.x, mid.y, endP.x, endP.y);
    }
    g.stroke(); }
  if (pulled) { drawPerson(); L.reserve({ x: feet.x - Lp * 0.4, y: feet.y - Lp, w: Lp * 0.7, h: Lp }); }
  // the moment it is let go: the hand opens with a flash, snow kicks up at the sledge's front
  if (!pulled && fired) {
    const e = ageOf(t, f.tRel, f.tMax, 0.6);
    pulse(g, hRel.x, hRel.y, e.age, e.life, P.mark, { radius: 16 });
    const fr0 = ropeFrom(f.s1); dust(g, fr0.x, along(f.s1).y, e.age, e.life, { size: 0.8 });
  }

  // ── the velocity and the acceleration: two rows under the surface, left edges together, labels behind
  //    their tails. On level ground the motion is across: dashed (rule 2); along a slope, solid
  const v = f.vel(t), A = f.acc(t), across = f.alpha === 0 ? [6, 4] : null;
  const row = (dd, val, max, col, sym, unit, w0) => {
    const dir = Math.sign(val), len = Math.min((Math.abs(val) / max) * 90, 90);
    if (!(len >= 4)) return;
    const base = dn(q, dd), tail = { x: base.x - uw.x * (dir > 0 ? 10 : -10), y: base.y - uw.y * (dir > 0 ? 10 : -10) };
    arrow(g, tail.x, tail.y, tail.x + dir * uw.x * len, tail.y + dir * uw.y * len, { color: col, width: w0, head: Math.min(9, len * 0.6), dash: across });
    L.add(T`${s3(Math.abs(val))} [${unit}]`, tail.x - dir * uw.x * 8, tail.y - dir * uw.y * 8 + 4, { color: col, pri: 8, size: 13, weight: 700, align: dir > 0 ? 'right' : 'left', maxPush: 24 });
  };
  if (show.velocity !== false && Math.abs(v) >= 0.05) row(20, v, Math.max(f.v, 1e-9), P.vel, 'v', 'm s^-1', 2.6);
  if (Math.abs(A) > 1e-9) row(42, A, Math.max(Math.abs(f.a), Math.abs(f.a2), Math.abs(f.aBack || 0), 1e-9), P.acc, 'a', 'm s^-2', 2.2);

  // at rest: a ring, and on a slope what happens there; sliding back, the ring is gone and the end is marked
  const ph0 = f.phase(t);
  if (fired && t >= f.tRest - 1e-9) {
    if (ph0 === 'rest') { const e = ageOf(t, f.tRest, f.tMax); pulse(g, stop.x, stop.y, e.age, e.life, P.mark, { radius: 26 }); }
    const what = f.alpha > 0 ? (f.stays ? '"friction holds it"' : '"too steep: it slides back"') : null;
    if (what || !longSlide) L.add(longSlide ? T`${what}` : T`${sf(f.s2)} [m] "on"${what ? `, ${what}` : ''}`, clamp(stop.x, 110, w - 110), stop.y - Ls * 0.9, { color: P.mark, pri: 10, size: 13, weight: 700, maxPush: 30 });
    if (ph0 === 'back' && t >= f.tMax - 1e-9) { const e = ageOf(t, f.tMax, f.tMax); pulse(g, q.x, q.y, e.age, e.life, P.mark, { radius: 22 }); }
  }
  L.draw(g, w, h);

  // ── the free-body diagram for this moment, on a card (or a caption on a small stage)
  unview(g);
  // the forces at this moment are the engine's (rule 4): friction along the way it is pulled +
  const FF = f.forces(t), ph = FF.phase, on = ph === 'pull';
  const Rnow = FF.R, Fnow = Math.abs(FF.F) > 1e-9 ? Math.abs(FF.F) : null, Fdir = Math.sign(FF.F);
  const lab = (txt, x, y, col, al2 = 'left') => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = al2; g.textBaseline = 'middle'; g.lineWidth = 4; g.strokeStyle = withAlpha(P.card, 0.9); g.lineJoin = 'round'; g.strokeText(txt, x, y); g.fillText(txt, x, y); g.restore(); };
  const word = on ? 'Pulled' : ph === 'rest' ? (FF.holding ? 'At rest, held by friction' : 'At rest') : ph === 'back' ? 'Sliding back' : 'Let go';
  if (cardW) {
    const cx = w - cardW - 16, cy = h - cardH - 16;
    paper(g, cx, cy, cardW, cardH);
    { g.save(); g.font = '700 13px system-ui, sans-serif'; const full = `${word}: the forces on it`, fits = g.measureText(full).width <= cardW - 24; g.restore();
      lab(fits ? full : word, cx + 12, cy + 16, P.muted); }
    // every arrow to one scale (a short one drawn at least 18 px, its value in the legend), labelled at its tip
    const bx = cx + 76, by = cy + 96, big = Math.max(f.W, f.T, 1e-9), sc = 34 / big, Lm = (x) => Math.max(18, x * sc);
    g.save(); g.translate(bx, by); g.rotate(-al);
    g.strokeStyle = withAlpha(P.ink, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(-56, 12); g.lineTo(56, 12); g.stroke();
    g.fillStyle = withAlpha(P.ink, 0.1); g.strokeStyle = P.ink; g.beginPath(); g.roundRect?.(-16, -12, 32, 24, 3); g.fill(); g.stroke();
    const tips = [];
    arrow(g, 0, -12, 0, -12 - Lm(Rnow), { color: P.ink, width: 2.2, head: 8 }); tips.push(['R', 0, -12 - Lm(Rnow) - 8]);
    if (Fnow) { arrow(g, Fdir * 16, 12, Fdir * (16 + Lm(Fnow)), 12, { color: P.ink, width: 2.2, head: 7 }); tips.push(['F', Fdir * (16 + Lm(Fnow) + 8), 22]); }
    if (on) { const lt = Lm(f.T); arrow(g, 16, -4, 16 + Math.cos(th) * lt, -4 - Math.sin(th) * lt, { color: P.ink, width: 2.4, head: 9 }); tips.push(['T', 16 + Math.cos(th) * (lt + 9), -4 - Math.sin(th) * (lt + 9)]); }
    g.restore();
    // the weight straight down, from the bottom of the body
    arrow(g, bx, by + 12, bx, by + 12 + Lm(f.W), { color: P.ink, width: 2.2, head: 8 });
    // the tips' places on the card: the body's frame turned by the slope's angle
    for (const [sym, x, y] of tips) lab(T`${sym}`, bx + x * Math.cos(al) + y * Math.sin(al), by - x * Math.sin(al) + y * Math.cos(al), P.ink, 'center');
    lab(T`m g`, bx + 14, by + 12 + Lm(f.W) - 4, P.ink);
    // the legend: each force's value, one line each
    const lx = cx + cardW - 12, rows = [T`R = ${sf(Rnow)} [N]`, ...(on ? [T`T = ${sf(f.T)} [N]`] : []), ...(Fnow ? [FF.holding ? T`F = ${sf(Fnow)} [N] "(holding)"` : T`F = mu R = ${sf(Fnow)} [N]`] : []), T`m g = ${sf(f.W)} [N]`];
    rows.forEach((r, i) => lab(r, lx, cy + 42 + i * 20, P.ink, 'right'));
  } else {
    const parts = [word.toLowerCase(), ...(on ? [T`T = ${sf(f.T)} [N]`] : []), T`R = ${sf(Rnow)} [N]`, ...(Fnow ? [T`F = ${sf(Fnow)} [N]`] : [])];
    g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
    const one = parts.join(', '), lines = g.measureText(one).width + 14 <= w - 20 ? [one] : [parts.slice(0, 2).join(', '), parts.slice(2).join(', ')];
    const tw = Math.max(...lines.map((x) => g.measureText(x).width)) + 14, bh = 8 + 18 * lines.length;
    paper(g, 10, h - bh - 8, tw, bh);
    g.fillStyle = P.ink; lines.forEach((x, i) => g.fillText(x, 17, h - bh - 8 + 13 + i * 18)); g.restore();
  }
  return null;
}
