// effects.js — the moments a motion has, drawn as they happen: dust kicked up
// where something lands, a splash where it enters water, a ring spreading
// where two meet, a flash where two collide, a ball squashing as it bounces.
//
// THE ENGINE SAYS WHEN (CLAUDE.md rule 4). Every effect takes `age`, the time
// since the engine's own event (t − tEvent, in the motion's seconds), and a
// `life`, how long it lasts in those seconds — a stage picks a life that is a
// fraction of its whole run, so a 0.2 s flight and a 20 s journey both show
// their effect for a readable moment. Before the event (age < 0) and after
// its life nothing is drawn. Nothing here changes a number on screen.

import { withAlpha } from './util.js';
import { env, rng } from './scenery.js';

const ease = (u) => 1 - (1 - u) ** 3;                    // fast out, soft landing

/** How far through its life an effect is, 0..1, or null if not showing. */
export function phaseOf(age, life) {
  if (!(age >= 0) || !(life > 0) || age > life) return null;
  return age / life;
}

/** Dust kicked up at (x, y) on the ground: grains thrown out and up, settling and fading. */
export function dust(g, x, y, age, life, o = {}) {
  const u = phaseOf(age, life); if (u == null) return;
  const E = env(), r = rng(o.seed ?? 29), size = o.size ?? 1, n = o.n ?? 14;
  g.save();
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.08 + r() * 0.84), sp = (18 + r() * 26) * size, e = ease(u);
    const px = x + Math.cos(a) * sp * e * (r() < 0.5 ? -1 : 1), py = y - Math.sin(a) * sp * 0.7 * e + 30 * size * u * u;
    g.fillStyle = withAlpha(E.night ? '#a89a90' : '#b39a7e', 0.55 * (1 - u));
    g.beginPath(); g.arc(px, Math.min(py, y), (2 + r() * 2.5) * size * (0.6 + u), 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

/** A splash at (x, y) on a water surface: droplets up and out, and rings spreading. */
export function splash(g, x, y, age, life, o = {}) {
  const u = phaseOf(age, life); if (u == null) return;
  const r = rng(o.seed ?? 31), size = o.size ?? 1;
  g.save();
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (0.15 + r() * 0.7), sp = (30 + r() * 30) * size;
    const px = x + Math.cos(a) * sp * u * (i % 2 ? 1 : -1), py = y - Math.sin(a) * sp * u * 1.4 + 70 * size * u * u;
    if (py > y) continue;
    g.fillStyle = `rgba(235,245,250,${0.85 * (1 - u)})`; g.beginPath(); g.arc(px, py, 2.2 * size, 0, Math.PI * 2); g.fill();
  }
  for (const k of [1, 0.6]) { g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - u)})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, 26 * size * ease(u) * k + 4, 6 * size * ease(u) * k + 1.5, 0, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}

/** A ring spreading from (x, y) and fading: the moment two meet, or a catch. */
export function pulse(g, x, y, age, life, color, o = {}) {
  const u = phaseOf(age, life); if (u == null) return;
  const R = (o.radius ?? 34) * ease(u) + 6;
  g.save();
  for (const k of [1, 0.62]) { g.strokeStyle = withAlpha(color, 0.85 * (1 - u) * k); g.lineWidth = 2.6 * k; g.beginPath(); g.arc(x, y, R * k, 0, Math.PI * 2); g.stroke(); }
  g.restore();
}

/** A bright flash at (x, y): a collision. A starburst that blooms and fades. */
export function flash(g, x, y, age, life, o = {}) {
  const u = phaseOf(age, life); if (u == null) return;
  const R = (o.radius ?? 26) * (0.5 + ease(u)), a = 1 - u;
  g.save();
  const gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, `rgba(255,250,235,${0.95 * a})`); gr.addColorStop(0.4, `rgba(255,236,190,${0.5 * a})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
  g.strokeStyle = `rgba(255,248,225,${0.8 * a})`; g.lineWidth = 1.6;
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(t) * R * 0.35, y + Math.sin(t) * R * 0.35); g.lineTo(x + Math.cos(t) * R * 0.9, y + Math.sin(t) * R * 0.9); g.stroke(); }
  g.restore();
}

/** A ball's squash at a bounce: x and y scale, wide and flat at the moment of
    impact, springing back over its life. */
export function squash(age, life) {
  const u = phaseOf(age, life); if (u == null) return { sx: 1, sy: 1 };
  const k = Math.exp(-6 * u) * Math.cos(u * Math.PI * 3) * 0.35;
  return { sx: 1 + k, sy: 1 - k };
}

/** Lines of motion behind something moving fast across: three short streaks. */
export function speedLines(g, x, y, dir, strength, color) {
  if (!(strength > 0.05)) return;
  g.save(); g.strokeStyle = withAlpha(color, 0.35 * Math.min(1, strength)); g.lineWidth = 1.6; g.lineCap = 'round';
  for (const [dy, len] of [[-6, 22], [0, 30], [6, 18]]) { g.beginPath(); g.moveTo(x - dir * 6, y + dy); g.lineTo(x - dir * (6 + len * Math.min(1, strength)), y + dy); g.stroke(); }
  g.restore();
}

/** How old an effect is at time t, for an event at tEvent in a run that ends
    at tMax: the time since it during the run; for an event at the very end,
    where the playback stops, a moment a third of the way through its life, so
    the impact still shows. `life` defaults to a seventh of the run. */
export function ageOf(t, tEvent, tMax, life = Math.max(1e-6, tMax / 7)) {
  if (!(t >= tEvent - 1e-9)) return { age: -1, life };
  const atEnd = Math.abs(tEvent - tMax) < 1e-6 * Math.max(1, tMax);
  return { age: atEnd ? life * 0.35 : t - tEvent, life };
}
