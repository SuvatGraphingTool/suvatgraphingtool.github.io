// backdrops.js — the places the two staged scenarios happen in.
//
// These are drawn onto the exhibit PLATE (see exhibit.js), not onto the themed
// canvas, so they take their colours from the plate rather than from
// css/tokens.css. The plate is dark in both themes because both scenarios are
// photographs: a strobe lamp firing in a blacked-out range, and a beach at
// dusk. Light mode changes the page around the plate, not the plate.
//
// Everything here is background. If you notice it before you notice the
// trajectory, it is wrong — so it is held to low chroma, and the only warm
// saturated thing on the plate is the projectile itself.

/**
 * The box each place wants kept in frame, in metres.
 *
 * `yTop` is doing real work. A bullet dropping 1.5 m sets a vertical scale at
 * which the fall is a scratch; asking for 2.2 m of headroom sets one at which
 * it is a readable curve. The flight is never cropped — this only ever widens
 * the frame.
 */
import { PALM_H } from './exhibit.js';

export const EXTENT = {
  warehouse: { x0: -4.5, x1: 9, yTop: 2.4 },   // room at the left for the rig
  beach:     { x0: -2.5, x1: 7, yTop: 12 },   // the content widens it from here
  // The jungle has to hold the whole tree, because the tree stands still and
  // the monkey moves about on it — a frame cropped to the monkey would swing
  // every time you picked a different branch.
  jungle:    { x0: -2.5, x1: 19, yTop: 15 },
};

/* ── shared marks ──────────────────────────────────────────────────────── */

const grad = (g, x0, y0, x1, y1, stops) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [at, col] of stops) gr.addColorStop(at, col);
  return gr;
};

/** A tick reads `120`, or `0.5` when the marks are closer together than a metre. */
const fmtTick = (x, step) => (step < 1 ? x.toFixed(1) : String(Math.round(x)));

/** Deterministic jitter — the same pebble is the same pebble on every repaint. */
const rnd = (i) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };

/* ══ the range ══════════════════════════════════════════════════════════
   Almost nothing: a floor, a barrel and the clamp that lets the second round
   go. A test range is a dark room with one lamp, and every object that is not
   the two bullets is competition. */

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function warehouseBack(g, S, box, o) {
  const { PLATE } = o;
  const gy = S.groundY;

  // the floor, catching a little of the flash
  g.fillStyle = grad(g, 0, gy, 0, box.y + box.h, [[0, 'rgba(255,255,255,0.055)'], [1, 'rgba(255,255,255,0.012)']]);
  g.fillRect(box.x, gy, box.w, box.y + box.h - gy);

  // The downrange ruler. Its stride comes from how much floor is IN VIEW, not
  // from how far away the far end is: a two-metre chase window and a
  // five-hundred-metre survey both want about a dozen marks, and keying off
  // S.xHi gave the chase window one mark every twenty metres — which is none.
  const span = S.xSpan ?? (S.xHi - (S.xLo ?? 0));
  const stepX = span > 140 ? 20 : span > 60 ? 10 : span > 18 ? 5 : span > 4 ? 1 : 0.5;
  // Walk only the marks that can land in this frame.
  const from = Math.max(0, Math.floor(((S.xLo ?? 0) / stepX)) * stepX);
  const to = Math.min(S.xHi * 1.02, (S.xLo ?? 0) + span * 1.02);
  g.save();
  for (let x = from; x <= to; x += stepX) {
    const X = S.X(x);
    if (X < box.x || X > box.x + box.w) continue;
    g.strokeStyle = PLATE.ruleFaint; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X, gy); g.lineTo(X, gy + 9); g.stroke();
    // Label them. Evenly spaced ticks on an axis squeezed 32x read as metres
    // unless they say what they are. The right-hand margin only has to stop a
    // label running off this frame's edge; it used to be 150 fixed pixels,
    // which in a narrow pane deleted nearly all of them.
    if (x > 0 && X < box.x + box.w - Math.min(60, box.w * 0.1)) {
      g.font = `600 13px ${getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui'}`;
      g.fillStyle = PLATE.inkFaint; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText(`${fmtTick(x, stepX)} m`, X, gy + 12);
    }
  }
  g.restore();

  // the back wall, a hair lighter than the air so the barrel has something
  // to sit against
  const wx = S.X((S.xLo ?? EXTENT.warehouse.x0) + 0.5);
  g.fillStyle = 'rgba(255,255,255,0.028)';
  g.fillRect(box.x, box.y, Math.max(0, wx - box.x), gy - box.y);

  rig(g, S, o, PLATE);
}

