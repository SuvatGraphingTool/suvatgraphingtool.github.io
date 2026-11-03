// vehicles.js — more things that move for the composer, each drawn as itself:
// a bus, a tractor, a speedboat, a jet ski, a skier, a snowboarder, a horse
// and its rider. Each is `(g, X, Y, L, P, { phase, ring, airborne })` as
// figures.js draws its own: its front at X, what it stands or runs on at Y,
// `L` px long, facing right; `phase` turns its wheels or moves its legs, a
// `ring` outlines B to tell it from A, `airborne` tucks what hangs below and
// drops the ground shadow. Lit from the upper left, coloured away from the
// three quantity hues. Nothing here is a quantity.

import { env, softShadow } from './scenery.js';
import { withAlpha } from './util.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

/** A wheel at (x, y), radius R: a tyre, a hub in `hub`, spokes turned by `phase`. */
function wheel(g, x, y, R, phase, hub = '#9aa0a8', spokes = 5) {
  g.fillStyle = '#1d1e22'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.fillStyle = hub; g.beginPath(); g.arc(x, y, R * 0.55, 0, TAU); g.fill();
  g.strokeStyle = withAlpha('#000000', 0.35); g.lineWidth = Math.max(1, R * 0.08);
  for (let i = 0; i < spokes; i++) { const a = phase + (i / spokes) * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.5); g.stroke(); }
  g.fillStyle = withAlpha('#ffffff', 0.25); g.beginPath(); g.arc(x - R * 0.25, y - R * 0.25, R * 0.18, 0, TAU); g.fill();
}
function outline(g, ring) { if (ring) { g.strokeStyle = ring; g.lineWidth = 2.4; g.stroke(); } else { g.strokeStyle = 'rgba(20,18,22,0.5)'; g.lineWidth = 1.1; g.stroke(); } }
const person = (E) => ({ skin: E.night ? '#b08a74' : '#d9a988', skinLo: E.night ? '#7d6253' : '#b5876a', hair: '#3a2c26' });

/** A single-deck bus: a long blue body with a white roof band, a row of
    windows, the door at the front, the driver's screen, two axles. */
export function bus(g, X, Y, L, P, { phase = 0, ring = null, airborne = false } = {}) {
  const E = env(), H = L * 0.3, R = L * 0.055, base = Y - R * 0.9;
  if (!airborne) softShadow(g, X - L * 0.5, Y + 1, L * 0.55, L * 0.05, 0.9);
  const body = () => { g.beginPath(); g.moveTo(X - L, base); g.lineTo(X - L, base - H * 0.95); g.quadraticCurveTo(X - L, base - H, X - L + H * 0.08, base - H); g.lineTo(X - H * 0.12, base - H); g.quadraticCurveTo(X, base - H, X, base - H * 0.8); g.lineTo(X, base); g.closePath(); };
  const gr = g.createLinearGradient(0, base - H, 0, base); gr.addColorStop(0, E.night ? '#3b5a8a' : '#3d6fb8'); gr.addColorStop(1, E.night ? '#24385a' : '#284b80');
  body(); g.fillStyle = gr; g.fill(); outline(g, ring);
  g.save(); body(); g.clip();
  g.fillStyle = E.night ? '#c8ccd2' : '#f2f2f0'; g.fillRect(X - L, base - H, L, H * 0.14);
  // the windows, lit at night, and the windscreen
  const win = E.night ? withAlpha(E.window, 0.85) : '#a9c4dc';
  for (let x = X - L + L * 0.05; x < X - L * 0.2; x += L * 0.1) { g.fillStyle = win; g.fillRect(x, base - H * 0.78, L * 0.085, H * 0.36); g.fillStyle = withAlpha('#ffffff', 0.3); g.fillRect(x + 1, base - H * 0.76, L * 0.02, H * 0.3); }
  g.fillStyle = win; g.fillRect(X - L * 0.06, base - H * 0.82, L * 0.06, H * 0.5);
  // the door, its two leaves
  g.fillStyle = E.night ? '#1d2a3a' : '#2a3a50'; g.fillRect(X - L * 0.17, base - H * 0.8, L * 0.08, H * 0.78);
  g.strokeStyle = withAlpha('#ffffff', 0.4); g.lineWidth = 1; g.beginPath(); g.moveTo(X - L * 0.13, base - H * 0.8); g.lineTo(X - L * 0.13, base); g.stroke();
  g.fillStyle = withAlpha('#000000', 0.2); g.fillRect(X - L, base - H * 0.12, L, H * 0.12);
  g.restore();
  // lamps: white at the front, red at the back
  g.fillStyle = '#fff4c8'; g.fillRect(X - 3, base - H * 0.2, 3, H * 0.1);
  g.fillStyle = '#b0302a'; g.fillRect(X - L, base - H * 0.25, 3, H * 0.12);
  for (const x of [X - L * 0.82, X - L * 0.2]) wheel(g, x, Y - R, R, phase);
}

