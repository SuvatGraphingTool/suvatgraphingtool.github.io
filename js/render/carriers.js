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
  const s = kind === 'helicopter' ? clamp(12 * k, 80, w * 0.3) : kind === 'plane' ? clamp(12 * k, 130, w * 0.32)
    : kind === 'drone' ? clamp(0.9 * k, 66, 100) : clamp(0.9 * k, 62, 92);
  const up = kind === 'helicopter' ? s * 0.42 : kind === 'plane' ? s * 0.26 : kind === 'drone' ? s * 0.42 : s * 0.55;
  return { s, up };
}

/** A helicopter hovering or flying: a rounded cabin with its glazing, a
    tail boom and its rotor, skids under it at the point, the main rotor a
    blur that turns. */
export function helicopter(g, x, y, s, P, { phase = 0, groundY = null } = {}) {
  const E = env(), body = E.night ? '#3e5a72' : '#e8b923', bodyLo = E.night ? '#263848' : '#a8821a';
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

/** A light cargo plane flying level, side on: a high wing on its strut, a
    propeller turning at the nose, the cockpit and a row of cabin windows,
    fixed wheels, the fin; its belly door open at the point it lets go
    from, aft of the wing. */
export function plane(g, x, y, s, P, { phase = 0 } = {}) {
  const E = env(), skin = E.night ? '#c4c8ce' : '#f3f4f6', skinLo = E.night ? '#7d838b' : '#a9b0b8', trim = E.night ? '#3b4f78' : '#2f4a7a', ink = '#22262c';
  g.save(); g.translate(x, y);
  const fr = s * 0.065, fy = -fr;
  // the fuselage: a deep nose, the cabin, tapering up to the tail
  const gr = g.createLinearGradient(0, fy - fr, 0, fy + fr); gr.addColorStop(0, skin); gr.addColorStop(1, skinLo);
  g.fillStyle = gr; g.beginPath();
  g.moveTo(s * 0.5, fy + fr * 0.1); g.quadraticCurveTo(s * 0.5, fy - fr * 0.9, s * 0.4, fy - fr);
  g.lineTo(-s * 0.2, fy - fr); g.lineTo(-s * 0.5, fy - fr * 0.9); g.lineTo(-s * 0.52, fy - fr * 0.3);
  g.lineTo(-s * 0.2, fy + fr * 0.6); g.lineTo(-s * 0.05, fy + fr); g.lineTo(s * 0.4, fy + fr); g.quadraticCurveTo(s * 0.5, fy + fr, s * 0.5, fy + fr * 0.1);
  g.closePath(); g.fill();
  g.strokeStyle = withAlpha(ink, 0.35); g.lineWidth = 1; g.stroke();
  g.fillStyle = trim; g.beginPath(); g.moveTo(s * 0.48, fy + fr * 0.25); g.lineTo(-s * 0.48, fy - fr * 0.1); g.lineTo(-s * 0.48, fy + fr * 0.08); g.lineTo(s * 0.48, fy + fr * 0.45); g.closePath(); g.fill();
  // the fin and the tailplane
  g.fillStyle = trim; g.beginPath(); g.moveTo(-s * 0.36, fy - fr); g.lineTo(-s * 0.47, fy - s * 0.2); g.lineTo(-s * 0.53, fy - s * 0.2); g.lineTo(-s * 0.52, fy - fr * 0.6); g.closePath(); g.fill();
  g.fillStyle = skinLo; g.beginPath(); g.moveTo(-s * 0.42, fy - fr * 0.4); g.lineTo(-s * 0.56, fy - fr * 0.55); g.lineTo(-s * 0.56, fy - fr * 0.15); g.closePath(); g.fill();
  // the cockpit glazing and the cabin windows
  g.fillStyle = E.night ? withAlpha(E.window, 0.85) : '#3a4a5c';
  g.beginPath(); g.moveTo(s * 0.33, fy - fr * 0.85); g.lineTo(s * 0.42, fy - fr * 0.85); g.lineTo(s * 0.46, fy - fr * 0.2); g.lineTo(s * 0.33, fy - fr * 0.2); g.closePath(); g.fill();
  for (let i = 0; i < 5; i++) { g.beginPath(); g.roundRect(-s * 0.16 + i * s * 0.08, fy - fr * 0.7, s * 0.04, fr * 0.5, 2); g.fill(); }
  // the high wing, seen edge on, on its strut down to the body
  g.fillStyle = skin; g.beginPath(); g.moveTo(s * 0.3, fy - fr * 1.05); g.quadraticCurveTo(s * 0.28, fy - fr * 1.5, s * 0.2, fy - fr * 1.45); g.lineTo(s * 0.06, fy - fr * 1.25); g.lineTo(s * 0.06, fy - fr * 1.0); g.closePath(); g.fill();
  g.strokeStyle = withAlpha(ink, 0.4); g.stroke();
  g.strokeStyle = skinLo; g.lineWidth = Math.max(1.4, s * 0.008); g.beginPath(); g.moveTo(s * 0.16, fy - fr * 1.1); g.lineTo(s * 0.1, fy + fr * 0.8); g.stroke();
  // fixed wheels on their legs
  g.strokeStyle = withAlpha(ink, 0.8); g.lineWidth = Math.max(1.4, s * 0.01);
  g.beginPath(); g.moveTo(s * 0.16, fy + fr); g.lineTo(s * 0.2, fy + fr * 1.9); g.moveTo(s * 0.42, fy + fr * 0.9); g.lineTo(s * 0.42, fy + fr * 1.8); g.stroke();
  g.fillStyle = ink; for (const [wx, wy, wr] of [[0.2, 1.95, 0.5], [0.42, 1.85, 0.4]]) { g.beginPath(); g.arc(s * wx, fy + fr * wy, fr * wr, 0, TAU); g.fill(); }
  // the propeller: a spinner and a blur, a blade caught as it turns
  g.fillStyle = ink; g.beginPath(); g.ellipse(s * 0.505, fy + fr * 0.1, fr * 0.25, fr * 0.35, 0, 0, TAU); g.fill();
  g.fillStyle = withAlpha(E.night ? '#cfd3d8' : '#5a6068', 0.22); g.beginPath(); g.ellipse(s * 0.52, fy + fr * 0.1, fr * 0.12, fr * 1.9, 0, 0, TAU); g.fill();
  const bl = Math.cos(phase * 30) * fr * 1.9; g.strokeStyle = withAlpha(ink, 0.7); g.lineWidth = Math.max(1.4, s * 0.01); g.beginPath(); g.moveTo(s * 0.52, fy + fr * 0.1 - bl); g.lineTo(s * 0.52, fy + fr * 0.1 + bl); g.stroke();
  // the belly door, open, hinged down, at the point it lets go from
  g.fillStyle = '#15171b'; g.fillRect(-s * 0.05, fy + fr * 0.55, s * 0.1, fr * 0.45);
  g.strokeStyle = skinLo; g.lineWidth = Math.max(1.4, s * 0.01); g.beginPath(); g.moveTo(-s * 0.05, fy + fr); g.lineTo(-s * 0.09, fy + fr * 1.8); g.stroke();
  // a white strobe at the top of the fin, now and then
  if (Math.sin(phase * 6) > 0.7) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-s * 0.5, fy - s * 0.2, 2.2, 0, TAU); g.fill(); }
  g.restore();
}

