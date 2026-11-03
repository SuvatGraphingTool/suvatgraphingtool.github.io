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
import { SPARK } from '../ai/ask.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
/** A part's question: prose, with any maths in it written between $ signs and set by the notation module.
    A part read from a student's question (`prose`) is their words, escaped and tidied. */
export const askHTML = (p) => p.prose ? tidyProse(p.ask) : String(p.ask ?? '').split('$').map((x, i) => (i % 2 ? mathHTML(x) : esc(x))).join('');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** One answer, typeset: `t = 3.50 s`, two of them joined by "and". */
export function answerHTML(run) {
  const p = run.part, a = run.answer;
  if (p.expr) return a.ok ? a.html : '<span class="pans-none">The engine finds no answer to this part with these numbers.</span>';
  if (!p.find) return `<span class="pans-say">${esc(p.say || 'See the stage and the graphs.')}</span>`;
  if (!a.ok) return '<span class="pans-none">The engine finds no answer to this part with these numbers.</span>';
  const one = (v) => {
    if (typeof v === 'boolean') return esc(v ? p.words?.yes ?? 'Yes' : p.words?.no ?? 'No');
    // a time on the 24-hour clock, as the engine gave it and the papers print it: 1512
    if (p.clock) return M`"${p.clock === true ? 'at' : p.clock}" ${String(v).padStart(4, '0')}`;
    // in letters, a coefficient of one is not written: U/g, not 1U/g
    const c = num(v, p.dp ?? 2, { trim: !!p.trim });
    const n = (c === '1' && /^[A-Za-z]/.test(p.suffix || '') ? '' : c) + (p.suffix || '');
    if (!p.sym) return p.unit ? M`${n} [${p.unit}]` : M`${n}`;
    // an answer that is a range is said as one: θ > 76.0°
    const rel = ['<', '>', '<=', '>='].includes(p.rel) ? p.rel : '=';
    return p.unit ? M`${p.sym} ${rel} ${n} [${p.unit}]` : M`${p.sym} ${rel} ${n}`;
  };
  if (p.ratio) {
    // a ratio, in its lowest terms as the engine gave it: AB : BC = 64 : 27
    const [x, y] = a.values, o = { trim: true };
    // whole numbers, as the engine found them, print in full
    const n = (z) => (Number.isInteger(z) ? String(z) : num(z, p.dp ?? 3, o));
    return `${p.ratio.map((s) => M`${s}`).join(' : ')} = ${M`${n(x)}`} : ${M`${n(y)}`}`;
  }
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
 * working for the motion on the stage. `more`, when some parts have set-ups
 * of their own: every label in order, `elsewhere` {label: id} for the parts
 * in another set-up, and `next`, the next set-up to open.
 */
export function stripHTML(parts, runs, k, steps, more = null) {
  const n = runs.filter(Boolean).length;
  if (!n) return '';                  // no parts, no strip: never "This question has no parts"
  const wide = (p) => (tag(p).length > 4 ? ' wide' : '');
  const away = more ? Object.keys(more.elsewhere) : [];
  // a part in another set-up: its chip opens that set-up
  const other = (l) => `<button class="pchip other${wide({ label: l })}" type="button" data-scene="${esc(more.elsewhere[l])}" aria-label="Part ${esc(l)}: open its own set-up">${tag({ label: l })}</button>`;
  const own = parts.map((p, i) => p.out
    ? `<button class="pchip${wide(p)}" type="button" disabled title="Not in this app: ${esc(p.out)}" aria-label="Part ${esc(p.label)}: not in this app — ${esc(p.out)}">${tag(p)}</button>`
    : `<button class="pchip${wide(p)}" type="button" data-part="${i}" aria-pressed="${i === k}"${i < k ? ' data-done="true"' : ''}${runs[i]?.part.find || runs[i]?.part.kind === 'graph' ? '' : ' data-none="true"'} aria-label="Part ${esc(p.label)}">${tag(p)}</button>`);
  const chips = more
    ? more.order.map((l) => (more.elsewhere[l] ? other(l) : own[parts.findIndex((p) => String(p.label) === l)] ?? '')).join('')
    : own.join('');
  const next = runs.findIndex((r, i) => r && i > k);
  const go = next >= 0
    ? `<button class="fire sm pnext" type="button" data-part="${next}" data-play="true">Show me part ${tag(parts[next])}</button>`
    : more?.next ? `<button class="fire sm pnext" type="button" data-scene="${esc(more.next.id)}">Next: part ${tag({ label: more.next.label })}</button>`
    : `<button class="tbtn sm pnext" type="button" data-part="-1">Whole motion</button>`;
  let body;
  if (k < 0) {
    // parts Ask Suvat read from the student's own question carry its mark
    const read = parts.some((p) => p.prose) ? `<p class="pfrom"><span class="ai-orb sm" aria-hidden="true">${SPARK}</span>Read by Ask Suvat from your question</p>` : '';
    const all = n + away.length;
    const here = away.length ? (n === 1 ? `Part ${tag(parts.find((p, i) => runs[i]))} is on the stage now.` : `${WORDS[n] ?? n} of them are on the stage now.`.replace(/^./, (c) => c.toUpperCase())) : '';
    const there = away.length ? ` ${away.map((l) => tag({ label: l })).join(away.length === 2 ? ' and ' : ', ')} ${away.length === 1 ? 'has' : 'have'} a set-up of ${away.length === 1 ? 'its own: its chip opens it' : 'their own: each chip opens its own'}.` : '';
    body = `${read}<p class="pask"><b>This question has ${WORDS[all] ?? all} part${all === 1 ? '' : 's'}.</b>
      ${away.length ? here + there : n === 1 ? 'It stops the motion at its moment, with its working.' : 'Each one stops the motion at its own moment, with its working.'}</p>
      <ol class="plist">${parts.map((p) => `<li><b>${tag(p)}</b>${p.out ? `<i>not in this app — ${esc(p.out)}</i>` : askHTML(p)}</li>`).join('')}</ol>`;
  } else {
    const run = runs[k], p = run.part, step = steps?.[stepOf(p, steps || [])];
    body = `<p class="pask"><b class="plab">${tag(p)}</b> ${askHTML(p)}</p>
      <p class="pans">${answerHTML(run)}</p>
      ${p.note ? `<p class="plean">${askHTML({ ask: p.note })}</p>` : ''}
      ${leansHTML(run, runs)}
      ${p.given && Object.keys(p.given).length ? '<p class="plean"><span class="plean-i" aria-hidden="true">+</span>This part adds to what is given, and the motion is solved again.</p>' : ''}
      ${step ? `<details class="pwork"><summary>Working: ${step.title}</summary><div class="pwork-body">${rowHTML(step)}</div></details>` : ''}`;
  }
  const outNote = '';
  // .pin is the grid; the strip around it is the container its layout asks the width of
  return `<div class="pin"><div class="pchips" role="group" aria-label="Parts of the question">${chips}</div>
    <div class="pnow" aria-live="polite">${body}${outNote}</div>
    <div class="pgo">${go}</div></div>`;
}

/** The ticks on the clock, one for each moment a part on this motion stops
    at. Parts whose moments are close share a tick, so no two pills overlap. */
export function ticksHTML(runs, solved, k) {
  const tMax = solved?.f?.tMax;
  if (!(tMax > 0)) return '';
  const f = (t) => Math.min(Math.max(t / tMax, 0), 1);
  const on = runs.filter((r) => r && r.solved === solved && r.moment && (r.part.find || r.part.kind === 'graph'))
    .map((r) => ({ r, f: f(r.moment.t) })).sort((x, y) => x.f - y.f);
  const groups = [];
  for (const x of on) {
    const g = groups[groups.length - 1];
    if (g && x.f - g.f0 < 0.06) g.items.push(x); else groups.push({ f0: x.f, items: [x] });
  }
  return groups.map((g) => {
    const rs = g.items.map((x) => x.r), at = g.items.reduce((a, x) => a + x.f, 0) / g.items.length;
    const lead = rs.find((r) => r.k === k) || rs[0];
    const bands = rs.filter((r) => r.moment.span).map((r) => `<span class="pband" style="--a:${f(r.moment.span[0])};--b:${f(r.moment.span[1])}"></span>`).join('');
    return `${bands}<button class="ptick" type="button" data-part="${lead.k}" aria-pressed="${rs.some((r) => r.k === k)}" style="--f:${at}" aria-label="Go to part${rs.length > 1 ? 's' : ''} ${rs.map((r) => esc(r.part.label)).join(' and ')}">${rs.map((r) => tag(r.part)).join('')}</button>`;
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
