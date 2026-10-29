// marks.js — the stage for a ball falling freely past two marks M and N: a
// tall stone building with a window from M (its top) to N (its bottom), or a
// cliff face with the two marked on it. Side on at one scale, down the page.
//
// The building is a place: stone courses, a cornice and a parapet, rows of
// framed windows with sills (some lit at dusk), the tall stair window whose
// top and bottom are M and N, a plinth on a paved pavement with a kerb, the
// road and a street lamp; behind it a skyline of solid buildings with depth.
// Someone on the roof leans on the parapet and holds the ball out over the
// street; the hand opens when it is let go. The cliff is layered rock with a
// grass cap above a shingle beach and the sea. The ball falls beside the
// wall, its velocity a solid arrow (vertical, rule 2); passing each mark
// pulses and is ringed, with the speed there set off to the side. In letters
// the heights are labelled in u²⁄g, the times in u⁄g. With no ground height
// given the pavement is drawn below N but not measured.
//
// Everything drawn is read from js/core/marks.js (rule 4).

import { dust, pulse, ageOf, phaseOf } from './effects.js';
import { env, rng, skyscape, stone, softShadow, water } from './scenery.js';
import { ballAt } from './figures.js';
import { fitCanvas, palette, clamp, labels, stroke, arrow, dot, withAlpha } from './util.js';
import { inLetters } from '../core/letters.js';
import { T, num } from '../notation.js';

const TAU = Math.PI * 2;
const s3 = (x) => {
  if (!isFinite(x) || x === 0) return num(0, 0);
  const dp = Math.max(0, 2 - Math.floor(Math.log10(Math.abs(x))));
  // trailing zeros only go when the number is exactly that (given data): 10.98 is 11.0, 0.5 stays 0.5
  return num(x, dp, { trim: Math.abs(x - Number(x.toFixed(dp))) < 1e-9 });
};

function keepHud(L, w, rows) {
  const phone = w < 520;
  L.reserve({ x: 0, y: 0, w: phone ? 150 : 205, h: 16 + rows * (phone ? 50 : 60) });
  L.reserve({ x: w - (phone ? 195 : 235), y: 0, w: phone ? 195 : 235, h: phone ? 64 : 74 });
}

/* ── the town behind ───────────────────────────────────────────────────── */

/** A skyline of solid buildings standing on y = Y across 0..w, `far` the
    hazier back row: each a lit front face, a shaded side, a roof edge,
    windows (lit at dusk), a tank or a mast on some roofs. */
function town(g, w, Y, tall, far, seed) {
  const E = env(), n = E.night, r = rng(seed);
  const mix = far ? (n ? ['#2f2a33', '#28232c'] : ['#b3a7a6', '#a0948f']) : (n ? ['#3d3640', '#332d37'] : ['#8f8481', '#7b706d']);
  g.save();
  for (let x = -20; x < w + 20;) {
    const bw = 48 + r() * 70, bh = tall * (0.35 + r() * 0.65), side = 8 + r() * 8, top = Y - bh;
    g.fillStyle = mix[1]; g.beginPath(); g.moveTo(x + bw, top); g.lineTo(x + bw + side, top + side * 0.5); g.lineTo(x + bw + side, Y); g.lineTo(x + bw, Y); g.closePath(); g.fill();
    const fg = g.createLinearGradient(x, 0, x + bw, 0); fg.addColorStop(0, mix[0]); fg.addColorStop(1, mix[1]);
    g.fillStyle = fg; g.fillRect(x, top, bw, bh);
    g.fillStyle = n ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.28)'; g.fillRect(x, top, bw, 2);
    // windows in a grid
    const cw = 9, ch = 11;
    for (let yy = top + 8; yy < Y - 12; yy += ch + 7) for (let xx = x + 7; xx < x + bw - cw - 4; xx += cw + 7) {
      const lit = n && r() < 0.3;
      g.fillStyle = lit ? withAlpha(E.window, far ? 0.55 : 0.8) : (n ? 'rgba(10,10,20,0.45)' : (far ? 'rgba(90,100,115,0.35)' : 'rgba(70,82,98,0.55)'));
      g.fillRect(xx, yy, cw, ch);
    }
    if (r() < 0.35) { g.fillStyle = mix[1]; g.fillRect(x + bw * 0.6, top - 12, 14, 12); g.fillRect(x + bw * 0.6 + 2, top - 15, 10, 3); }
    else if (r() < 0.3) { g.strokeStyle = mix[1]; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + bw * 0.3, top); g.lineTo(x + bw * 0.3, top - 22); g.stroke(); }
    x += bw + side + 4 + r() * 16;
  }
  // mist them into the sky a little
  const hz = g.createLinearGradient(0, Y - tall, 0, Y);
  hz.addColorStop(0, withAlpha(E.haze, 0)); hz.addColorStop(1, withAlpha(E.haze, far ? 0.45 : 0.2));
  g.fillStyle = hz; g.fillRect(0, Y - tall, w, tall);
  g.restore();
}

