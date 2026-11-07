// backdrops.js — the places the two staged scenarios happen in.
//
// These are drawn onto the exhibit PLATE (see exhibit.js), not onto the themed
// canvas, so they take their colours from the plate rather than from
// css/tokens.css. There are two plates: the range is a photograph, so its
// plate is dark in both themes and light mode changes the page around it
// rather than the plate; the monkey is a diagram, so its plate is daylight.
// See PLATES in exhibit.js.
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
import { MONKEY_H } from '../core/intercept.js';
import { palette } from './util.js';
import { thrower, throwerHand } from './figures.js';

export const EXTENT = {
  warehouse: { x0: -4.5, x1: 9, yTop: 2.4 },   // room at the left for the rig
  // The plain has to hold every branch, because the monkey moves between them
  // and a frame cropped to wherever it happens to be would swing every time
  // you picked a different one.
  // yTop IS A FLOOR, NOT THE ANSWER. At 14 m it was padding the frame above
  // everything in the picture, and because the pane is two and a half times
  // as wide as it is tall, every metre of unused height costs two and a half
  // metres of unused width — the throw came out a third of the size it could
  // be, which is what made the monkey's 1.7 m fall a smudge. The highest
  // branch is 12.6 m and the fit already lifts the ceiling to the monkey
  // plus 1.6, so this only has to hold the low ones.
  plain:     { x0: -1.5, x1: 18.6, yTop: 15.2 },
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

  // THE HAND IS AT THE MUZZLE: the figure is sized so that what it holds out is
  // where the engine launches from, and it stands on the datum.
  const aim = o.theta || 0;
  const H = Math.min(m(2.6), Math.max(m(1.3), m(o.launchY) / (throwerHand(100, aim).y / 100)));
  thrower(g, X0 - throwerHand(H, aim).x, gy, H, palette(), { dir: 1, pose: 1, aim, ring: '#5d6b3c' });
}

/* ══ the plain ══════════════════════════════════════════════════════════
   A GRID, A BRANCH, A MONKEY AND A PERSON. Nothing else is in this picture,
   and that is the whole specification.

   What was here was a jungle: a sky gradient, parallax clouds, two ranges of
   hills, two bands of canopy, hanging vines, three ranks of bushes, ferns,
   ground litter, and a tree with buttress roots, bark grain, seven foliated
   limbs and a crown. Every one of those layers was anchored in world metres
   and regenerated on EVERY FRAME, because this file draws straight to the
   canvas and exhibit.js has no layer cache — so a camera that moves redrew
   several hundred `leafMass` calls, each of which is twenty-odd arcs, sixty
   times a second. That is why it lagged, and no amount of tuning the hashes
   was going to fix a per-frame cost that large.

   It also lost the argument it was meant to help. The thing this scenario
   exists to show is two objects falling the same distance below a straight
   line, and that is a geometry problem; a wall of foliage behind it is
   contrast the eye has to fight through to read a thin dotted line. The grid
   is not a compromise — it is the right background for a diagram, and it is
   what the rest of the site already uses.

   The grid stays. What came back, on 7 Nov, is one tree: the monkey can hang
   from any of its branches, so they all have to be seen, and limbs on a trunk
   are not sticks in mid-air. It is painted once into a layer, so a moving
   camera only copies it, and it is kept quiet, so the line still reads. */

const PLAIN = {
  grid: 'rgba(24,36,20,0.10)', gridMajor: 'rgba(24,36,20,0.20)',
  ground: 'rgba(24,36,20,0.55)',
  bark: '#6b4f35', barkDark: '#43301f', barkFaint: 'rgba(107,79,53,0.32)',
};

/** Where the branches hang from. Kept so a monkey has somewhere to be. */
export const TREE = { x: 16.4, top: 14 };

/** Where a monkey can hang. World metres, and the one list the drag reads. */
export const BRANCHES = [
  { x: 7.9,  y: 11.6 },
  { x: 10.4, y: 12.6 },
  { x: 9.3,  y: 9.2 },
  { x: 12.2, y: 10.4 },
  { x: 11.1, y: 6.8 },
  { x: 13.0, y: 7.9 },
  { x: 12.6, y: 4.3 },
];

/** The height of the wood a monkey holds: its raised hand, above its centre. */
export const gripY = (b) => b.y + MONKEY_H * 0.55;

