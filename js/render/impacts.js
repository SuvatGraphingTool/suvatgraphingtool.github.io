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
import { env, rng, softShadow } from './scenery.js';
import { phaseOf } from './effects.js';

const TAU = Math.PI * 2;
const ease = (u) => 1 - (1 - u) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;
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
  // a wet patch with a sheen on it, lighter than the ground so it shows
  g.fillStyle = withAlpha(E.night ? '#24323d' : '#3e5566', 0.4); g.beginPath(); g.ellipse(x, y + 1, R, R * 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = withAlpha('#d8ecf8', 0.45); g.beginPath(); g.ellipse(x - R * 0.2, y, R * 0.55, R * 0.07, 0, 0, TAU); g.fill();
  const p = phaseOf(age, life);
  if (p != null) {
    thrown(x, y, ease(p), 22, size, r, (px, py) => {
      g.fillStyle = `rgba(150,200,235,${0.95 * (1 - p)})`; g.beginPath(); g.ellipse(px, py, 3.2 * size, 2.4 * size, 0, 0, TAU); g.fill();
    }, { up: 0.6, out: 1.5 });
    g.fillStyle = withAlpha('#3d9bd6', 1 - p);
    for (let i = 0; i < 4; i++) { const a = r() * Math.PI, d = 10 * size * ease(p) * (0.5 + r()); g.beginPath(); g.ellipse(x + Math.cos(a) * d * (r() < 0.5 ? -1 : 1), y - 2, 3 * size, 1.4 * size, r(), 0, TAU); g.fill(); }
  }
  g.restore();
}

/** A crack: what strikes a hard surface leaves a light scuff on it (a
    phone's own screen is what cracks: props.js draws that). */
export function crack(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const size = o.size ?? 1, r = rng(o.seed ?? 97);
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
  for (let i = 0; i < 4; i++) { const a = (r() - 0.5) * 0.6 + (i % 2 ? Math.PI : 0), L = (6 + r() * 8) * size; g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + Math.cos(a) * L, y + 1 + Math.sin(a) * L * 0.2); g.stroke(); }
  const p = phaseOf(age, life * 0.5);
  if (p != null) { g.fillStyle = `rgba(255,255,255,${0.45 * (1 - p)})`; g.beginPath(); g.ellipse(x, y, 10 * size * (1 + p), 3 * size * (1 + p), 0, 0, TAU); g.fill(); }
  g.restore();
}

/** Leaves thrown up where it lands on a forest floor: a flurry of autumn
    leaves and bits of twig kicked up, each tumbling and fluttering down,
    swaying as it falls; a scatter of them stays round where it lies. */
