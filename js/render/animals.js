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
function quadruped(g, x, y, L, { leap = 0, land = 0, spin = 0, fur, furLo, ears, tail, snout, head = null, rump = null }) {
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
  // the tail, out behind, curling up (a squirrel's a filled plume arching over its back; none for a rabbit's scut)
  if (tail?.plume) {
    const bx = back.x, by = back.y - hb * 0.3, up = lerp(0.35, 0.15, s);
    const tip = { x: bx - L * lerp(0.15, 0.55, s), y: by - L * lerp(0.6, 0.25, s) }, mid = { x: bx - L * 0.38, y: by - L * up };
    const wd = L * 0.14;
    g.fillStyle = fur; g.beginPath(); g.moveTo(bx, by - wd * 0.2);
    g.quadraticCurveTo(mid.x - wd, mid.y + wd * 0.3, tip.x - wd * 0.6, tip.y); g.quadraticCurveTo(tip.x + wd * 0.3, tip.y - wd * 1.2, tip.x + wd * 1.2, tip.y + wd * 0.2);
    g.quadraticCurveTo(mid.x + wd * 1.4, mid.y - wd * 0.2, bx + wd * 0.3, by + wd * 0.2); g.closePath(); g.fill();
    g.strokeStyle = withAlpha(tail.edge, 0.8); g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = withAlpha(tail.edge, 0.5); g.lineWidth = 1; for (let i = 0; i < 6; i++) { const u = 0.3 + i * 0.12; g.beginPath(); g.moveTo(lerp(bx, tip.x, u) - wd * 0.6, lerp(by, tip.y, u)); g.lineTo(lerp(bx, tip.x, u) - wd * 0.9, lerp(by, tip.y, u) + wd * 0.3); g.stroke(); }
  } else if (tail) {
    g.strokeStyle = fur; g.lineWidth = L * tail.w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(back.x, back.y - hb * 0.3);
    g.quadraticCurveTo(back.x - L * 0.22, back.y - hb * lerp(0.2, 0.6, s) - L * tail.lift, back.x - L * 0.36, back.y - L * tail.lift * 1.6);
    g.stroke();
  }
  torso(g, 0, (back.y + front.y) / 2, len / 2 + hb * 0.4, hb, 0, fur, furLo);
  if (rump) rump(g, back, hb, len);
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
  else if (ears !== 'none') { g.beginPath(); g.ellipse(hx - hr * 0.3, hy - hr * 0.1, hr * 0.32, hr * 0.7, 0.5 - s * 0.6, 0, TAU); g.fill(); }
  eye(g, hx + hr * 0.4, hy - hr * 0.2, hr * 0.13);
  // what this animal's head has of its own (a goat's horns and beard)
  if (head) head(g, hx, hy, hr);
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

/** A goat: an off-white shaggy coat, swept-back horns and a beard, a
    short tail; sure-footed, it springs from a rock. */
export function goat(g, x, y, L, P, o = {}) {
  const E = env();
  quadruped(g, x, y, L, { ...o, fur: E.night ? '#b8b2a8' : '#ebe5d8', furLo: E.night ? '#7a746c' : '#a8a092', ears: 'pointed', tail: { w: 0.04, lift: 0.14 }, snout: 0.5, head: (g2, hx, hy, hr) => {
    g2.strokeStyle = E.night ? '#6a6058' : '#8a7a64'; g2.lineWidth = hr * 0.22; g2.lineCap = 'round';
    for (const dx of [-0.1, 0.12]) { g2.beginPath(); g2.moveTo(hx + hr * dx, hy - hr * 0.7); g2.quadraticCurveTo(hx + hr * (dx - 0.2), hy - hr * 1.6, hx - hr * (0.9 - dx), hy - hr * 1.3); g2.stroke(); }
    g2.fillStyle = E.night ? '#8a847a' : '#c8c0b0'; g2.beginPath(); g2.moveTo(hx + hr * 1.1, hy + hr * 0.6); g2.lineTo(hx + hr * 1.3, hy + hr * 1.35); g2.lineTo(hx + hr * 0.85, hy + hr * 0.65); g2.closePath(); g2.fill();
  } });
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
/** A kangaroo: a big tail behind for balance, the long hind feet
    together, small forearms tucked; crouched before, stretched out in the
    hop, the feet swinging forward to land. */
export function kangaroo(g, x, y, L, P, { leap = 0, land = 0, spin = 0, ring = null } = {}) {
  const E = env(), s = Math.max(0, Math.min(1, leap)), d = Math.max(0, Math.min(1, land)), ext = s * (1 - d * 0.7);
  const fur = E.night ? '#8a6a52' : '#b8875a', furLo = E.night ? '#5a4232' : '#8a5f3a', belly = E.night ? '#b8a088' : '#e2c8a4';
  g.save(); g.translate(x, y); g.rotate(spin + lerp(-0.5, -0.25, ext));
  // the tail, thick at the base, out behind
  g.strokeStyle = furLo; g.lineCap = 'round'; g.lineWidth = L * 0.1; g.beginPath(); g.moveTo(-L * 0.18, L * 0.08); g.quadraticCurveTo(-L * 0.45, L * 0.18, -L * 0.62, L * lerp(0.32, 0.12, ext)); g.stroke();
  g.lineWidth = L * 0.05; g.beginPath(); g.moveTo(-L * 0.5, L * lerp(0.26, 0.14, ext)); g.lineTo(-L * 0.68, L * lerp(0.36, 0.1, ext)); g.stroke();
  // the hind leg: haunch, the long foot under it, or out behind in the air
  const hip = { x: -L * 0.12, y: L * 0.1 }, kn = { x: hip.x + L * lerp(0.16, 0.02, ext), y: hip.y + L * lerp(0.1, 0.14, ext) }, an = { x: kn.x + L * lerp(-0.18, -0.26, ext), y: kn.y + L * lerp(0.14, 0.08, ext) + L * d * 0.06 }, ft = { x: an.x + L * lerp(0.36, 0.34, ext) + L * d * 0.12, y: an.y + L * 0.02 };
  // (its body filled, not outlined: a ring round it read as a stray stroke)
  const body = (x1, y1, rx, ry, rot) => { g.save(); g.translate(x1, y1); g.rotate(rot); const gr = g.createRadialGradient(-rx * 0.3, -ry * 0.5, ry * 0.2, 0, 0, rx); gr.addColorStop(0, fur); gr.addColorStop(1, furLo); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.restore(); };
  body(-L * 0.04, L * 0.08, L * 0.15, L * 0.12, 0.2);
  leg(g, [hip, kn, an, ft], L * 0.08, furLo);
  // the body, upright-ish, the belly paler
  body(L * 0.04, -L * 0.08, L * 0.12, L * 0.2, -0.35 + 0.35 * ext);
  g.fillStyle = belly; g.beginPath(); g.ellipse(L * 0.1, -L * 0.05, L * 0.06, L * 0.15, -0.35, 0, TAU); g.fill();
  // the small forearms, tucked
  leg(g, [{ x: L * 0.12, y: -L * 0.12 }, { x: L * 0.2, y: -L * 0.04 }, { x: L * 0.22, y: L * 0.0 }], L * 0.035, furLo);
  // the head: long-eared, its muzzle forward
  g.fillStyle = fur; g.beginPath(); g.ellipse(L * 0.15, -L * 0.33, L * 0.08, L * 0.06, 0.3, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(L * 0.23, -L * 0.3, L * 0.06, L * 0.035, 0.4, 0, TAU); g.fill();
  for (const [ex, ea] of [[0.1, -0.4], [0.14, -0.2]]) { g.fillStyle = furLo; g.beginPath(); g.ellipse(L * ex, -L * 0.43, L * 0.025, L * 0.07, ea, 0, TAU); g.fill(); }
  eye(g, L * 0.18, -L * 0.35, L * 0.012);
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(L * 0.28, -L * 0.28, L * 0.012, 0, TAU); g.fill();
  g.restore();
  ringed(g, x, y, L, ring);
}

/** A dolphin, along its path: the grey back darker than its pale belly,
    the beak forward, the dorsal fin, flippers and tail flukes beating with
    `phase`. Drawn round its middle, heading along `ang` (canvas radians). */
export function dolphin(g, x, y, L, P, { ang = 0, phase = 0, ring = null } = {}) {
  const E = env(), back = E.night ? '#4a5866' : '#6a7f92', belly = E.night ? '#a8b4c0' : '#dfe6ec';
  g.save(); g.translate(x, y); g.rotate(ang);
  const beat = Math.sin(phase * 8) * 0.25;
  // the flukes, then the body's outline: a long teardrop with a beak
  g.save(); g.translate(-L * 0.46, 0); g.rotate(beat);
  g.fillStyle = back; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-L * 0.08, -L * 0.12, -L * 0.14, -L * 0.13); g.quadraticCurveTo(-L * 0.08, 0, -L * 0.14, L * 0.13); g.quadraticCurveTo(-L * 0.08, L * 0.12, 0, 0); g.fill();
  g.restore();
  const body = () => { g.beginPath(); g.moveTo(-L * 0.46, 0); g.quadraticCurveTo(-L * 0.2, -L * 0.13, L * 0.15, -L * 0.11); g.quadraticCurveTo(L * 0.34, -L * 0.08, L * 0.4, -L * 0.02); g.lineTo(L * 0.52, -L * 0.005); g.lineTo(L * 0.52, L * 0.01); g.quadraticCurveTo(L * 0.3, L * 0.09, L * 0.1, L * 0.1); g.quadraticCurveTo(-L * 0.2, L * 0.09, -L * 0.46, 0); g.closePath(); };
  const gr = g.createLinearGradient(0, -L * 0.12, 0, L * 0.1); gr.addColorStop(0, back); gr.addColorStop(0.55, back); gr.addColorStop(0.62, belly); gr.addColorStop(1, belly);
  body(); g.fillStyle = gr; g.fill();
  g.strokeStyle = ring || 'rgba(20,24,30,0.45)'; g.lineWidth = ring ? 2.4 : 1; g.stroke();
  // the dorsal fin, the near flipper
  g.fillStyle = back; g.beginPath(); g.moveTo(-L * 0.05, -L * 0.115); g.quadraticCurveTo(-L * 0.02, -L * 0.24, -L * 0.14, -L * 0.25); g.quadraticCurveTo(-L * 0.12, -L * 0.17, -L * 0.18, -L * 0.11); g.closePath(); g.fill();
  g.fillStyle = E.night ? '#3a4652' : '#56697a'; g.beginPath(); g.moveTo(L * 0.14, L * 0.07); g.quadraticCurveTo(L * 0.06, L * 0.18, -L * 0.02, L * 0.19); g.quadraticCurveTo(L * 0.04, L * 0.1, L * 0.06, L * 0.07); g.closePath(); g.fill();
  eye(g, L * 0.33, -L * 0.04, L * 0.014);
  g.strokeStyle = 'rgba(20,24,30,0.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L * 0.4, L * 0.0); g.lineTo(L * 0.5, L * 0.005); g.stroke();
  // a sheen along its back
  g.strokeStyle = withAlpha('#ffffff', 0.3); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-L * 0.25, -L * 0.09); g.quadraticCurveTo(L * 0.05, -L * 0.12, L * 0.3, -L * 0.07); g.stroke();
  g.restore();
}

/** A leaping fish (a salmon), along its path: silver flanks with a pink
    stripe and spotted back, the tail beating with `phase`. */
export function fish(g, x, y, L, P, { ang = 0, phase = 0, ring = null } = {}) {
  const E = env();
  g.save(); g.translate(x, y); g.rotate(ang);
  const beat = Math.sin(phase * 12) * 0.35;
  g.save(); g.translate(-L * 0.38, 0); g.rotate(beat);
  g.fillStyle = E.night ? '#5a6470' : '#7a8a9a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-L * 0.16, -L * 0.13); g.quadraticCurveTo(-L * 0.11, 0, -L * 0.16, L * 0.13); g.closePath(); g.fill();
  g.restore();
  const body = () => { g.beginPath(); g.moveTo(-L * 0.4, 0); g.quadraticCurveTo(-L * 0.1, -L * 0.17, L * 0.25, -L * 0.1); g.quadraticCurveTo(L * 0.45, -L * 0.04, L * 0.5, L * 0.01); g.quadraticCurveTo(L * 0.4, L * 0.1, L * 0.2, L * 0.11); g.quadraticCurveTo(-L * 0.1, L * 0.13, -L * 0.4, 0); g.closePath(); };
  const gr = g.createLinearGradient(0, -L * 0.15, 0, L * 0.12); gr.addColorStop(0, E.night ? '#4a5866' : '#5a7088'); gr.addColorStop(0.45, E.night ? '#a8b4c0' : '#d8e0e8'); gr.addColorStop(1, E.night ? '#c8ccd2' : '#f4f6f8');
  body(); g.fillStyle = gr; g.fill(); g.strokeStyle = ring || 'rgba(20,24,30,0.45)'; g.lineWidth = ring ? 2.4 : 1; g.stroke();
  g.save(); body(); g.clip();
  g.fillStyle = withAlpha('#d8708a', 0.45); g.fillRect(-L * 0.4, -L * 0.01, L * 0.85, L * 0.035);
  g.fillStyle = 'rgba(20,24,30,0.5)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(-L * 0.25 + i * L * 0.06, -L * 0.08 + (i % 2) * L * 0.02, L * 0.01, 0, TAU); g.fill(); }
  g.restore();
  g.fillStyle = E.night ? '#5a6470' : '#6a7a8a'; g.beginPath(); g.moveTo(0, -L * 0.14); g.lineTo(-L * 0.1, -L * 0.22); g.lineTo(-L * 0.12, -L * 0.13); g.closePath(); g.fill();
  eye(g, L * 0.36, -L * 0.03, L * 0.02);
  g.strokeStyle = 'rgba(20,24,30,0.4)'; g.lineWidth = 1; g.beginPath(); g.arc(L * 0.28, 0, L * 0.06, -1.1, 1.1); g.stroke();
  g.restore();
}

/** A grasshopper, side on round (x, y), `L` px nose to wing tip: a long
    green body under folded wings, the great hind leg's thigh angled up and
    its shin kicked down (crouched) or thrown straight out behind (in the
    air), the short forelegs, the antennae swept back. */
export function grasshopper(g, x, y, L, P, { leap = 0, land = 0, spin = 0, ring = null } = {}) {
  const E = env(), s = Math.max(0, Math.min(1, leap)), d = Math.max(0, Math.min(1, land)), ext = s * (1 - d * 0.7);
  const body = E.night ? '#7a9a2a' : '#a8d030', bodyLo = E.night ? '#4a6218' : '#5e8a1a', wing = E.night ? '#7a7a3a' : '#c8c060', ink = 'rgba(20,30,10,0.7)';
  g.save(); g.translate(x, y); g.rotate(spin - 0.06 * s * (1 - d));
  // the far legs, darker
  leg(g, [{ x: L * 0.12, y: L * 0.06 }, { x: L * 0.2, y: L * 0.16 }], L * 0.025, bodyLo);
  // the hind leg: thigh up and back from the hip, shin down to the foot; straightened out in the air
  const hip = { x: -L * 0.05, y: L * 0.04 }, kn = { x: hip.x - L * lerp(0.3, 0.42, ext), y: hip.y - L * lerp(0.16, 0.02, ext) };
  const ft = { x: kn.x + L * lerp(0.26, -0.3, ext), y: kn.y + L * lerp(0.28, 0.06, ext) };
  leg(g, [hip, kn], L * 0.07 + 3, ink); leg(g, [kn, ft], L * 0.025 + 3, ink);
  leg(g, [hip, kn], L * 0.07, bodyLo); leg(g, [kn, ft], L * 0.025, bodyLo);
  // the body: head, thorax, the long abdomen
  const gr = g.createLinearGradient(0, -L * 0.1, 0, L * 0.1); gr.addColorStop(0, body); gr.addColorStop(1, bodyLo);
  g.fillStyle = gr; g.beginPath(); g.ellipse(-L * 0.08, L * 0.02, L * 0.34, L * 0.075, 0, 0, TAU); g.fill();
  g.strokeStyle = ink; g.lineWidth = 1.5; g.stroke();
  g.beginPath(); g.ellipse(L * 0.3, -L * 0.01, L * 0.1, L * 0.09, 0, 0, TAU); g.fill(); g.stroke();
  // the wings folded along the back
  g.fillStyle = withAlpha(wing, 0.9); g.beginPath(); g.moveTo(L * 0.18, -L * 0.05); g.quadraticCurveTo(-L * 0.2, -L * 0.12, -L * 0.46, -L * 0.02); g.quadraticCurveTo(-L * 0.15, -L * 0.02, L * 0.18, -L * 0.01); g.closePath(); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.25); g.stroke();
  // the near hind thigh over the body, striped
  leg(g, [hip, kn], L * 0.08 + 3, ink); leg(g, [hip, kn], L * 0.08, body);
  g.strokeStyle = withAlpha(bodyLo, 0.9); g.lineWidth = 1; for (let i = 1; i < 4; i++) { const u = i / 4; g.beginPath(); g.arc(lerp(hip.x, kn.x, u), lerp(hip.y, kn.y, u), L * 0.03, 0, Math.PI); g.stroke(); }
  // forelegs, the eye, the antennae
  leg(g, [{ x: L * 0.22, y: L * 0.05 }, { x: L * 0.26 + L * 0.06 * s, y: L * 0.16 }], L * 0.025, bodyLo);
  eye(g, L * 0.34, -L * 0.03, L * 0.03);
  g.strokeStyle = bodyLo; g.lineWidth = 1; g.beginPath(); g.moveTo(L * 0.36, -L * 0.08); g.quadraticCurveTo(L * 0.3, -L * 0.3, L * 0.1, -L * 0.36); g.stroke();
  g.restore();
  ringed(g, x, y, L, ring);
}

