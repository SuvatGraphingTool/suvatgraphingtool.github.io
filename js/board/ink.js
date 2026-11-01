/* ink.js — drawing on the whiteboard, for a student's own working.

   A pen, a highlighter, an arrow (a vector is the first thing anyone draws
   on a mechanics diagram) and an eraser, over whatever Suvat has built — or
   over an empty board, with no AI at all.

   THE INK LIVES ON THE BOARD, NOT ON THE GLASS. Every point is stored in the
   board's own coordinates, so a drawing pans and zooms with the frames under
   it and a note scribbled beside a graph stays beside that graph. It is
   painted on one canvas over the viewport, at the size it is seen, from the
   same camera board.js moves.

   It is the student's, so it is theirs to colour: the five inks are not the
   physics hues and claim nothing (rule 2 is about what the app draws). It is
   kept in this browser only. */

const $ = (id) => document.getElementById(id);
const STORE = 'suvat-board-ink-v1';
const MAX_STROKES = 600;

/* 'ink' follows the theme — white by night, black by day. The rest read on
   both grounds. */
const COLOURS = [
  { k: 'ink', name: 'Ink' },
  { k: '#EF4444', name: 'Red' },
  { k: '#3B82F6', name: 'Blue' },
  { k: '#22C55E', name: 'Green' },
  { k: '#F59E0B', name: 'Amber' },
];
const HL_COLOURS = [
  { k: '#FACC15', name: 'Yellow' },
  { k: '#F472B6', name: 'Pink' },
  { k: '#38BDF8', name: 'Sky' },
  { k: '#4ADE80', name: 'Green' },
  { k: '#FB923C', name: 'Orange' },
];
const SIZES = { pen: [2, 4, 8], arrow: [2, 4, 7], hl: [14, 22, 34] };   // screen px at the zoom it was drawn
const TOOLS = ['hand', 'pen', 'hl', 'arrow', 'eraser'];
const KEYS = { v: 'hand', p: 'pen', h: 'hl', a: 'arrow', e: 'eraser' };

