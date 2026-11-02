// props.js — the small things a question throws, kicks, drops or knocks off:
// a football, a tennis ball, a golf ball, a basketball, a shot, a snowball, a
// water balloon, a phone, a book, a hammer. Each is drawn round the engine's
// point (x, y), `R` px in radius (or half its length), turned by `spin`,
// lit from the upper left like every figure, with a dark rim so it reads
// over any backdrop. A `ring` colour tells B from A. Nothing here is a
// quantity: the colours are the things' own, held away from the physics hues.

import { env } from './scenery.js';

const TAU = Math.PI * 2;

/** A shaded sphere: the base for every ball, lit from the upper left. */
function sphere(g, x, y, R, light, mid, dark) {
  const gr = g.createRadialGradient(x - R * 0.35, y - R * 0.38, R * 0.08, x, y, R);
  gr.addColorStop(0, light); gr.addColorStop(0.55, mid); gr.addColorStop(1, dark);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
}
const rim = (g, x, y, R, c = 'rgba(0,0,0,0.55)') => { g.strokeStyle = c; g.lineWidth = Math.max(1, R * 0.12); g.beginPath(); g.arc(x, y, R, 0, TAU); g.stroke(); };
const ringed = (g, x, y, R, ring) => { if (ring) { g.strokeStyle = ring; g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, R + 3.5, 0, TAU); g.stroke(); } };