/** A tractor: a big rear wheel and a small front one, the bonnet over the
    engine, a glazed cab, an exhaust stack. Green with yellow hubs. */
export function tractor(g, X, Y, L, P, { phase = 0, ring = null, airborne = false } = {}) {
  const E = env(), Rb = L * 0.27, Rf = L * 0.15, green = E.night ? '#3a6030' : '#4f8a3a', greenLo = E.night ? '#28441f' : '#386628';
  if (!airborne) softShadow(g, X - L * 0.5, Y + 1, L * 0.5, L * 0.06, 0.9);
  const bx = X - L * 0.72, fx = X - L * 0.14;
  // the bonnet, low and long to the front
  const bon = () => { g.beginPath(); g.moveTo(bx + Rb * 0.6, Y - Rb * 1.0); g.lineTo(X - L * 0.02, Y - Rb * 0.95); g.quadraticCurveTo(X, Y - Rb * 0.9, X, Y - Rb * 0.6); g.lineTo(X, Y - Rf * 1.2); g.lineTo(bx + Rb * 0.6, Y - Rf * 1.2); g.closePath(); };
  bon(); const gr = g.createLinearGradient(0, Y - Rb, 0, Y - Rf); gr.addColorStop(0, green); gr.addColorStop(1, greenLo); g.fillStyle = gr; g.fill(); outline(g, ring);
  g.strokeStyle = withAlpha('#000000', 0.3); g.lineWidth = 1; for (let x = X - L * 0.1; x > bx + Rb; x -= L * 0.05) { g.beginPath(); g.moveTo(x, Y - Rb * 0.88); g.lineTo(x, Y - Rf * 1.3); g.stroke(); }
  // the cab: its frame and glass over the rear wheel
  const cx0 = bx - Rb * 0.7, cx1 = bx + Rb * 0.75, ct = Y - Rb * 2.4;
  g.fillStyle = green; g.fillRect(cx0, Y - Rb * 1.15, cx1 - cx0, Rb * 0.3);
  g.fillStyle = E.night ? withAlpha(E.window, 0.5) : withAlpha('#bcd6e6', 0.75); g.fillRect(cx0 + 2, ct + 3, cx1 - cx0 - 4, Y - Rb * 1.15 - ct - 3);
  g.strokeStyle = E.night ? '#1e2a1a' : '#2a3a22'; g.lineWidth = Math.max(1.6, L * 0.015); g.strokeRect(cx0, ct, cx1 - cx0, Y - Rb * 1.15 - ct);
  g.fillStyle = green; g.fillRect(cx0 - 2, ct - 3, cx1 - cx0 + 4, 4);
  // the driver, seen through the glass
  const C = person(E); g.fillStyle = C.skin; g.beginPath(); g.arc(lerp(cx0, cx1, 0.55), ct + (Y - Rb * 1.15 - ct) * 0.35, Rb * 0.18, 0, TAU); g.fill();
  // the exhaust stack
  g.fillStyle = '#2b2628'; g.fillRect(bx + Rb * 1.4, Y - Rb * 1.9, Math.max(2, L * 0.02), Rb * 0.95);
  wheel(g, bx, Y - Rb, Rb, phase, '#e8c547', 6);
  // the rear tyre's tread
  g.strokeStyle = withAlpha('#000000', 0.5); g.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const a = phase + (i / 12) * TAU; g.beginPath(); g.moveTo(bx + Math.cos(a) * Rb * 0.82, Y - Rb + Math.sin(a) * Rb * 0.82); g.lineTo(bx + Math.cos(a) * Rb, Y - Rb + Math.sin(a) * Rb); g.stroke(); }
  wheel(g, fx, Y - Rf, Rf, phase * (Rb / Rf), '#e8c547', 5);
}

/** A speedboat: a white hull with a dark stripe and a sharp bow, its
    windscreen, the driver, the outboard at the stern; Y is its waterline. */
