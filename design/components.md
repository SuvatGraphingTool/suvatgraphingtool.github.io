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

| kit | used by |
|---|---|
| `pair` — `js/kits/pair.js` | `pair-vertical` |

## Engine models — `js/core/`

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

Used by: `pair-vertical`.

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

## Stages — `js/render/`

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

Used by: `pair-vertical`.

## Home screen

### The Past-paper library section — `index.html` `#library`, `js/app.js` `buildLibrary`

Cards for every entry in `js/library.js`, in the same card style as the twelve,
each with its papers under its note. The search box matches every word typed
against the name, the note, the boards and papers, and the entry's `tags`.
