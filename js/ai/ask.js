// ask.js — "Ask Suvat": a chat box on the first screen.
//
// Type the question, add a picture of it or the paper as a file, or say it.
// This file owns the box and the reply under it, and nothing else. It sends
// the question to the reader (js/ai/capture.js) and hands what comes back to
// the app, which decides what it means — see applyReading in js/app.js. The
// model reads; the engine calculates; this only carries the question between.
//
// Voice is the browser's own speech recognition, written into the box where
// it can be checked and corrected before anything is sent. Where the browser
// has none (Firefox), the microphone is simply not offered.

import { prepareImage, readQuestion, readText, READER } from './capture.js';
import { esc, proseHTML, sourcesHTML } from './readout.js';

const $ = (id) => document.getElementById(id);
const PDF_MAX = 4_000_000;          // the Worker's own limit, checked here first
const TXT_MAX = 2_000;

/**
 * @param o.apply(extraction) → { ok, html?, runnable?, error? }
 * @param o.run()   show the flight
 * @param o.edit()  go to the values screen instead
 */
export function createAsk({ apply, run, edit }) {
  const form = $('ask-form'), text = $('ask-text'), send = $('ask-send');
  const thread = $('ask-thread');
  let att = null, busy = null;     // att: { kind: 'image'|'pdf', file }
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, before = '';     // the browser's own speech recognition, while it listens
  // The chat so far, as the reader is shown it: what the student said and the
  // JSON each answer was. A photo is not sent twice — what was read from it
  // is in the answer that followed.
  const history = [];
  const HISTORY_MAX = 8;
  let current = null;              // this turn's reply, while it is being written

  /* ── the three switches ─────────────────────────────────────────────────
     Search  a written answer from a web search, with its sources
     Solve   the engine's worked solution, step by step
     Graph   the scenario set up and drawn — on unless switched off
     Remembered between visits, in this browser only. */
  const MODES_KEY = 'suvat-ask-modes';
  const modes = { search: false, solve: false, graph: true };
  try { Object.assign(modes, JSON.parse(localStorage.getItem(MODES_KEY) || '{}')); } catch {}
  for (const b of document.querySelectorAll('.ask-mode')) {
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
    for (const m of document.querySelectorAll('.ask-mode')) m.setAttribute('aria-pressed', String(!!modes[m.dataset.mode]));
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
  function reply(html, { busy: thinking = false, acts = null } = {}) {
    thread.hidden = false;
    let r = current;
    if (!r) { r = document.createElement('div'); r.className = 'ask-msg ask-reply'; thread.append(r); }
    if (thinking) current = r; else current = null;
    r.dataset.busy = String(thinking);
    r.innerHTML = `<span class="ai-orb sm" aria-hidden="true">${SPARK}</span><div class="ask-bubble">${html}${acts || ''}</div>`;
    thread.scrollTop = thread.scrollHeight;
    return r;
  }
  function echo(words, a) {
    thread.hidden = false;
    // Only the newest answer's buttons act: an older one would run whatever
    // question is set up now, not the one it was written for.
    for (const old of thread.querySelectorAll('.ask-acts')) old.remove();
    current = null;
    const q = document.createElement('div');
    q.className = 'ask-msg ask-mine';
    // A photo stays in the thread as a picture, so the chat reads back.
    const what = !a ? ''
      : a.kind === 'image' ? `<img class="ask-shot" src="${URL.createObjectURL(a.file)}" alt="The photo sent">`
      : `<span class="ask-chip">PDF · ${esc(a.file.name || '')}</span>`;
    q.innerHTML = `<div class="ask-bubble">${what}${words ? `<p>${esc(words)}</p>` : ''}</div>`;
    thread.append(q);
    thread.scrollTop = thread.scrollHeight;
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
    echo(words, a);
    text.value = ''; detach();
    busy = new AbortController(); sync();
    const searching = modes.search;
    const dots = `<p class="ask-dots" aria-label="Suvat is ${searching ? 'searching' : 'reading'}"><span></span><span></span><span></span></p>`;
    reply(dots, { busy: true });
    // Google's free models are sometimes slow to answer. Say so, rather than
    // leave the dots looking stuck.
    const slow = setTimeout(() => {
      if (busy) reply(`${dots}<p class="ask-wait">Still ${searching ? 'searching' : 'reading'} — Google is busy, so this one is taking longer.</p>`, { busy: true });
    }, 6_000);

    let res;
    try {
      const mode = searching ? 'search' : undefined;
      if (a?.kind === 'image') {
        const prepared = await prepareImage(a.file);
        res = await readQuestion(READER, prepared, { hint: words, history, mode, signal: busy.signal });
      } else if (a?.kind === 'pdf') {
        const base64 = await fileBase64(a.file);
        res = await readQuestion(READER, { base64, mimeType: 'application/pdf' }, { hint: words, history, mode, signal: busy.signal });
      } else {
        res = await readText(READER, words, { history: [...history], mode, signal: busy.signal });
      }
    } catch {
      res = { ok: false, message: 'That file could not be opened. Try a JPEG, PNG or PDF.' };
    }
    clearTimeout(slow);
    const stopped = busy?.signal.aborted;
    busy = null; sync();
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
    const r = apply(res.extraction, { graph: modes.graph, solve: modes.solve });
    if (!r.ok) { reply(`<p${r.chat ? '' : ' class="ro-bad"'}>${esc(r.error)}</p>`); return; }

    // Typeset maths arrives as markup, so it goes in with innerHTML (rule 1).
    // With Graph off it is a conversation, so there is nothing to open.
    const acts = modes.graph
      ? `<div class="ask-acts">
        <button type="button" class="fire sm ask-run"${r.runnable ? '' : ' disabled'}>Show me the flight</button>
        <button type="button" class="ghost sm ask-edit">${r.runnable ? 'Check the values' : 'Add the missing values'}</button>
      </div>`
      : '';
    const node = reply(r.html, { acts });
    r.draw?.(node);
    node.querySelector('.ask-run')?.addEventListener('click', run);
    node.querySelector('.ask-edit')?.addEventListener('click', edit);
    (r.runnable ? node.querySelector('.ask-run') : node.querySelector('.ask-edit'))?.focus();
  }

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

  return { focus: () => { text.focus(); text.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
}

function fileBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1]);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}


/** The sparkle: one four-pointed star and a small one beside it. */
export const SPARK = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
  <path d="M10 2.5c.55 4.6 2.9 6.95 7.5 7.5-4.6.55-6.95 2.9-7.5 7.5-.55-4.6-2.9-6.95-7.5-7.5 4.6-.55 6.95-2.9 7.5-7.5Z" fill="currentColor"/>
  <path d="M18.5 13.5c.25 2.05 1.25 3.05 3.3 3.3-2.05.25-3.05 1.25-3.3 3.3-.25-2.05-1.25-3.05-3.3-3.3 2.05-.25 3.05-1.25 3.3-3.3Z" fill="currentColor" opacity=".85"/>
</svg>`;