/** The pavement and the road in front of it: paving slabs, a kerb, tarmac. */
function street(g, w, Y, h, P) {
  const E = env(), n = E.night, r = rng(83);
  g.save();
  const pd = Math.min(14, (h - Y) * 0.35);
  const pg = g.createLinearGradient(0, Y, 0, Y + pd); pg.addColorStop(0, n ? '#6b6468' : '#c9c0b8'); pg.addColorStop(1, n ? '#524b50' : '#aea49b');
  g.fillStyle = pg; g.fillRect(0, Y, w, pd);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
  for (let x = r() * 30; x < w; x += 38) { g.beginPath(); g.moveTo(x, Y); g.lineTo(x - 4, Y + pd); g.stroke(); }
  g.fillStyle = n ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.45)'; g.fillRect(0, Y, w, 1.5);
  // the kerb
  g.fillStyle = n ? '#827a7f' : '#d9d2ca'; g.fillRect(0, Y + pd, w, 4);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, Y + pd + 4, w, 1.5);
  // the road
  const rg = g.createLinearGradient(0, Y + pd + 5, 0, h); rg.addColorStop(0, n ? '#2f292d' : '#6f676a'); rg.addColorStop(1, n ? '#1d181b' : '#554e51');
  g.fillStyle = rg; g.fillRect(0, Y + pd + 5, w, h - Y - pd - 5);
  g.fillStyle = withAlpha(n ? '#ffffff' : '#000000', 0.07);
  for (let i = 0; i < w * (h - Y) / 80; i++) g.fillRect(r() * w, Y + pd + 6 + r() * (h - Y - pd - 6), 1.2, 1.2);
  if (h - Y - pd > 18) { g.strokeStyle = withAlpha(E.line, 0.8); g.lineWidth = 2; g.setLineDash([22, 18]); g.beginPath(); g.moveTo(0, Y + pd + (h - Y - pd) * 0.6); g.lineTo(w, Y + pd + (h - Y - pd) * 0.6); g.stroke(); g.setLineDash([]); }
  g.restore();
}

/** A street lamp standing on the pavement at (x, Y), its head at y = top. */
function streetLamp(g, x, Y, top, n) {
  g.save();
  softShadow(g, x, Y + 2, 12, 3, 0.8);
  const pg = g.createLinearGradient(x - 3, 0, x + 3, 0); pg.addColorStop(0, '#6b7178'); pg.addColorStop(1, '#2e3238');
  g.fillStyle = pg; g.fillRect(x - 2.5, top, 5, Y - top); g.fillRect(x - 5, Y - 18, 10, 18);
  g.strokeStyle = '#3a3f45'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, top + 4); g.quadraticCurveTo(x, top - 8, x - 22, top - 6); g.stroke();
  g.fillStyle = '#3a3f45'; g.beginPath(); g.moveTo(x - 32, top - 4); g.lineTo(x - 14, top - 4); g.lineTo(x - 18, top - 9); g.lineTo(x - 28, top - 9); g.closePath(); g.fill();
  if (n) { const gl = g.createRadialGradient(x - 23, top - 1, 0, x - 23, top - 1, 40); gl.addColorStop(0, 'rgba(255,220,160,0.6)'); gl.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x - 23, top - 1, 40, 0, TAU); g.fill(); }
  g.fillStyle = n ? '#ffe2a8' : '#f4efe2'; g.fillRect(x - 29, top - 4, 12, 2.5);
  g.restore();
}

