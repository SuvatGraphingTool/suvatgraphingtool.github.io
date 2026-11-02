// launchers.js — what sends a thing off, drawn at the launch point instead of
// a person: a cannon aimed along the launch angle, with its muzzle flash and
// smoke at the moment it fires; a ramp sloping up to the edge at the launch
// angle, for a car, a bike, a skier or a skateboarder; a catapult whose arm
// swings up and stops against its crossbar as it lets go.
//
// Each is `(g, x, y, s, P, { aim, t, fired, phase })`: the launch point at
// (x, y) on the surface it stands on, `s` px its size, `aim` the launch angle
// in degrees (up positive), `t` seconds since it was let go (negative before).
// The engine says where and when (rule 4); these only draw. Nothing here is a
// quantity.

import { env, rng, softShadow } from './scenery.js';
import { withAlpha, clamp } from './util.js';

const TAU = Math.PI * 2;
const ease = (u) => 1 - (1 - u) ** 3;

/** A cannon in its emplacement: the muzzle at (x, y), the launch point on
    the surface, aimed `aim` degrees up, poking over a wall of sandbags; the
    gun on its carriage, two spoked wheels and its trail, sits in a pit dug
    behind them. When it fires, it recoils, a flash at the muzzle and smoke
    rolling out and up. */
