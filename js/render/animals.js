// animals.js — the animals a question sends leaping: a cat, a dog, a monkey,
// a frog. Each is drawn side on, facing the way it goes, its body `L` px long
// round its middle (x, y), in a pose for where it is in its leap:
//   `leap` 0 crouched on the edge, gathering itself; rising to 1 stretched
//   out in the air; `land` 0..1 reaching down as it comes in to land.
// Lit from the upper left like every figure, with a dark rim so it reads over
// any backdrop; a `ring` tells B from A. The colours are the animals' own,
// held away from the physics hues. Nothing here is a quantity.

import { env } from './scenery.js';
import { withAlpha } from './util.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

/** A tapering limb from a to b to c, `w` px thick at the top. */
function leg(g, pts, w, color) {
  g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = w; g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.stroke();
}
/** A body: a shaded ellipse lit from the upper left. */
function torso(g, x, y, rx, ry, rot, light, dark) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const gr = g.createRadialGradient(-rx * 0.3, -ry * 0.5, ry * 0.2, 0, 0, rx);
  gr.addColorStop(0, light); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
  g.restore();
}
const eye = (g, x, y, r) => { g.fillStyle = '#1b1a1c'; g.beginPath(); g.arc(x, y, Math.max(1, r), 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x + r * 0.3, y - r * 0.3, Math.max(0.5, r * 0.35), 0, TAU); g.fill(); };
const ringed = (g, x, y, L, ring) => { if (!ring) return; g.strokeStyle = ring; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, y, L * 0.62, L * 0.42, 0, 0, TAU); g.stroke(); };

/** A four-legged runner (a cat, a dog): crouched, stretched out, reaching
    down; its tail out behind, its head up and forward. */
