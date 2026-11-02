// carriers.js — what a thing is let go from, high in the air: a helicopter,
// a plane, a drone, a bird (a hot-air balloon is heights.js's `balloon`).
// Each is drawn round the point it lets go from, (x, y) — the skids, the
// belly, the drone's claw, the bird's talons are there — facing the way it
// flies, `s` px long, its rotor or its wings moving with `phase`. Lit from
// the upper left; the colours are its own, away from the physics hues.
// Nothing here is a quantity.

import { env, softShadow } from './scenery.js';
import { clamp, withAlpha } from './util.js';

const TAU = Math.PI * 2;

/** How long each is drawn at k px a metre (a real length, never too small),
    and how far above the point it lets go from it reaches. */
export function carrierSize(kind, k, w) {
  const s = kind === 'helicopter' ? clamp(12 * k, 80, w * 0.3) : kind === 'plane' ? clamp(30 * k, 110, w * 0.36)
    : kind === 'drone' ? clamp(0.6 * k, 40, 70) : clamp(0.6 * k, 36, 70);
  const up = kind === 'helicopter' ? s * 0.42 : kind === 'plane' ? s * 0.3 : kind === 'drone' ? s * 0.4 : s * 0.5;
  return { s, up };
}

/** A helicopter hovering or flying: a rounded cabin with its glazing, a
    tail boom and its rotor, skids under it at the point, the main rotor a
    blur that turns. */
export function helicopter(g, x, y, s, P, { phase = 0, groundY = null } = {}) {
  const E = env(), body = E.night ? '#3e5a72' : '#c4472f', bodyLo = E.night ? '#263848' : '#8a2e1f';
  if (groundY != null) softShadow(g, x, groundY + 1, s * 0.35, 4, 0.5);
  g.save(); g.translate(x, y);
  const by = -s * 0.16;
  // skids, on struts, the point between them
  g.strokeStyle = E.night ? '#9aa1a8' : '#3b3f45'; g.lineWidth = Math.max(1.5, s * 0.018); g.lineCap = 'round';
  g.beginPath(); g.moveTo(-s * 0.2, 0); g.lineTo(s * 0.22, 0); g.quadraticCurveTo(s * 0.27, 0, s * 0.28, -s * 0.02);
  g.moveTo(-s * 0.12, 0); g.lineTo(-s * 0.08, by + s * 0.06); g.moveTo(s * 0.12, 0); g.lineTo(s * 0.08, by + s * 0.06); g.stroke();
  // the tail boom, fin and tail rotor
  g.fillStyle = bodyLo; g.beginPath(); g.moveTo(-s * 0.15, by - s * 0.06); g.lineTo(-s * 0.58, by - s * 0.05); g.lineTo(-s * 0.58, by - s * 0.02); g.lineTo(-s * 0.15, by + s * 0.04); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(-s * 0.52, by - s * 0.04); g.lineTo(-s * 0.6, by - s * 0.16); g.lineTo(-s * 0.56, by - s * 0.03); g.closePath(); g.fill();
  const tr = s * 0.07; g.strokeStyle = withAlpha(E.night ? '#d0d4d8' : '#2b2b2e', 0.55); g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(-s * 0.58 + Math.cos(phase * 40) * tr, by - s * 0.1 + Math.sin(phase * 40) * tr); g.lineTo(-s * 0.58 - Math.cos(phase * 40) * tr, by - s * 0.1 - Math.sin(phase * 40) * tr); g.stroke();
  // the cabin: a rounded body, lit from the left, its glazing at the front
  const gr = g.createLinearGradient(0, by - s * 0.14, 0, by + s * 0.1); gr.addColorStop(0, body); gr.addColorStop(1, bodyLo);
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, by, s * 0.24, s * 0.12, 0, 0, TAU); g.fill();
  g.fillStyle = E.night ? '#8fb0c8' : '#a9cde6'; g.beginPath(); g.ellipse(s * 0.11, by - s * 0.02, s * 0.12, s * 0.08, 0.15, -Math.PI * 0.6, Math.PI * 0.45); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(s * 0.12, by - s * 0.06, s * 0.05, s * 0.018, 0.3, 0, TAU); g.fill();
  // the mast and the main rotor, a blur with its blades caught now and then
  g.fillStyle = E.night ? '#5e646b' : '#3b3f45'; g.fillRect(-s * 0.015, by - s * 0.18, s * 0.03, s * 0.07);
  g.fillStyle = withAlpha(E.night ? '#c9cdd2' : '#4a4e55', 0.18); g.beginPath(); g.ellipse(0, by - s * 0.18, s * 0.55, s * 0.035, 0, 0, TAU); g.fill();
  g.strokeStyle = withAlpha(E.night ? '#d8dbe0' : '#2b2b2e', 0.75); g.lineWidth = Math.max(1.5, s * 0.015);
  const bl = Math.cos(phase * 25) * s * 0.55; g.beginPath(); g.moveTo(-bl, by - s * 0.18); g.lineTo(bl, by - s * 0.18); g.stroke();
  g.restore();
}

