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
| `journey` — `js/kits/journey.js` | `journey-3` |
| `lanes` — `js/kits/lanes.js` | `two-on-a-road` |
| `plane` — `js/kits/plane.js` | `vectors-ij` |

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

Used by: `pair-vertical`, `journey-3`, `two-on-a-road`.

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

### A journey in three stages — `js/core/journey.js`

`solveJourney({ V, t1, t2, t3, a1, a3, T, D, rel, at })` — any four of the
eight (more are cross-checked), from rest to rest, with an optional relation
`rel: { kind, k }` from `RELATIONS` (`t3=k*t1`, `a3=k*a1`, `t1=k*t2`) and
questions `at: { t, s, v }`. Writes every time as `c0 + c1·x` in the one
unknown x (V, or the time the paper names), solves the equation left over —
usually the area D = ½(T + t₂)V, linear or quadratic — rejects roots that
make a time negative and says why. Gives `J` (all eight plus s₁, s₂, s₃),
`rows` (each stage in terms of the unknown), `answers`, and `f`, a staged
motion with `stageAt(t)`.

`journeyMotion(J)` — the three stages as a motion. `askAt(f, J, at)` — the
speed at a time, the time at a distance, the times at a speed, with working.

Used by: `journey-3`.

### Two on one road — `js/core/overtake.js`

`mover({ t0, x0, u, a, V, tau }, name)` — one vehicle: waiting at x0 until t0,
changing speed from u at a for tau to V, then holding V; any two of a, V, tau
fix the third, a alone keeps accelerating. `timeAt(mover, X)` — when it first
reaches X.

`solveOvertake({ A, B, line, at, find })` — every moment the two are level
(`events`: the start, each overtaking, level at the line), and, with
`find: 'B.V'` (or a, tau, for A or B), the one hidden number that makes them
level at `line` or at `at`. Gives `found`, `extras` (each one's time and speed
at the line, the time on a late one's own clock, the difference in speeds) and
`f` with `at(t)` and `gap(t)`. `overtakeWorking(solved)` — the other one's time
at the line, the equation for the hidden number (as the mark schemes write it),
and each crossing as two positions in t set equal.

Used by: `two-on-a-road`.

### A particle in a plane, in i and j — `js/core/plane.js`

`solvePlane({ r0, u, a, vT, T, at })` — vectors as `{ x, y }` (x east, y
north); `vT` at time `T` instead of `u` runs back to u = v − aT. `at` asks:
`t` (velocity, position, speed), `moving` and `due` (compass keys of
`COMPASS`), `x` or `y` (a coordinate), `speed`. Each answer comes with its rows
of working; `planeWorking` puts the two vector equations first. `vsrc(v)`
writes a vector as notation source (`-2vec(i) + 2vec(j)`).

Used by: `vectors-ij`.

## Notation — `js/notation.js`

`vec(i)`, `vec r` — a vector, in bold (HTML `<b class="m-vec">`, canvas
Unicode mathematical bold italic 𝒊). Added for `vectors-ij`; any vector anywhere.

## Stages — `js/render/`

### A map in i and j — `js/render/vectors.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'plane'`.
One scale both ways, grid in metres, O, a north arrow, the path (flown strong,
to come faint), the position vector, the velocity (components when asked),
the acceleration when asked, each answer ringed with its time.

Used by: `vectors-ij`.

### Two lanes under two speed–time graphs — `js/render/lanes.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'overtake'`.
Above: both speed–time graphs (dashed, A velocity hue, B second-object stone),
each moment they are level marked under the axis. Below: two lanes, the start,
the line, cars, equal-time marks, velocity arrows, the gap between fronts, and
each meeting across both lanes.

Used by: `two-on-a-road`.

### The speed–time trapezium over the track — `js/render/journey.js`

`render(canvas, cam, { traj, t, show, fired })` with `traj.kind === 'journey'`.
Above: the trapezium (dashed, horizontal motion), its area filling in the
displacement colour to the cursor, each stage's area named once passed, V on
the axis, the three times bracketed below it, the instants a question named
ringed. Below: the track A to B, the three stretches as dashed displacement
brackets, the train, equal-time marks, the velocity and acceleration arrows.

Used by: `journey-3`.


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

## Graph overlays — `js/render/graphs.js`

`drawGraph(canvas, spec)` takes two optional additions, available to any
scenario:

- **series `tag`** — a letter (A, B) drawn at the start of the line, in its
  colour, for graphs with one line per object.
- **spec `points`** — `[{ t, y, color, label? }]`: an event the engine found
  (where two lines cross), drawn as a ring once the time cursor reaches it.
- **series `breaks`** — times where the series jumps (an acceleration changing
  from one constant to the next, a particle let go): drawn as separate pieces,
  with no vertical line joining them.
- **shade `color`** — the colour of what the area IS (displacement under a
  velocity line), when it is not the line's own.
- **`yScale(series, tMax)`** — the pure range and ticks every graph uses: the
  step from the data, room below and more above so a top line clears the title.

Used by: `pair-vertical` (tags, points), `journey-3` (points: the instants asked about).

## Home screen

### The Past-paper library section — `index.html` `#library`, `js/app.js` `buildLibrary`

Cards for every entry in `js/library.js`, in the same card style as the twelve,
each with its papers under its note. The search box matches every word typed
against the name, the note, the boards and papers, and the entry's `tags`.
