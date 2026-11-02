// rough.js — the stage for a sledge pushed up a snowy slope, side on and at
// the slope's true angle: a winter sky, snow-laden pines, the hillside rising
// to the right, the sledge (wooden slats on curved runners, its rope trailing)
// sliding up it, slowing, stopping — and, on a slope too steep for the
// friction, sliding back down, leaving its track in the snow.
//
// The angle is marked at the foot. Where it comes to rest, a ring and the
// distance up the slope; then either "stays" or the slide back. A card fixed
// to the screen shows the forces along the slope from the engine: the weight's
// component and the friction, both down the slope on the way up, the friction
// turned round on the way down.
//
// Everything drawn is read from js/core/rough.js (rule 4).

import { fitCanvas, palette, clamp, labels, arrow, withAlpha, hudBoxes, unview } from './util.js';
import { skyscape, fitSide, env, paper } from './scenery.js';
import { pulse, ageOf } from './effects.js';
import { T, num } from '../notation.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const s3 = (x) => num(x, Math.abs(x) < 10 ? 2 : 1, { trim: true });

/** A wooden sledge, side on, its runners on the ground at (0, 0), L px long, facing +x. */
function sledge(g, L) {
  g.save();
  g.strokeStyle = '#3b2a1a'; g.lineWidth = Math.max(2, L * 0.05); g.lineCap = 'round';
  // the runners, curling up at the front
  g.beginPath(); g.moveTo(-L * 0.5, 0); g.lineTo(L * 0.38, 0); g.quadraticCurveTo(L * 0.56, 0, L * 0.52, -L * 0.18); g.stroke();
  // the struts
  for (const x of [-0.38, -0.05, 0.28]) { g.beginPath(); g.moveTo(L * x, 0); g.lineTo(L * x, -L * 0.14); g.stroke(); }
  // the deck: three slats
  const wood = g.createLinearGradient(0, -L * 0.22, 0, -L * 0.12);
  wood.addColorStop(0, '#c98a4b'); wood.addColorStop(1, '#8e5a2c');
  g.fillStyle = wood; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
  g.beginPath(); g.roundRect?.(-L * 0.48, -L * 0.22, L * 0.9, L * 0.09, 3); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(60,30,10,0.45)';
  for (const x of [-0.18, 0.12]) { g.beginPath(); g.moveTo(L * x, -L * 0.22); g.lineTo(L * x, -L * 0.13); g.stroke(); }
  // the rope, trailing from the front
  g.strokeStyle = '#d9c38f'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L * 0.5, -L * 0.16); g.quadraticCurveTo(L * 0.7, -L * 0.05, L * 0.62, L * 0.02); g.stroke();
  g.restore();
}