export function speedboat(g, X, Y, L, P, { phase = 0, ring = null, airborne = false } = {}) {
  const E = env(), H = L * 0.16, deck = Y - H * 0.7;
  const hull = () => { g.beginPath(); g.moveTo(X - L, deck); g.lineTo(X - L * 0.25, deck); g.quadraticCurveTo(X - L * 0.05, deck, X, deck - H * 0.15); g.quadraticCurveTo(X - L * 0.2, Y + H * 0.35, X - L * 0.45, Y + H * 0.35); g.lineTo(X - L * 0.97, Y + H * 0.3); g.closePath(); };
  hull(); const gr = g.createLinearGradient(0, deck, 0, Y + H * 0.35); gr.addColorStop(0, E.night ? '#c8ccd2' : '#fbfbfa'); gr.addColorStop(1, E.night ? '#8a8e96' : '#c9ced4'); g.fillStyle = gr; g.fill(); outline(g, ring);
  g.save(); hull(); g.clip(); g.fillStyle = E.night ? '#2c3e5a' : '#1f3a6a'; g.beginPath(); g.moveTo(X - L, Y - H * 0.15); g.lineTo(X - L * 0.1, Y - H * 0.35); g.lineTo(X - L * 0.1, Y - H * 0.18); g.lineTo(X - L, Y + H * 0.02); g.closePath(); g.fill(); g.restore();
  // the windscreen and the driver behind it
  const C = person(E);
  g.fillStyle = E.night ? '#2a2e36' : '#3a4250'; g.beginPath(); g.arc(X - L * 0.52, deck - H * 1.0, H * 0.32, 0, TAU); g.fill();
  g.fillStyle = C.skin; g.beginPath(); g.arc(X - L * 0.5, deck - H * 1.0, H * 0.26, 0, TAU); g.fill();
  g.fillStyle = E.night ? '#c8b060' : '#e8c547'; g.fillRect(X - L * 0.58, deck - H * 0.75, L * 0.1, H * 0.75);
  // the windscreen: a raked pane in its frame, set across the deck
  g.fillStyle = withAlpha('#bcd6e6', 0.6); g.beginPath(); g.moveTo(X - L * 0.44, deck); g.lineTo(X - L * 0.4, deck - H * 0.75); g.lineTo(X - L * 0.33, deck - H * 0.75); g.lineTo(X - L * 0.3, deck); g.closePath(); g.fill();
  g.strokeStyle = '#2a2e36'; g.lineWidth = Math.max(1.2, L * 0.012); g.stroke();
  // the outboard at the stern, its propeller below
  g.fillStyle = '#2b2628'; g.beginPath(); g.roundRect(X - L * 1.06, deck - H * 0.7, L * 0.07, H * 1.0, 3); g.fill(); g.fillRect(X - L * 1.04, deck + H * 0.3, L * 0.025, H * 1.0);
  if (airborne) { const b = Math.cos(phase * 8) * H * 0.3; g.strokeStyle = '#5a5e66'; g.lineWidth = 2; g.beginPath(); g.moveTo(X - L * 1.03, Y + H * 0.6 - b); g.lineTo(X - L * 1.03, Y + H * 0.6 + b); g.stroke(); }
  // spray at the bow, on the water
  // the bow wave peeling off either side of the hull, as spray
  if (!airborne) { g.strokeStyle = withAlpha('#ffffff', 0.8); g.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const sx = X - L * (0.1 + i * 0.08), hh = H * (0.5 - i * 0.08) * (0.7 + 0.3 * Math.abs(Math.sin(phase * 6 + i))); g.beginPath(); g.moveTo(sx, Y); g.quadraticCurveTo(sx + L * 0.03, Y - hh, sx + L * 0.07, Y - hh * 0.4); g.stroke(); } }
}

/** A jet ski and its rider: a short white hull with a coloured top, the
    handlebars, the rider sitting astride; Y is its waterline. */