/** A flea, side on round (x, y), `L` px long, drawn large to be seen: a
    flattened dark-brown body in shiny plates, a small head, and the long
    jumping legs folded under it, or flung out behind in the air. */
export function flea(g, x, y, L, P, { leap = 0, land = 0, spin = 0, ring = null } = {}) {
  const E = env(), s = Math.max(0, Math.min(1, leap)), d = Math.max(0, Math.min(1, land)), ext = s * (1 - d * 0.7);
  const shell = E.night ? '#3a2a22' : '#4a3226', shellLo = E.night ? '#1a120e' : '#22160f', limb = '#2a1c14';
  g.save(); g.translate(x, y); g.rotate(spin);
  // the long jumping legs from the back, folded under or flung out behind; the others under it
  const hip = { x: -L * 0.12, y: L * 0.12 }, kn = { x: hip.x + L * lerp(0.08, -0.3, ext), y: hip.y + L * lerp(0.16, 0.04, ext) }, ft = { x: kn.x + L * lerp(0.3, -0.32, ext), y: kn.y + L * lerp(0.06, 0.1, ext) };
  leg(g, [hip, kn, ft], L * 0.05, limb);
  for (const a of [0.02, 0.16]) leg(g, [{ x: L * a, y: L * 0.14 }, { x: L * (a + 0.07), y: L * 0.28 }, { x: L * (a + 0.13), y: L * 0.3 }], L * 0.035, limb);
  // the body: taller than long, hunched forward, in glossy plates with a cool sheen
  const gr = g.createRadialGradient(-L * 0.08, -L * 0.18, L * 0.03, 0, -L * 0.02, L * 0.36); gr.addColorStop(0, '#9aa0aa'); gr.addColorStop(0.3, shell); gr.addColorStop(1, shellLo);
  g.fillStyle = gr; g.beginPath(); g.ellipse(-L * 0.04, -L * 0.03, L * 0.26, L * 0.3, 0.35, 0, TAU); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.55); g.lineWidth = 1.2; g.stroke();
  g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.ellipse(-L * 0.04, -L * 0.03, L * 0.26, L * 0.3, 0.35, -0.6 + i * 0.5, 0.2 + i * 0.5); g.stroke(); }
  // the small head, low at the front, its mouthparts and eye
  g.fillStyle = shell; g.beginPath(); g.ellipse(L * 0.22, L * 0.12, L * 0.08, L * 0.07, 0.5, 0, TAU); g.fill(); g.stroke();
  leg(g, [{ x: L * 0.27, y: L * 0.17 }, { x: L * 0.28, y: L * 0.27 }], L * 0.02, limb);
  eye(g, L * 0.24, L * 0.1, L * 0.022);
  g.restore();
  ringed(g, x, y, L, ring);
}