/** The barrel, the bench and the release clamp — all at the launch height. */
function rig(g, S, o, PLATE) {
  const y = S.Y(o.launchY), x = S.X(0);
  const m = (v) => Math.max(1, S.m(v));                 // metres → px, vertically
  const mx = (v) => (S.mx ? S.mx(v) : S.m(v));          // metres → px, across
  const bore = Math.max(3, m(0.09));

  // bench leg down to the floor
  // The post stands WELL to one side, in screen pixels rather than metres: a
  // released round falls straight down the bore line, and any bar drawn near
  // that line gets read as part of the experiment. 54 px is clear of the
  // column at every scale this plate is ever drawn at.
  g.fillStyle = 'rgba(255,255,255,0.03)';
  const px0 = x - 54;
  g.fillRect(px0 - 2, y, 4, S.groundY - y);
  g.fillRect(px0 - 16, S.groundY - 4, 32, 4);
  g.fillRect(px0 - 14, y - 7, 60, 7);                 // the bench top, to the muzzle

  // barrel, running back off the left edge of the plate
  //
  // ACROSS the frame, so it is measured with the HORIZONTAL scale. It used to
  // use `m`, which is the vertical one, and got away with it only because the
  // two were a factor of thirty apart and the result was then clamped to the
  // room's left wall — a 3.4 m barrel came out two pixels long. With square
  // pixels the mistake is visible, so the barrel is now a barrel: 0.62 m,
  // with a pixel floor for the squeezed frame where that is a hairline.
  const barL = Math.max(64, mx(0.62));
  const bar = grad(g, 0, y - bore, 0, y + bore,
    [[0, PLATE.leadHi], [0.3, PLATE.lead], [1, PLATE.leadLo]]);
  g.fillStyle = bar;
  g.fillRect(x - barL, y - bore * 0.5, barL, bore);
  // muzzle brake: three ports and a crown
  const port = Math.max(2, mx(0.018)), gap = Math.max(5, mx(0.05));
  g.fillStyle = PLATE.leadLo;
  for (let i = 1; i <= 3; i++) g.fillRect(x - gap * i * 1.6, y - bore * 0.5, port, bore * 0.42);
  g.fillStyle = PLATE.lead;
  g.fillRect(x - Math.max(3, mx(0.03)), y - bore * 0.78, Math.max(4, mx(0.036)), bore * 1.56);

  // the clamp that holds the dropped round, directly above the bore line
  const cy = y - m(0.55);
  g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = Math.max(1.2, m(0.03));
  g.beginPath(); g.moveTo(x, cy); g.lineTo(x, y - bore * 0.7); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.14)';
  const jaw = Math.max(6, mx(0.1));
  g.fillRect(x - jaw / 2, cy - m(0.1), jaw, m(0.1));

  // MUZZLE FLASH — two frames at 60 fps, which is all a real one lasts.
  //
  // Sized in SCREEN PIXELS, not metres. The vertical scale on this plate is
  // enormous (the whole frame is about two metres tall), so a flash measured
  // in metres came out as a white star across a quarter of the picture.
  if (o.fired && o.t < 0.1) {
    const k = 1 - o.t / 0.1, r = 7 + 13 * k;
    g.save(); g.globalAlpha = k;
    const gl = g.createRadialGradient(x, y, 0, x, y, r * 2.6);
    gl.addColorStop(0, 'rgba(255,244,214,0.88)');
    gl.addColorStop(0.35, 'rgba(255,214,128,0.42)');
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 2.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,248,226,0.92)';
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = (i % 2 ? r * 0.38 : r * (0.8 + rnd(i) * 0.4)) * (i < 4 || i > 8 ? 1.25 : 0.85);
      const px = x + Math.cos(a) * rr * 1.6, py = y + Math.sin(a) * rr;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill(); g.restore();
  }
}

/* ══ the beach ══════════════════════════════════════════════════════════
   Dusk. One palm, drawn properly, standing exactly where the monkey is —
   drag the monkey and the tree goes with it, because a monkey that lets go
   has to have been holding something. */

export function beachBack(g, S, box, o) {
  const { PLATE, markers } = o;
  const gy = S.groundY;
  const horizon = S.Y(Math.max(0.6, S.yHi * 0.055));

  // sky: deep indigo above, a last band of warmth at the waterline
  g.fillStyle = grad(g, 0, box.y, 0, horizon,
    [[0, '#141d2e'], [0.55, '#243246'], [1, '#55506a']]);
  g.fillRect(box.x, box.y, box.w, horizon - box.y);
  g.fillStyle = grad(g, 0, horizon - S.m(2.2), 0, horizon,
    [[0, 'rgba(226,150,96,0)'], [1, 'rgba(232,160,96,0.42)']]);
  g.fillRect(box.x, horizon - S.m(2.2), box.w, S.m(2.2));

  // sea
  g.fillStyle = grad(g, 0, horizon, 0, gy, [[0, '#1b3140'], [1, '#12222d']]);
  g.fillRect(box.x, horizon, box.w, gy - horizon);
  g.save(); g.strokeStyle = 'rgba(214,180,150,0.20)'; g.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const y = horizon + (gy - horizon) * (0.1 + rnd(i) * 0.82);
    const x = box.x + rnd(i + 40) * box.w, len = 14 + rnd(i + 11) * 46;
    g.globalAlpha = 0.5 - (y - horizon) / (gy - horizon) * 0.3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(236,214,190,0.34)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(box.x, gy - 1); g.lineTo(box.x + box.w, gy - 1); g.stroke();

  // sand
  g.fillStyle = grad(g, 0, gy, 0, box.y + box.h,
    [[0, 'rgba(214,180,138,0.30)'], [1, 'rgba(120,96,70,0.22)']]);
  g.fillRect(box.x, gy, box.w, box.y + box.h - gy);
  g.save(); g.strokeStyle = 'rgba(255,236,206,0.10)'; g.lineWidth = 1;
  for (let i = 0; i < 22; i++) {
    const y = gy + (box.y + box.h - gy) * (0.12 + rnd(i + 3) * 0.8);
    const x = box.x + rnd(i + 70) * box.w;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + rnd(i) * 60, y); g.stroke();
  }
  g.restore();

  // two low rocks, for something to judge the sand against
  for (const [u, s] of [[-1.6, 0.5], [S.xHi * 0.62, 0.34]]) {
    const X = S.X(u), r = Math.max(3, S.m(s));
    g.fillStyle = 'rgba(166,150,132,0.30)';
    g.beginPath(); g.ellipse(X, gy - r * 0.35, r, r * 0.62, 0, 0, Math.PI * 2); g.fill();
  }

  // THE TREE, at the monkey. It is the thing the monkey lets go of, so it
  // follows the marker rather than standing in a fixed spot.
  if (markers?.target) palm(g, S, markers.target, PLATE);
  hunter(g, S, o, PLATE);
}