export function cannon(g, x, y, s, P, { aim = 30, t = -1, phase = 0, circus = false, gy: ground = y } = {}) {
  const E = env(), a = (Math.max(-30, Math.min(85, aim)) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const L = s, rB = s * 0.11, recoil = t >= 0 ? Math.sin(Math.min(1, t / 0.25) * Math.PI) * s * 0.08 : 0;
  const bx = x - ca * (L + recoil), by = y + sa * (L + recoil);
  const wR = s * 0.26, wx = bx + ca * L * 0.25, wy = by - sa * L * 0.25 + wR * 0.2, gy = wy + wR;
  // in a circus: a painted barrel on a wagon on the sawdust (no pit, no sandbags)
  if (circus) return circusCannon(g, x, y, s, { a, ca, sa, L, rB, recoil, t, E, ground });
  // the pit: earth cut away behind the sandbags, darker toward its floor
  const pg = g.createLinearGradient(0, y, 0, gy); pg.addColorStop(0, E.night ? '#2a221c' : '#6a5038'); pg.addColorStop(1, E.night ? '#1a1410' : '#3e2e20');
  g.fillStyle = pg; g.beginPath(); g.moveTo(x - s * 1.6, y); g.lineTo(x - s * 0.02, y); g.lineTo(x - s * 0.1, gy + 2); g.lineTo(x - s * 1.45, gy + 2); g.closePath(); g.fill();
  softShadow(g, wx, gy + 1, s * 0.6, s * 0.06, 0.9);
  // the trail: a wooden beam from the axle back to the ground
  g.strokeStyle = E.night ? '#4a3a2c' : '#6a4a2c'; g.lineWidth = s * 0.08; g.lineCap = 'round';
  g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx - s * 0.7, gy - s * 0.04); g.stroke();
  const bags = () => {
    // the sandbag wall in front of it, its top at the surface, the muzzle over it
    const bw = s * 0.22, bh = Math.max(5, s * 0.1);
    for (let row = 0, yy = y + rB * 1.6 + sa * s * 0.25; yy < gy; row++, yy += bh * 0.85) for (let j = 0; j < 2; j++) {
      const bx2 = x - s * 0.14 - j * bw * 0.9 + (row % 2) * bw * 0.45 - bw * 0.35;
      g.fillStyle = E.night ? '#6a6250' : '#c9b48a'; g.beginPath(); g.roundRect(bx2, yy, bw, bh, bh * 0.45); g.fill();
      g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; g.stroke();
      g.fillStyle = withAlpha('#ffffff', E.night ? 0.06 : 0.3); g.fillRect(bx2 + bw * 0.2, yy + 1, bw * 0.5, 1.2);
    }
  };
  // a spoked wheel on the axle
  g.strokeStyle = E.night ? '#6a5040' : '#8a6040'; g.lineWidth = Math.max(2, s * 0.04); g.beginPath(); g.arc(wx, wy, wR, 0, TAU); g.stroke();
  g.lineWidth = Math.max(1.2, s * 0.02); for (let i = 0; i < 8; i++) { const q = phase + (i / 8) * TAU; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.cos(q) * wR, wy + Math.sin(q) * wR); g.stroke(); }
  g.fillStyle = '#2a2c30'; g.beginPath(); g.arc(wx, wy, s * 0.04, 0, TAU); g.fill();
  bags();
  // the barrel over the parapet: dark iron, tapered, banded, lit along its top
  g.save(); g.translate(bx, by); g.rotate(-a);
  const gr = g.createLinearGradient(0, -rB, 0, rB); gr.addColorStop(0, '#6a6e76'); gr.addColorStop(0.35, '#3a3e44'); gr.addColorStop(1, '#16181c');
  g.fillStyle = gr; g.beginPath(); g.moveTo(-rB * 0.6, -rB * 1.1); g.lineTo(L, -rB * 0.75); g.lineTo(L, rB * 0.75); g.lineTo(-rB * 0.6, rB * 1.1); g.arc(-rB * 0.6, 0, rB * 1.1, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill();
  g.fillStyle = '#2a2c30'; for (const f of [0.2, 0.55, 0.96]) g.fillRect(L * f - 2, -rB * (1.1 - f * 0.35) - 1, 4, rB * 2 * (1.1 - f * 0.35) + 2);
  g.fillStyle = '#0a0a0c'; g.beginPath(); g.ellipse(L, 0, rB * 0.25, rB * 0.55, 0, 0, TAU); g.fill();
  g.restore();
  if (t >= 0) {
    // the flash: brief, white-gold at the muzzle
    const f = Math.max(0, 1 - t / 0.18);
    if (f > 0) { const R = s * 0.5 * (0.6 + (1 - f)); const fg = g.createRadialGradient(x, y, 0, x, y, R); fg.addColorStop(0, `rgba(255,250,225,${0.95 * f})`); fg.addColorStop(0.4, `rgba(255,214,120,${0.7 * f})`); fg.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = fg; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); }
    // the smoke: puffs rolling out along the bore and rising, greying, thinning
    const p = Math.min(1, t / 2.2), r = rng(7);
    if (p < 1) for (let i = 0; i < 9; i++) {
      const d = s * (0.2 + i * 0.12) * ease(Math.min(1, p * 2.5)), R = s * (0.12 + i * 0.03) * (0.6 + p * 1.6);
      const cx = x + ca * d + (r() - 0.5) * s * 0.1, cy = y - sa * d - p * s * 0.5 - (r() - 0.2) * s * 0.1;
      const sg = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      sg.addColorStop(0, `rgba(235,235,232,${0.8 * (1 - p)})`); sg.addColorStop(0.7, `rgba(200,200,198,${0.5 * (1 - p)})`); sg.addColorStop(1, 'rgba(160,160,160,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    }
  }
}

/** A ramp: a timber kicker on its frame rising to its lip at (x, y) at the
    launch angle, from the ground at gy behind it; slats across its deck. */
export function ramp(g, x, y, s, P, { aim = 20, gy = y } = {}) {
  const E = env(), a = (Math.max(2, Math.min(60, aim)) * Math.PI) / 180, rise = Math.max(4, gy - y);
  // its run: back from the lip at the slope's angle, down to its own foot
  const run = Math.max(rise / Math.tan(a), s * 0.6), x0 = x - run;
  const wood = E.night ? '#6a5040' : '#b08a5c', woodLo = E.night ? '#4a3830' : '#7a5636';
  // the frame under it: posts and a brace
  g.strokeStyle = woodLo; g.lineWidth = Math.max(2, s * 0.03);
  for (const f of [0.35, 0.7, 0.98]) { const px = x0 + run * f, py = gy - rise * f; g.beginPath(); g.moveTo(px, py); g.lineTo(px, gy); g.stroke(); }
  g.beginPath(); g.moveTo(x0 + run * 0.35, gy); g.lineTo(x - 2, y + 2); g.stroke();
  // the deck: a thick board up to the lip, lit along its top, slats across it
  const th = Math.max(4, s * 0.05);
  g.fillStyle = wood; g.beginPath(); g.moveTo(x0, gy); g.lineTo(x, y); g.lineTo(x, y + th); g.lineTo(x0 + th / Math.tan(a), gy); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#ffffff', E.night ? 0.12 : 0.4); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, gy); g.lineTo(x, y); g.stroke();
  g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; for (let f = 0.1; f < 1; f += 0.1) { const px = x0 + run * f, py = gy - rise * f; g.beginPath(); g.moveTo(px, py); g.lineTo(px + 1.5, py + th); g.stroke(); }
  // its lip, a metal edge
  g.fillStyle = '#8a9098'; g.fillRect(x - 3, y - 1, 4, th + 2);
  softShadow(g, x0 + run * 0.6, gy + 1, run * 0.6, 4, 0.6);
}

/** A catapult's geometry: its arm pivoted low at the front of its frame,
    cocked back and down when loaded (swing 0), thrown up and over to stop
    against the padded crossbar (swing 1) with its cup at the release point.
    On the ground it is sized so that point is the launch point (x, y). */
export function catapultArm(x, y, s, gy, swing = 0) {
  const L = clamp((gy - s * 0.18 - y) / 0.98, s * 0.45, s * 2.5), aR = (100 * Math.PI) / 180, a0 = (205 * Math.PI) / 180;
  const piv = { x: x + Math.cos(Math.PI - aR) * L, y: gy - s * 0.18 };
  const u = Math.max(0, Math.min(1, swing)), e = u < 1 ? 1 - (1 - u) ** 2.2 : 1, a = a0 + (aR - a0) * e;
  return { piv, L, a, aR, cup: { x: piv.x + Math.cos(a) * L, y: piv.y - Math.sin(a) * L } };
}

/** A catapult: a timber frame on wheels, uprights and a padded crossbar
    ahead of the pivot, the throwing arm and its cup; `swing` 0 loaded,
    1 thrown up against the crossbar. */
export function catapult(g, x, y, s, P, { gy = y, swing = 0 } = {}) {
  const E = env(), wood = E.night ? '#6a5040' : '#9a6e44', woodLo = E.night ? '#4a3830' : '#6a4a2c';
  const { piv, L, a, aR, cup } = catapultArm(x, y, s, gy, swing);
  softShadow(g, piv.x - s * 0.2, gy + 1, s * 0.6, s * 0.06, 0.9);
  // the base, its wheels
  g.fillStyle = woodLo; g.fillRect(piv.x - s * 0.75, gy - s * 0.1, s * 0.95, s * 0.08);
  for (const wx of [piv.x - s * 0.62, piv.x + 0.05 * s]) { g.fillStyle = '#2b2628'; g.beginPath(); g.arc(wx, gy - s * 0.04, s * 0.07, 0, TAU); g.fill(); g.fillStyle = '#8a9098'; g.beginPath(); g.arc(wx, gy - s * 0.04, s * 0.025, 0, TAU); g.fill(); }
  // the uprights ahead of the pivot and the crossbar where the arm stops, padded
  const bar = { x: piv.x + Math.cos(aR + 0.08) * L * 0.62, y: piv.y - Math.sin(aR + 0.08) * L * 0.62 };
  g.strokeStyle = wood; g.lineWidth = s * 0.06; g.lineCap = 'round';
  g.beginPath(); g.moveTo(piv.x - s * 0.08, gy - s * 0.1); g.lineTo(bar.x + s * 0.05, bar.y); g.lineTo(piv.x + s * 0.22, gy - s * 0.1); g.stroke();
  g.fillStyle = E.night ? '#5a4a3a' : '#c9b27a'; g.beginPath(); g.ellipse(bar.x + s * 0.03, bar.y, s * 0.07, s * 0.05, 0, 0, TAU); g.fill();
  // a brace back from the pivot to the rear of the base
  g.strokeStyle = woodLo; g.lineWidth = s * 0.04; g.beginPath(); g.moveTo(piv.x, piv.y); g.lineTo(piv.x - s * 0.7, gy - s * 0.1); g.stroke();
  // the arm and its cup at the end
  g.strokeStyle = wood; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(piv.x, piv.y); g.lineTo(cup.x, cup.y); g.stroke();
  g.fillStyle = woodLo; g.beginPath(); g.arc(cup.x, cup.y, s * 0.1, -a - Math.PI * 0.05, -a + Math.PI * 1.05, false); g.closePath(); g.fill();
  // the twisted rope at the pivot
  g.fillStyle = E.night ? '#8a7a5a' : '#c9a96a'; g.beginPath(); g.arc(piv.x, piv.y, s * 0.08, 0, TAU); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(piv.x + i * s * 0.025, piv.y - s * 0.07); g.lineTo(piv.x + i * s * 0.025 + s * 0.02, piv.y + s * 0.07); g.stroke(); }
}


