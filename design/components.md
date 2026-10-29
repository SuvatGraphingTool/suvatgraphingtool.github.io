# The component library

The pieces the Past-paper library's scenarios are built from, written down so a
later scenario — or an AI composing one on the spot — can reuse them instead of
writing its own. Each entry says what the piece is, what it takes, what it gives
back, and which scenarios use it.

The house rules hold for every piece: only `js/core/` calculates (rule 4), every
formula goes through `js/notation.js` (rule 1), colour is the quantity and dash
is the direction (rule 2), and no canvas text is under 13 px (rule 3).

## How a library scenario is put together

```
js/library.js        the scenario, as data: name, note, sources, kit, ending
js/kits/<kit>.js     the pieces wired for the app: boxes, solve, stage, HUD,
                     graphs, working, sketch, ending — no physics of its own
js/core/…            the engine
js/render/…          the stage
```

`js/app.js` reaches every kit through one route, `kit()`: if the chosen scenario
has a `kit`, the values screen, the solve, the stage, the HUD, the graphs, the
working panel and the ending card all ask it. The original twelve never set
`kit` and never take that route.

## Kits

### Kit interface — `js/kits/index.js`

A kit is an object with:

| field | what it is |
|---|---|
| `id`, `verb` | its name, and the launch button's label |
| `voice` | `{ h, sub }` — the values screen's heading and line under it (HTML) |
| `fields` | the boxes: `{ key, col, label, hint, optional?, say? }`. `col` groups them into columns named by `cols` |
| `cols` | `{ A: 'Particle A', … }` — column headings, in order |
| `g` | the values of g offered one press away; g also has its own box |
| `hides` | `{ shows: [...], extras: [...], bounce }` — options its stage has nothing to say about |
| `read(values)` | the typed boxes → the engine's input |
| `solve(input)` | the engine; answers `{ ok, reason?, f, derived, notes, moment, convention, extras, … }` with `f.tMax` for the transport |
| `working(solved, t)` | the working panel's steps, `[{ title, rows: [{ f, s, r }], note }]` |
| `render(canvas, cam, opts)` | the stage |
| `hud(f, t)` | `{ left: [{ k, v, unit, hue }], right: [...] }` |
| `graphs(f, t, P)` | specs for `drawGraph`, one per canvas `g-s`, `g-v`, `g-a` |
| `thumb(scenario)` | the card's SVG sketch, from `scenario.params` |
| `ending(solved, scenario.ending)` | `{ eyebrow, title, body }` for the ending card; the scenario's `ending` supplies what the model leaves out |
| `dir(v)` | optional: a word for a signed velocity, said back under its box |

| field | (added for `journey`) |
|---|---|
| `rows` | `[{ title, fields, hint? }]` — groups across the full width under the columns |
| field `type: 'choice'` | chips, one of `options: [{ v, label }]` or none; read as a string |
| field `placeholder` | what an empty box shows; optional ones default to 0 |
| `g` | may be left out: a kit with no gravity in it has no g row |
| `hud(f, t, { rate })` | the playback rate is passed in, for a time-lapse to say what actually plays |
| `lapse(f)` | optional: play the motion as a labelled time-lapse (`timeLapse` in js/core/pace.js) |

| kit | used by |
|---|---|
| `pair` — `js/kits/pair.js` | `pair-vertical` |
| `journey` — `js/kits/journey.js` | `journey-stages` |
| `lanes` — `js/kits/lanes.js` | `two-on-a-road` |
| `plane` — `js/kits/plane.js` | `vectors-ij` |
| `target` — `js/kits/target.js` | `over-the-wall` |
| `height` — `js/kits/height.js` | `from-a-height` |
| `catcher` — `js/kits/catcher.js` | `catch-it` |
| `trip` — `js/kits/trip.js` | `there-and-back` |
| `jump` — `js/kits/jump.js` (engine: journey) | `parachute-stages` |
| `twoplane` — `js/kits/twoplane.js` | `two-in-a-plane` |
| `models` — `js/kits/models.js` (engine: journey) | `three-models` |
| `bounce` — `js/kits/bounce.js` | `bounce` |

## Engine models — `js/core/`

### Numbers — `js/core/numeric.js`

`snap(x)` — floating-point dust off a number and nothing else: 8.749999999999993
is 8.75, 2⁄3 stays 2⁄3. `rat(c, maxQ)` — c as p⁄q in lowest terms when it is one
with a small q. Every engine uses these two; there are no private copies.

### Pace — `js/core/pace.js`

`timeLapse(tMax)` — the multiple of real time (1, 2, 5, 10, 20…) that plays a
motion lasting minutes inside about fifteen seconds; `lapseNote(value, tMax,
lapse)` — the pace card's sentence for it. A kit opts in with `lapse(f)`.

### Motion in stages — `js/core/stages.js`

`staged(stages)` — one object along one straight line, in stages of constant
acceleration. A stage is `{ t0, t1, x0, u, a, kind }`; before the first it is
still where the first starts, after the last it is still where the last ends.
Gives `pos(t)`, `vel(t)`, `acc(t)`, `state(t)` (with the stage it is in),
`stageAt(t)`.