/** One palm: a leaning trunk with ring scars, a crown, and three coconuts. */
function palm(g, S, target, PLATE) {
  const m = (v) => Math.max(1, S.m(v));
  // A TREE IS A TREE. Tying the crown to the monkey made the palm change
  // height every time the monkey was dragged, so the one fixed object in the
  // frame stopped being fixed. It stands at PALM_H and the monkey hangs from
  // a branch at whatever height it is at.
  const H = Math.max(PALM_H, target.y + 1.6);
  const CX = target.x + 1.9;                 // off to one side, so the fall is
                                             // seen against sky, not against bark
  const botX = S.X(target.x + 3.1), botY = S.groundY;
  const topX = S.X(CX), topY = S.Y(H);
  const lw = Math.max(2.4, m(0.42));

  // trunk
  g.save();
  g.beginPath(); g.moveTo(botX, botY);
  g.quadraticCurveTo(S.X(CX + 1.5), S.Y(H * 0.5), topX, topY);
  g.strokeStyle = '#4a3a2a'; g.lineWidth = lw; g.lineCap = 'round'; g.stroke();
  g.strokeStyle = 'rgba(214,180,138,0.22)'; g.lineWidth = lw * 0.26;
  g.beginPath(); g.moveTo(botX - lw * 0.3, botY);
  g.quadraticCurveTo(S.X(CX + 1.5) - lw * 0.3, S.Y(H * 0.5), topX - lw * 0.3, topY);
  g.stroke();                                           // rim light down one side
  g.restore();
  for (let k = 0.12; k < 0.92; k += 0.16) {             // ring scars
    const tx = botX + (topX - botX) * k * k * 0.85 + (S.X(CX + 1.5) - botX) * 2 * k * (1 - k);
    const ty = botY + (topY - botY) * k;
    g.strokeStyle = 'rgba(0,0,0,0.20)'; g.lineWidth = Math.max(0.7, lw * 0.09);
    g.beginPath(); g.moveTo(tx - lw * 0.42, ty); g.lineTo(tx + lw * 0.42, ty); g.stroke();
  }

  // crown: nine fronds, the back ones darker
  for (let i = 0; i < 9; i++) {
    const a = (-168 + (i * 336) / 8 + (rnd(i * 5) - 0.5) * 12) * Math.PI / 180;
    const Lf = m(2.6 + rnd(i) * 1.5);
    const ex = topX + Math.cos(a) * Lf, ey = topY + Math.sin(a) * Lf * 0.6 + Lf * 0.4;
    const mx = topX + Math.cos(a) * Lf * 0.56, my = topY + Math.sin(a) * Lf * 0.48 - Lf * 0.17;
    const back = i % 3 === 2;
    g.strokeStyle = back ? '#1d3a2b' : '#2d5c3f';
    g.lineWidth = Math.max(1.6, m(0.2)); g.lineCap = 'round';
    g.beginPath(); g.moveTo(topX, topY); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    for (let k = 0.26; k < 1; k += 0.12) {              // leaflets
      const px = topX + (mx - topX) * 2 * k * (1 - k) + (ex - topX) * k * k;
      const py = topY + (my - topY) * 2 * k * (1 - k) + (ey - topY) * k * k;
      const s = m(0.5) * (1 - k * 0.45);
      g.lineWidth = Math.max(0.9, m(0.075));
      g.beginPath(); g.moveTo(px, py);
      g.lineTo(px - Math.cos(a) * s * 0.45, py + s); g.stroke();
    }
  }
  // THE BRANCH IT LETS GO OF. Without it the monkey hangs in mid-air and the
  // one thing the scenario turns on — that it was holding something — is lost.
  // It has to START ON THE TRUNK, or it reads as a frond floating in mid-air.
  // Walk the same quadratic the trunk is drawn along to find where the trunk
  // actually is at the monkey's height.
  const kT = clamp((botY - S.Y(target.y + 0.42)) / (botY - topY || 1), 0, 1);
  const cxT = S.X(CX + 1.5);
  const trunkX = (1 - kT) * (1 - kT) * botX + 2 * (1 - kT) * kT * cxT + kT * kT * topX;
  const by = S.Y(target.y + 0.42);
  g.strokeStyle = '#4a3a2a'; g.lineWidth = Math.max(2, m(0.16)); g.lineCap = 'round';
  g.beginPath(); g.moveTo(trunkX, by + m(0.25));
  g.quadraticCurveTo((trunkX + S.X(target.x)) / 2, by - m(0.3), S.X(target.x - 0.3), by);
  g.stroke();
  g.strokeStyle = '#2d5c3f'; g.lineWidth = Math.max(1.2, m(0.09));
  for (let i = 0; i < 3; i++) {                 // a few leaves, on the branch
    const k = 0.35 + i * 0.2, lx = trunkX + (S.X(target.x) - trunkX) * k;
    g.beginPath(); g.moveTo(lx, by - m(0.05)); g.lineTo(lx - m(0.18), by - m(0.4)); g.stroke();
  }

  // coconuts
  for (let i = 0; i < 3; i++) {
    const r = Math.max(1.6, m(0.16));
    g.fillStyle = '#3a2d20';
    g.beginPath(); g.arc(topX + (i - 1) * r * 2.1, topY + r * 1.9, r, 0, Math.PI * 2); g.fill();
  }
}

