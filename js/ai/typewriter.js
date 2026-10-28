// typewriter.js — a reply written out a letter at a time.
//
// The reader answers in one piece, not as a stream, so the stream is made
// here: the reply is put in whole — maths typeset, graphs drawn, buttons
// wired — then hidden and given back from its first letter. The ideas are
// the ones the chat assistants have settled on:
//
//   · One steady clock, not a timer per letter. Each frame shows as many
//     letters as the time since the last frame is worth, so the pace is even
//     whatever the frame rate — the fixed beat of the AI SDK's smoothStream.
//   · A pace set by the length. A short reply types at a reading speed; a
//     long one speeds up so it still lands in a couple of seconds, as
//     assistant-ui's smooth text does, rather than making the student wait.
//   · Each new run of letters fades in instead of snapping on, as Gemini's
//     words do, and a soft dot sits at the end while it writes, as ChatGPT's.
//   · A typeset equation, a graph or a button arrives whole. Half a fraction
//     is not a fraction.
//
// Reduced motion shows the reply at once. Screen readers are told the reply
// is busy until it is finished, so they read it once, whole.

const RATE = 110;                 // letters a second, for a short reply
const MOST = 2.4;                 // seconds a long reply may take, at most
const WHOLE = 'span.m, .ro-viz, figure, canvas, svg, img, button, .ask-acts, .ro-src, table, br, hr';

/**
 * @param root      the element whose contents are written out
 * @param o.tick()  called each frame, after the reply has grown
 * @returns {{ done: Promise<void>, finish(): void }}
 */
export function typeOut(root, { tick } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { done: Promise.resolve(), finish() {} };
  }
  // Every letter, equation and graph, in reading order. A run of text keeps
  // its own (now empty) node as the place its letters are put back before.
  const units = [], waiting = [];
  let total = 0;
  (function walk(el) {
    for (const n of [...el.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (!n.nodeValue.trim()) continue;
        units.push({ node: n, text: n.nodeValue, at: 0 });
        total += n.nodeValue.length;
        n.nodeValue = '';
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        if (n.matches(WHOLE)) { units.push({ el: n }); n.classList.add('tw-wait'); total += 4; }
        else { waiting.push(n); n.classList.add('tw-wait'); walk(n); }
      }
    }
  })(root);

  const rate = Math.max(RATE, total / MOST);
  const caret = document.createElement('span');
  caret.className = 'tw-caret';
  caret.setAttribute('aria-hidden', 'true');
  root.setAttribute('aria-busy', 'true');

  let i = 0, credit = 0, last = performance.now(), raf = 0, resolve;
  const done = new Promise((r) => { resolve = r; });

  // An element shows once the first thing inside it does — so an empty
  // paragraph or a numbered step does not stand there waiting for its words.
  function open(n) {
    for (let p = n.parentNode; p && p !== root; p = p.parentNode) p.classList?.remove('tw-wait');
  }
  function frame(now) {
    credit += ((now - last) / 1000) * rate;
    last = now;
    while (credit >= 1 && i < units.length) {
      const u = units[i];
      if (u.el) {
        open(u.el);
        u.el.classList.remove('tw-wait');
        u.el.classList.add('tw-fade');
        u.el.after(caret);
        credit -= 4; i++;
        continue;
      }
      const k = Math.min(Math.floor(credit), u.text.length - u.at);
      open(u.node);
      const run = document.createElement('span');
      run.className = 'tw-in';
      run.textContent = u.text.slice(u.at, u.at + k);
      u.node.before(run);
      u.node.before(caret);
      u.at += k; credit -= k;
      if (u.at >= u.text.length) i++;
    }
    tick?.();
    if (i < units.length) raf = requestAnimationFrame(frame);
    else end();
  }
  function end() {
    cancelAnimationFrame(raf);
    caret.remove();
    for (const n of waiting) n.classList.remove('tw-wait');
    for (const u of units) {
      if (u.el) { u.el.classList.remove('tw-wait'); continue; }
      // Put each run of text back as the one node it was.
      while (u.node.previousSibling?.classList?.contains('tw-in')) u.node.previousSibling.remove();
      u.node.nodeValue = u.text;
    }
    root.removeAttribute('aria-busy');
    tick?.();
    resolve();
  }
  raf = requestAnimationFrame(frame);
  return {
    done,
    /** Everything at once — when the next message is sent mid-sentence. */
    finish() { if (i < units.length) { i = units.length; end(); } },
  };
}
