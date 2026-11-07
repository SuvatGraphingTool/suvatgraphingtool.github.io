// ask.js — "Ask Suvat": a chat box on the first screen, and the chat it opens.
//
// Type the question, add a picture of it or the paper as a file, or say it.
// The first message turns the whole screen into the chat (#screen-chat): the
// box glides from the middle of the first screen to the foot of the chat, as
// it does in the chat assistants, and every reply is written out a letter at
// a time (js/ai/typewriter.js).
// This file owns the box, the chat and its replies, and nothing else. It sends
// the question to the reader (js/ai/capture.js) and hands what comes back to
// the app, which decides what it means — see applyReading in js/app.js. The
// model reads; the engine calculates; this only carries the question between.
//
// Voice is the browser's own speech recognition, written into the box where
// it can be checked and corrected before anything is sent. Where the browser
// has none (Firefox), the microphone is simply not offered.

import { prepareImage, readQuestion, readText, READER } from './capture.js';
import { esc, proseHTML, sourcesHTML } from './readout.js';
import { typeOut } from './typewriter.js';
import { gAskHTML, parseG } from './gchoice.js';
import { loadChats, getChat, saveChat, deleteChat, newChatRecord, titleOf, dayGroup, thumbOf, onChats } from './chats.js';
import { plainOf } from '../notation.js';

const $ = (id) => document.getElementById(id);
const PDF_MAX = 4_000_000;          // the Worker's own limit, checked here first
const TXT_MAX = 2_000;

/**
 * @param o.apply(extraction) → { ok, html?, runnable?, error? }
 * @param o.run()   show the flight
 * @param o.edit()  go to the values screen instead
 * @param o.show(step)  go to a screen — 'chat' is this one's
 * @param o.scene(id)  a part's own composed scene, on the stage (js/compose/)
 * @param o.gravity(g)  the question read again with that g → the same as apply's answer
 */