/** A football: white panels with dark pentagons, turning. */
function football(g, x, y, R, spin) {
  sphere(g, x, y, R, '#ffffff', '#e9e6e1', '#a9a49d');
  g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip();
  g.fillStyle = '#2b2628';
  const pent = (cx, cy, s, a) => { g.beginPath(); for (let i = 0; i < 5; i++) { const t = a + (i / 5) * TAU; g.lineTo(cx + Math.cos(t) * s, cy + Math.sin(t) * s); } g.closePath(); g.fill(); };
  pent(x, y, R * 0.34, spin);
  for (let i = 0; i < 5; i++) { const t = spin + (i / 5) * TAU + Math.PI / 5; pent(x + Math.cos(t) * R * 0.95, y + Math.sin(t) * R * 0.95, R * 0.28, t); }
  g.restore(); rim(g, x, y, R);
}
/** A tennis ball: felt yellow-green with its curving white seam. */
function tennisBall(g, x, y, R, spin) {
  sphere(g, x, y, R, '#f4ffa8', '#d4e84a', '#8ea52c');
  g.save(); g.translate(x, y); g.rotate(spin); g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = Math.max(1.2, R * 0.16);
  g.beginPath(); g.arc(-R * 0.9, 0, R * 0.75, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(R * 0.9, 0, R * 0.75, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
  g.restore(); rim(g, x, y, R, 'rgba(60,70,20,0.6)');
}
/** A golf ball: white with dimples. */
function golfBall(g, x, y, R) {
  sphere(g, x, y, R, '#ffffff', '#f0eeea', '#b6b2ab');
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = R * (0.25 + (i % 3) * 0.22); g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, Math.max(0.8, R * 0.11), 0, TAU); g.fill(); }
  rim(g, x, y, R, 'rgba(0,0,0,0.4)');
}
/** A basketball: orange pebbled leather with its black seams. */
function basketball(g, x, y, R, spin) {
  sphere(g, x, y, R, '#f6a35c', '#d76a24', '#8a3e12');
  g.save(); g.translate(x, y); g.rotate(spin); g.strokeStyle = '#2b1a10'; g.lineWidth = Math.max(1, R * 0.1);
  g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.stroke(); g.beginPath(); g.moveTo(0, -R); g.lineTo(0, R); g.stroke();
  g.beginPath(); g.arc(-R * 1.25, 0, R * 0.95, -0.75, 0.75); g.stroke(); g.beginPath(); g.arc(R * 1.25, 0, R * 0.95, Math.PI - 0.75, Math.PI + 0.75); g.stroke();
  g.restore(); rim(g, x, y, R, 'rgba(40,20,5,0.6)');
}
/** A shot: a dark iron sphere with a hard highlight. */
function shot(g, x, y, R) {
  sphere(g, x, y, R, '#a6a9ad', '#55595e', '#1f2225');
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.arc(x - R * 0.35, y - R * 0.38, R * 0.16, 0, TAU); g.fill();
  rim(g, x, y, R, 'rgba(0,0,0,0.7)');
}
/** A snowball: packed snow, lumpy, with blue shade underneath. */
function snowball(g, x, y, R) {
  sphere(g, x, y, R, '#ffffff', '#eef4fa', '#a9bccd');
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 6; i++) { const a = i * 1.1; g.beginPath(); g.arc(x + Math.cos(a) * R * 0.85, y + Math.sin(a) * R * 0.85, R * 0.22, 0, TAU); g.fill(); }
  rim(g, x, y, R, 'rgba(80,110,140,0.45)');
}
/** A water balloon: a stretched, glossy drop with its knot, wobbling. */
function waterBalloon(g, x, y, R, spin) {
  const wob = 1 + Math.sin(spin * 3) * 0.08;
  g.save(); g.translate(x, y); g.rotate(spin * 0.3); g.scale(wob, 1 / wob);
  const gr = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
  gr.addColorStop(0, '#b9e6ff'); gr.addColorStop(0.6, '#3d9bd6'); gr.addColorStop(1, '#1d5a86');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -R * 1.15); g.bezierCurveTo(R * 1.1, -R * 0.9, R * 1.05, R * 0.95, 0, R); g.bezierCurveTo(-R * 1.05, R * 0.95, -R * 1.1, -R * 0.9, 0, -R * 1.15); g.fill();
  g.fillStyle = '#1d5a86'; g.beginPath(); g.moveTo(-R * 0.15, -R * 1.12); g.lineTo(R * 0.15, -R * 1.12); g.lineTo(0, -R * 1.35); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-R * 0.35, -R * 0.4, R * 0.18, R * 0.3, -0.4, 0, TAU); g.fill();
  g.restore();
}
/** A phone: a dark slab with its screen catching the light, turning. */
function phone(g, x, y, R, spin, { cracked = false } = {}) {
  const E = env(), w = R * 1.1, h = R * 2;
  g.save(); g.translate(x, y); g.rotate(spin);
  g.fillStyle = '#1b1c20'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, R * 0.22); g.fill();
  const sg = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  sg.addColorStop(0, E.night ? '#3d5a78' : '#6f9ccc'); sg.addColorStop(1, '#1f2e44');
  g.fillStyle = sg; g.beginPath(); g.roundRect(-w / 2 + 2, -h / 2 + 3, w - 4, h - 6, R * 0.15); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(-w / 2 + 2, -h / 2 + 3); g.lineTo(w * 0.1, -h / 2 + 3); g.lineTo(-w / 2 + 2, h * 0.1); g.closePath(); g.fill();
  if (cracked) {
    // the screen starred from where it struck
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.9;
    const cx = w * 0.1, cy = h * 0.2;
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3, L = R * (0.6 + (i % 3) * 0.35); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * L * 0.5 + 1, cy + Math.sin(a) * L * 0.5); g.lineTo(cx + Math.cos(a + 0.2) * L, cy + Math.sin(a + 0.2) * L); g.stroke(); }
  }
  g.restore();
}
/** A book: a hardback, its cover and the pages' edge showing, turning. */
function book(g, x, y, R, spin) {
  const w = R * 2.2, h = R * 1.6;
  g.save(); g.translate(x, y); g.rotate(spin);
  g.fillStyle = '#f2ebdc'; g.fillRect(-w / 2 + 2, -h / 2 + 2, w - 3, h - 2);
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.8; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(-w / 2 + 3, -h / 2 + 2 + (i * h) / 4.5); g.lineTo(w / 2 - 2, -h / 2 + 2 + (i * h) / 4.5); g.stroke(); }
  g.fillStyle = '#7b2f3a'; g.fillRect(-w / 2, -h / 2, w, h * 0.22); g.fillRect(-w / 2, -h / 2, w * 0.12, h);
  g.fillStyle = '#d4af5f'; g.fillRect(-w / 2 + w * 0.2, -h / 2 + h * 0.06, w * 0.5, h * 0.06);
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.strokeRect(-w / 2, -h / 2, w, h);
  g.restore();
}
/** A claw hammer: a wooden handle and a steel head, tumbling. */
function hammer(g, x, y, R, spin) {
  const L = R * 2.6;
  g.save(); g.translate(x, y); g.rotate(spin);
  const hg = g.createLinearGradient(0, -R * 0.2, 0, R * 0.2); hg.addColorStop(0, '#c99a68'); hg.addColorStop(1, '#7e5735');
  g.fillStyle = hg; g.beginPath(); g.roundRect(-L / 2, -R * 0.16, L * 0.8, R * 0.32, R * 0.12); g.fill();
  g.fillStyle = '#5e646b'; g.fillRect(L * 0.25, -R * 0.55, R * 0.42, R * 1.1);
  g.fillStyle = '#8c939b'; g.fillRect(L * 0.25, -R * 0.55, R * 0.42, R * 0.18);
  g.strokeStyle = '#5e646b'; g.lineWidth = R * 0.18; g.beginPath(); g.moveTo(L * 0.25 + R * 0.2, R * 0.55); g.quadraticCurveTo(L * 0.25 - R * 0.3, R * 0.9, L * 0.25 - R * 0.5, R * 0.7); g.stroke();
  g.restore();
}

