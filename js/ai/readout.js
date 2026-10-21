// readout.js — "here is what I read", as the student sees it.
//
// The card between the AI reader and the flight. It shows the scenario the
// reader picked and every value it is about to put in a box, each tagged with
// where it came from, and then what the ENGINE made of them — the engine's
// own words, from js/core/solve.js. Nothing on this card is calculated here.
//
// Every value is set through js/notation.js (CLAUDE.md rule 1), and every
// string the model wrote — the summary, what the question asks for — is
// escaped, because it is somebody else's text going into innerHTML.

import { M, num } from '../notation.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const HOW = { given: 'in the question', worked: 'worked out', assumed: 'assumed' };

/** One value, as maths. */
function valueHTML(it) {
  const x = it.value;
  switch (it.k) {
    case 's': return M`s = ${num(x, 2, { trim: true })} [m]`;
    case 'u': return M`u = ${num(x, 2, { trim: true })} [m s^-1]`;
    case 'v': return M`v = ${num(x, 2, { trim: true })} [m s^-1]`;
    case 't': return M`t = ${num(x, 2, { trim: true })} [s]`;
    case 'g': return M`a = ${num(x, 2, { trim: true })} [m s^-2]`;
    case 'a': return M`a = ${num(x, 2, { trim: true })} [m s^-2]`;
    case 'mark': return it.mid ? 'times it at the mid-point' : `times it at ${M`${num(x, 2, { trim: true })} [m]`} from the start`;
    case 'h': return M`h = ${num(x, 2, { trim: true })} [m]`;
    case 'theta': return M`theta = ${num(x, 1, { trim: true })}°`;
    case 'line': return `a line ${M`${num(x, 2, { trim: true })} [m]`} up`;
    case 'tOpen': return `free fall for ${M`${num(x, 2, { trim: true })} [s]`}`;
    case 'aChute': return `slows at ${M`${num(x, 2, { trim: true })} [m s^-2]`} once open`;
    case 'vTerm': return `then falls steadily at ${M`${num(x, 2, { trim: true })} [m s^-1]`}`;
    default: return '';
  }
}

/** Where a worked value came from, in the question's own terms. */
function fromHTML(it) {
  if (it.ratio) {
    const n = num(it.ratio.num, 2, { trim: true }), d = num(it.ratio.den, 2, { trim: true });
    if (it.ratio.fn === 'sin') return M`sin theta = ${n}/${d}`;
    if (it.ratio.fn === 'cos') return M`cos theta = ${n}/${d}`;
    return M`tan theta = ${n}/${d}`;
  }
  if (it.rise != null) return `from a greatest height of ${M`${num(it.rise, 2, { trim: true })} [m]`} above the launch`;
  if (it.vertical) return 'thrown straight up';
  if (it.k === 'line') return 'how long it spends above it';
  if (it.how === 'assumed' && it.k === 'g') return 'the question does not say';
  if (it.how === 'assumed' && it.k === 'h') return 'it starts on the ground';
  return '';
}

/**
 * @param reading  the result of toApp() in js/core/question.js
 * @param o.name   the scenario's name, from js/scenarios.js
 * @param o.solved the engine's answer for those values, or null
 * @param o.above  the engine's timeAbove() for a line, with `line`, or null
 */
export function readoutHTML(reading, { name, solved, above } = {}) {
  const rows = reading.items.map((it) => {
    const from = fromHTML(it);
    return `<li class="ro-row" data-how="${it.how}">
      <span class="ro-val">${valueHTML(it)}</span>
      <span class="ro-how">${HOW[it.how]}${from ? ` · ${from}` : ''}</span></li>`;
  }).join('');

  const asks = reading.asks.length
    ? `<p class="ro-asks"><b>It asks for</b> ${reading.asks.map(esc).join(', ')}</p>` : '';
  const unsure = reading.confidence === 'low'
    ? '<p class="ro-warn">Parts of this were hard to read. Check every number before you trust it.</p>' : '';
  const notes = (reading.notes || []).map((n) => `<p class="ro-warn">${esc(n)}</p>`).join('');

  let engine = '';
  if (solved?.ok) {
    const rest = Array.isArray(solved.derived) && solved.derived.length
      ? solved.derived.join('  ·  ') : 'nothing else was needed.';
    let line = '';
    if (above) {
      const L = M`${num(above.line, 2, { trim: true })} [m]`;
      line = above.above > 1e-9 && above.crosses === 2
        ? `<br><b>Above ${L}</b> from ${M`t = ${num(above.t1, 2, { trim: true })} [s]`} to ${
            M`t = ${num(above.t2, 2, { trim: true })} [s]`}, so for ${M`${num(above.above, 2, { trim: true })} [s]`}.`
        : above.above > 1e-9
          ? `<br><b>Above ${L}</b> for ${M`${num(above.above, 2, { trim: true })} [s]`}.`
          : `<br><b>It never gets ${L} up.</b>`;
    }
    engine = `<div class="ro-engine" data-ok="true"><b>The engine works out the rest:</b> ${rest}${line}</div>`;
  } else if (solved) {
    engine = `<div class="ro-engine" data-ok="false"><b>Not enough to run it yet.</b> ${solved.reason || ''}</div>`;
  }

  return `<p class="ro-eyebrow">Read as</p>
    <h3 class="ro-name">${esc(name)}</h3>
    ${reading.summary ? `<p class="ro-sum">${esc(reading.summary)}</p>` : ''}
    <ul class="ro-list">${rows}</ul>
    ${asks}${unsure}${notes}${engine}`;
}