/** A drone, seen side on and a little from above: a shell body with its
    camera, four arms out to motors, each rotor a blurred disc (the far two
    higher and smaller), landing legs, and a claw at the point. */
export function drone(g, x, y, s, P, { phase = 0 } = {}) {
  const E = env(), body = E.night ? '#c9ced4' : '#2f3339', bodyHi = E.night ? '#eef0f3' : '#5a6068', ink = E.night ? '#e4e7ea' : '#1d2024';
  g.save(); g.translate(x, y);
  const by = -s * 0.3;
  const rotor = (rx, ry, R, far) => {
    g.strokeStyle = body; g.lineWidth = Math.max(far ? 2 : 2.6, s * (far ? 0.035 : 0.045)); g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, by); g.lineTo(rx, ry + s * 0.02); g.stroke();
    g.fillStyle = body; g.fillRect(rx - s * 0.025, ry - s * 0.01, s * 0.05, s * 0.05);
    g.fillStyle = withAlpha(E.night ? '#dfe3e8' : '#8a929c', far ? 0.25 : 0.32); g.beginPath(); g.ellipse(rx, ry - s * 0.015, R, R * 0.28, 0, 0, TAU); g.fill();
    g.strokeStyle = withAlpha(ink, 0.45); g.lineWidth = 1; g.stroke();
    const a = phase * 30 + rx, bx = Math.cos(a) * R, bz = Math.sin(a) * R * 0.28;
    g.strokeStyle = withAlpha(ink, 0.8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(rx - bx, ry - s * 0.015 - bz); g.lineTo(rx + bx, ry - s * 0.015 + bz); g.stroke();
  };
  rotor(-s * 0.26, by - s * 0.14, s * 0.15, true); rotor(s * 0.26, by - s * 0.14, s * 0.15, true);
  // landing legs, splayed
  g.strokeStyle = body; g.lineWidth = Math.max(1.5, s * 0.025);
  g.beginPath(); g.moveTo(-s * 0.08, by + s * 0.06); g.lineTo(-s * 0.15, -s * 0.06); g.lineTo(-s * 0.2, -s * 0.06); g.moveTo(s * 0.08, by + s * 0.06); g.lineTo(s * 0.15, -s * 0.06); g.lineTo(s * 0.2, -s * 0.06); g.stroke();
  // the body: a domed shell, lit on top, a lens at the front and a green lamp
  const gr = g.createLinearGradient(0, by - s * 0.1, 0, by + s * 0.08); gr.addColorStop(0, bodyHi); gr.addColorStop(1, body);
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, by, s * 0.17, s * 0.08, 0, 0, TAU); g.fill();
  g.fillStyle = ink; g.beginPath(); g.arc(s * 0.15, by + s * 0.05, s * 0.035, 0, TAU); g.fill();
  g.fillStyle = withAlpha('#9fc6e8', 0.9); g.beginPath(); g.arc(s * 0.158, by + s * 0.045, s * 0.014, 0, TAU); g.fill();
  if (Math.sin(phase * 5) > 0) { g.fillStyle = '#5fd06a'; g.beginPath(); g.arc(-s * 0.13, by - s * 0.02, Math.max(1.4, s * 0.015), 0, TAU); g.fill(); }
  rotor(-s * 0.38, by - s * 0.03, s * 0.19, false); rotor(s * 0.38, by - s * 0.03, s * 0.19, false);
  // the claw, down to the point
  g.strokeStyle = ink; g.lineWidth = Math.max(1.4, s * 0.025);
  g.beginPath(); g.moveTo(0, by + s * 0.08); g.lineTo(0, -s * 0.05); g.moveTo(-s * 0.06, s * 0.01); g.lineTo(0, -s * 0.06); g.lineTo(s * 0.06, s * 0.01); g.stroke();
  g.restore();
}

