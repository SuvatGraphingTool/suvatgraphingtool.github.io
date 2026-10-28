# StudyWell "AS Mechanics – SUVAT Equations" (14 past Edexcel M1 questions)

The user's PDF, `/home/tr/Downloads/ASSUVATEquationsExamQuestions.pdf`: a
compilation of past Edexcel M1 questions, with answers on its last pages.
This is the tick list for it. A question is **ticked** only when the app can
do it end to end with the paper's numbers, matching the answers, AND it shows
every thing in the question (the cyclist, the train, the traffic lights, the
point above the ground), with the graphs. Anything short of that is **built**.
Parts that need another topic (impulse, a resistive force) are marked out of
scope; the rest of that question still counts.

Paraphrases are ours; no question text is stored here.

| # | paper | what happens (our words) | answers (from the PDF) | status | owner |
|---|---|---|---|---|---|
| 1 | M1 Jun 2018 Q4 | ball thrown down from 2.5 m, rebounds up at 10 m/s, passes a point 1 m up; v–t across the bounce | U = 24 (needs impulse, out of scope; give the speed at impact instead), t = 0.11 s | build: **bounce** | bounce session |
| 2 | M1 Jun 2017 Q6 | cyclist A→B in 5 s, 10 m/s at B, AB = 40 m; time to the midpoint | a = 0.8, t = 2.81 s | **ticked** (fixed: the road now draws a cyclist): a 0.8, mid-point 2.81 s, cyclist on the road, A, B and M marked, graphs | figures + checks session |
| 3 | M1 Jun 2016 Q4 | two trains on parallel tracks: M overtakes N at X, each holds speed then brakes to rest at Y, same time | T = 8.75 | **ticked**: `two-on-a-road` on the tracks (trains, posts X and Y, T = 8.75) | two-body session |
| 4 | M1 Jun 2015 Q2 | stone straight up at 19.6 m/s; greatest height; time above 14.7 m | 19.6 m, 2 s | **ticked**: Time above a line, Straight up, u 19.6, a 9.8 → greatest height 19.60 m, above 14.7 m for 2.00 s | figures + checks session |
| 5 | M1 Jun 2015 Q7 | train rest→V→rest, 0.5 and 0.25 m/s², 5 min, 6.3 km | 2V, 4V, 300 − 6V; V = 30 | answers **pass** (V = 30; t₁ = 2V, t₃ = 4V, t₂ = 300 − 6V; train, A and B, trapezium). Look fails: the train runs on a road line, not rails. **Handed to journey session** | figures + checks / journey |
| 6 | M1 Jun 2014 Q3 | ball dropped from 2 m, rebounds to 1.5 m, falls again; v–t; total time | 6.26, 5.42, 1.75 s (impulse part out of scope) | build: **bounce** | bounce session |
| 7 | M1 Jun 2013 Q4 | lorry A→B in 10 s, 34 m/s at B, 240 m; u; time to the midpoint | u = 14, 6 s | **ticked**: u 14, mid-point 6 s, lorry unchanged (pixel-identical) | figures + checks session |
| 8 | M1 Jun 2013 Q5 | car between two sets of traffic lights (rest→22→rest, 120 s, 2145 m); motorcycle leaves 10 s later, passes the car at 990 m | T = 75, 50 s, a = 0.792 | motorcycle half **ticked** (two-body): `two-on-a-road` leaving traffic lights, B a motorcycle (50 s, a = 0.792). Car half: answer passes (T = 75) on the journey; its car and traffic lights are in the journey session's replacement, to re-check when it ships | two-body / journey |
| 9 | M1 Jun 2012 Q4 | car 20 m/s for 25 s, brakes at 0.4 to 8, holds 8 for 60 s, speeds up to 20 at B; 1960 m | 30 s, 155 s | build: **journey in any number of stages** (not rest to rest) | journey session |
| 10 | M1 Jun 2012 Q5 | thrown up from 17.5 m above ground, lands at 28 m/s; times 19 m above the start (sinking part out of scope) | t = 1.30 or 2.99 | **physics ticked** (fixed: the line now says how far above the start it is, and the stage and hint give both times): h 17.5, v −28, a 9.8 → u = 21; line at 36.5 m (19 m above A) → t = 1.30 and 2.99 s. Scene: the start floats with no A and nothing under it. **Setting scene needed** (tower/cliff) | figures + checks / scenario-builder |
| 11 | M1 Jun 2011 Q1 | thrown up, greatest height 40 m; times at 33.6 m | 28 m/s; t = 1.71 or 4 | **ticked** (fixed: both crossing times now on the stage and in the hint, and the top is "reached once", no longer "twice at 2.86 s and 2.86 s"): s 40, v 0, a 9.8 → u = 28; line 33.6 → t = 1.71 and 4.00 s | figures + checks session |
| 12 | M1 Jun 2011 Q4 | girl's 400 m race: 4 s to 5 m/s, 60 s steady, 20 s slowing to V; 84 s | 310 m, V = 4, 0.05 m/s² | build: **journey in any number of stages** + a **runner** | journey session |
| 13 | M1 Jun 2010 Q5 | car P at 25 overtakes Q at 20; each holds then brakes, both stop at X (800 m) together | T = 9 | **ticked**: `two-on-a-road` (two cars, T = 9) | two-body session |
| 14 | M1 Jun 2010 Q6 | thrown up at 14.7 m/s from 49 m above ground; greatest height, impact speed, total time | 60.0 m, 34.3 m/s, 5 s | **physics ticked**: Thrown straight up, h 49, u 14.7, a 9.8 → greatest height 60.02 m, 34.3 m/s, 5 s. Scene: the start floats at 49 m with no tower. **Setting scene needed** (tower/cliff) | figures + checks / scenario-builder |

## Checks (29 Oct 2026, figures + checks session)

Each "check" row was entered on the values screen as a student would, on the
deployed commit, and every answer compared with the PDF's answers page.

- g: the paper uses 9.8. The g chips offer 9.81, so type 9.8 (or −9.8) into
  the a box; both are read as g downwards.
- Row 11 gives the greatest height, not u: s = 40 and v = 0 in the five do it.
- Row 10 gives the level as "19 m above A": the line box is measured from the
  ground (36.5 m), and the hint and the stage now say "19 m above the start".

### For the setting scenes (suvat-scenario-builder)

Rows 10 and 14 are right in the physics, but the stage does not show the
height honestly: the ball starts in mid-air at 17.5 m and 49 m, with no point
A, no building or cliff under it, and (row 14) a height ruler that stops at
40. A tower or cliff-top scene that the straight-up and from-a-height throws
can use would make both honest.
