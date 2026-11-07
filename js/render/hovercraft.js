// hovercraft.js — the stage for a particle moved by one constant force, in i
// and j: a model hovercraft on a frozen lake, seen from above.
//
// A frozen lake is as near as the world comes to the paper's "smooth
// horizontal plane", and a model hovercraft riding on its cushion of air is as
// near as it comes to a particle moved by one constant force: its fan is held
// pointing one way, so it pushes the same way however the craft is moving.
// The craft's nose is the force's direction, the fan at its tail blowing the
// other way; the force is drawn from it in ink, a force and not one of the
// three quantities (rule 2), and the motion — the path, position, velocity
// and the moments asked — is the plane's own stage (js/render/vectors.js),
// so everything a motion in i and j shows is shown the same way here.
//
// Everything drawn is read from js/core/force.js (rule 4).

import { drawPlane } from './vectors.js';
import { env, rng, softShadow } from './scenery.js';
import { arrow, withAlpha } from './util.js';
import { T } from '../notation.js';
import { vsrc } from '../core/plane.js';

const TAU = Math.PI * 2;
const clearOf = (pts, x, y) => pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);

/** A pine seen from above at (x, y), R px: a dark star of branches, snow on its tips, its shadow. */
export function pineAbove(g, x, y, R, seed = 5) {
  const E = env(), r = rng(seed), n = 9;
  g.save();
  g.fillStyle = withAlpha('#0b1a24', E.night ? 0.42 : 0.24);
  g.beginPath(); g.ellipse(x + R * 0.6, y + R * 0.45, R * 1.05, R * 0.7, 0.5, 0, TAU); g.fill();
  for (const [k, col] of [[1, E.night ? '#1f3328' : '#2f4a37'], [0.72, E.night ? '#2b4433' : '#3f6047'], [0.44, E.night ? '#365640' : '#527a5a']]) {
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + seed, rr = R * k * (i % 2 ? 0.55 : 1) * (0.9 + r() * 0.2);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath(); g.fill();
  }
  // snow caught on the branches
  g.fillStyle = withAlpha('#f4f8fb', E.night ? 0.55 : 0.85);
  for (let i = 0; i < 7; i++) {
    const a = r() * TAU, d = R * (0.3 + r() * 0.55);
    g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.2 + r() * 2, 1.4 + r(), a, 0, TAU); g.fill();
  }
  g.restore();
}

/**
 * A frozen lake from above, filling the box: the ice grey-blue and polished
 * where the wind has swept it, clear black ice in patches, white snow drifted
 * in long tongues, cracks running through it, old skate marks; a snowy shore
 * along the top and left edges with reeds and pines — kept off the motion
 * (`avoid`, px) and from under the readouts (`keep`).
 */