/* ── the building ──────────────────────────────────────────────────────── */

/** An ordinary window at (x, y), w × h: a stone surround, glass with the sky
    in it, glazing bars, a sill with its shadow; lit inside at dusk if `lit`. */
function frameWindow(g, x, y, w, h, lit, n) {
  g.fillStyle = n ? '#8a8086' : '#e4dcd2'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
  const gl = g.createLinearGradient(x, y, x + w, y + h);
  if (lit) { gl.addColorStop(0, '#ffd9a8'); gl.addColorStop(1, '#d99a64'); }
  else { gl.addColorStop(0, n ? '#3a4560' : '#a9c1d1'); gl.addColorStop(1, n ? '#1c2233' : '#6f8ca0'); }
  g.fillStyle = gl; g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.35, y + h); g.closePath(); g.fill();
  g.strokeStyle = n ? '#d6ccc4' : '#f6f2ea'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * 0.42); g.lineTo(x + w, y + h * 0.42); g.stroke();
  g.fillStyle = n ? '#9c9298' : '#efe8de'; g.fillRect(x - 5, y + h + 3, w + 10, 4);
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x - 4, y + h + 7, w + 8, 3);
}

/** A building's front, from x0 to its edge, from the parapet top at `top`
    down to the pavement at Y: stone courses, a cornice, string courses,
    rows of windows, a plinth; the tall stair window from wy0 to wy1 in the
    bay by the edge. */
export function buildingWall(g, x0, edge, top, Y, wy0, wy1, P) {
  const E = env(), n = E.night, r = rng(91), W = edge - x0;
  g.save();
  softShadow(g, edge, Y + 2, 26, 4, 0.7);
  stone(g, x0, top, W, Y - top, { course: 11, color: n ? '#6e6469' : '#c7bcae', seed: 23 });
  // the shaded return of the parapet and the cornice under it
  g.fillStyle = n ? '#857a80' : '#ddd3c6'; g.fillRect(x0, top - 3, W + 3, 5);
  const cy = top + 16;
  g.fillStyle = n ? '#7e7379' : '#d6ccbf'; g.fillRect(x0, cy, W + 6, 7);
  g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(x0, cy + 7, W + 6, 4);
  // storeys of windows, stopping short of the stair bay
  const S = 64, bayX = edge - 54;
  for (let row = 0, yy = cy + 26; yy + 38 < Y - 22; row++, yy += S) {
    g.fillStyle = 'rgba(0,0,0,0.12)'; if (row > 0) g.fillRect(x0, yy - 14, W, 2);
    for (let xx = bayX - 46; xx > x0 - 10; xx -= 50) frameWindow(g, xx, yy, 24, 38, n && r() < 0.4, n);
  }
  // the stair window: one tall opening, transoms down it, a lintel and a sill
  const ww = 34, wx = edge - 46;
  g.fillStyle = n ? '#8a8086' : '#e4dcd2'; g.fillRect(wx - 4, wy0 - 8, ww + 8, wy1 - wy0 + 12);
  const gl = g.createLinearGradient(wx, wy0, wx + ww, wy1);
  gl.addColorStop(0, n ? '#3e4a66' : '#b4cad8'); gl.addColorStop(1, n ? '#1c2233' : '#6f8ca0');
  g.fillStyle = gl; g.fillRect(wx, wy0, ww, wy1 - wy0);
  g.fillStyle = 'rgba(255,255,255,0.20)';
  for (let yy = wy0; yy < wy1; yy += 90) { g.beginPath(); g.moveTo(wx + 4, Math.min(wy1, yy + 70)); g.lineTo(wx + 22, yy); g.lineTo(wx + 30, yy); g.lineTo(wx + 12, Math.min(wy1, yy + 70)); g.closePath(); g.fill(); }
  g.strokeStyle = n ? '#2a2830' : '#4a4f58'; g.lineWidth = 2;
  g.strokeRect(wx, wy0, ww, wy1 - wy0);
  g.beginPath(); g.moveTo(wx + ww / 2, wy0); g.lineTo(wx + ww / 2, wy1);
  const panes = Math.max(1, Math.round((wy1 - wy0) / 44));
  for (let i = 1; i < panes; i++) { const yy = wy0 + ((wy1 - wy0) * i) / panes; g.moveTo(wx, yy); g.lineTo(wx + ww, yy); }
  g.stroke();
  g.fillStyle = n ? '#958a90' : '#d2c7b9'; g.fillRect(wx - 7, wy0 - 9, ww + 14, 6);               // the lintel at M
  g.fillStyle = n ? '#9c9298' : '#efe8de'; g.fillRect(wx - 7, wy1, ww + 14, 5);                  // the sill at N
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(wx - 6, wy1 + 5, ww + 12, 3);
  // the plinth
  g.fillStyle = n ? '#4f474c' : '#9d9184'; g.fillRect(x0, Y - 18, W + 3, 18);
  g.fillStyle = n ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.35)'; g.fillRect(x0, Y - 18, W + 3, 1.5);
  // the corner catching the light, the shaded edge
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(edge - 3, top, 3, Y - top);
  g.restore();
}

