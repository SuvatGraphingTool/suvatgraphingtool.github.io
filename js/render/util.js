// util.js — canvas plumbing. No physics here.

import { num } from '../notation.js';
import { D } from '../world/dims.js';

export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr; canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = cssVar('--surface', '#131210');
  ctx.fillRect(0, 0, w, h);
  // a library stage's view (js/render/kitview.js): the twelve's camera read
  // as a pan and zoom of the stage's own layout; the stage draws as before
  const v = canvas._view;
  if (v) { ctx.translate(v.tx, v.ty); ctx.scale(v.s, v.s); }
  ctx._dpr = dpr;
  return { ctx, w, h };
}

/** Step out of a library stage's pan and zoom, back to the canvas's own
    pixels: for what belongs to the screen, not the place — a graph panel, a
    key, a caption — drawn after the scene so it neither zooms nor pans. */
export function unview(ctx) {
  const dpr = ctx._dpr || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function cssVar(name, fallback) {
  return (getComputedStyle(document.documentElement).getPropertyValue(name) || fallback).trim();
}

export function palette() {
  const v = cssVar;
  return {
    surface: v('--surface', '#131210'),
    card:    v('--card', '#1c1a17'),
    ink:     v('--ink', '#fff'),
    strong:  v('--ink-strong', 'rgba(255,255,255,.8)'),
    muted:   v('--ink-muted', 'rgba(255,255,255,.6)'),
    faint:   v('--ink-faint', 'rgba(255,255,255,.4)'),
    grid:     v('--grid', 'rgba(255,255,255,.13)'),
    gridMajor: v('--grid-major', 'rgba(255,255,255,.26)'),
    axis:     v('--axis', 'rgba(255,255,255,.45)'),
    vel:      v('--vel', '#ea580c'),
    velVec:   v('--vel-vec', '#fb923c'),
    disp:     v('--disp', '#0891b2'),
    acc:      v('--acc', '#7c3aed'),
    second:   v('--second', '#db2777'),
    mark:     v('--mark', '#16a34a'),
    good:    v('--good', '#34d399'),
    bad:     v('--bad', '#fb7185'),
    ballHi:   v('--ball-hi', '#fffdf6'),
    ball:     v('--ball', '#e9e1cf'),
    ballLow:  v('--ball-low', '#8d8370'),
    ballLine: v('--ball-line', '#241e17'),
  };
}

/* ── the object ────────────────────────────────────────────────────────
   It is a ball, so it is drawn as one: a sphere lit from above-left, a seam
   across it, and a rim so it holds its edge against lit grass or a night sky.

   It does NOT take a quantity's hue. Colour on this site means velocity,
   displacement or acceleration, and the ball is none of those — it is the
   thing they are about. Drawing it in velocity orange was what made the whole
   scene read as one colour, with the object, its path and its vector all the
   same.

   At its real 0.22 m the ball is only a few pixels across at stadium scale, so
   below about 5 px of radius a RING in the owning quantity's hue does the
   finding. The ring is a magnifier, not a second object: a faint fill of the
   same hue reads as "the ball, enlarged" rather than "a circle nearby". The
   ring is also where a second object's magenta goes, which is how two balls
   stay told apart when both are specks.

   @param r      the ball's true radius in pixels, not a minimum
   @param ring   hue of the magnifier ring, or null for no ring
   @param fired  before launch the ring is lighter — nothing is moving yet */
export function ballSprite(ctx, x, y, r, { ring = null, fired = true } = {}) {
  const P = palette();

  if (r < 5 && ring) {
    const R = Math.max(10, r + 7);
    ctx.save(); ctx.globalAlpha = 0.16; dot(ctx, x, y, R, { fill: ring }); ctx.restore();
    dot(ctx, x, y, R, { stroke: ring, width: fired ? 1.8 : 1.3 });
  }

  const R = Math.max(2.2, r);

  // Under about 4 px across there is no room for shading; a two-tone disc is
  // the most ball-like thing that still resolves.
  if (R < 4) {
    dot(ctx, x, y, R, { fill: P.ball, stroke: P.ballLine, width: 0.9 });
    return;
  }

  ctx.save();
  const g = ctx.createRadialGradient(x - R * 0.34, y - R * 0.38, R * 0.08, x, y, R * 1.04);
  g.addColorStop(0, P.ballHi);
  g.addColorStop(0.5, P.ball);
  g.addColorStop(1, P.ballLow);
  ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();

  // A football, once there is room for one. Below this the panels are mud and
  // the shaded disc above is the most ball-like thing that still resolves.
  if (R >= 6) {
    ctx.clip();
    panels(ctx, x, y, R, P);
  }
  ctx.restore();

  dot(ctx, x, y, R, { stroke: P.ballLine, width: Math.max(0.9, R * 0.085) });
}

/* MOVED HERE FROM js/render/scene.js, which is no longer the only thing that
   draws her. The parachute drop has its own window now — four panes, one of
   them a sky with an aircraft in it (js/render/drop.js) — and a sprite with
   two call sites belongs with the other sprite rather than inside one of the
   two views. The side-on stadium view still draws her for any descent that
   reaches it. */
/* ── the parachutist ────────────────────────────────────────────────────
   A body, and a canopy once she has pulled. Both are drawn at their real
   sizes in metres, taken from D.prop like every other object in the world —
   a 1.8 m person and a 7 m canopy — so they shrink with everything else and
   the canopy is honestly about four times her height across. At a frame
   holding a hundred metres she is a few pixels tall and the canopy is a
   couple of dozen across, which is enough to read as a person under a
   parachute rather than as a dot.

   THE INFLATION IS DRAWING, NOT PHYSICS. The canopy widens over the first
   part of the deceleration phase instead of appearing full-size in one
   frame. The model's acceleration still changes instantly at the instant she
   pulls — descent.js says so and the ending card says so — and this is the
   picture agreeing with the model's own story about WHY it changes: the
   canopy is filling. Nothing is computed from it.

   At a very wide frame she and the canopy both fall under a pixel. Rather
   than drawing a smear, there is a floor: the canopy never goes below a few
   pixels across, so "the canopy is open" stays visible from any distance.
   The same decision ballSprite makes for a football, for the same reason. */
export function parachutist(ctx, x, y, scale, f, t, P) {
  // Real metres, from the one place this codebase keeps real metres.
  const body = Math.max(3, D.prop.person.h * scale);
  const here = f.at(t);
  // How far through the opening she is: 0 before she pulls, 1 once the canopy
  // is full. The phase keys come from descent.js.
  const open = here.key === 'free' ? 0
    : here.key === 'canopy' ? clamp((t - here.t0) / Math.max(0.28, here.t * 0.45), 0, 1)
    : 1;

  ctx.save();
  if (open > 0.02) {
    const half = Math.max(3.5, (D.prop.canopy.w * scale * open) / 2);
    const rise = half * 0.62;
    const top = y - body * 0.5 - rise - Math.max(2, body * 0.9);
    const hang = y - body * 0.5;
    // the lines first, so the canopy sits over them
    ctx.strokeStyle = P.vel; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
    for (const k of [-1, -0.45, 0.45, 1]) {
      ctx.beginPath(); ctx.moveTo(x + half * k, top + rise); ctx.lineTo(x, hang); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(x - half, top + rise);
    ctx.quadraticCurveTo(x, top - rise * 0.55, x + half, top + rise);
    ctx.lineWidth = Math.max(1.8, body * 0.16);
    ctx.strokeStyle = P.mark; ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.fillStyle = P.mark; ctx.fill();
    ctx.globalAlpha = 1;
  }
  // the body: a head and a trunk, the same two shapes the defensive wall uses
  ctx.fillStyle = P.vel;
  ctx.beginPath(); ctx.arc(x, y - body * 0.34, Math.max(1.2, body * 0.17), 0, 7); ctx.fill();
  ctx.fillRect(x - Math.max(1, body * 0.13), y - body * 0.18,
               Math.max(2, body * 0.26), Math.max(2, body * 0.6));
  ctx.restore();
}

/* ── the gap the object keeps around itself ──────────────────────────────
   THE BALL IS THE SUBJECT AND IT HAS TO WIN. It is drawn after the world and
   so it is never behind anything, but being in front is not the same as being
   legible: one flight crosses sky, lit grass, orange seats, dark concrete,
   roof fascia and bare earth, and against two or three of those the ball and
   the ring that finds it were the same tone as whatever they sat on. Measured
   on a throw from the upper tier, the band immediately outside the ring
   differed from the scenery beyond it by six luminance levels out of 255.
   That is not a ball in front of a stand; that is a ball in a stand.

   So it carries its own gap: a soft ring of the page's own background colour,
   laid down before the ball and underneath it, which separates the mark from
   whatever happens to be behind it. Where the background already IS that
   colour — the sky, most of the time — it costs nothing and shows nothing,
   which is why it can simply always be drawn rather than having to work out
   what is back there.

   It is the same device as the casing under the trajectory stroke, the casing
   round an arrow and the halo behind a label, done the way those are done:
   two passes, a wide faint one and a narrow strong one, so the edge falls off
   instead of reading as a second ring. And it is kept TIGHT — about eight
   pixels of spread — because it is punching a hole in a stadium somebody has
   been asked to judge a height against.

   IT IS NOT DRAWN BY ballSprite, and that is deliberate. Laid down with the
   ball it would land on top of the path and of the velocity arrow, both of
   which are drawn before the object and both of which MEET the object — so
   the trail would have a pale notch in it eight pixels behind the ball and
   the vector would appear to float off its own tail. The caller puts it down
   before any of the flight's own annotation, so the gap carries the ball, the
   last of its trail and the root of its vector together, which is the group
   that has to read as being in front. */
export function clearance(ctx, x, y, R) {
  ctx.save();
  ctx.strokeStyle = cssVar('--surface', '#131210');
  ctx.lineJoin = 'round'; ctx.setLineDash([]);
  for (const [wide, alpha] of [[Math.max(7, R * 0.85), 0.34], [Math.max(4, R * 0.45), 0.72]]) {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = wide;
    // The stroke starts at the mark's own rim and spreads outward, so none of
    // it lands on the ball.
    ctx.beginPath(); ctx.arc(x, y, R + wide / 2 - 1, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** The ball's drawn radius in pixels — one place, so both call sites agree.

   TRUE SIZE, WITH A CEILING. The ball is 0.22 m and it is drawn 0.22 m, so it
   shrinks and grows with the view exactly as the trajectory it sits on does.
   There used to be a 1.45× exaggeration in the dimension sheet to stop it
   being a speck, and the speck is not what it fixed: at stadium scale the
   ball is about a pixel either way and the magnifier ring in ballSprite is
   what finds it. What the factor DID do was at the close end, where it made
   an already large ball half again larger.

   The ceiling is the other half of the same problem. Zoom into a flight a few
   centimetres long and a true-size ball is two hundred pixels across — a
   football covering a trajectory four pixels long, which is the one thing on
   the screen it exists to show. The path is a 3.4 px stroke in a 6.2 px
   casing and it stays that whatever the scale; above BALL_MAX the ball joins
   it and stays a mark of the same order instead of inflating past it. There
   is still room for the panels inside it, so it is still a football.

   In pixels, and so declared HERE rather than in dims.js: that sheet is
   metres everywhere and a screen distance in it would be the first thing in
   the file that is not a measurement of the world. */
const BALL_MAX = 9;
export const ballRadius = (scale) => Math.min(BALL_MAX, (D.prop.ball / 2) * scale);

/**
 * How big the object reads on screen, magnifier ring included.
 *
 * `ballRadius` is the BALL; this is the MARK. Below five pixels the ring is
 * what the eye finds and the ball inside it is a speck, so anything sizing
 * itself against the object — the gap it keeps, a hit test — has to ask about
 * the ring instead, and ask in one place so the two cannot disagree.
 */
export function markRadius(scale) {
  const r = ballRadius(scale);
  return r < 5 ? Math.max(10, r + 7) : Math.max(2.2, r);
}

/* ── the panels ─────────────────────────────────────────────────────────
   A truncated icosahedron: twelve black pentagons on twenty white hexagons.
   From any one direction you see one pentagon face-on and five around it,
   which is the whole of what makes the pattern recognisable — so that is what
   is drawn, and the hexagons are simply the white left between them.

   Two things keep it reading as a SPHERE rather than as a sticker.

   The ring of five is pushed outwards and squashed ALONG the radius by how
   far out it sits, which is what foreshortening does to a face turning away
   from you. And the whole arrangement is tipped towards the light that the
   gradient underneath is already coming from, so the pattern and the shading
   agree about which way the ball is facing.

   Everything is inside the caller's clip, so nothing can escape the disc. */
function panels(ctx, x, y, R, P) {
  const TILT = -0.45;                       // towards the light, up and left
  const pent = (cx, cy, r, rot, squashAxis, squash) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = rot + (i / 5) * Math.PI * 2;
      let dx = Math.cos(a) * r, dy = Math.sin(a) * r;
      if (squash < 1) {                     // flatten along the radius
        const ca = Math.cos(squashAxis), sa = Math.sin(squashAxis);
        const along = dx * ca + dy * sa, across = -dx * sa + dy * ca;
        const a2 = along * squash;
        dx = a2 * ca - across * sa; dy = a2 * sa + across * ca;
      }
      i ? ctx.lineTo(cx + dx, cy + dy) : ctx.moveTo(cx + dx, cy + dy);
    }
    ctx.closePath();
  };

  // the seams first, so the pentagons sit on top of them
  ctx.strokeStyle = P.ballLine;
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = Math.max(0.7, R * 0.055);
  for (let i = 0; i < 5; i++) {
    const a = TILT + (i / 5) * Math.PI * 2 + Math.PI / 5;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * R * 0.26, y + Math.sin(a) * R * 0.26);
    ctx.lineTo(x + Math.cos(a) * R * 1.02, y + Math.sin(a) * R * 1.02);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const CX = x - R * 0.08, CY = y - R * 0.08;   // the face we are looking at
  ctx.fillStyle = P.ballLine;
  pent(CX, CY, R * 0.30, -Math.PI / 2, 0, 1);
  ctx.fill();

  for (let i = 0; i < 5; i++) {
    const a = TILT + (i / 5) * Math.PI * 2;
    const d = R * 0.72;
    const px = CX + Math.cos(a) * d, py = CY + Math.sin(a) * d;
    // the further round the curve, the more edge-on it is
    const out = Math.hypot(px - x, py - y) / R;
    pent(px, py, R * 0.235, a + Math.PI / 2, a, Math.max(0.3, 1 - out * 0.78));
    ctx.fill();
  }
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** A token colour at some opacity — '#B45309' → 'rgba(180,83,9,0.3)'. */
export function withAlpha(c, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(c).trim());
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/* THE THEME'S AREA FILL: the series' own hue, strongest under the line and
   fading to almost nothing at the axis — the soft wash under the charts in
   the theme. Used for the area a graph is ABOUT (displacement under v–t),
   so it still means something; it is not decoration. */
export function fade(ctx, color, yTop, yBottom, top = 0.30, bottom = 0.03) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
  g.addColorStop(0, withAlpha(color, top));
  g.addColorStop(1, withAlpha(color, bottom));
  return g;
}

// Every number on a canvas goes through here, and through js/notation.js from
// there — so a negative value on an axis is −3, with a minus sign, and a huge
// one is 1.2 × 10⁵ rather than a programmer's 1.2e+5.
export function fmt(x, dp = 1) {
  return num(x, dp);
}

export function niceStep(span, target = 6) {
  if (span <= 0) return 1;
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * mag;
}

export function stroke(ctx, pts, { color, width = 2, dash = null, alpha = 1 } = {}) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.setLineDash(dash || []);
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke(); ctx.restore();
}

/**
 * A vector: a shaft and a head, and whatever casing it still needs.
 *
 * THE CASING USED TO BE THE PROBLEM. It was the surface colour at alpha 0.55
 * and `width + 3.4`, which on a 2.3-wide shaft is a 5.7-wide pale slab — wider
 * than the mark it exists to protect, and squared off at both ends because it
 * followed the shaft only and stopped where the head began. That pale slab
 * with a dark line down the middle is what read as a rectangle.
 *
 * It still exists, because an arrow crosses sky, lit grass, dark seating and
 * bare concrete in one stroke and there is always some background it nearly
 * matches. But it is proportional now rather than a fixed 3.4 px, it is
 * lighter, and it follows the HEAD as well as the shaft, so the silhouette it
 * protects is arrow-shaped. Pushing the stadium back behind the flight took
 * most of the work off it in the first place.
 */
export function arrow(ctx, x0, y0, x1, y1,
                      { color, width = 2.4, head = 11, dash = null, casing = true, alpha = 1 } = {}) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len, hl = Math.min(head, len * 0.5);
  // the head, as a path, so the casing and the fill can share it
  const nose = () => {
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * hl - uy * hl * 0.38, y1 - uy * hl + ux * hl * 0.38);
    ctx.lineTo(x1 - ux * hl + uy * hl * 0.38, y1 - uy * hl - ux * hl * 0.38);
    ctx.closePath();
  };
  if (casing) {
    ctx.save();
    ctx.strokeStyle = cssVar('--surface', '#131210');
    ctx.globalAlpha = 0.4 * alpha; ctx.lineWidth = width * 1.75; ctx.lineCap = 'round';
    ctx.lineJoin = 'round'; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    nose(); ctx.lineWidth = width * 1.3; ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash || []);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * hl * 0.9, y1 - uy * hl * 0.9); ctx.stroke();
  ctx.setLineDash([]);
  nose(); ctx.fill();
  ctx.restore();
}