/** A gull in flight, side on: a white body and head outlined so it shows on
    a pale sky, a grey back and wings with black tips, the wings beating with
    `phase` (never flat: raised at rest), its feet down at the point. */
export function bird(g, x, y, s, P, { phase = 0 } = {}) {
  const E = env(), white = E.night ? '#d6d8dc' : '#fbfbfc', grey = E.night ? '#7d848c' : '#7f8a96', line = E.night ? '#1b1d21' : '#3a3f46';
  g.save(); g.translate(x, y);
  g.lineJoin = 'round';
  const by = -s * 0.2, beat = 0.35 + 0.65 * Math.sin(phase * 9);
  const wing = (dx, reach, c) => {
    const tx = -s * reach, ty = by - s * 0.55 * beat;
    g.fillStyle = c; g.strokeStyle = line; g.lineWidth = 1;
    g.beginPath(); g.moveTo(s * 0.06 + dx, by - s * 0.03); g.quadraticCurveTo(dx - s * 0.02, by - s * 0.4 * beat, tx + dx, ty); g.lineTo(dx - s * 0.12, by + s * 0.01); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#1e1f23'; g.beginPath(); g.moveTo(tx + dx, ty); g.lineTo(lerpPt(tx, -s * 0.12, 0.3) + dx, by - s * 0.45 * beat * 0.7 + s * 0.005); g.lineTo(lerpPt(tx, s * 0.06, 0.25) + dx, by - s * 0.45 * beat * 0.75 - s * 0.02); g.closePath(); g.fill();
  };
  wing(-s * 0.06, 0.42, withAlpha(grey, 0.85));
  // the body and tail, outlined
  g.fillStyle = white; g.strokeStyle = line; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(-s * 0.36, by - s * 0.02); g.lineTo(-s * 0.24, by - s * 0.05); g.quadraticCurveTo(s * 0.02, by - s * 0.11, s * 0.18, by - s * 0.06); g.quadraticCurveTo(s * 0.12, by + s * 0.08, -s * 0.2, by + s * 0.05); g.lineTo(-s * 0.36, by + s * 0.03); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = grey; g.beginPath(); g.moveTo(-s * 0.2, by - s * 0.055); g.quadraticCurveTo(0, by - s * 0.1, s * 0.12, by - s * 0.065); g.lineTo(-s * 0.2, by - s * 0.02); g.closePath(); g.fill();
  g.fillStyle = '#1e1f23'; g.fillRect(-s * 0.36, by - s * 0.02, s * 0.05, s * 0.05);
  // the head, the beak with its red spot, the eye
  g.fillStyle = white; g.beginPath(); g.arc(s * 0.21, by - s * 0.07, s * 0.07, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#e6b43c'; g.beginPath(); g.moveTo(s * 0.27, by - s * 0.085); g.lineTo(s * 0.38, by - s * 0.06); g.lineTo(s * 0.27, by - s * 0.045); g.closePath(); g.fill();
  g.fillStyle = '#c8402a'; g.beginPath(); g.arc(s * 0.33, by - s * 0.055, Math.max(0.8, s * 0.008), 0, TAU); g.fill();
  g.fillStyle = '#1b1a1c'; g.beginPath(); g.arc(s * 0.23, by - s * 0.085, Math.max(1, s * 0.013), 0, TAU); g.fill();
  wing(0, 0.36, grey);
  // its feet down at the point, holding what it drops
  g.strokeStyle = '#d68a3c'; g.lineWidth = Math.max(1.4, s * 0.02); g.beginPath(); g.moveTo(-s * 0.04, by + s * 0.06); g.lineTo(0, -s * 0.02); g.moveTo(-s * 0.03, -s * 0.02); g.lineTo(s * 0.03, -s * 0.02); g.stroke();
  g.restore();
}
const lerpPt = (a, b, t) => a + (b - a) * t;

/** Every carrier this file draws, by the registry's name. */
export const CARRIER_ART = { helicopter, plane, drone, bird };