export function jetski(g, X, Y, L, P, { phase = 0, ring = null, airborne = false } = {}) {
  const E = env(), H = L * 0.2, C = person(E);
  const hull = () => { g.beginPath(); g.moveTo(X - L, Y - H * 0.6); g.lineTo(X - L * 0.3, Y - H * 0.75); g.quadraticCurveTo(X - L * 0.05, Y - H * 0.7, X, Y - H * 0.4); g.quadraticCurveTo(X - L * 0.2, Y + H * 0.35, X - L * 0.6, Y + H * 0.3); g.lineTo(X - L, Y + H * 0.2); g.closePath(); };
  hull(); g.fillStyle = E.night ? '#c8ccd2' : '#f6f6f4'; g.fill(); outline(g, ring);
  g.fillStyle = E.night ? '#3a4a6a' : '#2f5fa8'; g.beginPath(); g.moveTo(X - L * 0.75, Y - H * 0.62); g.lineTo(X - L * 0.25, Y - H * 0.78); g.quadraticCurveTo(X - L * 0.1, Y - H * 0.74, X - L * 0.08, Y - H * 0.6); g.lineTo(X - L * 0.75, Y - H * 0.45); g.closePath(); g.fill();
  // the rider: knees bent, hands on the bars, in a life jacket
  const hip = { x: X - L * 0.55, y: Y - H * 1.1 }, sh = { x: X - L * 0.45, y: Y - H * 2.6 }, hand = { x: X - L * 0.22, y: Y - H * 1.6 };
  g.strokeStyle = '#2f3340'; g.lineWidth = L * 0.07; g.lineCap = 'round'; g.beginPath(); g.moveTo(hip.x, hip.y); g.lineTo(X - L * 0.4, Y - H * 1.4); g.lineTo(X - L * 0.42, Y - H * 0.7); g.stroke();
  g.strokeStyle = E.night ? '#a89a50' : '#e8c547'; g.lineWidth = L * 0.11; g.beginPath(); g.moveTo(hip.x, hip.y); g.lineTo(sh.x, sh.y); g.stroke();
  g.strokeStyle = C.skin; g.lineWidth = L * 0.05; g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(hand.x, hand.y); g.stroke();
  g.strokeStyle = '#2b2628'; g.lineWidth = 2; g.beginPath(); g.moveTo(X - L * 0.25, Y - H * 0.75); g.lineTo(hand.x, hand.y); g.stroke();
  g.fillStyle = C.skin; g.beginPath(); g.arc(sh.x + L * 0.03, sh.y - H * 0.55, L * 0.07, 0, TAU); g.fill();
  if (!airborne) { g.fillStyle = withAlpha('#ffffff', 0.65); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(X - L * (1.05 + i * 0.08), Y - 2 - Math.abs(Math.sin(phase * 7 + i)) * H, H * 0.25, 0, TAU); g.fill(); } }
}

/** A skier crouched in the tuck: skis long under the boots, knees and hips
    bent, chest low, poles tucked under the arms; in the air the ski tips
    lift. Y is the skis' running surface. */
export function skier(g, X, Y, L, P, { ring = null, airborne = false } = {}) {
  const E = env(), C = person(E), Hp = L * 0.95, suit = ring || (E.night ? '#3a4a6a' : '#2f5fa8');
  if (!airborne) softShadow(g, X - L * 0.5, Y + 1, L * 0.5, L * 0.03, 0.8);
  const lift = airborne ? 0.12 : 0;
  // the skis, their tips turned up
  g.strokeStyle = E.night ? '#c8ccd2' : '#e8c547'; g.lineWidth = Math.max(2, L * 0.025); g.lineCap = 'round';
  g.save(); g.translate(X - L * 0.5, Y); g.rotate(-lift);
  g.beginPath(); g.moveTo(-L * 0.5, 0); g.lineTo(L * 0.45, 0); g.quadraticCurveTo(L * 0.5, 0, L * 0.52, -L * 0.04); g.stroke();
  g.restore();
  const foot = { x: X - L * 0.5, y: Y - L * 0.03 }, kneeP = { x: foot.x + Hp * 0.17, y: foot.y - Hp * 0.24 }, hip = { x: foot.x - Hp * 0.08, y: foot.y - Hp * 0.38 }, sh = { x: hip.x + Hp * 0.3, y: hip.y - Hp * 0.12 };
  g.strokeStyle = '#2b2628'; g.lineWidth = Hp * 0.08; g.beginPath(); g.moveTo(foot.x - Hp * 0.02, foot.y); g.lineTo(foot.x + Hp * 0.04, foot.y - Hp * 0.1); g.stroke();
  g.strokeStyle = suit; g.lineWidth = Hp * 0.1; g.lineJoin = 'round'; g.beginPath(); g.moveTo(foot.x, foot.y - Hp * 0.08); g.lineTo(kneeP.x, kneeP.y); g.lineTo(hip.x, hip.y); g.lineTo(sh.x, sh.y); g.stroke();
  // the arms forward, the poles tucked back under them
  const hand = { x: sh.x + Hp * 0.12, y: sh.y + Hp * 0.1 };
  g.strokeStyle = suit; g.lineWidth = Hp * 0.065; g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(hand.x, hand.y); g.stroke();
  g.strokeStyle = E.night ? '#8a8e96' : '#4a4e56'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hand.x, hand.y); g.lineTo(hand.x - Hp * 0.55, hand.y - Hp * 0.12); g.stroke();
  // the head in its helmet and goggles
  // a yellow helmet (white would vanish on snow), dark goggles
  g.fillStyle = '#e8c547'; g.beginPath(); g.arc(sh.x + Hp * 0.08, sh.y - Hp * 0.08, Hp * 0.075, 0, TAU); g.fill();
  g.strokeStyle = '#2b2628'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#2b2628'; g.fillRect(sh.x + Hp * 0.1, sh.y - Hp * 0.1, Hp * 0.06, Hp * 0.035);
  g.fillStyle = C.skin; g.fillRect(sh.x + Hp * 0.11, sh.y - Hp * 0.06, Hp * 0.04, Hp * 0.04);
}