`meetings(A, B, { from, to })` — every moment two staged motions are at the
same place. Between consecutive stage changes of either, the difference is a
quadratic, so the meetings are its roots — found exactly, never searched for.
Two moving together are reported once, as `together`. This is the engine for
every "when do they meet / when does B overtake A / when do they collide"
question on one line: vertical, along a road, or a race.

`quadRoots(c2, c1, c0)` — the real roots, in order, numerically stable.

`toLevel({ t0, x0, u, a, kind }, level)` — a stage that runs until the object
first reaches a level (the ground); `t1` is Infinity when it never does.
`rebound(prev, k, level)` — the stage after an impact: from where and when
`prev` ended, back the other way at k times the speed it arrived with, until
it reaches the level again (kind `'rebound'`, with `vIn`). A bouncing ball is
`staged([toLevel(...), rebound(...), rebound(...)])`: position continuous,
velocity jumping at every impact. `timesAt(m, x, { from, to })` — every
moment a staged motion is at position x, each `{ t, v }`.

Used by: `pair-vertical`, `journey-stages`, `two-on-a-road`, `bounce`.

### Two particles in one vertical line — `js/core/pair.js`

`particle({ h, u, t0, g })` — a particle held at height `h` until `t0`, then
free with a = −g, then at rest on the ground. Its stages, plus `tLand`, `vLand`,
`tTop`, `yTop`.

`solvePair({ A, B, g })` — each `{ h, u, t0 }`, up positive, heights from the
ground, `t0` blank for 0. Finds the first meeting while both are above the
ground, or says why there is none (never in the air together; one stays above;
the same motion twice). Gives `meet { t, x, vA, vB }`, `rows` (each particle's
u, v, a, s, t at the meeting, t from its own start), `extras` (time, height,
both speeds, the difference in speeds, the closing speed) and `f`, whose
`at(t)` and `gap(t)` the stage reads.

`pairWorking(solved)` — the heights multiplied out, set equal, solved (linear
when the t² terms cancel, the quadratic formula when they do not), the height,
both velocities.

`poly([c0, c1, c2], dp, { desc })` — a polynomial as notation source, written
the way a student writes it.

Used by: `pair-vertical`.

### A journey in stages — `js/core/journey.js`

`solveJourney({ u, stages: [{ kind, v, t, a }], T, D, rel, at })` — any number
of stages (up to `MAX_STAGES`), each `kind` one of `KINDS`: `up` and `down`
change speed at a steady rate `a` (a size) to `v` in time `t`; `hold` holds the
speed for `t`. `u` is the speed at A; any of it may be left out. `rel: { kind:
't' | 'a', x, y, k }` says stage x's time (or rate) is k × stage y's. Questions
`at: { t, s, v }`. Every speed and time is written as `c0 + c1·x` in the one
unknown x — the speed the paper leaves out (V), or else the time it names —
from each stage's own v = u ± at, the relation and the whole time; then the
equation left over, usually the area (each stage's piece, ½(u + v)t or ut,
added up), is solved for it, linear or quadratic, and roots that make a time
negative, a speed negative, or a stage go the wrong way are rejected with the
reason. Anything given and not needed is cross-checked. Gives `J` (`w`
boundary speeds, `t`, `a`, `s` per stage, `T`, `D`, and `v1…`, `t1…`,
`a1…`, `s1…`), `rows`, `steps`, `answers`, and `f`, a staged motion with
`stageAt(t)` and `startOf(i)`.

The three-stage trapezium, rest to rest, is still asked in its own names:
`solveJourney({ V, t1, t2, t3, a1, a3, T, D, rel: { kind: 't3=k*t1' | 'a3=k*a1'
| 't1=k*t2', k } })` (`threeStages()` turns it into stages), and its working
keeps the mark schemes' D = ½(T + t₂)V.

`journeyMotion(J)` — the stages as a motion. `askAt(f, J, at)` — the speed and
the distance gone at a time, the time at a distance, every time at a speed,
each worked inside its own stage and added on to the stages before.

Used by: `journey-stages`.

### Two on one road (or two tracks) — `js/core/overtake.js`

`mover({ t0, x0, u, hold, a, V, tau, ends }, name)` — one vehicle: waiting at
x0 until t0, holding u for `hold` seconds (blank is none), changing speed from
u at a for tau to V, then holding V (V = 0: at rest); any two of a, V, tau fix
the third, a alone keeps accelerating. `timeAt(mover, X)` — when it first
reaches X (coming to rest exactly at X counts, though it is a tangent).

`ends: true` — its change of speed ends exactly at `line` (V blank is 0: it
comes to rest there, "beside the point Y"). The line then fixes whichever one
of its hold, rate and time changing speed is missing, from the area under its
speed–time graph: s = uT + ½(u + V)t. Two that both come to rest at the line
at one instant are one `line` event with `rest: true` (with `first` set when
one stopped there earlier), never "the same motion twice".

