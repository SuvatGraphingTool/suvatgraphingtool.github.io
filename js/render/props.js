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

/** A hailstone: a lump of clouded ice, layered, catching the light. */
function hailstone(g, x, y, R) {
  sphere(g, x, y, R, '#ffffff', '#dfeaf2', '#8fa6b8');
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, R * 0.55, 0, TAU); g.stroke();
  rim(g, x, y, R, 'rgba(60,90,120,0.6)');
}
/** A raindrop: a falling drop, round below, drawn out to a point above. */
function raindrop(g, x, y, R) {
  const gr = g.createRadialGradient(x - R * 0.3, y, R * 0.1, x, y, R * 1.2); gr.addColorStop(0, '#e8f4ff'); gr.addColorStop(0.6, '#7ab4e0'); gr.addColorStop(1, '#3a6a9a');
  g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - R * 2); g.quadraticCurveTo(x + R, y - R * 0.4, x + R, y + R * 0.1); g.arc(x, y + R * 0.1, R, 0, Math.PI); g.quadraticCurveTo(x - R, y - R * 0.4, x, y - R * 2); g.fill();
  g.strokeStyle = 'rgba(30,60,90,0.5)'; g.lineWidth = 1; g.stroke();
}

/** A discus: a flat disc seen almost edge on, tipped up a little, its steel
    rim catching the light and its dark centre plate, the glint turning. */