/** The hunter, and the dead-straight line of the aim. */
function hunter(g, S, o, PLATE) {
  const m = (v) => Math.max(1, S.m(v));
  const X0 = S.X(0), gy = S.groundY, mz = S.Y(o.launchY);
  const a = -(o.theta || 0) * Math.PI / 180;

  // THE LINE OF THE AIM, AND IT STAYS UP.
  //
  // It used to be drawn only while `!o.fired`, which took it off the screen
  // at the exact moment it starts being worth looking at. This line is where
  // the banana would go if NOTHING FELL, and the whole scenario is the
  // distance between that line and what actually happens: the banana sags
  // below it by ½gt², the monkey sags below the branch by the same ½gt², and
  // they meet. With the line gone there is nothing for either of them to sag
  // away from, and the demonstration is two objects converging for no visible
  // reason.
  //
  // It is also a RAY ALONG THE AIM rather than a segment to the monkey, so it
  // answers the angle rather than the marker: drag the angle and the line
  // swings with it, past the monkey and off the frame, which is what tells
  // you the aim has left the target.
  const reach = (box2) => {
    const far = Math.hypot(box2.w, box2.h) + Math.abs(box2.x) + Math.abs(box2.y);
    return { x: X0 + Math.cos(a) * far, y: mz + Math.sin(a) * far };
  };
  {
    const end = reach(o.box || { x: 0, y: 0, w: 4000, h: 4000 });
    g.save(); g.setLineDash([5, 5]);
    g.globalAlpha = o.fired ? 0.42 : 0.6;
    g.strokeStyle = PLATE.ink; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(X0, mz); g.lineTo(end.x, end.y); g.stroke();
    g.restore();
  }

  const hip = gy - m(0.95), head = m(0.115);
  g.save();
  g.strokeStyle = '#0d1016'; g.lineWidth = Math.max(2, m(0.11)); g.lineCap = 'round';
  g.beginPath();
  g.moveTo(X0 - m(0.24), gy); g.lineTo(X0, hip); g.lineTo(X0 + m(0.22), gy);
  g.moveTo(X0, hip); g.lineTo(X0, gy - m(1.5));
  g.stroke();
  g.fillStyle = '#0d1016';
  g.beginPath(); g.arc(X0, gy - m(1.5) - head, head, 0, Math.PI * 2); g.fill();
  // the launcher along the aim
  const sx0 = X0, sy0 = gy - m(1.38), Lb = m(1.05);
  g.strokeStyle = '#0d1016'; g.lineWidth = Math.max(2.2, m(0.09));
  g.beginPath();
  g.moveTo(sx0 - Math.cos(a) * m(0.28), sy0 - Math.sin(a) * m(0.28));
  g.lineTo(sx0 + Math.cos(a) * Lb, sy0 + Math.sin(a) * Lb); g.stroke();
  g.lineWidth = Math.max(1.6, m(0.07));
  g.beginPath(); g.moveTo(X0, gy - m(1.3));
  g.lineTo(sx0 + Math.cos(a) * m(0.62), sy0 + Math.sin(a) * m(0.62)); g.stroke();
  // a thin rim light so the silhouette does not vanish into the sand
  g.strokeStyle = 'rgba(232,180,128,0.45)'; g.lineWidth = Math.max(0.8, m(0.035));
  g.beginPath(); g.moveTo(X0 - head * 0.6, gy - m(1.5) - head * 1.2);
  g.lineTo(X0 - head * 0.9, gy - m(0.9)); g.stroke();
  g.restore();
}

/* ══ the jungle ═════════════════════════════════════════════════════════
   Midday, and it does not end.

   THE WHOLE THING IS ANCHORED IN WORLD METRES. The beach and the range are
   drawn across the pane in SCREEN space — `box.x + rnd(i) * box.w` — which is
   fine for a place you never leave, and wrong for one you pan through: every
   pebble slides with the viewport and the jungle swims. Every layer below
   instead walks a stride in METRES from `S.xLo` to `S.xHi` and hashes the
   slot index, so a bush at x = 31 m is the same bush at the same place at
   every zoom and after every drag, and panning reveals more jungle rather
   than running out of it.

   DISTANCE IS DRAWN AS DISTANCE. The sky, the clouds and the hills are far
   away, so their size is a fraction of the VISIBLE height and they barely
   move when you pan — zoom out and the hills stay hills. The canopy, the
   bushes and the ferns are near, so they are in metres and grow when you zoom
   in, like the tree and the monkey they stand with. That split is the only
   depth cue a flat drawing gets for free.

   AND IT STAYS BACKGROUND. Everything here is held under the rule at the top
   of this file: if you notice it before you notice the banana, it is wrong.
   The greens are deliberately desaturated as they recede and nothing in the
   whole scene is warm except the earth — the one saturated warm thing on the
   plate is the fruit in the air. */

export const JUNGLE = {
  sky0: '#3f93cf', sky1: '#86c3e4', sky2: '#cfe6ef',
  hillFar: '#8aa9a8', hillNear: '#5f8d78',
  canopyFar: '#2c5f41', canopyMid: '#35774a', canopyHi: '#479158',
  leafDark: '#1f5133', leaf: '#2f7a44', leafHi: '#53a85c', leafPale: '#7cc06a',
  trunk: '#6b4f35', trunkDark: '#43301f', trunkHi: '#8a6a45',
  vine: '#2b6b3e',
  earth: '#b08a56', earthDark: '#8a6a40', earthHi: '#c9a874',
  rock: '#9a938a',
};

/* A hash on a world slot. Two layers that walk the same stride must not agree
   with each other, so every call site passes its own salt. */
const hsh = (i, salt) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Walk world slots of width `step` across what is visible, plus a margin. */
function slots(S, step, margin = 2) {
  const i0 = Math.floor(S.xLo / step) - margin;
  const i1 = Math.ceil(S.xHi / step) + margin;
  return { i0, i1, n: i1 - i0 };
}

/* ── a mass of leaves ───────────────────────────────────────────────────
   A crown is not an ellipse. It is a dozen overlapping lobes with a lit top
   and a shaded underside, and the lobes are what make a silhouette read as
   foliage rather than as a balloon. `n` lobes are laid round the rim and one
   fills the middle; the top third gets the highlight. */
function leafMass(g, cx, cy, rx, ry, seed, dark, lit, n = 11) {
  g.save();
  g.fillStyle = dark;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jr = 0.62 + hsh(i, seed) * 0.42;
    const lx = cx + Math.cos(a) * rx * 0.58, ly = cy + Math.sin(a) * ry * 0.58;
    const lr = Math.min(rx, ry) * jr * 0.72;
    g.moveTo(lx + lr, ly);
    g.arc(lx, ly, lr, 0, Math.PI * 2);
  }
  g.moveTo(cx + rx * 0.72, cy); g.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
  g.fill();
  // the sun is overhead and a little to the left, as it is everywhere else
  g.fillStyle = lit;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.sin(a) > -0.12) continue;                 // upper lobes only
    const jr = 0.62 + hsh(i, seed) * 0.42;
    const lx = cx + Math.cos(a) * rx * 0.58 - rx * 0.06;
    const ly = cy + Math.sin(a) * ry * 0.58 - ry * 0.07;
    const lr = Math.min(rx, ry) * jr * 0.52;
    g.moveTo(lx + lr, ly);
    g.arc(lx, ly, lr, 0, Math.PI * 2);
  }
  g.fill();
  g.restore();
}