/** A snowboarder side on: the board under both feet, knees bent, arms out
    for balance, grabbing the board's edge in the air. Y is the board's base. */
export function snowboarder(g, X, Y, L, P, { ring = null, airborne = false } = {}) {
  const E = env(), C = person(E), Hp = L * 1.05, jacket = ring || (E.night ? '#6a5a30' : '#e8c547');
  if (!airborne) softShadow(g, X - L * 0.5, Y + 1, L * 0.5, L * 0.03, 0.8);
  // the board, its ends turned up
  g.fillStyle = E.night ? '#3a4a6a' : '#2f5fa8'; g.beginPath(); g.roundRect(X - L, Y - L * 0.05, L, L * 0.05, L * 0.025); g.fill();
  const cx = X - L * 0.5, fb = { x: cx - L * 0.2, y: Y - L * 0.05 }, ff = { x: cx + L * 0.2, y: Y - L * 0.05 };
  const crouch = airborne ? 0.62 : 0.78, hip = { x: cx - Hp * 0.04, y: Y - Hp * 0.45 * crouch }, sh = { x: cx + Hp * 0.04, y: hip.y - Hp * 0.3 };
  g.strokeStyle = '#2f3340'; g.lineWidth = Hp * 0.09; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const f of [fb, ff]) { g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(lerp(f.x, hip.x, 0.5) + (f === ff ? Hp * 0.1 : -Hp * 0.04), lerp(f.y, hip.y, 0.5)); g.lineTo(hip.x, hip.y); g.stroke(); }
  g.strokeStyle = jacket; g.lineWidth = Hp * 0.14; g.beginPath(); g.moveTo(hip.x, hip.y); g.lineTo(sh.x, sh.y); g.stroke();
  // arms: out wide on the snow, one reaching down to grab the board in the air
  g.lineWidth = Hp * 0.06;
  const handF = airborne ? { x: ff.x - Hp * 0.02, y: ff.y - Hp * 0.04 } : { x: sh.x + Hp * 0.3, y: sh.y + Hp * 0.06 }, handB = { x: sh.x - Hp * 0.3, y: sh.y - Hp * 0.05 };
  for (const hnd of [handF, handB]) { g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(hnd.x, hnd.y); g.stroke(); }
  g.fillStyle = '#2b2628'; for (const hnd of [handF, handB]) { g.beginPath(); g.arc(hnd.x, hnd.y, Hp * 0.03, 0, TAU); g.fill(); }
  g.fillStyle = C.skin; g.beginPath(); g.arc(sh.x + Hp * 0.04, sh.y - Hp * 0.1, Hp * 0.07, 0, TAU); g.fill();
  g.fillStyle = E.night ? '#3a3a40' : '#4a4e56'; g.beginPath(); g.arc(sh.x + Hp * 0.04, sh.y - Hp * 0.13, Hp * 0.072, Math.PI, TAU); g.fill();
}

/** A horse and its rider, side on: a long body, an arched neck and head, a
    tail; its legs walking with `phase` on the ground, folded under it as it
    jumps; the rider forward in the saddle. Y is its hooves. */