/** A snow-laden pine at (x, Y) on the ground, H px tall. */
function pine(g, x, Y, H) {
  g.fillStyle = '#4a3423'; g.fillRect(x - H * 0.04, Y - H * 0.16, H * 0.08, H * 0.16);
  for (let i = 0; i < 3; i++) {
    const y = Y - H * (0.14 + i * 0.27), wdt = H * (0.36 - i * 0.09);
    g.fillStyle = '#2e5a3e'; g.beginPath(); g.moveTo(x - wdt, y); g.lineTo(x, y - H * 0.36); g.lineTo(x + wdt, y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(245,248,252,0.92)'; g.beginPath(); g.moveTo(x - wdt * 0.8, y - H * 0.04); g.lineTo(x, y - H * 0.34); g.lineTo(x + wdt * 0.5, y - H * 0.1); g.closePath(); g.fill();
  }
}

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, fired = true, show = {} } = o;
  if (!f || f.kind !== 'rough') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette(), L = labels(), E = env(), phone = w < 520;
  const compact = phone || h < 300 || w < 700;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  const HB = hudBoxes(w, 3); for (const b of HB) L.reserve(b);

  // ── the slope in its own plane: from the start at the foot (0, 0) up to the top of the run and a little past
  const al = f.alpha * D2R, run = f.sUp * 1.25, D = run * Math.cos(al), H = run * Math.sin(al);
  const cardW = compact ? 0 : 262;
  const box = { xLo: -run * 0.18, xHi: D + run * 0.08, yLo: -run * 0.06, yHi: H + run * 0.16 };
  const area = { left: phone ? 14 : HB[0].w + 20, right: w - (compact ? 14 : cardW + 30), top: HB[0].h * (phone ? 1 : 0.55), bottom: h - (compact ? 40 : 26) };
  const { k, X, Y } = fitSide(box, area, { sky: 0.6 });
  const along = (s) => ({ x: X(s * Math.cos(al)), y: Y(s * Math.sin(al)) });
  const foot = along(0), top = along(run);

  // ── winter sky, the far snowfield, the hillside rising to the right
  skyscape(g, 0, 0, w, Math.min(foot.y, h * 0.75), { seed: 83, far: 'hills', sun: false });
  const snow = E.night ? '#c9d3dc' : '#f4f7fa', shade = E.night ? '#a9b6c2' : '#dbe4ec';
  g.fillStyle = shade; g.fillRect(-20, foot.y, w + 40, h);
  const hillG = g.createLinearGradient(0, top.y, 0, foot.y + 30);
  hillG.addColorStop(0, snow); hillG.addColorStop(1, shade);
  g.fillStyle = hillG; g.beginPath(); g.moveTo(-20, foot.y); g.lineTo(foot.x, foot.y); g.lineTo(top.x, top.y); g.lineTo(w + 20, top.y - 4); g.lineTo(w + 20, h + 20); g.lineTo(-20, h + 20); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(120,140,160,0.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-20, foot.y); g.lineTo(foot.x, foot.y); g.lineTo(top.x, top.y); g.lineTo(w + 20, top.y - 4); g.stroke();
  // the pines, and room kept round them for nothing else
  for (const [x, sz] of [[foot.x - 70, 1], [foot.x - 140, 0.8], [top.x + 50, 1.1], [top.x + 110, 0.85]]) if (x > 8 && x < w - 8) {
    const Yp = x < foot.x ? foot.y : top.y - 2, Hp = 70 * sz; pine(g, x, Yp, Hp); L.reserve({ x: x - Hp * 0.36, y: Yp - Hp, w: Hp * 0.72, h: Hp });
  }
  // falling snow, drifting with the clock
  { g.fillStyle = 'rgba(255,255,255,0.75)'; const hsh = (n) => { const z = Math.sin(n * 127.1 + 311.7) * 43758.5453; return z - Math.floor(z); };
    for (let i = 0; i < 60; i++) { const x = ((hsh(i) * (w + 20) + t * 18) % (w + 20)) - 10, y = ((hsh(i + 99) * (h + 20) + t * 40) % (h + 20)) - 10; g.beginPath(); g.arc(x, y, 1.2 + hsh(i + 7), 0, TAU); g.fill(); } }

  // ── the angle at the foot
  { const R = clamp(k * run * 0.3, 44, 110);
    g.strokeStyle = P.ink; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(foot.x, foot.y); g.lineTo(foot.x + R * 1.25, foot.y); g.stroke();
    g.beginPath(); g.arc(foot.x, foot.y, R, -al, 0); g.stroke();
    L.add(`${num(f.alpha, 2, { trim: true })}°`, foot.x + R * 0.8, foot.y + 18, { color: P.ink, pri: 9, size: 14, weight: 700 }); }

  // ── the sledge's track, the sledge, and where it came to rest
  const s = f.pos(t), q = along(s), Ls = clamp(Math.min(w, h) * 0.16, 52, 100), v = f.vel(t);
  const reached = f.pos(Math.min(t, f.tTop));   // as far up as it has got
  { const a = along(0), b = along(reached); g.strokeStyle = 'rgba(120,140,165,0.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y - 1); g.lineTo(b.x, b.y - 1); g.stroke(); }
  g.save(); g.translate(q.x, q.y); g.rotate(-al); sledge(g, Ls); g.restore();
  L.reserve({ x: q.x - Ls * 0.55, y: q.y - Ls * 0.45, w: Ls * 1.15, h: Ls * 0.5 });
  if (fired && t >= f.tTop - 1e-9) {
    const p = along(f.sUp), e = ageOf(t, f.tTop, f.tMax);
    pulse(g, p.x, p.y, e.age, e.life, P.mark, { radius: 36 });
    // one label at the stop, held near it: the distance, and what happens there
    const then = f.stays ? '"friction holds it"' : f.mu === 0 ? '"no friction: it slides back"' : '"too steep: it slides back"';
    L.add(T`${s3(f.sUp)} [m] "up the slope," ${then}`, p.x, p.y - Ls * 0.7, { color: P.mark, pri: 10, size: 13, weight: 700, maxPush: 60 });
  }
  if (fired && !f.stays && t >= f.tMax - 1e-9) {
    const e = ageOf(t, f.tMax, f.tMax); pulse(g, foot.x, foot.y, e.age, e.life, P.mark, { radius: 32 });
    L.add(T`"back at" ${s3(f.vBack)} [m s^-1]`, foot.x, foot.y + 38, { color: P.mark, pri: 9, size: 13, weight: 700 });
  }

  // ── the arrows, along the slope from the sledge
  const ux = Math.cos(al), uy = -Math.sin(al);
  // no arrow for a speed that reads as 0; it shortens with the speed, no minimum
  if (show.velocity !== false && Math.abs(v) >= 0.05 && (Math.abs(v) / f.u) * 100 >= 4) {
    const dir = Math.sign(v), len = Math.min((Math.abs(v) / f.u) * 100, 100);
    const ax = q.x + dir * ux * Ls * 0.6, ay = q.y + dir * uy * Ls * 0.6 - Ls * 0.42;
    arrow(g, ax, ay, ax + dir * ux * len, ay + dir * uy * len, { color: P.vel, width: 2.6, head: 10 });
    L.add(T`${s3(Math.abs(v))} [m s^-1]`, ax + dir * ux * len + dir * 8, ay + dir * uy * len - 8, { color: P.vel, pri: 8, size: 14, weight: 700, align: dir > 0 ? 'left' : 'right' });
  }
  const a = f.acc(t);
  // the deceleration is what the scene is about: always shown while it acts, as on the ice
  if (Math.abs(a) > 1e-9) {
    // under the slope, square off it
    const dir = Math.sign(a), bx = q.x - uy * 24, by = q.y + ux * 24;
    arrow(g, bx, by, bx + dir * ux * 48, by + dir * uy * 48, { color: P.acc, width: 2.2, head: 9 });
    L.add(T`${s3(Math.abs(a))} [m s^-2]`, bx + dir * ux * 24, by + dir * uy * 24 + 18, { color: P.acc, pri: 7, size: 13, weight: 700 });
  }
  L.draw(g, w, h);

  // ── the forces along the slope: a card, or on a small stage a caption line
  if (f.W != null) {
    unview(g);
    // the friction the engine gives for this moment: up the slope positive
    const Fx = f.friction(t), ph = f.phase(t), way = Fx < 0 ? '"down the slope"' : '"up the slope"';
    const fWord = f.mu === 0 ? 'no friction: a smooth slope' : ph === 'rest' ? T`"friction holding it" ${s3(Math.abs(Fx))} [N] ${way}` : T`F = mu R = ${s3(Math.abs(Fx))} [N] ${way}`;
    if (!compact) {
      const cw = cardW, chh = 150, cx = w - cw - 16, cy = h - chh - 16;
      paper(g, cx, cy, cw, chh);
      // never squeezed: the card is wide enough for its longest line at 13 px
      const lab = (txt, x, y, col) => { g.save(); g.font = '700 13px system-ui, sans-serif'; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(txt, x, y); g.restore(); };
      lab('Up the slope +', cx + 12, cy + 18, P.muted);
      const big = Math.max(f.W, f.Fr, 1e-9), sc = (cw - 60) / 2 / big, x0 = cx + cw / 2;
      arrow(g, x0, cy + 46, x0 - f.W * sc, cy + 46, { color: P.ink, width: 2.4, head: 9 });
      lab(T`m g sin alpha = ${s3(f.W)} [N] "down the slope"`, cx + 12, cy + 62, P.ink);
      if (Math.abs(Fx) > 1e-9) arrow(g, x0, cy + 92, x0 + Fx * sc, cy + 92, { color: P.ink, width: 2.4, head: 9 });
      lab(fWord, cx + 12, cy + 108, P.ink);
      lab(T`R = m g cos alpha = ${s3(f.N)} [N]`, cx + 12, cy + 134, P.muted);
    } else {
      const parts = [T`m g sin alpha = ${s3(f.W)} [N] "down"`, f.mu === 0 ? 'no friction' : ph === 'rest' ? T`"friction" ${s3(Math.abs(Fx))} [N] ${Fx < 0 ? '"down"' : '"up"'}` : T`F = ${s3(Math.abs(Fx))} [N] ${Fx < 0 ? '"down"' : '"up"'}`, T`R = ${s3(f.N)} [N]`];
      g.save(); g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'middle';
      // one line if it fits, else two: never squeezed below 13 px
      const one = parts.join(', '), lines = g.measureText(one).width + 14 <= w - 20 ? [one] : [parts.slice(0, 2).join(', '), parts[2]];
      const tw = Math.max(...lines.map((x) => g.measureText(x).width)) + 14, bh = 8 + 18 * lines.length;
      g.fillStyle = withAlpha('#101418', 0.78); g.fillRect(10, h - bh - 8, tw, bh);
      g.fillStyle = '#e8eaee'; lines.forEach((x, i) => g.fillText(x, 17, h - bh - 8 + 13 + i * 18)); g.restore();
    }
  }
  return null;
}
