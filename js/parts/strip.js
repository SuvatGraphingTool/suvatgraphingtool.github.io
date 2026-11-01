// parts/strip.js — a question in parts, on the stage: the (a) (b) (c) strip
// over the transport, the ticks on the clock, the rings on the graphs and the
// part's card in the working panel.
//
// Every number here is one the engine answered (js/parts/parts.js finds it);
// every symbol and number goes through js/notation.js, so each sink is
// innerHTML (rule 1). Nothing is calculated (rule 4).

import { M, num, mathHTML } from '../notation.js';
import { tag, leansOn, stepOf } from './parts.js';
import { tidyProse } from '../ai/readout.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
/** A part's question: prose, with any maths in it written between $ signs and set by the notation module.
    A part read from a student's question (`prose`) is their words, escaped and tidied. */
export const askHTML = (p) => p.prose ? tidyProse(p.ask) : String(p.ask ?? '').split('$').map((x, i) => (i % 2 ? mathHTML(x) : esc(x))).join('');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** One answer, typeset: `t = 3.50 s`, two of them joined by "and". */
export function answerHTML(run) {
  const p = run.part, a = run.answer;
  if (!p.find) return `<span class="pans-say">${esc(p.say || 'See the stage and the graphs.')}</span>`;
  if (!a.ok) return '<span class="pans-none">The engine finds no answer to this part with these numbers.</span>';
  const one = (v) => {
    if (typeof v === 'boolean') return esc(v ? p.words?.yes ?? 'Yes' : p.words?.no ?? 'No');
    // in letters, a coefficient of one is not written: U/g, not 1U/g
    const c = num(v, p.dp ?? 2, { trim: !!p.trim });
    const n = (c === '1' && /^[A-Za-z]/.test(p.suffix || '') ? '' : c) + (p.suffix || '');
    if (!p.sym) return p.unit ? M`${n} [${p.unit}]` : M`${n}`;
    return p.unit ? M`${p.sym} = ${n} [${p.unit}]` : M`${p.sym} = ${n}`;
  };
  if (p.vec) {
    // a vector, in i and j: the sign between them is the j part's own
    const [x, y] = a.values, d = p.dp ?? 2, o = { trim: p.trim ?? true };
    const body = `${num(x, d, o)} vec i ${y < 0 ? '-' : '+'} ${num(Math.abs(y), d, o)} vec j`;
    const lhs = p.sym ? `${p.sym} = ` : '';
    return p.unit ? M`${lhs}(${body}) [${p.unit}]` : M`${lhs}${body}`;
  }
  return a.values.map(one).join(' <span class="pand">and</span> ');
}

/** "using t = 3.50 s from (a)" — what the part carries forward, said. */
function leansHTML(run, runs) {
  const from = leansOn(run.part);
  if (!from.length) return '';
  const said = from.map((l) => {
    const r = runs.find((x) => x?.part.label === l);
    return r?.answer.ok ? `${answerHTML(r)} from ${tag(r.part)}` : `the answer to (${esc(l)})`;
  });
  const carried = run.carried.filter((c) => c.here).length > 0;
  return `<p class="plean"><span class="plean-i" aria-hidden="true">↳</span>${carried ? 'Carries forward' : 'Uses'} ${said.join(', ')}</p>`;
}

/** The working step a part points at, every row of it: the formula, the real numbers in it, and what came out. */
function rowHTML(step) {
  return (step?.rows || []).map((r) => `<div class="prow"><div class="eq-f">${r.f}</div>${r.s ? `<div class="eq-s">${r.s}</div>` : ''}${r.r ? `<div class="eq-r">${r.r}</div>` : ''}</div>`).join('');
}

/**
 * The strip. `k` is the part on show, −1 for none yet; `steps` is the kit's
 * working for the motion on the stage.
 */