`find: 'A.hold'` — the time T_A it holds its first speed: for one that ends at
the line, from s = uT + ½(u + V)(t − T) with t the other one's time to the
line (Edexcel M1 J16 Q4, J10 Q5, as the mark schemes write it); for one that
does not, from the rectangle, the change and the rectangle after it. With
`ends`, `find` may also be its rate, its time changing speed or its V, and the
rest of its change is worked after it. `sameSpeed(A, B, tMax)` — where the two
speed–time graphs cross (`f.crossings`). `f.dist(t)` — each one's distance so
far, the area under its line. `where: 'rail'` draws two trains on parallel
tracks between the trackside posts X and Y (figures.js `train`, `rails`,
`post`), and everything the engine says then calls the start X and the line Y
(`railWords`). The kit adds `lights` (figures.js `trafficLights` at the start)
and `figs: { A, B }` — each one's figure on the road from `FIGURES` (car,
motorcycle, lorry, cyclist, runner); the default is two cars on one road.

`solveOvertake({ A, B, line, at, find })` — every moment the two are level
(`events`, each with a `kind`: `start`, `overtake`, `level` — level without
passing, as at a tangency — `line` and `time`, level at the line or the time
asked about), and, with `find: 'B.V'` (or a, tau, for A or B), the one hidden
number that makes them level at `line` or at `at` — whether it is still
changing speed then or holding its speed. A root that cannot be (a negative
speed, a time longer than there is, a change of speed against its
acceleration) is in `rejected` with its reason; with no answer at all, the
refusal says how far it can get in that time, at best and at worst. Gives `found`, `extras` (each one's time and speed
at the line, the time on a late one's own clock, the difference in speeds) and
`f` with `at(t)` and `gap(t)`. `overtakeWorking(solved)` — the other one's time
at the line, the equation for the hidden number (as the mark schemes write it),
and each crossing as two positions in t set equal.

Used by: `two-on-a-road`.

### A particle in a plane, in i and j — `js/core/plane.js`

`solvePlane({ r0, u, a, vT, T, at })` — vectors as `{ x, y }` (x east, y
north); `vT` at time `T` instead of `u` runs back to u = v − aT. `at` asks:
`t` (velocity, position, speed), `moving` and `due` (compass keys of
`COMPASS`), `par` (`{ x, y }`: moving parallel to a vector, either way along
it), `x` or `y` (a coordinate), `speed`. An answer that holds for a stretch
(`always`, with `t` and `until`) has the times it starts and stops worked,
not only stated. Each answer comes with its rows
of working; `planeWorking` puts the two vector equations first. `vsrc(v)`
writes a vector as notation source (`-2vec(i) + 2vec(j)`).

Used by: `vectors-ij`.

### A projectile past one point — `js/core/target.js`

`flight({ ux, uy, h0, g }, P, kind)` — one projectile read at the point
P = { d, H }: the time and height there, the clearance, whether it is still
rising, the greatest height before it, where it lands (or that it hits a solid
`kind` it does not clear), and `span`, where a wall of height H would be
cleared. `KINDS` — wall, net, tree, face (a wall it hits), point.

`solveTarget({ g, h0, u, theta, ux, uy, d, H, tAt, kind, find, T, top, flag, pick })`
— given the launch, what happens at the point; or, with `find`, the angle
(`theta`: a quadratic in tan θ, two roots), the speed (`u`), or both from the
time to the point (`time`, with `T`) or from the greatest height (`apex`). `flights` holds
every answer, steepest first; `pick` chooses the one flown. `targetWorking` —
the find, the path as an equation in x, the point, the top, the landing, the
mark, and where a wall that high is cleared.

Used by: `over-the-wall`.

### A ball that bounces — `js/core/bounce.js`

`solveBounce({ start, h, U, V, w, H, e, n, y, stop, axis, g })` — `start` is
`'drop'`, `'down'` or `'up'`; any two of the height h, the throw speed U and
the impact speed V fix the throw (one when released); any one of the rebound
speed w, the rebound height H or the fraction kept e fixes the bounce (more
are cross-checked to 1 %, and a rebound faster than the impact is refused).
Watches to the n-th impact (1–6, default 2), or with `stop: 'y'` to the first
time after the bounce it is at height y. `axis` `'up'` or `'down'` is the sign
convention every signed number is reported in; heights stay heights. Gives
`impacts` (each `{ k, t, vIn, vOut, H, gap }`), `crossings` of y (each `{ t,
after, since, dir }`), `top0` (the top of an upward throw), `extras` and `f`,
whose `at(t)` gives `{ y, v, a, vUp, flight }` and whose `jumps` are the
impact times. `bounceWorking(solved)` — the fall (v² = u² + 2as, then
v = u + at), the bounce, each flight between impacts, the total, and the
height asked about, all in the student's convention. `bounceMotion({ h, u, g,
e, impacts })` — the bare staged motion, up positive.

Used by: `bounce`.

### A throw from a height — `js/core/height.js`

No new physics: `solveHeight({ place, h, theta, u, v, s, t, g, level })` hands the
launch to the twelve's `solveLaunch` and reads the flight with `timeAbove`
(js/core/projectile.js). It adds what a cliff or tower question asks: the
greatest height above the sea or ground, the time in the air, the landing
speed, and the times at a height above the throw (`level`). `levelRows` writes
that last as working; the rest of the working is the twelve's `buildWorking`.
`PLACES` — cliff (over the sea), tower (over the ground), bridge (over a river), diving board (over a pool), well (straight down to its water), balloon (rising; what it lets go moves up at its speed).

Used by: `from-a-height`.

### Thrown and caught — `js/core/catch.js`

`solveCatch({ g, h, u, theta, yc, c: { t0, u, a }, find })` — the twelve's
projectile (`flight`) and one straight-line run along the ground: the ball's
vertical motion gives when it is at the catch height (on the way down), its
horizontal motion where; the catcher's s = u(t − t₀) + ½a(t − t₀)² gives the
number the paper hides (`find`: 'a', 'u' or 't0'), or with all given, how far
it is from the ball then. `catchWorking` lays the two out.

Used by: `catch-it`.

### A graph in segments — `js/core/trip.js`

`solveTrip({ segs: [{ u, v, t, who }], T, back })` — a velocity–time graph of
straight segments, each from its start velocity (the last one's end, or a
jump to `u`) to `v` over `t`; below zero is going back. Up to two times left
blank: a moving one fixed by ending back at the start of segment `back` (the
area from there sums to zero), a stop fixed by the total time `T`. Each
segment's acceleration and displacement as working (`tripWorking`).

Used by: `there-and-back`.

### Two in a plane — `js/core/twoplane.js`

`solveTwoPlane({ units, A: { r0, v }, B: { r0, v, w }, find, at: { due, bOfA, dueT, apart } })`
— two at constant velocities; everything is about Δ = r_A − r_B, linear in t:
when one is due a compass direction of the other (and how far apart then),
when they are a distance apart (|Δ|² = d², a quadratic), and p in B's velocity
p·w from a direction at a given time. `bearing(v)` (exported) — clockwise
from north. `twoPlaneWorking` writes each.

Used by: `two-in-a-plane`.

### One question, three models — `js/core/models.js`

`solveModels({ u, D, a, limit, react })` — model 1 brakes to the sign, model 2
to the limit and holds, model 3 after the reaction time; each is the journey
in stages. When the numbers will not let a model do what it says, it does what
it can and says so: it stops short of the sign, reaches it still above the
limit, or passes it during the reaction time. Used by: `three-models`.

### Off the edge, across — `js/core/bench.js`

`solveBench({ look, g, u, d, tGap, drop, H, R })` — the twelve's `flight` at
θ = 0, measured from the edge: the speed given, or from two strips `d` apart
broken `tGap` apart (u = s/t), or from the edge's height and how far out it
lands; how far it has dropped at the second strip, and whether a strip set
`drop` lower is broken at its centre (within half a millimetre); the floor,
when the height is given. `benchWorking` writes each. Used by: `off-the-bench`.

### Through two points, in a letter — `js/core/clears.js`

`solveClears({ P, Q, beyond, u, a, g })` — from O on the ground, it just clears
a wall Pa away and Qa high and lands `beyond`·a past it. Both points in
2U²y = 2UVx − gx² give 2UV = gRa and U² = ga·P(R − P)⁄(2Q), so
tan θ = RQ⁄(P(R − P)) with no a in it; the speed or a fixes the other, then the
greatest height (in a and in metres) and the time. The motion is `flight`.
`ka(c)` (exported) writes c·a as notation source. Used by: `wall-in-a-letter`.

### Stage by stage — `js/core/chain.js`

`solveChain({ look, stages: [{ s, u, v, a, t }], S, T })` — up to four stages
along one line, each solved by the twelve's `solve` (js/core/suvat.js) from any
three of its five, the numbers typed preferred over those carried in. Speeds
carry across each join both ways (a blank start is the last stage's end, a
blank end is the next stage's start); a whole distance `S` or time `T` fills
the one stage missing it; a stage given four or five is checked. Then the
whole: distance, time, average speed. `chainWorking` writes each stage as the
solver did. Used by: `stage-by-stage`.

### Do they collide? — `js/core/collide.js`

`solveCollide({ A: { r0, u, a }, B: { r0, u, a }, at })` — two particles, each
the library's `planeMotion`; each position written as a quadratic in t part by
part; the part with fewest roots solved (`quadRoots`) and the other checked at
each root: they collide only where both agree. `at` gives each position at a
time. `collideWorking` writes it the paper's way. Used by: `do-they-collide`.

### Known from two moments — `js/core/snapshots.js`

`solveSnapshots({ r0, u, tu, a, at2: { kind, t, v }, a2, ask: { t, dir } })` —
a constant acceleration in i and j fixed by two moments: two velocities (a is
the change over the time between, u run back to t = 0), or two positions with
the velocity or the acceleration (the other from r = r₀ + ut + ½at²). At the
second moment the acceleration may change (`a2`): the second stage starts from
that position and velocity. Asks: velocity, speed and position at a time; when
it is moving in a compass direction (one linear relation, checked for the
right way). Each stage is `planeMotion`. Used by: `two-moments`.

### A displacement–time graph — `js/core/xtgraph.js`

`solveXt({ x0, pts: [{ t, x }], speed, ask: { ts }, tail: { c0, c1, c2, speed } })`
— straight pieces between corners: one corner time may be blank, found from
the speed of the sloping piece next to it (and every sloping piece checked
against the speed); the velocity in a piece is its gradient; distance is the
sum of each piece's size, displacement where it ends. After the last corner,
x = c₀ + c₁t + c₂t² (checked to join): v = c₁ + 2c₂t, and when its speed is
given. Used by: `xt-graph`.

### Two robots: closest approach — `js/core/robots.js`

`solveRobots({ R: { r0, v | r1, t1 }, S: { r0, v }, side })` — the motions
are `solveTwoPlane` (which finds a velocity from two positions); the vector
SR = r_R − r_S is linear in t, so d² is a quadratic, least where its gradient
is zero (or at t = 0 when they are already moving apart; never changing when
the velocities are equal). The floor is a square of side `side` centred on O;
when each robot would reach its edge is found, and a closest moment after it
is said to be off the floor. Used by: `robots-closest`.

### Two thrown up, in letters — `js/core/letters.js`

`solveLetters({ k, when, c, U, g })` — P up from O at U; Q up from O at kU,
when P is at its top (`when: 'top'`) or c·U⁄g after it. Run with U = g = 1, so
every time is a number times U⁄g and every length a number times U²⁄g;
`inLetters(c, top, bottom)` (exported) writes c·U²⁄g as (3U²)⁄(8g), U⁄g, 0.
Both have a = −g, so the ½gτ² terms cancel and the meeting is linear in τ.
With numbers for U and g, every answer in metres and seconds too. Used by:
`two-up-letters`.

### Two trains, one journey — `js/core/twotrains.js`

`solveTwoTrains({ A: spec, B: spec, ask: { t } })` — each train is the
journey engine (`solveStages`); when B's stages leave one number open, it is
solved again with A's distance (the same two stations), and the two must
arrive together. Equal speeds: in every stretch where each is in one stage,
v_A − v_B is linear in t — one root per stretch. The gap at a time is the
difference of the two `askAt` distances. Used by: `two-trains`.

### Past the posts, one acceleration — `js/core/posts.js`

`solvePosts({ gaps: [{ s, t }], u, a, look })` — from the first post to each
later one, s = ut + ½at² in the same u and a: two give a pair of simultaneous
equations (solved by substitution, written out), a third is checked; either u
or a may be given instead. Each post's speed is v = u + at. The motion is in
the chain shape (`kind: 'chain'`, stretches named P to Q…) so the
stage-by-stage road draws it, its posts named. Used by: `past-the-posts`.

### A velocity–time graph — `js/core/vtgraph.js`

`solveVt({ v0, pts: [{ t, v }], ask: { t, s } })` — straight pieces between
corners: each piece's gradient (the steepest the greatest acceleration), its
area (the running displacement, piece by piece), and every time the
displacement is a given value — back where it started by default — from
s = ut + ½at² within the piece (`quadRoots`). Also the displacement and
velocity at a time, and the distance travelled. Used by: `vt-graph`.

### Falling past two marks — `js/core/marks.js`

`solveMarks({ mode, g, vM, vN, t, h, H, k, look })` — down positive, a = g:
in numbers the twelve's `solve` works M to N from two of the speed at M, the
speed at N, the time and the distance; then how far above M it was dropped
from rest (v² = 2gs), and the ground when M's height is given. In letters
(the speed at N k times u at M) the same equations with u = g = 1, written by
`inLetters`: t = (k − 1)u⁄g, MN = (k² − 1)u²⁄(2g). Used by: `past-two-marks`.

### Thrown towards each other — `js/core/towards.js`

`solveTowards({ g, A: { u, theta, h }, B: { u, theta, h, t0 }, D, range })`
— each the twelve's `flight`, timed from its own launch (B t0 after A); AB
given, or A's range (u² sin 2θ⁄g). Level across is one linear equation in t;
each one's height then; they collide when the heights agree within a
millimetre and both are in the air, else pass (the gap said) or never meet
(one landed first, or A past before B is thrown). Used by: `thrown-towards`.

## Notation — `js/notation.js`

`vec(i)`, `vec r` — a vector, in bold (HTML `<b class="m-vec">`, canvas
Unicode mathematical bold italic 𝒊). Added for `vectors-ij`; any vector anywhere.
A vector is held to its coefficient on one line (`.m-nb`): 28𝒊 never breaks.

`paren(src)` — a piece of notation source in brackets when it has a + or − at
its top level, so it can go into a product or after a minus as it stands
(`20 - V` → `(20 - V)`; `V`, `2V` and `(V - 5)/2` unchanged). Any substitution
built from pieces uses it, so no piece is ever a bracket short.

## Stages — `js/render/`

### One question, three models — `js/render/models.js`

Three lanes of one road, the same `car` in each, `speedSign(g, x, Y, limit, P)`
(exported) at the same distance: model 1 brakes to the sign, model 2 to the
limit and holds, model 3 after a reaction time. Kit `models`, engine: the
journey in stages, once per model. Used by: `three-models`.


### Two on a map — `js/render/twoplane.js`

A map from above at one scale (sea for ships, sky for birds), both tracks, the
vector from B to A, each asked moment ringed; `shipTop(g, x, y, s, a, color, P)`
and `birdTop(g, x, y, s, a, color)` (exported). Used by: `two-in-a-plane`.

### A bench or a table, side on — `js/render/bench.js`

Measured from the edge at one scale both ways: `labWall`, `labBench` (the end
of a laboratory bench), `table` (a top and two legs), `foilStrip(g, x, y, half,
P, { torn })` (a strip on a clamp stand, its centre marked, torn where the ball
went through) and `launcher` (magnets and ball bearings) — all exported. The
gap between the strips and how much lower the second is as dimension lines;
where the second is broken ringed, with how far from its centre. With a table,
the floor and how far out it lands. Kit `bench`. Used by: `off-the-bench`.

### Over a brick wall, in a letter — `js/render/clears.js`

Sky and level ground (`sky`, `groundStrip` from heights.js), O and the angle,
`brickWall(g, x, top, Y, wPx, P)` (exported), the path grazing its top (ringed
"just clears"), the greatest height; each length a dimension line labelled in
the letter and in metres at once (a = 70.2 m). Kit `clears`. Used by:
`wall-in-a-letter`.

### Stage by stage, side on — `js/render/chain.js`

The whole distance at one scale on the figure's own surface (`surface`,
`post`, `drawFigure` from figures.js): a numbered post where each stage
begins, each stage's distance and time as a dimension line under the road,
what it does over each (speeding up, slowing down, steady, with a), the speed
at each post once passed, and the car, cyclist or train where it is now with
its velocity (dashed). Kit `chain`. Used by: `stage-by-stage`. Named posts (a stretch's `name` and `end`) take letters, and the last post stands at the end; used by kit `posts` (`past-the-posts`) too.

### Two on a surface, from above — `js/render/collide.js`

The surface at one scale both ways, grid, O, i and j; each path a faint curve
and the part travelled strong, A in the quantity's hue and B in stone; `puck(g,
x, y, r, color, P)` (exported) with its letter and its velocity now; the
collision ringed with its time and position vector; an asked time marked on
both paths. Kit `collide`. Used by: `do-they-collide`.

### Known from two moments, from above — `js/render/snapshots.js`

The plane at one scale both ways, grid, O and north; the path in the
displacement hue, faint in full and strong so far; the second moment marked
(and "the acceleration changes" there); each asked moment ringed; the puck
(`puck` from collide.js) with its velocity and acceleration. Kit `snapshots`.
Used by: `two-moments`.

### A displacement–time graph, and the line — `js/render/xtgraph.js`

Above, the (t, x) graph as the paper draws it (the blank corner marked T, the
formula part curving, the time now a dashed upright, asked velocities and
times ringed); below, the line at one scale with A, the particle and its
velocity (dashed), "at rest" on the flat pieces. Kit `xtgraph`. Used by:
`xt-graph`.

### A square floor from above — `js/render/robots.js`

The floor at one scale both ways, tiled, its corners A, B, C, D and centre O;
`robotTop(g, x, y, s, a, color, P)` (exported) — a robot from above, turned the
way it goes; each track over the run (to the earlier of the floor's edge and a little past the closest moment); the vector from S to R now with
its length; the closest moment ringed with its time and distance. Kit
`robots`. Used by: `robots-closest`.

### Two thrown up, in letters — `js/render/letters.js`

One vertical line through O at one scale, P and Q drawn a little apart on it,
each with its velocity (solid); P's greatest height H marked with its value in
letters; where they collide ringed with τ and the height in letters. The HUD
and graphs read in U⁄g, U²⁄g and U when no numbers are given. Kit `letters`.
Used by: `two-up-letters`.

### Two tracks between two stations — `js/render/twotrains.js`

Side on at one scale: two `rails`, `station(g, L, x, top, bottom, name, P)`
(exported) at each end spanning both — a platform under a canopy and its name;
each `train` with its front at its position, A near and B far, velocities
dashed; the gap between their fronts as a dimension line; the same-speed
moments and the asked gap written as they pass (no ring: a dimension line and its length). Kit `twotrains`. Used by:
`two-trains`.


### A parachute jump — `js/render/jump.js`

A column of sky at one scale from the aircraft to the fields: `aircraft(g, x,
y, L, P)` and `fields(g, x0, x1, Y, bottom)` (exported), a height ruler, the
jumper in free fall and then under a canopy, a marker where each stage
begins. The engine is the library's journey in stages, read downwards (kit
`jump`). Used by: `parachute-stages`.


### A road under its graph — `js/render/trip.js`

The (t, v) graph drawn on the stage, its area shaded up to now (forwards and
back), over a road at one scale with the `car` (driven, then parked), the
driver (`runner`) on foot, and `shopfront(g, x, Y, H, P)` (exported) where the
driver stops. Used by: `there-and-back`.


### A beach — `js/render/beach.js`

`render(canvas, cam, { traj, t, show, fired })` for `traj.kind === 'catch'`.
One scale both ways; sky and a strip of sea from `heights.js`, `sand(g, x0,
x1, Y, bottom)` (exported), the thrower (`runner`, standing) and the `dog`
from `figures.js`, the catch ringed, launch and catch heights and the catch
distance as dimension lines. Used by: `catch-it`.

`figures.js` gained `dog(g, X, Y, L, P, { dir, phase, still })` — a dog side on,
galloping; a standalone export, not one of the road's FIGURES.


### A cliff or a tower — `js/render/heights.js`

`render(canvas, cam, { traj, t, show, fired })` for a flight with `traj.place`.
One scale both ways, the drop drawn to scale. Reusable backdrop pieces:
`sky(g, x0, y0, x1, horizon)`, `sea(g, x0, x1, Y, bottom)` (grey-blue, never the
displacement hue), `seaCliff(g, x0, edge, top, Y)` (strata, grass cap, a face
that leans back), `tower(g, edge, top, Y, width)` (stone courses, battlements),
`groundStrip(g, x0, x1, Y, bottom)`, `bridge(g, x0, edge, top, Y)`, `well(g, x0, x1, cx, half, top, Y, bottom)`,
`divingBoard(g, x0, edge, top, Y, bottom)`, `balloon(g, x, y, s, P)`. The thrower is `figures.js`'s `runner`,
standing still. Used by: `from-a-height`.


### Side on, past one point — `js/render/target.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'target'`.
One scale both ways; the thing at the point drawn by its kind with its height
and distance as dimension lines; a second answer's path faint; at the point,
the clearance or the hit. Used by: `over-the-wall`.


### A map in i and j — `js/render/vectors.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'plane'`.
One scale both ways, grid in metres, O, a north arrow, the path (flown strong,
to come faint), the position vector, the velocity (components when asked),
the acceleration when asked, each answer ringed with its time.

Used by: `vectors-ij`.

### Figures — `js/render/figures.js`

Everything that moves or stands in a straight-line question, drawn one way so
any stage can use any of them:

```js
import { car, lorry, train, cyclist, motorcycle, runner, ball, particle,
         trafficLights, post, roadway, rails, runningTrack, surface,
         FIGURES, drawFigure, phaseFor } from './figures.js';
