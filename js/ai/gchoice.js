// ai/gchoice.js — the g a student chooses, for questions that give none.
//
// The user, 2 Nov: "before they show the values, there should be a button to
// choose gravity … 9.81 and 9.8 and 10, and then just a text box". A paper
// that states g is read with its own; one that does not takes this choice —
// in place of Earth's 9.81 and of the Edexcel rule (worker/src/place.js). The
// choice is the viewer's own, kept in this browser only (localStorage), and
// the reply says where each g came from. Nothing here calculates (rule 4).

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

/**
 * The button in the Ask Suvat box and its popover: three chips and a box for
 * any other value. `onChange(g)` hears each new choice.
 */
export function initGChooser({ onChange } = {}) {
  const btn = document.getElementById('ask-g'), pop = document.getElementById('ask-gpop');
  if (!btn || !pop) return { get: () => loadG() };
  const input = document.getElementById('ask-g-in'), err = document.getElementById('ask-g-err');
  const chips = pop.querySelector('.ask-g-chips');
  let chosen = loadG();
  chips.innerHTML = G_CHIPS.map((v) => `<button type="button" class="chip" data-g="${v}">${v}</button>`).join('');
  function sync() {
    const v = chosen ?? 9.81;
    document.getElementById('ask-g-v').textContent = String(v);
    btn.setAttribute('aria-label', `g, when the question gives none: ${v} m s⁻²${chosen == null ? ', Earth’s, until you choose' : ''}`);
    btn.dataset.chosen = String(chosen != null);
    for (const c of chips.querySelectorAll('.chip')) c.setAttribute('aria-pressed', String(chosen != null && Number(c.dataset.g) === chosen));
    if (chosen != null && !G_CHIPS.includes(chosen)) input.value = String(chosen);
  }
  function choose(v) {
    chosen = v; saveG(v); err.hidden = true; sync(); onChange?.(v);
  }
  function open(on) {
    pop.hidden = !on; btn.setAttribute('aria-expanded', String(on));
    if (on) (chips.querySelector('[aria-pressed="true"]') || chips.querySelector('.chip'))?.focus();
  }
  btn.innerHTML = `<span class="m-lb">${M`g`} <b id="ask-g-v"></b></span>`;
  btn.addEventListener('click', () => open(pop.hidden));
  chips.addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (c) { input.value = ''; choose(Number(c.dataset.g)); open(false); btn.focus(); }
  });
  const typed = () => {
    if (!input.value.trim()) { err.hidden = true; return; }
    const v = parseG(input.value);
    if (v == null) { err.textContent = 'g is a positive number, such as 9.78.'; err.hidden = false; return; }
    choose(v);
  };
  input.addEventListener('change', typed);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); typed(); if (err.hidden) { open(false); btn.focus(); } } });
  document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) open(false); });
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { open(false); btn.focus(); } });
  sync();
  return { get: () => chosen };
}