/** The parapet at the roof edge: a coping on a short wall from x0 to edge, its top at y. */
function parapet(g, x0, edge, y, n) {
  g.save();
  stone(g, x0, y, edge - x0, 14, { course: 7, color: n ? '#766c71' : '#cdc2b4', seed: 31 });
  g.fillStyle = n ? '#958a90' : '#e6ded2'; g.fillRect(x0, y - 4, edge - x0 + 4, 5);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0, y + 1, edge - x0 + 4, 2);
  g.restore();
}

/** Someone on the roof, leaning on the parapet whose top is at y, holding
    the ball out at (hx, hy); `open` once it has been let go. */
function leaner(g, sx, y, hx, hy, open, n, o = {}) {
  const skin = n ? '#b08a74' : '#d9a988', skinFar = n ? '#7d6253' : '#b5876a', coat = n ? '#7d6a58' : '#6d5a48';
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const s = o.scale ?? 1;                                  // drawn larger about the hand, which stays on the ball
  g.translate(hx, hy); g.scale(s, s); g.translate(-hx, -hy);
  const SH = { x: sx, y: y - 12 }, hr = 7.5;
  // the body, down behind the parapet
  g.strokeStyle = coat; g.lineWidth = 12; g.beginPath(); g.moveTo(sx - 6, y + 10); g.lineTo(SH.x, SH.y); g.stroke();
  // the far arm resting on the coping
  g.strokeStyle = skinFar; g.lineWidth = 4.5; g.beginPath(); g.moveTo(SH.x - 2, SH.y + 2); g.lineTo(SH.x + 6, y - 3); g.lineTo(SH.x + 14, y - 4); g.stroke();
  // the head, looking down over the edge
  const hx0 = SH.x + 4, hy0 = SH.y - 11;
  const hg = g.createRadialGradient(hx0 - 2, hy0 - 2, 1, hx0, hy0, hr); hg.addColorStop(0, skin); hg.addColorStop(1, skinFar);
  g.fillStyle = hg; g.beginPath(); g.arc(hx0, hy0, hr, 0, TAU); g.fill();
  g.fillStyle = '#3a2c26'; g.beginPath(); g.arc(hx0 - 2, hy0 - 2, hr * 0.9, Math.PI * 0.9, Math.PI * 1.9); g.fill();
  g.fillStyle = '#2b2628'; g.beginPath(); g.arc(hx0 + 4, hy0 + 1.5, 1.1, 0, TAU); g.fill();
  // the near arm out over the street
  const EL = { x: (SH.x + hx) / 2 + 2, y: Math.min(SH.y, hy) - 3 };
  g.strokeStyle = coat; g.lineWidth = 6; g.beginPath(); g.moveTo(SH.x, SH.y); g.lineTo(EL.x, EL.y); g.stroke();
  g.strokeStyle = skin; g.lineWidth = 4.5; g.beginPath(); g.moveTo(EL.x, EL.y); g.lineTo(hx - 3, hy - 6); g.stroke();
  // the hand: cupped under the ball, or open and spread once it has gone
  g.strokeStyle = skin; g.lineWidth = 2.6;
  if (!open) { g.beginPath(); g.arc(hx, hy - 1, 6.5, Math.PI * 0.15, Math.PI * 0.95); g.stroke(); }
  else for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(hx - 3, hy - 6); g.lineTo(hx - 3 + Math.cos(a) * 9, hy - 6 + Math.sin(a) * 9); g.stroke(); }
  g.restore();
}