export function horse(g, X, Y, L, P, { phase = 0, ring = null, airborne = false, tuck = airborne ? 1 : 0 } = {}) {
  // a dapple grey, clear of the velocity's orange
  const E = env(), C = person(E), coat = E.night ? '#6a6662' : '#a8a29a', coatLo = E.night ? '#4a4644' : '#7a746e', leg = L * 0.42, bodyY = Y - leg - L * 0.12;
  if (!airborne) softShadow(g, X - L * 0.5, Y + 1, L * 0.5, L * 0.05, 0.9);
  const hipX = X - L * 0.82, shX = X - L * 0.32;
  // legs: far pair darker; in the air folded, the forelegs tucked, the hind trailing
  // each leg eases from its stride on the ground to folded (forelegs) or
  // stretched back (hind legs) as it jumps, by `tuck`
  const tk = Math.max(0, Math.min(1, tuck)), mix = (a, b) => ({ x: a.x + (b.x - a.x) * tk, y: a.y + (b.y - a.y) * tk });
  const legAt = (x, front, far, i) => {
    const sw = Math.sin(phase * 3 + i * 1.6) * 0.35 * (1 - tk);
    const k0 = { x: x + Math.sin(sw) * leg * 0.45, y: bodyY + leg * 0.5 }, f0 = { x: k0.x + Math.sin(sw * 0.6) * leg * 0.4, y: Y };
    const k1 = front ? { x: x + L * 0.14, y: bodyY + leg * 0.32 } : { x: x - L * 0.14, y: bodyY + leg * 0.4 };
    const f1 = front ? { x: x + L * 0.04, y: bodyY + leg * 0.58 } : { x: x - L * 0.34, y: bodyY + leg * 0.6 };
    const k = mix(k0, k1), f = mix(f0, f1);
    g.strokeStyle = far ? coatLo : coat; g.lineWidth = L * 0.06; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, bodyY); g.lineTo(k.x, k.y); g.lineTo(f.x, f.y); g.stroke();
    g.fillStyle = '#2b2628'; g.beginPath(); g.arc(f.x, f.y - L * 0.01, L * 0.03, 0, TAU); g.fill();
  };
  legAt(hipX + L * 0.06, false, true, 0); legAt(shX - L * 0.04, true, true, 1);
  // the tail, the body, the neck and the head
  g.strokeStyle = E.night ? '#3a3634' : '#5a5450'; g.lineWidth = L * 0.04; g.beginPath(); g.moveTo(hipX - L * 0.04, bodyY - L * 0.08); g.quadraticCurveTo(hipX - L * 0.22, bodyY, hipX - L * 0.18, bodyY + L * 0.28); g.stroke();
  const gr = g.createLinearGradient(0, bodyY - L * 0.15, 0, bodyY + L * 0.12); gr.addColorStop(0, coat); gr.addColorStop(1, coatLo);
  g.fillStyle = gr; g.beginPath(); g.ellipse((hipX + shX) / 2, bodyY - L * 0.02, L * 0.3, L * 0.13, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(shX - L * 0.04, bodyY - L * 0.1); g.quadraticCurveTo(shX + L * 0.12, bodyY - L * 0.3, X - L * 0.12, bodyY - L * 0.42); g.lineTo(X - L * 0.04, bodyY - L * 0.36); g.lineTo(shX + L * 0.08, bodyY + L * 0.02); g.closePath(); g.fill();
  g.beginPath(); g.ellipse(X - L * 0.06, bodyY - L * 0.38, L * 0.1, L * 0.05, 0.5, 0, TAU); g.fill();
  if (ring) { g.strokeStyle = ring; g.lineWidth = 2.4; g.beginPath(); g.ellipse((hipX + shX) / 2, bodyY - L * 0.02, L * 0.3, L * 0.13, 0, 0, TAU); g.stroke(); }
  g.fillStyle = '#1b1a1c'; g.beginPath(); g.arc(X - L * 0.06, bodyY - L * 0.41, L * 0.012, 0, TAU); g.fill();
  // dapples on the coat, and the mane
  g.fillStyle = withAlpha('#ffffff', E.night ? 0.08 : 0.25); for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(hipX + L * (0.05 + (i % 3) * 0.13), bodyY - L * (0.06 - Math.floor(i / 3) * 0.05), L * 0.025, 0, TAU); g.fill(); }
  g.strokeStyle = E.night ? '#3a3634' : '#5a5450'; g.lineWidth = L * 0.03; g.beginPath(); g.moveTo(shX, bodyY - L * 0.14); g.quadraticCurveTo(shX + L * 0.12, bodyY - L * 0.32, X - L * 0.14, bodyY - L * 0.44); g.stroke();
  legAt(hipX + L * 0.12, false, false, 2); legAt(shX, true, false, 3);
  // the saddle and the rider, forward over the neck as it jumps
  const lean = 0.2 + 0.35 * tk, seat = { x: (hipX + shX) / 2 + L * 0.04, y: bodyY - L * 0.13 };
  g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(seat.x, seat.y + L * 0.02, L * 0.09, L * 0.035, 0, 0, TAU); g.fill();
  const sh = { x: seat.x + Math.sin(lean) * L * 0.3, y: seat.y - Math.cos(lean) * L * 0.3 };
  g.strokeStyle = '#e8e2d6'; g.lineWidth = L * 0.06; g.beginPath(); g.moveTo(seat.x, seat.y); g.lineTo(seat.x + L * 0.08, seat.y + L * 0.12); g.lineTo(seat.x + L * 0.02, seat.y + L * 0.2); g.stroke();
  g.strokeStyle = E.night ? '#3a4a6a' : '#2f3a5a'; g.lineWidth = L * 0.09; g.beginPath(); g.moveTo(seat.x, seat.y); g.lineTo(sh.x, sh.y); g.stroke();
  g.strokeStyle = C.skin; g.lineWidth = L * 0.035; g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(shX + L * 0.06, bodyY - L * 0.2); g.stroke();
  g.fillStyle = C.skin; g.beginPath(); g.arc(sh.x + L * 0.03, sh.y - L * 0.07, L * 0.05, 0, TAU); g.fill();
  g.fillStyle = '#1b1d22'; g.beginPath(); g.arc(sh.x + L * 0.03, sh.y - L * 0.09, L * 0.052, Math.PI, TAU); g.fill();
}