export function frozenLake(g, x, y, w, h, o = {}) {
  const E = env(), r = rng(o.seed ?? 59), avoid = o.avoid || [], keep = o.keep || [];
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const base = g.createLinearGradient(x, y, x + w, y + h);
  base.addColorStop(0, E.night ? '#3e4d59' : '#cfdde5'); base.addColorStop(0.55, E.night ? '#465864' : '#dfe9ee'); base.addColorStop(1, E.night ? '#364551' : '#c6d6df');
  g.fillStyle = base; g.fillRect(x, y, w, h);
  // clear black ice: darker, glassy patches
  for (let i = 0; i < Math.max(4, (w * h) / 60000); i++) {
    const cx = x + r() * w, cy = y + r() * h, R = 40 + r() * 110;
    const pg = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    pg.addColorStop(0, withAlpha(E.night ? '#1d2a35' : '#8fa9b8', 0.45)); pg.addColorStop(1, withAlpha(E.night ? '#1d2a35' : '#8fa9b8', 0));
    g.fillStyle = pg; g.beginPath(); g.ellipse(cx, cy, R, R * (0.45 + r() * 0.3), -0.35 + r() * 0.2, 0, TAU); g.fill();
  }
  // snow, drifted by the wind into long tongues
  for (let i = 0; i < Math.max(6, (w * h) / 32000); i++) {
    const cx = x + r() * w, cy = y + r() * h, L = 50 + r() * 140, H = 6 + r() * 14;
    const sg = g.createRadialGradient(cx, cy, 0, cx, cy, L);
    sg.addColorStop(0, withAlpha('#f6f9fb', E.night ? 0.22 : 0.62)); sg.addColorStop(1, withAlpha('#f6f9fb', 0));
    g.fillStyle = sg; g.beginPath(); g.ellipse(cx, cy, L, H, -0.32, 0, TAU); g.fill();
  }
  // cracks: thin lines that wander and branch, a dark side and a lit side
  for (let i = 0; i < Math.max(3, (w * h) / 90000); i++) {
    let cx = x + r() * w, cy = y + r() * h, a = r() * TAU;
    const pts = [{ x: cx, y: cy }];
    for (let k = 0; k < 9; k++) { a += (r() - 0.5) * 0.9; cx += Math.cos(a) * (14 + r() * 22); cy += Math.sin(a) * (14 + r() * 22); pts.push({ x: cx, y: cy }); }
    for (const [dx, col, al] of [[0.8, '#ffffff', E.night ? 0.18 : 0.7], [0, E.night ? '#16212a' : '#6f8796', E.night ? 0.55 : 0.5]]) {
      g.strokeStyle = withAlpha(col, al); g.lineWidth = 1; g.beginPath();
      pts.forEach((p, j) => (j ? g.lineTo(p.x + dx, p.y + dx) : g.moveTo(p.x + dx, p.y + dx)));
      g.stroke();
      // a short branch from the middle
      const m = pts[4], b = a + 1.1;
      g.beginPath(); g.moveTo(m.x + dx, m.y + dx); g.lineTo(m.x + dx + Math.cos(b) * 26, m.y + dx + Math.sin(b) * 26); g.stroke();
    }
  }
  // old skate marks: long faint arcs
  g.strokeStyle = withAlpha(E.night ? '#c9d6de' : '#ffffff', E.night ? 0.08 : 0.5); g.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const cx = x + r() * w, cy = y + r() * h, R = 60 + r() * 160, a0 = r() * TAU;
    g.beginPath(); g.arc(cx, cy, R, a0, a0 + 0.5 + r() * 0.6); g.stroke();
  }
  // the shore: snow along the top and the left, its edge a little ragged, reeds at the waterline
  const band = Math.max(26, Math.min(w, h) * 0.07);
  const edge = (horiz) => {
    g.beginPath();
    if (horiz) { g.moveTo(x, y); for (let xx = x; xx <= x + w + 20; xx += 20) g.lineTo(xx, y + band * (0.7 + 0.35 * Math.sin(xx * 0.013 + 1) + r() * 0.12)); g.lineTo(x + w, y); }
    else { g.moveTo(x, y); for (let yy = y; yy <= y + h + 20; yy += 20) g.lineTo(x + band * (0.6 + 0.35 * Math.sin(yy * 0.017) + r() * 0.12), yy); g.lineTo(x, y + h); }
    g.closePath();
  };
  // only where nothing passes: a shore the motion crosses is left out
  const passes = (horiz) => avoid.some((p) => (horiz ? p.y < y + band * 1.4 : p.x < x + band * 1.4));
  for (const horiz of [true, false]) {
    if (passes(horiz)) continue;
    edge(horiz);
    g.fillStyle = E.night ? '#5d6770' : '#f3f6f8'; g.fill();
    g.strokeStyle = withAlpha(E.night ? '#202a32' : '#8ea3b0', 0.6); g.lineWidth = 2; g.stroke();
    // reeds poking through the snow at the waterline
    g.strokeStyle = withAlpha(E.night ? '#8a7a55' : '#9c8656', 0.85); g.lineWidth = 1.2; g.beginPath();
    for (let k = 0; k < (horiz ? w : h) / 9; k++) {
      const s = r() * (horiz ? w : h), bx = horiz ? x + s : x + band * 0.9, by = horiz ? y + band * 0.95 : y + s;
      if (keep.some((b) => bx > b.x - 6 && bx < b.x + b.w + 6 && by > b.y - 6 && by < b.y + b.h + 6)) continue;
      g.moveTo(bx, by); g.lineTo(bx + (r() - 0.5) * 3, by - 5 - r() * 6);
    }
    g.stroke();
  }
  // pines on the shore, where nothing passes and nothing is read
  const placed = [];
  for (let tries = 0; tries < 90 && placed.length < 7; tries++) {
    const top = r() < 0.5, u = r(), R = 13 + r() * 10;
    if (passes(top)) continue;
    const tx = top ? x + u * w : x + band * (0.15 + r() * 0.4), ty = top ? y + band * (0.15 + r() * 0.4) : y + u * h;
    if (clearOf(avoid, tx, ty) < R + 40) continue;
    if (placed.some((p) => Math.hypot(p.x - tx, p.y - ty) < (p.R + R) * 1.25)) continue;
    if (keep.some((b) => tx > b.x - R && tx < b.x + b.w + R && ty > b.y - R && ty < b.y + b.h + R)) continue;
    placed.push({ x: tx, y: ty, R });
  }
  for (const p of placed) pineAbove(g, p.x, p.y, p.R, Math.round(p.x * 7 + p.y));
  // the low winter sun from the lower left, a glare across the ice
  const lg = g.createRadialGradient(x + w * 0.2, y + h * 0.95, 0, x + w * 0.2, y + h * 0.95, Math.hypot(w, h) * 0.8);
  lg.addColorStop(0, E.night ? 'rgba(255,210,180,0.10)' : 'rgba(255,248,232,0.35)'); lg.addColorStop(0.6, 'rgba(255,255,255,0)');
  g.fillStyle = lg; g.fillRect(x, y, w, h);
  g.restore();
}

/**
 * A model hovercraft from above at (x, y), `L` px long, its nose at angle
 * `ang` (radians, screen): the black skirt, the hull, a cockpit, the duct at
 * the tail with its fan turning (`spin`, radians) and the air it throws back.
 */