export function stripHTML(parts, runs, k, steps) {
  const n = runs.filter(Boolean).length;
  const chips = parts.map((p, i) => p.out
    ? `<button class="pchip" type="button" disabled title="${esc(p.out)}" aria-label="Part ${esc(p.label)}: not in this app — ${esc(p.out)}">${tag(p)}</button>`
    : `<button class="pchip" type="button" data-part="${i}" aria-pressed="${i === k}"${runs[i]?.answer.ok ? '' : ' data-none="true"'}>${tag(p)}</button>`).join('');
  const next = runs.findIndex((r, i) => r && i > k);
  const go = next >= 0
    ? `<button class="fire sm pnext" type="button" data-part="${next}" data-play="true">Show me part ${tag(parts[next])}</button>`
    : `<button class="tbtn sm pnext" type="button" data-part="-1">Whole motion</button>`;
  let body;
  if (k < 0) {
    body = `<p class="pask"><b>This question has ${WORDS[n] ?? n} part${n === 1 ? '' : 's'}.</b>
      Step through them: each one stops the motion at its own moment, with the working.</p>`;
  } else {
    const run = runs[k], p = run.part, step = steps?.[stepOf(p, steps || [])];
    body = `<p class="pask"><b class="plab">${tag(p)}</b> ${askHTML(p)}</p>
      <p class="pans">${answerHTML(run)}</p>
      ${p.note ? `<p class="plean">${askHTML({ ask: p.note })}</p>` : ''}
      ${leansHTML(run, runs)}
      ${p.given && Object.keys(p.given).length ? '<p class="plean"><span class="plean-i" aria-hidden="true">+</span>This part adds to what is given, and the motion is solved again.</p>' : ''}
      ${step ? `<details class="pwork"><summary>Working: ${step.title}</summary>${rowHTML(step)}</details>` : ''}`;
  }
  const outs = parts.filter((p) => p.out);
  const outNote = outs.length && k < 0
    ? `<p class="pout">${outs.map((p) => `${tag(p)} ${esc(p.out)}`).join(' · ')}</p>` : '';
  return `<div class="pchips" role="group" aria-label="Parts of the question">${chips}</div>
    <div class="pnow" aria-live="polite">${body}${outNote}</div>
    <div class="pgo">${go}</div>`;
}

/** The ticks on the clock, one for each moment a part on this motion stops at — parts that share a moment share a tick. */
export function ticksHTML(runs, solved, k) {
  const tMax = solved?.f?.tMax;
  if (!(tMax > 0)) return '';
  const f = (t) => Math.min(Math.max(t / tMax, 0), 1);
  const at = new Map();
  runs.forEach((r, i) => {
    if (!r || r.solved !== solved || !r.moment || (!r.part.find && r.part.kind !== 'graph')) return;
    const key = f(r.moment.t).toFixed(3);
    if (!at.has(key)) at.set(key, { f: f(r.moment.t), runs: [], i, span: r.moment.span });
    const g = at.get(key);
    g.runs.push(r);
    if (i === k) g.i = i;
  });
  return [...at.values()].map((g) => {
    const band = g.span ? `<span class="pband" style="--a:${f(g.span[0])};--b:${f(g.span[1])}"></span>` : '';
    const names = g.runs.map((r) => r.part.label);
    return `${band}<button class="ptick" type="button" data-part="${g.i}" aria-pressed="${g.runs.some((r) => r.k === k)}" style="--f:${g.f}" aria-label="Go to part${names.length > 1 ? 's' : ''} ${names.map(esc).join(' and ')}">${names.map(esc).join('·')}</button>`;
  }).join('');
}

/** Rings on the graphs at the part's moment — or at both ends of its span — on every line. */
export function markGraphs(specs, run, color) {
  if (!run?.moment) return;
  const ts = run.moment.span || [run.moment.t];
  for (const spec of specs) {
    const pts = spec.points = [...(spec.points || [])];
    for (const s of spec.series || []) {
      for (const t of ts) {
        const y = s.fn(t);
        if (isFinite(y)) pts.push({ t, y, color, label: s === spec.series[spec.series.length - 1] && t === ts[ts.length - 1] ? tag(run.part) : '', dy: -18, dx: 10, pri: 7 });
      }
    }
  }
}

/** The part's card at the head of the working panel. */
export function workingCardHTML(run) {
  return `<div class="pcardw"><p class="pcardw-h"><b>${tag(run.part)}</b> ${askHTML(run.part)}</p><p class="pans">${answerHTML(run)}</p></div>`;
}

/** Ask Suvat's reply to a question in parts: each part and the engine's answer to it. */
export function replyHTML(runs) {
  const rows = (runs || []).filter(Boolean).map((r) => `<li><b class="plab">${tag(r.part)}</b> <span class="preply-q">${askHTML(r.part)}</span> <span class="pans">${answerHTML(r)}</span></li>`);
  return rows.length ? `<ol class="preply" aria-label="The question, part by part">${rows.join('')}</ol>` : '';
}