/** Each, by the registry's name, with where its middle is (the engine's
    point) as a fraction of its length above what it runs on. */
/** A monster truck: a pickup's body lifted high on its suspension over four
    huge treaded tyres, roll bar, the driver in the cab; blue with yellow
    stripes. */
export function monsterTruck(g, X, Y, L, P, { phase = 0, ring = null, airborne = false } = {}) {
  const E = env(), R = L * 0.21, blue = E.night ? '#2a3e6a' : '#2f5fa8', blueLo = E.night ? '#1a2848' : '#1e3e78';
  if (!airborne) softShadow(g, X - L * 0.5, Y + 1, L * 0.55, L * 0.06, 0.9);
  const rx = X - L * 0.78, fx = X - L * 0.22, axle = Y - R;
  // the suspension: struts and springs up from each axle to the chassis
  const ch = Y - R * 2.15;
  g.strokeStyle = E.night ? '#6a6e76' : '#8a9098'; g.lineWidth = Math.max(2, L * 0.02);
  for (const wx of [rx, fx]) { g.beginPath(); g.moveTo(wx, axle); g.lineTo(wx + R * 0.3, ch); g.moveTo(wx, axle); g.lineTo(wx - R * 0.3, ch); g.stroke(); g.strokeStyle = '#e8c547'; g.lineWidth = Math.max(1.5, L * 0.012); for (let i = 0; i < 4; i++) { const yy = lerp(axle, ch, (i + 0.5) / 4); g.beginPath(); g.moveTo(wx - R * 0.12, yy); g.lineTo(wx + R * 0.12, yy + 2); g.stroke(); } g.strokeStyle = E.night ? '#6a6e76' : '#8a9098'; g.lineWidth = Math.max(2, L * 0.02); }
  // the body: a pickup's bed behind, the cab, the bonnet to the front
  const top = ch - R * 1.1;
  const body = () => { g.beginPath(); g.moveTo(X - L, ch); g.lineTo(X - L, ch - R * 0.6); g.lineTo(X - L * 0.5, ch - R * 0.6); g.lineTo(X - L * 0.45, top); g.lineTo(X - L * 0.25, top); g.lineTo(X - L * 0.17, ch - R * 0.6); g.lineTo(X - L * 0.02, ch - R * 0.5); g.quadraticCurveTo(X, ch - R * 0.3, X, ch); g.closePath(); };
  body(); const gr = g.createLinearGradient(0, top, 0, ch); gr.addColorStop(0, blue); gr.addColorStop(1, blueLo); g.fillStyle = gr; g.fill(); outline(g, ring);
  g.fillStyle = '#e8c547'; g.fillRect(X - L * 0.98, ch - R * 0.38, L * 0.94, R * 0.12);
  g.fillStyle = E.night ? withAlpha(E.window, 0.5) : withAlpha('#bcd6e6', 0.85); g.beginPath(); g.moveTo(X - L * 0.43, top + 3); g.lineTo(X - L * 0.27, top + 3); g.lineTo(X - L * 0.21, ch - R * 0.62); g.lineTo(X - L * 0.43, ch - R * 0.62); g.closePath(); g.fill();
  const C = person(E); g.fillStyle = C.skin; g.beginPath(); g.arc(X - L * 0.33, top + (ch - top) * 0.32, R * 0.16, 0, TAU); g.fill();
  // the roll bar over the bed
  g.strokeStyle = '#2b2628'; g.lineWidth = Math.max(2, L * 0.018); g.beginPath(); g.moveTo(X - L * 0.9, ch - R * 0.6); g.lineTo(X - L * 0.85, top + R * 0.1); g.lineTo(X - L * 0.55, top + R * 0.1); g.lineTo(X - L * 0.52, ch - R * 0.6); g.stroke();
  // the great tyres, deep tread round them
  for (const wx of [rx, fx]) {
    wheel(g, wx, axle, R, phase, '#c8ccd2', 6);
    g.strokeStyle = withAlpha('#000000', 0.55); g.lineWidth = Math.max(1.5, R * 0.1); for (let i = 0; i < 14; i++) { const a = phase + (i / 14) * TAU; g.beginPath(); g.moveTo(wx + Math.cos(a) * R * 0.78, axle + Math.sin(a) * R * 0.78); g.lineTo(wx + Math.cos(a) * R, axle + Math.sin(a) * R); g.stroke(); }
  }
}

/** A snowmobile: its skis at the front, the rubber track under the back, a
    low cowl and windscreen, the rider astride it, bent forward. */
