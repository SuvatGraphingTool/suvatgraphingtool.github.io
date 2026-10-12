// panes.js — the window: several views of one motion, over one set of controls.
//
// WHAT IT IS. A stage can hold more than one picture of the same flight. Give
// it a list of panes and it lays them out — four in a 2×2, two side by side,
// or one filling the stage — with the ones that are not on screen collapsed
// to a row of named tabs. Every pane takes the same two gestures, drag to pan
// and wheel to zoom, and every pane has its own button to re-frame itself.
// There is exactly one clock, one play button and one scrub bar, and they
// belong to the app rather than to any pane.
//
// WHY IT IS GENERAL, AND WHY ONLY ONE SCENARIO USES IT. The parachute drop is
// the situation that needed it: its lesson is that the acceleration is not
// one number, and that is three graphs and a picture rather than one picture
// with the graphs in a sidebar. But nothing below knows what a parachute is.
// A pane is four strings and two functions:
//
//   title, tab, corner, say     what its chrome reads
//   nav                         how its own view pans, zooms and re-frames
//   draw(canvas, view, o)       pixels, given the app's own `o`
//
// so the other ten scenarios could be moved onto it later by writing their
// panes. None of them is moved now — see the scope note in design/presets.md.
//
// IT DRAWS NOTHING AND COMPUTES NOTHING. Layout, chrome and gestures only;
// every pixel inside a pane comes from that pane's own `draw`, and every
// number in it from an engine in js/core/. CLAUDE.md rule 4.

/** The expand / restore glyph, as a path pair rather than a font character. */
const ICON = {
  out: 'M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6',
  in: 'M10 4H4v6M14 20h6v-6M4 10l6-6M20 14l-6 6',
};

/**
 * @param n  how many panes are on screen to start with — the layout the
 *           student picked on the speed card before anything moved
 */
export function createWindow(n = 4) {
  return { panes: [], order: [], n, want: n, solo: null,
           views: new Map(), el: new Map(), host: null };
}

/**
 * Build the chrome for this list of panes.
 *
 * Called once per set of panes rather than once per frame: the headers are
 * HTML and the canvases have to keep their own backing store, so rebuilding
 * them every frame would throw away the drawing and the view with it. The
 * views ARE kept across a rebuild of the same ids, because a student who has
 * zoomed into the canopy's second and then changed the playback speed has not
 * asked to be zoomed back out.
 */