/** A rifle on its shooting stand: the muzzle at (x, y), the launch point,
    aimed `aim` degrees; its stock back along the line of fire, a scope on
    top, resting on a tripod down to the surface it stands on (gy), or on a
    sandbag on the edge it fires over. When it fires, a flash at the muzzle,
    a puff of smoke, and the rifle kicks back. */
export function rifle(g, x, y, s, P, { aim = 0, t = -1, gy = y } = {}) {
  const E = env(), a = (Math.max(-45, Math.min(85, aim)) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const kick = t >= 0 ? Math.sin(Math.min(1, t / 0.12) * Math.PI) * s * 0.05 : 0;
  const L = s, bx = x - ca * kick, by = y + sa * kick;
  // where it rests: two thirds of the way back from the muzzle
  const rx = bx - ca * L * 0.45, ry = by + sa * L * 0.45 + s * 0.05;
  const metal = E.night ? '#4a4e56' : '#2e3136', wood = E.night ? '#4a3a2c' : '#6a4a2c';
  if (gy - ry > s * 0.12) {
    // the tripod, its legs splayed to the ground
    g.strokeStyle = E.night ? '#5a5e66' : '#3a3e44'; g.lineWidth = Math.max(1.6, s * 0.025); g.lineCap = 'round';
    for (const d of [-0.28, 0.05, 0.3]) { g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + d * s, gy); g.stroke(); }
    softShadow(g, rx, gy + 1, s * 0.35, s * 0.04, 0.7);
  } else {
    // a sandbag on the edge, the rifle laid over it
    g.fillStyle = E.night ? '#6a6250' : '#c9b48a'; g.beginPath(); g.roundRect(rx - s * 0.16, ry, s * 0.32, Math.max(6, s * 0.1), s * 0.05); g.fill();
    g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; g.stroke();
  }
  g.save(); g.translate(bx, by); g.rotate(-a);
  // the stock: wood, its butt and grip
  g.fillStyle = wood; g.beginPath(); g.moveTo(-L * 0.42, -s * 0.03); g.lineTo(-L, -s * 0.04); g.lineTo(-L, s * 0.09); g.lineTo(-L * 0.78, s * 0.05); g.lineTo(-L * 0.62, s * 0.1); g.lineTo(-L * 0.56, s * 0.04); g.lineTo(-L * 0.42, s * 0.04); g.closePath(); g.fill();
  g.fillStyle = withAlpha('#ffffff', 0.15); g.fillRect(-L * 0.98, -s * 0.035, L * 0.5, s * 0.015);
  // the action and the barrel to the muzzle, the scope on top
  g.fillStyle = metal; g.fillRect(-L * 0.45, -s * 0.035, L * 0.2, s * 0.07); g.fillRect(-L * 0.26, -s * 0.018, L * 0.26, s * 0.036);
  g.fillStyle = withAlpha('#ffffff', 0.25); g.fillRect(-L * 0.26, -s * 0.018, L * 0.26, s * 0.008);
  g.fillStyle = metal; g.beginPath(); g.roundRect(-L * 0.46, -s * 0.11, L * 0.3, s * 0.05, s * 0.02); g.fill();
  g.fillStyle = '#7ab4e0'; g.beginPath(); g.ellipse(-L * 0.16, -s * 0.085, s * 0.008, s * 0.022, 0, 0, TAU); g.fill();
  g.fillStyle = metal; g.fillRect(-L * 0.36, -s * 0.065, s * 0.02, s * 0.03); g.fillRect(-L * 0.24, -s * 0.065, s * 0.02, s * 0.03);
  g.fillStyle = '#b08a2a'; g.beginPath(); g.arc(-L * 0.4, s * 0.05, s * 0.02, 0, TAU); g.fill();
  g.restore();
  if (t >= 0) {
    // the flash, gone in a moment, then the smoke drifting off
    const f = Math.max(0, 1 - t / 0.1);
    if (f > 0) {
      const R = s * 0.22 * (0.6 + f * 0.6), gl = g.createRadialGradient(x, y, 0, x, y, R);
      gl.addColorStop(0, `rgba(255,252,220,${f})`); gl.addColorStop(0.5, `rgba(255,220,120,${0.7 * f})`); gl.addColorStop(1, 'rgba(255,200,90,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
    }
    const q = Math.min(1, t / 1.2);
    if (q < 1) for (let i = 0; i < 4; i++) {
      const d = s * (0.08 + i * 0.07) * ease(q), R = s * (0.05 + i * 0.02) * (0.6 + q), px = x + ca * d, py = y - sa * d - s * 0.1 * q * i * 0.3;
      g.fillStyle = withAlpha(E.night ? '#9a9aa0' : '#d8d8dc', 0.6 * (1 - q)); g.beginPath(); g.arc(px, py, R, 0, TAU); g.fill();
    }
  }
}


/** A garden hose: its spray gun at (x, y), the launch point, aimed `aim`
    degrees, held up on a stake (or laid over the edge it sprays from), the
    green hose looping down from it to the ground and away to its tap. The
    water itself is the figure (composed.js draws the jet along the engine's
    path). As it starts, the trigger's spray at the nozzle. */
export function hose(g, x, y, s, P, { aim = 30, t = -1, gy = y } = {}) {
  const E = env(), a = (Math.max(-60, Math.min(85, aim)) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  const green = E.night ? '#2e5a34' : '#3f8a46', greenLo = E.night ? '#1e3a22' : '#2a5e30';
  // the gun: nozzle, barrel back along the aim, the grip and trigger down from it
  const bx = x - ca * s * 0.32, by = y + sa * s * 0.32;
  const grip = { x: bx - ca * s * 0.02 + sa * s * 0.04, y: by + sa * s * 0.02 + ca * s * 0.04 }, gripEnd = { x: grip.x - ca * s * 0.06 + sa * s * 0.18, y: grip.y + sa * s * 0.06 + ca * s * 0.18 };
  // held up off the ground on a stake, or laid on the top it sprays from
  const staked = gy - gripEnd.y > s * 0.1, lowY = staked ? gy : y + s * 0.02;
  // the hose: from the grip's foot in a loop down, then back along the ground (on a raised top,
  // only a short run and its coil, kept to the top)
  const run = staked ? s * 3 : s * 0.55;
  g.strokeStyle = greenLo; g.lineWidth = Math.max(3, s * 0.07); g.lineCap = 'round';
  g.beginPath(); g.moveTo(gripEnd.x, gripEnd.y); g.bezierCurveTo(gripEnd.x + s * 0.15, lowY, gripEnd.x - s * 0.3, lowY, gripEnd.x - Math.min(s * 0.6, run), lowY - 1); g.lineTo(gripEnd.x - run, lowY - 1); g.stroke();
  g.strokeStyle = green; g.lineWidth = Math.max(1.6, s * 0.035); g.stroke();
  // a coil of it on the ground (or the top)
  const coilX = gripEnd.x - Math.min(s * 0.9, run * 0.8), coilR = staked ? s * 0.2 : s * 0.14;
  g.strokeStyle = greenLo; g.lineWidth = Math.max(2, s * 0.045); for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(coilX, lowY - s * 0.05 - i * s * 0.02, coilR, coilR * 0.25, 0, 0, TAU); g.stroke(); }
  // the stake, over the hose and just behind the grip, the gun tied to it
  if (staked) {
    const sx = gripEnd.x - s * 0.08;
    g.strokeStyle = E.night ? '#6a5440' : '#a07a50'; g.lineWidth = Math.max(3, s * 0.06); g.lineCap = 'butt';
    g.beginPath(); g.moveTo(sx, grip.y - s * 0.04); g.lineTo(sx, gy + 2); g.stroke();
    g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; g.beginPath(); g.moveTo(sx + Math.max(1.5, s * 0.03), grip.y - s * 0.04); g.lineTo(sx + Math.max(1.5, s * 0.03), gy + 2); g.stroke();
    g.strokeStyle = '#d8d0b8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx - s * 0.04, grip.y + s * 0.06); g.lineTo(gripEnd.x + s * 0.02, grip.y + s * 0.03); g.stroke();
    softShadow(g, sx, gy + 1, s * 0.12, s * 0.03, 0.6);
  }
  // the gun itself, yellow and black
  g.strokeStyle = '#2b2a2e'; g.lineWidth = Math.max(3, s * 0.07); g.beginPath(); g.moveTo(grip.x, grip.y); g.lineTo(gripEnd.x, gripEnd.y); g.stroke();
  g.strokeStyle = '#e8c547'; g.lineWidth = Math.max(3.5, s * 0.08); g.beginPath(); g.moveTo(bx, by); g.lineTo(x - ca * s * 0.06, y + sa * s * 0.06); g.stroke();
  g.strokeStyle = '#2b2a2e'; g.lineWidth = Math.max(4, s * 0.1); g.beginPath(); g.moveTo(x - ca * s * 0.07, y + sa * s * 0.07); g.lineTo(x, y); g.stroke();
  // the first burst of spray at the nozzle as it starts
  if (t >= 0 && t < 0.4) {
    const q = t / 0.4;
    for (let i = 0; i < 7; i++) { const sp = (i - 3) * 0.12, d = s * (0.1 + q * 0.3) * (0.6 + (i % 3) * 0.2); g.fillStyle = `rgba(190,225,250,${0.8 * (1 - q)})`; g.beginPath(); g.arc(x + Math.cos(a + sp) * d, y - Math.sin(a + sp) * d, Math.max(1.2, s * 0.02), 0, TAU); g.fill(); }
  }
}


/** The circus's cannon: a long barrel painted blue with yellow bands and
    stars, its breech on a red-and-gold wagon with spoked wheels standing on
    the ring's sawdust, its muzzle at the launch point. Smoke and a flash as
    it fires, as the field gun's. */
function circusCannon(g, x, y, s, { a, ca, sa, L, rB, recoil, t, E, ground }) {
  const Lb = L * 1.5, bx = x - ca * (Lb + recoil), by = y + sa * (Lb + recoil), wR = s * 0.22;
  // the wagon stands on the sawdust; a gold pedestal rises from it to the barrel's trunnion
  const wx = bx + ca * Lb * 0.3, wy = Math.max(ground - s * 0.12 - wR * 0.7, by - sa * Lb * 0.3 + rB * 2);
  const tx = bx + ca * Lb * 0.3, ty = by - sa * Lb * 0.3;
  if (wy - ty > rB * 2) { g.fillStyle = '#c8a040'; g.beginPath(); g.moveTo(tx - s * 0.1, ty + rB); g.lineTo(tx + s * 0.1, ty + rB); g.lineTo(wx + s * 0.16, wy - s * 0.12); g.lineTo(wx - s * 0.16, wy - s * 0.12); g.closePath(); g.fill(); g.strokeStyle = withAlpha('#000000', 0.25); g.lineWidth = 1; g.stroke(); }
  // the wagon: a box under the breech, its wheels
  g.fillStyle = '#2a3a6a'; g.beginPath(); g.roundRect(wx - s * 0.55, wy - s * 0.12, s * 0.9, s * 0.24, 4); g.fill();
  g.fillStyle = '#e8c547'; g.fillRect(wx - s * 0.5, wy - s * 0.02, s * 0.8, s * 0.04);
  for (const dx of [-s * 0.35, s * 0.2]) {
    g.strokeStyle = '#e8c547'; g.lineWidth = Math.max(2, s * 0.035); g.beginPath(); g.arc(wx + dx, wy + s * 0.12, wR * 0.7, 0, TAU); g.stroke();
    g.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const q = (i / 6) * TAU; g.beginPath(); g.moveTo(wx + dx, wy + s * 0.12); g.lineTo(wx + dx + Math.cos(q) * wR * 0.7, wy + s * 0.12 + Math.sin(q) * wR * 0.7); g.stroke(); }
  }
  softShadow(g, wx, wy + s * 0.12 + wR * 0.7 + 1, s * 0.6, s * 0.05, 0.8);
  // the barrel: wide, blue, banded gold, a star or two, a dark mouth
  g.save(); g.translate(bx, by); g.rotate(-a);
  const gr = g.createLinearGradient(0, -rB * 1.6, 0, rB * 1.6); gr.addColorStop(0, '#5a7ad0'); gr.addColorStop(0.4, '#2f4fa0'); gr.addColorStop(1, '#16224a');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -rB * 1.6); g.lineTo(Lb, -rB * 1.35); g.lineTo(Lb, rB * 1.35); g.lineTo(0, rB * 1.6); g.arc(0, 0, rB * 1.6, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fill();
  g.fillStyle = '#e8c547'; for (const f of [0.15, 0.5, 0.97]) g.fillRect(Lb * f - 2, -rB * 1.55 + f * rB * 0.2, 4, rB * 3.1 - f * rB * 0.4);
  g.fillStyle = '#f2d27a'; for (const f of [0.3, 0.72]) { g.beginPath(); for (let i = 0; i < 10; i++) { const q = (i / 10) * TAU - Math.PI / 2, R2 = i % 2 ? rB * 0.25 : rB * 0.6; g.lineTo(Lb * f + Math.cos(q) * R2, Math.sin(q) * R2); } g.closePath(); g.fill(); }
  g.fillStyle = '#0a0a0c'; g.beginPath(); g.ellipse(Lb, 0, rB * 0.4, rB * 1.2, 0, 0, TAU); g.fill();
  g.restore();
  if (t >= 0) {
    const f = Math.max(0, 1 - t / 0.18);
    if (f > 0) { const R = s * 0.35 * (0.6 + f), gl = g.createRadialGradient(x, y, 0, x, y, R); gl.addColorStop(0, `rgba(255,252,220,${f})`); gl.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); }
    const q = Math.min(1, t / 1.6);
    if (q < 1) for (let i = 0; i < 6; i++) { const d = s * (0.1 + i * 0.1) * ease(q), R = s * (0.08 + i * 0.03) * (0.6 + q); g.fillStyle = withAlpha(E.night ? '#9a9aa0' : '#e8e8ec', 0.65 * (1 - q)); g.beginPath(); g.arc(x + ca * d * 0.6, y - sa * d * 0.6 - s * 0.15 * q * i * 0.3, R, 0, TAU); g.fill(); }
  }
}

/** Each launcher by the registry's name: `size` px at k px a metre. */
export const LAUNCHER_ART = { cannon, ramp, catapult, rifle, hose };
// (a rifle near its true length, and never longer than half again the height it fires from)
export const launcherSize = (kind, k, H0 = 0) => (kind === 'cannon' ? clamp(2.4 * k, 64, 120) : kind === 'catapult' ? clamp(3 * k, 92, 160) : kind === 'rifle' ? Math.min(clamp(1.1 * k, 28, 96), Math.max(28, H0 * k * 1.5)) : kind === 'hose' ? clamp(1.2 * k, 40, 90) : clamp(3 * k, 60, 160));