car(g, X, Y, L, P, { dir, phase, ring });
```

- **(X, Y)** is the figure's FRONT, standing on y = Y (the road surface, the
  rail head, the track). It faces right; `dir: -1` mirrors it about X to face
  left, front still at X.
- **L** is its drawn length in px — for `runner`, her height; for `ball` and
  `particle`, the diameter. **P** is `palette()`.
- **`phase`** ∈ [0, 1) turns wheels and moves legs (a wheel turn, a turn of the
  cranks, a running stride). `phaseFor(kind, L, px, { cars })` gives it from
  the px travelled, so wheels roll without slipping and stop when it stops.
- **`ring`** — an outline colour to tell B from A (`P.second`).
- `train(…, { cars })` — 1 to n carriages in the length L, the front one with a
  cab; bogies under each. `runner(…, { still: true })` stands upright.
- In the page's ink (card fill, strong outline, faint glass), never a
  quantity's hue (rule 2), and they draw no text, so a mirrored one never
  reads backwards.

| piece | what it is |
|---|---|
| `lorry`, `car`, `cyclist`, `motorcycle`, `train`, `runner` | the six travellers, in `FIGURES` with `label`, `noun`, `verb`, `size` (drawn length beside a lorry of 1), `top`/`mid` (where the acceleration and velocity arrows go; every `top` is the lorry's, under the posts' letter plates), `ground`, `brakes` (false for the runner: she slows down), `min` (least px, so a person stays readable on a phone), `cars` (the train's carriages) |
| `ball`, `particle` | the stadium's ball (`ballSprite`), and a plain bead for "particle P" (centred on X, Y) |
| `drawFigure(g, kind, X, Y, L, P, opts)` | any of them by name |
| `post(g, labels, X, Y, letter, color, P, { dashed, height })` | a roadside or trackside post with its letter on a plate — A, B, X, Y, the mid-point M; `labels` is the stage's `labels()` queue |
| `trafficLights(g, x, Y, H, P, { lit })` | a post H tall with three lamps; `lit` is `'red'`, `'amber'`, `'green'` or null, in its real colour (`LAMPS`) |
| `roadway`, `rails`, `runningTrack` `(g, x0, x1, Y, P)` | the three surfaces, side on, their top at Y. Two parallel tracks are two `rails` calls. `surface(g, ground, …)` picks by `FIGURES[kind].ground` |

Not to scale with one another — a real cyclist is a seventh of a lorry and
would vanish — so `FIGURES[kind].size` keeps one stage's traveller the same
visual weight whichever it is.

The runner's planted foot stays planted (her stride is matched to the sweep of
her leg; a test traces it), and every wheel turns forwards. Drive the phase from
the distance travelled, not the displacement, so it keeps rolling forwards
after a turn-round.

`travellerIn(text)` in `js/core/question.js` — the traveller a question names
first (a key of `FIGURES`), so a read question draws its own object.

Used by: `road` (Along a straight road: the six, chosen on its values screen;
the lorry is pixel-identical to the drawing it replaced), `two-on-a-road`
(cars, trains, rails, posts).

### Two lanes under two speed–time graphs — `js/render/lanes.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'overtake'`.
Above: both speed–time graphs (dashed, A velocity hue, B second-object stone),
each moment they are level marked under the axis. Below: two lanes, the start,
the line, cars, equal-time marks, velocity arrows, the gap between fronts, and
each meeting across both lanes.

Used by: `two-on-a-road`.

### The speed–time graph over the way from A to B — `js/render/journey.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'journey'`
and `traj.who` a traveller from `FIGURES`. Above: the speed–time graph as the
paper sketches it (dashed, horizontal motion) — each speed at a stage change on
the speed axis with a dashed line to its corner (the unknown named V), each
time it changes on the time axis, each stage bracketed with its time — the area
filling in the displacement colour to the cursor, each stage's piece named once
passed, the instants a question named ringed. Below: the way from A to B on the
traveller's own surface — traffic lights where a car or bike starts or stops,
a station platform for a train, start and finish lines on a running track —
the stages as dashed displacement brackets, the traveller, equal-time marks,
the velocity and acceleration arrows.

Used by: `journey-stages`.


### The vertical line — `js/render/column.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'pair'`.
Tall rather than wide: the ground, a height scale clear of the readouts, one
dashed vertical line, a tower with a ledge for anything that starts above the
ground (left for A, right for B). Each particle's equal-time marks on its own
side of the line; velocity arrows, solid, in the velocity hue; acceleration
arrows when asked; a held particle says when it is let go; the gap between two
as a solid teal bracket with guides; at the meeting a burst and a line across
with the engine's time and height. Frames the whole motion and does not pan.

Used by: `pair-vertical`.

### A ball over the ground — `js/render/bounce.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'bounce'`.
Hard ground and a brick balcony at the start height; the ball at a visible
size sitting on the ground at impact (its bottom is the model's point), its
shadow, a squash and a burst as it lands; equal-time marks, the way down and
the way up in two lanes, earlier flights fainter; the start height and the
latest rebound height as displacement brackets; B, the height asked about, as
a lime line with its times ringed; the latest impact's speeds in and out; the
velocity arrow labelled in the chosen convention, which the stage states with
an arrow. Reusable on their own: `court(g, x0, x1, groundY, bottom, P,
pxPerM)` — paving on earth in the scene tones; `balcony(g, xWall0, xWall1,
tip, yPx, groundY, pxPerM, P)` — a brick wall, a window to each storey, and a
railed ledge out to `tip` at a height. `sketch(f)` — the card's SVG.

Used by: `bounce`.

## Graph overlays — `js/render/graphs.js`

`drawGraph(canvas, spec)` takes two optional additions, available to any
scenario:

- **series `tag`** — a letter (A, B) drawn at the start of the line, in its
  colour, for graphs with one line per object.
- **spec `points`** — `[{ t, y, color, label?, dx?, dy? }]`: an event the engine found
  (where two lines cross), drawn as a ring once the time cursor reaches it;
  its label goes below-left, or `dx`, `dy` px from the ring (a positive `dx`
  puts it on the right).
- **spec `notePri`** — the note's priority (default 4): a note the graph cannot be
  read without, such as a sign convention, outranks the other labels.
- **series `jumps`** — times where the value itself jumps in an instant (a
  velocity at a bounce): drawn as separate pieces with a thin dashed upright
  between the value before and after, in the neutral axis colour (a jump is not a
  quantity, and a dashed line in a quantity's hue reads as horizontal), as the
  mark schemes sketch it.
- **series `breaks`** — times where the series jumps (an acceleration changing
  from one constant to the next, a particle let go): drawn as separate pieces,
  with no vertical line joining them.
- **shade `color`** — the colour of what the area IS (displacement under a
  velocity line), when it is not the line's own.
- **`yScale(series, tMax)`** — the pure range and ticks every graph uses: the
  step from the data, room below and more above so a top line clears the title.

Used by: `pair-vertical` (tags, points), `journey-stages` (points: the instants asked about), `bounce` (jumps, points with `dy`).

## Home screen

### The Past-paper library section — `index.html` `#library`, `js/app.js` `buildLibrary`