export function hovercraftTop(g, x, y, L, ang, { spin = 0, blowing = true } = {}) {
  const E = env(), W = L * 0.62;
  softShadow(g, x + 5, y + 8, L * 0.55, W * 0.4);
  g.save(); g.translate(x, y); g.rotate(ang);
  // the air thrown back from the fan: faint streaks behind the tail
  if (blowing) {
    g.strokeStyle = withAlpha('#ffffff', E.night ? 0.28 : 0.75); g.lineWidth = 1.4; g.lineCap = 'round';
    for (let k = -2; k <= 2; k++) {
      const off = ((spin * 3 + k * 7) % 14 + 14) % 14;
      g.beginPath(); g.moveTo(-L * 0.62 - off, k * W * 0.1); g.lineTo(-L * 0.62 - off - 8 - Math.abs(k) * 2, k * W * 0.16); g.stroke();
    }
  }
  // the skirt
  const rr = (hw, hh, rad) => { g.beginPath(); g.roundRect(-hw, -hh, hw * 2, hh * 2, rad); };
  rr(L * 0.5, W * 0.5, W * 0.42); g.fillStyle = '#1d1f23'; g.fill();
  // the hull, a pointed bow
  g.beginPath();
  g.moveTo(L * 0.46, 0); g.quadraticCurveTo(L * 0.42, -W * 0.38, L * 0.1, -W * 0.4); g.lineTo(-L * 0.42, -W * 0.38);
  g.lineTo(-L * 0.42, W * 0.38); g.lineTo(L * 0.1, W * 0.4); g.quadraticCurveTo(L * 0.42, W * 0.38, L * 0.46, 0); g.closePath();
  const hg = g.createLinearGradient(0, -W * 0.4, 0, W * 0.4);
  hg.addColorStop(0, '#4f7fb0'); hg.addColorStop(0.5, '#2f5d8a'); hg.addColorStop(1, '#22476d');
  g.fillStyle = hg; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.stroke();
  // a white stripe down the deck and the cockpit's canopy
  g.fillStyle = '#eef2f5'; g.fillRect(-L * 0.34, -W * 0.06, L * 0.6, W * 0.12);
  const cg = g.createRadialGradient(L * 0.1, -W * 0.08, 0, L * 0.12, 0, W * 0.3);
  cg.addColorStop(0, '#c8e2f2'); cg.addColorStop(1, '#2b3f52');
  g.fillStyle = cg; g.beginPath(); g.ellipse(L * 0.14, 0, L * 0.15, W * 0.2, 0, 0, TAU); g.fill();
  // the duct at the tail, and the fan in it
  const dx = -L * 0.33, dr = W * 0.34;
  g.fillStyle = '#2a2d33'; g.beginPath(); g.arc(dx, 0, dr, 0, TAU); g.fill();
  g.strokeStyle = '#9aa3ad'; g.lineWidth = 1.6; g.beginPath(); g.arc(dx, 0, dr - 1, 0, TAU); g.stroke();
  g.fillStyle = withAlpha('#c9d1d9', 0.75);
  for (let k = 0; k < 3; k++) {
    const a = spin + (k * TAU) / 3;
    g.beginPath(); g.ellipse(dx + Math.cos(a) * dr * 0.45, Math.sin(a) * dr * 0.45, dr * 0.5, dr * 0.18, a, 0, TAU); g.fill();
  }
  g.fillStyle = '#e8b13a'; g.beginPath(); g.arc(dx, 0, dr * 0.2, 0, TAU); g.fill();
  g.restore();
}

export function render(canvas, cam, o) {
  const f = o.traj;
  if (!f || f.kind !== 'force') return null;
  const Fv = f.force || f.a, an = Math.hypot(Fv.x, Fv.y);
  // the nose points along the force: the fan's thrust (screen y is down)
  const ang = an > 1e-9 ? Math.atan2(-Fv.y, Fv.x) : 0;
  return drawPlane(canvas, o, {
    bodyR: 22, compass: false,
    ground: (g, w, h, { avoid, keep }) => frozenLake(g, 0, 0, w, h, { avoid, keep }),
    body(g, x, y, s) {
      const L = s.phone ? 36 : 46;
      // the force, from the craft along its nose: ink, the same however it moves
      if (an > 1e-9) {
        const len = s.phone ? 46 : 58, ux = Fv.x / an, uy = -Fv.y / an;
        const x0 = x + ux * L * 0.5, y0 = y + uy * L * 0.5, x1 = x0 + ux * len, y1 = y0 + uy * len;
        arrow(g, x0, y0, x1, y1, { color: f.force ? s.P.ink : s.P.acc, width: 3, head: 13 });
        s.off([{ x: x0, y: y0 }, { x: x1, y: y1 }], 8);
        s.Q.add(f.force ? T`vec F = ${vsrc(f.force)} [N]` : T`vec a = ${vsrc(f.a)} [m s^-2]`, x1, y1, { color: f.force ? s.P.ink : s.P.acc, pri: 7, size: s.phone ? 13 : 14, weight: 700 });
      }
      hovercraftTop(g, x, y, L, ang, { spin: s.t * 40, blowing: an > 1e-9 });
    },
  });
}
