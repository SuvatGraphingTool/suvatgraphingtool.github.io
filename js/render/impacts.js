// impacts.js — more of the moments a landing has, for the composer: a crater
// punched in dust (the Moon, Mars), snow thrown up in puffs, a divot of turf,
// sparks off metal or stone, confetti for a hit, and a smoke trail behind a
// rocket as it flies.
//
// THE ENGINE SAYS WHEN (CLAUDE.md rule 4), as in effects.js: each takes the
// `age` since the engine's own event and a `life`, and draws nothing before
// it. What it leaves behind (a crater's bowl, a divot's scar) stays once its
// life is over, as the place now is. Seeded, so each frame draws the same.
// Nothing here changes a number on screen.

import { withAlpha } from './util.js';
import { env, rng } from './scenery.js';
import { phaseOf } from './effects.js';

const TAU = Math.PI * 2;
const ease = (u) => 1 - (1 - u) ** 3;
// past its life it holds its last frame: what it left stays
const held = (age, life) => (age >= 0 ? Math.min(age, life) / life : null);

/** Bits thrown up and out from (x, y), falling back under gravity: each
    gets (px, py, i, r) to draw itself. */
function thrown(x, y, u, n, size, r, draw, { up = 1, out = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.12 + r() * 0.76), sp = (20 + r() * 34) * size, side = r() < 0.5 ? -1 : 1;
    const px = x + Math.cos(a) * sp * u * 1.6 * side * out;
    const py = y - Math.sin(a) * sp * u * 2.2 * up + 60 * size * u * u;
    if (py > y + 2) continue;
    draw(px, py, i, r);
  }
}

/** A crater punched in dust: a dark bowl with a lit rim forms at once, the
    ejecta flies out in rays fanned upward and settles; the bowl stays.
    `blanket` lays a fresh pale apron round it, so it stands apart from the
    old craters of the place (Mars). */
export function crater(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), size = o.size ?? 1, r = rng(o.seed ?? 61);
  const R = 18 * size * ease(Math.min(1, u * 5)), dark = o.dark ?? (E.night ? '#3f3d3a' : '#5c5650'), lit = o.light ?? '#e2ddd4';
  g.save();
  if (o.blanket) { g.fillStyle = withAlpha(lit, 0.45); g.beginPath(); g.ellipse(x, y + 1, R * 2.4, R * 0.5, 0, 0, TAU); g.fill(); }
  // rays: short tapered wedges fanned up and out from the rim
  g.fillStyle = withAlpha(lit, 0.45 + 0.4 * (1 - u));
  for (let i = 0; i < 10; i++) {
    const s = i % 2 ? 1 : -1, a = (10 + r() * 25) * Math.PI / 180, L = R * (0.9 + r() * 0.9), bx = x + s * R * 0.85, by = y - R * 0.05;
    const tx = bx + s * Math.cos(a) * L, ty = by - Math.sin(a) * L * 0.6, nx = Math.sin(a) * R * 0.12, ny = Math.cos(a) * R * 0.12 * s;
    g.beginPath(); g.moveTo(bx - nx, by - ny); g.lineTo(tx, ty); g.lineTo(bx + nx, by + ny); g.closePath(); g.fill();
  }
  g.fillStyle = withAlpha(dark, 0.9); g.beginPath(); g.ellipse(x, y + 1, R, R * 0.3, 0, 0, TAU); g.fill();
  g.fillStyle = withAlpha('#000000', 0.25); g.beginPath(); g.ellipse(x + R * 0.15, y + 1.5, R * 0.75, R * 0.2, 0, 0, TAU); g.fill();
  // the raised rim: lit on its far side, shadowed in front
  g.strokeStyle = withAlpha(lit, 0.95); g.lineWidth = Math.max(1.6, R * 0.12); g.beginPath(); g.ellipse(x, y, R * 1.08, R * 0.33, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke();
  g.strokeStyle = withAlpha('#000000', 0.4); g.lineWidth = Math.max(1.2, R * 0.08); g.beginPath(); g.ellipse(x, y + 2, R * 1.08, R * 0.33, 0, 0.05 * Math.PI, 0.95 * Math.PI); g.stroke();
  const p = phaseOf(age, life);
  if (p != null) {
    thrown(x, y, ease(p), o.n ?? 30, size, r, (px, py) => {
      g.fillStyle = withAlpha(lit, 0.85 * (1 - p)); g.fillRect(px - 2, py - 2, 4, 4);
    }, { up: 1.2 });
    g.fillStyle = withAlpha(lit, 0.3 * (1 - p)); g.beginPath(); g.ellipse(x, y - 8 * size, R * (1 + p * 2), R * 0.6 * (1 + p), 0, 0, TAU); g.fill();
  }
  g.restore();
}

/** Snow thrown up where it lands: puffs shaded blue-grey beneath so they
    read on white, solid clods arcing out; a dent stays, its lip catching
    the light and its hollow in shadow. */
