// ai/gchoice.js — the g a student chooses, for questions that give none.
//
// The user, 2 Nov: "the AI should ask for gravity right there when it says
// Show me the flight, in the chat … some questions have nothing to do with
// gravity". So the reply asks — 9.81, 9.8, 10, or a box — and only when the
// motion uses g and the question gives none. A paper that states g is read
// with its own; one that does not takes the student's choice, in place of
// Earth's 9.81 and of the Edexcel rule (worker/src/place.js). The last choice
// is kept in this browser (localStorage) and is the one pressed next time.
// Nothing here calculates (rule 4).

import { M } from '../notation.js';

const KEY = 'suvat-g-v1';
/** The three every paper uses, in the order the chooser offers them. */
export const G_CHIPS = [9.81, 9.8, 10];

/** A g typed in the box: a positive number, as a paper would write it — else null. */
export function parseG(s) {
  const t = String(s ?? '').trim().replace(',', '.').replace(/\s*m\s*s(\^?-2|⁻²)\s*$/i, '');
  if (!/^\d*\.?\d+$/.test(t)) return null;
  const v = Number(t);
  return isFinite(v) && v > 0 && v < 1000 ? v : null;
}

/** The viewer's choice, or null when they have never chosen. */
export function loadG(store = globalThis.localStorage) {
  try { return parseG(store?.getItem(KEY)); } catch { return null; }
}
export function saveG(v, store = globalThis.localStorage) {
  try { store?.setItem(KEY, String(v)); } catch { /* a private window: the choice lasts this visit */ }
}

/**
 * A reading with the chosen g wherever the question states none: the twelve's
 * `g`, a library scenario's `boxes.g`, a composed scene's `recipe.numbers.g`.
 * A g the question states wins; the Edexcel rule's 9.8 does not. Marked
 * `gFrom: 'choice'` so the reply can say so.
 */
export function withChosenG(x, g) {
  if (g == null || !x || typeof x !== 'object' || x.understood === false) return x;
  const stated = (v) => typeof v === 'number' && v > 0 && x.gFrom !== 'Edexcel';
  if (x.scenario === 'library') {
    const b = x.boxes && typeof x.boxes === 'object' ? x.boxes : {};
    return stated(b.g) ? x : { ...x, boxes: { ...b, g }, gFrom: 'choice' };
  }
  if (x.scenario === 'compose') {
    const n = x.recipe?.numbers || {};
    return !x.recipe || stated(n.g) ? x : { ...x, recipe: { ...x.recipe, numbers: { ...n, g } }, gFrom: 'choice' };
  }
  return stated(x.g) ? x : { ...x, g, gFrom: 'choice' };
}

/** Whether the question itself states g: a g the reader read, never one a rule or a choice put there. */
export function gStated(x) {
  if (!x || typeof x !== 'object' || x.gFrom) return false;
  const v = x.scenario === 'library' ? x.boxes?.g : x.scenario === 'compose' ? x.recipe?.numbers?.g : x.g;
  return typeof v === 'number' && v > 0;
}

/**
 * The question in the reply, beside "Show me the flight": which g? Three chips
 * and a box. `ask` is { g, from } — the g the reply was worked with, and where it
 * came from ('choice', 'Edexcel', or '' for Earth's, assumed).
 */
export function gAskHTML(ask) {
  if (!ask) return '';
  const mine = ask.from === 'choice';
  const note = mine ? 'your choice' : ask.from === 'Edexcel' ? 'assumed · Edexcel’s 9.8' : 'assumed · Earth’s 9.81';
  const chips = G_CHIPS.map((v) => `<button type="button" class="chip" data-g="${v}" aria-pressed="${v === ask.g}">${v}</button>`).join('');
  const other = G_CHIPS.includes(ask.g) ? '' : String(ask.g);
  return `<div class="ask-gq" role="group" aria-label="Which g? The question gives none">
    <span class="ask-gq-h">Which ${M`g`}?</span>${chips}
    <input class="ask-gq-in" type="text" inputmode="decimal" autocomplete="off" placeholder="other" value="${other}" aria-label="Another value of g, in metres per second squared">
    <span class="ask-gq-note">${note}</span><span class="ask-gq-err" role="alert" hidden>g is a positive number, such as 9.78.</span></div>`;
}