export function leaves(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), size = Math.max(1.2, o.size ?? 1), r = rng(o.seed ?? 101);
  // yellows and olives, clear of the velocity's orange
  const cols = E.night ? ['#8a7a3a', '#6a6a30', '#5c6230', '#8a8040'] : ['#e6c23a', '#a8a83a', '#f0d454', '#7f8a32', '#d4b03a'];
  const leaf = (px, py, a, s, c, alpha) => {
    g.save(); g.translate(px, py); g.rotate(a); g.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(a * 1.7)));
    g.fillStyle = withAlpha(c, alpha); g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.75, s, 0); g.quadraticCurveTo(0, s * 0.75, -s, 0); g.fill();
    g.strokeStyle = withAlpha('#3a2614', alpha * 0.5); g.lineWidth = 0.7; g.beginPath(); g.moveTo(-s, 0); g.lineTo(s * 0.9, 0); g.stroke();
    g.restore();
  };
  g.save();
  // what stays: leaves lying flat in a loose ring, pushed out from where it struck
  g.fillStyle = withAlpha('#000000', 0.18); g.beginPath(); g.ellipse(x, y + 2, 22 * size * ease(Math.min(1, u * 4)), 3 * size, 0, 0, TAU); g.fill();
  for (let i = 0; i < 11; i++) { const d = (6 + r() * 16) * size * ease(Math.min(1, u * 4)), s = (r() < 0.5 ? -1 : 1); leaf(x + s * d, y + 1 + r() * 2, r() * 0.6 - 0.3, 3.8 * size, cols[i % cols.length], 1); }
  const p = phaseOf(age, life);
  if (p != null) {
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * (0.2 + r() * 0.6), sp = (14 + r() * 16) * size, side = r() < 0.5 ? -1 : 1;
      // up quickly, then drifting down slowly, side to side, as a leaf does
      const rise = Math.min(1, p / 0.3), fall = Math.max(0, p - 0.3);
      const px = x + side * Math.cos(a) * sp * ease(rise) + Math.sin(p * 9 + i) * 7 * size * fall;
      const py = y - Math.sin(a) * sp * ease(rise) + fall * fall * 40 * size;
      if (py > y) continue;
      leaf(px, py, p * 6 * (i % 2 ? 1 : -1) + i, (3.6 + r() * 2) * size, cols[i % cols.length], 1 - Math.max(0, p - 0.75) / 0.25);
    }
    g.strokeStyle = withAlpha(E.night ? '#4a3a2a' : '#6a4a2c', 1 - p); g.lineWidth = 1.2;
    thrown(x, y, ease(p), 6, size, r, (px, py, i) => { g.beginPath(); g.moveTo(px - 3 * size, py); g.lineTo(px + 3 * size, py - (i % 2 ? 2 : -2)); g.stroke(); });
  }
  g.restore();
}

/** Sand sprayed up where it lands in a desert: a fan of grains thrown out
    low, a golden cloud billowing and settling; a dent stays, its rim lit
    on the far side and its hollow in shadow. */
export function sandSpray(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), size = Math.max(1.3, o.size ?? 1), r = rng(o.seed ?? 103);
  const grain = E.night ? '#a08868' : '#c99a5c', deep = E.night ? '#5e4a3a' : '#8f6434', cloud = E.night ? '#8a7860' : '#b8946a';
  g.save();
  const R = 15 * size * ease(Math.min(1, u * 5));
  g.fillStyle = withAlpha(deep, 0.75); g.beginPath(); g.ellipse(x, y + 1.5, R, R * 0.24, 0, 0, TAU); g.fill();
  g.strokeStyle = withAlpha(E.night ? '#c8b08a' : '#fff0c8', 0.9); g.lineWidth = Math.max(1.4, R * 0.1); g.beginPath(); g.ellipse(x, y, R * 1.1, R * 0.28, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  // little heaps thrown up either side of the dent
  g.fillStyle = withAlpha(deep, 0.6);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * R * 0.9, y + 1); g.quadraticCurveTo(x + s * R * 1.4, y - R * 0.3, x + s * R * 2, y + 1); g.closePath(); g.fill(); }
  const p = phaseOf(age, life);
  if (p != null) {
    // the cloud: billows that swell, rise a little and thin, drifting
    // downwind, each shadowed beneath and pale on top so it stands off the sand
    const puffs = []; for (let i = 0; i < 7; i++) puffs.push({ dx: (r() - 0.3) * 40 * size * ease(p), dy: -(4 + r() * 16) * size * ease(p), R: (7 + r() * 9) * size * (0.5 + p * 1.2) });
    for (const q of puffs) { g.fillStyle = withAlpha(E.night ? '#2a2018' : '#7a5a34', 0.3 * (1 - p)); g.beginPath(); g.arc(x + q.dx + 2, y + q.dy + q.R * 0.25, q.R, 0, TAU); g.fill(); }
    for (const q of puffs) {
      const gr = g.createRadialGradient(x + q.dx - q.R * 0.3, y + q.dy - q.R * 0.3, 0, x + q.dx, y + q.dy, q.R);
      gr.addColorStop(0, withAlpha(E.night ? '#c8b08a' : '#fbf0d6', 0.9 * (1 - p))); gr.addColorStop(0.7, withAlpha(cloud, 0.7 * (1 - p))); gr.addColorStop(1, withAlpha(cloud, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x + q.dx, y + q.dy, q.R, 0, TAU); g.fill();
    }
    // grains in a low fan, as dots, dark and light
    thrown(x, y, ease(p), 40, size, r, (px, py, i) => {
      g.fillStyle = withAlpha(i % 3 ? deep : '#fff2d0', 0.95 * (1 - p)); g.beginPath(); g.arc(px, py, 1.5 * Math.sqrt(size), 0, TAU); g.fill();
    }, { up: 0.75, out: 1.4 });
  }
  g.restore();
}

