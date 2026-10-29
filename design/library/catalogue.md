# The past-paper catalogue

The working record behind the **Past-paper library** on the home screen. Every
A-level SUVAT question looked at is here: where it was set, what it asks in our
own words, and what became of it. **No question text is stored here or anywhere
in the repo.** Papers are copyrighted, so an entry is a reference, a link, a
paraphrase written for this file and the numbers the paper gives.

The library holds **new scenarios only**. A question one of the original twelve
can already do is marked *covered* here and never appears on screen. A question
that needs a new object, motion or set-up becomes an iteration: a scenario of its
own, with its own engine, stage, graphs and working, built from reusable pieces
(see [`../components.md`](../components.md)).

## Status

| status | meaning |
|---|---|
| **built** | a library scenario was made for it; its section below says how and why |
| **covered** | one of the original twelve can already do it. Catalogue only — never on screen |
| **candidate** | found by the 28 October sweep as something the twelve cannot do. Re-checked before it is built |
| **out** | it needs a topic outside constant-acceleration SUVAT. The reason is given |

Scope: anything constant-acceleration SUVAT can solve — projectiles, vertical
motion, straight-line motion, vectors in **i** and **j**, travel graphs, and two
objects meeting or overtaking. Forces and F = ma, friction, connected particles,
momentum, variable acceleration and energy are out.

## Questions

The first 84 rows come from the 28 October sweep, read in their own PDFs with
answers from the published mark schemes. Their statuses were re-assessed for
this library: *covered* names the one of the twelve that does it.