export function createAsk({ apply, run, edit, show, scene, gravity }) {
  const form = $('ask-form'), text = $('ask-text'), send = $('ask-send');
  const thread = $('ask-thread'), scroller = $('chat-scroll');
  const composer = $('ask-composer');
  let att = null, busy = null;     // att: { kind: 'image'|'pdf', file }
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, before = '';     // the browser's own speech recognition, while it listens
  // The chat so far, as the reader is shown it: what the student said and the
  // JSON each answer was. A photo is not sent twice — what was read from it
  // is in the answer that followed.
  const history = [];
  const HISTORY_MAX = 8;
  let current = null;              // this turn's reply, while it is being written
  let typing = null;               // the reply being typed out, if one is
  // The chat on show, as it is kept in this browser (js/ai/chats.js): made by
  // its first message, saved after every message and reply.
  let chat = null;
  // Bumped whenever the thread on show is swapped for another (a new chat, a
  // kept one opened), so an answer still on its way to the old one is dropped.
  let gen = 0;
  const keep = () => { if (chat) { chat.updated = Date.now(); chat.history = [...history]; saveChat(chat); } };

  /* ── the chat screen ────────────────────────────────────────────────────
     The box is one element, moved to wherever the screen on show wants it:
     the foot of the chat, or the middle of the first screen. */
  const app = $('app');
  const inChat = () => app.dataset.step === 'chat';
  function dock() {
    const slot = inChat() ? $('chat-dock') : $('ask-slot');
    if (composer.parentNode !== slot) slot.append(composer);
    // Back to the chat on show, or — with none on show — to the chats kept.
    const kept = !thread.childElementCount && loadChats().length > 0;
    $('ask-resume').hidden = inChat() || (!thread.childElementCount && !kept);
    $('ask-resume-t').textContent = kept ? 'Your chats' : 'Back to your chat';
    if (!inChat()) drawer(false);
  }
  new MutationObserver(dock).observe(app, { attributes: true, attributeFilter: ['data-step'] });

  /* The first message opens the chat. Where the browser can, it is a view
     transition: the box is named, so it glides to its new place while the
     rest cross-fades. Elsewhere the same glide is done by hand. */
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let opening = false;              // a view transition has been asked for
  function openChat({ instant = false } = {}) {
    if (inChat()) return;
    // A view transition runs its swap a frame or more later. If the student
    // has gone somewhere else by then ("Show me the flight"), it stays there.
    const whence = app.dataset.step;
    const swap = () => {
      opening = false;
      if (inChat() || app.dataset.step !== whence) return;
      show('chat'); dock(); follow(true);
      text.focus({ preventScroll: true });
    };
    if (instant || calm()) { swap(); return; }
    if (opening) return;
    if (document.startViewTransition) { opening = true; document.startViewTransition(swap); return; }
    const from = composer.getBoundingClientRect();
    swap();
    const to = composer.getBoundingClientRect();
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    composer.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }],
      { duration: 520, easing: ease });
    $('screen-chat').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: ease });
  }
  /** The thread on show, emptied — and any answer on its way to it dropped. */
  function clearThread() {
    gen++;
    typing?.finish(); typing = null;
    if (busy) { busy.abort(); busy = null; sync(); }
    for (const img of thread.querySelectorAll('img.ask-shot')) if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    thread.replaceChildren();
    history.length = 0; current = null; chat = null;
  }
  /** A new chat, as in the assistants: the screen stays, empty, with its
      greeting, and the box waits at its foot. */
  function newChat() {
    clearThread();
    closeList();
    renderList();
    if (!inChat()) openChat({ instant: true });
    dock();
    text.focus({ preventScroll: true });
  }
  function focus() { text.focus(); text.scrollIntoView({ block: 'center', behavior: 'smooth' }); }

  /* The chat keeps to its newest line while it is written — unless the
     student has scrolled up to read something, which it then leaves alone. */
  let stick = true;
  scroller.addEventListener('scroll', () => {
    stick = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
  }, { passive: true });
  function follow(force = false) {
    if (force) stick = true;
    if (!thread.childElementCount) { scroller.scrollTop = 0; return; }   // a new chat: its greeting, from the top
    if (stick) scroller.scrollTop = scroller.scrollHeight;
  }

  /* ── the three switches ─────────────────────────────────────────────────
     Search  a written answer from a web search, with its sources
     Solve   the engine's worked solution, step by step
     Graph   the scenario set up and drawn — on unless switched off
     Remembered between visits, in this browser only. */
  const MODES_KEY = 'suvat-ask-modes';
  const modes = { search: false, solve: false, graph: true };
  try { Object.assign(modes, JSON.parse(localStorage.getItem(MODES_KEY) || '{}')); } catch {}
  // Each mode has two switches: an icon in the box's bar, and a card under
  // the box while it sits on the scenario screen. Both read and set one state.
  const SWITCHES = '.ask-mode, .ask-card';
  for (const b of document.querySelectorAll(SWITCHES)) {
    const k = b.dataset.mode;
    b.setAttribute('aria-pressed', String(!!modes[k]));
    b.addEventListener('click', () => {
      modes[k] = !modes[k];
      // Search and Solve answer in different ways, so — as in the prompt box
      // this is adapted from — turning one on turns the other off.
      if (modes[k] && k === 'search') modes.solve = false;
      if (modes[k] && k === 'solve') modes.search = false;
      showModes();
      try { localStorage.setItem(MODES_KEY, JSON.stringify(modes)); } catch {}
      text.focus();
    });
  }
  if (modes.search && modes.solve) modes.solve = false;
  function showModes() {
    for (const m of document.querySelectorAll(SWITCHES)) m.setAttribute('aria-pressed', String(!!modes[m.dataset.mode]));
    if (!rec) text.placeholder = modes.search ? 'Search the web…'
      : modes.solve ? 'Solve it step by step…'
      : modes.graph ? 'Ask Suvat — it will draw it…' : 'Ask Suvat';
  }

  /* ── the box ────────────────────────────────────────────────────────── */
  /* The one round button, as in the prompt box: the microphone when the box
     is empty, send when it is not, stop while Suvat answers, and the end of
     a recording while it listens. */
  function sync() {
    const has = !!text.value.trim() || !!att;
    const state = busy ? 'busy' : rec ? 'rec' : has ? 'send' : Rec ? 'mic' : 'send';
    send.dataset.state = state;
    send.disabled = state === 'send' && !has;
    const say = { busy: 'Stop', rec: 'Stop listening', send: 'Send to Suvat', mic: 'Speak the question' }[state];
    send.setAttribute('aria-label', say); send.title = say;
    form.dataset.busy = String(!!busy);
    // The box grows with what is in it, up to a point.
    text.style.height = 'auto';
    text.style.height = `${Math.min(text.scrollHeight, 180)}px`;
  }

  function attach(file) {
    if (!file) return;
    const pv = $('ask-att');
    if (pv.dataset.url) { URL.revokeObjectURL(pv.dataset.url); delete pv.dataset.url; }
    if (/^text\/plain$|\.txt$/i.test(file.type || file.name)) {
      // A text file is just more words: read it into the box.
      file.text().then((t) => {
        text.value = `${text.value.trim()} ${t.trim()}`.trim().slice(0, TXT_MAX);
        sync(); text.focus();
      });
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf && !file.type.startsWith('image/')) {
      reply(`<p class="ro-bad">Suvat can read a photo, a PDF or a text file — not that kind of file.</p>`);
      return;
    }
    if (isPdf && file.size > PDF_MAX) {
      reply(`<p class="ro-bad">That PDF is too big. Send just the page with the question on it.</p>`);
      return;
    }
    att = { kind: isPdf ? 'pdf' : 'image', file };
    $('ask-att-name').textContent = file.name || (isPdf ? 'Question paper' : 'Photo');
    const img = $('ask-att-img');
    if (isPdf) { img.hidden = true; $('ask-att-doc').hidden = false; }
    else {
      pv.dataset.url = URL.createObjectURL(file);
      img.src = pv.dataset.url; img.hidden = false; $('ask-att-doc').hidden = true;
    }
    pv.hidden = false;
    sync(); text.focus();
  }
  function detach() {
    const pv = $('ask-att');
    if (pv.dataset.url) { URL.revokeObjectURL(pv.dataset.url); delete pv.dataset.url; }
    att = null; pv.hidden = true;
    $('ask-doc-in').value = '';
    sync();
  }

  /* ── the conversation: every message, oldest at the top ───────────────── */
  /** A reply's frame: Suvat's mark and name, the words, and under them the
      actions — Copy — which show on hover, as the assistants' do. */
  const replyHTML = (html) => `<span class="ai-orb sm" aria-hidden="true">${SPARK}</span>`
    + `<div class="ask-main"><p class="ask-name">Suvat</p><div class="ask-bubble">${html}</div>`
    + `<div class="ask-tools"><button type="button" class="ask-tool ask-copy" title="Copy this reply">${COPY_IC}<span class="ask-tool-t">Copy</span></button></div></div>`;
  /** While Suvat reads: its mark pulses and a word shimmers, in place of the dots. */
  const thinkingHTML = (searching, note = '') => `<p class="ask-think" role="status"><span class="ask-think-t">${searching ? 'Searching the web…' : 'Thinking…'}</span></p>${note}`;
  /** A reply. Unless it is the dots, it is written out a letter at a time;
      `before` runs first, on the whole reply, before it is hidden to be
      typed in. */
  function reply(html, { busy: thinking = false, acts = null, before = null } = {}) {
    openChat();
    let r = current;
    if (!r) { r = document.createElement('div'); r.className = 'ask-msg ask-reply'; thread.append(r); }
    if (thinking) current = r; else current = null;
    r.dataset.busy = String(thinking);
    r.innerHTML = replyHTML(`${html}${acts || ''}`);
    before?.(r);
    if (!thinking) {
      typing?.finish();
      typing = typeOut(r.querySelector('.ask-bubble'), { tick: follow });
      if (chat) { r.turn = { who: 'suvat', html }; chat.turns.push(r.turn); keep(); }
    }
    follow();
    return r;
  }
  function echo(words, a) {
    typing?.finish();
    // Only the newest answer's buttons act: an older one would run whatever
    // question is set up now, not the one it was written for.
    for (const old of thread.querySelectorAll('.ask-acts')) old.remove();
    current = null;
    mine(words, a && { kind: a.kind, name: a.file.name || '' }, a?.kind === 'image' ? URL.createObjectURL(a.file) : null);
    follow(true);
    // kept: the words, and a small copy of a photo — the photo itself is not
    if (!chat) { chat = newChatRecord(); chat.title = titleOf(words, a); }
    const turn = { who: 'me', words, ...(a ? { att: { kind: a.kind, name: a.file.name || '' } } : {}) };
    chat.turns.push(turn); keep();
    if (a?.kind === 'image') thumbOf(a.file).then((t) => { if (t) { turn.att.thumb = t; keep(); } });
  }
  /** The student's message in the thread. A photo stays as a picture, so the chat reads back. */
  function mine(words, att, src) {
    const q = document.createElement('div');
    q.className = 'ask-msg ask-mine';
    const what = !att ? ''
      : att.kind === 'image' ? (src ? `<img class="ask-shot" src="${esc(src)}" alt="The photo sent">` : '<span class="ask-chip">Photo</span>')
      : `<span class="ask-chip">PDF · ${esc(att.name)}</span>`;
    q.innerHTML = `<div class="ask-bubble">${what}${words ? `<p>${esc(words)}</p>` : ''}</div>`;
    thread.append(q);
  }
  function remember(words, a, extraction) {
    const said = a ? `[sent ${a.kind === 'pdf' ? 'the question paper as a PDF' : 'a photo of the question'}]${words ? ` ${words}` : ''}` : words;
    history.push({ role: 'user', text: said }, { role: 'model', text: JSON.stringify(extraction) });
    while (history.length > HISTORY_MAX) history.shift();
  }

  async function submit(e) {
    e?.preventDefault();
    if (busy || (!text.value.trim() && !att)) return;
    stopMic();
    const words = text.value.trim(), a = att;
    openChat();
    echo(words, a);
    text.value = ''; detach();
    busy = new AbortController(); sync();
    const my = gen, ctl = busy;
    const searching = modes.search;
    reply(thinkingHTML(searching), { busy: true });
    // Google's free models are sometimes slow to answer. Say so, rather than
    // leave Suvat looking stuck.
    const slow = setTimeout(() => {
      if (busy === ctl && gen === my) reply(thinkingHTML(searching, `<p class="ask-wait">Still ${searching ? 'searching' : 'reading'} — Google is busy, so this one is taking longer.</p>`), { busy: true });
    }, 6_000);

    let res;
    try {
      const mode = searching ? 'search' : undefined;
      if (a?.kind === 'image') {
        const prepared = await prepareImage(a.file);
        res = await readQuestion(READER, prepared, { hint: words, history, mode, signal: ctl.signal });
      } else if (a?.kind === 'pdf') {
        const base64 = await fileBase64(a.file);
        res = await readQuestion(READER, { base64, mimeType: 'application/pdf' }, { hint: words, history, mode, signal: ctl.signal });
      } else {
        res = await readText(READER, words, { history: [...history], mode, signal: ctl.signal });
      }
    } catch {
      res = { ok: false, message: 'That file could not be opened. Try a JPEG, PNG or PDF.' };
    }
    clearTimeout(slow);
    // the chat was left for another while this was read: its answer is dropped
    if (gen !== my) return;
    const stopped = ctl.signal.aborted;
    busy = null; sync();
    // the newest reading is the one a reopened chat sets up again; any other
    // answer leaves no buttons, so none is set up
    if (chat) chat.last = null;
    if (stopped) { reply('<p class="ro-sum">Stopped.</p>'); return; }

    if (!res?.ok) { reply(`<p class="ro-bad">${esc(res?.message || 'Could not read that.')}</p>`); return; }

    // SEARCH: the model's own answer, grounded in the web, with its sources.
    if (searching) {
      const said = a ? `[sent ${a.kind === 'pdf' ? 'a PDF' : 'a photo'}]${words ? ` ${words}` : ''}` : words;
      history.push({ role: 'user', text: said }, { role: 'model', text: String(res.answer || '') });
      while (history.length > HISTORY_MAX) history.shift();
      reply(`<div class="ro-prose">${proseHTML(res.answer)}</div>${sourcesHTML(res.sources)}`);
      return;
    }

    remember(words, a, res.extraction);
    // the words typed, so the reply can tell a number given from one read from the
    // wording ("dropped" is u = 0); a photo's numbers are in the photo, so none
    // (a follow-up — "same but g = 9.8" — keeps the numbers typed before it; after a photo, none can be told)
    const said = history.filter((h) => h.role === 'user').map((h) => h.text);
    const opts = { graph: modes.graph, solve: modes.solve, words: a || said.some((t) => t.startsWith('[sent ')) ? null : said.join('\n') };
    const r = apply(res.extraction, opts);
    if (!r.ok) { reply(`<p${r.chat ? '' : ' class="ro-bad"'}>${esc(r.error)}</p>`); return; }
    if (chat) chat.last = { extraction: res.extraction, opts };
    reading(r);
    // A scene composed for this question is what they asked to see: the stage
    // opens on it straight away, behind its veil (js/compose/reveal.js), and
    // the reply stays in the chat to come back to.
    if (r.composed && r.runnable) setTimeout(run, 700);
  }

  /** A reading's reply: what the engine made of it, and its buttons, wired.
      With `node`, the reply already in the thread is filled in place, as it
      is when a kept chat is opened again — not typed out a second time. */
  function reading(r, node = null) {

    // Typeset maths arrives as markup, so it goes in with innerHTML (rule 1).
    // EVERY READING THAT RUNS CAN BE VIEWED (the user, 1 Nov): the buttons no
    // longer hang on the Graph switch, which only decides whether the graphs open.
    // Which g? Asked here, beside the flight, only when the motion uses g and the
    // question gave none (js/ai/gchoice.js); never before a question is asked.
    const acts = r.runnable || modes.graph
      ? `<div class="ask-acts">${gAskHTML(r.gAsk)}
        <button type="button" class="fire sm ask-run"${r.runnable ? '' : ' disabled'}>${r.composed ? 'Show me the scene' : 'Show me the flight'}</button>
        <button type="button" class="ghost sm ask-edit">${r.runnable ? 'Check the values' : 'Add the missing values'}</button>
      </div>`
      : '';
    // The box keeps the focus, as in any chat: the next question is the
    // likelier next thing than the flight.
    const wireScenes = (el) => { for (const b of el.querySelectorAll('.ask-scene')) { b.disabled = false; b.addEventListener('click', () => scene?.(b.dataset.id)); } };
    const html = `<div class="ask-body">${r.html}</div>`;
    const wire = (node) => {
      node.querySelector('.ask-run')?.addEventListener('click', run);
      node.querySelector('.ask-edit')?.addEventListener('click', edit);
      wireScenes(node);
      const gq = node.querySelector('.ask-gq');
      if (!gq) return;
      // a g picked: the question read again with it, and this reply's answers,
      // values and working replaced where they stand — no new message
      const pick = (g) => {
        const again = gravity?.(g);
        if (!again?.ok) return;
        typing?.finish();
        const body = node.querySelector('.ask-body');
        body.innerHTML = again.html;
        wireScenes(body);
        // kept as it now reads, and opened again with this g
        if (node.turn) node.turn.html = `<div class="ask-body">${again.html}</div>`;
        if (chat?.last) { chat.last.opts = { ...chat.last.opts, g }; keep(); }
        const fresh = document.createElement('div');
        fresh.innerHTML = gAskHTML(again.gAsk);
        const now = fresh.firstElementChild;
        if (now) { gq.querySelectorAll('.chip').forEach((c, i) => c.setAttribute('aria-pressed', now.querySelectorAll('.chip')[i].getAttribute('aria-pressed')));
          gq.querySelector('.ask-gq-note').textContent = now.querySelector('.ask-gq-note').textContent; }
        node.querySelector('.ask-run')?.toggleAttribute('disabled', !again.runnable);
      };
      const box = gq.querySelector('.ask-gq-in'), err = gq.querySelector('.ask-gq-err');
      gq.addEventListener('click', (e) => {
        const c = e.target.closest('.chip');
        if (c) { box.value = ''; box.removeAttribute('aria-invalid'); err.hidden = true; pick(Number(c.dataset.g)); }
      });
      const typed = () => {
        if (!box.value.trim()) return;
        const g = parseG(box.value);
        box.toggleAttribute('aria-invalid', g == null); if (g == null) box.setAttribute('aria-invalid', 'true');
        err.hidden = g != null;
        if (g != null) pick(g);
      };
      box.addEventListener('change', typed);
      box.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); typed(); } });
    };
    if (!node) { reply(html, { acts, before: wire }); return; }
    node.querySelector('.ask-bubble').innerHTML = html + acts;
    wire(node);
  }

  /* ── the chats kept ─────────────────────────────────────────────────────
     Every chat is kept in this browser as it is had (js/ai/chats.js), and
     listed in a panel on the right of the chat, as the big assistants list
     theirs: a new chat, a search by title, and the chats under the day they
     were last had. One opened reads back as it was, and its newest reading
     is set up again, so "Show me the flight" shows that flight.
     Wide, the panel stays open unless it is put away (remembered here);
     under 900 px it is a drawer from the bar, over a scrim. */
  const screen = $('screen-chat'), side = $('chat-list'), listBtn = $('chat-hist');
  const listEl = $('chat-list-ul'), none = $('chat-list-none'), search = $('chat-q');
  const narrow = matchMedia('(max-width: 900px)');
  const SIDE_KEY = 'suvat-chat-side';
  let sideOpen = true;
  try { sideOpen = localStorage.getItem(SIDE_KEY) !== 'closed'; } catch { /* storage shut: open */ }

  const shown = () => (narrow.matches ? screen.dataset.drawer === 'open' : sideOpen);
  function paintSide() {
    screen.dataset.hist = sideOpen ? 'open' : 'closed';
    const on = shown();
    listBtn.setAttribute('aria-expanded', String(on));
    const say = on ? 'Hide your chats' : 'Show your chats';
    listBtn.setAttribute('aria-label', say); listBtn.title = say;
    side.inert = !on;
  }
  function setSide(open) {
    sideOpen = open;
    try { localStorage.setItem(SIDE_KEY, open ? 'open' : 'closed'); } catch { /* storage shut */ }
    paintSide();
  }
  /** The phone's drawer, opened or closed. Closing it gives the focus back to the bar. */
  function drawer(open) {
    if ((screen.dataset.drawer === 'open') === open) return;
    const had = side.contains(document.activeElement);
    screen.dataset.drawer = open ? 'open' : 'closed';
    paintSide();
    if (open) focusList();
    else if (had) listBtn.focus({ preventScroll: true });
  }
  function focusList() {
    requestAnimationFrame(() => (listEl.querySelector('[aria-current] .cl-open') || listEl.querySelector('.cl-open') || search)
      .focus({ preventScroll: true }));
  }
  /** "Your chats": the panel, shown wherever it is. */
  function openList() {
    renderList();
    if (narrow.matches) drawer(true);
    else { if (!sideOpen) setSide(true); focusList(); }
  }
  function closeList() { drawer(false); }
  narrow.addEventListener('change', () => { screen.dataset.drawer = 'closed'; paintSide(); });

  const BIN = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
  /** The list, drawn again from what is kept: after every save or delete, a
      sync from the account, a search, or another chat put on show. */
  function renderList() {
    const all = loadChats();
    const term = search.value.trim().toLowerCase();
    const found = term ? all.filter((c) => (c.title || 'A chat').toLowerCase().includes(term)) : all;
    const was = document.activeElement?.closest?.('.cl-row')?.dataset.id;
    const wasX = document.activeElement?.classList?.contains('cl-x');
    const groups = new Map();
    for (const c of found) {
      const g = dayGroup(c.updated);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(c);
    }
    listEl.replaceChildren(...[...groups].map(([g, cs]) => {
      const sec = document.createElement('section');
      sec.className = 'cs-group';
      sec.innerHTML = `<h3 class="cs-g">${esc(g)}</h3><ul class="cl-ul"></ul>`;
      sec.lastElementChild.append(...cs.map((c) => {
        const li = document.createElement('li');
        li.className = 'cl-row';
        li.dataset.id = c.id;
        if (c.id === chat?.id) li.setAttribute('aria-current', 'true');
        const t = esc(c.title || 'A chat');
        li.innerHTML = `<button type="button" class="cl-open" data-id="${esc(c.id)}" title="${t}"><span class="cl-t">${t}</span></button>`
          + `<button type="button" class="cl-x" data-id="${esc(c.id)}" aria-label="Delete “${t}”" title="Delete this chat">${BIN}</button>`;
        return li;
      }));
      return sec;
    }));
    none.textContent = all.length ? 'No chats match that.' : 'No chats yet. Ask a question and it is kept here.';
    none.hidden = found.length > 0;
    // a row that had the focus keeps it, drawn again
    if (was) listEl.querySelector(`.cl-row[data-id="${CSS.escape(was)}"] ${wasX ? '.cl-x' : '.cl-open'}`)?.focus({ preventScroll: true });
  }

  function openKept(id) {
    const c = getChat(id);
    closeList();
    if (!c || c.id === chat?.id) { if (c && !inChat()) openChat({ instant: true }); return; }
    clearThread();
    chat = c;
    history.push(...(c.history || []));
    let last = null;
    for (const t of c.turns) {
      if (t.who === 'me') { mine(t.words, t.att, t.att?.thumb || null); continue; }
      const r = document.createElement('div');
      r.className = 'ask-msg ask-reply';
      r.dataset.busy = 'false';
      r.innerHTML = replyHTML(t.html);
      // an older reply's part buttons would open the reading on show, not its own
      for (const b of r.querySelectorAll('.ask-bubble button')) b.disabled = true;
      r.turn = t;
      thread.append(r);
      last = r;
    }
    // the newest reading, set up again on the stage, its buttons live
    if (c.last && last && c.turns.at(-1)?.who === 'suvat') {
      const r = apply(c.last.extraction, c.last.opts);
      if (r?.ok) reading(r, last);
    }
    renderList();
    if (!inChat()) openChat({ instant: true });
    dock();
    follow(true);
  }
  listBtn.addEventListener('click', () => {
    if (narrow.matches) drawer(screen.dataset.drawer !== 'open');
    else setSide(!sideOpen);
  });
  $('chat-side-x').addEventListener('click', closeList);
  $('chat-scrim').addEventListener('click', closeList);
  $('chat-side-new').addEventListener('click', newChat);
  search.addEventListener('input', renderList);
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && search.value) { e.preventDefault(); e.stopPropagation(); search.value = ''; renderList(); }
  });
  listEl.addEventListener('click', (e) => {
    const x = e.target.closest('.cl-x');
    if (x) {
      const rows = [...listEl.querySelectorAll('.cl-row')];
      const at = rows.indexOf(x.closest('.cl-row'));
      const id = x.dataset.id;
      // the chat on show, deleted: the screen becomes a new chat, as the assistants do
      if (id === chat?.id) clearThread();
      deleteChat(id);                  // heard by onChats below, which draws the list again
      const left = [...listEl.querySelectorAll('.cl-row')];
      (left[Math.min(at, left.length - 1)]?.querySelector('.cl-open') || search).focus({ preventScroll: true });
      return;
    }
    const o = e.target.closest('.cl-open');
    if (o) openKept(o.dataset.id);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && screen.dataset.drawer === 'open') { e.stopPropagation(); closeList(); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (screen.dataset.drawer === 'open' && !side.contains(e.target) && !listBtn.contains(e.target)) closeList();
  });
  // every chat kept or deleted, here or by the account's sync, redraws the list
  onChats(() => renderList());

  /* ── a new chat's greeting, and a reply copied ──────────────────────────
     The greeting shows while the thread is empty; a suggestion is sent
     through the box, as if it were typed. */
  const hello = $('chat-hello');
  const paintHello = () => {
    const was = hello.hidden;
    hello.hidden = thread.childElementCount > 0;
    if (was && !hello.hidden) scroller.scrollTop = 0;   // a new chat starts at its greeting
  };
  new MutationObserver(paintHello).observe(thread, { childList: true });
  paintHello();
  hello.addEventListener('click', (e) => {
    const b = e.target.closest('.chat-sug');
    if (!b || busy) return;
    text.value = b.dataset.q; sync(); submit();
  });
  thread.addEventListener('click', async (e) => {
    const b = e.target.closest('.ask-copy');
    if (!b) return;
    typing?.finish();
    const words = plainOf(b.closest('.ask-msg').querySelector('.ask-bubble'));
    let done = false;
    try { await navigator.clipboard.writeText(words); done = true; } catch { /* no clipboard here */ }
    const t = b.querySelector('.ask-tool-t');
    b.dataset.done = String(done);
    t.textContent = done ? 'Copied' : 'Could not copy';
    clearTimeout(b.resetAt);
    b.resetAt = setTimeout(() => { t.textContent = 'Copy'; delete b.dataset.done; }, 1600);
  });

  /* ── voice ──────────────────────────────────────────────────────────── */
  let clock = null;
  function stopMic() { rec?.stop(); }
  function startMic() {
    rec = new Rec();
    rec.lang = 'en-GB';
    rec.interimResults = true;
    rec.continuous = true;
    before = text.value.trim() ? `${text.value.trim()} ` : '';
    rec.onresult = (e) => {
      let said = '';
      for (const r of e.results) said += r[0].transcript;
      text.value = before + said;
      sync();
    };
    rec.onerror = (e) => {
      reply(`<p class="ro-bad">${e.error === 'not-allowed'
        ? 'The microphone is blocked. Allow it for this site, or type the question.'
        : 'Could not hear that. Try again, or type the question.'}</p>`);
    };
    rec.onend = () => {
      rec = null;
      clearInterval(clock); $('ask-rec').hidden = true;
      form.dataset.listening = 'false';
      showModes(); sync();
      text.focus();
    };
    rec.start();
    form.dataset.listening = 'true';
    text.placeholder = 'Listening… say what is thrown, from where, and the numbers';
    const t0 = Date.now(), out = $('ask-rec-t');
    out.textContent = '00:00'; $('ask-rec').hidden = false;
    clock = setInterval(() => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      out.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    }, 1000);
    sync();
  }
  send.addEventListener('click', () => {
    const state = send.dataset.state;
    if (state === 'busy') busy?.abort();
    else if (state === 'rec') stopMic();
    else if (state === 'mic') startMic();
    else submit();
  });

  /* ── wiring ─────────────────────────────────────────────────────────── */
  showModes();
  form.addEventListener('submit', submit);
  text.addEventListener('input', sync);
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  $('ask-doc').addEventListener('click', () => $('ask-doc-in').click());
  $('ask-doc-in').addEventListener('change', (e) => attach(e.target.files?.[0]));
  $('ask-att-x').addEventListener('click', detach);
  // The thumbnail opens the photo full size, as the prompt box does.
  $('ask-att-view').addEventListener('click', () => {
    const img = $('ask-att-img');
    if (img.hidden || !img.src) return;
    $('ask-view-img').src = img.src;
    $('ask-view').showModal?.();
  });
  $('ask-view-x').addEventListener('click', () => $('ask-view').close());
  $('ask-resume').addEventListener('click', () => {
    if (thread.childElementCount) { openChat(); return; }
    openChat({ instant: true }); openList();
  });
  $('chat-back').addEventListener('click', () => show('scenario'));
  $('chat-new').addEventListener('click', newChat);
  $('ask-view').addEventListener('click', (e) => { if (e.target === $('ask-view')) $('ask-view').close(); });
  // A picture pasted or dropped on the box is a picture added.
  text.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])][0];
    if (f) { e.preventDefault(); attach(f); }
  });
  form.addEventListener('dragover', (e) => { e.preventDefault(); form.dataset.drop = 'true'; });
  form.addEventListener('dragleave', () => { form.dataset.drop = 'false'; });
  form.addEventListener('drop', (e) => {
    e.preventDefault(); form.dataset.drop = 'false';
    attach(e.dataTransfer?.files?.[0]);
  });
  sync();
  dock();
  paintSide();
  renderList();
  // the account brought chats from another device: "Your chats" may be offered
  // now, and the panel lists them
  document.addEventListener('suvat:chats', () => { dock(); renderList(); });

  return {
    /** The top bar's "Ask Suvat": the chat if there is one, else the box. */
    open() {
      if (thread.childElementCount) { openChat(); text.focus({ preventScroll: true }); }
      else { show('scenario'); requestAnimationFrame(focus); }
    },
  };
}

function fileBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1]);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}


const COPY_IC = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';

/** The Spark: the AI's mark, drawn once in index.html as the #spark symbol. */
export const SPARK = '<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true"><use href="#spark"/></svg>';
