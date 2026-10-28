# `bounce` — critic round 2 (at eab2602): FAIL, to fix on resume

Round-1 items 1–3 and 5–7 are fixed; 4, 8, 9 and 10 are partly fixed. All 9 suites pass. Open, most important first:

1. **v–t value labels culled** near the top band (title plus `notePri` 8 note beat the pri-6 point labels):
   - Jun 2018, down positive: 24 (start) and 25 (before the impact) have no labels.
   - Jun 2014: the end value +5.42 has no label.
   - Also the end values in other runs.
   - Fix: place the start/end labels clear of the top band, or raise their priority (js/kits/bounce.js vPts; graphs.js).
2. **Working, `by === 'e'` bounce row has the wrong sign:** "u = e × v, 0.7 × 8.65, u = −6.05". Write it in speeds, or as u = −ev with the signed v (js/core/bounce.js `brow`).
3. **H = 2.02 snapped to e = 1:** the `by === 'H'` note still says "Rising to 2.02 m means it left at 6.26", which is false, and the working says "greatest height 2.00 m". Drop or reword these once w is snapped.
4. **Formatting:**
   - v–t point labels use 2 dp (`tr`), not `sf`; at h = 1e6 they read "−4427.15".
   - Given values are shown in 3 s.f. ("1.50 m") instead of as given, in the working's bounce note and in the stage's "rises to".
5. **Tiny bounces:**
   - "rises to 0.00195 m" is drawn on the paving.
   - The v label sits on the B line and its rings. Hide the apex label below a few px.
6. **The ending's "The same fraction every bounce"** shows even for a single-impact run. Make it conditional.

Out of scope, shared: the header forces an 805 px layout at 375 px.
Not yet shipped: nothing has gone to `ai`. On resume, rebase onto origin/ai, fix the six items above, run critic round 3 (on sonnet, per the Usage section of build-rules.md), then ship and tick rows 1 and 6.