| # | board | paper | session | Q | link | paraphrase (our words, the paper's numbers) | g | status |
|---|---|---|---|---|---|---|---|---|
| 1 | AQA | MM1B (legacy M1) | Jun 2014 | 1 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202014%20QP%20-%20M1%20AQA.PDF) | Car at 14 m/s accelerates 0.8 m/s² for 12 s; find final speed, distance (then a force part) | 9.8 | **covered** by `road` |
| 2 | AQA | MM1B | Jun 2014 | 6 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202014%20QP%20-%20M1%20AQA.PDF) | Bullet fired 2° above horizontal at target 420 m away, hits after 1.8 s; find V and drop below centre | 9.8 | **covered**: arc, but the target is reached at a stated time, not on landing: needs a "where is it at t" readout |
| 3 | AQA | MM1B | Jun 2014 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202014%20QP%20-%20M1%20AQA.PDF) | Two particles with different constant accelerations start apart; show they collide, find where | – | **built**: `do-they-collide` (A at 20i + 20j after 10 s; collide at t = 14, at 16.8i + 28j) |
| 4 | AQA | MM1B | Jun 2012 | 3 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202012%20QP%20-%20M1%20AQA.pdf) | Car braking from 20 m/s, at 10 m/s after 75 m; find a, stopping time (then force parts) | 9.8 | **covered** by `road` |
| 5 | AQA | MM1B | Jun 2012 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202012%20QP%20-%20M1%20AQA.pdf) | a = 0.1i−0.2j from origin with u = −i+3j; when due east; speed when heading south-east | – | **built**: `vectors-ij` (due east at 30 s; south-east at 20 s, 1.41 m s⁻¹) |
| 6 | AQA | MM1B | Jun 2012 | 8 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/June%202012%20QP%20-%20M1%20AQA.pdf) | 22.4 m/s launch, apex after 2 s; angle, max height, range, time above 5 m, min speed | 9.8 | **covered**: time-above, once θ is worked from the 2 s to the top (sin θ = 0.875); no box takes a time to the top |
| 7 | AQA | MM1B | Jan 2013 | 1 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/January%202013%20QP%20-%20M1%20AQA.PDF) | Decelerate 20→12 m/s over 640 m, then accelerate 1820 m in 70 s; times, a, final speed, average speed | – | **built**: `stage-by-stage` (40 s; −0.2; 0.4; 40 m s⁻¹; 22.4 m s⁻¹) |
| 8 | AQA | MM1B | Jan 2013 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/January%202013%20QP%20-%20M1%20AQA.PDF) | Starts at 13.6i, u = 6i+2.4j, a = −0.8i+0.1j; distance from O when moving north-west | – | **built**: `vectors-ij` (north-west at 12 s, 45.6 m from O) |
| 9 | AQA | MM1B | Jan 2013 | 8 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-AQA/January%202013%20QP%20-%20M1%20AQA.PDF) | Golf ball hits a wall 38.4 m away at 3 m height after 2.4 s; find V and angle | 9.8 | **built**: `over-the-wall` (uₓ = 16, V = 20.6, α = 39.1°) |
| 10 | AQA | 7357/2 | Jun 2018 | 16 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/AQA/Paper-2/QP/June%202018%20QP.pdf) | 35° launch lands 10 m below start; 1.5 s to apex; find u and flight time | 9.81 | **built**: `from-a-height`, with the time to the top (u = 25.6, 3.57 s) |
| 11 | AQA | 7357/2 | Jun 2019 | 13 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/AQA/Paper-2/QP/June%202019%20QP.pdf) | Dropped from h; show v = √(2gh); h = 18 m but measured v = 20, so is the sensor faulty? | 9.8 | **covered** by `dropped` |
| 12 | AQA | 7357/2 | Jun 2022 | 12 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/AQA/Paper-2/QP/June%202022%20QP.pdf) | MCQ: speed u becomes 4u in 5 s; a in terms of u | – | **covered**: multiple choice in terms of u, no numbers to type |
| 13 | AQA | 7357/2 | Jun 2022 | 13 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/AQA/Paper-2/QP/June%202022%20QP.pdf) | 7 m/s at θ; show h = 2.5 sin²θ; max h for θ ≤ 60° | 9.8 | **covered**: symbolic in θ; arc shows any one θ |
| 14 | AQA | 7357/2 | Jun 2023 | 13 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/AQA/Paper-2/QP/June%202023%20QP.pdf) | Falling ball passes M at u and N at 3u; time M to N; bound on height of M | g | **covered**: symbolic (M at u, N at 3u); dropped shows any one case |
| 15 | AQA | 7357/2 | Jun 2023 | 20 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/AQA/Paper-2/QP/June%202023%20QP.pdf) | Ball thrown from 1.8 m at 14 m/s, 60°; dog starts 0.2 s later from rest, catches it at 0.3 m; find dog's acceleration | 9.8 | **built**: `catch-it` (caught at 2.59 s, 18.15 m out; a = 6.34) |
| 16 | Edexcel | 6677/01 M1 | Jan 2012 | 5 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/January%202012%20QP.pdf) | Stone up and back in 3 4/7 s; find u, max height, time at least 6.6 m above A | 9.8 | **covered** by `time-above` |
| 17 | Edexcel | 6677/01 M1 | Jan 2012 | 6 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/January%202012%20QP.pdf) | 885 m trip: accelerate over T/3 s to 15 m/s, steady T s, brake at 2.5 m/s²; find T, a | – | **built**: `journey-stages` (T = 48, a = 0.9375) |
| 18 | Edexcel | 6677/01 M1 | Jan 2012 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/January%202012%20QP.pdf) | Two boats at constant velocity; when is P due west of Q, and how far apart then | – | **built**: `two-in-a-plane` (t = 1.25 h, 13.5 km apart) |
| 19 | Edexcel | 6677/01 M1 | Jun 2013 | 4 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202013%20QP.pdf) | Passes A at u, B 10 s later at 34 m/s, AB = 240 m; find u, time to midpoint | – | **covered** by `road` |
| 20 | Edexcel | 6677/01 M1 | Jun 2013 | 5 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202013%20QP.pdf) | Car between lights 2145 m, 120 s; motorbike leaves 10 s later, passes car at 990 m | – | **built**: `journey-stages` does the car (T = 75); `two-on-a-road` the motorbike (50 s, a = 0.792) |
| 21 | Edexcel | 6677/01 M1 | Jun 2015 | 2 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202015%20QP.pdf) | Stone up at 19.6 m/s; max height; time above 14.7 m | 9.8 | **covered** by `time-above` |
| 22 | Edexcel | 6677/01 M1 | Jun 2015 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202015%20QP.pdf) | Train: accelerate 0.5, steady V, decelerate 0.25; 5 min, 6.3 km; find V (V < 50) | – | **built**: `journey-stages` (V = 30, V = 70 rejected) |
| 23 | Edexcel | 6677/01 M1 | Jun 2017 | 6 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202017%20QP.pdf) | Cyclist passes A, 5 s later B at 10 m/s, AB = 40 m; find a, time to midpoint | – | **covered** by `road` |
| 24 | Edexcel | 6677/01 M1 | Jun 2017 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-Edexcel/QP/June%202017%20QP.pdf) | Two ships at constant velocity; bearing; times when 10 km apart | – | **built**: `two-in-a-plane` (bearing 103°; t = 0 and 0.32 h) |
| 25 | Edexcel | 9MA0/03 | Jun 2018 | 8 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/June%202018%20QP.pdf) | Constant a found from two positions; at A the acceleration switches; time until moving north-east | – | **built**: `two-moments` (a = 1.5i − 2j, 2.5 m s⁻²; north-east 2.5 s after A) |
| 26 | Edexcel | 9MA0/03 | Jun 2018 | 10 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/June%202018%20QP.pdf) | Ball thrown from 2 m, apex 3 m, hits target 20 m away at 0.75 m; find angle, time | 9.8 | **built**: `over-the-wall` (α = 14.0°, 1.13 s to T) |
| 27 | Edexcel | 9MA0/32 | Oct 2020 | 2 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/October%202020%20QP%20(Mech).pdf) | a = 4i−5j, u = −2i+2j from O; velocity at t = 2; when it passes (λ, −4.5) | – | **built**: `vectors-ij` (v = 6i − 8j; λ = 2.88) |
| 28 | Edexcel | 9MA0/32 | Oct 2020 | 5 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/October%202020%20QP%20(Mech).pdf) | From a 25 m cliff at 45°, lands 100 m out; show U = 28; greatest height | 9.8 | **built**: `from-a-height` (a setting scene: the cliff over the sea; U = 28, greatest height 45 m) |
| 29 | Edexcel | 9MA0/32 | Jun 2022 | 5 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/June%202022%20QP%20(Mech).pdf) | Golf ball range 120 m, max height 10 m; show U² sin α cos α = 588 and U² = 1960 | 9.8 | **covered**: arc, but range and greatest height are given and neither is a box |
| 30 | Edexcel | 9MA0/32 | Jun 2023 | 1 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/June%202023%20QP%20(Mech).pdf) | From rest at 3.2 m/s² for 5 s; speed and distance | – | **covered** by `road` |
| 31 | Edexcel | 9MA0/32 | Jun 2023 | 4 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/June%202023%20QP%20(Mech).pdf) | a = 2.4i+j, passes A then B 5 s later; when it reaches C(4, c) | – | **candidate**: vectors in i and j: position, velocity and acceleration as vectors; "due east", "north-west", bearings, collisions |
| 32 | Edexcel | 9MA0/32 | Jun 2023 | 5 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/Paper-3/QP/June%202023%20QP%20(Mech).pdf) | 28 m/s from ground through a point 40 m across and 20 m up; two angles; greatest possible height | 9.8 | **built**: `over-the-wall` (tan α = 1 or 3; greatest height 36 m) |
| 33 | Edexcel | 8MA0/02 (AS) | Jun 2018 | 6 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202018%20QP.pdf) | Ball leaves hand 2 m up at 9 m/s upward; time to hit ground | 10 | **covered** by `up` |
| 34 | Edexcel | 8MA0/02 (AS) | Jun 2018 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202018%20QP.pdf) | Train: 0.3 m/s² for 80 s, steady, −0.5 m/s²; total 4800 m; total time | – | **built**: `journey-stages` (264 s) |
| 35 | Edexcel | 8MA0/22 (AS) | Jun 2019 | 1 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202019%20QP%20(Mech).pdf) | Parachutist: free fall 3 s, then −12 m/s² for 2 s, then steady to ground; 550 m; find T | 10 | **built**: `parachute-stages` (30 and 6 m s⁻¹; 78.2 s steady; T = 83.2 s) |
| 36 | Edexcel | 8MA0/22 (AS) | Jun 2022 | 1 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202022%20QP%20(Mech).pdf) | Thrown up from 1.8 m, lands at 10 m/s; find U and T | 10 | **covered** by `up` |
| 37 | Edexcel | 8MA0/22 (AS) | Jun 2022 | 2 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202022%20QP%20(Mech).pdf) | Train max 25 m/s, braking time 4× accelerating time, 700 s, 15 km; speed at t = 572 | – | **built**: `journey-stages` (t = 40 s, a = 0.625, 20 m/s at 572 s) |
| 38 | Edexcel | 8MA0/22 (AS) | Jun 2023 | 1 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202023%20QP%20(Mech).pdf) | Two children race and finish together at 27.5 s; race length; Sam's top speed X | – | **built**: `two-on-a-road` (X = 3.92) |
| 39 | Edexcel | 8MA0/22 (AS) | Jun 2023 | 2 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel/AS-Paper-2/QP/June%202023%20QP%20(Mech).pdf) | Up at 39.2 m/s, hits ground 10 s later; height of O; time with speed ≤ 24.5 | 9.8 | **covered** by `up` |
| 40 | Edexcel | IAL WME01 | Jan 2019 | 2 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/January%202019%20QP.pdf) | Two birds leave nests; B is south-west of A at t = 4; find B's speed | – | **built**: `two-in-a-plane` (bearing 319°; p = −0.5, B at 1.12 m s⁻¹) |
| 41 | Edexcel | IAL WME01 | Jan 2019 | 6 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/January%202019%20QP.pdf) | Train 270 s, 4.5 km, accelerates 60 s, brakes 30 s; V; halfway time; times at V/4 | – | **built**: `journey-stages` (V = 20, 142.5 s, 15 s and 262.5 s) |
| 42 | Edexcel | IAL WME01 | Oct 2021 | 3 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/October%202021%20QP.pdf) | Car at 25 m/s, sign 48 m ahead; three braking models, one with a 0.2 s reaction delay | – | **built**: `three-models` (7 m s⁻¹; 2.77 s; 2.58 s) |
| 43 | Edexcel | IAL WME01 | Oct 2021 | 6 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/October%202021%20QP.pdf) | Ball up from A above ground; v-t graph zero at 2.5 s; lands at 7 s; speed and height | 9.8 | **built**: `from-a-height`, the time to the top and the time to land (u = 24.5, h = 68.6 m) |
| 44 | Edexcel | IAL WME01 | Oct 2021 | 8 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/October%202021%20QP.pdf) | Ship leaves port at 7:00; lighthouse due east at 8:48, north-east at 9:00; find it | – | **built**: `two-in-a-plane` (v = 10i − 5j; lighthouse 19i; due south at 19i − 1.5j) |
| 45 | Edexcel | IAL WME01 | Jun 2022 | 2 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/June%202022%20QP.pdf) | Passes P, Q 10 s later at 28 m/s, PQ = 220; a; distance in the 5th second | – | **covered** by `road` |
| 46 | Edexcel | IAL WME01 | Jun 2022 | 6 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/June%202022%20QP.pdf) | Velocity known at t = 1 and t = 4; speed at t = 3.5 | – | **built**: `two-moments` (a = 2i − 4j; v = 4i − 6j; 7.21 m s⁻¹) |
| 47 | Edexcel | IAL WME01 | Jun 2022 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/Edexcel-IAL/Mechanics/M1/QP/June%202022%20QP.pdf) | 100 m race, finish together; Ajaz's time; Beth's T; difference in finishing speed | – | **built**: `two-on-a-road` (27.5 s, T = 3.915, speeds differ by 0.085) |
| 48 | OCR A | H240/03 | Jun 2019 | 7 | [paper](https://www.ocr.org.uk/Images/621201-question-paper-pure-mathematics-and-mechanics.pdf) | Cyclist from rest at 1.5 m/s² for 4 s, then steady; distance in 10 s | – | **built**: `stage-by-stage` (12 + 36 = 48 m) |
| 49 | OCR A | H240/03 | Jun 2019 | 8 | [paper](https://www.ocr.org.uk/Images/621201-question-paper-pure-mathematics-and-mechanics.pdf) | Flight 2.4 s, horizontal velocity 5d/3, just clears a wall at d; speed 16 over the wall | 9.8 | **candidate**: symbolic (the wall and the landing in terms of a letter); `over-the-wall` takes numbers, and a launch fixed by two points is not yet a mode |
| 50 | OCR A | H240/03 | Jun 2022 | 9 | [paper](https://www.ocr.org.uk/Images/676849-question-paper-pure-mathematics-and-mechanics.pdf) | A overtakes B (12 m/s) at 20 m/s, slows to 8 m/s over 30 s; when B re-overtakes | – | **built**: `two-on-a-road` (B overtakes at t = 45 s) |
| 51 | OCR A | H240/03 | Jun 2022 | 13 | [paper](https://www.ocr.org.uk/Images/676849-question-paper-pure-mathematics-and-mechanics.pdf) | Just clears a wall of height a/2 at x = a, lands at 4a; angle; a from a speed of 54.6 m/s; max height | 9.8 | **built**: `wall-in-a-letter` (tan θ = 2/3, 33.7°; a = 70.2; H = 2a/3 = 46.8 m) |
| 52 | OCR A | H240/03 | Jun 2023 | 8 | [paper](https://www.ocr.org.uk/Images/703870-question-paper-pure-mathematics-and-mechanics.pdf) | a = 3i−2j, v = 6i at t = 4; speed at t = 0 | – | **built**: `vectors-ij` (u = −6i + 8j, speed 10) |
| 53 | OCR A | H240/03 | Jun 2023 | 12 | [paper](https://www.ocr.org.uk/Images/703870-question-paper-pure-mathematics-and-mechanics.pdf) | 39 m/s from 20 m up, sin θ = 5/13; max height; time to land (part (d) out of scope) | 10 | **covered** by `platform-angle` |
| 54 | OCR | 4728 M1 (legacy) | Jun 2011 | 4 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-OCR/June%202011%20QP%20-%20M1%20OCR.pdf) | Driver's v-t graph: car trip, then walks back to a shop, later jogs to the car; time in shop | – | **built**: `there-and-back` (2.5 and 7.5 m s⁻²; 225 m; 13 s in the shop) |
| 55 | OCR | 4728 M1 | Jun 2014 | 1 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-OCR/June%202014%20QP%20-%20M1%20OCR.pdf) | Thrown down at 3.5 from 5 m; rebounds and passes start 0.87 s later; rebound speed | 9.8 | **candidate**: a bounce mid-question (rebound speed found from a later time); trajectory has restitution but not a found rebound |
| 56 | OCR | 4728 M1 | Jun 2014 | 5 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/M1/Papers-OCR/June%202014%20QP%20-%20M1%20OCR.pdf) | x-t graph with speed 4 or rest; show T = 1.75; velocities; distance in 10 s | – | **built**: `xt-graph` (T = 1.75; −4, 4, 4; 25 m; t = 12 after it) |
| 57 | OCR MEI | H640/01 | Jun 2018 | 9 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/OCR-MEI/Paper-1/QP/June%202018%20QP.pdf) | Thrown horizontally at 14 m/s from a 5 m window over a 2 m fence; trajectory; range of d | 9.8 | **built**: `over-the-wall` (1.01 s; y = 5 − 0.025x²; clears for d up to 10.95 m) |
| 58 | OCR MEI | H640/01 | Jun 2018 | 14 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/OCR-MEI/Paper-1/QP/June%202018%20QP.pdf) | 5 to 11.4 m/s in 4 s, uniform, then steady at 17.8; displacement in 20 s | – | **candidate**: several stages along a line, one after another |
| 59 | OCR MEI | H640/01 | Jun 2019 | 9 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/OCR-MEI/Paper-1/QP/June%202019%20QP.pdf) | Cannonball 100 m/s at 25°; greatest height; range | 9.8 | **covered** by `arc` |
| 60 | OCR MEI | H640/01 | Jun 2022 | 7 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/OCR-MEI/Paper-1/QP/June%202022%20QP.pdf) | Thrown from 5 m above origin with velocity (14, 7); position vector; landing distance | 9.8 | **covered**: up and off a platform, but given as velocity components (14, 7), not a speed and an angle |
| 61 | WJEC | 1300U40-1 Unit 4 | Jun 2019 | 10 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/WJEC/Unit-4/June%202019%20QP%20-%20Unit%204%20WJEC%20Maths%20A-level.pdf) | Tennis serve (30i − 1.4j) from 2.4 m over a 0.9 m net; landing speed; clearance | 9.8 | **built**: `over-the-wall` (30.8 m s⁻¹; net 12 m out, cleared by 0.156 m) |
| 62 | WJEC | 1300U40-1 Unit 4 | Jun 2022 | 10 | [paper](https://pmt.physicsandmathstutor.com/download/Maths/A-level/Papers/WJEC/Unit-4/June%202022%20QP%20-%20Unit%204%20WJEC%20Maths%20A-level.pdf) | 35 m/s golf shot just clears a treetop (100, 20); two values of tan θ; distance short of the flag at 130 | 9.8 | **built**: `over-the-wall` (tan θ = 1 or 1.5; 5 m short of the flag) |
| 63 | CIE | 9709/41 | May/Jun 2019 | 2 | [paper](https://papers.xtremepape.rs/CAIE/AS%20and%20A%20Level/Mathematics%20(9709)/9709_s19_qp_41.pdf) | Up at 25 m/s from 3 m; time to top; time above 23 m; h if above h for exactly 1 s | 10 | **covered** by `time-above` |
| 64 | CIE | 9709/42 | Oct/Nov 2019 | 2 | [paper](https://papers.xtremepape.rs/CAIE/AS%20and%20A%20Level/Mathematics%20(9709)/9709_w19_qp_42.pdf) | Tractor v-t graph, 4 segments, starts at U; find V, then U from 375 m | – | **built**: `stage-by-stage` (V = 8 from stage 3 run back; U = 6 from the whole distance) |
| 65 | CIE | 9709/42 | Oct/Nov 2019 | 5 | [paper](https://papers.xtremepape.rs/CAIE/AS%20and%20A%20Level/Mathematics%20(9709)/9709_w19_qp_42.pdf) | A up at 20 m/s from ground; B dropped from 40 m 1 s later; collision height; speed difference | 10 | **built**: `pair-vertical` |
| 66 | CIE | 9709/42 | May/Jun 2021 | 6 | [paper](https://papers.xtremepape.rs/CAIE/AS%20and%20A%20Level/Mathematics%20(9709)/9709_s21_qp_42.pdf) | A up at 30 m/s; B dropped from 15 m above at the same instant; they coalesce; two landing times | 10 | **built**: `pair-vertical`, the collision (0.5 s, 13.75 m). What C does after coalescing is momentum: out |
| 67 | CIE | 9709/43 | May/Jun 2017 | 3 | [paper](https://papers.xtremepape.rs/CAIE/AS%20and%20A%20Level/Mathematics%20(9709)/9709_s17_qp_43.pdf) | Train to 25 m/s in T s, braking at twice that rate, 180 s, 3300 m; braking distance | – | **built**: `journey-stages` (T = 64, 400 m braking) |
| 68 | CIE | 9709/43 | May/Jun 2017 | 5 | [paper](https://papers.xtremepape.rs/CAIE/AS%20and%20A%20Level/Mathematics%20(9709)/9709_s17_qp_43.pdf) | Up at 12 m/s; a second particle from the same point 2 s later at 20 m/s; when and where they collide | 10 | **built**: `pair-vertical` |
| 69 | AQA Physics | 7408/1 | Jun 2019 | 04.3 | [paper](https://filestore.aqa.org.uk/sample-papers-and-mark-schemes/2019/june/AQA-74081-QP-JUN19.PDF) | Catapult releases a rock horizontally at 18 m/s from 7.5 m; range | 9.81 | **covered** by `platform` |
| 70 | OCR A Physics | H556/01 | Jun 2019 | 19(a) | [paper](https://pmt.physicsandmathstutor.com/download/Physics/A-level/Past-Papers/OCR-A/Paper-1/QP/June%202019%20QP.pdf) | 18 m/s, 0.50 s reaction, stops in 38 m; deceleration | – | **built**: `stage-by-stage` (9 m thinking; 29 m braking; 5.59 m s⁻²) |
| 71 | CIE Physics | 9702/22 | Oct/Nov 2018 | 1 | [paper](https://papers.xtremepape.rs/CAIE/AS%20and%20A%20Level/Physics%20(9702)/9702_w18_qp_22.pdf) | Golf ball 6.0 m/s with vertical component 4.8, apex at 0.49 s; component-time sketches; max height | 9.81 | **candidate**: component–time sketches of a projectile; the graphs show them, but the question gives a component, not a speed |
| 72 | Edexcel Physics | 9PH0/01 | Jun 2018 | 18(b) | [paper](https://pmt.physicsandmathstutor.com/download/Physics/A-level/Past-Papers/Edexcel/Paper-1/QP/June%202018%20QP.pdf) | Ball bearing rolls off a bench through two foil strips 0.50 m apart, 0.14 s; speed; is a strip 8 cm lower hit at its centre? | 9.81 | **built**: `off-the-bench` (3.57 m s⁻¹; drops 0.0961 m, so 0.0161 m below the centre) |
| 73 | Edexcel | 6677/01 M1 | Jun 2015 | 8 | [paper](see) | 4 kg on a rough incline with a pulley to a hanging 0.5 kg | 9.8 | **out**: connected particles, friction on an incline |
| 74 | Edexcel | 6677/01 M1 | Jun 2013 | 8 | — | 2m on a smooth table, 3m hanging over a pulley | 9.8 | **out**: connected particles over a pulley |
| 75 | Edexcel | 6677/01 M1 | Jan 2012 | 8 | — | 4 kg pushed up a rough 30° slope at 16 m/s; R, μ; distance after the force is removed | 9.8 | **out**: forces on a rough slope |
| 76 | Edexcel | 8MA0/22 (AS) | Jun 2019 | 2 | — | Pulley: 0.8 kg on a table, 0.6 kg hanging 0.4 m above the floor; a = 4.2; time to reach the pulley | 9.8 | **out**: connected particles over a pulley |
| 77 | OCR MEI | H640/01 | Jun 2019 | 16 | — | 2 kg down a 20° slope at 1.4 m/s; smooth model vs rough model | 9.8 | **out**: forces on a slope |
| 78 | OCR | 4728 M1 | Jun 2014 | 7 | — | Two tied particles projected down a 30° slope at 0.6 m/s, a = 0.9 | 9.8 | **out**: forces on a slope; only part (i) is SUVAT |
| 79 | OCR | 4728 M1 | Jun 2011 | 2 | — | Pulley, 0.45 kg and m kg, 0.36 m above a surface, a = 0.98 | 9.8 | **out**: connected particles over a pulley |
| 80 | CIE | 9709/41 | May/Jun 2019 | 6 | — | Connected particles on a smooth slope, pulley, energy method | 10 | **out**: connected particles, energy |
| 81 | CIE | 9709/42 | May/Jun 2021 | 7 | — | Piecewise acceleration a(t), no jumps in velocity | – | **out**: variable acceleration a(t), calculus |
| 82 | OCR A | H240/03 | Jun 2018 | 11 | — | v = kt + 0.03t² for 20 s, then constant 1.3 m/s² up to 25 m/s | – | **out**: variable acceleration, calculus |
| 83 | Edexcel | 9MA0/32 | Jun 2023 | 3 | — | v = (t² − 3t + 7)i + (2t² − 3)j | – | **out**: variable acceleration in i and j, calculus |
| 84 | OCR A Physics | H556/01 | Jun 2019 | 17 | — | Hollow ball falling with drag, v-t curve tangent | 9.81 | **out**: air resistance and a v–t curve |

## Built, and why it is built the way it is

### `pair-vertical` — Two in one vertical line

**Papers.** CIE 9709/42 Oct/Nov 2019 Q5 (A up at 20 from the ground, B dropped
from 40 m one second later: collision 8.75 m up, speeds differ by 10). CIE
9709/43 May/Jun 2017 Q5 (two projected up from O, at 12 and then 20 two seconds
later: t = 1/7 s after the second, 2.76 m up). CIE 9709/42 May/Jun 2021 Q6, its
collision only (up at 30, one let go 15 m above at the same instant: 0.5 s,
13.75 m); the rest of that question is momentum.

**Why the twelve cannot.** Every one of them is one object, or a second object
derived from the first at the same instant (the released round, the monkey).
None has two independent motions with two start times, and none asks when two
heights are equal.

**How it is solved.** Up positive, heights from the ground, one clock. Each
particle is SUVAT with a = −g from the moment it sets off:
y = h + u(t − t₀) − ½g(t − t₀)². Set the two equal. When both are free the t²
terms cancel — both fall with the same g, so relative to each other neither
accelerates — and the meeting is one linear equation. The height and both
velocities follow.

**What moves, in which phases.** Each particle is held where it starts until
its own start time, then free, then at rest on the ground. That is a motion in
stages (`js/core/stages.js`), and the meeting is the first root of the
difference of two piecewise quadratics while both are above the ground. Held
counts: a particle can be reached before it is let go.

**The stage.** One vertical line, tall rather than wide. A height scale, the
ground, a tower with a ledge for any particle that starts above the ground. A
and B on the line; each one's equal-time marks on its own side so the two
strobe pictures read against each other; velocity arrows in the velocity hue,
solid because vertical; the gap between them as a solid teal bracket; a burst
and a line across at the meeting height once it has happened.

**Graphs.** Height–time (two parabolas that cross at the meeting),
velocity–time (two parallel lines once both are free: the reason the t² terms
cancel), acceleration–time (B is 0 while held, then −g).

**Working.** Each height multiplied out, the two set equal, the cancelling,
t, the height, both velocities with signs, then the speed difference and the
closing speed.

**What the student varies.** Each particle's start height, signed initial
velocity and start time, and g (9.81, 9.8 or 10 one press away).

**What makes it general.** Any two vertical motions on one line: up then
dropped, up then up, dropped then thrown down, both at once, one released late,
on any g including none. It can fail — one lands first, they are never in the
air together, one stays above the other — and says which, because the meeting is
found, never constructed (the old "Two that collide" card was removed for being
built so it could not miss; see `design/presets.md`).

### `journey-stages` — A journey in stages

Replaced `journey-3`, "A journey in three stages", on 29 Oct 2026: the three-stage
trapezium is one case of it, and every paper below still solves the same way.

**Papers.** Edexcel 6677/01 M1 Jun 2012 Q4 (a car holds 20 m s⁻¹ for 25 s, brakes
at 0.4 to 8, holds 8 for 60 s, speeds up to 20 at B; 1960 m: braking 30 s, 155 s in
all). Edexcel 6677/01 M1 Jun 2011 Q4 (a girl's 400 m in 84 s: 4 s up to 5 m s⁻¹, 60 s
steady, 20 s slowing to V: 310 m in the first 64 s, V = 4, 0.05 m s⁻²). Edexcel 6677/01 M1 Jun 2015 Q7 (a₁ = 0.5, a₃ = 0.25, 5 min, 6.3 km:
V = 30, the root 70 rejected). Edexcel 8MA0/22 Jun 2022 Q2 (V = 25, braking four
times as long as accelerating, 700 s, 15 km: 40 s, 0.625 m s⁻², 20 m s⁻¹ at
572 s). CIE 9709/43 May/Jun 2017 Q3 (V = 25, deceleration twice the
acceleration, 180 s, 3300 m: T = 64, 400 m braking). Edexcel 8MA0/02 Jun 2018
Q7 (0.3 for 80 s, then −0.5, 4800 m: 264 s). Edexcel IAL WME01 Jan 2019 Q6
(60 s and 30 s, 270 s, 4.5 km: V = 20, halfway at 142.5 s, V⁄4 at 15 s and
262.5 s). Edexcel M1 Jan 2012 Q6 (accelerating for a third of the steady time,
885 m: T = 48, a = 0.9375). Edexcel M1 Jun 2013 Q5(b), the car (T = 75).

**Why the twelve cannot.** The road takes one stretch of constant acceleration.
None of the twelve has a motion that changes its acceleration twice on a
schedule, and none takes a whole time and a whole distance as the givens.
The parachute has three stages but they are set by a deceleration and a
terminal speed, falling under g.

**How it is solved.** By hand: one quantity is the unknown — V when the paper
leaves it out, otherwise the time the paper names (t₁ for "four times as
long", t₂ for "a third of the steady time") — and every stage's time is
written in terms of it. The leftover equation, almost always the area
D = ½(T + t₂)V, finds it: linear when V is given, a quadratic in V when not,
whose second root makes a stage's time negative and is rejected for that
reason, in the working. Then each stage's distance (two triangles and a
rectangle), and the questions about a moment: the speed at a time, the time at
a distance (halfway), the two times at a speed.

**What moves.** One traveller, stages of constant acceleration in a row,
built on the stages engine (`js/core/stages.js`).

**The stage.** The paper's own speed–time sketch — speeds on the speed axis,
the times of the changes on the time axis, dashed lines to each corner — filling
with the displacement colour as the clock runs, each stage's area named once
passed, each stage bracketed with its time; and below it the way from A to B as
the question has it (traffic lights for a car from or to rest, stations for a
train, a running track with its start and finish), the stretches marked, the
traveller, its equal-time marks and its velocity and acceleration.

**Graphs.** Displacement–time (two parabolic ends and a straight middle),
velocity–time (the paper's graph, area shaded), acceleration–time (a step per stage).
All dashed: the motion is along a horizontal track.

**What the student varies.** How many stages (2 to 6) and what each does —
speeds up, holds its speed, slows down — then any of: the speed at A, each
stage's end speed, rate and time, the whole time and distance, a relation
between two stages' times or rates (k × another), and up to three questions:
speed and distance at a time, time at a distance, every time at a speed. More
than enough is checked against itself. The traveller (car, train, runner,
cyclist, motorcycle) is the picture only.

**What makes it general.** Any journey of steady-rate stages along a line,
starting and ending at any speed, whatever one thing the paper leaves out —
including the trapezium, the triangle and the quadratic in V. Not yet: a stage
that goes backwards (OCR 4728 Jun 2011 Q4's walk back to the shop), or a
journey with two unknowns that need two equations at once.

### `two-on-a-road` — Two on a road, or on two tracks

**Papers.** OCR A H240/03 Jun 2022 Q9 (A at 20 m s⁻¹ slows to 8 over 30 s and
holds it; B steady at 12: A decelerates at 0.4, and B overtakes at t = 45 s).
Edexcel M1 Jun 2013 Q5(c, d), the motorbike (leaves the lights 10 s after the
car, from rest at constant a, passes it at 990 m: 50 s, a = 0.792 = 99⁄125).
Edexcel 8MA0/22 Jun 2023 Q1 (Pat 5 s to 4 m s⁻¹, Sam at 1 m s⁻² to X, both
27.5 s: X = 3.92). Edexcel IAL WME01 Jun 2022 Q7 (Ajaz at 0.8 to 4 m s⁻¹,
Beth at 1 m s⁻² for T s, 100 m together: 27.5 s, T = 3.915, speeds differ by
0.085). Edexcel M1 Jun 2016 Q4 (train M passes train N at the trackside point X
at 40 and 30 m s⁻¹; M holds 40 for T s, N holds 30 for 25 s, each then brakes
uniformly to rest beside Y, the same time from X to Y, XY = 975 m: T = 8.75).
Edexcel M1 Jun 2010 Q5 (car P at 25 passes car Q at 20; P brakes from T, Q from
25 s, both stop at X 800 m on at the same instant: T = 9).

**Why the twelve cannot.** The road has one vehicle and one stretch of
constant acceleration. Nothing among the twelve has two independent motions on
one line, and the vertical pair (`pair-vertical`) has both under g.

**How it is solved.** Each of the two is a motion in stages — waiting until
its start, changing speed at a constant rate for a while, then holding a speed
— and every moment they are level is found by the stages engine as the roots
of a piecewise quadratic. When the paper hides one number (an acceleration, a
speed reached, the time spent reaching it), the other's time at the line (or
place at the time) is worked out first, and the hidden one comes from one
equation — the area under its speed–time graph — linear in a, a quadratic in V
or in the time, as the mark schemes write it (½T × T + T(27.5 − T) = 100). The
root that would need longer to reach its speed than there is time is rejected,
and says so.

**The stage.** Both speed–time graphs on one pair of axes (A in the velocity
hue, B in the second-object stone, both dashed: along the road), with each
moment they are level marked; below, the road in two lanes, the start, the line
the paper names, equal-time marks, the gap between their fronts and each
meeting across both lanes.

**Graphs.** Displacement–time (the two curves crossing where they are level,
ringed), velocity–time, acceleration–time, both on each, broken at every change
of acceleration.

**Coming to rest at the line (added 29 Oct 2026).** Each may hold its first
speed for T s before it changes speed, and may be marked to end its change at
the line (to rest there, with V blank). The line then fixes its rate from the
area, s = uT + ½ut, and the other one's time to the line, with
s = uT + ½u(t − T), gives the hidden T (975 = 40T + ½ × 40(40 − T), T = 8.75).
The two stopping together is one event, not "the same motion twice". The stage
shades the area under each line so far (displacement hue, A solid, B hatched),
rings where the two lines cross (the same speed), drops each T to the time
axis, and can be drawn as two trains on parallel tracks between the trackside
posts X and Y.

**What the student varies.** For each: when it sets off, its starting speed,
how long it holds it, a head start, and any two of its acceleration, the speed
it changes to and the time that takes (one alone: it keeps accelerating), or
that it comes to rest at the line. Optionally one of those to find, from a line
or a time at which they are level. And whether it is drawn as cars or trains.

**What makes it general.** Any two side by side whose speed changes once,
before or after a held speed: overtaking, catching up, a delayed start, a race
to a line, finishing together, braking to rest together.
Not yet: a vehicle with three stages of its own all the way to B (the car in
J13 brakes at the end; the meeting at 990 m comes before that, so it does not
matter here) — the stages engine already takes those.

### `vectors-ij` — Moving in a plane, in i and j

**Papers.** AQA MM1B Jun 2012 Q7 (from O, u = −i + 3j, a = 0.1i − 0.2j: due
east of O at 30 s; moving south-east at 20 s with v = i − j, 1.41 m s⁻¹). AQA
MM1B Jan 2013 Q7 (from 13.6i, u = 6i + 2.4j, a = −0.8i + 0.1j: moving
north-west at 12 s, at 28i + 36j, 45.6 m from O). Edexcel 9MA0/32 Oct 2020 Q2
(u = −2i + 2j, a = 4i − 5j: v at t = 2 is 6i − 8j; passes (λ, −4.5) at 1.8 s,
λ = 2.88). OCR A H240/03 Jun 2023 Q8 (a = 3i − 2j, v = 6i at t = 4: u =
−6i + 8j, speed 10).

**Why the twelve cannot.** Every one of the twelve is a projectile in a
vertical plane under g, or one line. None takes a velocity or an acceleration
as a vector, and none asks for a direction of motion or a direction from O.

**How it is solved.** v = u + at and r = r₀ + ut + ½at², each two SUVAT
equations side by side. A direction of motion is one relation between the two
velocity components (due east: v_y = 0; south-east: vₓ = −v_y), linear in t,
checked for pointing the right way; a direction from O the same for the
position, a quadratic; a coordinate is one component equation; a speed is
vₓ² + v_y² = S². A velocity at a later time is run back: u = v − aT.

**The stage.** A map from above, i east and j north at one scale, the
path in the path colour, the position vector from O (displacement), the
velocity arrow with its components when asked (i dashed, j solid), the
acceleration, a north arrow, each answer ringed with its time.

**Graphs.** Position, velocity and acceleration against time, each as its i
part (dashed) and j part (solid).

**What the student varies.** Start, initial velocity (or a velocity at a
given later time) and acceleration as i and j parts; questions: a time, an x
or y coordinate, a speed, a direction of motion, a direction from O.

**What makes it general.** Every one-particle i–j question with constant
acceleration. Not yet: two particles in i and j (ships, birds — Edexcel M1
Jan 2012 Q7, Jun 2017 Q7, IAL Jan 2019 Q2), a bearing in degrees, or a
direction given as a vector rather than a compass point.

### `over-the-wall` — Over the wall, through the point

**Papers.** Edexcel 9MA0/32 Jun 2023 Q5 (28 m s⁻¹ from the ground through a
point 40 m across and 20 m up: tan²α − 4 tan α + 3 = 0, so tan α = 1 or 3;
the greatest possible height on the way is 36 m). WJEC Unit 4 Jun 2022 Q10
(35 m s⁻¹ just over a treetop at (100, 20): tan θ = 1 or 1.5; landing short
of the flag at 130 m, at best by 5 m). AQA MM1B Jan 2013 Q8 (hits a wall
38.4 m away, 3 m up, after 2.4 s: horizontal velocity 16 m s⁻¹, V = 20.6 m s⁻¹,
α = 39.1°). Edexcel 9MA0/03 Jun 2018 Q10 (from 2 m, greatest height 3 m,
target 20 m out at 0.75 m: α = 14.0°, 1.13 s to the target). WJEC Unit 4 Jun
2019 Q10 (served at 30i − 1.4j from 2.4 m: lands at 30.8 m s⁻¹; above the
0.9 m net at 0.4 s, 12 m out, clearing it by 0.156 m). OCR MEI H640/01 Jun
2018 Q9 (thrown horizontally at 14 m s⁻¹ from 5 m: down in 1.01 s; path
y = 5 − 0.025x²; a 2 m fence is cleared anywhere up to 10.95 m out).

**Why the twelve cannot.** The twelve launch a projectile and report where it
lands and how high it goes. None has a point the flight must pass, so none can
say whether it clears a wall or by how much, none solves for the angle or the
speed from a point (a quadratic in tan θ with two roots), none takes a launch
from the time to a point or from the greatest height, and none writes the
path as an equation in x.

**How it is solved.** x = uₓt and y = h₀ + u_y t − ½gt², read at the point.
Given the launch: t = d/uₓ, then y, then y − H. Finding the angle: the path
y = h₀ + x tan θ − gx²(1 + tan²θ)/(2u²) at (d, H) is a quadratic in tan θ,
put in whole numbers when it has them; no real root says the highest it can be
there. Finding the speed: u² = gd²/(2cos²θ (h₀ + d tan θ − H)), refused when
the point is on or above the straight line at θ. From the time T: uₓ = d/T and
u_y from the vertical equation. From the greatest height: u_y² = 2g(H_max − h₀),
the times at the point's height (a root at or before launch rejected, and
said), and uₓ = d/t. A wall, net or tree that is not cleared is hit, and the
flight stops there. Where a wall of that height could stand comes from the
times the path is at that height.

**The stage.** Side on at one scale both ways, so angles are true: the ground
with distances, a stand for a raised launch, the angle at the launch, the wall
(or net, tree, wall it hits, target ring) with its height and distance as
dimension lines, a flag when the paper has one. The path flown in the path
colour; a second answer faint beside it, with its angle. At the point, a
marker says how much it clears by, or where it hits. Velocity with components
(across dashed, up solid), acceleration, greatest height when asked.

**Graphs.** Displacement, velocity and acceleration against time, each as its
across part (dashed) and up part (solid), the moment at the point ringed.

**What the student varies.** Launch height, speed and angle or the two
components; the point's distance (or the time it is above it) and height, and
what stands there; which number to find (angle, speed, or both from a time or
a greatest height); which of two answers to fly; a mark on the ground.

**What makes it general.** Every one-point projectile question on level
ground. Not yet: symbolic papers (OCR H240/03 Jun 2019 Q8; OCR H240/03 Jun
2022 Q13, where the wall and the landing are in terms of a), and a launch fixed
by two points rather than one point and one number.

### `bounce` — A ball that bounces

**Papers.** Edexcel M1 Jun 2014 Q3 (released from rest 2 m above horizontal
ground, rises to 1.5 m after the bounce: 6.26 m s⁻¹ just before, 5.42 m s⁻¹
just after, a velocity–time sketch down positive, 1.75 s to the second
impact; the impulse in (c) is out). Edexcel M1 Jun 2018 Q4 (thrown down from
A, 2.5 m up, rebounds at 10 m s⁻¹: 0.11 s from the impact to B, 1 m up, and a
velocity–time sketch from A to B; part (a) finds the throw speed, 24 m s⁻¹,
from an impulse — out of scope, so the student gives the throw speed or the
impact speed, 25 m s⁻¹, instead).

**Why the twelve cannot.** The stadium's bounce is a restitution slider on a
projectile: it never takes a rebound speed or a rebound height, never says the
speeds either side of an impact, never answers when the ball is at a height
after a bounce, and its graphs join the impact with a line.

**How it is solved.** A staged motion (js/core/stages.js): `toLevel` for the
first flight, `rebound` for each one after it, the velocity jumping at each
impact. The throw is any two of the height, the throw speed and the impact
speed (v² = u² + 2as); the bounce is any one of the rebound speed, the height
it rises to (0 = u² + 2as at the top) or the fraction it keeps. Times between
impacts are 2u⁄g; a height is s = ut + ½at² in the flight it falls in, every
root kept that is in the run.

**The stage.** A balcony on a brick wall at the start height over a hard court;
the ball at a real size sitting on the ground at impact, its shadow, a squash
and a burst as it lands; the start height and each rebound height as
displacement brackets; B as a lime line with its times ringed; each impact's
speeds in and out; the sign convention stated with an arrow.

**Graphs.** Height–time (arcs with cusps at the ground); velocity–time in the
paper's convention, the line stopping at each impact and starting again on the
other side of zero, a dashed upright between, as the mark schemes sketch it;
acceleration ±g, broken at each impact.

**What the student varies.** Released, thrown down or thrown up; height, throw
speed, impact speed; rebound speed, rebound height or fraction; impacts to
watch (1 to 6); a height to ask about, and whether the run stops the first
time it is there after the bounce; up or down positive; g.

**What makes it general.** Every one-ball vertical bounce question where the
rebound is given. Not yet: a rebound found from a later event (OCR 4728 Jun
2014 Q1, row 55: passes its start 0.87 s after the throw — the rebound speed is
the unknown), or one found from an impulse (momentum: out).

### `from-a-height` — From a cliff or a tower

**Papers.** Edexcel M1 Jun 2010 Q6 (thrown up at 14.7 m s⁻¹ from 49 m above the
ground: greatest height 60.0 m, lands at 34.3 m s⁻¹ after 5 s). Edexcel M1 Jun
2012 Q5 (thrown up from 17.5 m, lands at 28 m s⁻¹: U = 21, and 19 m above the
start at 1.30 s and 2.99 s; the part in the water is another topic). Edexcel
9MA0/32 Oct 2020 Q5 (from a 25 m cliff at 45°, lands 100 m out: U = 28,
greatest height 45 m).

**Why it is built.** A SETTING scene: the twelve's engine already solves these
(`solveLaunch`), but none of the twelve shows a cliff over the sea or a tower,
so the throw started floating in the air with nothing under it. The user's
standard is that the scene looks like the place in the question.

**How it is solved.** By the twelve's own solver and flight; the times at a
height are `timeAbove`. No physics is new.

**The stage.** Side on at one scale both ways: sky, a rock cliff with strata
and grass over the sea's swell, or a stone tower on level ground; the thrower
at the edge; the height and the landing distance as dimension lines; a height
asked about as a marker line, ringed where it is crossed; velocity with its
components (across dashed, up solid), acceleration, greatest height when asked.

**What the student varies.** The place, its height, the angle (90 up, 0
across, −90 down) and the speed — or instead the landing speed, how far out,
the time, or the time to the top (u sin θ = gt); the height may be left blank
when the time in the air is given; and a height above the throw to ask about.
Also: Edexcel IAL WME01 Oct 2021 Q6 (v = 0 at 2.5 s, lands at 7 s: u = 24.5,
the start 68.6 m up) and AQA 7357/2 Jun 2018 Q16 (35°, top after 1.5 s, lands
10 m below: u = 25.6, 3.57 s).

**What makes it general.** Every throw from a height onto level sea or ground —
and the same scene as a bridge over a river, a diving board over a pool, a
well (straight down to its water) and a rising balloon that lets a stone go
(it starts moving up at the balloon's speed). A table edge is `off-the-bench`.

### `catch-it` — Thrown, chased and caught

**Papers.** AQA 7357/2 Jun 2023 Q20 (a ball thrown from 1.8 m at 14 m s⁻¹, 60°;
a dog sets off from rest 0.2 s later and catches it 0.3 m above the sand:
caught at t = 2.59 s, 18.15 m out, so a = 6.34 m s⁻²).

**Why the twelve cannot.** Each of the twelve is one object. None has a second
moving along the ground after a projectile, starting later, to meet it.

**How it is solved.** The twelve's `flight` for the ball; the later root of
the vertical equation at the catch height gives the time; x = uₓt the place;
the dog's one equation, over its own running time t − t₀, the hidden number.

**The stage.** A beach: sky, a strip of sea, sand; the thrower standing with
the launch height marked; the dog waiting, then galloping out with its
velocity along the sand (dashed); the ball's arc with its velocity and
components; the catch ringed with its time, height and distance.

**What the student varies.** The throw (height, speed, angle), the catch
height, and the dog's delay, starting speed and acceleration — any one of the
three can be the number to find.

### `there-and-back` — There and back: a graph in segments

**Papers.** OCR 4728 M1 Jun 2011 Q4 (a car from rest to 15 m s⁻¹ in 6 s,
steady for 11 s, to rest in 2 s; the driver walks back at 2 m s⁻¹ for 20 s
to a shop, then jogs back at 5 m s⁻¹, at the car 60 s after the start:
accelerations 2.5 and 7.5 m s⁻², the car travels 225 m, 13 s in the shop).

**Why the twelve cannot.** None takes a motion as a graph of segments, and
none goes back the other way, stops, and sets off again.

**How it is solved.** Each segment is constant acceleration: a = (v − u)/t,
s = ½(u + v)t. A moving segment's missing time from where it ends (the area
from the segment it returns to sums to zero); a stop's from the total time.

**The stage.** The (t, v) graph on the stage, shaded as it is swept, above a
road with the car, its driver on foot, and the shop.

**What the student varies.** Up to six segments: who moves, the velocity each
starts at (a jump) and ends at, its time; the total time; where it ends.

### `parachute-stages` — A parachute jump in stages

**Papers.** Edexcel 8MA0/22 (AS) Jun 2019 Q1 (free fall for 3 s, then
slowing at 12 m s⁻² for 2 s, then steady to the ground; 550 m, g = 10: 30 and
6 m s⁻¹, 78.2 s at the steady speed, T = 83.2 s).

**Why it is built.** The twelve's parachute takes a steady speed and the air's
effect; this paper gives a braking time instead, which is three stages of
constant acceleration — the library's journey in stages, read downwards. No
new physics; a new scene: the drop drawn to scale from an aircraft to fields.

**The stage.** Sky, the aircraft, the fields, a height ruler, the jumper in
free fall and under the canopy, a marker where each stage begins.

**What the student varies.** g, the height or the total time, the free fall's
time or speed, the braking's rate and time or the steady speed.

### `two-in-a-plane` — Two ships, in i and j

**Papers.** Edexcel M1 Jan 2012 Q7 (boats at −4i + 8j from 2i − 8j and
18i + 12j − t(6i + 8j): P due west of Q at t = 1.25 h, 13.5 km apart). Edexcel
M1 Jun 2017 Q7 (ships at 9i − 2j and 4i + 8j from 9i + 10j and i + 4j:
bearing 103°, 10 km apart at t = 0 and 0.32 h). Edexcel IAL WME01 Jan 2019 Q2
(birds from 20i − 17j at −6i + 7j and from −8i + 9j at p(i + 2j); B south-west
of A at t = 4: bearing 319°, p = −0.5, B at 1.12 m s⁻¹).

Edexcel IAL WME01 Oct 2021 Q8 (a ship from −2i + 9j at 7 am, at 4i + 6j at
7.36: v = 10i − 5j; a lighthouse due east at 8.48 and north-east at 9: at 19i;
the ship due south of it at 19i − 1.5j).

**Why the twelve cannot.** None has two objects in a plane; the library's
"Moving in a plane" has one. A velocity can come from two positions, and a fixed point (a
lighthouse) from two sightings: where the two lines of sight cross.

**How it is solved.** Δ = r_A − r_B is linear in t: a compass direction is one
relation between its parts (linear), a distance is |Δ|² = d² (quadratic), and p
enters linearly at the given time. Bearings from tan⁻¹ by quadrant.

**The stage.** A map from above at one scale: sea (or sky), both tracks, ships
or birds pointing their way, the vector from B to A, each moment ringed, north.

### `three-models` — Braking for a sign: three models

**Papers.** Edexcel IAL WME01 Oct 2021 Q3 (25 m s⁻¹, a sign 48 m ahead,
braking at 6 m s⁻²: model 1 reaches it at 7 m s⁻¹; model 2, braking to 13 and
holding, at t = 2.77 s; model 3, after 0.2 s at full speed, at t = 2.58 s).

**Why it is built.** Each model is three stages of constant acceleration — the
library's journey engine solves each — but no scenario shows one question
under several models side by side, which is what the paper is about.

**The stage.** Three lanes of one road, the same car in each, the same
speed-limit sign; one clock; each car's time and speed at the sign.


### `off-the-bench` — Off the bench, through the foil

**Papers.** Edexcel 9PH0/01 Jun 2018 Q18(b)(iii)(iv) (a ball bearing leaves a
bench and breaks two foil strips 0.50 m apart, 0.14 s apart: 3.6 m s⁻¹; the
second strip's centre is 8.0 cm lower, but it has dropped about 9.6 cm there,
so it is not broken at its centre). Parts (i)(ii), the capacitor, are out.

**Why it is built.** The speed comes from a timing between two strips, then
the drop at the second is compared with where a strip was set: no scenario
times a speed between two gates or asks whether a point is hit at its centre,
and none is set at a bench or a table.

**The stage.** Side on, measured from the edge: the end of a laboratory bench
with the launcher on it, each strip on a clamp stand with its centre marked and
torn where the ball goes through; the gap and how much lower as dimension
lines; where it breaks the second ringed, with how far from the centre. As a
table: a table, the floor, the height and how far out it lands.

**What the student varies.** Bench or table; the speed, or the strips' gap and
time, or the height and how far out it lands; how much lower the second strip
is; the height of the edge; g.

### `wall-in-a-letter` — Over the wall, in a letter

**Papers.** OCR A H240/03 Jun 2022 Q13(b)(c)(d) (from O on level ground it
just clears a wall half of a high, a from O, and lands 3a beyond it: the angle
33.7°; with a speed of 54.6 m s⁻¹, a = 70.2; the greatest height 2a/3 = 46.8 m).
Part (a), deriving the path, is its first working row; (e) is the model card.

**Why it is built.** Every length is a letter, and the launch is fixed by two
points on the path rather than given: `over-the-wall` takes numbers and one
point. Here the letter cancels and the angle is found from the shape alone.

**The stage.** Side on: sky, level ground, O with the angle, a brick wall the
path just grazes, where it lands, the greatest height; each length labelled in
the letter and in metres at once.

**What the student varies.** Where the wall is, how high, and how far beyond it
it lands (each a multiple of a); then the speed, or a; g.

### `stage-by-stage` — Stage by stage along a line

**Papers.** AQA MM1B Jan 2013 Q1 (a car slows uniformly from 20 to 12 m s⁻¹
over 640 m, then speeds up uniformly over 1820 m in 70 s: 40 s; a deceleration
of 0.2 m s⁻²; 0.4 m s⁻²; 40 m s⁻¹; an average of 22.4 m s⁻¹ over 2460 m).
OCR A H240/03 Jun 2019 Q7 (a cyclist from rest at 1.5 m s⁻² for 4 s, then
steady: 48 m in 10 s). OCR A Physics H556/01 Jun 2019 Q19(a) (18 m s⁻¹, a
0.50 s reaction, stopped in 38 m in all: 5.59 m s⁻²). CIE 9709/42 Oct/Nov 2019
Q2 (a tractor in four stages from U: up to V in 5 s, steady 25 s, up to 12 at
0.8 m s⁻² in 5 s, to rest in 15 s; 375 m in all: V = 8 carried back from the
third stage, U = 6 from the whole distance). Edexcel IAL WME01 Oct 2023
Q2 (an acceleration–time graph from A at 8 m s⁻¹: −0.5 for 4 s, 0 for 6 s, 1.2 for
10 s, each a stage of a and t: v = 18 at B; AB = 184 m).

**Why it is built.** Each stage is a SUVAT question of its own, but the next
one starts where the last ended, and a stage may be short of a number the
whole distance or time supplies. `journey-stages` is rest to rest in three set
stages; `there-and-back` is a graph of given speeds. Neither solves a stage
from whatever three it is given.

**The stage.** Side on at one scale: the race track (or road, or rails), a
numbered post where each stage begins, each stage's distance and time under
it, what it does over each, the speeds at the posts, the vehicle moving.

**What the student varies.** Car, cyclist or train; up to four stages, any
three of s, u, v, a, t each (a start left blank carries the last end); the
whole distance or time.

### `do-they-collide` — Two on a surface: do they collide?

**Papers.** AQA MM1B Jun 2014 Q7 (A from O with velocity 4i + 2j and
acceleration −0.4i; B from 11.2i with 0.4i + 0.6j and 0.2j: A is at 20i + 20j
after 10 s; the j parts are equal at t = 0 and 14, the i parts at t = 14 too, so
they collide there, at 16.8i + 28j).

**Why it is built.** `vectors-ij` is one particle; `two-in-a-plane` is two at
constant velocities. Two with accelerations make each part a quadratic, and a
collision needs the two parts' roots to agree.

**The stage.** From above at one scale both ways: the surface, grid and axes,
both curved paths, a puck for each with its velocity, the collision ringed with
its time and position.

**What the student varies.** Each particle's start, velocity and acceleration
in i and j; a time to give both positions at.

### `two-moments` — In i and j, known from two moments

**Papers.** Edexcel 9MA0/03 Jun 2018 Q8 (from O with 2i − 3j, at 7i − 10j two
seconds later: a = 1.5i − 2j, of size 2.5 m s⁻²; then a new acceleration
4i + 8.8j from that point: moving north-east 2.5 s later). Edexcel IAL WME01
Jun 2022 Q6 (velocity −i + 4j at t = 1 and 5i − 8j at t = 4: a = 2i − 4j; at
t = 3.5, v = 4i − 6j and the speed 7.21 m s⁻¹).

**Why it is built.** `vectors-ij` is given the acceleration (and one
velocity); these papers give two moments instead and the acceleration has to
come out of them, and in 9MA0/03 it then changes partway through.

**The stage.** From above at one scale both ways: the plane, grid, O and
north; the path in the displacement hue; the second moment marked, with the
change; the asked moments ringed; the puck with its velocity and acceleration.

**What the student varies.** The start, a velocity (at any time), the
acceleration or not; the second moment (a position or a velocity, and when);
a new acceleration; a time to ask about; a compass direction.

### `xt-graph` — Read the displacement–time graph

**Papers.** OCR 4728 M1 Jun 2014 Q5 (a (t, x) graph of straight pieces, the
speed 4 m s⁻¹ or at rest: from 5 m to 0 by t = 3, so T = 1.75; velocities −4, 4
and 4 at t = 2, 8, 9; 25 m travelled in 10 s; after t = 10, x = 20t − t² − 96, so
the speed is 4 again at t = 12).

**Why it is built.** `there-and-back` reads a velocity–time graph; nothing
reads a displacement–time graph, where a velocity is a gradient and a flat
piece is standing still, nor joins one to a motion given as a formula.

**The stage.** The (t, x) graph above as the paper draws it, the line below
with A and the particle moving on it, one clock.

**What the student varies.** The start and up to six corners, one time
blank; the speed of the moving pieces; velocities at three times; the
formula after the graph and a speed to find.

### `robots-closest` — Two robots on a floor: when are they closest?

**Papers.** Edexcel IAL WME01 Jun 2023 Q8 (a 50 m square floor, centre O; R
from −2i + j to 9i + 23j in 11 s, so i + 2j; S from the corner C at −i − j:
SR = (2t − 27)i + (3t − 24)j, least at t = 126⁄13 ≈ 9.69 s, about 9.15 m).

**Why it is built.** `two-in-a-plane` finds when two are due a direction or a
given distance apart; nothing finds the least distance, and nothing is set on
a floor with edges.

**The stage.** From above: the tiled floor ABCD with O, two robots and their
tracks, the vector between them now, the closest moment ringed.

**What the student varies.** Each robot's start and velocity (R's from a later
position and time instead); the floor's side.

### `two-up-letters` — Two thrown up, in letters

**Papers.** Edexcel IAL WME01 Jan 2020 Q3 (P up from O at U; at its greatest
height H, Q up from O at ½U: H = U²⁄(2g); they collide U⁄g after Q is projected,
at O itself).

**Why it is built.** `pair-vertical` takes numbers and treats the start as the
ground; here every answer is in U and g, and O is only a point they can meet
at. Run in units of U⁄g and U²⁄g, each answer is a number times its letters.

**The stage.** One vertical line through O, P and Q side by side, H marked in
letters, the collision ringed with τ and the height in letters.

**What the student varies.** Q's speed as a multiple of U; Q at P's top or a
multiple of U⁄g later; numbers for U and g, optionally.