Cards for every entry in `js/library.js`, in the same card style as the twelve,
each with its papers under its note. The search box matches every word typed
against the name, the note, the boards and papers, and the entry's `tags`.

### A house and a fence — `js/render/target.js`

`house(g, edge, sill, Y, w, from, P)` (exported) — a house side on, its wall's
face at the launch, with a window whose sill is the launch height, or its roof's
eave there; `fence(g, x, top, Y, P)` (exported) — a garden fence of boards and
rails. The over-the-wall stage frames the house — its width, eave and roof — at the same scale when the
throw is from a window or a roof (the kit's `from` choice); the fence is a
kind of thing to clear. Used by: `over-the-wall`.

### A velocity–time graph, and the line — `js/render/vtgraph.js`

Above, the (t, v) graph as the paper draws it (dashed, the steepest heavier with
its a; the area shaded to now, stronger above the axis than below; each return
to the start ringed); below, the line at one scale with O and the object and
its velocity. Kit `vtgraph`. Used by: `vt-graph`.

### Falling past a window — `js/render/marks.js`

Down the page at one scale: `buildingWall(g, x0, edge, top, Y, wy0, wy1, P)`
(exported) — a wall with a window from M to N — or a cliff face; the release
point, M and N as level lines with the distances between (in u²⁄g in letters);
the ball falling beside the wall, its velocity solid, each mark ringed with its
speed as it passes; the ground when given. Kit `marks`. Used by:
`past-two-marks`.

### Two throwers, side on — `js/render/towards.js`

Level ground from A to B at one scale both ways, a `runner` at each end facing
the other, each path faint in full and strong so far (A in the quantity's hue,
B in stone), each ball's velocity; where they are level across, ringed with the
time and height when they collide, or the gap between them when they pass.
Kit `towards`. Used by: `thrown-towards`.
