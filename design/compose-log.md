# Component factory — the log

Short notes, newest first. Batches 1–29 are in the git history ("Component factory batch N").

## Batch 31 — 3 Nov 2026

- **rugby** (backdrop, js/render/places.js): a rugby ground — the stand and its crowd, striped
  turf, the try line, the 22 and 10 m dashes; the H-posts (white uprights, padded feet, the
  crossbar at 3 m) stand where the engine's path comes down through 3 m, or past where it lands
  if it falls short; touch judges at the posts, flags down. "the posts" alone is not rugby
  (roadside posts P, Q, R). Tests in test/compose.test.mjs. Two UI rounds: a real H with a level
  crossbar, the posts where the kick is 1.2 m (or 18 px) over the bar, a short kick landing well
  before them, touch judges behind the posts raising their flags and the bar glowing at the
  engine's crossing moment (composed.js now passes `when` and `now` to place drawings). Deployed.
  Live Ask Suvat check to do (after 00:00 UTC).

## Batch 30 — 3 Nov 2026

- **trampoline** (launcher, js/render/launchers.js): a garden trampoline side on — black mat in
  a ring of springs, blue pad, W legs; the mat sags under the jumper and springs back, ringing
  down, as the engine lets go. The person rides upright on the engine's point, arms up, knees
  bending to land. Heights from the mat: it lands back on it, no dust. "trampolinist" is a person.
- **mineshaft** (backdrop, js/render/places.js): the pithead's headframe and turning winding
  wheel, the rope to the cage, winding house, spoil heap; cut away below through sandstone, shale
  and a coal seam, the timber-lined shaft to a lamp-lit rubble floor and a tunnel with rails and
  a tub. "a friend of mine" is not a mine.
- **machine** (launcher): a tennis or cricket ball machine — hopper of balls, throwing wheels
  spinning, the barrel on the launch angle; it jolts and puffs as the ball goes.
- Tests in test/compose.test.mjs. Pushed (60b3551, c2a44f0, a51cd9d).
- **UI critic, two rounds:** the machine bigger (a panel, cable, a jolt, a puff, a ring round its
  wheels); the trampoline's mat sags 0.15 of its size, loads again on landing, the jumper's feet
  in the dip; the shaft's bedding, buntons at the walls, galleries (deep shafts only), depth ticks,
  a taller headframe; "reaches the bottom at the foot of the shaft". Open polish: composer
  captions 3–4 lines; the Display drawer over a composed scene on a phone; the headframe under the
  readouts on a phone; the trampoline's phone fit.
- **Live Ask Suvat check still to do** (the reader allowance was spent on 3 Nov; after 00:00 UTC).
