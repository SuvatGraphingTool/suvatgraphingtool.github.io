// still.js — the part of a stage that does not change, kept as a picture.
//
// A library or composed stage repaints its whole place every frame: a stadium is
// 110,000 canvas calls, a brick wall 20,000, against 800 for one of the twelve, and
// painting them is what makes "super laggy, all scenarios": the JavaScript is a tenth
// of the time. Yet a stage draws its place first and what moves after, from the same
// seeds and the same numbers, so frame after frame the opening stretch of its calls
// is identical. Measured over every stage and place: 92% of the painting.
//
// So this watches the calls a stage makes, as a running hash. When two frames first
// differ, the canvas as it stands just before that call is copied aside. From the
// next frame on, that picture goes down first and the calls before the same point are
// not painted: the stage still makes them, so its transforms, its state, what it
// reports of what moves and every number stay exactly as they were. Nothing is chosen
// by hand and no stage knows. The picture is the same pixels, so nothing looks
// different (a sweep compares the two ways pixel for pixel over every stage).
//
// IF THE OPENING CHANGES (a new theme, a pan, a drawing that has just arrived, water
// on the clock) the hash says so at the first call that differs, the rest of that pass
// paints nothing, and the stage is drawn again the plain way, once. A stage whose
// opening changes all the time, the sea, is simply left alone.

const PAINT = ['fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'drawImage'];
const PATH = ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'closePath'];
const STATE = ['save', 'restore', 'translate', 'scale', 'rotate', 'transform', 'setTransform', 'resetTransform', 'setLineDash', 'clip'];
const PROPS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit', 'lineDashOffset', 'font', 'textAlign', 'textBaseline', 'direction', 'letterSpacing', 'globalAlpha', 'globalCompositeOperation', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'imageSmoothingEnabled', 'filter'];
const GRADIENTS = ['createLinearGradient', 'createRadialGradient', 'createConicGradient'];
/** Fewer painting calls than this are not worth a picture. */
const WORTH = 48;

/* ── the hash: numbers to a 65536th of a pixel, strings and objects by identity ── */
let h = 0;
const strings = new Map(), objects = new WeakMap();
let nextId = 1;
const idOf = (o) => { let i = objects.get(o); if (!i) { i = nextId++; objects.set(o, i); } return i; };
function mix(x) {
  if (typeof x === 'number') h = Math.imul(h ^ ((x * 65536) | 0), 16777619);
  else if (typeof x === 'string') {
    // by what it says, kept for the next time it is asked: a wall has thousands of colours
    let i = strings.get(x);
    if (i === undefined) {
      i = 0; for (let c = 0; c < x.length; c++) i = Math.imul(i ^ x.charCodeAt(c), 16777619);
      if (strings.size > 20000) strings.clear();
      strings.set(x, i);
    }
    h = Math.imul(h ^ i, 16777619);
  } else if (x === null || x === undefined || typeof x === 'boolean') h = Math.imul(h ^ (x ? 3 : 5), 16777619);
  else if (Array.isArray(x)) { for (const v of x) mix(v); }
  else if ('a' in x && 'f' in x) { mix(x.a); mix(x.b); mix(x.c); mix(x.d); mix(x.e); mix(x.f); }
  else if (x.addColorStop) h = Math.imul(h ^ 7, 16777619);          // a gradient: its making is in the hash already
  else if (x._hash !== undefined) h = Math.imul(h ^ x._hash, 16777619);  // a Path2D: what was drawn into it (below)
  else h = Math.imul(h ^ idOf(x), 16777619);                        // an image, by which one it is
}

/* A stage may build a Path2D afresh each frame, the same shape every time: it counts as that shape. */
if (typeof Path2D !== 'undefined') {
  for (const k of ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'closePath']) {
    const f = Path2D.prototype[k];
    if (!f) continue;
    Path2D.prototype[k] = function () {
      const keep = h; h = this._hash ?? 0;
      for (let i = 0; i < arguments.length; i++) mix(arguments[i]);
      this._hash = h; h = keep;
      return f.apply(this, arguments);
    };
  }
}

