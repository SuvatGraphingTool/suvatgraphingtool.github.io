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
  return { ctx, w, h };
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

/** The ball's drawn radius in pixels — one place, so both call sites agree. */
export const ballRadius = (scale) => (D.prop.ball / 2) * D.prop.ballDraw * scale;

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
  const q = [];
  return {
    add(text, x, y, o = {}) { q.push({ text, x, y, o, pri: o.pri ?? 0 }); },
    draw(ctx, w, h) {
      q.sort((a, b) => b.pri - a.pri);
      const placed = [];
      for (const it of q) {
        const o = it.o;
        const size = Math.max(MIN_SIZE, o.size ?? MIN_SIZE);
        const weight = o.weight || 500;
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
          if (it.pri < 6) continue;
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