/** A cliff from x0 to its face near `edge`, from its top at `top` down to Y:
    layered rock, cracks, a grass cap; M and N painted on it. */
function cliff(g, x0, edge, top, Y, n) {
  const r = rng(97);
  g.save();
  const face = [];
  for (let yy = top; yy <= Y; yy += 14) face.push({ x: edge - 4 - r() * 10 - (yy - top) * 0.02, y: yy });
  face[face.length - 1].y = Y;
  g.beginPath(); g.moveTo(x0, top); for (const p of face) g.lineTo(p.x, p.y); g.lineTo(x0, Y); g.closePath();
  const cg = g.createLinearGradient(x0, 0, edge, 0); cg.addColorStop(0, n ? '#4f4542' : '#a08d7a'); cg.addColorStop(1, n ? '#6b5d57' : '#bba792');
  g.fillStyle = cg; g.fill();
  g.clip();
  // strata
  for (let yy = top + 8, i = 0; yy < Y; yy += 10 + r() * 16, i++) {
    g.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)'; g.fillRect(x0, yy, edge - x0, 4 + r() * 8);
    g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, yy); for (let x = x0; x < edge; x += 20) g.lineTo(x, yy + (r() - 0.5) * 3); g.stroke();
  }
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) { const x = x0 + r() * (edge - x0), yy = top + r() * (Y - top); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (r() - 0.5) * 8, yy + 14); g.lineTo(x + (r() - 0.5) * 12, yy + 30); g.stroke(); }
  const sh = g.createLinearGradient(edge - 30, 0, edge, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = sh; g.fillRect(edge - 30, top, 30, Y - top);
  g.restore();
  // the grass cap
  g.save(); g.fillStyle = n ? '#4f5a36' : '#7d8a52'; g.beginPath(); g.moveTo(x0, top - 6); g.lineTo(edge - 2, top - 6); g.quadraticCurveTo(edge + 2, top + 2, edge - 6, top + 6); g.lineTo(x0, top + 6); g.closePath(); g.fill();
  g.strokeStyle = n ? '#5f6b40' : '#8f9c60'; g.lineWidth = 1.2;
  for (let x = x0; x < edge - 4; x += 4) { g.beginPath(); g.moveTo(x, top - 5); g.lineTo(x + 1.5, top - 10 - r() * 4); g.stroke(); }
  g.restore();
}