export function mount(host, win, panes, hooks = {}) {
  win.host = host;
  win.panes = panes;
  // THE ARRANGEMENT SURVIVES A REMOUNT of the same panes, for the same reason
  // the views do: a student who has put the velocity graph top-left has not
  // asked for it to be moved back because the numbers changed.
  const ids = panes.map((p) => p.id);
  const same = win.order.length === ids.length && win.order.every((id) => ids.includes(id));
  win.order = same ? win.order : ids;
  // A visit to a pane that no longer exists is not a visit.
  if (win.solo && !ids.includes(win.solo)) win.solo = null;
  for (const p of panes) {
    if (!win.views.has(p.id)) win.views.set(p.id, p.nav.create());
  }
  for (const id of [...win.views.keys()]) {
    if (!panes.some((p) => p.id === id)) win.views.delete(id);
  }

  host.innerHTML = `
    <div class="panegrid" id="panegrid">${panes.map((p) => `
      <section class="pane" data-id="${p.id}" data-kind="${p.kind}">
        <div class="pane-bar">
          <button type="button" class="pane-max" data-id="${p.id}" aria-pressed="false"
                  aria-label="Fill the stage with ${p.aria}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" aria-hidden="true"><path d="${ICON.out}"/></svg>
          </button>
          <b class="pane-t">${p.title}</b>
          <span class="pane-corner">${p.corner}</span>
          <button type="button" class="pane-fit" data-id="${p.id}" aria-pressed="true"
                  aria-label="Frame the whole of ${p.aria}">Whole flight</button>
        </div>
        <div class="pane-box"><canvas data-id="${p.id}" aria-label="${p.aria}"></canvas></div>
        <p class="pane-say">${p.say}</p>
      </section>`).join('')}</div>
    <div class="panetabs" id="panetabs" role="tablist" aria-label="The other views"></div>`;

  win.el.clear();
  for (const sec of host.querySelectorAll('.pane')) {
    const id = sec.dataset.id;
    win.el.set(id, {
      sec,
      canvas: sec.querySelector('canvas'),
      max: sec.querySelector('.pane-max'),
      fit: sec.querySelector('.pane-fit'),
    });
  }

  for (const p of panes) {
    const e = win.el.get(p.id);
    e.max.addEventListener('click', () => {
      // MAXIMIZE AND RESTORE ARE ONE BUTTON. Pressed, this pane fills the
      // stage and the others become tabs; pressed again, the layout the
      // student chose comes back. `want` is that choice and is never
      // overwritten by a maximize, which is what makes the second press mean
      // "restore" rather than "go to four".
      //
      // AND A MAXIMIZE MUST NOT REARRANGE ANYTHING. It used to be done by
      // moving this pane to the front of `order` and showing one pane — so
      // the arrangement itself was rewritten by a visit, and restoring dealt
      // the panes out in the new order: maximize the velocity graph, come
      // back, and the jump had been pushed out of the top-left corner into
      // whichever slot was left. Every maximize shuffled them again.
      //
      // `solo` is the visit, held apart from `order`, which is the
      // arrangement. Nothing a visit does can touch the arrangement, so there
      // is nothing to put back.
      if (win.solo === p.id) { win.solo = null; win.n = win.want; }
      else { win.solo = p.id; win.n = 1; }
      layout(win);
      hooks.change?.();
    });
    e.fit.addEventListener('click', () => {
      const v = win.views.get(p.id);
      v.fit = true; v.touched = false;
      hooks.change?.();
    });
    attach(win, p, hooks);
  }

  layout(win);
}

/** Put a pane at a given slot, keeping everything else in its own order. */
function bring(win, id, slot) {
  const rest = win.order.filter((x) => x !== id);
  rest.splice(Math.min(slot, rest.length), 0, id);
  win.order = rest;
}

/**
 * How many panes are on screen.
 *
 * This is the student's own answer from the speed card, so it is remembered as
 * `want` as well as applied: a maximize is a temporary visit to one pane, and
 * coming back has to come back to the layout they asked for.
 */
export function setLayout(win, n) {
  // Clamped to the panes there ARE, except when there are none yet: the
  // picker is on the speed card and is answered before the first run, and
  // clamping against an empty list turned every answer into 1 and threw the
  // student's choice away until the mount re-applied it.
  const cap = win.panes.length || n;
  win.n = win.want = Math.max(1, Math.min(n, cap));
  // Choosing a layout ends any visit: it is the explicit version of the same
  // decision the restore button makes.
  win.solo = null;
  layout(win);
}

/** Which panes are drawn this frame: the visit, or the top of the arrangement. */
export const shown = (win) => (win.solo ? [win.solo] : win.order.slice(0, win.n));

/**
 * Apply the layout: who is on screen, who is a tab, and what the buttons say.
 *
 * The tab row exists only when something is off screen, because a row of tabs
 * naming nothing you cannot already see is a row of controls that do nothing.
 */
