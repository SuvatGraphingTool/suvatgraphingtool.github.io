# Library build log

Short notes, newest first. What shipped, what was audited, where a session stopped.

## 3 Nov 2026, night — 53–56 and batch 30 SHIPPED

- Physics critic round 2 passed 53–56 after its fixes (844f495), including an older crash it found:
  the lift's stage typeset its weight label twice (js/render/cable.js). A browser sweep of all 56
  cards (open, launch, scrub; laptop and phone) is clean locally and live.
- **Deployed:** site (version faed3f6f) and reader (ff43069e); the changed files live match HEAD.
  Live screenshots of the four new stages checked.
- **Next:** audits 27 (53, 54) and 28 (55, 56) together; then library 57.

## 3 Nov 2026, evening — 53–56 through their critics

- **Library 56 `timed-up-the-slope`** (CIE 9709/41 Nov 2018 Q6) built: two timed stretches up a
  rough slope give a and u (exact fractions), then μ; a lab with light gates and a timer.
- **Physics critic round 1** (53–55): papers right; fixed a crash with no clock, `tvec`, units
  outside maths, clock answers past midnight, the ship onto the rock, sailing along the line
  through the rock, a/θ range checks, false refusals and caveats. Round 2 (with 56) running.
- **UI critic rounds 1–2** (53–56 and batch 30): fixed the colour rule on the road, the slope
  lab's timer and layout, the magnet and the meeting, the buoy and the wake; open polish only:
  the "337 °" readout spacing, part chips overlapping on a phone, the Display drawer over a
  composed scene on a phone, composer captions 3–4 lines, chart detail on the course.

## 3 Nov 2026, later — audit 26 done; library 54 and 55 built

- **Audit 26** (51 `last-stretch`, 52 `passed-at-x`): papers right, no wrong physics. Fixed (30e6197):
  paper parts only on the paper's numbers (app-wide: `paperValues` in js/app.js); the lanes card
  under the clock on a phone; "differ by 0"; fractions kept as fractions in lastfall; a word space
  beside maths on canvas (js/notation.js); units on "Ready"; caveats true for any numbers.
  **Open polish:** Resolve after landing on last-stretch says "at t = 4.2 s … going down"; ending
  rounding 43.8 vs 43.75; near-degenerate H ≈ p; overlaps on the passed-at-x v–t graph and the
  last-stretch plates on a phone; M/N names on passed-at-x and "from the start" on rails in Resolve.
- **Library 54 `slope-and-drop`** (OCR 4728 Jan 2011 Q5) and **55 `one-bicycle`** (OCR 4728 Jun
  2015 Q3) built and pushed; with 53, in front of one physics critic, then one UI critic.

## 3 Nov 2026, afternoon — scenario 53 built; audit 26 restarted

- **Library 53 `change-of-course`** (Edexcel M1 Jun 2006 Q7): a ship on course for a submerged
  rock turns at a clock time. Engine js/core/course.js (two legs on a 24-hour clock, the rock
  from when the first course would reach it, due a compass direction of it, distance at a time);
  stage js/render/course.js (radar station, submerged rock, isolated-danger buoy, foam trail round
  the turn). Mark scheme: 6.5, 337°, 8.5i + 23j, 11i + (17 + 5t)j, 1512, 4.72 — all from the
  engine. Parts can now show an engine-typeset expression (`expr`) and a clock time (`clock`).
  Pushed (dc3c32c), **not deployed**: physics and UI critics still to run.
- **Audit 26**: the first auditor was stopped by an interruption before it reported; restarted.

## 3 Nov 2026 — session stopped by the user, before any work shipped

- **Audit 26 (library 51 `last-stretch`, 52 `passed-at-x`): NOT DONE.** The auditor was
  started and then stopped at the user's request; it had only run the suites (all 13 pass)
  and found nothing yet. Start it again from scratch.
- **Then scenario 53.** Nothing built. A lead, not verified against any paper: a bullet fired
  horizontally into a fixed block against a constant resistance (stops inside, or emerges at a
  lower speed), which no scenario does. Needs a real A-level paper first: none was found by web
  search. Edexcel M1 sessions not yet in the catalogue, worth scanning: Jan/Jun 2006, Jan/Jun 2007,
  Jun 2008, Jan/Jun 2009, Jan/Jun 2011, Jun 2014, Jun 2018.
- **Why it stopped:** the session's environment had no `CLOUDFLARE_API_TOKEN` /
  `CLOUDFLARE_ACCOUNT_ID`, and its network policy at first refused the live site, the
  Cloudflare API and the past-paper host. The user fixed the network and is handing the work to
  a new session so the credentials load.
