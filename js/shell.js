/* shell.js — the redesign's chrome, and nothing else.

   The sidebar and its three views of the first screen, the breadcrumb, the
   command menu (⌘K), the keyboard shortcuts, the toasts, the speed popover
   and the drawer the sidebar becomes on a phone.

   IT PRESSES THE APP'S OWN BUTTONS. A scenario picked from the command menu
   is the card in the grid, clicked; Play is #play, clicked. So there is one
   route to everything and this file cannot drift from what the app does. It
   reads state for the breadcrumb and the step track, and calculates nothing
   (rule 4). */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; };
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* The few ways in that Home offers before the full grid: one of each kind of
   motion, the first one large. Ids that are missing are simply skipped. */
const FEATURED = ['arc', 'platform-angle', 'parachute', 'monkey', 'road'];

export function initShell(SUVAT, { scenarios, library, byId }) {
  const app = $('app');
  const view = () => app.dataset.view || 'home';

  /* ── views of the first screen ──────────────────────────────────────── */
  function setView(v, { focus = false } = {}) {
    app.dataset.view = v;
    if (SUVAT.state.step !== 'scenario') SUVAT.go('scenario');
    $('screen-scenario').scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
    if (focus && v === 'library') requestAnimationFrame(() => $('lib-q')?.focus({ preventScroll: true }));
    closeSide();
    sync();
  }
  $('nav-scenarios').addEventListener('click', () => setView('scenarios'));
  $('nav-library').addEventListener('click', () => setView('library', { focus: true }));
  // app.js opens the box (or the chat) on these; the view is ours
  $('ask-top').addEventListener('click', () => { app.dataset.view = 'home'; closeSide(); sync(); });
  $('brand').addEventListener('click', () => { app.dataset.view = 'home'; closeSide(); sync(); });
  $('board-top').addEventListener('click', closeSide);
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-goto]');
    if (g) setView(g.dataset.goto);
  });
  $('nav-lib-count').textContent = library.length || '';

  /* ── Home's bento: clones that press the real card ─────────────────── */
  const bento = $('home-bento');
  const picks = FEATURED.filter((id) => document.querySelector(`#pgrid .pcard[data-id="${id}"]`));
  for (const s of scenarios) if (picks.length < 5 && !picks.includes(s.id)) picks.push(s.id);
  for (const id of picks.slice(0, 5)) {
    const card = document.querySelector(`#pgrid .pcard[data-id="${id}"]`);
    if (!card) continue;
    const c = card.cloneNode(true);
    c.classList.add('bento-i');
    c.addEventListener('click', () => card.click());
    bento.append(c);
  }
  const lib = document.createElement('button');
  lib.className = 'bento-i bento-lib';
  lib.dataset.goto = 'library';
  lib.innerHTML = `<span class="bl-n">${library.length}</span><b>Past-paper library</b>
    <span class="pc-note">Scenarios built for real exam questions — AQA, Edexcel, OCR, CIE — each naming its papers.</span>
    <span class="bl-go">Browse the library <svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>`;
  bento.append(lib);
  spotlight(bento);

  /* ── where you are: the nav, the breadcrumb, the step track ─────────── */
  const navFor = () => {
    const st = SUVAT.state.step;
    if (st === 'board') return 'board';
    if (st === 'chat') return 'home';
    if (st === 'scenario') return view();
    const s = byId(SUVAT.state.id);
    return s && library.includes(s) ? 'library' : 'scenarios';
  };
  const ind = $('nav-ind');
  function placeIndicator() {
    const on = document.querySelector(`.nav-i[data-nav="${navFor()}"]`);
    for (const b of document.querySelectorAll('.side-nav .nav-i')) b.toggleAttribute('data-on', b === on);
    if (!on) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    ind.style.transform = `translateY(${on.offsetTop}px)`;
    ind.style.height = `${on.offsetHeight}px`;
  }

  const crumb = (label, act, cur) => cur
    ? `<span class="crumb" aria-current="page">${label}</span>`
    : `<button class="crumb" data-act="${act}">${label}</button>`;
  const SEP = '<svg class="crumb-sep" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function crumbs() {
    const st = SUVAT.state.step, s = byId(SUVAT.state.id);
    const home = { home: 'Ask Suvat', scenarios: 'Scenarios', library: 'Past papers', board: 'Whiteboard' };
    let parts;
    if (st === 'scenario') parts = [crumb(home[view()], '', true)];
    else if (st === 'board') parts = [crumb('Whiteboard', '', true)];
    else if (st === 'chat') parts = [crumb('Ask Suvat', 'home'), crumb('Conversation', '', true)];
    else {
      const root = navFor();
      parts = [crumb(home[root], root)];
      if (s) parts.push(st === 'values' ? `<span class="crumb crumb-s">${s.name}</span>` : crumb(s.name, 'values'));
      parts.push(crumb(st === 'values' ? 'Values' : 'Flight', '', true));
    }
    $('crumbs').innerHTML = parts.join(SEP);
    // the tab says where you are, then the name: "Whiteboard | SUVAT"
    const here = st === 'scenario' ? home[view()] : st === 'board' ? 'Whiteboard' : st === 'chat' ? 'Ask Suvat'
      : s ? s.name.replace(/<[^>]+>/g, '') : home[navFor()];
    document.title = here ? `${here} | SUVAT` : 'SUVAT';
  }
  $('crumbs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !b.dataset.act) return;
    if (b.dataset.act === 'values') SUVAT.go('values'); else setView(b.dataset.act);
  });

  function steps() {
    const s = byId(SUVAT.state.id);
    $('sub-scenario').innerHTML = s ? s.name : 'Not chosen yet';
    const boxes = [...document.querySelectorAll('#suvat input')];
    const known = boxes.filter((i) => i.value.trim() !== '').length;
    $('sub-values').textContent = !s ? 'Any three of five'
      : boxes.length ? `${known} of ${boxes.length} known` : 'Set up';
    $('sub-flight').textContent = SUVAT.state.launched && SUVAT.traj ? 'Flown — replay any time'
      : SUVAT.traj ? 'Ready to launch' : 'Needs values';
    for (const li of $('steps').children) {
      const b = li.querySelector('.navstep');
      li.dataset.state = b.getAttribute('aria-current') ? 'on'
        : b.getAttribute('aria-disabled') === 'true' ? 'off' : 'ok';
    }
  }

  let raf = 0;
  function sync() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { placeIndicator(); crumbs(); steps(); });
  }
  new MutationObserver(sync).observe(app, { attributes: true, attributeFilter: ['data-step', 'data-view'] });
  document.addEventListener('input', (e) => { if (e.target.closest?.('#screen-values')) sync(); });
  document.addEventListener('click', (e) => { if (e.target.closest?.('.pcard, #launch, .chip')) sync(); });
  addEventListener('resize', sync);
  document.fonts?.ready.then(sync);
  sync();

  /* ── the landing card: over the whole page, and its back button ─────────
     The stage is its own stacking context, so a card inside it can only ever
     sit in it: the canvas drew over it and nothing outside the stage blurred.
     Lifted to the body it covers the page; app.js finds it by id as before. */
  for (const id of ['done', 'exdone']) { const el = $(id); if (el) document.body.append(el); }
  /* and its back button presses the card's own close */
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('.done-back');
    if (b) $(b.dataset.close)?.click();
  });

  /* ── the drawer, on a phone ─────────────────────────────────────────── */
  function openSide() { app.dataset.side = 'open'; $('menu-btn').setAttribute('aria-expanded', 'true'); }
  function closeSide() { if (app.dataset.side !== 'open') return; app.dataset.side = 'closed'; $('menu-btn').setAttribute('aria-expanded', 'false'); }
  $('menu-btn').addEventListener('click', openSide);
  $('side-close').addEventListener('click', closeSide);
  $('side-scrim').addEventListener('click', closeSide);
  for (const b of $('steps').querySelectorAll('.navstep')) b.addEventListener('click', closeSide);

  /* ── the speed popover ──────────────────────────────────────────────── */
  const sp = $('speed-pop'), sb = $('speed-btn');
  const setSpeed = (open) => {
    sp.hidden = !open; sb.setAttribute('aria-expanded', String(open));
    if (open) { SUVAT.redraw?.(); requestAnimationFrame(() => $('bar-rate').focus({ preventScroll: true })); }
  };
  sb.addEventListener('click', (e) => { e.stopPropagation(); setSpeed(sp.hidden); });
  document.addEventListener('pointerdown', (e) => { if (!sp.hidden && !e.target.closest('.speed')) setSpeed(false); });
  sp.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); setSpeed(false); sb.focus(); } });

  /* ── the theme spreads from the button ──────────────────────────────── */
  // Capture phase, so it is set before app.js starts the transition. A key
  // press has no pointer, so it spreads from the middle of the button.
  $('theme-btn').addEventListener('click', (e) => {
    const root = document.documentElement, b = $('theme-btn').getBoundingClientRect();
    const x = e.clientX || b.left + b.width / 2, y = e.clientY || b.top + b.height / 2;
    root.style.setProperty('--vt-x', `${x}px`); root.style.setProperty('--vt-y', `${y}px`);
    root.dataset.vt = 'theme';
    setTimeout(() => { if (root.dataset.vt === 'theme') delete root.dataset.vt; }, 700);
  }, true);
  $('theme-btn').addEventListener('click', () => {
    requestAnimationFrame(() => toast(`${document.documentElement.dataset.theme === 'dark' ? 'Dark' : 'Light'} theme`, { icon: 'theme' }));
  });

  /* ── the command menu ───────────────────────────────────────────────── */
  const ICON = {
    nav: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ask: null,
    scen: '<path d="M4 19C6 10 10 6 18 5"/><circle cx="18.5" cy="5" r="2" fill="currentColor" stroke="none"/>',
    lib: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14z"/>',
    board: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="17" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/>',
    play: '<path d="M7 5v14l11-7z"/>',
    replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
    theme: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    split: '<circle cx="6" cy="18" r="2"/><path d="M6 16V6h12"/><path d="M6 6l10 10"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    keys: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M7 14h10"/>',
  };
  const ic = (k) => k === 'ask'
    ? '<span class="ai-orb xs" aria-hidden="true"><svg viewBox="0 0 48 48"><use href="#spark"/></svg></span>'
    : `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
  const press = (id) => () => $(id)?.click();
  const pickCard = (id) => () => document.querySelector(`#pgrid .pcard[data-id="${id}"], #lib-grid .pcard[data-id="${id}"]`)?.click();

  function commands() {
    const st = SUVAT.state.step, flying = st === 'flight' && SUVAT.traj;
    const list = [];
    if (flying) {
      list.push(
        { g: 'This flight', t: SUVAT.state.playing ? 'Pause' : 'Play', i: 'play', k: 'Space', run: press('play') },
        { g: 'This flight', t: 'Replay from the start', i: 'replay', run: press('replay') },
        { g: 'This flight', t: 'Resolve an instant into components', i: 'split', k: 'R', run: press('ask-at') },
        { g: 'This flight', t: 'Change the values', i: 'edit', run: press('back-2') },
        { g: 'This flight', t: 'Display options and graphs', i: 'sliders', k: 'D', run: press('options-btn') },
      );
    }
    list.push(
      { g: 'Go to', t: 'Ask Suvat', i: 'ask', k: 'G H', run: press('ask-top') },
      { g: 'Go to', t: 'Scenarios', i: 'scen', k: 'G S', run: () => setView('scenarios') },
      { g: 'Go to', t: 'Past papers', i: 'lib', k: 'G P', run: () => setView('library', { focus: true }) },
      { g: 'Go to', t: 'Whiteboard', i: 'board', k: 'G W', run: () => { if (SUVAT.state.step !== 'board') $('board-top').click(); } },
      { g: 'Settings', t: `Switch to ${document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'} theme`, i: 'theme', k: 'T', run: press('theme-btn') },
      { g: 'Settings', t: 'Keyboard shortcuts', i: 'keys', k: '?', run: () => keys(true) },
    );
    for (const s of scenarios) list.push({ g: 'Scenarios', t: s.name, sub: s.sub, i: 'scen', words: plain(s.note || ''), run: pickCard(s.id) });
    for (const s of library) {
      const src = (s.sources || []).map((x) => `${x.board} ${x.paper} ${x.session} Q${x.q}`).join(' · ');
      list.push({ g: 'Past papers', t: s.name, sub: src, i: 'lib', words: plain(s.note || ''), run: pickCard(s.id) });
    }
    return list;
  }

  /* A small fuzzy score: every word of the query has to appear, earlier and
     in the title is better. Not clever; predictable. */
  function score(c, q) {
    if (!q) return 1;
    const title = plain(c.t).toLowerCase(), rest = `${plain(c.sub || '')} ${c.words || ''} ${c.g}`.toLowerCase();
    let total = 0;
    for (const w of q.toLowerCase().split(/\s+/).filter(Boolean)) {
      const at = title.indexOf(w);
      if (at === 0) total += 6; else if (at > 0) total += title[at - 1] === ' ' ? 4 : 2;
      else if (rest.includes(w)) total += 1;
      else return 0;
    }
    return total;
  }

  const ck = $('cmdk') || buildCmdk();
  const ckIn = ck.querySelector('input'), ckList = ck.querySelector('.cmdk-list');
  let items = [], sel = 0, lastFocus = null;
  function buildCmdk() {
    const d = document.createElement('div');
    d.className = 'cmdk'; d.id = 'cmdk'; d.hidden = true;
    d.innerHTML = `<div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Search or jump to">
      <div class="cmdk-in">${ic('nav').replace(ICON.nav, '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>')}
        <input type="text" placeholder="Search scenarios, past papers, actions…" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="cmdk-list" autocomplete="off" spellcheck="false">
        <kbd class="kbd">Esc</kbd></div>
      <div class="cmdk-list" id="cmdk-list" role="listbox"></div>
      <div class="cmdk-foot"><span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> to move</span><span><kbd class="kbd">↵</kbd> to open</span></div>
    </div>`;
    app.append(d);
    return d;
  }
  function render() {
    const q = ckIn.value.trim();
    items = commands().map((c) => ({ c, s: score(c, q) })).filter((x) => x.s > 0);
    if (q) items.sort((a, b) => b.s - a.s);
    items = items.slice(0, 60).map((x) => x.c);
    sel = Math.min(sel, Math.max(0, items.length - 1));
    if (!items.length) {
      ckList.innerHTML = `<div class="empty cmdk-empty"><p><b>No match for “${esc(q)}”.</b> Ask Suvat can read a whole question — press Enter to send it there.</p></div>`;
      return;
    }
    let html = '', g = null;
    items.forEach((c, n) => {
      if (!q && c.g !== g) { g = c.g; html += `<p class="cmdk-g">${g}</p>`; }
      html += `<button class="cmdk-i" role="option" data-n="${n}" aria-selected="${n === sel}">${ic(c.i)}
        <span class="cmdk-t">${c.t}${c.sub ? `<small>${c.sub}</small>` : ''}</span>${c.k ? `<kbd class="kbd">${c.k}</kbd>` : q ? `<span class="cmdk-kind">${c.g}</span>` : ''}</button>`;
    });
    ckList.innerHTML = html;
  }
  function move(d) {
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    for (const b of ckList.querySelectorAll('.cmdk-i')) b.setAttribute('aria-selected', String(+b.dataset.n === sel));
    ckList.querySelector(`[data-n="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }
  function run(n) {
    const c = items[n];
    const q = ckIn.value.trim();
    cmdk(false);
    if (c) c.run();
    else if (q) {                       // nothing matched: hand the words to Ask Suvat
      $('ask-top').click();
      const t = $('ask-text'); t.value = q; t.dispatchEvent(new Event('input', { bubbles: true })); t.focus();
    }
  }
  function cmdk(open) {
    if (open === !ck.hidden) return;
    if (open) {
      lastFocus = document.activeElement;
      setSpeed(false);
      ck.hidden = false; ckIn.value = ''; sel = 0; render();
      ckIn.focus();                     // now, not next frame: the first key typed must land
    } else {
      ck.dataset.closing = 'true';
      setTimeout(() => { ck.hidden = true; delete ck.dataset.closing; }, calm() ? 0 : 140);
      if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    }
  }
  ckIn.addEventListener('input', () => { sel = 0; render(); });
  ckIn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cmdk(false); }
  });
  ckList.addEventListener('click', (e) => { const b = e.target.closest('.cmdk-i'); if (b) run(+b.dataset.n); });
  ckList.addEventListener('pointermove', (e) => {
    const b = e.target.closest('.cmdk-i');
    if (b && +b.dataset.n !== sel) { sel = +b.dataset.n; for (const x of ckList.querySelectorAll('.cmdk-i')) x.setAttribute('aria-selected', String(x === b)); }
  });
  ck.addEventListener('pointerdown', (e) => { if (e.target === ck) cmdk(false); });
  $('cmdk-open').addEventListener('click', () => { closeSide(); cmdk(true); });
  $('cmdk-top').addEventListener('click', () => cmdk(true));
  for (const k of document.querySelectorAll('.kbd[data-mod]')) k.textContent = `${MAC ? '⌘' : 'Ctrl '}K`;

  /* ── the shortcuts sheet ────────────────────────────────────────────── */
  const KEYS = [
    ['Anywhere', [[`${MAC ? '⌘' : 'Ctrl'} K`, 'Search or jump to'], ['/', 'Search'], ['G then H', 'Ask Suvat'], ['G then S', 'Scenarios'],
      ['G then P', 'Past papers'], ['G then W', 'Whiteboard'], ['T', 'Switch theme'], ['?', 'This sheet']]],
    ['Values', [['Enter', 'Launch']]],
    ['Whiteboard', [['V', 'Move the board'], ['P', 'Pen'], ['H', 'Highlighter'], ['A', 'Arrow'], ['E', 'Eraser'],
      ['Shift', 'Hold for a straight line, in 15° steps'], [`${MAC ? '⌘' : 'Ctrl'} Z`, 'Undo'], [`${MAC ? '⌘' : 'Ctrl'} Shift Z`, 'Redo']]],
    ['Flight', [['Space', 'Play or pause'], ['← →', 'Step through time'], ['R', 'Resolve this instant'], ['D', 'Display options'], ['Esc', 'Close a card']]],
  ];
  const ks = document.createElement('div');
  ks.className = 'cmdk keys'; ks.hidden = true;
  ks.innerHTML = `<div class="cmdk-box keys-box" role="dialog" aria-modal="true" aria-labelledby="keys-h">
    <div class="keys-head"><h2 id="keys-h">Keyboard shortcuts</h2><button class="icon-btn" data-x aria-label="Close"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    ${KEYS.map(([h, rows]) => `<p class="cmdk-g">${h}</p><dl>${rows.map(([k, d]) => `<div><dt>${d}</dt><dd>${k.split(' ').map((x) => x === 'then' ? '<span class="then">then</span>' : `<kbd class="kbd">${x}</kbd>`).join('')}</dd></div>`).join('')}</dl>`).join('')}
  </div>`;
  app.append(ks);
  function keys(open) {
    ks.hidden = !open;
    if (open) ks.querySelector('[data-x]').focus();
  }
  ks.addEventListener('click', (e) => { if (e.target === ks || e.target.closest('[data-x]')) keys(false); });
  ks.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); keys(false); } });
  $('keys-btn').addEventListener('click', () => { closeSide(); keys(true); });

  /* ── keys ───────────────────────────────────────────────────────────── */
  let gAt = 0;
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk(ck.hidden); return; }
    if (!ck.hidden || !ks.hidden) return;
    if (e.key === 'Escape' && app.dataset.side === 'open') { closeSide(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable) return;
    if (document.querySelector('.intro:not([hidden]), .resolve:not([hidden])')) return;
    const k = e.key.toLowerCase();
    if (gAt && Date.now() - gAt < 900) {
      gAt = 0;
      const to = { h: () => $('ask-top').click(), s: () => setView('scenarios'), p: () => setView('library', { focus: true }),
                   w: () => { if (SUVAT.state.step !== 'board') $('board-top').click(); } }[k];
      if (to) { e.preventDefault(); to(); }
      return;
    }
    if (k === 'g') { gAt = Date.now(); return; }
    if (e.key === '/') { e.preventDefault(); cmdk(true); }
    else if (e.key === '?') { e.preventDefault(); keys(true); }
    else if (k === 't') $('theme-btn').click();
    else if (k === 'd' && SUVAT.state.step === 'flight') $('options-btn').click();
  });

  /* ── toasts: an answer to every action that has no other ────────────── */
  const tray = document.createElement('div');
  tray.className = 'toasts'; tray.setAttribute('role', 'status'); tray.setAttribute('aria-live', 'polite');
  document.body.append(tray);
  function toast(msg, { icon, tone } = {}) {
    const t = document.createElement('div');
    t.className = 'toast'; if (tone) t.dataset.tone = tone;
    t.innerHTML = `${icon && ICON[icon] ? ic(icon) : ''}<span>${esc(msg)}</span>`;
    tray.append(t);
    while (tray.children.length > 3) tray.firstChild.remove();
    setTimeout(() => { t.dataset.out = 'true'; setTimeout(() => t.remove(), 220); }, 2600);
  }

  /* Slow internet and no internet: say so, once, in words. The engine runs
     offline; only Ask Suvat and the whiteboard need the network. */
  addEventListener('offline', () => { app.dataset.offline = 'true'; toast('You are offline. Scenarios still work; Ask Suvat will wait for the connection.', { tone: 'warn' }); });
  addEventListener('online', () => { delete app.dataset.offline; toast('Back online.'); });
  if (navigator.onLine === false) app.dataset.offline = 'true';
  // An ugly mistake is still answered: a short line, never a blank screen.
  let lastErr = 0;
  addEventListener('error', (e) => {
    if (!e.message || Date.now() - lastErr < 8000) return;
    lastErr = Date.now();
    toast('Something went wrong drawing that. Try again, or reload if it sticks.', { tone: 'warn' });
  });

  return { toast, setView };
}

/* The light that follows the pointer across a grid of cards: one soft wash,
   and a brighter edge on the card nearest it. Set as two custom properties
   per card; the look is all css/shell.css. */
function spotlight(host) {
  if (matchMedia('(hover: none)').matches) return;
  host.addEventListener('pointermove', (e) => {
    for (const c of host.children) {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--gx', `${e.clientX - r.left}px`);
      c.style.setProperty('--gy', `${e.clientY - r.top}px`);
      c.style.setProperty('--gon', '1');
    }
  });
  host.addEventListener('pointerleave', () => { for (const c of host.children) c.style.setProperty('--gon', '0'); });
}