/** A shingle beach from Y down to h, the sea beyond it. */
function shore(g, w, Y, h, n) {
  const r = rng(101);
  g.save();
  const sg = g.createLinearGradient(0, Y, 0, h); sg.addColorStop(0, n ? '#5b534f' : '#b8ab98'); sg.addColorStop(1, n ? '#3e3835' : '#9a8d7a');
  g.fillStyle = sg; g.fillRect(0, Y, w, h - Y);
  for (let i = 0; i < w * (h - Y) / 30; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(r() * w, Y + 2 + r() * (h - Y), 1.5 + r() * 2.5, 1 + r() * 1.5, 0, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, Y, w, 1.5);
  g.restore();
}

/** A far headland on the right, standing on the sea's horizon at Y, `tall`
    px high: two misted ridges, a lit rim, a lighthouse whose lamp shows at dusk. */
function headland(g, w, Y, tall, n, phone) {
  g.save();
  const ridge = (x0, hgt, c) => (x) => { const u = clamp((x - x0) / (w + 30 - x0), 0, 1); return Y - hgt * Math.min(1, u * 3.2) * (0.86 + 0.14 * Math.sin(u * 9 + c)); };
  for (const [far, x0, hgt, col] of [[true, w * 0.38, tall * 0.65, n ? '#3a3040' : '#b8aaa6'], [false, w * 0.58, tall, n ? '#4a3d4f' : '#9a8c84']]) {
    const yAt = ridge(x0, hgt, far ? 1.3 : 0.4);
    g.fillStyle = col; g.beginPath(); g.moveTo(x0, Y);
    for (let x = x0; x <= w + 30; x += 6) g.lineTo(x, yAt(x));
    g.lineTo(w + 30, Y); g.closePath(); g.fill();
    // the rim catching the last light
    g.strokeStyle = n ? 'rgba(255,200,180,0.22)' : 'rgba(255,255,255,0.45)'; g.lineWidth = 1.5;
    g.beginPath(); for (let x = x0 + 4; x <= w + 30; x += 6) (x === x0 + 4 ? g.moveTo(x, yAt(x) + 1) : g.lineTo(x, yAt(x) + 1)); g.stroke();
    if (!far && !phone) {
      const lx = x0 + (w - x0) * 0.62, ly = yAt(lx) + 2, th = Math.max(22, hgt * 0.35);
      g.fillStyle = '#f2ede4'; g.beginPath(); g.moveTo(lx - 5, ly); g.lineTo(lx + 5, ly); g.lineTo(lx + 3.5, ly - th); g.lineTo(lx - 3.5, ly - th); g.closePath(); g.fill();
      g.fillStyle = '#a84a3e'; g.fillRect(lx - 4.5, ly - th * 0.45, 9, th * 0.18); g.fillRect(lx - 4, ly - th * 0.85, 8, th * 0.15);
      g.fillStyle = '#2b2b30'; g.fillRect(lx - 5, ly - th - 7, 10, 3);
      g.fillStyle = n ? '#ffe2a0' : '#fff7e0'; g.fillRect(lx - 3, ly - th - 4, 6, 4);
      if (n) {
        const gl = g.createRadialGradient(lx, ly - th - 2, 0, lx, ly - th - 2, 30); gl.addColorStop(0, 'rgba(255,226,160,0.75)'); gl.addColorStop(1, 'rgba(255,226,160,0)');
        g.fillStyle = gl; g.beginPath(); g.arc(lx, ly - th - 2, 30, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,226,160,0.10)'; g.beginPath(); g.moveTo(lx, ly - th - 2); g.lineTo(lx - 160, ly - th - 26); g.lineTo(lx - 160, ly - th + 18); g.closePath(); g.fill();
      }
    }
  }
  const hz = g.createLinearGradient(0, Y - tall, 0, Y); hz.addColorStop(0, withAlpha(env().haze, 0)); hz.addColorStop(1, withAlpha(env().haze, 0.35));
  g.fillStyle = hz; g.fillRect(0, Y - tall, w, tall);
  g.restore();
}

/** Waves breaking: foam piled at the foot of the cliff (its face near `edge`)
    and a line of surf along the beach at Y, moving with the time. */
function surf(g, w, Y, edge, t, n) {
  const r = rng(113), ph = t * 2.2;
  g.save();
  g.fillStyle = n ? 'rgba(225,235,240,0.75)' : 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 18; i++) {
    const x = edge - 8 + r() * 46, rad = 2.5 + r() * 4.5, bob = Math.sin(ph * 3 + i) * 1.5;
    g.beginPath(); g.arc(x, Y - 2 - r() * 7 + bob, rad, 0, TAU); g.fill();
  }
  g.strokeStyle = n ? 'rgba(225,235,240,0.7)' : 'rgba(255,255,255,0.85)'; g.lineWidth = 2;
  g.beginPath();
  for (let x = edge + 20; x <= w; x += 6) { const y = Y - 1.5 + Math.sin(x * 0.07 + ph * 4) * 1.6; x === edge + 20 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  g.restore();
}

/** A drystone wall from x0 to x1, its top at y0 and its foot at y1: rough
    courses of stone and a row of upright copes along the top. */
function drystone(g, x0, x1, y0, y1, n) {
  const r = rng(127);
  g.save();
  g.fillStyle = n ? '#2e2a2d' : '#6e665e'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let y = y0 + 3; y < y1; y += 5.5) {
    for (let x = x0 + (r() - 0.5) * 6; x < x1 - 2; ) {
      const sw = 7 + r() * 9, sh = 4 + r() * 2.5, c = n ? 85 + r() * 30 : 150 + r() * 40;
      g.fillStyle = `rgb(${c},${c - 6},${c - 12})`; g.beginPath(); g.roundRect(Math.max(x0, x), y, Math.min(sw, x1 - x), sh, 2); g.fill();
      x += sw + 1;
    }
  }
  for (let x = x0; x < x1 - 3; x += 5) {
    const c = n ? 95 + r() * 25 : 160 + r() * 35;
    g.fillStyle = `rgb(${c},${c - 6},${c - 12})`; g.beginPath(); g.roundRect(x, y0 - 5, 4.2, 8, 1.5); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x1 - 2, y0 - 5, 2, y1 - y0 + 5);
  g.restore();
}