export function snowmobile(g, X, Y, L, P, { phase = 0, ring = null, airborne = false } = {}) {
  const E = env(), H = L * 0.16, body = E.night ? '#2a3e6a' : '#2f5fa8', dark = '#2b2628';
  if (!airborne) softShadow(g, X - L * 0.5, Y + 1, L * 0.5, L * 0.05, 0.8);
  // the ski: long, turned up at the tip
  g.strokeStyle = dark; g.lineWidth = Math.max(2, L * 0.02); g.lineCap = 'round';
  g.beginPath(); g.moveTo(X - L * 0.42, Y - 1); g.lineTo(X - L * 0.05, Y - 1); g.quadraticCurveTo(X + L * 0.02, Y - 1, X + L * 0.02, Y - H * 0.5); g.stroke();
  g.beginPath(); g.moveTo(X - L * 0.2, Y - 1); g.lineTo(X - L * 0.25, Y - H * 1.1); g.stroke();
  // the track: a belt round its wheels under the back
  const tx0 = X - L, tx1 = X - L * 0.45, ty = Y - H * 0.45;
  g.fillStyle = dark; g.beginPath(); g.roundRect(tx0, ty - H * 0.45, tx1 - tx0, H * 0.9, H * 0.45); g.fill();
  g.strokeStyle = withAlpha('#ffffff', 0.25); g.lineWidth = 1; for (let x = tx0 + ((phase * 6) % 6); x < tx1; x += 6) { g.beginPath(); g.moveTo(x, ty + H * 0.4); g.lineTo(x, ty + H * 0.45); g.stroke(); }
  for (const wx of [tx0 + H * 0.45, (tx0 + tx1) / 2, tx1 - H * 0.45]) { g.fillStyle = '#8a9098'; g.beginPath(); g.arc(wx, ty, H * 0.28, 0, TAU); g.fill(); }
  // the body: the cowl sloping to the nose, the seat behind, the windscreen
  const b = () => { g.beginPath(); g.moveTo(X - L * 0.98, ty - H * 0.5); g.lineTo(X - L * 0.55, ty - H * 0.55); g.lineTo(X - L * 0.35, ty - H * 1.3); g.quadraticCurveTo(X - L * 0.08, ty - H * 1.2, X, ty - H * 0.2); g.lineTo(X - L * 0.1, ty + H * 0.1); g.lineTo(X - L * 0.98, ty); g.closePath(); };
  b(); g.fillStyle = body; g.fill(); outline(g, ring);
  g.fillStyle = '#e8c547'; g.fillRect(X - L * 0.9, ty - H * 0.35, L * 0.5, H * 0.15);
  g.fillStyle = dark; g.fillRect(X - L * 0.9, ty - H * 0.85, L * 0.45, H * 0.35);
  g.fillStyle = withAlpha('#bcd6e6', 0.8); g.beginPath(); g.moveTo(X - L * 0.35, ty - H * 1.3); g.lineTo(X - L * 0.42, ty - H * 2.1); g.lineTo(X - L * 0.3, ty - H * 2.0); g.lineTo(X - L * 0.27, ty - H * 1.25); g.closePath(); g.fill();
  // the rider: astride, leaning forward to the bars, in a dark suit and helmet
  const C = person(E), hip = { x: X - L * 0.65, y: ty - H * 0.85 }, sh = { x: X - L * 0.5, y: ty - H * 2.6 }, hand = { x: X - L * 0.36, y: ty - H * 1.5 };
  g.strokeStyle = '#3a3e48'; g.lineWidth = H * 0.55; g.lineCap = 'round';
  g.beginPath(); g.moveTo(hip.x, hip.y); g.lineTo(X - L * 0.55, ty - H * 0.2); g.stroke();
  g.lineWidth = H * 0.7; g.beginPath(); g.moveTo(hip.x, hip.y); g.lineTo(sh.x, sh.y); g.stroke();
  g.lineWidth = H * 0.35; g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(hand.x, hand.y); g.stroke();
  g.fillStyle = '#e8eaee'; g.beginPath(); g.arc(sh.x + H * 0.25, sh.y - H * 0.55, H * 0.42, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = dark; g.beginPath(); g.arc(sh.x + H * 0.45, sh.y - H * 0.5, H * 0.2, -0.8, 0.8); g.fill();
  void C;
}

export const VEHICLES = {
  bus: { draw: bus, mid: 0.17 }, tractor: { draw: tractor, mid: 0.27 }, speedboat: { draw: speedboat, mid: 0.06 },
  jetski: { draw: jetski, mid: 0.2 }, skier: { draw: skier, mid: 0.25 }, snowboarder: { draw: snowboarder, mid: 0.35 }, horse: { draw: horse, mid: 0.6 },
  monsterTruck: { draw: monsterTruck, mid: 0.42 }, snowmobile: { draw: snowmobile, mid: 0.2 },
};