function quadruped(g, x, y, L, { leap = 0, land = 0, spin = 0, fur, furLo, ears, tail, snout }) {
  const s = Math.max(0, Math.min(1, leap)), d = Math.max(0, Math.min(1, land));
  // gathered on its haunches before the spring: tail end low, head up
  g.save(); g.translate(x, y); g.rotate(spin - (1 - s) * (1 - d) * 0.22);
  const len = L * lerp(0.62, 0.78, s), hb = L * 0.17;                 // body half-length grows as it stretches
  const back = { x: -len / 2, y: lerp(L * 0.02, 0, s) }, front = { x: len / 2, y: lerp(-L * 0.04, 0, s) };
  // legs: tucked under in the crouch, flung fore and aft in the air, the
  // forelegs reaching down to land
  const fw = L * 0.07, bw = L * 0.085, legL = L * 0.3;
  const fore = s < 0.5 && d === 0
    ? [{ x: front.x - L * 0.04, y: front.y + hb * 0.5 }, { x: front.x - L * 0.02, y: front.y + legL * 0.6 }, { x: front.x + L * 0.04, y: front.y + legL }]
    : [{ x: front.x, y: front.y + hb * 0.4 }, { x: front.x + legL * lerp(0.7, 0.35, d), y: front.y + legL * lerp(0.35, 0.75, d) }, { x: front.x + legL * lerp(1.15, 0.45, d), y: front.y + legL * lerp(0.4, 1.05, d) }];
  const hind = s < 0.5 && d === 0
    ? [{ x: back.x + L * 0.04, y: back.y + hb * 0.4 }, { x: back.x + L * 0.14, y: back.y + legL * 0.55 }, { x: back.x - L * 0.02, y: back.y + legL }]
    : [{ x: back.x, y: back.y + hb * 0.4 }, { x: back.x - legL * 0.45, y: back.y + legL * 0.5 }, { x: back.x - legL * lerp(1.1, 0.6, d), y: back.y + legL * lerp(0.55, 0.95, d) }];
  leg(g, hind.map((p) => ({ x: p.x + L * 0.05, y: p.y })), bw * 0.85, furLo);
  leg(g, fore.map((p) => ({ x: p.x - L * 0.05, y: p.y })), fw * 0.85, furLo);
  // the tail, out behind, curling up
  g.strokeStyle = fur; g.lineWidth = L * tail.w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(back.x, back.y - hb * 0.3);
  g.quadraticCurveTo(back.x - L * 0.22, back.y - hb * lerp(0.2, 0.6, s) - L * tail.lift, back.x - L * 0.36, back.y - L * tail.lift * 1.6);
  g.stroke();
  torso(g, 0, (back.y + front.y) / 2, len / 2 + hb * 0.4, hb, 0, fur, furLo);
  leg(g, hind, bw, fur); leg(g, fore, fw, fur);
  // the head, up and forward on its neck, with its ears, snout and eye
  const hx = front.x + L * 0.12, hy = front.y - hb * 1.1, hr = L * 0.12;
  g.strokeStyle = fur; g.lineCap = 'round'; g.lineWidth = hr * 1.1;
  g.beginPath(); g.moveTo(front.x - hb * 0.2, front.y - hb * 0.2); g.lineTo(hx - hr * 0.3, hy + hr * 0.4); g.stroke();
  torso(g, hx, hy, hr, hr * 0.9, 0, fur, furLo);
  g.fillStyle = fur; g.beginPath(); g.ellipse(hx + hr * 0.9, hy + hr * 0.25, hr * snout, hr * 0.45, 0.1, 0, TAU); g.fill();
  g.fillStyle = '#1b1a1c'; g.beginPath(); g.arc(hx + hr * (0.9 + snout), hy + hr * 0.15, Math.max(1, hr * 0.14), 0, TAU); g.fill();
  g.fillStyle = furLo;
  if (ears === 'pointed') for (const dx of [-0.35, 0.2]) { g.beginPath(); g.moveTo(hx + hr * dx - hr * 0.3, hy - hr * 0.6); g.lineTo(hx + hr * dx, hy - hr * 1.45); g.lineTo(hx + hr * dx + hr * 0.3, hy - hr * 0.55); g.closePath(); g.fill(); }
  else { g.beginPath(); g.ellipse(hx - hr * 0.3, hy - hr * 0.1, hr * 0.32, hr * 0.7, 0.5 - s * 0.6, 0, TAU); g.fill(); }
  eye(g, hx + hr * 0.4, hy - hr * 0.2, hr * 0.13);
  g.restore();
}

/** A cat: tabby grey-brown, pointed ears, a long tail held up. */
export function cat(g, x, y, L, P, o = {}) {
  const E = env();
  quadruped(g, x, y, L, { ...o, fur: E.night ? '#8a7b6e' : '#a58f7a', furLo: E.night ? '#5a4d43' : '#6d5a4b', ears: 'pointed', tail: { w: 0.05, lift: 0.12 }, snout: 0.35 });
  ringed(g, x, y, L, o.ring);
}
/** A dog: a russet coat, floppy ears, a longer snout. */
export function dog(g, x, y, L, P, o = {}) {
  const E = env();
  quadruped(g, x, y, L, { ...o, fur: E.night ? '#9a6e4a' : '#b9824f', furLo: E.night ? '#614330' : '#7c5233', ears: 'floppy', tail: { w: 0.055, lift: 0.08 }, snout: 0.6 });
  ringed(g, x, y, L, o.ring);
}