export function snowPuff(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const size = Math.max(1.4, o.size ?? 1), r = rng(o.seed ?? 67);
  g.save();
  g.fillStyle = 'rgba(120,145,175,0.55)'; g.beginPath(); g.ellipse(x, y + 2, 13 * size, 3.2 * size, 0, 0, Math.PI); g.fill();
  g.strokeStyle = 'rgba(90,115,145,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y + 1, 13 * size, 3.2 * size, 0, 0.1, Math.PI - 0.1); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, 14 * size, 3.6 * size, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  const p = phaseOf(age, life);
  if (p != null) {
    for (let i = 0; i < 8; i++) {
      const dx = (r() - 0.5) * 38 * size * ease(p), dy = -(6 + r() * 24) * size * ease(p), R = (6 + r() * 8) * size * (0.5 + p);
      const gr = g.createRadialGradient(x + dx - R * 0.35, y + dy - R * 0.35, 0, x + dx, y + dy, R);
      gr.addColorStop(0, `rgba(255,255,255,${0.95 * (1 - p)})`); gr.addColorStop(0.6, `rgba(230,238,246,${0.8 * (1 - p)})`); gr.addColorStop(1, `rgba(159,179,200,${0.5 * (1 - p)})`);
      g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, R, 0, TAU); g.fill();
    }
    thrown(x, y, ease(p), 14, size, r, (px, py) => {
      g.fillStyle = `rgba(214,226,238,${1 - p})`; g.beginPath(); g.arc(px, py, 2 * size, 0, TAU); g.fill();
      g.fillStyle = `rgba(255,255,255,${1 - p})`; g.beginPath(); g.arc(px - 0.5 * size, py - 0.5 * size, 1.3 * size, 0, TAU); g.fill();
    });
  }
  g.restore();
}

/** A divot: clods of turf and soil kicked up, and a bare brown scar left
    with a lip of torn turf. */
export function divot(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), size = Math.max(1.4, o.size ?? 1), r = rng(o.seed ?? 71);
  g.save();
  g.fillStyle = E.night ? '#3a2a20' : '#6e4e32'; g.beginPath(); g.ellipse(x + 4 * size, y + 1, 13 * size, 3.2 * size, 0, 0, TAU); g.fill();
  g.fillStyle = E.night ? '#2a1d16' : '#4f3622'; g.beginPath(); g.ellipse(x + 5 * size, y + 1.5, 9 * size, 2 * size, 0, 0, TAU); g.fill();
  g.strokeStyle = E.night ? '#3e5a2c' : '#5f8a3c'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x + 4 * size, y, 13.5 * size, 3.5 * size, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  const p = phaseOf(age, life);
  if (p != null) thrown(x, y, ease(p), 12, size, r, (px, py, i) => {
    g.save(); g.translate(px, py); g.rotate(p * 8 + i);
    g.fillStyle = withAlpha(E.night ? '#4a3626' : '#7a5636', 1 - p * 0.6); g.fillRect(-4 * size, -2 * size, 8 * size, 4 * size);
    g.fillStyle = withAlpha(E.night ? '#3e5a2c' : '#6d9a44', 1 - p * 0.6); g.fillRect(-4 * size, -3.2 * size, 8 * size, 1.8 * size);
    g.restore();
  }, { out: 1.3 });
  g.restore();
}

/** Sparks off metal or stone: bright streaks thrown out low and fast, with
    a hot glow at the point, gone in a moment. */
export function sparks(g, x, y, age, life, o = {}) {
  const p = phaseOf(age, life * 0.6); if (p == null) return;
  const size = o.size ?? 1, r = rng(o.seed ?? 73);
  g.save();
  const gl = g.createRadialGradient(x, y, 0, x, y, 26 * size);
  gl.addColorStop(0, `rgba(255,236,170,${0.8 * (1 - p)})`); gl.addColorStop(1, 'rgba(255,170,60,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(x, y, 26 * size, 0, TAU); g.fill();
  g.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * (0.05 + r() * 0.9), sp = (40 + r() * 60) * size, side = r() < 0.5 ? -1 : 1, e = ease(p);
    const ex = x + Math.cos(a) * sp * e * side, ey = y - Math.sin(a) * sp * 0.6 * e + 40 * size * p * p;
    const tx = x + Math.cos(a) * sp * Math.max(0, e - 0.12) * side, ty = y - Math.sin(a) * sp * 0.6 * Math.max(0, e - 0.12) + 40 * size * p * p * 0.8;
    if (ey > y + 1) continue;
    g.strokeStyle = `rgba(255,${200 + Math.round(r() * 50)},${120 + Math.round(r() * 80)},${1 - p})`; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(tx, Math.min(ty, y)); g.lineTo(ex, ey); g.stroke();
  }
  g.restore();
}

