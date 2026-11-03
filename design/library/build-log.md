# Library build log

Short notes, newest first. What shipped, what was audited, where a session stopped.

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
