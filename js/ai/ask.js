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
import { esc } from './readout.js';

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

  /* ── the box ────────────────────────────────────────────────────────── */
  function sync() {
    send.disabled = !!busy || (!text.value.trim() && !att);
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
    $('ask-pic-in').value = ''; $('ask-doc-in').value = '';
    sync();
  }

  /* ── the conversation: the last question, and Suvat's answer to it ──── */
  function reply(html, { busy: thinking = false, acts = null } = {}) {
    thread.hidden = false;
    let r = thread.querySelector('.ask-reply');
    if (!r) { r = document.createElement('div'); r.className = 'ask-msg ask-reply'; thread.append(r); }
    r.dataset.busy = String(thinking);
    r.innerHTML = `<span class="ai-orb sm" aria-hidden="true">${SPARK}</span><div class="ask-bubble">${html}${acts || ''}</div>`;
    return r;
  }
  function echo(words, a) {
    thread.innerHTML = '';
    thread.hidden = false;
    const q = document.createElement('div');
    q.className = 'ask-msg ask-mine';
    const what = a ? `<span class="ask-chip">${a.kind === 'pdf' ? 'PDF' : 'Photo'} · ${esc(a.file.name || '')}</span>` : '';
    q.innerHTML = `<div class="ask-bubble">${what}${words ? `<p>${esc(words)}</p>` : ''}</div>`;
    thread.append(q);
  }

  async function submit(e) {
    e?.preventDefault();
    if (send.disabled) return;
    stopMic();
    const words = text.value.trim(), a = att;
    echo(words, a);
    text.value = ''; detach();
    busy = new AbortController(); sync();
    const dots = '<p class="ask-dots" aria-label="Suvat is reading"><span></span><span></span><span></span></p>';
    reply(dots, { busy: true });
    // Google's free models are sometimes slow to answer. Say so, rather than
    // leave the dots looking stuck.
    const slow = setTimeout(() => {
      if (busy) reply(`${dots}<p class="ask-wait">Still reading — Google is busy, so this one is taking longer.</p>`, { busy: true });
    }, 6_000);

    let res;
    try {
      if (a?.kind === 'image') {
        const prepared = await prepareImage(a.file);
        res = await readQuestion(READER, prepared, { hint: words, signal: busy.signal });
      } else if (a?.kind === 'pdf') {
        const base64 = await fileBase64(a.file);
        res = await readQuestion(READER, { base64, mimeType: 'application/pdf' }, { hint: words, signal: busy.signal });
      } else {
        res = await readText(READER, words, { signal: busy.signal });
      }
    } catch {
      res = { ok: false, message: 'That file could not be opened. Try a JPEG, PNG or PDF.' };
    }
    clearTimeout(slow);
    busy = null; sync();

    if (!res?.ok) { reply(`<p class="ro-bad">${esc(res?.message || 'Could not read that.')}</p>`); return; }
    const r = apply(res.extraction);
    if (!r.ok) { reply(`<p${r.chat ? '' : ' class="ro-bad"'}>${esc(r.error)}</p>`); return; }

    // Typeset maths arrives as markup, so it goes in with innerHTML (rule 1).
    const node = reply(r.html, { acts: `<div class="ask-acts">
        <button type="button" class="fire sm ask-run"${r.runnable ? '' : ' disabled'}>Show me the flight</button>
        <button type="button" class="ghost sm ask-edit">${r.runnable ? 'Check the values' : 'Add the missing values'}</button>
      </div>` });
    node.querySelector('.ask-run').addEventListener('click', run);
    node.querySelector('.ask-edit').addEventListener('click', edit);
    (r.runnable ? node.querySelector('.ask-run') : node.querySelector('.ask-edit')).focus();
  }

  /* ── voice ──────────────────────────────────────────────────────────── */
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $('ask-mic');
  let rec = null, before = '';
  if (!Rec) mic.hidden = true;
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
      mic.setAttribute('aria-pressed', 'false');
      mic.setAttribute('aria-label', 'Speak the question');
      form.dataset.listening = 'false';
      text.placeholder = PLACEHOLDER;
      text.focus();
    };
    rec.start();
    mic.setAttribute('aria-pressed', 'true');
    mic.setAttribute('aria-label', 'Stop listening');
    form.dataset.listening = 'true';
    text.placeholder = 'Listening… say what is thrown, from where, and the numbers';
  }
  mic.addEventListener('click', () => (rec ? stopMic() : startMic()));

  /* ── wiring ─────────────────────────────────────────────────────────── */
  const PLACEHOLDER = text.placeholder;
  form.addEventListener('submit', submit);
  text.addEventListener('input', sync);
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  });
  $('ask-pic').addEventListener('click', () => $('ask-pic-in').click());
  $('ask-doc').addEventListener('click', () => $('ask-doc-in').click());
  $('ask-pic-in').addEventListener('change', (e) => attach(e.target.files?.[0]));
  $('ask-doc-in').addEventListener('change', (e) => attach(e.target.files?.[0]));
  $('ask-att-x').addEventListener('click', detach);
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