/** A plane flying level, side on: a fuselage with its windows, the wing
    across it, the tailplane and fin, its engines under the wing, its
    belly at the point it lets go from. */
export function plane(g, x, y, s, P, { phase = 0 } = {}) {
  const E = env(), skin = E.night ? '#c4c8ce' : '#eef0f3', skinLo = E.night ? '#7d838b' : '#a9b0b8', trim = E.night ? '#3e5a8a' : '#2f5fa8';
  g.save(); g.translate(x, y);
  const fy = -s * 0.07, fr = s * 0.06;
  // the far wing behind the body
  g.fillStyle = skinLo; g.beginPath(); g.moveTo(s * 0.05, fy - fr * 0.2); g.lineTo(-s * 0.08, fy - s * 0.2); g.lineTo(-s * 0.14, fy - s * 0.2); g.lineTo(-s * 0.08, fy - fr * 0.2); g.closePath(); g.fill();
  // the fuselage, nose to tail
  const gr = g.createLinearGradient(0, fy - fr, 0, fy + fr); gr.addColorStop(0, skin); gr.addColorStop(1, skinLo);
  g.fillStyle = gr; g.beginPath(); g.moveTo(s * 0.5, fy); g.quadraticCurveTo(s * 0.48, fy - fr, s * 0.38, fy - fr); g.lineTo(-s * 0.36, fy - fr); g.lineTo(-s * 0.5, fy - fr * 1.1); g.lineTo(-s * 0.46, fy + fr * 0.3); g.lineTo(-s * 0.3, fy + fr); g.lineTo(s * 0.38, fy + fr); g.quadraticCurveTo(s * 0.5, fy + fr * 0.8, s * 0.5, fy); g.closePath(); g.fill();
  g.fillStyle = trim; g.fillRect(-s * 0.36, fy + fr * 0.15, s * 0.8, fr * 0.25);
  g.fillStyle = E.night ? withAlpha(E.window, 0.9) : '#3a4a5c'; for (let i = 0; i < 14; i++) g.fillRect(-s * 0.28 + i * s * 0.045, fy - fr * 0.5, s * 0.018, fr * 0.4);
  g.fillStyle = '#2b3440'; g.beginPath(); g.moveTo(s * 0.44, fy - fr * 0.6); g.lineTo(s * 0.48, fy - fr * 0.3); g.lineTo(s * 0.42, fy - fr * 0.3); g.closePath(); g.fill();
  // fin and tailplane
  g.fillStyle = trim; g.beginPath(); g.moveTo(-s * 0.36, fy - fr); g.lineTo(-s * 0.48, fy - s * 0.2); g.lineTo(-s * 0.52, fy - s * 0.2); g.lineTo(-s * 0.5, fy - fr); g.closePath(); g.fill();
  g.fillStyle = skinLo; g.beginPath(); g.moveTo(-s * 0.4, fy); g.lineTo(-s * 0.52, fy + s * 0.02); g.lineTo(-s * 0.46, fy - fr * 0.2); g.closePath(); g.fill();
  // the near wing and its engine
  g.fillStyle = skin; g.beginPath(); g.moveTo(s * 0.08, fy + fr * 0.3); g.lineTo(-s * 0.1, fy + s * 0.16); g.lineTo(-s * 0.15, fy + s * 0.16); g.lineTo(-s * 0.08, fy + fr * 0.3); g.closePath(); g.fill();
  g.fillStyle = skinLo; g.beginPath(); g.roundRect(-s * 0.02, fy + fr * 0.9, s * 0.1, fr * 0.9, fr * 0.4); g.fill();
  g.fillStyle = withAlpha('#000000', 0.5); g.beginPath(); g.ellipse(s * 0.08, fy + fr * 1.35, fr * 0.12, fr * 0.4, 0, 0, TAU); g.fill();
  // the hold door, open, at the point it lets go from
  g.fillStyle = withAlpha('#1b1d22', 0.85); g.fillRect(-s * 0.03, fy + fr * 0.75, s * 0.06, fr * 0.3);
  // a lamp blinking at the wing tip
  if (Math.sin(phase * 6) > 0.6) { g.fillStyle = '#ff6b5e'; g.beginPath(); g.arc(-s * 0.13, fy + s * 0.16, 2.2, 0, TAU); g.fill(); }
  g.restore();
}

