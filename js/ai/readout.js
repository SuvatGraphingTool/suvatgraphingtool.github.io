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

/* ── Solve: the engine's own working, as a numbered solution ─────────────
   Every title, formula, substitution and result here comes from js/core/ or
   js/working.js — the same steps the working panel shows — so the chat
   claims nothing the engine did not compute (rule 4), and every piece of it
   is already typeset (rule 1). This only lays them out. */
export function solutionHTML(steps, { moment } = {}) {
  const shown = (steps || []).filter((st) => !st.skip && st.rows?.length);
  if (!shown.length) return '';
  const items = shown.map((st) => `<li><div class="ro-step-h">${st.title}</div>${
    st.rows.map((r) => `<div class="ro-step-row"><div>${r.f}</div><div>${r.s}</div>${
      r.r ? `<div class="ro-step-r">${r.r}</div>` : ''}</div>`).join('')}${
    st.note ? `<div class="ro-step-n">${st.note}</div>` : ''}</li>`).join('');
  return `<p class="ro-answer-h">Worked solution</p><ol class="ro-steps">${items}</ol>${
    moment?.text ? `<p class="ro-sum">${moment.text}</p>` : ''}`;
}

/* ── Graph: the flight, drawn in the reply ───────────────────────────────
   The path the engine computed, with a dot at each of ten equal steps of
   time, over a ground line — and three empty frames the page fills with the
   same graphs the stage draws (js/render/graphs.js). No text in the sketch,
   so nothing here can fall under the 13px floor. */
export function flightSVG(f) {
  const pts = f.path(120), marks = f.ticks(10);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  let lo = Math.min(0, ...xs), hi = Math.max(...xs);
  const top = Math.max(1, ...ys), bottom = Math.min(0, ...ys);
  const pad = Math.max((hi - lo) * 0.06, (top - bottom) * 0.3, 1);
  lo -= pad; hi += pad;
  const W = 600, H = 170, m = 16;
  const sx = Math.min((W - 2 * m) / (hi - lo), (H - 2 * m) / ((top - bottom) || 1));
  const ox = (W - (hi - lo) * sx) / 2;
  const X = (x) => (ox + (x - lo) * sx).toFixed(1);
  const Y = (y) => (H - m - (y - bottom) * sx).toFixed(1);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x)} ${Y(p.y)}`).join(' ');
  const dots = marks.map((k) => `<circle cx="${X(k.x)}" cy="${Y(k.y)}" r="4" fill="var(--vel)" stroke="var(--surface)" stroke-width="1.6"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}" stroke="var(--border)" stroke-width="1.5"/>
    <path d="${d}" fill="none" stroke="var(--vel)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}</svg>`;
}
export function vizHTML(f) {
  return `<div class="ro-viz">
    <figure class="ro-path" aria-label="The flight, with a dot at each equal step of time">${flightSVG(f)}</figure>
    <figure><canvas data-graph="g-s" aria-label="Displacement against time"></canvas></figure>
    <figure><canvas data-graph="g-v" aria-label="Velocity against time"></canvas></figure>
    <figure><canvas data-graph="g-a" aria-label="Acceleration against time"></canvas></figure>
  </div>`;
}

/* ── Search: the model's own prose, made safe and set properly ───────────
   The one reply the model writes itself. Escaped first — it is somebody
   else's text going into innerHTML — then the habits rule 1 forbids are
   turned into what this site prints (v^2 → v², sqrt → √, * → ×, a hyphen
   before a number → a minus sign), and the lightest markdown is honoured:
   paragraphs, bullets and bold. */
export function proseHTML(text) {
  const tidy = (s) => esc(s)
    .replace(/\^\(?-1\)?/g, '⁻¹').replace(/\^\(?-2\)?/g, '⁻²').replace(/\^2\b/g, '²').replace(/\^3\b/g, '³')
    .replace(/\bsqrt\s*\(/g, '√(').replace(/ \* /g, ' × ').replace(/ \/ /g, ' ÷ ').replace(/&lt;=/g, '≤').replace(/&gt;=/g, '≥')
    .replace(/(^|[\s(=])-(\d)/g, '$1−$2')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const blocks = String(text || '').trim().split(/\n\s*\n/);
  return blocks.map((b) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => /^[-*•]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${tidy(l.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${tidy(lines.join(' '))}</p>`;
  }).join('');
}
export function sourcesHTML(sources) {
  const ok = (sources || []).filter((s) => /^https?:\/\//.test(s.uri));
  if (!ok.length) return '';
  return `<ul class="ro-src">${ok.map((s) => `<li><a href="${esc(s.uri)}" target="_blank" rel="noopener noreferrer">${esc(s.title || s.uri)}</a></li>`).join('')}</ul>`;
}