export function dot(ctx, x, y, r, { fill, stroke: st, width = 2 } = {}) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (st) { ctx.strokeStyle = st; ctx.lineWidth = width; ctx.stroke(); }
  ctx.restore();
}

/* ── labels ────────────────────────────────────────────────────────────
   13px is the floor everywhere on this site, and canvas text ignores CSS,
   so the floor is enforced here by hand. Labels are queued with a priority
   and placed in one pass.

   THE FLOOR IS 13. It used to be 15, which silently overrode every `size: 13`
   a caller asked for — and the far-field text, which bypasses this queue,
   drew at a genuine 13. Two label systems with two different floors is one
   too many, so the floor is the floor and chrome may actually use it. */
const MIN_SIZE = 13;
const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function labels() {
  const q = [], held = [];
  return {
    add(text, x, y, o = {}) { q.push({ text, x, y, o, pri: o.pri ?? 0 }); },
    /** Keep labels off a drawn thing — a figure, a post — as if it were a
        label already placed: { x, y, w, h }, top-left and size. */
    reserve(box) { held.push(box); },
    draw(ctx, w, h) {
      q.sort((a, b) => b.pri - a.pri);
      const placed = [...held];
      for (const it of q) {
        const o = it.o;
        const size = Math.max(MIN_SIZE, o.size ?? MIN_SIZE);
        // CANVAS TEXT IGNORES CSS, so the weight floor is enforced here the
        // same way the size floor above it is. 600 against scenery, because a
        // label on a canvas has no leading, no colour contrast it can rely on
        // and a halo rather than a plate behind it — the page's 500 reads
        // thinner over grass and seating than it does over a card.
        const weight = o.weight || 600;
        ctx.save();
        ctx.font = `${weight} ${size}px ${cssVar('--font', 'system-ui, sans-serif')}`;
        const tw = ctx.measureText(it.text).width;
        ctx.restore();

        const align = o.align || 'left';
        const off = align === 'center' ? -tw / 2 : align === 'right' ? -tw : 0;
        const bh = size + 10;
        let ax = it.x;
        const left = (a) => a + off - 5;
        if (left(ax) < 3) ax += 3 - left(ax);
        if (left(ax) + tw + 10 > w - 3) ax -= left(ax) + tw + 10 - (w - 3);

        let y = null;
        const bias = o.push === 'down' ? 1 : -1;
        // A label that has to travel a long way to find space is no longer
        // attached to the thing it names, so some labels cap how far they move.
        const ladder = [0, 20, 40, 60, 80].filter((d) => d <= (o.maxPush ?? Infinity));
        outer:
        for (const step of ladder) {
          for (const d of (step === 0 ? [0] : [bias, -bias])) {
            const cy = it.y + d * step;
            const box = { x: left(ax), y: cy - bh / 2, w: tw + 10, h: bh };
            if (box.y < 2 || box.y + box.h > h - 2) continue;
            if (placed.some((p) => hits(p, box))) continue;
            placed.push(box); y = cy; break outer;
          }
        }
        // A label that cannot find space used to be dropped outright, which
        // could silently delete "velocity" on a crowded frame. High-priority
        // labels now take the furthest slot they can reach and draw a leader
        // back to what they name; only low-priority chrome is still dropped.
        let leader = null;
        if (y === null) {
          // A label that capped how far it may move is not sent further than
          // that by the fallback either: it is dropped, not flung across the
          // canvas on a leader.
          if (it.pri < 6 || o.maxPush != null) continue;
          for (const step of [100, 130, 160, 190]) {
            const cy = it.y + bias * step;
            const box = { x: left(ax), y: cy - bh / 2, w: tw + 10, h: bh };
            if (box.y < 2 || box.y + box.h > h - 2) continue;
            if (placed.some((pB) => hits(pB, box))) continue;
            placed.push(box); y = cy; leader = { x: it.x, y: it.y }; break;
          }
          if (y === null) continue;
        }

        ctx.save();
        ctx.font = `${weight} ${size}px ${cssVar('--font', 'system-ui, sans-serif')}`;
        ctx.textAlign = align; ctx.textBaseline = 'middle';
        if (leader) {
          ctx.strokeStyle = o.color || cssVar('--ink-muted', '#888');
          ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(leader.x, leader.y); ctx.lineTo(ax, y); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (o.bg !== false) {
          // A plate is an opaque hole punched in the drawing. In the light
          // theme eight of them were the brightest objects on the canvas, so
          // the label now gets a halo in the surface colour instead: it lifts
          // the text off whatever is behind it without erasing it.
          ctx.save();
          ctx.strokeStyle = cssVar('--surface', '#131210');
          ctx.globalAlpha = 0.92; ctx.lineWidth = 4.5;
          ctx.lineJoin = 'round'; ctx.miterLimit = 2;
          ctx.strokeText(it.text, ax, y);
          ctx.globalAlpha = 0.5; ctx.lineWidth = 8;
          ctx.strokeText(it.text, ax, y);
          ctx.restore();
        }
        ctx.fillStyle = o.color || cssVar('--ink', '#fff');
        ctx.fillText(it.text, ax, y);
        ctx.restore();
      }
      q.length = 0;
    },
  };
}

/** A measured length or speed for a ruler or a tag: three significant
    figures, as a paper answers (60.107 → 60.1, 0.04567 → 0.0457). */
export function sig3(x) {
  if (!isFinite(x) || x === 0) return num(x || 0, 0);
  const dp = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x))));
  return num(x, dp);
}

/** Where the app's readouts sit over the stage, in canvas pixels, for
    labels().reserve and for keeping key art clear: the left column of
    `rows` boxes (a kit's hud(...).left.length) and the clock top right.
    Measured from css/app.css (.hud-l, .hud-r): 218 × 64 boxes every 72 px
    on a laptop, 182 × 55 every 63 px under 520 px wide, 16 px in. */
export function hudBoxes(w, rows = 3) {
  const phone = w < 520, bw = phone ? 182 : 218, step = phone ? 63 : 72;
  return [
    { x: 0, y: 0, w: 16 + bw + 8, h: 16 + step * Math.max(1, rows) },
    { x: w - 148, y: 0, w: 148, h: 88 },
  ];
}