function discus(g, x, y, R, spin, { ang = -0.4 } = {}) {
  g.save(); g.translate(x, y); g.rotate(ang * 0.6);
  const gr = g.createLinearGradient(0, -R * 0.4, 0, R * 0.4); gr.addColorStop(0, '#e8eaee'); gr.addColorStop(0.5, '#9aa0a8'); gr.addColorStop(1, '#4a4e56');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, R, R * 0.36, 0, 0, TAU); g.fill();
  g.fillStyle = '#2b2a2e'; g.beginPath(); g.ellipse(0, -R * 0.03, R * 0.62, R * 0.2, 0, 0, TAU); g.fill();
  g.fillStyle = '#b8bcc2'; g.beginPath(); g.ellipse(0, -R * 0.05, R * 0.18, R * 0.07, 0, 0, TAU); g.fill();
  const q = Math.cos(spin * 3); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(q * R * 0.7, -R * 0.2, R * 0.16, R * 0.05, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = Math.max(1, R * 0.1); g.beginPath(); g.ellipse(0, 0, R, R * 0.36, 0, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, R + 1.5, R * 0.36 + 1.5, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.restore();
}
/** A frisbee: a yellow flying disc, its domed top lit, the lip's shadow
    under it and the rings moulded in it, the glint turning as it spins. */
function frisbee(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(-0.12);
  g.fillStyle = '#9a7a10'; g.beginPath(); g.ellipse(0, R * 0.08, R, R * 0.3, 0, 0, TAU); g.fill();
  const gr = g.createLinearGradient(0, -R * 0.45, 0, R * 0.2); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(1, '#f2c21b');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, -R * 0.02, R * 0.98, R * 0.32, 0, Math.PI, TAU); g.ellipse(0, -R * 0.02, R * 0.98, R * 0.12, 0, 0, Math.PI); g.fill();
  g.strokeStyle = 'rgba(120,90,10,0.6)'; g.lineWidth = 1; for (const f of [0.45, 0.7]) { g.beginPath(); g.ellipse(0, -R * 0.08, R * f, R * 0.3 * f, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
  const q = Math.sin(spin * 2.5); g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(q * R * 0.5, -R * 0.22, R * 0.14, R * 0.05, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(80,60,0,0.7)'; g.lineWidth = Math.max(1, R * 0.08); g.beginPath(); g.ellipse(0, R * 0.04, R, R * 0.3, 0, 0, TAU); g.stroke();
  g.restore();
}
/** Something long and thin pointed along its flight: `ang` the angle of
    its velocity on the canvas (radians, clockwise from the right). */
const along = (g, x, y, ang, draw) => { g.save(); g.translate(x, y); g.rotate(ang ?? 0); draw(); g.restore(); };
/** A dart: its steel point, a knurled tungsten barrel, the shaft and blue
    flights, pointing along its flight; struck point first where it lands. */
function dart(g, x, y, R, spin, { ang = 0 } = {}) {
  const L = R * 2.2;
  along(g, x, y, ang, () => {
    g.strokeStyle = '#c8ccd2'; g.lineWidth = Math.max(1, R * 0.08); g.beginPath(); g.moveTo(L * 0.25, 0); g.lineTo(L * 0.5, 0); g.stroke();
    const gr = g.createLinearGradient(0, -R * 0.14, 0, R * 0.14); gr.addColorStop(0, '#d8dce2'); gr.addColorStop(1, '#4a4e56');
    const bt = Math.max(1.6, R * 0.13); g.fillStyle = gr; g.beginPath(); g.roundRect(-L * 0.08, -bt, L * 0.34, bt * 2, bt * 0.6); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 0.8; for (let i = 0; i < 5; i++) { const xx = -L * 0.04 + i * L * 0.055; g.beginPath(); g.moveTo(xx, -bt); g.lineTo(xx, bt); g.stroke(); }
    g.strokeStyle = '#2b2a2e'; g.lineWidth = Math.max(1.2, R * 0.1); g.beginPath(); g.moveTo(-L * 0.08, 0); g.lineTo(-L * 0.38, 0); g.stroke();
    g.fillStyle = '#2f5fa8'; g.strokeStyle = '#173a70'; g.lineWidth = 1;
    for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(-L * 0.18, 0); g.lineTo(-L * 0.44, sgn * R * 0.75); g.lineTo(-L * 0.55, sgn * R * 0.75); g.lineTo(-L * 0.5, 0); g.closePath(); g.fill(); g.stroke(); }
  });
}
/** A shuttlecock: the cork nose in its white cap leading, the skirt of
    feathers flaring behind it, pointing along its flight. */
function shuttlecock(g, x, y, R, spin, { ang = 0 } = {}) {
  along(g, x, y, ang, () => {
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.strokeStyle = 'rgba(80,80,90,0.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(R * 0.35, -R * 0.32); g.lineTo(-R * 1.2, -R * 0.85); g.lineTo(-R * 1.2, R * 0.85); g.lineTo(R * 0.35, R * 0.32); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(80,80,90,0.45)'; for (const f of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(R * 0.35, f * R * 0.3); g.lineTo(-R * 1.2, f * R * 0.85); g.stroke(); }
    g.fillStyle = '#2f5fa8'; g.fillRect(R * 0.25, -R * 0.36, R * 0.12, R * 0.72);
    const gr = g.createRadialGradient(R * 0.6, -R * 0.15, R * 0.05, R * 0.55, 0, R * 0.45); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#c9c4ba');
    g.fillStyle = gr; g.beginPath(); g.arc(R * 0.5, 0, R * 0.4, -Math.PI / 2, Math.PI / 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.stroke();
  });
}
/** A hockey ball: hard white plastic, dimpled. */
function hockeyBall(g, x, y, R) {
  sphere(g, x, y, R, '#ffffff', '#f2f0ea', '#b0aca4');
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = 0; i < 7; i++) { const a = i * 2.6, rr = R * (0.3 + (i % 2) * 0.3); g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, Math.max(1, R * 0.14), 0, TAU); g.fill(); }
  rim(g, x, y, R, 'rgba(0,0,0,0.45)');
}
/** An egg: smooth, cream-white, broader below, turning as it falls. */
function egg(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(spin * 0.6);
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R * 1.2); gr.addColorStop(0, '#fffdf6'); gr.addColorStop(0.6, '#f0e6d2'); gr.addColorStop(1, '#b8a888');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, -R * 1.2); g.bezierCurveTo(R * 0.85, -R * 1.15, R * 0.95, R * 0.95, 0, R * 0.95); g.bezierCurveTo(-R * 0.95, R * 0.95, -R * 0.85, -R * 1.15, 0, -R * 1.2); g.fill();
  g.strokeStyle = 'rgba(90,70,40,0.55)'; g.lineWidth = Math.max(1, R * 0.1); g.stroke();
  g.restore();
}
/** A bullet: a grey lead round in its brass case's shape, pointing along its
    flight, a faint streak of air behind it. */
function bullet(g, x, y, R, spin, { ang = 0 } = {}) {
  along(g, x, y, ang, () => {
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-R * 1.1, 0); g.lineTo(-R * 3.2, 0); g.stroke();
    const gr = g.createLinearGradient(0, -R * 0.4, 0, R * 0.4); gr.addColorStop(0, '#d8dce2'); gr.addColorStop(0.45, '#7a7e86'); gr.addColorStop(1, '#2e3136');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-R, -R * 0.38); g.lineTo(R * 0.2, -R * 0.38); g.quadraticCurveTo(R * 0.95, -R * 0.3, R * 1.1, 0); g.quadraticCurveTo(R * 0.95, R * 0.3, R * 0.2, R * 0.38); g.lineTo(-R, R * 0.38); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.65)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.moveTo(-R * 0.55, -R * 0.38); g.lineTo(-R * 0.55, R * 0.38); g.stroke();
  });
}

