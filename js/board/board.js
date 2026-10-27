// board.js — the whiteboard: describe any motion, and a board is built for it.
//
// A board in the sense of Miro: an endless dotted canvas you pan and zoom,
// with frames on it you can drag about. Each description the student sends
// becomes one more cluster of frames, laid out below the last, and the view
// flies to it. The frames are the app's own ready-made pieces, not drawings:
//
//   scene    the stage — js/render/scene.js, the road, the plate, or the
//            parachute's own sky (js/render/drop.js) — playing on a clock
//   graph-*  the displacement, velocity and acceleration graphs the stage
//            draws (js/render/graphs.js), sharing that clock
//   given    the values read from the description, every one editable
//   answers  what the engine worked out from them
//   working  the engine's own worked solution
//   notes    sticky notes the model wrote: assumptions, the idea, a hint
//
// THE MODEL LAYS OUT; THE ENGINE CALCULATES. The reader (board mode) says
// which situation it is, what was given and which frames to put up; every
// number on the board comes from js/core/ through js/board/blueprint.js.
// Change a value on the given sticky and the cluster is solved again, here,
// in the time it takes to type — no second request to the model.

import { readBlueprint, solveBoard } from './blueprint.js';
import { givenHTML, answersHTML, workingHTML, noteHTML } from './frames.js';
import { readText, READER } from '../ai/capture.js';
import { esc } from '../ai/readout.js';
import * as scene from '../render/scene.js';
import * as exhibit from '../render/exhibit.js';
import * as roadStage from '../render/road.js';
import { descentPanes } from '../render/drop.js';
import { drawGraph, graphSpecs } from '../render/graphs.js';
import { palette, fmt, clamp } from '../render/util.js';
import { M } from '../notation.js';

const $ = (id) => document.getElementById(id);
const RATE = 0.75;                       // the stage's own playback speed
const GAP = 24, PAD = 28, HEAD = 64;     // between frames, inside a cluster, its title
const Z_MIN = 0.2, Z_MAX = 2.5;
const HISTORY_MAX = 6;
/* KEPT IN THIS BROWSER, AND NOWHERE ELSE. What is saved is what the board
   was built FROM — each cluster's blueprint, the values changed on it, and
   where its frames were dragged — never anything the engine worked out. A
   reload solves every cluster again, so a saved board can never disagree
   with the engine that draws it (rule 4). */
const STORE = 'suvat-board-v1';
const KEEP = 24;                         // the newest clusters, and no more
const SHOW = { path: true, velocity: true, apex: true, range: true, grid: false, ruler: true,
               components: true, ticks: false, acceleration: false };

/* What each frame is called and how big it starts. Heights of the HTML ones
   are measured once they are in the page. */
const SPEC = {
  scene:     { title: 'The motion',          w: 720, h: 430 },
  given:     { title: 'Given',               w: 380 },
  answers:   { title: 'The engine works out', w: 380 },
  // The graph names itself on the canvas, so its frame is just a handle.
  'graph-s': { title: 'Graph', say: 'Displacement against time', w: 440, h: 280, canvas: 'g-s' },
  'graph-v': { title: 'Graph', say: 'Velocity against time',     w: 440, h: 280, canvas: 'g-v' },
  'graph-a': { title: 'Graph', say: 'Acceleration against time', w: 440, h: 280, canvas: 'g-a' },
  working:   { title: 'Worked solution',     w: 600 },
  note:      { title: 'Note',                w: 250 },
};
/* The rows a cluster is packed in: the picture with what was given and what
   came out, then the graphs, then the working and the notes. */
const ROWS = [['scene', 'given', 'answers'], ['graph-s', 'graph-v', 'graph-a'], ['working', 'notes']];

/**
 * @param o.open(x)  put this reading on the main stage, as Ask Suvat's
 *                   "Show me the flight" does
 */
