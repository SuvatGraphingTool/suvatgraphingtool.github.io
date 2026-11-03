# Library build log

Short notes, newest first. What shipped, what was audited, where a session stopped.

## 3 Nov 2026, late evening — library 59 SHIPPED (one physics round); batch 32 redone; STOPPED (usage)

- **Library 59 `pushed-by-a-force`** (Edexcel M1 Jan 2011 Q4; Jun 2008 Q3 through the same boxes):
  F = ma in i and j: a from two velocities, the force or as given; |F| and its angle with i; then
  js/core/plane.js. Stage js/render/hovercraft.js (a model hovercraft on a frozen lake) on the plane's
  stage, now `drawPlane` with hooks. Physics critic round 1: papers right; fixed the F = ma
  substitution ("23j"), the plane's "parallel to" relation (2(−5), and a crash on "−−5" — an older
  plane.js bug), compass questions dropped (i, j are not east/north here), the a-arrow's hue, the
  doubled |u| row. **Open for audit 30 (58 and 59):** engine tests for js/core/force.js (Jun 2008
  numbers, refusals, zero force, vT-only, one-term vectors, par with non-unit parts); notes that
  claim F = ma with no mass; the r0 boxes; (c) as 5⁄3; an answers entry for the velocity at a time;
  the UI critic round has NOT been run.
- **Batch 32 (high jump)** UI critic FAILED the first version (feet-first pose, a stub of a bar seen
  end-on, red dashed bar, landing in front of the mat, dust, the long-jump pit showing). Redrawn:
  a `highJumper` figure (head-first flop, arch, kick, lying on the mat), `highjumpGeom` shared by
  place and stage, a receding mat with quilting, handles, a dent and an air puff, uprights with feet,
  scale, collar and peg, a solid white bar that bows on a clean jump and rolls off when knocked,
  a front layer (`PLACE_ART[x].front`), labels kept off Resolve and the clock (all composed scenes).
  Shipped WITHOUT a second UI round. **Open:** the bar reads slanted in perspective; check the
  knock-off timing at the peak; a dark shadow blob on the mat; the wear patch; the phone framing.
- **Stopped** here at the user's request (usage). Next: the 00:10 UTC wake-up (reader checks, QA),
  then audit 30 with the items above.

## 3 Nov 2026, evening — library 58 SHIPPED; audit 29 done

- **Library 58 `drop-or-ramp`** (OCR 4728 Jan 2009 Q6): audit 29 doubled as its physics critic
  (rule 4: the stages computed forces — now the engines give them; a false caveat; layout); one UI
  round (the drop lane through the conveyor's leg, landings, arrows, framing, conveyor and trolley
  detail, card labels). Deployed: site 83d36327, reader dfba3ee4; live files match; live sweep clean.
  The loading bay is now a shared drawing (`loadingBay`, js/render/runout.js), pixel-identical in
  `down-and-across`.
- **Audit 29** also re-checked 57: fixed the phone force card and the "(not to scale)" overprint.
- **Open, for audit 30 (58 and 59):** 58's second UI round was not run (to save usage): the phone
  layout is small, the conveyor clipped on a phone; check the forces card at more angles.
- Today: 53–58 shipped (six), audits 26–29, component batches 30–31.

## 3 Nov 2026, later still — library 57 and batch 31 SHIPPED

- **Library 57 `with-air-resistance`**: physics critic (4 blocking: claims after landing, the
  forces part, the caveat, g ≤ 0 silently 9.8 — also in slopedrop and slopegates) and two UI rounds
  (the ball in velocity orange, strings, the force card, plates on lines, scale; an app-wide fix:
  `panels` in util.js reset the caller's alpha). Deployed with the audit 27/28 fixes: site bf0f31e2,
  reader 13ce891d; the live files match; the live card sweep at 1440 is clean.
- A third UI round was skipped to save usage; **audit 29 (57 and 58) must re-check 57's stage and
  the rugby pitch**: the phone force card over the block, the facade's barcode windows, the back
  garden's flat shed, the graph end labels on part markers.

## 3 Nov 2026, late — audits 27 and 28; library 57 built

- **Audits 27 + 28** (53–56 and the day's app-wide changes): no wrong physics; fixed (2c8236b)
  "until it reaches the rock" when it turns first, slope-and-drop's speed labels beside the wrong
  particle, coefficients of one, Resolve wording, units splitting across lines, title rounding.
  **Open polish:** "Resolve at" asks hours, not a clock time, on the course; part ticks overlap on a
  phone (app-wide); parts whose moment is the end open the ending card mid-flow (app-wide); the
  course's axis names over the rock at the edges; slopegates' a–t title over its tick.
- **Library 57 `with-air-resistance`** (AQA MM1B Jan 2010 Q4) built and pushed, not deployed:
  physics critic running.

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