/** Mud where it lands on a building site: thick brown clots thrown out and
    slapping down, a crown of wet mud round the hole; a puddled dent stays,
    a sheen of water on it. */
export function mud(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), size = Math.max(1.3, o.size ?? 1), r = rng(o.seed ?? 107);
  // wet and dark, darker than the site's dry ground, with a sheen
  const wet = E.night ? '#1e1610' : '#2e1e12', clot = E.night ? '#2a1e14' : '#3e2a1a';
  g.save();
  const R = 14 * size * ease(Math.min(1, u * 5));
  g.fillStyle = withAlpha(wet, 0.95); g.beginPath(); g.ellipse(x, y + 1.5, R, R * 0.26, 0, 0, TAU); g.fill();
  g.fillStyle = withAlpha(E.night ? '#8fa0b0' : '#c9d6de', 0.45); g.beginPath(); g.ellipse(x - R * 0.25, y + 1, R * 0.45, R * 0.06, 0, 0, TAU); g.fill();
  // spatters left on the ground round it
  g.fillStyle = withAlpha(clot, 0.9);
  for (let i = 0; i < 7; i++) { const d = (R + 4 + r() * 18 * size) * (r() < 0.5 ? -1 : 1); g.beginPath(); g.ellipse(x + d * ease(Math.min(1, u * 3)), y + 1, (1.5 + r() * 2.5) * size, 1 * size, 0, 0, TAU); g.fill(); }
  const p = phaseOf(age, life);
  if (p != null) {
    // the crown: a ring of wet mud flung up round the hole, falling back
    const c = Math.sin(Math.min(1, p * 1.6) * Math.PI);
    g.fillStyle = withAlpha(clot, 0.95 * (1 - p));
    for (let i = 0; i < 9; i++) {
      const s = (i / 8 - 0.5) * 2, hgt = (8 + r() * 8) * size * c, bx = x + s * R * 1.05;
      g.beginPath(); g.moveTo(bx - 2.2 * size, y); g.quadraticCurveTo(bx + s * 3 * size, y - hgt * 0.6, bx + s * 4 * size, y - hgt); g.lineTo(bx + 2.2 * size, y); g.closePath(); g.fill();
      g.beginPath(); g.arc(bx + s * 4 * size, y - hgt, 1.8 * size, 0, TAU); g.fill();
    }
    // clots arcing out, heavy and dark
    thrown(x, y, ease(p), 16, size, r, (px, py, i) => {
      g.fillStyle = withAlpha(i % 2 ? clot : wet, 1 - p * 0.5);
      g.beginPath(); g.ellipse(px, py, (2.4 + (i % 3)) * size, (1.8 + (i % 2)) * size, i, 0, TAU); g.fill();
      g.fillStyle = withAlpha('#ffffff', 0.35 * (1 - p)); g.beginPath(); g.arc(px - size, py - size, 0.8 * size, 0, TAU); g.fill();
    }, { up: 0.9 });
  }
  g.restore();
}

/** A firework's burst at the top of its flight: a white flash, then shells
    of stars flung out in rings, each with its streak, drooping as they
    fall and fading; a few crackle on after. Gold, rose, sky and green:
    clear of the three quantity hues. */