/** Confetti for a hit: paper squares bursting up and fluttering down. */
export function confetti(g, x, y, age, life, o = {}) {
  const p = phaseOf(age, life); if (p == null) return;
  const size = o.size ?? 1, r = rng(o.seed ?? 79);
  // saturated enough to show on grass and a pale sky alike
  const colours = ['#f2b705', '#2f7ec1', '#e0457b', '#2fa36b', '#8e5bd1', '#ffffff'];
  g.save();
  for (let i = 0; i < 46; i++) {
    const a = Math.PI * (0.25 + r() * 0.5), sp = (60 + r() * 90) * size, side = (r() - 0.5) * 2;
    // up fast, then drifting down slowly, swaying
    const rise = Math.min(p / 0.25, 1), fall = Math.max(0, p - 0.25);
    const px = x + Math.cos(a) * sp * side * ease(rise) + Math.sin(p * 12 + i) * 6 * fall;
    const py = y - Math.sin(a) * sp * ease(rise) + fall * fall * 110 * size;
    g.save(); g.translate(px, py); g.rotate(p * 14 + i); g.scale(1, Math.cos(p * 18 + i));
    g.fillStyle = withAlpha(colours[i % colours.length], 1 - Math.max(0, p - 0.7) / 0.3);
    g.fillRect(-2.5 * size, -1.6 * size, 5 * size, 3.2 * size);
    g.restore();
  }
  g.restore();
}

/** A smoke trail behind something flying: puffs left along its path at the
    times it passed, each swelling, drifting up and thinning with age.
    `at(t)` is where it was at t, in px; `t` is now. */
export function smokeTrail(g, at, t, o = {}) {
  if (!(t > 0)) return;
  const E = env(), dt = o.dt ?? 0.06, n = o.n ?? 26, size = o.size ?? 1, r = rng(o.seed ?? 83);
  g.save();
  for (let j = n; j >= 1; j--) {
    const tt = t - j * dt;
    if (tt < 0) { r(); continue; }
    // close together and overlapping, so the trail is one plume, not beads
    const q = at(tt), a = j / n, R = (4 + 11 * a) * size, jitter = (r() - 0.5) * 4 * a;
    // grey enough to read against a pale sky as well as a dark one
    const c = E.night ? '205,205,210' : '168,168,172';
    g.fillStyle = `rgba(${c},${0.65 * (1 - a) + 0.1})`;
    g.beginPath(); g.arc(q.x + jitter, q.y - 8 * a * size, R, 0, TAU); g.fill();
  }
  g.restore();
}

/** A splat: a water balloon bursting on dry ground — droplets thrown out low,
    shreds of its skin, and a dark wet patch spreading that stays. */
export function splat(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), size = o.size ?? 1, r = rng(o.seed ?? 89);
  g.save();
  const R = 26 * size * ease(Math.min(1, u * 3));
  g.fillStyle = withAlpha(E.night ? '#10161c' : '#2c3a44', 0.35); g.beginPath(); g.ellipse(x, y + 1, R, R * 0.2, 0, 0, TAU); g.fill();
  const p = phaseOf(age, life);
  if (p != null) {
    thrown(x, y, ease(p), 22, size, r, (px, py) => {
      g.fillStyle = `rgba(150,200,235,${0.9 * (1 - p)})`; g.beginPath(); g.ellipse(px, py, 2.2 * size, 1.6 * size, 0, 0, TAU); g.fill();
    }, { up: 0.6, out: 1.5 });
    g.fillStyle = withAlpha('#3d9bd6', 1 - p);
    for (let i = 0; i < 4; i++) { const a = r() * Math.PI, d = 10 * size * ease(p) * (0.5 + r()); g.beginPath(); g.ellipse(x + Math.cos(a) * d * (r() < 0.5 ? -1 : 1), y - 2, 3 * size, 1.4 * size, r(), 0, TAU); g.fill(); }
  }
  g.restore();
}

/** A crack: jagged lines running out across a hard surface from where it
    struck, flattened by the angle it is seen at; they stay. */
export function crack(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), size = o.size ?? 1, r = rng(o.seed ?? 97), grow = ease(Math.min(1, u * 4));
  g.save(); g.strokeStyle = withAlpha(E.night ? '#0c0c0e' : '#1d1b1c', 0.75); g.lineWidth = 1.3; g.lineJoin = 'round';
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU, L = (14 + r() * 22) * size * grow;
    let px = x, py = y + 1;
    g.beginPath(); g.moveTo(px, py);
    for (let j = 1; j <= 4; j++) { px = x + Math.cos(a + (r() - 0.5) * 0.5) * L * j / 4; py = y + 1 + Math.sin(a + (r() - 0.5) * 0.5) * L * 0.22 * j / 4; g.lineTo(px, py); }
    g.stroke();
  }
  const p = phaseOf(age, life * 0.5);
  if (p != null) { g.fillStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; g.beginPath(); g.ellipse(x, y, 10 * size * (1 + p), 3 * size * (1 + p), 0, 0, TAU); g.fill(); }
  g.restore();
}