/** Every prop, by the registry's figure name. */
/** A rugby ball: a leather oval, end over end with `spin`, its laces and seams. */
function rugbyBall(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(spin);
  const gr = g.createRadialGradient(-R * 0.4, -R * 0.35, R * 0.1, 0, 0, R * 1.5);
  gr.addColorStop(0, '#f4f1ea'); gr.addColorStop(0.6, '#dcd6ca'); gr.addColorStop(1, '#8a8478');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, R * 1.45, R * 0.95, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = Math.max(1, R * 0.1); g.stroke();
  g.strokeStyle = '#2f5fa8'; g.lineWidth = Math.max(1, R * 0.16); g.beginPath(); g.ellipse(0, 0, R * 1.45, R * 0.5, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = Math.max(1, R * 0.08); g.beginPath(); g.moveTo(-R * 0.45, -R * 0.2); g.lineTo(R * 0.45, -R * 0.2); g.stroke();
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * R * 0.2, -R * 0.32); g.lineTo(i * R * 0.2, -R * 0.08); g.stroke(); }
  g.restore();
}
/** A cricket ball: deep cherry leather, its raised seam stitched white. */
function cricketBall(g, x, y, R, spin) {
  sphere(g, x, y, R, '#c45a6e', '#7a1a2e', '#3a0a14');
  g.save(); g.translate(x, y); g.rotate(spin);
  g.strokeStyle = 'rgba(255,240,230,0.9)'; g.lineWidth = Math.max(1, R * 0.1);
  for (const o of [-R * 0.14, R * 0.14]) { g.beginPath(); g.ellipse(0, 0, R * 0.98, Math.abs(o) * 1.4 + 0.5, 0, 0, TAU); g.stroke(); }
  g.restore(); rim(g, x, y, R, 'rgba(30,0,8,0.6)');
}
/** A baseball: white leather, its red stitches curving in two figure-of-eight halves. */
function baseball(g, x, y, R, spin) {
  sphere(g, x, y, R, '#ffffff', '#efebe4', '#a9a49d');
  g.save(); g.translate(x, y); g.rotate(spin); g.strokeStyle = '#b5303a'; g.lineWidth = Math.max(1, R * 0.11); g.setLineDash([Math.max(1.2, R * 0.15), Math.max(1, R * 0.1)]);
  g.beginPath(); g.arc(-R * 0.95, 0, R * 0.72, -0.95, 0.95); g.stroke(); g.beginPath(); g.arc(R * 0.95, 0, R * 0.72, Math.PI - 0.95, Math.PI + 0.95); g.stroke();
  g.restore(); rim(g, x, y, R, 'rgba(0,0,0,0.45)');
}
/** A volleyball: white, blue and yellow panels curving round it. */
function volleyball(g, x, y, R, spin) {
  sphere(g, x, y, R, '#ffffff', '#eeeae4', '#a9a49d');
  g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip(); g.translate(x, y); g.rotate(spin);
  for (const [a, c] of [[0, '#2f5fa8'], [TAU / 3, '#f2c21b'], [(2 * TAU) / 3, '#2f5fa8']]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a, a + 0.9); g.quadraticCurveTo(Math.cos(a + 0.45) * R * 0.3, Math.sin(a + 0.45) * R * 0.3, 0, 0); g.fill(); }
  g.restore();
  const sg = g.createRadialGradient(x - R * 0.35, y - R * 0.38, R * 0.1, x, y, R); sg.addColorStop(0, 'rgba(255,255,255,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0.3)'); g.fillStyle = sg; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  rim(g, x, y, R, 'rgba(0,0,0,0.45)');
}

export const PROPS = { football, tennisBall, golfBall, basketball, shot, snowball, waterBalloon, phone, book, hammer, rugbyBall, cricketBall, baseball, volleyball };

/** Draw a prop by name at (x, y), R px, turned by spin, ringed for B. */
export function drawProp(g, kind, x, y, R, spin = 0, ring = null, o = {}) {
  const f = PROPS[kind];
  if (!f) return false;
  f(g, x, y, R, spin, o);
  ringed(g, x, y, R * (kind === 'phone' || kind === 'book' || kind === 'hammer' ? 1.2 : 1), ring);
  return true;
}