/** One frond: a rib with leaflets down both sides. Ferns and palms both. */
function frond(g, x, y, len, ang, col, wide, lw) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const mx = x + Math.cos(ang) * len * 0.55 - Math.sin(ang) * wide * 0.5;
  const my = y + Math.sin(ang) * len * 0.55 + Math.cos(ang) * wide * 0.5;
  g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = Math.max(1, lw);
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
  g.lineWidth = Math.max(0.8, lw * 0.62);
  for (let k = 0.18; k < 0.96; k += 0.11) {
    const px = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * mx + k * k * ex;
    const py = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * my + k * k * ey;
    const s = len * 0.3 * (1 - k * 0.55);
    const t = ang + Math.PI / 2;
    g.beginPath();
    g.moveTo(px, py); g.lineTo(px + Math.cos(t) * s * 0.8 + Math.cos(ang) * s * 0.5,
                              py + Math.sin(t) * s * 0.8 + Math.sin(ang) * s * 0.5);
    g.moveTo(px, py); g.lineTo(px - Math.cos(t) * s * 0.8 + Math.cos(ang) * s * 0.5,
                              py - Math.sin(t) * s * 0.8 + Math.sin(ang) * s * 0.5);
    g.stroke();
  }
}

export function jungleBack(g, S, box, o) {
  const { PLATE, markers } = o;
  const J = JUNGLE;
  const gy = S.groundY;
  const m = (v) => Math.max(0.5, S.m(v));
  const vis = box.y + box.h;

  /* ── sky ──────────────────────────────────────────────────────────── */
  const skyTop = box.y, skyBot = gy;
  const sky = g.createLinearGradient(0, skyTop, 0, skyBot);
  sky.addColorStop(0, J.sky0); sky.addColorStop(0.62, J.sky1); sky.addColorStop(1, J.sky2);
  g.fillStyle = sky; g.fillRect(box.x, box.y, box.w, box.h);

  /* ── clouds ───────────────────────────────────────────────────────────
     Far enough off that panning barely moves them: the slot is read at a
     fifth of the world rate, which is the cheapest honest parallax there is. */
  const H = Math.max(40, gy - box.y);                   // visible height, px
  const cloudStep = 26;
  {
    const q = slots(S, cloudStep, 1);
    g.save(); g.fillStyle = 'rgba(255,255,255,0.80)';
    for (let i = q.i0; i <= q.i1; i++) {
      if (hsh(i, 3) > 0.62) continue;
      const wx = (i + hsh(i, 5) * 0.7) * cloudStep;
      const X = S.X(wx * 0.2 + S.xLo * 0.8);            // parallax: distant
      const Y = box.y + H * (0.07 + hsh(i, 7) * 0.26);
      const r = H * (0.028 + hsh(i, 11) * 0.03);
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI - Math.PI * 0.08;
        const lx = X + (k - 2) * r * 1.05;
        const ly = Y - Math.sin(a) * r * 0.5;
        g.moveTo(lx + r * (0.7 + hsh(i + k, 13) * 0.5), ly);
        g.arc(lx, ly, r * (0.7 + hsh(i + k, 13) * 0.5), 0, Math.PI * 2);
      }
      g.fill();
    }
    g.restore();
  }

  /* ── two ranges of hills ──────────────────────────────────────────────
     Sized as a fraction of the visible height, so they keep their apparent
     size through a zoom the way something ten kilometres off actually does. */
  const ridge = (amp, base, col, salt, par, step) => {
    const q = slots(S, step, 2);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(box.x, gy);
    for (let i = q.i0; i <= q.i1; i++) {
      const wx = i * step;
      const X = S.X(wx * par + S.xLo * (1 - par));
      const peak = gy - H * (base + amp * (0.35 + hsh(i, salt) * 0.65));
      const midX = S.X((wx + step * 0.5) * par + S.xLo * (1 - par));
      const dip = gy - H * (base + amp * 0.18 * hsh(i, salt + 1));
      g.lineTo(X, peak);
      g.quadraticCurveTo(midX, dip, S.X((wx + step) * par + S.xLo * (1 - par)),
                         gy - H * (base + amp * (0.35 + hsh(i + 1, salt) * 0.65)));
    }
    g.lineTo(box.x + box.w, gy); g.closePath(); g.fill();
  };
  ridge(0.13, 0.26, J.hillFar, 17, 0.28, 34);
  ridge(0.10, 0.19, J.hillNear, 23, 0.40, 26);
  // haze over the far range: distance, and the only thing keeping two flat
  // silhouettes from reading as one cut-out
  g.save(); g.globalAlpha = 0.30; g.fillStyle = J.sky2;
  g.fillRect(box.x, gy - H * 0.42, box.w, H * 0.42); g.restore();

  /* ── the canopy, overhead ─────────────────────────────────────────────
     HIGH, AND WITH HOLES IN IT. The first version put this band at 14 m with
     one crown every four metres and no gaps, which closed the sky completely:
     a green ceiling with a strip of blue under it, and no distance in the
     picture at all. A canopy is something you are UNDER and look up through.

     So it sits at 21 m — above the tree, above anything the physics touches,
     and above the frame's own 15 m — which leaves the whole middle of the
     picture as open sky with the hills in it, and crops the canopy to a band
     along the top where a canopy belongs. A third of the slots are left empty
     so the blue comes through it rather than past it. Zoom out and the whole
     roof of the forest is there. */
  const canopyY = 21;                                   // metres, crown centres
  for (const [depth, col, lit, step, par, gap] of [
    [0, J.canopyFar, J.canopyMid, 5.2, 0.72, 0.30],
    [1, J.canopyMid, J.canopyHi, 6.4, 0.88, 0.34],
  ]) {
    const q = slots(S, step, 2);
    for (let i = q.i0; i <= q.i1; i++) {
      if (hsh(i, 29 + depth) < gap) continue;
      const wx = (i + hsh(i, 31 + depth) * 0.5) * step;
      const X = S.X(wx * par + S.xLo * (1 - par));
      const cy = S.Y(canopyY * (0.88 + hsh(i, 37 + depth) * 0.34) - depth * 2.2);
      if (cy > gy - m(3.4)) continue;                   // never down among the bushes
      const rx = S.mx(step * (0.5 + hsh(i, 41 + depth) * 0.26));
      const ry = m(canopyY * 0.1 * (0.7 + hsh(i, 43 + depth) * 0.6));
      // A TRUNK ONLY IF IT HAS SOMEWHERE TO GO. Running one from every crown
      // straight down to the ground drew a row of telegraph poles through the
      // bush line; it stops in the foliage, and tapers, like a tree.
      if (depth === 1 && hsh(i, 47) > 0.62 && cy > box.y + m(0.5)) {
        g.save();
        g.strokeStyle = J.trunkDark; g.globalAlpha = 0.85;
        g.lineWidth = Math.max(1.2, S.mx(0.26)); g.lineCap = 'round';
        g.beginPath(); g.moveTo(X, cy + ry * 0.5);
        g.lineTo(X + S.mx(0.4), gy - m(2.2)); g.stroke();
        g.restore();
      }
      leafMass(g, X, cy, rx, ry, i * 7 + depth, col, lit, 9);
    }
  }

  /* ── vines ────────────────────────────────────────────────────────────
     Hanging from the canopy band. A jungle without them is a wood. */
  {
    const step = 3.1, q = slots(S, step, 1);
    g.save(); g.strokeStyle = J.vine; g.lineCap = 'round';
    for (let i = q.i0; i <= q.i1; i++) {
      if (hsh(i, 53) > 0.42) continue;
      const wx = (i + hsh(i, 59) * 0.8) * step;
      const X = S.X(wx * 0.88 + S.xLo * 0.12);
      const y0 = S.Y(canopyY * 0.84), len = m(canopyY * (0.14 + hsh(i, 61) * 0.3));
      if (y0 > gy - m(4)) continue;
      g.lineWidth = Math.max(1, S.mx(0.07));
      g.beginPath(); g.moveTo(X, y0);
      g.quadraticCurveTo(X + S.mx(0.4) * (hsh(i, 67) - 0.5), y0 + len * 0.6, X, y0 + len);
      g.stroke();
      g.lineWidth = Math.max(0.8, S.mx(0.05));
      for (let k = 0.3; k < 1; k += 0.22) {             // leaves down the strand
        const ly = y0 + len * k;
        g.beginPath(); g.moveTo(X, ly);
        g.lineTo(X + S.mx(0.22) * (k % 0.44 < 0.22 ? 1 : -1), ly + m(0.18)); g.stroke();
      }
    }
    g.restore();
  }

  /* ── the ground ───────────────────────────────────────────────────── */
  const earth = g.createLinearGradient(0, gy, 0, vis);
  earth.addColorStop(0, J.earth); earth.addColorStop(1, J.earthDark);
  g.fillStyle = earth; g.fillRect(box.x, gy, box.w, vis - gy);
  // a lit lip along the top of it, so the ground is a surface not a fill
  g.fillStyle = J.earthHi; g.fillRect(box.x, gy, box.w, Math.max(1, m(0.06)));
  {
    const step = 1.7, q = slots(S, step, 1);
    for (let i = q.i0; i <= q.i1; i++) {
      const wx = (i + hsh(i, 71) * 0.9) * step;
      const X = S.X(wx);
      const yy = gy + (vis - gy) * (0.12 + hsh(i, 73) * 0.7);
      if (hsh(i, 79) > 0.5) {                           // a rock
        const r = Math.max(2, S.mx(0.1 + hsh(i, 83) * 0.2));
        g.fillStyle = J.rock; g.globalAlpha = 0.55;
        g.beginPath(); g.ellipse(X, yy, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      } else {                                          // a scuff of soil
        g.strokeStyle = 'rgba(90,66,38,0.28)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(X, yy); g.lineTo(X + S.mx(0.5 + hsh(i, 89)), yy); g.stroke();
      }
    }
  }

  /* ── the bush line ────────────────────────────────────────────────────
     Three ranks, back to front, each a little brighter and a little taller
     than the one behind it. The front rank is what the hunter stands in. */
  // FEWER, BIGGER LOBES. Eleven small ones per bush over a 2.2 m stride came
  // out as foam — a bank of identical bubbles with no bush in it. A bush is a
  // handful of masses, so it gets a handful.
  for (const [rank, col, lit, step, hgt] of [
    [0, J.leafDark, J.leaf, 4.6, 2.9],
    [1, J.leaf, J.leafHi, 3.8, 2.1],
    [2, J.leafHi, J.leafPale, 3.2, 1.4],
  ]) {
    const q = slots(S, step, 2);
    for (let i = q.i0; i <= q.i1; i++) {
      const wx = (i + hsh(i, 97 + rank) * 0.6) * step;
      const X = S.X(wx);
      const hh = hgt * (0.68 + hsh(i, 101 + rank) * 0.6);
      const cy = S.Y(hh * 0.5) + rank * 2;
      leafMass(g, X, cy, S.mx(step * 0.66), m(hh * 0.6), i * 13 + rank, col, lit, 6);
    }
  }

  /* ── ferns, in front of everything but the hunter ─────────────────── */
  {
    const step = 4.3, q = slots(S, step, 1);
    for (let i = q.i0; i <= q.i1; i++) {
      if (hsh(i, 103) > 0.62) continue;
      const wx = (i + hsh(i, 107) * 0.8) * step;
      const X = S.X(wx), base = gy - m(0.08);
      const n = 5 + Math.floor(hsh(i, 109) * 3);
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.42 + (hsh(i + k, 113) - 0.5) * 0.18;
        const len = m(1.0 + hsh(i + k, 127) * 1.2);
        frond(g, X, base, len, a, k % 2 ? J.leafPale : J.leafHi,
              len * 0.18, S.mx(0.05));
      }
    }
  }

  // THE TREE, at the monkey — it is the thing the monkey lets go of, so it
  // follows the marker rather than standing in a fixed spot.
  if (markers?.target) jungleTree(g, S, markers.target, PLATE, o);
  hunter(g, S, o, PLATE);
}