/** A brick: a yellow London stock brick tumbling end over end, its long face
    and its end lit, a frog pressed in its top. */
function brick(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(spin * 0.8);
  const L = R * 2, H = R * 0.75, D = R * 0.4;
  g.fillStyle = '#b89a62'; g.beginPath(); g.moveTo(-L / 2, -H / 2); g.lineTo(-L / 2 + D, -H / 2 - D * 0.6); g.lineTo(L / 2 + D, -H / 2 - D * 0.6); g.lineTo(L / 2, -H / 2); g.closePath(); g.fill();
  g.fillStyle = '#8e7448'; g.beginPath(); g.moveTo(L / 2, -H / 2); g.lineTo(L / 2 + D, -H / 2 - D * 0.6); g.lineTo(L / 2 + D, H / 2 - D * 0.6); g.lineTo(L / 2, H / 2); g.closePath(); g.fill();
  const gr = g.createLinearGradient(0, -H / 2, 0, H / 2); gr.addColorStop(0, '#d8bc84'); gr.addColorStop(1, '#a88a56');
  g.fillStyle = gr; g.fillRect(-L / 2, -H / 2, L, H);
  g.fillStyle = 'rgba(60,40,20,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(-L / 2 + ((i * 37) % 10) / 10 * L, -H / 2 + ((i * 53) % 10) / 10 * H, 1.5, 1.2);
  g.strokeStyle = 'rgba(40,30,15,0.9)'; g.lineWidth = 1.5; g.strokeRect(-L / 2, -H / 2, L, H);
  g.restore();
}
/** A coconut: a hairy brown husk, darker underneath, its three eyes. */
function coconut(g, x, y, R, spin) {
  sphere(g, x, y, R, '#8a6a46', '#5a4228', '#2e2014');
  g.save(); g.translate(x, y); g.rotate(spin);
  g.strokeStyle = 'rgba(160,130,90,0.55)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { const a = i * 0.63; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3); g.lineTo(Math.cos(a + 0.3) * R * 0.95, Math.sin(a + 0.3) * R * 0.95); g.stroke(); }
  g.fillStyle = '#1e140c'; for (const a of [0, 2.1, 4.2]) { g.beginPath(); g.arc(Math.cos(a) * R * 0.18 - R * 0.2, Math.sin(a) * R * 0.18 - R * 0.2, Math.max(0.8, R * 0.08), 0, TAU); g.fill(); }
  g.restore(); rim(g, x, y, R, 'rgba(20,12,6,0.6)');
}

/** A bottle: clear glass with a green tint, its label, the neck and cap,
    tumbling, a highlight down its side. */