/* ── the stage ─────────────────────────────────────────────────────────── */

export function render(canvas, cam, o) {
  const { traj: f, t: tRaw, show = {}, fired = true } = o;
  if (!f || f.kind !== 'marks') return null;
  const { ctx: g, w, h } = fitCanvas(canvas);
  const P = palette();
  const L = labels();
  const E = env(), night = E.night;
  const phone = w < 520;
  const t = fired ? clamp(tRaw, 0, f.tMax) : 0;
  keepHud(L, w, 2);

  // ── one scale down the page: from the release (0) to the ground, or a little below N
  // with no ground given the motion ends in the air: the pavement is drawn clear below its end
  const deep = f.ground ?? Math.max(f.yN * 1.16, f.pos(f.tMax) * 1.07);
  const top = phone ? 132 : 104, band = phone ? 40 : 48, bottom = h - band, k = (bottom - top) / deep;
  const Y = (y) => top + y * k;
  const floor = Y(deep);
  const edge = phone ? Math.round(w * 0.36) : Math.max(330, Math.round(w * 0.4)), bx = edge + 17;
  const r = 7;
  const cliffy = f.look === 'cliff';

  // ── the place
  if (cliffy) {
    // the sea out to a far headland, waves coming in, foam at the foot of the cliff, a beach in front
    const seaTop = floor - clamp((floor - top) * 0.14, 34, 64);
    skyscape(g, 0, 0, w, seaTop, { far: 'none', seed: 27, clouds: 5 });
    headland(g, w, seaTop, Math.min(120, (seaTop - top) * 0.4), night, phone);
    water(g, 0, w, seaTop, floor, { phase: t * 3 });
    shore(g, w, floor, h, night);
    surf(g, w, floor, edge, t, night);
  } else {
    skyscape(g, 0, 0, w, floor, { far: 'none', seed: 27, clouds: 4 });
    town(g, w, floor, (floor - 40) * 0.75, true, 5); town(g, w, floor, (floor - 40) * 0.45, false, 9);
    street(g, w, floor, h, P);
    if (w - bx > 220) streetLamp(g, w - 60, floor + 4, Math.max(top + 40, floor - 4.5 * Math.min(k, 40)), night);
  }
  // the roof (or the cliff top) just above where it is let go, unless that is M itself
  const atM = f.yM * k < 16;                         // too little room above M for someone to hold it out
  const coping = atM ? Y(0) - 20 : Y(0) + 6;
  const lean = { scale: phone ? 1.1 : 1.35 };
  if (cliffy) {
    // the cliff path's drystone wall at the edge: they lean on it, standing on the top behind it
    cliff(g, -20, edge, coping + 14, floor, night);
    if (!atM) leaner(g, edge - 26, coping, bx, Y(0) + r * 0.2, fired && t > 1e-9, night, lean);
    drystone(g, edge - (phone ? 70 : 96), edge - 3, coping, coping + 16, night);
  } else {
    buildingWall(g, -20, edge, coping + 14, floor, Y(f.yM), Y(f.yN), P);
    if (!atM) leaner(g, edge - 26, coping, bx, Y(0) + r * 0.2, fired && t > 1e-9, night, lean);
    parapet(g, -20, edge, coping, night);
  }

  // the marks: level lines from the wall to just past the ball's line
  const lab = (c) => (f.letters ? T`${inLetters(c, 'u^2', 'g')}` : T`${s3(c)} [m]`);
  L.add(f.yM < 1e-9 ? 'let go from rest at M' : 'let go from rest', bx + 16, Y(0) - (atM ? 18 : 2), { color: P.ink, align: 'left', pri: 5, size: 13 });
  const passed = (tm) => fired && t >= tm - 1e-9;
  for (const [nm, y, tm] of [['M', f.yM, f.tM], ['N', f.yN, f.tN]]) {
    const hot = passed(tm) ? phaseOf(ageOf(t, tm, f.tMax, f.tMax / 4).age, f.tMax / 4) : null;
    stroke(g, [{ x: edge - 54, y: Y(y) }, { x: bx + 22, y: Y(y) }], { color: P.mark, width: hot != null ? 2.6 : 1.6, dash: [5, 4] });
    if (cliffy) { g.save(); g.strokeStyle = night ? '#f4f1e8' : '#ffffff'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(edge - 40, Y(y) - 5); g.lineTo(edge - 30, Y(y) + 5); g.moveTo(edge - 40, Y(y) + 5); g.lineTo(edge - 30, Y(y) - 5); g.stroke(); g.restore(); }
    L.add(nm, edge - 62, Y(y), { color: P.mark, align: 'right', pri: 9, size: 16, weight: 700 });
  }
  // dimension lines: release to M, M to N, N to the ground (when given)
  const dx = bx + (phone ? 108 : (f.letters ? 130 : 150));
  const spans = [[0, f.yM, f.yM], [f.yM, f.yN, f.yN - f.yM]];
  if (f.ground != null) spans.push([f.yN, f.ground, f.ground - f.yN]);
  for (const [a, b, c] of spans.filter(([a0, b0]) => b0 - a0 > 1e-9)) {
    stroke(g, [{ x: dx, y: Y(a) }, { x: dx, y: Y(b) }], { color: P.ink, width: 1.3, alpha: 0.85 });
    for (const yy of [Y(a), Y(b)]) stroke(g, [{ x: dx - 5, y: yy }, { x: dx + 5, y: yy }], { color: P.ink, width: 1.3, alpha: 0.85 });
    L.add(lab(c), dx + 9, (Y(a) + Y(b)) / 2, { color: P.ink, align: 'left', pri: 7, size: 14, weight: 700 });
  }

  // ── the ball, and each mark ringed as it passes
  const y = f.pos(t), v = f.vel(t);
  stroke(g, [{ x: bx, y: Y(0) }, { x: bx, y: Y(y) }], { color: P.disp, width: 2.4, alpha: 0.6 });
  for (const [tm, ym, key] of [[f.tM, f.yM, 'M'], [f.tN, f.yN, 'N']]) if (passed(tm)) {
    const { age, life } = ageOf(t, tm, f.tMax, f.tMax / 4);
    pulse(g, bx, Y(ym), age, life, P.mark, { radius: 26 });
    dot(g, bx, Y(ym), 10, { stroke: P.mark, width: 2.4 });
    const say = f.letters ? T`v = ${f.vLabel[key]}` : T`${s3(f.vel(tm))} [m s^-1]`;
    L.add(say, bx + 46, Y(ym), { color: P.vel, align: 'left', pri: 8, size: 14, weight: 700, maxPush: 40 });
  }
  if (f.ground != null && fired && t >= f.tMax - 1e-9) {
    const { age, life } = ageOf(t, f.tMax, f.tMax);
    dust(g, bx, floor, age, life, { size: 1.3, n: 18 });
  }
  if (show.velocity !== false && v > 1e-9) {
    // never into the ground: near it, the arrow arrives beside the ball instead of leaving it
    const len = (v / f.vel(f.tMax)) * 64;
    let a0 = Y(y), a1 = Y(y) + len;
    if (a1 > floor - 4) { a1 = floor - 4; a0 = a1 - len; }
    arrow(g, bx + 17, a0, bx + 17, a1, { color: P.velVec, width: 2.8, head: 11 });
  }
  if (f.ground != null) softShadow(g, bx, floor + 2, r * 1.8, 3, clamp(1 - (floor - Y(y)) / 220, 0.15, 0.8));
  ballAt(g, bx, Y(y), r);
  L.draw(g, w, h);
  return null;
}