/** A monkey: long arms reaching up and out, legs drawn up, a curling tail. */
export function monkey(g, x, y, L, P, { leap = 0, land = 0, spin = 0, ring = null } = {}) {
  const E = env(), s = Math.max(0, Math.min(1, leap)), d = Math.max(0, Math.min(1, land));
  const fur = E.night ? '#6e5240' : '#8a6448', furLo = E.night ? '#42302a' : '#5a3f2e', face = E.night ? '#b39a84' : '#d9b99a';
  g.save(); g.translate(x, y); g.rotate(spin);
  const hip = { x: -L * 0.05, y: L * 0.12 }, sh = { x: L * 0.05, y: -L * 0.16 };
  // the tail, curling behind
  g.strokeStyle = fur; g.lineWidth = L * 0.035; g.lineCap = 'round';
  g.beginPath(); g.moveTo(hip.x - L * 0.05, hip.y); g.bezierCurveTo(hip.x - L * 0.4, hip.y + L * 0.1, hip.x - L * 0.45, hip.y - L * 0.3, hip.x - L * 0.28, hip.y - L * 0.32); g.stroke();
  // legs: bent under, kicked back in the air, reaching to land
  const knee = { x: hip.x + L * lerp(0.15, -0.05, s), y: hip.y + L * lerp(0.12, 0.2, s) };
  const foot = { x: hip.x + L * lerp(0.02, -0.25 + d * 0.2, s), y: hip.y + L * lerp(0.28, 0.3 + d * 0.08, s) };
  leg(g, [hip, knee, foot], L * 0.07, furLo);
  // arms: down and gathered in the crouch, reaching up and forward in the air
  const a = lerp(1.2, -0.7 + d * 0.9, s), el = { x: sh.x + Math.cos(a) * L * 0.2, y: sh.y + Math.sin(a) * L * 0.2 }, hand = { x: el.x + Math.cos(a - 0.3) * L * 0.2, y: el.y + Math.sin(a - 0.3) * L * 0.2 };
  leg(g, [sh, { x: el.x - L * 0.06, y: el.y }, { x: hand.x - L * 0.06, y: hand.y }], L * 0.055, furLo);
  torso(g, (hip.x + sh.x) / 2, (hip.y + sh.y) / 2, L * 0.13, L * 0.2, 0.15, fur, furLo);
  leg(g, [hip, { x: knee.x + L * 0.04, y: knee.y }, { x: foot.x + L * 0.05, y: foot.y }], L * 0.075, fur);
  leg(g, [sh, el, hand], L * 0.06, fur);
  g.fillStyle = face; g.beginPath(); g.arc(hand.x, hand.y, L * 0.035, 0, TAU); g.fill();
  // the head: a round head, a pale face, ears out at the sides
  const hx = sh.x + L * 0.06, hy = sh.y - L * 0.14, hr = L * 0.11;
  g.fillStyle = furLo; g.beginPath(); g.arc(hx - hr * 0.9, hy, hr * 0.32, 0, TAU); g.fill();
  torso(g, hx, hy, hr, hr, 0, fur, furLo);
  g.fillStyle = face; g.beginPath(); g.ellipse(hx + hr * 0.35, hy + hr * 0.15, hr * 0.6, hr * 0.62, 0, 0, TAU); g.fill();
  eye(g, hx + hr * 0.5, hy - hr * 0.1, hr * 0.12);
  g.restore();
  ringed(g, x, y, L, ring);
}

/** A frog: a squat green body, crouched on its long folded hind legs, then
    flung out straight behind it in the leap. */