export function burst(g, x, y, age, life, o = {}) {
  const u = phaseOf(age, life); if (u == null) return;
  const size = o.size ?? 1, rb = rng(o.seed ?? 5), R = 110 * size * (1 - (1 - u) ** 2.4), night = env().night;
  // by day, deeper tones that hold against a pale sky
  const cols = night ? ['#ffd84d', '#ff7aa2', '#7cc8ff', '#8ff0a0', '#ffffff'] : ['#f2b705', '#e0457b', '#2f8fd6', '#2fae5b', '#f2b705'];
  g.save();
  if (u < 0.3) {
    const a = 1 - u / 0.3, gr = g.createRadialGradient(x, y, 0, x, y, 46 * size);
    gr.addColorStop(0, `rgba(255,252,240,${0.95 * a})`); gr.addColorStop(0.4, `rgba(255,236,190,${0.45 * a})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, 46 * size, 0, TAU); g.fill();
  }
  g.lineCap = 'round';
  for (const [shell, n, sz] of [[1, 48, 2.8], [0.64, 30, 2.4], [0.34, 16, 2]]) for (let i = 0; i < n; i++) {
    const an = (i / n) * TAU + rb() * 0.1, rr = R * shell * (0.85 + rb() * 0.25), sag = u * u * 46 * size * shell;
    const sx = x + Math.cos(an) * rr, sy = y + Math.sin(an) * rr + sag, c = cols[(i + Math.round(shell * 10)) % cols.length];
    g.strokeStyle = withAlpha(c, 0.55 * (1 - u)); g.lineWidth = sz * 0.6;
    g.beginPath(); g.moveTo(x + Math.cos(an) * rr * 0.72, y + Math.sin(an) * rr * 0.72 + sag * 0.6); g.lineTo(sx, sy); g.stroke();
    // late in its life a star twinkles before it goes
    const tw = u > 0.6 ? 0.5 + 0.5 * Math.sin(u * 60 + i * 2.3) : 1;
    g.fillStyle = withAlpha(c, (1 - u) * tw); g.beginPath(); g.arc(sx, sy, sz * size ** 0.6, 0, TAU); g.fill();
  }
  g.restore();
}

/** A goal seen side on at G = { x, back, bar, y }: the front post at x up to
    the crossbar at `bar`, the net's roof sloping back and down to the
    ground at `back`, its mesh drawn in. Once it is struck (age ≥ 0) the back
    of the net bulges out where the ball meets it and swings back, settling. */
export function goal(g, G, age = -1, life = 1, o = {}) {
  const E = env(), { x, back, bar, y } = G, H = y - bar;
  const p = age >= 0 ? Math.min(1, age / life) : null;
  // the bulge: out fast, back past and settling, as a net does
  // (over about half a second: out, back past, and still — slow enough to be seen)
  const q = age >= 0 ? age / 0.6 : null;
  const b = q == null ? 0 : Math.exp(-q * 2) * Math.sin(q * 6) * (o.size ?? 1) * Math.min(22, (back - x) * 0.6);
  const top = { x: x + (back - x) * 0.35, y: bar + H * 0.05 }, low = y - H * 0.35;
  const backAt = (t) => { const yy = lerp(top.y, y, t), d = Math.exp(-(((yy - low) / (H * 0.3)) ** 2)); return { x: lerp(top.x, back, t) + b * d, y: yy }; };
  g.save();
  // the mesh: lines from the bar back over the roof and down the back
  g.strokeStyle = withAlpha(E.night ? '#d8dce0' : '#ffffff', 0.7); g.lineWidth = 0.8;
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n, q = backAt(t);
    g.beginPath(); g.moveTo(x, lerp(bar, y, t)); g.lineTo(q.x, q.y); g.stroke();
  }
  g.beginPath(); g.moveTo(x, bar); g.lineTo(top.x, top.y);
  for (let i = 0; i <= 12; i++) { const q = backAt(i / 12); g.lineTo(q.x, q.y); }
  g.stroke();
  for (let i = 1; i < 4; i++) {
    const f = i / 4; g.beginPath(); g.moveTo(lerp(x, top.x, f), lerp(bar, top.y, f));
    for (let j = 1; j <= 8; j++) { const q = backAt(j / 8); g.lineTo(lerp(x + (q.x - x) * 0.0, q.x, f), lerp(lerp(bar, y, j / 8), q.y, f)); }
    g.stroke();
  }
  // the frame: white posts, round, lit on the left; the stanchion at the back
  const pw = Math.max(2.5, H * 0.05);
  g.fillStyle = E.night ? '#d6d8dc' : '#ffffff'; g.fillRect(x - pw / 2, bar, pw, H); g.fillRect(x - pw / 2, bar - pw / 2, Math.max(pw, (back - x) * 0.12), pw);
  g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(x + pw * 0.15, bar, pw * 0.35, H);
  g.strokeStyle = withAlpha(E.night ? '#b8bcc2' : '#e8eaec', 0.9); g.lineWidth = 1.4; g.beginPath(); g.moveTo(top.x, top.y); g.lineTo(back, y); g.stroke();
  softShadow(g, (x + back) / 2, y + 1, (back - x) * 0.6, 3, 0.5);
  g.restore();
}

/** A vehicle landing hard on dry ground and braking: two black tyre marks
    laid on the ground behind where it comes down, which stay, and tyre
    smoke billowing from the wheels, drifting back and thinning. `L` is the
    vehicle's drawn length; it lands centred on x. */
export function skid(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), L = o.L ?? 60, r = rng(o.seed ?? 109);
  g.save();
  // the marks: rubber laid from where the wheels touched, darker where they bit
  const len = L * 0.9 * ease(Math.min(1, u * 3));
  // (wide and near-black, each edged with a pale line of rubber dust so it
  // shows on tarmac as well as on grass)
  for (const [dy, a] of [[2, 0.9], [6, 0.6]]) {
    const gr = g.createLinearGradient(x - L * 0.5 - len, 0, x + L * 0.4, 0);
    gr.addColorStop(0, withAlpha('#050505', 0)); gr.addColorStop(0.3, withAlpha('#050505', a * 0.7)); gr.addColorStop(1, withAlpha('#050505', a));
    g.fillStyle = gr; g.fillRect(x - L * 0.5 - len, y + dy - 1.5, len + L * 0.9, 3.5);
    g.fillStyle = withAlpha('#d8d4cc', 0.35 * a); g.fillRect(x - L * 0.5 - len * 0.7, y + dy - 2.5, len * 0.7 + L * 0.9, 1);
  }
  const p = phaseOf(age, life);
  if (p != null) {
    // the smoke: puffs from each wheel, swelling, rising a little, drifting back
    const c = E.night ? '200,200,206' : '225,225,228', edge = E.night ? '120,120,128' : '150,150,156';
    for (const wx of [x - L * 0.32, x + L * 0.3]) for (let i = 0; i < 6; i++) {
      const R = (L * 0.08 + r() * L * 0.08) * (0.6 + p * 1.6), dx = -p * L * (0.5 + r() * 0.6), dy = -p * L * (0.1 + r() * 0.2) - R * 0.3;
      const gr = g.createRadialGradient(wx + dx - R * 0.3, y + dy - R * 0.3, 0, wx + dx, y + dy, R);
      gr.addColorStop(0, `rgba(${c},${0.85 * (1 - p)})`); gr.addColorStop(0.7, `rgba(${c},${0.55 * (1 - p)})`); gr.addColorStop(1, `rgba(${edge},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(wx + dx, y + dy, R, 0, TAU); g.fill();
    }
  }
  g.restore();
}

/** Something heavy gone under the water: it sinks away from the surface,
    fading, and a stream of bubbles rises where it went in, each wobbling
    and swelling a little as it comes up, bursting at the surface. */
export function bubbles(g, x, y, age, life, o = {}) {
  const p = phaseOf(age, life); if (p == null) return;
  const size = o.size ?? 1, depth = o.depth ?? 60, r = rng(o.seed ?? 113);
  g.save();
  // what sank: a dim shape going down
  g.fillStyle = `rgba(30,40,48,${0.5 * (1 - p)})`; g.beginPath(); g.ellipse(x + Math.sin(p * 6) * 3, y + 6 + depth * ease(p), 5 * size, 4 * size, 0, 0, TAU); g.fill();
  for (let i = 0; i < 14; i++) {
    const t0 = r() * 0.6, q = (p - t0) / 0.4; if (q < 0 || q > 1) { r(); r(); continue; }
    const R = (1.5 + r() * 2.2) * size * (0.7 + q * 0.5), bx = x + (r() - 0.5) * 10 * size + Math.sin(q * 9 + i) * 2.5, by = y + 4 + depth * (1 - q) * 0.8;
    g.strokeStyle = `rgba(235,245,250,${0.9 * (1 - q * 0.4)})`; g.lineWidth = 1.1; g.beginPath(); g.arc(bx, by, R, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(bx - R * 0.35, by - R * 0.35, R * 0.3, 0, TAU); g.fill();
  }
  g.restore();
}

/** A diving catch: a fielder launches from beyond where it comes down,
    body stretched out flat, arms reaching, and takes it in both hands just
    above the ground; they land on their front and hold it up. H is the
    fielder's drawn height. */
export function diveCatch(g, x, y, age, life, o = {}) {
  const u = held(age, life); if (u == null) return;
  const E = env(), H = o.H ?? 60, shirt = o.shirt ?? (E.night ? '#6c7f9a' : '#f4f1ea'), skin = E.night ? '#b08a74' : '#d9a988';
  // in the air for the first part, flat on the ground after
  const fly = Math.min(1, u / 0.3), lift = Math.sin(Math.min(1, fly) * Math.PI) * H * 0.25, slide = (1 - ease(fly)) * H * 0.9;
  const hands = { x: x + 2, y: y - 4 - lift * 0.3 }, ang = -0.15 * (1 - fly);
  g.save(); g.translate(hands.x + slide, hands.y - lift); g.rotate(ang);
  // body from the hands back: arms, head, torso, legs trailing
  const L = H * 1.05;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = '#2f3340'; g.lineWidth = H * 0.085; g.beginPath(); g.moveTo(L * 0.62, -H * 0.05); g.lineTo(L * 0.85, -H * 0.02); g.lineTo(L * 1.02, -H * 0.06 - (1 - fly) * H * 0.1); g.stroke();
  g.strokeStyle = shirt; g.lineWidth = H * 0.16; g.beginPath(); g.moveTo(L * 0.25, -H * 0.06); g.lineTo(L * 0.62, -H * 0.05); g.stroke();
  g.strokeStyle = skin; g.lineWidth = H * 0.055; g.beginPath(); g.moveTo(L * 0.28, -H * 0.08); g.lineTo(0, 0); g.stroke();
  g.fillStyle = skin; g.beginPath(); g.arc(L * 0.18, -H * 0.13, H * 0.075, 0, TAU); g.fill();
  g.fillStyle = '#3a2c26'; g.beginPath(); g.arc(L * 0.2, -H * 0.15, H * 0.075, Math.PI * 1.1, Math.PI * 2.1); g.fill();
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(L * 1.02, -H * 0.05 - (1 - fly) * H * 0.1, H * 0.04, 0, TAU); g.fill();
  g.restore();
  // the dust of the landing, once down
  const p = phaseOf(age - life * 0.3, life * 0.5);
  if (p != null) { g.fillStyle = `rgba(200,190,170,${0.5 * (1 - p)})`; g.beginPath(); g.ellipse(x + H * 0.5, y + 1, H * 0.6 * (0.6 + p), H * 0.08, 0, 0, TAU); g.fill(); }
}