export function createInk({ vp, cam }) {
  const cv = document.createElement('canvas');
  cv.className = 'ink-cv';
  cv.setAttribute('aria-hidden', 'true');
  vp.append(cv);
  const g = cv.getContext('2d');

  let strokes = [];
  const undo = [], redo = [];
  let tool = 'hand';
  const pick = { pen: { c: 0, s: 1 }, hl: { c: 0, s: 1 }, arrow: { c: 0, s: 1 } };
  let live = null, hover = null, frame = 0, active = false;
  const downs = new Set();                    // touches on the glass: two is a pinch, not a line

  /* ── the camera: board → screen ──────────────────────────────────────── */
  const toWorld = (e) => {
    const r = vp.getBoundingClientRect();
    return [(e.clientX - r.left - cam.x) / cam.z, (e.clientY - r.top - cam.y) / cam.z];
  };
  function size() {
    const r = vp.getBoundingClientRect(), d = devicePixelRatio || 1;
    const w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return d;
  }

  /* ── painting ────────────────────────────────────────────────────────── */
  const inkOf = (c) => c === 'ink'
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#fff') : c;
  function path(pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 1) { g.lineTo(pts[0][0] + 0.01, pts[0][1]); return; }
    // through the midpoints: smooth, and it never overshoots the hand
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], [nx, ny] = pts[i + 1];
      g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    const l = pts[pts.length - 1];
    g.lineTo(l[0], l[1]);
  }
  function arrowHead(s) {
    const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const hl = Math.min(len * 0.45, Math.max(10 / cam.z, s.w * 4.2));
    g.beginPath();
    g.moveTo(b[0] - hl * Math.cos(ang - 0.42), b[1] - hl * Math.sin(ang - 0.42));
    g.lineTo(b[0], b[1]);
    g.lineTo(b[0] - hl * Math.cos(ang + 0.42), b[1] - hl * Math.sin(ang + 0.42));
    g.stroke();
  }
  function paintStroke(s) {
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = s.w;
    g.strokeStyle = inkOf(s.c);
    if (s.t === 'hl') {
      const day = document.documentElement.dataset.theme === 'light';
      g.globalAlpha = day ? 0.34 : 0.5;           // a night ground swallows more of it
      g.globalCompositeOperation = day ? 'multiply' : 'screen';
      g.lineCap = 'butt';
    }
    if (s.t === 'arrow') {
      const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 2 / cam.z) arrowHead(s);
    } else { path(s.pts); g.stroke(); }
    g.restore();
  }
  function render() {
    frame = 0;
    const d = size();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    g.setTransform(d * cam.z, 0, 0, d * cam.z, d * cam.x, d * cam.y);
    for (const s of strokes) if (!erasing?.hit?.has(s)) paintStroke(s);
    for (const s of strokes) if (erasing?.hit?.has(s)) { g.save(); g.globalAlpha = 0.18; paintStroke(s); g.restore(); }
    if (live) paintStroke(live);
    // the eraser's own ring, so you can see what it will take
    if (tool === 'eraser' && hover) {
      g.setTransform(d, 0, 0, d, 0, 0);
      g.beginPath(); g.arc(hover[0], hover[1], ERASE, 0, Math.PI * 2);
      g.lineWidth = 1.5; g.strokeStyle = inkOf('ink'); g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1;
    }
  }
  const later = () => { if (!frame) frame = requestAnimationFrame(render); };

  /* ── the hand ───────────────────────────────────────────────────────── */
  const ERASE = 10;                                // screen px
  let erasing = null;
  function near(s, p, r) {
    const rr = r + s.w / 2;
    const pts = s.pts.length === 1 ? [s.pts[0], s.pts[0]] : s.t === 'arrow' ? [s.pts[0], s.pts[s.pts.length - 1]] : s.pts;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L)) : 0;
      if (Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)) <= rr) return true;
    }
    return false;
  }
  function eraseAt(p) {
    for (const s of strokes) if (!erasing.hit.has(s) && near(s, p, ERASE / cam.z)) erasing.hit.add(s);
  }

  cv.addEventListener('pointerdown', (e) => {
    if (tool === 'hand' || e.button === 1) return;          // the board pans
    if (e.pointerType === 'touch') {
      downs.add(e.pointerId);
      if (downs.size > 1) { live = null; erasing = null; later(); return; }   // a pinch: let it zoom
    }
    if (e.button !== 0) return;
    cv.setPointerCapture(e.pointerId);
    const p = toWorld(e);
    if (tool === 'eraser') { erasing = { hit: new Set() }; eraseAt(p); later(); return; }
    const sz = SIZES[tool][pick[tool].s];
    const c = (tool === 'hl' ? HL_COLOURS : COLOURS)[pick[tool].c].k;
    live = { t: tool, c, w: sz / cam.z, pts: [p] };
    if (tool === 'arrow') live.pts.push([...p]);
    later();
  });
  cv.addEventListener('pointermove', (e) => {
    const r = vp.getBoundingClientRect();
    hover = [e.clientX - r.left, e.clientY - r.top];
    if (erasing) { for (const x of e.getCoalescedEvents?.() || [e]) eraseAt(toWorld(x)); later(); return; }
    if (!live) { if (tool === 'eraser') later(); return; }
    if (live.t === 'arrow') {
      let p = toWorld(e);
      if (e.shiftKey) p = snap(live.pts[0], p);
      live.pts[1] = p;
    } else {
      for (const x of e.getCoalescedEvents?.() || [e]) {
        const p = toWorld(x), l = live.pts[live.pts.length - 1];
        if (Math.hypot(p[0] - l[0], p[1] - l[1]) * cam.z >= 1.2) live.pts.push(p);
      }
      // Shift: a straight line from where it began
      if (e.shiftKey && live.pts.length > 1) live.pts = [live.pts[0], snap(live.pts[0], toWorld(e))];
    }
    later();
  });
  const finish = (e) => {
    downs.delete(e.pointerId);
    if (erasing) {
      if (erasing.hit.size) {
        const gone = strokes.filter((s) => erasing.hit.has(s));
        strokes = strokes.filter((s) => !erasing.hit.has(s));
        push({ type: 'erase', gone });
      }
      erasing = null; later(); return;
    }
    if (!live) return;
    const s = live; live = null;
    s.pts = s.pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    strokes.push(s);
    while (strokes.length > MAX_STROKES) strokes.shift();
    push({ type: 'add', s });
    later();
  };
  cv.addEventListener('pointerup', finish);
  cv.addEventListener('pointercancel', (e) => { downs.delete(e.pointerId); live = null; erasing = null; later(); });
  cv.addEventListener('pointerleave', () => { hover = null; if (tool === 'eraser') later(); });

  /* 15° steps, so a horizontal is horizontal and a 30° line is 30°. */
  function snap(a, b) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const q = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
    return [a[0] + len * Math.cos(q), a[1] + len * Math.sin(q)];
  }

  /* ── undo, and keeping it ───────────────────────────────────────────── */
  function push(op) { undo.push(op); if (undo.length > 200) undo.shift(); redo.length = 0; changed(); }
  function apply(op, back) {
    if (op.type === 'add') strokes = back ? strokes.filter((s) => s !== op.s) : [...strokes, op.s];
    else if (op.type === 'erase' || op.type === 'clear') {
      strokes = back ? [...strokes, ...op.gone] : strokes.filter((s) => !op.gone.includes(s));
    }
  }
  function undoOne() { const op = undo.pop(); if (!op) return false; apply(op, true); redo.push(op); changed(); return true; }
  function redoOne() { const op = redo.pop(); if (!op) return false; apply(op, false); undo.push(op); changed(); return true; }
  function clear() {
    if (!strokes.length) return;
    push({ type: 'clear', gone: strokes });
    strokes = [];
    changed();
  }
  let saving = 0;
  function changed() {
    later(); syncBar();
    vp.dataset.inked = String(strokes.length > 0);
    clearTimeout(saving);
    saving = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(strokes)); } catch {} }, 300);
  }
  try {
    const kept = JSON.parse(localStorage.getItem(STORE) || '[]');
    if (Array.isArray(kept)) strokes = kept.filter((s) => s && TOOLS.includes(s.t) && Array.isArray(s.pts) && s.pts.length && Number.isFinite(s.w));
  } catch {}

  /* ── the rail ───────────────────────────────────────────────────────── */
  const IC = {
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5v-7a1.5 1.5 0 0 1 3 0V12"/><path d="M14 6.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4.6 14.9a1.5 1.5 0 0 1 2.3-1.9L8 14.5"/>',
    pen: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
    hl: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
    arrow: '<path d="M5 19 19 5"/><path d="M9 5h10v10"/>',
    eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 19"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  };
  const svg = (k) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
  const NAME = { hand: 'Move the board', pen: 'Pen', hl: 'Highlighter', arrow: 'Arrow', eraser: 'Eraser' };
  const KEY = { hand: 'V', pen: 'P', hl: 'H', arrow: 'A', eraser: 'E' };

  const bar = document.createElement('div');
  bar.className = 'ink-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Drawing');
  bar.innerHTML = `<div class="ink-tools" role="radiogroup" aria-label="Tool"><span class="ink-ind" aria-hidden="true"></span>
      ${TOOLS.map((t) => `<button type="button" class="ink-t" role="radio" data-t="${t}" aria-checked="${t === tool}" aria-label="${NAME[t]} (${KEY[t]})" title="${NAME[t]} — ${KEY[t]}">${svg(t === 'hl' ? 'hl' : t)}</button>`).join('')}
    </div>
    <span class="ink-sep" aria-hidden="true"></span>
    <button type="button" class="ink-t" data-act="undo" aria-label="Undo (Ctrl Z)" title="Undo — Ctrl Z">${svg('undo')}</button>
    <button type="button" class="ink-t" data-act="redo" aria-label="Redo (Ctrl Shift Z)" title="Redo — Ctrl Shift Z">${svg('redo')}</button>
    <button type="button" class="ink-t" data-act="clear" aria-label="Clear the drawing" title="Clear the drawing">${svg('trash')}</button>
    <div class="ink-style" role="group" aria-label="Colour and size" hidden>
      <div class="ink-row ink-cols" role="radiogroup" aria-label="Colour"></div>
      <div class="ink-row ink-sizes" role="radiogroup" aria-label="Size"></div>
    </div>`;
  vp.parentElement.append(bar);
  const style = bar.querySelector('.ink-style'), ind = bar.querySelector('.ink-ind');

  function syncBar() {
    vp.dataset.tool = tool;
    for (const b of bar.querySelectorAll('.ink-tools .ink-t')) b.setAttribute('aria-checked', String(b.dataset.t === tool));
    const on = bar.querySelector(`.ink-t[data-t="${tool}"]`);
    if (on) { ind.style.transform = `translateY(${on.offsetTop}px)`; ind.style.height = `${on.offsetHeight}px`; }
    bar.querySelector('[data-act="undo"]').disabled = !undo.length;
    bar.querySelector('[data-act="redo"]').disabled = !redo.length;
    bar.querySelector('[data-act="clear"]').disabled = !strokes.length;
    const p = pick[tool];
    style.hidden = !p;
    if (!p) return;
    const cols = tool === 'hl' ? HL_COLOURS : COLOURS;
    bar.querySelector('.ink-cols').innerHTML = cols.map((c, i) => `<button type="button" class="ink-c" role="radio" data-c="${i}" aria-checked="${i === p.c}" aria-label="${c.name}" title="${c.name}" style="--c:${c.k === 'ink' ? 'var(--ink)' : c.k}"></button>`).join('');
    bar.querySelector('.ink-sizes').innerHTML = SIZES[tool].map((s, i) => `<button type="button" class="ink-s" role="radio" data-s="${i}" aria-checked="${i === p.s}" aria-label="${['Thin', 'Medium', 'Thick'][i]}" title="${['Thin', 'Medium', 'Thick'][i]}"><i style="--d:${Math.min(16, 3 + i * 4.5)}px"></i></button>`).join('');
  }
  function setTool(t) { tool = t; live = null; erasing = null; syncBar(); later(); }
  bar.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]'), a = e.target.closest('[data-act]');
    const c = e.target.closest('.ink-c'), s = e.target.closest('.ink-s');
    if (t) setTool(t.dataset.t);
    else if (a?.dataset.act === 'undo') undoOne();
    else if (a?.dataset.act === 'redo') redoOne();
    else if (a?.dataset.act === 'clear') clear();
    else if (c) { pick[tool].c = +c.dataset.c; syncBar(); }
    else if (s) { pick[tool].s = +s.dataset.s; syncBar(); }
  });
  // the board's own pan and the rail never fight over a click
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());

  document.addEventListener('keydown', (e) => {
    if (!active) return;
    const tg = e.target;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName) || tg.isContentEditable) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault(); if (e.shiftKey) redoOne(); else undoOne(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redoOne(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' && tool !== 'hand') { setTool('hand'); return; }
    const t = KEYS[e.key.toLowerCase()];
    if (t) { e.preventDefault(); e.stopImmediatePropagation(); setTool(t); }
  }, true);
  // The board opens with the prompt box focused; a press on the board itself
  // hands the keys back to the tools.
  vp.addEventListener('pointerdown', () => {
    if (document.activeElement?.id === 'bd-text') document.activeElement.blur();
  }, true);
  addEventListener('resize', later);
  document.fonts?.ready.then(() => syncBar());
  syncBar();
  vp.dataset.inked = String(strokes.length > 0);

  return {
    /** The board moved: repaint from the same camera. */
    render: later,
    show() { active = true; requestAnimationFrame(() => { syncBar(); render(); }); },
    hide() { active = false; },
    clear,
    get count() { return strokes.length; },
  };
}