export function createBoard({ open } = {}) {
  const vp = $('bd-vp'), world = $('bd-world');
  const form = $('bd-form'), text = $('bd-text'), send = $('bd-send');
  const cam = { x: 0, y: 0, z: 1 };
  let fly = null;                        // the camera's way to a cluster, while it goes
  const clusters = [];
  const history = [];
  let busy = null, active = false, last = 0, raf = 0;

  /* ── the camera ──────────────────────────────────────────────────────── */
  /* THE CANVASES ARE DRAWN AT THE SIZE THEY ARE SEEN. Each one sizes its
     backing store from its box on screen (fitCanvas in js/render/util.js),
     which is the zoomed box — so a zoom repaints them rather than stretching
     pixels, the lines stay sharp, and every label is still drawn at its own
     size in screen pixels, which is what the 13 px floor measures. */
  let paintedZ = 1;
  function place() {
    if (Math.abs(cam.z - paintedZ) > 1e-4) { paintedZ = cam.z; for (const c of clusters) c.dirty = true; wake(); }
    world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
    const s = 24 * cam.z;
    vp.style.backgroundSize = `${s}px ${s}px`;
    vp.style.backgroundPosition = `${cam.x}px ${cam.y}px`;
    $('bd-zoom').textContent = `${Math.round(cam.z * 100)}%`;
  }
  function zoomAt(k, px, py) {
    const z = clamp(cam.z * k, Z_MIN, Z_MAX);
    cam.x = px - ((px - cam.x) / cam.z) * z;
    cam.y = py - ((py - cam.y) / cam.z) * z;
    cam.z = z; fly = null; place();
  }
  /* A cluster is framed by its width, top first, at its own size where it
     fits — never blown up past 100%, and never shrunk to fit its height, so
     the text on it opens at the size it was set (rule 3). Pan down for the
     rest, as on any board. */
  function frameOn(box, { now = false } = {}) {
    const r = vp.getBoundingClientRect();
    const z = clamp(Math.min(1, (r.width - 32) / box.w), Z_MIN, 1);
    const want = { z, x: (r.width - box.w * z) / 2 - box.x * z, y: 68 - box.y * z };   // under the view tools
    if (now) { Object.assign(cam, want); fly = null; place(); } else fly = want;
    wake();
  }
  function fitAll() {
    if (!clusters.length) { Object.assign(cam, { x: 0, y: 0, z: 1 }); place(); return; }
    const xs = clusters.map((c) => c.x), ys = clusters.map((c) => c.y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const x1 = Math.max(...clusters.map((c) => c.x + c.w)), y1 = Math.max(...clusters.map((c) => c.y + c.h));
    const r = vp.getBoundingClientRect();
    const z = clamp(Math.min(1, (r.width - 48) / (x1 - x0), (r.height - 150) / (y1 - y0)), Z_MIN, 1);
    fly = { z, x: (r.width - (x1 - x0) * z) / 2 - x0 * z, y: 24 - y0 * z };
    wake();
  }

  /* Dragging the empty board pans it; the wheel pans too, and pinching —
     or the wheel with Ctrl — zooms where the pointer is. */
  let drag = null;
  const touches = new Map();           // two fingers on the board are a pinch
  let pinch = null;
  const spread = () => { const [a, b] = [...touches.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  vp.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        if (drag?.el) drag.el.dataset.drag = 'false';
        drag = null; pinch = spread(); fly = null; return;
      }
    }
    if (e.button !== 0 && e.button !== 1) return;
    const head = e.target.closest('.bd-fh, .bd-ch');
    if (head) {
      const el = head.closest('.bd-frame, .bd-cluster');
      const item = el.classList.contains('bd-cluster') ? clusterOf(el) : frameOf(el);
      if (!item) return;
      drag = { kind: 'move', item, el, sx: e.clientX, sy: e.clientY, x0: item.x, y0: item.y };
      el.dataset.drag = 'true';
      bringToFront(el);
    } else if (e.target === vp || e.target === world || e.target.classList.contains('bd-cluster')
               || e.button === 1) {
      drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, x0: cam.x, y0: cam.y };
      vp.dataset.pan = 'true';
    } else return;
    fly = null;
    vp.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  vp.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) {
      const now = spread(), r = vp.getBoundingClientRect();
      cam.x += now.x - pinch.x; cam.y += now.y - pinch.y;
      zoomAt(now.d / (pinch.d || 1), now.x - r.left, now.y - r.top);
      pinch = now; return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (drag.kind === 'pan') { cam.x = drag.x0 + dx; cam.y = drag.y0 + dy; place(); return; }
    drag.item.x = drag.x0 + dx / cam.z; drag.item.y = drag.y0 + dy / cam.z;
    drag.el.style.left = `${drag.item.x}px`; drag.el.style.top = `${drag.item.y}px`;
  });
  const end = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (drag?.el) drag.el.dataset.drag = 'false';
    if (drag) save();
    drag = null; vp.dataset.pan = 'false';
  };
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
  vp.addEventListener('wheel', (e) => {
    // A frame that scrolls (a long worked solution) keeps its own wheel.
    const scroller = e.target.closest('.bd-fb');
    if (scroller && !e.ctrlKey && scroller.scrollHeight > scroller.clientHeight + 1) return;
    e.preventDefault();
    const r = vp.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    else { cam.x -= e.deltaX; cam.y -= e.deltaY; fly = null; place(); }
    save();
  }, { passive: false });

  $('bd-in').addEventListener('click', () => { const r = vp.getBoundingClientRect(); zoomAt(1.2, r.width / 2, r.height / 2); });
  $('bd-out').addEventListener('click', () => { const r = vp.getBoundingClientRect(); zoomAt(1 / 1.2, r.width / 2, r.height / 2); });
  $('bd-zoom').addEventListener('click', () => { const r = vp.getBoundingClientRect(); zoomAt(1 / cam.z, r.width / 2, r.height / 2); });
  $('bd-fit').addEventListener('click', () => { fitAll(); save(); });
  for (const id of ['bd-in', 'bd-out', 'bd-zoom']) $(id).addEventListener('click', save);
  $('bd-clear').addEventListener('click', () => {
    if (!clusters.length) return;
    for (const c of clusters) c.el.remove();
    clusters.length = 0; history.length = 0;
    $('bd-empty').hidden = false;
    Object.assign(cam, { x: 0, y: 0, z: 1 }); place();
    save();
  });

  let top = 10;
  const bringToFront = (el) => { el.style.zIndex = String(++top); };
  const clusterOf = (el) => clusters.find((c) => c.el === el);
  const frameOf = (el) => { for (const c of clusters) { const f = c.frames.find((x) => x.el === el); if (f) return f; } return null; };

  /* ── a cluster ──────────────────────────────────────────────────────── */
  function nextSpot() {
    if (!clusters.length) return { x: 0, y: 0 };
    const lowest = clusters.reduce((a, c) => (c.y + c.h > a.y + a.h ? c : a));
    return { x: lowest.x, y: lowest.y + lowest.h + 120 };
  }

  /** A cluster with nothing in it yet: the title, and frames still arriving. */
  function sketch(words, at = nextSpot()) {
    const el = document.createElement('section');
    el.className = 'bd-cluster';
    el.dataset.state = 'building';
    el.style.left = `${at.x}px`; el.style.top = `${at.y}px`;
    el.innerHTML = `<header class="bd-ch"><span class="bd-ct">Building the board…</span>
        <span class="bd-cq">${esc(words)}</span></header>
      <div class="bd-ghosts" aria-hidden="true">${'<i></i>'.repeat(6)}</div>`;
    world.append(el);
    const c = { el, x: at.x, y: at.y, w: 1300, h: 760, frames: [], board: null, bp: null,
                edits: [], t: 0, playing: false, dirty: true };
    el.style.width = `${c.w}px`; el.style.height = `${c.h}px`;
    clusters.push(c);
    $('bd-empty').hidden = true;
    if (!sketch.quiet) frameOn(c);
    return c;
  }

  function fail(c, html, title = 'Suvat could not build that one') {
    c.el.dataset.state = 'failed';
    c.el.querySelector('.bd-ghosts')?.remove();
    c.el.querySelector('.bd-ct').textContent = title;
    const p = document.createElement('div');
    p.className = 'bd-fail';
    p.innerHTML = html;
    c.el.append(p);
    c.w = 640; c.h = 220;
    c.el.style.width = `${c.w}px`; c.el.style.height = `${c.h}px`;
    frameOn(c);
  }

  /** The model's blueprint, solved and laid out as frames. */
  function build(c, bp, kept = null) {
    c.bp = bp;
    c.edits = kept?.edits || bp.objects.map(() => ({ given: {}, descent: {} }));
    c.board = solveBoard(bp, c.edits);
    c.el.dataset.state = 'built';
    c.el.querySelector('.bd-ghosts')?.remove();
    c.el.querySelector('.bd-ct').textContent = bp.title;
    c.el.querySelector('.bd-cq').innerHTML = esc(bp.summary);

    // One stage per object — except that a second launch beside the first
    // is flown on the FIRST stage, as the app's own second objects are, so
    // the two can be compared at one scale on one clock.
    const objs = c.board.objects;
    c.merge = objs.length > 1 && isLaunch(objs[0]) && isLaunch(objs[1]) && !objs[0].second ? 1 : -1;

    const want = new Set(bp.frames);
    const list = [];
    objs.forEach((o, i) => {
      const tag = objs.length > 1 ? ` · ${o.label}` : '';
      if (want.has('scene') && i !== c.merge) list.push(frame(c, 'scene', i, tag));
      list.push(frame(c, 'given', i, tag));
      list.push(frame(c, 'answers', i, tag));
      for (const g of ['graph-s', 'graph-v', 'graph-a']) if (want.has(g)) list.push(frame(c, g, i, tag));
      if (want.has('working')) list.push(frame(c, 'working', i, tag));
    });
    if (want.has('notes')) bp.notes.forEach((n, j) => list.push(frame(c, 'note', 0, '', n, j)));
    c.frames = list;
    for (const f of list) c.el.append(f.el);
    fill(c);
    layout(c);
    if (kept) {
      // Back where they were left, and still: a board coming back from a
      // reload is not being built, so nothing pops in and nothing plays.
      kept.frames?.forEach((k, j) => {
        const f = list[j];
        if (!f || f.kind !== k.kind) return;
        f.x = k.x; f.y = k.y;
        f.el.style.left = `${f.x}px`; f.el.style.top = `${f.y}px`;
        if (k.h && (f.kind === 'scene' || f.kind.startsWith('graph'))) { f.h = k.h; f.el.style.height = `${f.h}px`; }
      });
      if (kept.w) { c.w = kept.w; c.h = kept.h; c.el.style.width = `${c.w}px`; c.el.style.height = `${c.h}px`; }
      c.t = 0; c.playing = false;
      return;
    }
    // The frames arrive one after another, which is what makes it read as
    // being built rather than as a page that loaded.
    list.forEach((f, j) => { f.el.style.animationDelay = `${j * 55}ms`; f.el.dataset.in = 'true'; });
    c.playing = objs.some((o) => o.ok);
    c.t = 0;
    frameOn(c);
    save();
  }
  const isLaunch = (o) => o.ok && o.scenario && !o.scenario.road && !o.scenario.descent;

  function frame(c, kind, obj, tag = '', note = '', j = 0) {
    const s = SPEC[kind];
    const el = document.createElement('article');
    el.className = `bd-frame bd-${kind.startsWith('graph') ? 'graph' : kind}`;
    el.dataset.kind = kind;
    const title = kind === 'note' ? (['Assumption', 'The idea', 'A hint', 'Note'][j] || 'Note') : s.title + tag;
    let body = '';
    if (kind === 'scene') {
      body = `<div class="bd-stage"><canvas aria-label="The motion, animated"></canvas>
          <p class="bd-stage-need" hidden></p></div>
        <div class="bd-bar">
          <button type="button" class="bd-play" aria-label="Play">${PLAY}</button>
          <input type="range" class="bd-scrub" min="0" max="1" step="0.001" value="0" aria-label="Time">
          <span class="bd-t"></span>
          <button type="button" class="ghost sm bd-open">Open on the stage</button>
        </div>`;
    } else if (kind.startsWith('graph')) {
      body = `<canvas aria-label="${esc(s.say)}"></canvas>`;
    } else if (kind === 'note') body = noteHTML(note);
    el.innerHTML = `<header class="bd-fh"><span class="bd-grip" aria-hidden="true"></span>
      <h3>${esc(title)}</h3></header><div class="bd-fb">${body}</div>`;
    const f = { el, kind, obj, x: 0, y: 0, w: s.w, h: s.h || 0, cluster: c };
    if (kind === 'scene') wireScene(c, f);
    if (kind.startsWith('graph')) wireGraph(c, f);
    if (kind === 'given') wireGiven(c, f);
    return f;
  }

  /** The HTML frames' contents, from the engine's answer for this cluster. */
  function fill(c) {
    for (const f of c.frames) {
      const o = c.board.objects[f.obj];
      const body = f.el.querySelector('.bd-fb');
      if (f.kind === 'given' && !f.el.contains(document.activeElement)) body.innerHTML = givenHTML(o, f.obj, editedKeys(c, f.obj));
      if (f.kind === 'answers') body.innerHTML = answersHTML(o);
      if (f.kind === 'working') body.innerHTML = workingHTML(o);
      if (f.kind === 'scene') {
        const need = f.el.querySelector('.bd-stage-need');
        need.hidden = o.ok;
        if (!o.ok) need.innerHTML = o.reason || '';
        f.el.querySelector('.bd-open').disabled = !o.ok;
      }
    }
    c.dirty = true;
  }
  const editedKeys = (c, i) => new Set([...Object.keys(c.edits[i].given), ...Object.keys(c.edits[i].descent),
                                         ...(c.edits[i].theta !== undefined ? ['theta'] : []),
                                         ...(c.edits[i].h !== undefined ? ['h'] : [])]);

  /* Packed row by row, and within a row in columns: a frame that does not
     fit beside the others goes under the shortest column wide enough for it
     — so Given and the answers stack beside the stage rather than wrapping
     under it. Done once, when the cluster is built; after that the frames
     are where the student drags them. */
  function layout(c) {
    const vw = vp.getBoundingClientRect().width;
    // As wide as the screen, so a phone opens on the board at 100% and its
    // text at the size it was set, not zoomed out under the 13 px floor.
    const maxW = Math.max(300, Math.min(1500, vw - 32)) - 2 * PAD;
    for (const f of c.frames) {
      f.w = Math.min(f.w, maxW);
      f.el.style.width = `${f.w}px`;
      if (f.kind === 'scene' || f.kind.startsWith('graph')) f.el.style.height = `${f.h}px`;
    }
    const groups = ROWS.map((r) => c.frames.filter((f) => r.includes(f.kind === 'note' ? 'notes' : f.kind)));
    // With several objects, each object's own pieces keep together.
    const ordered = [];
    for (const g of groups) {
      const byObj = new Map();
      for (const f of g) { if (!byObj.has(f.obj)) byObj.set(f.obj, []); byObj.get(f.obj).push(f); }
      for (const fs of byObj.values()) ordered.push(fs);
    }
    const put = (f, x, y) => { f.x = x; f.y = y; f.el.style.left = `${x}px`; f.el.style.top = `${y}px`; };
    let y = HEAD, wide = 0;
    for (const row of ordered) {
      if (!row.length) continue;
      let cols = [];
      const flush = () => {
        const bottom = Math.max(...cols.map((k) => k.bottom));
        // The stage grows to the height of what is stacked beside it.
        const st = row.find((f) => f.kind === 'scene' && f.y === y);
        if (st && st.y + st.h < bottom) { st.h = bottom - st.y; st.el.style.height = `${st.h}px`; }
        y = bottom + GAP; cols = [];
      };
      for (const f of row) {
        const h = f.h || f.el.offsetHeight;
        const x = cols.length ? cols.at(-1).x + cols.at(-1).w + GAP : PAD;
        if (!cols.length || x + f.w <= PAD + maxW) {
          put(f, x, y); cols.push({ x, w: f.w, bottom: y + h });
        } else {
          // Only the short HTML frames stack; a graph that does not fit starts a
          // new row, so the three graphs read across rather than in a heap.
          const stacks = f.kind === 'answers' || f.kind === 'given' || f.kind === 'note';
          const under = stacks && cols.filter((k) => k.w >= f.w && k !== cols[0]).sort((a, b) => a.bottom - b.bottom)[0];
          if (under) { put(f, under.x, under.bottom + GAP); under.bottom += GAP + h; }
          else { flush(); put(f, PAD, y); cols.push({ x: PAD, w: f.w, bottom: y + h }); }
        }
        wide = Math.max(wide, f.x + f.w + PAD);
      }
      flush();
    }
    c.w = Math.max(wide, 640); c.h = y - GAP + PAD;
    c.el.style.width = `${c.w}px`; c.el.style.height = `${c.h}px`;
  }

  /* ── what each frame does ───────────────────────────────────────────── */
  function wireScene(c, f) {
    f.cam = scene.createCamera();
    const play = f.el.querySelector('.bd-play'), scrub = f.el.querySelector('.bd-scrub');
    play.addEventListener('click', () => {
      if (!c.playing && c.t >= c.board.tMax - 1e-6) c.t = 0;
      c.playing = !c.playing; wake();
    });
    scrub.addEventListener('input', () => { c.playing = false; c.t = Number(scrub.value) * c.board.tMax; c.dirty = true; wake(); });
    f.el.querySelector('.bd-open').addEventListener('click', () => {
      const o = c.board.objects[f.obj];
      if (o.ok) open?.(readingWithEdits(c, f.obj));
    });
  }
  function wireGraph(c, f) {
    // A press on a graph puts the clock at that instant, on every frame.
    const cv = f.el.querySelector('canvas');
    const at = (e) => {
      const r = cv.getBoundingClientRect();
      const k = clamp((e.clientX - r.left - 52) / (r.width - 68), 0, 1);   // the graph's own margins
      c.playing = false; c.t = k * c.board.tMax; c.dirty = true; wake();
    };
    cv.addEventListener('pointerdown', (e) => { e.stopPropagation(); at(e); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (e.buttons) at(e); });
  }
  function wireGiven(c, f) {
    let timer = 0;
    f.el.addEventListener('input', (e) => {
      const inp = e.target.closest('input[data-k]');
      if (!inp) return;
      clearTimeout(timer);
      timer = setTimeout(() => change(c, Number(inp.dataset.obj), inp.dataset.k, inp.value), 220);
    });
    f.el.addEventListener('focusout', () => setTimeout(() => { if (!f.el.contains(document.activeElement)) fill(c); }, 0));
  }

  /** A value changed on the board: solved again, here, by the engine. */
  function change(c, i, k, raw) {
    const s = String(raw).trim().replace(/[−–]/g, '-');
    const v = s === '' ? null : Number(s);
    if (v !== null && !isFinite(v)) return;
    const e = c.edits[i];
    if (k === 'theta' || k === 'h') e[k] = v;
    else if (['tOpen', 'aChute', 'vTerm'].includes(k)) { if (v === null) delete e.descent[k]; else e.descent[k] = v; }
    else e.given[k] = v;
    c.board = solveBoard(c.bp, c.edits);
    for (const f of c.frames) if (f.kind === 'scene') f.cam.fit = true;
    c.t = Math.min(c.t, c.board.tMax);
    fill(c);
    // The given sticky is redrawn too — what is tagged "changed" — but not
    // the box being typed in, which keeps its caret.
    for (const f of c.frames) {
      if (f.kind !== 'given') continue;
      for (const inp of f.el.querySelectorAll('input[data-k]')) {
        const how = inp.parentElement.querySelector('.bd-how');
        if (Number(inp.dataset.obj) === i && inp.dataset.k === k) { how.dataset.how = 'yours'; how.textContent = 'changed'; }
      }
    }
    wake();
    save();
  }

  /** The reading this object started as, with the board's edits put back in. */
  function readingWithEdits(c, i) {
    const x = { ...c.bp.objects[i].x }, e = c.edits[i];
    const KEY = { g: c.board.objects[i].scenario?.road ? 'a' : 'g' };
    for (const [k, v] of Object.entries(e.given)) {
      const key = KEY[k] || k;
      if (v == null) delete x[key]; else x[key] = v;
    }
    if (e.theta !== undefined) {
      delete x.ratioFn; delete x.ratioNum; delete x.ratioDen;
      if (e.theta == null) delete x.angleDegrees;
      else { x.angleDegrees = Math.abs(e.theta); x.belowHorizontal = e.theta < 0; }
    }
    if (e.h !== undefined) { if (e.h == null) delete x.h; else x.h = e.h; }
    for (const [k, v] of Object.entries(e.descent)) x[k] = v;
    return x;
  }

  /* ── the clock, and the drawing ─────────────────────────────────────── */
  function wake() { if (active && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    if (!active) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let more = false;
    if (fly) {
      const k = 1 - Math.exp(-dt * 9);
      cam.x += (fly.x - cam.x) * k; cam.y += (fly.y - cam.y) * k; cam.z += (fly.z - cam.z) * k;
      if (Math.abs(fly.x - cam.x) + Math.abs(fly.y - cam.y) < 0.5 && Math.abs(fly.z - cam.z) < 0.002) {
        Object.assign(cam, fly); fly = null;
      }
      place(); more = true;
    }
    for (const c of clusters) {
      if (!c.board) continue;
      if (c.playing) {
        c.t += dt * RATE;
        if (c.t >= c.board.tMax) { c.t = c.board.tMax; c.playing = false; }
        c.dirty = true;
      }
      if (c.dirty && visible(c)) { paint(c); c.dirty = false; }
      if (c.playing) more = true;
    }
    if (more) raf = requestAnimationFrame(tick);
  }
  function visible(c) {
    const r = vp.getBoundingClientRect();
    const x0 = cam.x + c.x * cam.z, y0 = cam.y + c.y * cam.z;
    return x0 < r.width && y0 < r.height && x0 + c.w * cam.z > 0 && y0 + c.h * cam.z > 0;
  }

  function paint(c) {
    const P = palette();
    const objs = c.board.objects;
    for (const f of c.frames) {
      const o = objs[f.obj];
      if (f.kind === 'scene') paintScene(c, f, o);
      else if (f.kind.startsWith('graph')) {
        const cv = f.el.querySelector('canvas');
        if (!o.ok) { drawEmpty(cv); continue; }
        const t = Math.min(c.t, o.traj.tMax);
        if (o.scenario.descent) {
          // The parachute draws its own three graphs: one line per phase,
          // with the phase boundaries named. They are the panes of its window.
          const id = { 'graph-s': 'st', 'graph-v': 'vt', 'graph-a': 'at' }[f.kind];
          const pane = descentOf(f, o).find((p) => p.id === id) || descentOf(f, o)[1 + ['graph-v', 'graph-s', 'graph-a'].indexOf(f.kind)];
          if (pane) { f.view ||= pane.nav.create(); pane.draw(cv, f.view, { f: o.traj, t, pre: null, fired: true }); }
          continue;
        }
        const spec = graphSpecs(o.traj, t, P).find((s) => s.canvas === SPEC[f.kind].canvas);
        if (spec) drawGraph(cv, spec);
      }
    }
  }
  function paintScene(c, f, o) {
    const cv = f.el.querySelector('canvas');
    const scrub = f.el.querySelector('.bd-scrub');
    scrub.value = c.board.tMax ? c.t / c.board.tMax : 0;
    f.el.querySelector('.bd-t').innerHTML = M`t = ${fmt(c.t, 2)} [s]`;
    f.el.querySelector('.bd-play').innerHTML = c.playing ? PAUSE : PLAY;
    f.el.querySelector('.bd-play').setAttribute('aria-label', c.playing ? 'Pause' : 'Play');
    if (!o.ok) { drawEmpty(cv); return; }
    const t = Math.min(c.t, o.traj.tMax);
    const sc = o.scenario;
    if (sc.descent) {
      const pane = descentOf(f, o)[0];
      f.view ||= pane.nav.create();
      pane.draw(cv, f.view, { f: o.traj, t, pre: null, fired: true });
      return;
    }
    const other = c.merge > 0 && f.obj === 0 ? c.board.objects[c.merge] : null;
    const second = other?.ok ? other.traj : o.second;
    const opts = { traj: o.traj, second, ghost: null, t, show: SHOW, fired: true,
                   verdict: o.verdict, overview: false, hoverMark: null, markers: o.markers || {},
                   scenario: sc, secondLabel: other ? other.label : sc.second?.label, resolve: null, hover: null };
    // The stage frames the whole flight every time it is drawn, as the main
    // stage does until somebody pans it.
    f.cam.fit = true; f.cam.placed = false;
    if (sc.road) roadStage.render(cv, f.cam, opts);
    else if (sc.plate) exhibit.render(cv, f.cam, opts);
    else scene.render(cv, f.cam, opts);
  }
  function descentOf(f, o) {
    if (f.panesFor !== o.traj) { f.panes = descentPanes(o.traj); f.panesFor = o.traj; f.view = null; }
    return f.panes;
  }
  function drawEmpty(cv) {
    const P = palette();
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = P.card; g.fillRect(0, 0, cv.width, cv.height);
  }

  /* ── asking for a board ─────────────────────────────────────────────── */
  async function submit(e) {
    e?.preventDefault();
    const words = text.value.trim();
    if (busy || !words) return;
    text.value = ''; sync();
    const c = sketch(words);
    busy = new AbortController(); sync();
    const res = await readText(READER, words, { history: [...history], mode: 'board', signal: busy.signal });
    const stopped = busy.signal.aborted;
    busy = null; sync();
    if (stopped) { fail(c, '<p>Stopped.</p>'); return; }
    if (!res?.ok) { fail(c, `<p class="ro-bad">${esc(res?.message || 'Could not read that.')}</p>`); return; }
    const bp = readBlueprint(res.extraction);
    // Not a motion — a hello, a question about the last board — is answered.
    if (!bp.ok) { fail(c, `<p>${esc(bp.error)}</p>`, bp.chat ? 'Suvat says' : undefined); return; }
    history.push({ role: 'user', text: words }, { role: 'model', text: JSON.stringify(res.extraction) });
    while (history.length > HISTORY_MAX) history.shift();
    build(c, bp);
  }

  /* ── keeping it ──────────────────────────────────────────────────────── */
  let saving = 0;
  function save() {
    clearTimeout(saving);
    saving = setTimeout(() => {
      const built = clusters.filter((c) => c.bp).slice(-KEEP);
      const data = {
        cam: { x: cam.x, y: cam.y, z: cam.z }, history,
        clusters: built.map((c) => ({
          x: c.x, y: c.y, w: c.w, h: c.h, bp: c.bp, edits: c.edits,
          frames: c.frames.map((f) => ({ kind: f.kind, x: f.x, y: f.y, h: f.h || 0 })),
        })),
      };
      try { localStorage.setItem(STORE, JSON.stringify(data)); } catch {}
    }, 300);
  }
  /** What was left on the board last time, solved again by the engine. */
  function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch {}
    if (!data || !Array.isArray(data.clusters)) return;
    sketch.quiet = true;
    for (const k of data.clusters) {
      // One saved cluster that no longer builds — an older shape, a hand
      // edit — is left behind rather than taking the rest of the board with it.
      try {
        if (!k?.bp?.ok || !Array.isArray(k.bp.objects)) continue;
        const c = sketch('', { x: Number(k.x) || 0, y: Number(k.y) || 0 });
        try { build(c, k.bp, k); } catch { c.el.remove(); clusters.splice(clusters.indexOf(c), 1); }
      } catch {}
    }
    sketch.quiet = false;
    if (Array.isArray(data.history)) history.push(...data.history.filter((h) => typeof h?.text === 'string').slice(-HISTORY_MAX));
    if (data.cam && [data.cam.x, data.cam.y, data.cam.z].every(Number.isFinite)) {
      Object.assign(cam, { x: data.cam.x, y: data.cam.y, z: clamp(data.cam.z, Z_MIN, Z_MAX) });
    }
    if (!clusters.length) $('bd-empty').hidden = false;
  }
  function sync() {
    send.dataset.state = busy ? 'busy' : 'send';
    send.disabled = !busy && !text.value.trim();
    send.setAttribute('aria-label', busy ? 'Stop' : 'Build the board');
    form.dataset.busy = String(!!busy);
    text.style.height = 'auto';
    text.style.height = `${Math.min(text.scrollHeight, 140)}px`;
  }
  form.addEventListener('submit', submit);
  send.addEventListener('click', (e) => { if (busy) { e.preventDefault(); busy.abort(); } });
  text.addEventListener('input', sync);
  text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  for (const b of document.querySelectorAll('.bd-chip')) {
    b.addEventListener('click', () => { text.value = b.textContent.trim(); sync(); submit(); });
  }
  addEventListener('resize', () => { for (const c of clusters) c.dirty = true; wake(); });
  restore();
  sync(); place();

  return {
    /** The board is on screen: start drawing. */
    show() { active = true; for (const c of clusters) c.dirty = true; wake(); requestAnimationFrame(() => text.focus()); },
    /** It is not: stop. */
    hide() { active = false; },
    /** Build a board from a blueprint without asking the model — for tests and replays. */
    build(x, words = '') {
      const c = sketch(words); const bp = readBlueprint(x);
      if (bp.ok) build(c, bp); else fail(c, `<p>${esc(bp.error)}</p>`, bp.chat ? 'Suvat says' : undefined);
    },
    /** Fly to the nth cluster. */
    focus(n) { const c = clusters.at(n); if (c) frameOn(c, { now: true }); },
    redraw() { for (const c of clusters) c.dirty = true; wake(); },
  };
}

const PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor"/></svg>';