/** The height of a branch's limb at x: level at the grip, falling to the trunk. */
export function limbY(b, x) {
  const L = TREE.x - b.x, s = x - b.x;
  if (s <= 0) return gripY(b) - s * 0.05;           // rising a little to its tip
  return gripY(b) - Math.min(1.4, 0.22 * L) * (s / L) ** 1.5;
}

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

export function plainBack(g, S, box, o) {
  const { PLATE, markers } = o;
  const gy = S.groundY;
  const m = (v) => Math.max(0.5, S.m(v));

  /* ── the grid ─────────────────────────────────────────────────────────
     One stride for both axes, chosen so there are a readable number of lines
     at any zoom and never more than the frame can hold. Square pixels on the
     plate mean one stride really is the same distance both ways. */
  const span = S.xHi - S.xLo;
  const step = span > 160 ? 20 : span > 70 ? 10 : span > 30 ? 5 : span > 12 ? 2 : 1;
  g.save();
  g.lineWidth = 1;
  for (let x = Math.ceil(S.xLo / step) * step; x <= S.xHi; x += step) {
    const X = Math.round(S.X(x)) + 0.5;
    g.strokeStyle = Math.abs(x) < 1e-9 ? PLAIN.gridMajor : PLAIN.grid;
    g.beginPath(); g.moveTo(X, box.y); g.lineTo(X, gy); g.stroke();
  }
  for (let y = 0; y <= S.yHi * 1.02; y += step) {
    const Y = Math.round(S.Y(y)) + 0.5;
    if (Y < box.y) break;
    g.strokeStyle = PLAIN.grid;
    g.beginPath(); g.moveTo(box.x, Y); g.lineTo(box.x + box.w, Y); g.stroke();
  }
  g.restore();

  /* ── the ground ───────────────────────────────────────────────────────
     A line, because that is all it is: the datum the engine lands things on.
     Everything below it is outside the model. */
  g.save();
  g.strokeStyle = PLAIN.ground; g.lineWidth = 2;
  g.beginPath(); g.moveTo(box.x, Math.round(gy) + 0.5);
  g.lineTo(box.x + box.w, Math.round(gy) + 0.5); g.stroke();
  g.restore();

  // the grass: a strip under the datum, and still outside the model
  g.fillStyle = 'rgba(92,122,64,0.22)';
  g.fillRect(box.x, gy + 1, box.w, Math.max(0, box.y + box.h - gy - 1));

  if (markers?.target) {
    tree(g, S);
    perches(g, S, markers.target, PLATE, o.hoverMark);
    if (box.w > 620) {
      g.save();
      g.font = '600 13px Inter, system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = PLATE.inkMid;
      g.fillText('Drag the monkey to any branch, or click one', box.x + 12, box.y + box.h - 12);
      g.restore();
    }
  }
  hunter(g, S, o, PLATE);
}

/* ── the tree ─────────────────────────────────────────────────────────────
   One trunk, a limb to every branch in BRANCHES and a small crown. A limb holds
   its monkey at the height of the grip, not at the marker: the marker is the
   monkey's centre, and wood drawn there runs through the animal's chest.

   Painted once for a scale into a layer of its own; a pan only copies it. */
const AREA = { x0: 5.8, x1: 18.6, y0: -0.2, y1: 16 };
const CROWN = [[16.4, 14.5, 1.3], [15.1, 14.1, 1.05], [17.5, 14, 0.95], [15.9, 13.3, 0.85], [17, 13, 0.75], [14.3, 13.9, 0.7]];
let layer = null;

function tree(g, S) {
  const k = (globalThis.devicePixelRatio || 1);
  const w = (AREA.x1 - AREA.x0) * S.sx, h = (AREA.y1 - AREA.y0) * S.sy;
  const q = Math.min(k, 3600 / Math.max(w, h));     // zoomed far in, a softer layer, not a huge one
  const key = `${S.sx.toFixed(3)},${S.sy.toFixed(3)},${q.toFixed(3)}`;
  if (layer?.key !== key) {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * q); cv.height = Math.ceil(h * q);
    const c = cv.getContext('2d');
    c.scale(q, q);
    paintTree(c, { X: (x) => (x - AREA.x0) * S.sx, Y: (y) => (AREA.y1 - y) * S.sy, sx: S.sx, sy: S.sy });
    layer = { key, cv };
  }
  g.drawImage(layer.cv, S.X(AREA.x0), S.Y(AREA.y1), w, h);
}