export function frog(g, x, y, L, P, { leap = 0, land = 0, spin = 0, ring = null } = {}) {
  const E = env(), s = Math.max(0, Math.min(1, leap)), d = Math.max(0, Math.min(1, land));
  const skin = E.night ? '#5f8a52' : '#79b05a', skinLo = E.night ? '#365030' : '#4a7337', belly = E.night ? '#b7b48a' : '#e3dfa6';
  g.save(); g.translate(x, y); g.rotate(spin + lerp(-0.15, -0.1, s) * (1 - d));
  const hip = { x: -L * 0.22, y: L * 0.05 };
  // the hind leg: folded in a Z under the body, or straight out behind
  const ext = Math.max(s, 0) * (1 - d * 0.6);
  // (straight out behind it in the air, not hanging down)
  const kn = { x: hip.x + L * lerp(0.18, -0.25, ext), y: hip.y + L * lerp(0.08, 0.01, ext) };
  const an = { x: hip.x + L * lerp(-0.12, -0.55, ext), y: hip.y + L * lerp(0.15, 0.02, ext) };
  const ft = { x: an.x + L * lerp(0.2, -0.15, ext), y: an.y + L * lerp(0.03, 0, ext) };
  leg(g, [hip, kn, an, ft], L * 0.09, skinLo);
  // the foreleg: propping it up, or reaching to land
  const fs = { x: L * 0.18, y: L * 0.08 }, ff = { x: fs.x + L * lerp(0.05, 0.2 + d * 0.05, s), y: fs.y + L * lerp(0.15, 0.12 + d * 0.08, s) };
  leg(g, [fs, ff], L * 0.06, skinLo);
  // body and head as one rounded wedge, the belly pale, the back spotted
  const gr = g.createRadialGradient(-L * 0.05, -L * 0.15, L * 0.05, 0, 0, L * 0.45);
  gr.addColorStop(0, skin); gr.addColorStop(1, skinLo);
  g.fillStyle = gr; g.beginPath(); g.moveTo(-L * 0.32, L * 0.08);
  g.quadraticCurveTo(-L * 0.3, -L * 0.2, L * 0.1, -L * 0.18); g.quadraticCurveTo(L * 0.42, -L * 0.14, L * 0.42, L * 0.04);
  g.quadraticCurveTo(L * 0.2, L * 0.16, -L * 0.32, L * 0.08); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = belly; g.beginPath(); g.ellipse(L * 0.12, L * 0.08, L * 0.24, L * 0.06, 0, 0, TAU); g.fill();
  g.fillStyle = withAlpha(skinLo, 0.8); for (const [dx, dy] of [[-0.15, -0.08], [0, -0.12], [-0.05, 0]]) { g.beginPath(); g.arc(L * dx, L * dy, L * 0.035, 0, TAU); g.fill(); }
  leg(g, [hip, { x: kn.x + L * 0.03, y: kn.y - L * 0.02 }, an, ft], L * 0.1, skin);
  // the bulging eye on top
  g.fillStyle = skin; g.beginPath(); g.arc(L * 0.24, -L * 0.15, L * 0.08, 0, TAU); g.fill();
  eye(g, L * 0.26, -L * 0.16, L * 0.045);
  g.restore();
  ringed(g, x, y, L, ring);
}

/** A javelin, `L` px long round its middle, pointed along `ang`: a slim
    shaft, the cord grip near its balance, the steel tip. */
export function javelin(g, x, y, L, ang) {
  const E = env(), t = Math.max(1.6, L * 0.022);
  g.save(); g.translate(x, y); g.rotate(ang); g.lineCap = 'round';
  g.strokeStyle = E.night ? '#b9bec4' : '#9aa3ab'; g.lineWidth = t; g.beginPath(); g.moveTo(-L * 0.5, 0); g.lineTo(L * 0.4, 0); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(0.6, t * 0.35); g.beginPath(); g.moveTo(-L * 0.48, -t * 0.25); g.lineTo(L * 0.38, -t * 0.25); g.stroke();
  g.strokeStyle = E.night ? '#7a5a3e' : '#8d6a46'; g.lineWidth = t * 1.7; g.beginPath(); g.moveTo(-L * 0.04, 0); g.lineTo(L * 0.08, 0); g.stroke();
  g.fillStyle = E.night ? '#d7dbe0' : '#5d646b'; g.beginPath(); g.moveTo(L * 0.5, 0); g.lineTo(L * 0.38, -t * 1.1); g.lineTo(L * 0.38, t * 1.1); g.closePath(); g.fill();
  g.restore();
}

/** Every animal, by the registry's figure name. */
export const ANIMALS = { cat, dog, monkey, frog };
/** How far below its middle each one's feet reach, as a fraction of L: the
    stage stands it on the edge and the ground with this. */
export const FEET = { cat: 0.38, dog: 0.38, monkey: 0.44, frog: 0.24 };
