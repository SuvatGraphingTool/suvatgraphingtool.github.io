// standin.js — what the question says moves, on a stage that draws something else.
//
// The user, 8 Nov: "see if that EXACT scenario is there in the past paper library
// first, THEN make it all EXACTLY like the scenario the user said." A ski-board
// sliding down a mountain reads as Freewheeling, and the stage must draw the
// ski-board, not the paper's cyclist. The shared figures in js/render/figures.js and
// js/render/util.js ask here first, so most stages get it for nothing.
//
// ONLY WHAT MOVES. On each frame the first figure a stage draws on the stage canvas
// is the thing the question is about: a second actor, a bystander, a parked car
// keep their own art. A stage where that is not so says what it means in STAGES below,
// found by looking at every stage with a stand-in on it. Drawing only: the engine's
// numbers do not change (rule 4). This file holds the state and no art, so the figures
// can ask it without importing what draws: js/compose/standins.js makes the art.

import { lang, translateText } from '../i18n.js';

/**
 * Stages the first figure does not suit.
 *   only   the figures that can be what moves: the rest are people standing by
 *   skip   how many of them come first: a far lane, drawn before the near one
 *   every  every one of them is the same object: three models of one car
 *   none   what moves is not one of the shared figures at all
 */
const STAGES = {
  'from-the-bridge': { only: ['ball'] },        // the runner below is the second actor
  'higher-than-far': { only: ['ball'] },        // the person works the launcher
  'there-and-back': { only: ['car'] },          // its driver walks to the shop
  'two-trains': { only: ['train'], skip: 1 },   // A is on the near track; the runners wait on the platforms
  'three-models': { every: true },
  'with-air-resistance': { every: true },       // the same ball, with air and without
  'drop-or-ramp': { every: true },              // the same parcel, each way down
  'pulled-by-a-rope': { none: true },           // the sledge is its own art; the runner pulls it
  'one-bicycle': { none: true },                // two people and a bicycle, whoever the question names
};

/**
 * The stage's words for what moves, where it says them: "Mass of cyclist and bike".
 * Only where one object is meant: a stage of two trains says "train" of both.
 */
const WORDS = {
  freewheeling: 'cyclist and bike|cyclist|bike',
  bounce: 'ball', 'back-past-the-start': 'ball', 'higher-than-far': 'ball', 'catch-it': 'ball',
  'past-two-marks': 'ball', 'under-the-ceiling': 'ball', 'with-air-resistance': 'ball', 'from-the-bridge': 'ball',
  'drop-or-ramp': 'parcel', 'lift-cable-floor': 'passenger', 'xt-graph': 'particle', 'there-and-back': 'car', 'past-the-posts': 'car', 'stage-by-stage': 'car',
};

let art = null, rule = {}, claims = 0, said = null;

/**
 * Set it for a scenario, or clear it with null.
 * @param s  { draw(kind, g, x, y, size, opts) → false to decline, word } from standInFor
 * @param id the scenario
 */
export function setStandIn(s, id = null) {
  rule = (id && STAGES[id]) || {};
  art = s && !rule.none ? s.draw : null;
  const words = art && s.word && id && WORDS[id];
  // (a cyclist on Freewheeling is the paper's own: its words stand)
  said = words && !new RegExp(`\\b(?:${words})\\b`, 'i').test(s.word) ? { re: new RegExp(`\\b(?:${words})\\b`, 'gi'), to: s.word } : null;
}
/** A new frame: its first figure is yet to come. */
export function standInFrame() { claims = 0; }
/**
 * Asked by a figure before it draws itself.
 * @param kind  'cyclist', 'car', 'ball', …
 * @returns true when the stand-in has been drawn in its place
 */
export function standIn(kind, g, x, y, size, o = {}) {
  if (!art || g.canvas?.id !== 'scene') return false;
  if (rule.only && !rule.only.includes(kind)) return false;
  const n = claims++;
  if (!rule.every && n !== (rule.skip || 0)) return false;
  return art(kind, g, x, y, size, o) !== false;
}
/** A stage's words, in the question's: "Mass of ski-board (kg)". Keeps a capital where the sentence has one. */
export function ownWords(text) {
  if (!said || typeof text !== 'string') return text;
  const own = text.replace(said.re, (m) => (/^[A-Z]/.test(m) ? said.to[0].toUpperCase() + said.to.slice(1) : said.to));
  if (lang() !== 'ar' || own === text) return own;
  // In Arabic, the whole line in Arabic or the paper's: never half of each (js/i18n.js)
  const ar = translateText(own);
  return /[A-Za-z]/.test(ar) ? text : ar;
}