/* ── one canvas's watch ──────────────────────────────────────────────────────── */
/** Modes: PLAIN paints and does not watch; WATCH paints and compares; SHOW puts the picture down and skips what it holds. */
const PLAIN = 0, WATCH = 1, SHOW = 2;

function watcher(canvas) {
  const g = canvas.getContext('2d'), P = Object.getPrototypeOf(g);
  const W = {
    mode: PLAIN, n: 0, seq: [], last: null, held: 0, from: 0, pathNeeded: false, snap: null, size: '',
    broke: false, begun: 0, clipped: false, split: -1, rest: 0, breaks: 0, frames: 0,
  };
  const copy = () => {
    W.snap ??= document.createElement('canvas');
    if (W.snap.width !== canvas.width) W.snap.width = canvas.width;
    if (W.snap.height !== canvas.height) W.snap.height = canvas.height;
    const s = W.snap.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'copy'; s.drawImage(canvas, 0, 0);
  };
  for (const k of PAINT) {
    const f = P[k];
    g[k] = function () {
      if (W.mode === PLAIN) return f.apply(g, arguments);
      h = Math.imul(h ^ k.length, 16777619);
      for (let i = 0; i < arguments.length; i++) mix(arguments[i]);
      const i = W.n++;
      if (W.mode === SHOW) {
        if (W.broke) return undefined;
        if (i < W.held) {
          if (W.last[i] !== h) { W.broke = true; return undefined; }
          return undefined;
        }
        return f.apply(g, arguments);
      }
      W.seq.push(h);
      // WATCH: the first call that differs from the last frame's is where the opening ends
      if (W.split < 0 && W.last && (i >= W.last.length || W.last[i] !== h)) {
        W.split = i;
        if (i >= WORTH) { copy(); W.from = W.begun; W.pathNeeded = W.clipped; }
      }
      return f.apply(g, arguments);
    };
  }
  for (const k of PATH) {
    const f = P[k], begin = k === 'beginPath';
    g[k] = function () {
      if (W.mode === PLAIN) return f.apply(g, arguments);
      h = Math.imul(h ^ k.length, 16777619);
      for (let i = 0; i < arguments.length; i++) mix(arguments[i]);
      if (W.mode === WATCH) { if (begin && W.split < 0) W.begun = W.n; return f.apply(g, arguments); }
      // what the picture holds is not built, unless a clip needs it, or the last of it
      // is still in use by the first call that is painted (a fill, then a stroke of the same path)
      if (W.broke || (!W.pathNeeded && W.n < W.from)) return undefined;
      return f.apply(g, arguments);
    };
  }
  for (const k of STATE) {
    const f = P[k], clip = k === 'clip';
    g[k] = function () {
      if (W.mode === PLAIN) return f.apply(g, arguments);
      h = Math.imul(h ^ (k.length + 31), 16777619);
      for (let i = 0; i < arguments.length; i++) mix(arguments[i]);
      if (clip && W.split < 0) W.clipped = true;
      return f.apply(g, arguments);
    };
  }
  for (const k of GRADIENTS) {
    const f = P[k];
    g[k] = function () {
      const G = f.apply(g, arguments);
      if (W.mode === PLAIN) return G;
      h = Math.imul(h ^ (k.length + 61), 16777619);
      for (let i = 0; i < arguments.length; i++) mix(arguments[i]);
      const add = G.addColorStop;
      G.addColorStop = function (o, c) { if (W.mode !== PLAIN) { mix(o); mix(c); } return add.call(G, o, c); };
      return G;
    };
  }
  for (const k of PROPS) {
    const d = Object.getOwnPropertyDescriptor(P, k);
    if (!d?.set) continue;
    const tag = k.length + 97;
    Object.defineProperty(g, k, { configurable: true, get: () => d.get.call(g), set: (v) => {
      if (W.mode !== PLAIN) { h = Math.imul(h ^ tag, 16777619); mix(v); }
      d.set.call(g, v);
    } });
  }
  return W;
}

const watchers = new WeakMap();
let enabled = typeof document !== 'undefined';

/** Turned off, every stage paints in full, the plain way: for comparing the two. */
export function useStill(on) { enabled = !!on; }

/** How it is going, for a test: how many painting calls the picture holds, of how many. */
export function stillState(canvas) { const W = watchers.get(canvas); return W ? { held: W.held, of: W.n, rest: W.rest, breaks: W.breaks } : null; }