/** A grey squirrel: grey-brown, a pale belly line, small pointed ears and
    the great bushy tail streaming out behind. */
export function squirrel(g, x, y, L, P, o = {}) {
  const E = env();
  quadruped(g, x, y, L, { ...o, fur: E.night ? '#7a787a' : '#9a9690', furLo: E.night ? '#4e4c4e' : '#66625c', ears: 'pointed', tail: { plume: true, edge: E.night ? '#b8b4ac' : '#e2ded6' }, snout: 0.3, rump: (g2, back, hb, len) => {
    g2.fillStyle = E.night ? '#a8a49c' : '#e8e2d6'; g2.beginPath(); g2.ellipse(back.x + len * 0.55, back.y + hb * 0.6, len * 0.35, hb * 0.3, 0, 0, TAU); g2.fill();
  } });
  ringed(g, x, y, L, o.ring);
}
/** A rabbit: soft brown-grey, its long ears laid back as it springs, a
    white scut of a tail. */
export function rabbit(g, x, y, L, P, o = {}) {
  const E = env(), s = Math.max(0, Math.min(1, o.leap ?? 0));
  quadruped(g, x, y, L, { ...o, fur: E.night ? '#7a6e62' : '#a89482', furLo: E.night ? '#4e463e' : '#6e6052', ears: 'none', tail: null, snout: 0.25, head: (g2, hx, hy, hr) => {
    for (const dx of [-0.25, 0.05]) { g2.save(); g2.translate(hx + hr * dx, hy - hr * 0.5); g2.rotate(-0.9 - s * 0.6); g2.fillStyle = E.night ? '#7a6e62' : '#a89482'; g2.beginPath(); g2.ellipse(0, -hr * 0.9, hr * 0.28, hr * 1.0, 0, 0, TAU); g2.fill(); g2.fillStyle = E.night ? '#8a6a6a' : '#d8a8a0'; g2.beginPath(); g2.ellipse(0, -hr * 0.9, hr * 0.12, hr * 0.7, 0, 0, TAU); g2.fill(); g2.restore(); }
  }, rump: (g2, back, hb) => { g2.fillStyle = E.night ? '#b8b4ac' : '#f4f2ee'; g2.beginPath(); g2.arc(back.x - hb * 0.5, back.y - hb * 0.3, L * 0.06, 0, TAU); g2.fill(); } });
  ringed(g, x, y, L, o.ring);
}
/** A penguin, `L` px tall: black back and head, white front, a yellow flash
    at the neck and a dark beak; it leaps head first, flippers swept back,
    and stands upright, flippers out, before and after. */