function bottle(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(spin * 0.7);
  const L = R * 2.2, W = R * 0.75;
  g.fillStyle = 'rgba(95,154,108,0.9)'; g.beginPath(); g.roundRect(-L / 2, -W / 2, L * 0.68, W, W * 0.3); g.fill();
  g.beginPath(); g.moveTo(L * 0.18, -W / 2); g.quadraticCurveTo(L * 0.3, -W * 0.2, L * 0.36, -W * 0.18); g.lineTo(L * 0.5, -W * 0.18); g.lineTo(L * 0.5, W * 0.18); g.lineTo(L * 0.36, W * 0.18); g.quadraticCurveTo(L * 0.3, W * 0.2, L * 0.18, W / 2); g.closePath(); g.fill();
  g.fillStyle = '#e8e4dc'; g.fillRect(-L * 0.3, -W / 2, L * 0.3, W);
  g.fillStyle = '#2f5fa8'; g.fillRect(-L * 0.26, -W * 0.2, L * 0.22, W * 0.4);
  g.fillStyle = '#c8ccd2'; g.fillRect(L * 0.47, -W * 0.22, L * 0.05, W * 0.44);
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-L * 0.45, -W * 0.38, L * 0.6, W * 0.1);
  g.strokeStyle = 'rgba(30,60,40,0.7)'; g.lineWidth = 1; g.beginPath(); g.roundRect(-L / 2, -W / 2, L * 0.68, W, W * 0.3); g.stroke();
  g.restore();
}
/** A drink can: aluminium, a coloured wrap, its ring-pull top, tumbling. */
function can(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(spin * 0.8);
  const L = R * 1.7, W = R * 1.05;
  const gr = g.createLinearGradient(0, -W / 2, 0, W / 2); gr.addColorStop(0, '#5a8ad8'); gr.addColorStop(0.35, '#2f5fa8'); gr.addColorStop(1, '#173a70');
  g.fillStyle = gr; g.fillRect(-L / 2, -W / 2, L, W);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(-L / 2, -W * 0.3, L, W * 0.12);
  g.fillStyle = '#f2c21b'; g.fillRect(-L * 0.18, -W * 0.18, L * 0.3, W * 0.36);
  g.strokeStyle = 'rgba(10,20,40,0.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-L / 2, -W / 2); g.lineTo(L / 2, -W / 2); g.moveTo(-L / 2, W / 2); g.lineTo(L / 2, W / 2); g.stroke();
  // the lids: silver ellipses with a rim, the ring-pull on one
  for (const e of [-L / 2, L / 2]) { g.fillStyle = '#d8dce2'; g.beginPath(); g.ellipse(e, 0, L * 0.09, W / 2, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(60,66,76,0.85)'; g.stroke(); }
  g.strokeStyle = '#8a9098'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(L / 2 + L * 0.02, -W * 0.12, L * 0.04, W * 0.12, 0, 0, TAU); g.stroke();
  g.restore();
}
/** A key: a brass bow with its hole, the shank and the cut bit, turning. */
function key(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(spin);
  const L = R * 2;
  g.fillStyle = '#c9a13a'; g.strokeStyle = 'rgba(70,50,10,0.8)'; g.lineWidth = 1;
  g.beginPath(); g.arc(-L * 0.3, 0, R * 0.55, 0, TAU); g.arc(-L * 0.3, 0, R * 0.2, 0, TAU, true); g.fill('evenodd'); g.stroke();
  g.beginPath(); g.moveTo(-L * 0.05, -R * 0.14); g.lineTo(L * 0.5, -R * 0.14); g.lineTo(L * 0.5, R * 0.3); g.lineTo(L * 0.42, R * 0.3); g.lineTo(L * 0.38, R * 0.14); g.lineTo(L * 0.3, R * 0.3); g.lineTo(L * 0.24, R * 0.14); g.lineTo(-L * 0.05, R * 0.14); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, -R * 0.1, L * 0.4, R * 0.06);
  g.restore();
}
/** A pencil: yellow hexagonal body, the sharpened point, a pink eraser in
    its metal band, spinning end over end. */
function pencil(g, x, y, R, spin) {
  g.save(); g.translate(x, y); g.rotate(spin * 1.2);
  const L = R * 2.6, W = R * 0.36;
  g.fillStyle = '#f2c21b'; g.fillRect(-L / 2 + L * 0.14, -W / 2, L * 0.66, W);
  g.fillStyle = '#c89a10'; g.fillRect(-L / 2 + L * 0.14, W * 0.1, L * 0.66, W * 0.4);
  g.fillStyle = '#e8d0a0'; g.beginPath(); g.moveTo(L * 0.3, -W / 2); g.lineTo(L / 2, 0); g.lineTo(L * 0.3, W / 2); g.closePath(); g.fill();
  g.fillStyle = '#2b2a2e'; g.beginPath(); g.moveTo(L * 0.44, -W * 0.15); g.lineTo(L / 2, 0); g.lineTo(L * 0.44, W * 0.15); g.closePath(); g.fill();
  g.fillStyle = '#b8bcc2'; g.fillRect(-L / 2 + L * 0.06, -W / 2, L * 0.08, W);
  g.fillStyle = '#f0b49a'; g.beginPath(); g.roundRect(-L / 2, -W / 2, L * 0.07, W, W * 0.3); g.fill();
  g.strokeStyle = 'rgba(60,40,0,0.7)'; g.lineWidth = 1; g.strokeRect(-L / 2, -W / 2, L * 0.8, W);
  g.restore();
}

export const PROPS = { football, tennisBall, golfBall, basketball, shot, snowball, waterBalloon, phone, book, hammer, rugbyBall, cricketBall, baseball, volleyball, hailstone, raindrop, discus, frisbee, dart, shuttlecock, hockeyBall, egg, bullet, brick, coconut, bottle, can, key, pencil };

/** Draw a prop by name at (x, y), R px, turned by spin, ringed for B. */
export function drawProp(g, kind, x, y, R, spin = 0, ring = null, o = {}) {
  const f = PROPS[kind];
  if (!f) return false;
  f(g, x, y, R, spin, o);
  ringed(g, x, y, R * (['phone', 'book', 'hammer', 'dart', 'discus', 'frisbee', 'bullet', 'shuttlecock', 'bottle', 'can', 'key', 'pencil'].includes(kind) ? 1.2 : 1), ring);
  return true;
}
