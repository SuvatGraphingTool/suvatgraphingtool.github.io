// pace.test.mjs — proves the playback recommendation. Run with:
//     node test/pace.test.mjs
//
// The claim this file checks is a narrow one: whatever the flight, the
// recommended speed puts it on screen for about the same length of time. That
// is what makes a half-second round and a four-second lob equally readable,
// and it is the whole of the idea. The rest is the two limits — never faster
// than real time, never so slow that nothing seems to happen — and the band
// either side within which a student's own choice is left alone.

import { recommend, watchSeconds, withinBand, paceNote, BAND } from '../js/core/pace.js';

let pass = 0, fail = 0;

function near(actual, expected, tol, label) {
  const good = Math.abs(actual - expected) <= tol;
  if (good) { pass++; console.log(`  ok   ${label}  =  ${actual.toFixed(3)}`); }
  else { fail++; console.log(`  FAIL ${label}  =  ${actual.toFixed(3)}  expected ${expected} (±${tol})`); }
}
function ok(cond, label) {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}`); }
}
function group(name, fn) { console.log(`\n${name}`); fn(); }

/* ── the one claim ──────────────────────────────────────────────────────── */
group('Every flight lands on roughly the same time on screen', () => {
  // A spread covering the whole app: the fired round, a dropped ball, a
  // simple arc, a long drive, and a lob off the Moon.
  const flights = [
    ['a round fired flat from 1.5 m', 0.553],
    ['a ball dropped from 5 m',       1.010],
    ['a simple arc at 25 m s⁻¹',      3.603],
    ['off a platform at 45°',         4.800],
    ['a long one on the Moon',       12.400],
  ];
  for (const [what, tMax] of flights) {
    const v = recommend(tMax);
    const watch = watchSeconds(v, tMax);
    ok(v >= 1 && v <= 100, `${what}: the recommendation is on the slider — ${v}`);
    // Anything the ceiling has not caught should land near the target. A
    // flight already longer than the target hits the ceiling instead, and
    // then the time on screen is simply the truth: we never speed up.
    if (v < 100) near(watch, 4, 0.45, `${what}: seconds on screen`);
    else {
      near(watch, tMax, 1e-9, `${what}: real time, so the screen shows the real duration`);
      ok(tMax >= 4, `${what}: and it was already long enough not to need slowing`);
    }
  }
});

group('A short flight is slowed hard and a long one is left alone', () => {
  ok(recommend(0.553) < 20, 'the fired round is slowed well below a quarter speed');
  ok(recommend(3.603) > 80, 'a three-and-a-half second arc barely needs slowing');
  ok(recommend(0.553) < recommend(3.603), 'shorter flight, slower playback — always');
  // Monotonic, because anything else would be impossible to explain.
  let last = 0, rising = true;
  for (let t = 0.1; t < 8; t += 0.1) { const v = recommend(t); if (v < last) rising = false; last = v; }
  ok(rising, 'the recommendation never falls as the flight gets longer');
});

group('The two limits hold', () => {
  near(recommend(40), 100, 0, 'a very long flight is real time, not faster');
  near(recommend(400), 100, 0, 'and a preposterous one is still only real time');
  ok(recommend(0.001) >= 5, 'an instant flight is floored, not slowed to a standstill');
  near(recommend(0), 100, 0, 'no flight at all falls back to real time');
  near(recommend(Infinity), 100, 0, 'and so does one that never lands');
});

/* ── the band, and what it says when you leave it ───────────────────────── */
group('Inside the band it approves, outside it explains', () => {
  const tMax = 0.553;                      // the fired round
  const best = recommend(tMax);

  ok(withinBand(best, tMax), 'the recommendation is inside its own band');
  ok(withinBand(best + BAND, tMax), 'and so is the top edge');
  ok(withinBand(best - BAND, tMax), 'and the bottom edge');
  ok(!withinBand(best + BAND + 1, tMax), 'one past the top edge is outside');
  ok(!withinBand(best - BAND - 1, tMax), 'one past the bottom edge is outside');

  ok(paceNote(best, tMax).ok, 'the recommendation is reported as fine');
  ok(!paceNote(best + BAND + 1, tMax).ok, 'too fast is reported as not fine');
  ok(!paceNote(best - BAND - 1, tMax).ok, 'too slow is reported as not fine');
  ok(!paceNote(0, tMax).ok, 'frozen is reported as not fine');
});

group('The reason given is the one the student needs', () => {
  const tMax = 3.603;
  const best = recommend(tMax);

  const slow = paceNote(Math.max(1, best - BAND - 30), tMax);
  const froz = paceNote(0, tMax);

  ok(/not recommended/i.test(paceNote(100, tMax).text), 'too fast says it is not recommended');
  ok(/not recommended/i.test(slow.text), 'too slow says it is not recommended');
  ok(/watching/i.test(paceNote(5, tMax).text), 'far too slow says how long you would be sitting there');
  ok(/frozen/i.test(froz.text), 'nought says it is frozen rather than merely slow');

  // The numbers in the sentence have to be the real ones.
  const v = Math.max(1, best - BAND - 30);
  const held = watchSeconds(v, tMax);
  ok(slow.text.includes(held.toFixed(held < 10 ? 1 : 0).replace(/\.0$/, '')),
     `the wait quoted is the wait you get — ${held.toFixed(1)} s`);
});

/* ── the thing that nearly shipped ──────────────────────────────────────
   Five notches off a 3.6 s flight is four tenths of a second. The first
   version called that "too fast to follow", which is simply untrue, and a
   warning a student can see is untrue is a warning they learn to scroll
   past. The verdict still follows the band; only the sentence is graded. */
group('It cries wolf only when there is a wolf', () => {
  const longOne = 3.603;                   // real time here is perfectly watchable
  const shortOne = 0.553;                  // real time here genuinely is not

  const mild = paceNote(100, longOne);
  ok(!mild.ok, 'real time on a long flight is still outside the band');
  ok(!/too fast to follow/i.test(mild.text), 'but it is not called unfollowable');
  ok(/rather than/i.test(mild.text), 'it compares the two times instead');
  ok(mild.text.includes('3.6'), 'and quotes the real one');

  const harsh = paceNote(100, shortOne);
  ok(!harsh.ok, 'real time on a half-second round is outside the band');
  ok(/too fast to follow/i.test(harsh.text), 'and here it does say so');

  // The same grading at the slow end.
  const nearly = paceNote(Math.max(1, recommend(longOne) - BAND - 3), longOne);
  ok(!/far slower/i.test(nearly.text), 'a little slow is not called far too slow');
  ok(/far slower/i.test(paceNote(5, longOne).text), 'a seventy-second crawl is');
});

group('No computer maths reaches the card', () => {
  // The same blacklist the notation sweep uses, applied to every sentence
  // this module can produce. A hyphen standing in for a minus sign counts.
  const bad = /\^|sqrt|<=|>=|!=|\*|_[a-z]|\d\s*\/\s*\d|(?<![\d.])-\d/;
  const seen = [];
  for (const tMax of [0.2, 0.553, 1, 3.6, 12]) {
    for (let v = 0; v <= 100; v += 1) {
      const t = paceNote(v, tMax).text;
      if (bad.test(t)) seen.push(`${v} @ ${tMax}: ${t}`);
    }
  }
  ok(seen.length === 0, 'every note is prose, across the whole slider');
  if (seen.length) console.log('         ' + seen.slice(0, 3).join('\n         '));
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