/** Whatever the picture holds may no longer be right: a webfont has arrived, or it is another stage. */
export function forgetStill(canvas) { const W = watchers.get(canvas); if (W) { W.mode = PLAIN; W.last = null; W.held = 0; W.rest = 0; W.breaks = 0; } }

/**
 * Draw a stage, its unchanging opening from the picture.
 * @param canvas  the stage's canvas
 * @param render  draws the whole stage, and may be asked twice in a frame
 * @param again   called before a second try: forget what the first pass reported
 */
export function stillFrame(canvas, render, again = () => {}) {
  if (!enabled) { render(); return; }
  let W = watchers.get(canvas);
  if (!W) { W = watcher(canvas); watchers.set(canvas, W); }
  // a stage whose opening keeps changing is left alone for a while
  if (W.rest > 0) { W.rest--; W.mode = PLAIN; render(); return; }
  const r = canvas.getBoundingClientRect(), size = `${Math.round(r.width)}x${Math.round(r.height)}`;
  if (size !== W.size) { W.size = size; W.last = null; W.held = 0; }
  h = 0; W.n = 0; W.broke = false; W.split = -1; W.begun = 0; W.clipped = false; W.frames++;
  if (W.frames > 90) { W.frames = 0; W.breaks = 0; }
  if (W.held && W.snap?.width === canvas.width && W.snap?.height === canvas.height) {
    W.mode = SHOW;
    const g = canvas.getContext('2d'), P = Object.getPrototypeOf(g);
    W.mode = PLAIN;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.globalAlpha = 1;
    g.drawImage(W.snap, 0, 0);
    g.restore();
    W.mode = SHOW;
    h = 0;
    render();
    W.mode = PLAIN;
    if (!W.broke) return;
    // the opening changed: this frame the plain way, and watch again from here
    W.held = 0; W.last = null;
    if (++W.breaks > 4) { W.breaks = 0; W.rest = 90; }
    again();
    render();
    return;
  }
  W.mode = WATCH; W.seq = []; h = 0;
  render();
  W.mode = PLAIN;
  if (W.split >= WORTH) { W.held = W.split; W.last = W.seq; return; }
  // identical frames (nothing has moved), or no opening worth keeping
  if (W.split >= 0) { if (++W.breaks > 4) { W.breaks = 0; W.rest = 90; } }
  W.last = W.seq;
}

/* ── one heavy piece, when what is under it moves ────────────────────────────
   Water runs on the clock, so a stage with a sea has no opening to keep, and what stands
   in front of it is repainted every frame: a cliff's strata, a wall's every stone. Such
   a piece, known to be the same at the same place, is kept on its own. It must lie inside
   the box it names, and a canvas that is turned draws it the plain way. */
const pieces = new Map();
const theme = () => (typeof document !== 'undefined' ? document.documentElement?.dataset?.theme : '');
/**
 * @param g     the stage's context
 * @param box   { x, y, w, h } in its current coordinates, all that the piece can touch
 * @param key   everything else the piece depends on, as a string
 * @param draw  draws it on the context it is given
 */
export function keptPiece(g, box, key, draw) {
  const m = g.getTransform?.();
  if (!enabled || !m || m.b || m.c || g.globalAlpha !== 1 || g.canvas?.id !== 'scene') { draw(g); return; }
  const x0 = Math.floor(m.a * box.x + m.e) - 1, y0 = Math.floor(m.d * box.y + m.f) - 1;
  const cw = Math.ceil(m.a * box.w) + 3, ch = Math.ceil(m.d * box.h) + 3;
  if (!(cw > 0 && ch > 0)) return;
  const id = `${key}|${theme()}|${m.a},${m.d},${m.e},${m.f}|${box.x},${box.y},${box.w},${box.h}`;
  let c = pieces.get(id);
  if (!c) {
    c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const o = c.getContext('2d');
    o.setTransform(m.a, 0, 0, m.d, m.e - x0, m.f - y0);
    draw(o);
    if (pieces.size >= 16) pieces.delete(pieces.keys().next().value);
    pieces.set(id, c);
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, x0, y0); g.restore();
}
