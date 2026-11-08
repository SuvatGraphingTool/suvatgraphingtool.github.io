// compose/sense.js — common sense: anything the question leaves out gets a
// sensible value, and the reply says so.
//
// The user, 7 Nov: "why does it give me these errors, can't it just use common
// sense". "A ball dropped off a rooftop" gives no height; a person would picture
// a rooftop and get on with it. So: always show something, and say what was
// assumed. The engine decides what is missing — a value is only ever filled in
// when the engine cannot run without it, so "lands after 3 s" still finds the
// height itself. And a value the question ASKS for is never made up: a made-up
// answer would teach a wrong one. Only inputs are chosen here, each one said
// plainly and shown as assumed; every number worked out is the engine's (rule 4).

import { readArabic } from './arabicwords.js';
import { num } from '../notation.js';

/**
 * The student handing it over: "I don't know", "you pick", "use your own", "fill in
 * the rest". The user, 8 Nov: "as easy as telling the AI when you don't know a value,
 * or want it to complete the rest, whenever you want". Until they say so, it asks.
 */
const OWN = /\b(?:i\s*(?:do\s*not|don'?t|dont)\s*(?:know|have)|dunno|no idea|not sure|idk|you\s+(?:pick|choose|decide)|your\s+(?:own|choice|call)|ur\s+own|use\s+(?:your|ur|whatever|any)|whatever(?:\s+values?)?(?:\s+you)?|make\s+(?:it|them|some|one)\s+up|any\s+values?|(?:complete|fill(?:\s+in)?|finish|do)\s+(?:it|the\s+rest|them)|surprise\s+me|up\s+to\s+you)\b|لا\s*أعرف|ما\s*أعرف|لا\s*أدري|من\s*عندك|اختر\s*أنت|أكمل\s*الباقي|على\s*راحتك/i;
export const wantsOwn = (text) => OWN.test(String(text || '')) || OWN.test(readArabic(String(text || '')));
/** Whether the words give any number at all, in either set of digits. */
export const saysNumber = (text) => /[0-9٠-٩]/.test(String(text || ''));

/** How high a thing usually is, by the question's own word, first found wins. */
const WORD_HEIGHTS = [
  [/\b(?:table|desk|counter|worktop|bench)\b/, 0.8, 'the table'], [/\bshel(?:f|ves)\b/, 2, 'the shelf'],
  [/\b(?:rooftop|skyscraper|office block|tower block|high-rise)\b/, 30, 'the rooftop'],
  [/\broof\b/, 6, 'the roof'], [/\b(?:balcony|window)\b/, 6, 'the window'], [/\bwall\b/, 3, 'the wall'],
  [/\btree\b/, 5, 'the tree'], [/\bladder\b/, 3, 'the ladder'], [/\bcrane\b/, 40, 'the crane'],
  [/\b(?:helicopter|balloon|plane|aeroplane|drone)\b/, 100, 'it'],
];
/** Otherwise, by the place that is drawn. */
const PLACE_HEIGHTS = { table: 0.8, house: 6, city: 30, building: 30, tower: 30, cliff: 50, bridge: 15, board: 10, well: 20, balloon: 100, orchard: 5, mountain: 100, pier: 5, lighthouse: 30, carpark: 15, castle: 15, dam: 40, canyon: 60, waterfall: 40, site: 30, ship: 15 };
const PLACE_NAMES = { table: 'the table', house: 'the house', city: 'the rooftop', building: 'the building', tower: 'the tower', cliff: 'the cliff', bridge: 'the bridge', board: 'the board', well: 'the well', balloon: 'the balloon', orchard: 'the tree', mountain: 'the ledge', pier: 'the pier', lighthouse: 'the lighthouse', carpark: 'the car park', castle: 'the castle', dam: 'the dam', canyon: 'the canyon', waterfall: 'the waterfall', site: 'the building site', ship: 'the ship' };

// asked for: left blank, for the reply to ask, never made up
const ASKS_HEIGHT = /\bhow (?:high|tall|deep)\b|\b(?:find|work out|calculate|what(?:'s| is| was)?)\s+(?:the\s+)?(?:height|depth)\b/i;
const ASKS_SPEED = /\b(?:find|work out|calculate|what(?:'s| is| was)?)\s+(?:the\s+)?(?:initial |launch |starting |projection )?speed\b(?!\s+(?:as|when|at which)\b)|\bspeed of projection\b|\bhow fast (?:was|is|must|should|did) (?:it|the \w+) (?:be )?(?:thrown|kicked|launched|projected|fired)\b/i;
const ASKS_ANGLE = /\b(?:find|work out|calculate|what(?:'s| is| was)?|which)\s+(?:the\s+)?angle\b|\bat what angle\b/i;

const LET_GO = /\b(?:dropp(?:ed|ing)|drops?|falls?|fell|falling|let go|lets go|released?|from rest|slips?|slipped)\b/i;
const UP = /\b(?:straight up|upwards?|vertically up|into the air|up in the air)\b/i;
const DOWN = /\b(?:straight down|downwards?|vertically down)\b/i;

const has = (v) => typeof v === 'number' && isFinite(v);
const said = (n, p = 2) => num(n, p, { trim: true });

/**
 * @param o.numbers   what the question gave
 * @param o.place     the backdrop or place drawn, by its key
 * @param o.edge      whether it is launched from up on that place
 * @param o.text      the question's words
 * @param o.runs(n)   whether the engine can run with these numbers
 * @returns { numbers, notes } with any values it had to choose, or null if none would do
 */
export function sensible({ numbers, place, edge, text, runs }) {
  if (runs(numbers)) return { numbers, notes: [] };
  const t = String(text || '').toLowerCase();
  const out = { ...numbers }, notes = [];
  const rest = LET_GO.test(t) && (!has(out.u) || out.u === 0);

  if (!has(out.h) && !ASKS_HEIGHT.test(t) && !has(out.t)) {
    const word = WORD_HEIGHTS.find(([re]) => re.test(t));
    // a throw flat or downwards has to start from somewhere high, or it never leaves the ground
    const up = word || PLACE_HEIGHTS[place] != null || edge || rest || (has(out.theta) && out.theta <= 0);
    if (up) {
      const h = word?.[1] ?? PLACE_HEIGHTS[place] ?? 10;
      const where = word?.[2] ?? PLACE_NAMES[place] ?? 'where it starts';
      out.h = h;
      notes.push(`No height was given, so I’ve used ${said(h)} m for ${where}. Tell me the real one and I’ll run it again.`);
    } else out.h = 0;
    if (runs(out)) return { numbers: out, notes };
  }
  const high = out.h > 0;
  if (rest && !has(out.u)) out.u = 0;
  if (rest && !has(out.theta)) out.theta = -90;
  if (rest && runs(out)) return { numbers: out, notes };
  if (!has(out.u) && !ASKS_SPEED.test(t) && !has(out.v) && !has(out.s) && !has(out.t)) {
    if (rest) { out.u = 0; if (!has(out.theta)) out.theta = -90; }
    else {
      out.u = high ? 10 : 20;
      notes.push(`No speed was given, so I’ve used ${said(out.u)} m s⁻¹. Tell me the real one and I’ll run it again.`);
    }
    if (runs(out)) return { numbers: out, notes };
  }
  if (!has(out.theta) && !ASKS_ANGLE.test(t)) {
    const theta = UP.test(t) ? 90 : DOWN.test(t) ? -90 : high ? 0 : 45;
    out.theta = theta;
    const how = theta === 90 ? 'straight up' : theta === -90 ? 'straight down' : theta === 0 ? 'thrown flat' : 'launched at 45°';
    notes.push(`No angle was given, so it is taken as ${how}. Change it on the values screen to try another.`);
    if (runs(out)) return { numbers: out, notes };
  }
  return null;
}
