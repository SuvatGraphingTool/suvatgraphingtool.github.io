// pace.js — how fast to play a flight back, and whether a chosen speed is sane.
//
// WHY THIS IS A SINGLE SUM. The flight view is framed to fit the trajectory,
// whatever size it is: a 0.4 m lob off a bench and a 200 m drive down the
// pitch both end up spanning roughly the same width of canvas. So the thing
// that decides whether a flight can be READ is not how far it goes, and not
// how fast it really travels — it is how many seconds it spends crossing the
// screen. Frame a flight to fit and then fix its time on screen, and you have
// also fixed how fast it appears to move. One number governs both.
//
// So: pick a comfortable number of seconds to watch, and the rate is whatever
// turns this particular flight's real duration into that. A round that lands
// in half a second gets slowed hard. A ball that hangs for four seconds is
// already comfortable and is left alone.
//
// TWO LIMITS, both of them the point rather than details.
//
//   Never faster than real time. The whole claim this app makes is that you
//   are watching the motion the numbers describe. Speeding a projectile up to
//   fill the time is a different lie from the one we removed when the range
//   stopped being squeezed sideways, but it is the same kind of lie.
//
//   Never so slow that nothing appears to happen. Below about a twentieth of
//   real time a parabola stops reading as motion and starts reading as a
//   stuck screen, and a student waits rather than watches.
//
// The scale is the one the slider speaks: whole numbers from 0 to 100, where
// 100 is real time. A rate is that over a hundred.

import { num } from '../notation.js';

/** Seconds on screen that read comfortably. Long enough to follow, short
    enough that nobody reaches for the scrub bar before it has finished. */
const WATCH = 4;

/** 0.05×. Slower than this and the picture stops looking like motion. */
const FLOOR = 5;

/** Real time. There is no case for going faster. */
const CEILING = 100;

/** How far either side of the recommendation is still a reasonable choice. */
export const BAND = 5;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * The speed this flight wants, on the slider's own 0–100 scale.
 * @param {number} tMax  the flight's real duration, in seconds
 */
export function recommend(tMax) {
  if (!(tMax > 0) || !isFinite(tMax)) return CEILING;
  return clamp(Math.round((tMax / WATCH) * 100), FLOOR, CEILING);
}

/** How long watching it would actually take, at this setting. */
export function watchSeconds(value, tMax) {
  if (!(value > 0) || !(tMax > 0) || !isFinite(tMax)) return Infinity;
  return (tMax * 100) / value;
}

/** Is this setting close enough to the recommendation to be left alone? */
export function withinBand(value, tMax) {
  return Math.abs(value - recommend(tMax)) <= BAND;
}

/**
 * What to say underneath the slider: whether this setting is a good one, and
 * when it is not, the reason in the only terms that matter to the person
 * choosing — how long they will be sitting there, or how little they will see.
 *
 * Prose, with quantities in it. Nothing here is an equation.
 *
 * @returns {{ok: boolean, text: string}}
 */
export function paceNote(value, tMax) {
  const rec = recommend(tMax);
  const real = tMax > 0 && isFinite(tMax) ? `${num(tMax, 2, { trim: true })} s` : null;

  if (!(value > 0)) {
    return { ok: false, text: 'Not recommended — frozen. Nothing will move until you drag the time slider yourself.' };
  }

  const secs = (s) => num(s, s < 10 ? 1 : 0, { trim: true });
  const watch = watchSeconds(value, tMax);
  const held = secs(watch);
  const want = secs(watchSeconds(rec, tMax));

  // THE REASON HAS TO BE TRUE AT BOTH ENDS. Five notches off a long flight is
  // half a second of difference, and calling that unwatchable is a cry of
  // wolf that teaches a student to ignore the line. The verdict follows the
  // band, because the band is what was asked for; the sentence follows the
  // clock, and only reaches for the strong words when the clock earns them.
  if (value > rec + BAND) {
    return { ok: false, text: watch < 1.5
      ? `Not recommended — too fast to follow. The whole flight would be over in ${held} s, against ${want} s at the speed it asked for.`
      : `Not recommended — quicker than this flight wants: ${held} s on screen rather than ${want} s.` };
  }
  if (value < rec - BAND) {
    return { ok: false, text: watch > 12
      ? `Not recommended — far slower than it needs to be. You would be watching for ${held} s, against ${want} s at the speed it asked for.`
      : `Not recommended — slower than this flight wants: ${held} s on screen rather than ${want} s.` };
  }
  return { ok: true,
    text: real
      ? `About ${held} s on screen, for a flight that really lasts ${real}.`
      : `About ${held} s on screen.` };
}