/* ── the tree, and the branches you can hang a monkey from ──────────────
   THE TREE STANDS STILL. The palm it replaces was drawn AT the monkey and
   moved whenever the monkey was dragged, which is the thing the old comment
   in this file warned about and then did anyway: the one fixed object in the
   picture was not fixed, so there was nothing to judge the fall against.

   It stands at TREE.x and it has seven branches, and the monkey hangs from
   one of them. That is the whole of the new freedom — you pick a branch
   rather than a point in mid-air — and it costs the demonstration nothing,
   because the physics never cared where the monkey was, only that the aim
   points at it. Six of the seven are reachable at the default speed; the
   lowest exists so the one real failure, the monkey landing before the
   banana arrives, is still something you can produce on purpose.

   The list is DATA, exported, and read by both the renderer here and the
   drag in js/app.js. Two copies of these numbers would be two trees. */

export const TREE = { x: 16.4, h: 13.8, lean: 0.5 };

/** Where a monkey can hang, nearest the trunk last. World metres. */
export const BRANCHES = [
  { x: 7.9,  y: 11.6 },
  { x: 10.4, y: 12.6 },
  { x: 9.3,  y: 9.2 },
  { x: 12.2, y: 10.4 },
  { x: 11.1, y: 6.8 },
  { x: 13.0, y: 7.9 },
  { x: 12.6, y: 4.3 },
];