export function layout(win) {
  // NOTHING TO LAY OUT UNTIL THERE IS A WINDOW. The layout picker sits on the
  // speed card, which is shown before the panes are mounted, so every student
  // who chooses a layout before the first run reached this with `host` still
  // null — `win.host.querySelector` on null, an uncaught TypeError, and the
  // rest of that click handler abandoned. The choice is already recorded in
  // `n` and `want` by the time this is called; the mount applies it.
  if (!win.host) return;
  const on = shown(win);
  win.host.querySelector('.panegrid').dataset.n = String(win.n);
  for (const p of win.panes) {
    const e = win.el.get(p.id);
    const vis = on.includes(p.id);
    e.sec.hidden = !vis;
    e.sec.style.order = String(on.indexOf(p.id));
    const big = win.n === 1 && vis;
    e.max.setAttribute('aria-pressed', String(big));
    e.max.querySelector('path').setAttribute('d', big ? ICON.in : ICON.out);
    e.max.setAttribute('aria-label', big
      ? `Back to ${win.want === 1 ? 'the panes' : win.want === 2 ? 'two panes' : 'all four panes'}`
      : `Fill the stage with ${p.aria}`);
  }

  const tabs = win.host.querySelector('.panetabs');
  const off = win.panes.filter((p) => !on.includes(p.id));
  tabs.hidden = off.length === 0;
  tabs.innerHTML = off.map((p) => `
    <button type="button" class="panetab" data-id="${p.id}" role="tab"
            aria-selected="false" aria-label="${p.aria}">${p.tab}</button>`).join('');
  for (const b of tabs.querySelectorAll('.panetab')) {
    b.addEventListener('click', () => {
      // WHILE A PANE IS MAXIMIZED a tab moves the visit: you are looking at
      // one pane and you want to look at another, and the arrangement you
      // will come back to is none of its business.
      //
      // Otherwise the tab IS a rearrangement, and it swaps itself into the
      // last slot on screen. One rule whatever the layout: with one pane up
      // it replaces it, with two it replaces the right-hand one, and the pane
      // it displaced becomes a tab in its place.
      if (win.solo) win.solo = b.dataset.id;
      else bring(win, b.dataset.id, win.n - 1);
      layout(win);
      win._onChange?.();
    });
  }
}

/* ── the one gesture ────────────────────────────────────────────────────
   Drag to pan, wheel to zoom, double-click to re-frame — the same three on
   every pane, and the same three js/render/scene.js already attaches to the
   stadium view, so there is nothing new to learn when a scenario is moved
   onto this window. What differs is what they move, and that is entirely the
   pane's own `nav`: the jump pans in metres of sky, a graph pans in seconds
   and in its own quantity. */
function attach(win, p, hooks) {
  const { canvas } = win.el.get(p.id);
  const v = () => win.views.get(p.id);
  let drag = false, lx = 0, ly = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect();
    return [Math.max(1, r.width), Math.max(1, r.height)];
  };

  win._onChange = hooks.change;
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', (e) => {
    drag = true; lx = e.clientX; ly = e.clientY;
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [w, h] = size();
    p.nav.pan(v(), e.clientX - lx, e.clientY - ly, w, h);
    lx = e.clientX; ly = e.clientY;
    hooks.change?.();
  });
  const end = (e) => {
    drag = false; canvas.style.cursor = 'grab';
    if (e && canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const [w, h] = size();
    p.nav.zoom(v(), Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top, w, h);
    hooks.change?.();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => {
    const view = v(); view.fit = true; view.touched = false;
    hooks.change?.();
  });
}

/** Draw every pane that is on screen, and keep its own Whole flight honest. */
export function render(win, o) {
  for (const id of shown(win)) {
    const p = win.panes.find((x) => x.id === id);
    const e = win.el.get(id);
    const view = win.views.get(id);
    /* A PANE THAT CHANGED SIZE HAS TO RE-FRAME, and this is the only place
       that can notice. Maximizing a quarter-size pane quadruples its canvas,
       and a view keeping the scale it was fitted at then holds the flight in
       the top third of a pane four times the size — which is the one thing
       maximize exists to not do. Untouched views refit; a view somebody has
       panned or zoomed is left exactly where they put it, which is the same
       rule app.js applies to the single view on a window resize. */
    const size = `${e.canvas.clientWidth}x${e.canvas.clientHeight}`;
    if (e.size !== size) { e.size = size; if (!view.touched) view.fit = true; }
    p.draw(e.canvas, view, o);
    // The button lights up while the whole flight IS what this pane is
    // showing, and dims the moment a pan or a zoom takes it off — so it reads
    // as the way back rather than as a mode. Same wording and same behaviour
    // as the stadium view's one button, because it is the same idea.
    e.fit.setAttribute('aria-pressed', String(!view.touched));
  }
}