export function penguin(g, x, y, L, P, { leap = 0, land = 0, spin = 0, ring = null, head = 0, wet = false } = {}) {
  // head first along its heading in the air; into the water it stays in its dive (and goes under)
  const E = env(), s = Math.max(0, Math.min(1, leap)), d = wet ? 0 : Math.max(0, Math.min(1, land)), fly = s * (1 - d);
  g.save(); g.translate(x, y); g.rotate(spin + fly * (head + Math.PI / 2));
  const back = E.night ? '#0e1014' : '#1b1d22', front = E.night ? '#c8ccd2' : '#f6f8fa';
  // the feet, dark, under it
  g.fillStyle = '#3a3e46'; for (const dx of [-0.08, 0.06]) { g.beginPath(); g.ellipse(L * dx + L * 0.04, L * 0.42, L * 0.07, L * 0.025, 0, 0, TAU); g.fill(); }
  // the body: a black back, the white front over it
  g.fillStyle = back; g.beginPath(); g.ellipse(0, L * 0.05, L * 0.2, L * 0.38, 0, 0, TAU); g.fill();
  g.fillStyle = front; g.beginPath(); g.ellipse(L * 0.06, L * 0.1, L * 0.13, L * 0.3, 0, 0, TAU); g.fill();
  // the flippers: out to balance standing, swept back in the leap
  g.fillStyle = back;
  for (const side of [1]) { g.save(); g.translate(-L * 0.02, -L * 0.08); g.rotate(side * lerp(0.35, -0.6, fly)); g.beginPath(); g.ellipse(-L * 0.02, L * 0.16, L * 0.045, L * 0.17, 0, 0, TAU); g.fill(); g.restore(); }
  // the head, the yellow flash, the beak and the eye
  g.fillStyle = back; g.beginPath(); g.arc(L * 0.02, -L * 0.33, L * 0.12, 0, TAU); g.fill();
  g.fillStyle = '#f2c21b'; g.beginPath(); g.ellipse(L * 0.08, -L * 0.25, L * 0.05, L * 0.03, -0.4, 0, TAU); g.fill();
  g.fillStyle = '#2b2a2e'; g.beginPath(); g.moveTo(L * 0.12, -L * 0.35); g.lineTo(L * 0.24, -L * 0.32); g.lineTo(L * 0.12, -L * 0.3); g.closePath(); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(L * 0.07, -L * 0.36, L * 0.025, 0, TAU); g.fill(); g.fillStyle = '#1b1a1c'; g.beginPath(); g.arc(L * 0.075, -L * 0.36, L * 0.012, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, L * 0.05, L * 0.2, L * 0.38, 0, 0, TAU); g.stroke();
  g.restore();
  if (ring) { g.strokeStyle = ring; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, y, L * 0.3, L * 0.5, 0, 0, TAU); g.stroke(); }
}

export const ANIMALS = { cat, dog, monkey, frog, kangaroo, goat, grasshopper, flea, squirrel, rabbit, penguin };
/** What leaps from the water and swims along its path, drawn along it. */
export const SWIMMERS = { dolphin, fish };
/** How far below its middle each one's feet reach, as a fraction of L: the
    stage stands it on the edge and the ground with this. */
export const FEET = { cat: 0.38, dog: 0.38, monkey: 0.44, frog: 0.24, kangaroo: 0.33, goat: 0.4, grasshopper: 0.17, flea: 0.32, squirrel: 0.38, rabbit: 0.38, penguin: 0.44 };