/** The branch nearest a dragged point — this is what the drag snaps to. */
export function nearestBranch(x, y) {
  let best = BRANCHES[0], bd = Infinity;
  for (const b of BRANCHES) {
    // Weighted towards the vertical: the branches differ in height far more
    // than in reach, so an unweighted distance makes the tall ones unpickable.
    const d = (b.x - x) ** 2 * 0.55 + (b.y - y) ** 2;
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

/** Where the trunk is at height y — the quadratic the trunk is drawn along. */
function trunkAt(y) {
  const k = Math.min(1, Math.max(0, y / TREE.h));
  const x0 = TREE.x, x1 = TREE.x + TREE.lean;
  return (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * (x0 + TREE.lean * 1.7) + k * k * x1;
}

function jungleTree(g, S, target, PLATE, o) {
  const J = JUNGLE;
  const m = (v) => Math.max(0.6, S.m(v));
  const mx = (v) => Math.max(0.6, S.mx(v));
  const gy = S.groundY;
  const FORK = TREE.h * 0.46;                 // where the trunk becomes limbs

  /* Where the trunk centre is at height y. Everything that attaches to the
     trunk asks this rather than guessing, so nothing floats off the bark. */
  const axis = (y) => {
    const k = clamp(y / TREE.h, 0, 1);
    return TREE.x + TREE.lean * (k * k * 0.55 + k * 0.45);
  };
  /* Half-width of the trunk at height y: thick at the base, thin at the fork. */
  const halfW = (y) => 0.62 * (1 - clamp(y / TREE.h, 0, 1) * 0.62);

  /* ── buttress roots ───────────────────────────────────────────────────
     A jungle hardwood does not meet the ground at a line. */
  g.save();
  g.fillStyle = J.trunkDark;
  for (const s2 of [-1, 1]) {
    g.beginPath();
    g.moveTo(S.X(TREE.x + s2 * 0.5), gy - m(2.6));
    g.quadraticCurveTo(S.X(TREE.x + s2 * 0.8), gy - m(0.8),
                       S.X(TREE.x + s2 * 1.85), gy);
    g.lineTo(S.X(TREE.x + s2 * 0.3), gy);
    g.closePath(); g.fill();
  }
  g.restore();

  /* ── the trunk, to the fork ───────────────────────────────────────── */
  const trunkPath = () => {
    g.beginPath();
    g.moveTo(S.X(TREE.x - halfW(0)), gy);
    for (let y = 0; y <= FORK; y += FORK / 8) g.lineTo(S.X(axis(y) - halfW(y)), S.Y(y));
    for (let y = FORK; y >= 0; y -= FORK / 8) g.lineTo(S.X(axis(y) + halfW(y)), S.Y(y));
    g.closePath();
  };
  g.save();
  trunkPath();
  const bark = g.createLinearGradient(S.X(TREE.x - 0.7), 0, S.X(TREE.x + 0.7), 0);
  bark.addColorStop(0, J.trunkDark); bark.addColorStop(0.38, J.trunk);
  bark.addColorStop(0.62, J.trunkHi); bark.addColorStop(1, J.trunkDark);
  g.fillStyle = bark; g.fill();
  g.clip();
  g.strokeStyle = 'rgba(40,26,14,0.30)'; g.lineCap = 'round';
  for (let i = 0; i < 6; i++) {                        // long vertical grain
    const off = -0.5 + i * 0.2;
    g.lineWidth = Math.max(0.8, mx(0.05));
    g.beginPath();
    for (let y = 0; y <= FORK; y += FORK / 10) g.lineTo(S.X(axis(y) + off * (1 - y / TREE.h)), S.Y(y));
    g.stroke();
  }
  g.restore();

  /* ── two main limbs out of the fork ───────────────────────────────────
     THE BRANCHES HAVE TO BE VISIBLE. The first attempt hung a leaf mass on
     the middle of every limb, which buried the limb: the tree came out as a
     vertical column of green bubbles with a brown slab beside it, and a
     monkey holding one of them was holding nothing you could see.

     So the wood is drawn first and the foliage is set ABOVE and BEYOND it —
     clumps on the upper side and one at the tip — and the limb's underside
     stays clear all the way out to the monkey. You can follow any branch from
     the trunk to the hand that is holding it, which is the only thing the
     tree has to do. */
  const limb = (x0, y0, x1, y1, w0, w1, bend) => {
    const cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2 + bend;
    const pt = (k) => ({
      x: (1 - k) * (1 - k) * x0 + 2 * (1 - k) * k * cxm + k * k * x1,
      y: (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * cym + k * k * y1,
    });
    g.beginPath();
    for (let k = 0; k <= 1.0001; k += 0.1) {
      const p = pt(k), w = (w0 + (w1 - w0) * k) / 2;
      g.lineTo(S.X(p.x), S.Y(p.y + w));
    }
    for (let k = 1; k >= -0.0001; k -= 0.1) {
      const p = pt(k), w = (w0 + (w1 - w0) * k) / 2;
      g.lineTo(S.X(p.x), S.Y(p.y - w));
    }
    g.closePath();
    g.fillStyle = J.trunk; g.fill();
    g.strokeStyle = J.trunkDark; g.lineWidth = Math.max(0.8, mx(0.05)); g.stroke();
    return pt;
  };

  const forkX = axis(FORK);
  const mains = [
    limb(forkX, FORK, forkX - 1.4, TREE.h * 0.97, 0.78, 0.26, 0.9),
    limb(forkX, FORK, forkX + 1.7, TREE.h * 0.82, 0.6, 0.22, 0.5),
  ];

  /* ── the hang branches, trunk out to each tip ─────────────────────────
     NOT A LADDER. Leaving the trunk 0.9 m above each tip gave seven long,
     shallow, parallel lines fanning off one point — a TV aerial, or the rungs
     of a ladder, and nothing a monkey would sit in. A real limb leaves the
     trunk well below where it ends up, climbs, levels off and droops at the
     tip, and no two of them leave at the same height.

     So the departure height is the tip's height less a drop that varies with
     the branch, the arc bends UPWARD in the middle, and the reach decides the
     bend: a long branch sags more than a short one. */
  const tips = [];
  for (let i = 0; i < BRANCHES.length; i++) {
    const b = BRANCHES[i];
    const reach = Math.abs(axis(b.y) - b.x);
    const drop = 1.1 + (i % 3) * 0.75;                 // leaves the trunk below
    const fromY = clamp(b.y - drop, 1.4, TREE.h * 0.92);
    const fromX = axis(fromY) - halfW(fromY) * 0.3;
    const w = 0.34 - i * 0.015;
    // bend up by most of the climb, so the limb arcs rather than ramps
    const pt = limb(fromX, fromY, b.x, b.y, w, w * 0.4, drop * 0.72 + reach * 0.05);
    tips.push({ b, pt });
  }

  /* ── foliage: above the limbs, and at the tips ────────────────────────
     Along the whole limb now, not just the outer half — a branch bare for
     two thirds of its length is a plank. It sits ABOVE the wood, so the
     underside of every limb still runs clear back to the trunk. */
  for (const { pt } of tips) {
    for (const k of [0.34, 0.6, 0.83, 1.0]) {
      const p = pt(k);
      const s2 = k === 1 ? 1.3 : 0.84 + k * 0.2;
      leafMass(g, S.X(p.x), S.Y(p.y + 0.6 * s2), mx(1.4 * s2), m(0.78 * s2),
               Math.round(p.x * 31 + p.y * 17), J.leaf, J.leafHi, 7);
    }
  }
  // A LIMB THAT ENDS IN NOTHING IS A SPIKE. Both main limbs ran out from
  // under the crown and finished as bare wood against the sky.
  for (const pt of mains) {
    const e = pt(1);
    leafMass(g, S.X(e.x), S.Y(e.y + 0.4), mx(1.8), m(1.0),
             Math.round(e.x * 53 + e.y * 11), J.leaf, J.leafHi, 9);
  }
  // the crown, over the two main limbs
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.06 + i / 7.4);
    const cx = forkX - 0.1 + Math.cos(a) * 3.4;
    const cy = TREE.h * 0.94 + Math.sin(a) * 1.6;
    leafMass(g, S.X(cx), S.Y(cy), mx(2.3), m(1.25), i * 23, J.leaf, J.leafHi, 9);
  }

  /* ── vines off the limbs ──────────────────────────────────────────── */
  g.save(); g.strokeStyle = J.vine; g.lineCap = 'round';
  for (let i = 0; i < BRANCHES.length; i += 2) {
    const b = BRANCHES[i];
    const X = S.X(b.x + 0.5), y0 = S.Y(b.y - 0.1);
    const len = m(1.6 + (i % 3) * 1.1);
    g.lineWidth = Math.max(1, mx(0.06));
    g.beginPath(); g.moveTo(X, y0);
    g.quadraticCurveTo(X + mx(0.35), y0 + len * 0.6, X - mx(0.12), y0 + len);
    g.stroke();
  }
  g.restore();

  /* ── the branch the monkey is actually on ─────────────────────────────
     It can be moved between seven of them, so the one it is holding has to
     be obvious before it lets go. A bare length of limb under the hands,
     with the foliage cleared off it. */
  const held = nearestBranch(target.x, target.y);
  g.save();
  g.strokeStyle = J.trunkHi;
  g.lineWidth = Math.max(2.6, mx(0.22));
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(S.X(held.x - 0.95), S.Y(held.y));
  g.lineTo(S.X(held.x + 0.5), S.Y(held.y));
  g.stroke();
  g.restore();
}