/** A drone: a body with four arms and rotors, a claw at the point. */
export function drone(g, x, y, s, P, { phase = 0 } = {}) {
  const E = env(), body = E.night ? '#d0d4d9' : '#3b3f46';
  g.save(); g.translate(x, y);
  const by = -s * 0.22;
  g.strokeStyle = body; g.lineWidth = Math.max(1.5, s * 0.05); g.lineCap = 'round';
  g.beginPath(); g.moveTo(-s * 0.42, by - s * 0.06); g.lineTo(s * 0.42, by - s * 0.06); g.stroke();
  for (const sx of [-0.42, 0.42]) {
    g.strokeStyle = withAlpha(body, 0.6); g.lineWidth = 1.5; const bl = Math.cos(phase * 30 + sx) * s * 0.2;
    g.beginPath(); g.moveTo(s * sx - bl, by - s * 0.12); g.lineTo(s * sx + bl, by - s * 0.12); g.stroke();
    g.fillStyle = body; g.fillRect(s * sx - s * 0.02, by - s * 0.12, s * 0.04, s * 0.07);
  }
  g.fillStyle = body; g.beginPath(); g.roundRect(-s * 0.14, by - s * 0.1, s * 0.28, s * 0.12, s * 0.04); g.fill();
  g.fillStyle = '#5fd06a'; g.beginPath(); g.arc(s * 0.1, by - s * 0.05, Math.max(1.2, s * 0.02), 0, TAU); g.fill();
  g.strokeStyle = body; g.lineWidth = Math.max(1.2, s * 0.03); g.beginPath(); g.moveTo(0, by + s * 0.02); g.lineTo(0, -s * 0.04); g.moveTo(-s * 0.06, 0); g.lineTo(0, -s * 0.05); g.lineTo(s * 0.06, 0); g.stroke();
  g.restore();
}

/** A bird in flight, side on: a gull's white body, grey back and black
    wingtips, the wings beating with `phase`, its feet at the point. */
export function bird(g, x, y, s, P, { phase = 0 } = {}) {
  const E = env(), white = E.night ? '#d6d8dc' : '#f7f8fa', grey = E.night ? '#8d939b' : '#a9b2bc';
  g.save(); g.translate(x, y);
  const by = -s * 0.18, beat = Math.sin(phase * 9);
  // the far wing
  g.fillStyle = grey; g.beginPath(); g.moveTo(-s * 0.05, by - s * 0.03); g.quadraticCurveTo(-s * 0.1, by - s * 0.35 * beat - s * 0.05, -s * 0.3, by - s * 0.45 * beat); g.lineTo(-s * 0.12, by); g.closePath(); g.fill();
  // the body: a teardrop, head forward with a yellow beak
  g.fillStyle = white; g.beginPath(); g.ellipse(0, by, s * 0.24, s * 0.08, -0.05, 0, TAU); g.fill();
  g.beginPath(); g.arc(s * 0.22, by - s * 0.05, s * 0.065, 0, TAU); g.fill();
  g.fillStyle = '#e6b43c'; g.beginPath(); g.moveTo(s * 0.28, by - s * 0.06); g.lineTo(s * 0.36, by - s * 0.04); g.lineTo(s * 0.28, by - s * 0.03); g.closePath(); g.fill();
  g.fillStyle = '#1b1a1c'; g.beginPath(); g.arc(s * 0.24, by - s * 0.065, Math.max(0.8, s * 0.012), 0, TAU); g.fill();
  g.fillStyle = grey; g.beginPath(); g.moveTo(-s * 0.24, by); g.lineTo(-s * 0.34, by - s * 0.04); g.lineTo(-s * 0.32, by + s * 0.03); g.closePath(); g.fill();
  // the near wing, beating, its tip black
  g.fillStyle = grey; g.beginPath(); g.moveTo(s * 0.05, by - s * 0.02); g.quadraticCurveTo(0, by - s * 0.4 * beat, -s * 0.22, by - s * 0.5 * beat - s * 0.02); g.lineTo(-s * 0.08, by + s * 0.02); g.closePath(); g.fill();
  g.fillStyle = '#26272b'; g.beginPath(); g.moveTo(-s * 0.16, by - s * 0.45 * beat); g.lineTo(-s * 0.22, by - s * 0.5 * beat - s * 0.02); g.lineTo(-s * 0.13, by - s * 0.36 * beat); g.closePath(); g.fill();
  // its feet tucked at the point, holding what it drops
  g.strokeStyle = '#d68a3c'; g.lineWidth = Math.max(1, s * 0.02); g.beginPath(); g.moveTo(-s * 0.02, by + s * 0.07); g.lineTo(0, -s * 0.02); g.stroke();
  g.restore();
}

/** Every carrier this file draws, by the registry's name. */
export const CARRIER_ART = { helicopter, plane, drone, bird };