function paintTree(g, M) {
  const shape = (pts) => { g.beginPath(); pts.forEach(([x, y]) => g.lineTo(M.X(x), M.Y(y))); g.closePath(); };
  const leaves = (x, y, r, a = 0.6) => {
    for (const [dx, dy, s, c] of [[0, 0, 1, '74,103,58'], [-0.55, -0.2, 0.68, '62,90,50'], [0.55, -0.18, 0.72, '84,114,64'], [-0.2, 0.5, 0.62, '92,122,68'], [0.3, 0.42, 0.55, '74,103,58']]) {
      g.fillStyle = `rgba(${c},${a})`;
      g.beginPath();
      g.ellipse(M.X(x + dx * r), M.Y(y + dy * r), r * s * M.sx, r * s * M.sy, 0, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (const [x, y, r] of CROWN) leaves(x, y, r, 0.5);

  const half = (y) => 0.2 + 0.32 * (1 - y / TREE.top) + 0.5 * Math.exp(-y / 0.45);
  const N = 16, side = [];
  for (let i = 0; i <= N; i++) { const y = (TREE.top * i) / N; side.push([y, half(y)]); }
  shape([...side.map(([y, w]) => [TREE.x - w, y]), ...side.reverse().map(([y, w]) => [TREE.x + w, y])]);
  const bark = g.createLinearGradient(M.X(TREE.x - 0.7), 0, M.X(TREE.x + 0.7), 0);
  bark.addColorStop(0, PLAIN.bark); bark.addColorStop(1, PLAIN.barkDark);
  g.fillStyle = bark; g.fill();
  g.strokeStyle = PLAIN.barkDark; g.lineWidth = 1; g.stroke();
  // the grain, following the trunk
  g.strokeStyle = 'rgba(40,26,14,0.3)'; g.lineWidth = 1;
  for (const f of [-0.55, -0.15, 0.25, 0.6]) {
    g.beginPath();
    for (let i = 1; i < N; i++) { const y = (TREE.top * i) / N; g.lineTo(M.X(TREE.x + f * half(y)), M.Y(y)); }
    g.stroke();
  }

  // the limbs, thin at the tip and thick where they leave the trunk
  for (const b of BRANCHES) {
    const tip = b.x - 0.9, N2 = 14, at = [];
    for (let i = 0; i <= N2; i++) {
      const u = i / N2, x = tip + (TREE.x - tip) * u;
      at.push([x, limbY(b, x), 0.045 + 0.15 * u ** 1.2]);
    }
    shape([...at.map(([x, y, w]) => [x, y + w]), ...[...at].reverse().map(([x, y, w]) => [x, y - w])]);
    g.fillStyle = PLAIN.bark; g.fill();
    g.strokeStyle = PLAIN.barkDark; g.lineWidth = 0.9; g.stroke();
    g.beginPath();
    at.forEach(([x, y, w]) => g.lineTo(M.X(x), M.Y(y - w * 0.45)));
    g.strokeStyle = 'rgba(40,26,14,0.26)'; g.lineWidth = 1.2; g.lineCap = 'round'; g.stroke();
    leaves(tip - 0.1, limbY(b, tip) + 0.14, 0.36);
    const mid = b.x + (TREE.x - b.x) * 0.5;
    leaves(mid, limbY(b, mid) + 0.42, 0.34, 0.5);
  }
}

/** A mark on every branch the monkey is not on, so a student can see where it can go. */
function perches(g, S, target, PL, hover) {
  const lit = hover === 'target' || hover === 'perch';
  const r = Math.max(6, S.m(0.2)) * (lit ? 1.25 : 1);
  g.save();
  for (const b of BRANCHES) {
    if (b.x === target.x && b.y === target.y) continue;
    g.beginPath(); g.arc(S.X(b.x), S.Y(gripY(b)), r, 0, Math.PI * 2);
    g.fillStyle = lit ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)'; g.fill();
    g.strokeStyle = lit ? PL.ink : PLAIN.barkDark; g.lineWidth = lit ? 2 : 1.4; g.stroke();
  }
  g.restore();
}
