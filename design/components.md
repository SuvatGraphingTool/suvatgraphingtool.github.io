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
| `resolveAxis` | optional: how the Resolve card reads the motion (`js/kitresolve.js`) — `'along'`, `'vertical'` or `'down'` for one line, `'map'` (east, north, a bearing), `'ij'` (i, j, the angle to i) or `'bank'` (along and across a river) from above. Blank: whichever of x and y moves |
| `resolveUnits(f)` | optional: `[s, v, a, t]` units for a question in letters (`× U²⁄g` …), or null for metres and seconds |
| `resolve(solved, t, f)` | optional: the card itself, `{ blocks: [{ name, hue, rows: [{ name, value, unit, formula, sub, note }] }], note }`, in place of the generic reading |

**Resolve, on every stage.** The card is read by `resolveKit` (js/kitresolve.js) from the motion `f` the engine returns: `pos`/`vel`/`accel` for one object; `posA`/`posB` (with `velA`/`velB`, or a constant `A.v`/`B.v`), the pair's `at(t)`, or `yP`/`yQ` for two, a block each. A new kit — the composer's included, which spreads its engine's kit — gets Resolve for free; it only names `resolveAxis` when its coordinates cannot say which way is up. `test/library.test.mjs` opens it on every library example at half its run.

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
| `wind` — `js/kits/wind.js` | `flying-in-a-wind` (engine js/core/wind.js; stage js/render/wind.js: from above, an airliner on its heading, the triangle on a card) |
| `river` — `js/kits/river.js` | `across-the-river` (engine js/core/river.js; stage js/render/river.js: a river from above, a steered boat, the velocity triangle) |
| `heli` — `js/kits/heli.js` | `over-the-rock` (engine js/core/heli.js on plane.js's motion; stage js/render/heli.js: the sea from above, the lighthouse, the rock in its surf, a coastguard helicopter with its rotor turning; `heliTop` is exported) |
| `ice` — `js/kits/ice.js` | `down-the-ice` (engine js/core/ice.js; stage js/render/ice.js: a curling sheet from above, lines A, B, C, the house round D, the stone turning as it slides) |
| `wall` — `js/kits/wall.js` | `back-off-the-boards` (engine js/core/wall.js, with js/core/impulse.js at the wall; stage js/render/wall.js on ice.js's exported `rink` and `stoneTop`) |
| `hill` — `js/kits/hill.js` | `freewheeling` (engine js/core/hill.js on the twelve's suvat `solve`, then F = ma along the slope; stage js/render/hill.js: a lane down a hillside at its true angle, a cyclist leaning into it, the forces on a card) |
| `rough` — `js/kits/rough.js` | `up-a-rough-slope` (engine js/core/rough.js: R, F = μR, F = ma, and back down if μ < tan α; stage js/render/rough.js: a snowy hillside, a wooden sledge, the forces on a card) |
| `runway` — `js/kits/runway.js` | `take-off` (engine js/core/runway.js on the twelve's suvat `solve`; stage js/render/runway.js: an airfield, a twin-jet) |
| `rocket` — `js/kits/rocket.js` | `firework-rocket` (engine js/core/rocket.js; stage js/render/rocket.js: a dusk field, flame and sparks, a burst at the top) |
| `lift` — `js/kits/lift.js` | `the-lift` (the journey's engine; stage js/render/lift.js: a building cut away to its lift shaft) |
| `roof` — `js/kits/roof.js` | `above-the-roof` (engine js/core/roof.js, which hands the two particles to js/core/pair.js; stage, readouts and graphs borrowed from `pair`) |
| `together` — `js/kits/together.js` | `land-together` (engine js/core/together.js; stage js/render/together.js: the heights `tower`, two people on its battlements, two stones landing at once) |
| `heightrange` — `js/kits/heightrange.js` | `higher-than-far` (engine js/core/heightrange.js; stage js/render/heightrange.js: a park, a tripod launcher, a fan of arcs, H and R side by side) |
| `bridge` — `js/kits/bridge.js` | `from-the-bridge` (engine js/core/bridge.js; stage js/render/bridge.js: a footbridge end on over a road, a thrower on the deck, a runner below) |
| `apples` — `js/kits/apples.js` | `two-apples` (engine js/core/apples.js; stage js/render/apples.js: an orchard, an apple tree to scale, a shaded apple with a stem and leaf) |
| `flighttime` — `js/kits/flighttime.js` | `in-the-air-over-a-wall` (engine js/core/flighttime.js; stage, readouts and graphs borrowed from `clears`, in the letter d) |
| `bounce` — `js/kits/bounce.js` | `bounce`, `back-past-the-start` (the rebound found from a later time: `T` with `y`) |

## A question in parts — `parts` on a scenario, `js/parts/`

Most papers ask two, three or four things about one motion. A library
scenario lists them in `parts`, from its FIRST paper (the one `example` holds),
and the stage steps through them: (a) (b) (c) buttons over the transport, and
"Show me part (b)" plays on to that part's moment and stops there. The part's
moment is ringed on every graph, its working step is lit in the working panel,
and its answer is the engine's own number with the real numbers substituted.

```js
parts: [
  { label: 'a', kind: 'time', ask: 'How long after A is thrown do the two collide?',
    find: 'meet.t', sym: 't', unit: 's', dp: 3, at: 'meet.t', step: 'meet', paper: 3.5 },
  { label: 'b', kind: 'height', ask: 'How high above the ground are they then?',
    find: 'meet.x', sym: 'h', unit: 'm', at: 'meet.t', uses: ['a'], paper: 8.75 },
  { label: 'c', kind: 'time', ask: 'B is now dropped 2 s after A. When do they meet?',
    given: { 'B.t0': 2 }, find: 'meet.t', sym: 't', unit: 's', at: 'meet.t', paper: 2.75 },
  { label: 'd', out: 'needs momentum, which is another chapter' },
]
```

| field | what it is |
|---|---|
| `label` | `'a'`, `'b'`, `'ii'`, `'c ii'`… — shown as (a), (b), (ii), (c)(ii) |
| `ask` | what the part asks, in our OWN words (the papers are copyrighted). Prose; any maths in it goes between `$` signs and is set by `js/notation.js` (`'the velocity at $t = 2$'`) |
| `kind` | what it answers: `time` `height` `distance` `displacement` `speed` `velocity` `acceleration` `angle` `position` `meeting` `time-above` `area` `impulse` `show` (a "show that"), `force` (a resultant from F = ma), `graph` (a sketch: no `find`, the stage is the answer, `say` tells the student where to look), `other`. The reader matches on it |
| `find` | which engine output answers it: a dotted path into the kit's `solve()` answer (`'meet.t'`, `'f.tFlight'`, `'answers.0.value'`). A segment `name(3)` calls the engine's own function there (`'f.startOf(3)'`, `'f.posA(10).x'`). A segment that meets an array is an index if it is a number, else the element whose `key`, `name`, `id` or `kind` it is (`'extras.tMeet'`, `'events.overtake.t'`). A list of paths for a part with two answers (`['x.0', 'x.1']`: two times) |
| `sym`, `unit`, `dp` | how the answer is typeset: `M`${sym} = ${num(v, dp)} [${unit}]`` — `sym` is notation source (`'v'`, `'t_1'`, `'theta'`), `unit` too (`'m s^-1'`). `dp` defaults to 2; `trim: true` drops trailing zeros. `suffix` is notation after the number, for an answer in letters (`suffix: 'u/g'` sets 2u/g; a coefficient of 1 is left out) or a degree sign. `vec: true` with two paths sets them as one vector in i and j. `words: { yes, no }` for an answer that is true/false |
| `at` | the part's moment on the stage: a path like `find`, a number of seconds, or `'end'`. Left out: the moment of `find` if it is a time, else the end |
| `span` | `[from, to]` instead of `at`, for an interval (a time above a line): both ends ringed, the band marked on the clock |
| `step` | which working step answers it: text matched against the step titles (case and tags ignored), or an index into `kit.working()` |
| `given` | `{ box: value }` — boxes this part adds or changes, from this part on, keyed as `example` is. Leave it out when the example already holds everything |
| `carry` | `{ box: 'a' }` — from this part on, the box takes part (a)'s answer: the ENGINE's value, never a typed one. The part says so: "using t = 3.5 s from (a)" |
| `uses` | `['a']` — the part leans on (a)'s answer without changing a box; it says so the same way |
| `paper` | the mark scheme's answer (a number, or a list for `find` lists), for `test/library.test.mjs` only; `tol` its tolerance (default: half the last place the paper gives). Never shown as the app's answer — rule 4 |
| `rel` | `'>'`, `'<'`, `'>='` or `'<='` for an answer that is a range: `θ > 76.0°` (default `=`) |
| `note` | one line said under the answer, notation between `$` signs (`'They meet at $O$ itself.'`) |
| `out` | instead of everything else: the part is out of scope, and why. It shows as a dimmed chip |

A scenario may also list `answers`: more outputs in the same shape (with `say`
instead of `label` and `ask`, and `example`, that paper's own boxes, when the
scenario's example cannot answer it), for what its OTHER papers ask — the whole
distance, the top speed. Ask Suvat's reader picks a part's answer from a
scenario's parts and answers by key (`speed1`, `speed2`, `graph`, `time`: the
kind, numbered when it comes twice), see `js/parts/answers.js`; the list it is
shown is generated by `node tools/reader-catalogue.mjs` into
`worker/src/library.js`, and a test fails when that is out of date — run it
after changing a scenario's `parts`, `answers`, boxes or `example`. A scenario's `reader` is one line to the reader on how its boxes go together, where the labels are not enough (`journey-stages`).

The boxes for part (k) are the student's boxes at launch, then every earlier
part's `given` and `carry`, in order. A part whose boxes differ from the one
before re-solves. With the student's own numbers the parts still step, and
every answer is what the engine says for those numbers.

`js/parts/parts.js` is pure (lookups and merges, no physics): `pick`,
`partBoxes`, `answerOf`, `momentOf`, `stepOf`. `js/parts/strip.js` draws the
strip, the clock ticks and the working panel's part card. `js/app.js` only
holds `state.part` and calls them.

## The composer — `js/compose/`, `js/render/composed.js`

Ask Suvat's answer to a question no scenario draws ("a car is driven off a
cliff"): a RECIPE that names pieces already listed on this page, checked,
assembled and played by the library's own route.

```json
{ "title": "A car off a cliff", "backdrop": "cliff", "engine": "projectile",
  "objects": [{ "figure": "car", "name": "the car" }],
  "numbers": { "h": 40, "u": 15, "theta": 0 }, "effects": ["splash"] }
```

| file | what it is |
|---|---|
| `js/compose/registry.js` | the pieces, as data: `BACKDROPS` (cliff, tower, bridge, house, ground, sea, road, rails, orchard, hall — each with the engine's `place` word, what is `below`, and whether it has an `edge` to launch from), `FIGURES` (car, lorry, train, cyclist, runner, motorcycle, ball, stone, particle, ship, robot — real size `m`, least drawn size `min`, `views`), `EFFECTS` (splash, dust, ring, flash), `ENGINES` (projectile, stages, overtake, pair, bounce, plane — each the kit it wraps, its view, how many objects, its `boxes`; `ready` says whether the composed stage draws it yet), `ANSWERS` per engine in the parts format |
| `js/compose/recipe.js` | `check(recipe)` → `{ ok, recipe }` or `{ ok: false, reason }`: an unknown piece, a figure the engine's view cannot draw, a number that is not one of the engine's boxes, a negative height, an angle past 90°, a misread huge number — each refused in words. `compose(recipe)` → `{ scenario, kit, boxes }`: a scenario in the library's shape (`group: 'composed'`, `answers` from the engine) and a kit that is the engine's own kit with the composed stage, so the values screen, solve, working, readouts, graphs and parts are the engine's. g left out is Earth's (the app's 9.81) |
| `js/compose/reveal.js` | the veil a composed scene arrives behind: a blurred copy of the stage's canvas, a sweeping light, the Ask Suvat orb, each of the recipe's pieces named and ticked as it goes in (`steps(recipe)`), then lifted from the top down onto the motion. Styles: `css/compose.css` |
| `js/render/composed.js` | the stage. Side on, one scale both ways (`fitClear`); the backdrop from `heights.js` (`seaScene`, `seaCliff`, `riverScene`, `bridge`, `fields`, `tower`, `curtainWall`, `tree`), `target.js` (`house`), `apples.js` (`appleTree`, `apple`), `scenery.js` (`tarmac`, `railBed`, `interior`, `floorboards`, `water`); a thrown figure leaves `thrower`'s hand; a vehicle or a person is the moving thing, drawn round the engine's point, turned to its velocity, wheels turning; the landing effect at the engine's time (`bigSplash`, `dust`, `pulse`, `flash`); the path, velocity (components dashed across, solid up), acceleration, the height and the landing distance as dimension lines |

`byId` finds composed scenarios (`COMPOSED` in `js/scenarios.js`); the app
registers each kit under the scenario's id. `SUVAT.compose(recipe, parts)` in
the console composes and plays one. The reader is told the pieces by a list
generated from the registry: `node tools/compose-catalogue.mjs` writes
`worker/src/compose.js`, and `test/compose.test.mjs` fails when it is stale.

Engines the composed stage draws:
- `projectile` (js/core/height.js; its places `ground`, `water`, `road`,
  `track`, `floor`, `house`, `tree` take a launch from level ground, h = 0,
  and say each place in its own words) — `launch()` in composed.js.
- `pair` and `bounce` (the library's pair and bounce kits, their own boxes,
  including word boxes like `start: drop | down | up`) — `column()` in
  composed.js: the place at x = 0, the line just past its edge, whoever lets
  go standing on the edge (or on the ground below, or holding it at hand
  height in a hall), a trail, a meeting that flashes with its height and time
  marked, a bounce that rings the ground and squashes the ball, the height
  after each bounce marked as it is reached. They take only solid ground below
  (`below`) and only small things (`figures`).
- `stages`, `overtake` and `plane` are listed with `ready: false` and refused
  with that reason: the library's own scenarios already draw a road, rails or
  a map with the figure chosen.

A part that is another place or another motion carries its own `recipe`
(`{ label, asks, answer, recipe }`). `scenesOf(parts)` in recipe.js splits
them: the main scene steps through the rest; each scene of its own is composed
and registered, its part answered by its own engine in the chat reply, with
"Show me this scene" (`showScene(id)` in app.js) opening it behind its veil.

`worker/src/composeplace.js` `toComposed()` runs after the lead's `toPlace()`:
a library pair-vertical or bounce reading whose words name a tower, building,
house or hall becomes a composed recipe with that backdrop — the same boxes,
the parts' answer keys renamed to the composed engine's.

What moves is what is drawn. The reader names it (`who`, in the question's
own word); `figureOf(who)` in registry.js maps the word to a figure, exactly
(diver, person, she → `diver`; parcel, box → `parcel`; football → `ball`) or
as the closest one there is, and then the reply says so ("Drawn as a particle:
there is no rocket figure yet"). `fromReading(x)` in recipe.js turns a reading
of the twelve's launches or of From a height whose mover is not a ball or a
stone into a composed scene with that figure in that place, the numbers moved
unchanged; `app.js` `readInto` tries it first. In the Worker,
`toFigure()` (composeplace.js) fills `who` from the words if the model left it
out, and reads a person who JUMPS with no angle as straight up (θ = 90),
marking `assumed: ['angle']` so the reply says so; `toPlace` carries `who` and
`assumed` along. Places the composer added: `board` (From a height's diving
stand over its pool — `poolScene`, `divingBoard`), `air` (high over fields,
let go beside a hovering balloon; a helicopter or a plane is said to be drawn
as one). js/core/height.js gained the places `water`, `road`, `track`,
`floor`, `house`, `tree`, `air`, each in its own words.

What it lands on follows the question. The reader names it (`below`: sea,
ground, water, river, road, beach), and the Worker reads it from the words
when the model did not ("hits the ground", "at the bottom is the ground");
`toPlace` carries it. js/core/height.js `BELOW` lets any place land on
another surface in its own words ("hits the ground at the foot of the
cliff"). A backdrop lists the surfaces it can stand over (`belows`: a cliff
over the sea, the ground or a beach; a bridge over a river or a road; a tower
or a house over the ground or a road); `belowOf()` reads the word, and
`placeOf(recipe)` is the backdrop as the recipe has it. `fromReading` composes
a From-a-height reading whose surface is not the place's own, whatever moves.
The stage draws a cliff over fields with `scree()` at its foot, or over sand,
and a bridge over a road; the landing kicks up dust.

Places in `js/render/places.js` (PLACE_ART, by the registry's backdrop
name; each paints the backdrop and what it is launched from, called by
composed.js scenery()): `mountain` (two ranges of peaks lit on one face and
shaded on the other, snow to a ragged line, the far range hazed; a pine
shoulder, hillsides falling away to the valley floor and its stream; the
library's cliff as the ledge, scree at its foot), `forest` (trees to scale,
15–25 m, in three layers with mist between, light slanting through, great
foreground trunks, a forest floor of litter, moss, ferns and a path; a timber
platform with a rail and a ladder), `harbour` (a quay with its coping, tide
line, fenders, chain, bollard and ladder; boats with wheelhouses, masts and
reflections out in the harbour; a breakwater and a lighthouse), `city` (a
skyline, nearer blocks, the office block with a parapet and rooftop plant;
the street with a kerb, lamps and parked cars; `cityWidth()` frames the
block and puts the height's dimension beside it), `moon` (stars, the Earth
across a curved terminator, a far crater rim, a cratered plain, the cliff in
grey; g 1.62) and `mars` (a butterscotch sky with dust low over the plain,
stepped mesas, the cliff in red, or a launch pad with a gantry; g 3.71). On
the Moon and Mars the thrower wears a spacesuit (`thrower(…, { suit })`).
`seaCliff(…, { tones, cap, foam })` recolours the library cliff, leaves its
turf off, or its sea foot. A backdrop with its own g (registry `g`) uses it
unless the question gives one, and the reply says so. Two from one place:
the `twin` engine (js/core/twin.js, js/kits/twin.js), drawn by launch() as
one mover or two: B waits behind A (a thrower's span, or a vehicle's
length) and eases onto the engine's point as it goes; each has its own
H_max, and its labels carry its letter.

Props in `js/render/props.js` (`drawProp(g, kind, x, y, R, spin, ring)`,
each shaded and lit from the left, turning as it flies): `football`,
`tennisBall`, `golfBall`, `basketball`, `shot`, `snowball`, `waterBalloon`,
`phone`, `book`, `hammer` — registry figures with `prop: true`, read from a
question's words by `figureOf()`. A ball of a sport stays on the twelve's
pitch (fromReading's BALLISH); a phone, a book, a hammer or a water balloon
is composed and drawn as itself. Two on one vertical line can be any prop;
a bounce, a ball of a sport.

Effects in `js/render/impacts.js`, each at the engine's moment (age, life),
leaving what it makes once its life is over: `crater` (a bowl with a lit rim,
ejecta in rays; the Moon's and Mars's own landing, registry `lands`),
`snowPuff` (registry `snow`: puffs and clods, a dent left), `divot` (turf
clods, a scar), `sparks` (streaks and a hot glow), `confetti` (paper bursting
up and fluttering down) and `smokeTrail` (registry `smoke`: puffs along the
path behind it, swelling and thinning; a rocket's by default). Wet landings
keep their splash. Places `snow` (peaks, snow-laden pines, drifts, ski
tracks; a rock ledge under a snow cap with a cornice) and `desert` (a hazy
sky, buttes in heat shimmer, dunes with windward slopes and shaded slip
faces, rippled sand, cacti; a sandstone outcrop), both level places in
js/core/height.js. A place that draws its own ledge names it in the title
(registry `high`: "a snowy ledge", "a ledge on the Moon"). Also `splat` (a water balloon
bursting on dry ground, its own landing: registry figure `lands`) and
`crack` (a dropped phone's).

Animals in `js/render/animals.js` (`cat`, `dog`, `monkey`, `frog`, each
`(g, x, y, L, P, { leap, land, spin, ring })`): crouched on the edge, they
spring, stretch out in the air and reach down to land; registry figures with
`animal: true`. A squirrel or a fox is drawn as the cat, a flea or a kangaroo
as the frog, and the reply says so. `javelin(g, x, y, L, ang)`, thrown and
pointed along its path.

Strikers in `js/render/athletes.js`: `golfer` and `kicker`, `(g, X, Y, H, P,
{ pose, ring })`, feet at (X, Y), the ball at `GOLF_BALL_AT` / `KICK_BALL_AT`
of their height ahead of the feet; pose 0 the backswing or the leg drawn
back, 0.5 the strike, 1 the follow-through. A golf ball is hit and a
football kicked by them (registry figure `verb`), except from a hand's
height. Places `pier` (a seaside pier on iron piles braced in X, railings
and lamps open at its end, beach huts and a pavilion along the shore, gulls)
and `site` (scaffolding up a concrete frame, safety netting, a tower crane
with a load on its hook, mud with ruts, a skip and sand).

Carriers in `js/render/carriers.js` (`helicopter`, `plane`, `drone`, `bird`;
registry `CARRIERS`, `carrierIn(text)`; a recipe's `carrier`, backdrop `air`
only, a balloon if left out or unknown): drawn at the point it lets go from,
holding the thing before; a moving one (a plane, a drone flying across)
keeps over what it drops at the engine's speed across and flies on off the
frame after it lands, fading; a hovering one fades where it is. The
helicopter is rescue yellow and the plane a light cargo plane, high wing
and propeller, its belly door at the point, aft of the wing; the drone has
four rotor discs and landing legs; the gull is outlined and its wings are
never flat. No thrower is drawn under a carrier (`thrown` excludes it), and
labels keep off it (`L.reserve`). A recipe keeps the question's own word
(`carrierWord`: "a seagull") for its title and caption, and the reader
composes a stone or a ball let go from a helicopter, a plane, a drone or a
bird rather than leaving it to the twelve. What a carrier lets go is what
moves (`whoIn`). Off a carrier, "Out from the edge" reads "Across from
where it was let go". Thrown from a hand's height, a thing
starts in the hand of the thrower (drawn larger than the scale so it reads)
and eases onto the engine's path; struck balls are to scale with a small
floor, resting one radius up off the ground.

Batch 7. Places `canyon` (banded red rock walls with buttresses and ledges,
mesas on the far rim in haze, a silt-green river in the gorge; from the near
rim, a juniper on it), `waterfall` (a wooded gorge, the river pouring over a
mossy rock step into a plunge pool with foam rings and spray; it leaves from
the dry rock beside the lip) and `lighthouse` (on its rock in the sea, white
and red bands, from the gallery round its lantern; its beam turns at night);
`strata()` lays banded rock for any of them. Effects in `impacts.js`:
`leaves` (a forest's own landing: autumn leaves flung up and fluttering
down, a scatter left), `sandSpray` (registry `sand`, a desert's: grains in a
low fan, a cloud, a dent with heaps), `mud` (a building site's: a crown of
wet mud, clots, a puddled dent with spatters; on the open side only) and
`burst` (a firework's at the top of its flight, on its own wall clock from
the engine's `tApex`: a flash, shells of stars drooping and twinkling out;
deeper tones ringed dark by day). Figure `firework` (composed.js
`firework()`: a red paper tube with a gold band, its cap and guide stick,
sparks at the launch; after its burst, only the charred tube and stick fall,
tumbling); it trails smoke and bursts by default. A backdrop's `lands`
(forest leaves, desert sand, site mud) is its landing's effect.


Batch 8, the sports grounds. Places `pitch` (a football stadium: the stand
across with its crowd, roof and floodlight pylons, advertising boards, the
pitch mown in stripes; from a height, `grandstand()`: an upper tier
cantilevered out to its front edge over a lower tier set back, crowd on
both), `golf` (a tree line and a clubhouse, the fairway in stripes between
the rough, a bunker clear of the landing, the green round where it lands
and the pin just beyond, its flag waving; from a height, a raised tee on a
wall of railway sleepers) and `stadium` (athletics: the far straight's red
lanes, the infield with white arcs every ten metres out from the throw, the
near track along the foot of the frame). Helpers `crowd()`, `farStand()`,
`mownTurf()`. Effect `net` in `impacts.js` as `goal(g, G, age, life)`: a
goal side on, its front post where the path comes down through 1.8 m and
its net just behind the landing, the back bulging and swinging back when
the ball meets it; a football (or a ball) on a pitch goes in the goal by
default, anything else digs a divot. `archer(…, { pose, aim, ring })` and
`archerHand(H, aim)` in `athletes.js`: an arrow is shot by an archer, the
bow arm out along the aim, the string drawn to the cheek and loosed; the
arrow sits on the bow (sized to the archer) and eases onto the engine's
path. Golf and athletics words (`fairway`, `tee box`, `shot put`, `athletics
track`…) name their places; football words keep the app's own pitch.

Figures added to `figures.js`: `diver(g, cx, cy, H, P, { tuck, arms, spin, dir })`
— a person in a swimsuit and cap, drawn round the hip so a stage can turn
them; `tuck` 0–1 folds the knees to the chest and the arms round the shins,
`arms` 0–1 swings them from the sides through in front to overhead; on the
composed stage a jump upwards tucks and turns one and a half times to enter
head first, a dive out tips over gently, and the entry splashes with
`ripples()` spreading. `DIVER_FEET` stands one on a board. `skateboarder(…)`
— the same person crouched on a deck with trucks and turning wheels
(`SKATE_FEET`). `parcel(g, cx, cy, L, P, { spin })` — a taped cardboard box
with a label.

Pieces the composer added (composed.js): `wall(g, x0, edge, top, Y, k)` — a
dressed stone wall with a coping; `jetty(g, x0, edge, deck, Y, bottom, k)` — a
timber jetty on piles over the sea. figures.js gained `airborne` (no ground
shadow under a figure in the air).

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

`solveTarget({ g, h0, u, theta, ux, uy, d, H, tAt, kind, find, T, top, flag, pick, from, winLo, winHi, winBreak })` — kind is wall, fence, net, tree, face (a wall it hits, perhaps with a window) or point;
— given the launch, what happens at the point; or, with `find`, the angle
(`theta`: a quadratic in tan θ, two roots), the speed (`u`), or both from the
time to the point (`time`, with `T`) or from the greatest height (`apex`). `flights` holds
every answer, steepest first; `pick` chooses the one flown. `targetWorking` —
the find, the path as an equation in x, the point, the top, the landing, the
mark, and where a wall that high is cleared.

Used by: `over-the-wall`.

### An impulse — `js/core/impulse.js`

`impulseLink({ m, I, u, v })` — the one momentum step a SUVAT motion takes,
along one line: I = m(v − u), with u just before and v just after, signed the
same way as I. Give the mass and any two of I, u, v; the third comes back with
the working row that found it (`row: { f, s, r }`, set as maths), or
`{ ok: false, reason }` — no mass, too little, or three that disagree. In scope
(build-rules.md) as a link between flights: a bounce, a kick, a catch. Never a
collision between two bodies or a force over a time.

Used by: `bounce` (up positive: before is −V, after +w, so I = m(w + V)).

### A ball that bounces — `js/core/bounce.js`

`solveBounce({ start, h, U, V, w, H, e, m, I, n, y, stop, axis, g })` — `start` is
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

**The impulse — the one momentum step, for this vertical bounce only.** With
the mass m and the impulse I from the ground, the speeds before and after add
to I/m (arriving down, leaving up: I = m(v_after + v_before)). With the
rebound given it finds the impact speed — and the throw from it (Edexcel M1
June 2018 Q4: 7 N s on 0.2 kg rebounding at 10 m s⁻¹ hit at 25, so U = 24);
with the impact speed known it finds the rebound; with the mass alone the
impulse is found (`params.I`). Its working is its own first step. Nothing
else in the engines is momentum: a collision, a recoil or a force over a
time is another chapter. `yAfter` is the first time it is at y after the
bounce, whether or not the run stops there.

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

### Up a rough slope — `js/core/rough.js`

Projected up a rough slope. `solveRough({ u, alpha, mu, m, g })`: `a` up the
slope from −g(sin α + μ cos α) (with m, R and F in newtons, through R = m g cos α
and F = μR), `sUp` and `tUp` to rest, `stays` (μ ≥ tan α), and if not `aDown`,
`vBack`, `tDown` back to the start. The motion turns at `f.tTop`.

### Freewheeling downhill — `js/core/hill.js`

Down a slope with a constant acceleration, and F = ma along it. `solveHill({
u, v, s, t, a, m, R, alpha, g })`: three of the five (or the angle and two of
them) through the twelve's `solve`; with m, the resultant `F`, and the angle
the slope must have with no resistance (`alpha0`) and against R (`alphaR`), from
m g sin α − R = ma. Given α, the same equation gives a first.

### Back off the boards — `js/core/wall.js`

A slide against a constant resistance into a wall and back. `solveWall({ uA,
uB, AB, AC, R | m, I | w })`: a from v² = u² − 2as, the speed at C, F = ma for
m (or R), the rebound through `impulseLink` (js/core/impulse.js), then the time
`tBack`, distance `back` and resting place `stopAt` from A. The motion `f`
turns round at `f.tC`.

### Down the ice — `js/core/ice.js`

A constant deceleration along ABCD from speeds alone. `solveIce({ uA, uB, uC,
AD | AB | BC | a })`: each distance over a from v² = u² − 2as, the ratio AB : BC
in lowest terms (`ratio`, `ratioSrc`), then — given one more number — a, AB,
BC, CD, AD and the times `tB`, `tC`, `tD`. With none, `scaled` is false and
everything is over a (a = 1): the kit's `resolveUnits` and readouts say so.

### Over the rock — `js/core/heli.js`

A helicopter at a constant height with a constant acceleration in i (east) and
j (north), on `planeMotion`. `solveHeli({ r0, u, a, T, D, P })`: its speed and
bearing at T; the first time it is D from its start (from rest ½|a|t² = D, else
the first root of |ut + ½at²| = D); whether it passes directly over P (the i
equation's times, checked in j), and then the average velocity, its size, the
path length and the average speed, and whether they agree (`straight`).
Answers in `answers.T`, `answers.D`, `answers.P`.

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

### Under the ceiling — `js/core/ceiling.js`

`solveCeiling({ g, h, u, top, C })` — straight up from h above the floor:
the speed given or found from the greatest height (v² = u² + 2as at the top);
under a ceiling C, whether it reaches it — if so, the speed there and the first
time (`quadRoots`), the run ending there; if not, the gap below; else the time
back to the floor. The motion is `flight` at 90°. Used by: `under-the-ceiling`.

## Notation — `js/notation.js`

`vec(i)`, `vec r` — a vector, in bold (HTML `<b class="m-vec">`, canvas
Unicode mathematical bold italic 𝒊). Added for `vectors-ij`; any vector anywhere.
A vector is held to its coefficient on one line (`.m-nb`): 28𝒊 never breaks.

`paren(src)` — a piece of notation source in brackets when it has a + or − at
its top level, so it can go into a product or after a minus as it stands
(`20 - V` → `(20 - V)`; `V`, `2V` and `(V - 5)/2` unchanged). Any substitution
built from pieces uses it, so no piece is ever a bracket short.

## Stages — `js/render/`

### The camera — `js/render/kitview.js` (every library stage, for free)

Drag to pan, wheel or pinch to zoom, Fit and double-click to reset: the
twelve's own camera (`scene.createCamera`, `attachControls`, `fitView`,
`easeCamera`), not a copy. `kitView(canvas, cam)` reads it as a view onto the
stage's pixel layout before the kit draws, and `fitCanvas` applies it, so a kit
needs no code of its own. Zoom runs from the fit (1) in to 6 — never out past
it, so the stage's labels stay above the 13 px floor — and a pan stops at the
layout's edges. The app calls it at its one render line for kits.
What belongs to the screen rather than the place — a graph panel, a key —
is drawn after the scene, after `unview(g)` (`util.js`), so it neither zooms
nor pans, with its own `labels()`.

### Scenery — `js/render/scenery.js` (every library stage stands on these)

The places, drawn as places, in the stadium's colours (`env()` reads the
theme's sky, haze, sun, grass, earth, concrete, window and shadow tokens; all
under about 35% saturation, away from the physics hues). Seeded (`rng`), so a
scene draws the same every frame.
- `skyscape(g, x0, y0, x1, horizon, { seed, sun, clouds, far })` — the sky in
  the theme's three bands, the sun's glow low on the left, soft clouds, and a
  far layer: `'hills'` (two misted ridges), `'skyline'` (low blocks, lit
  windows at night), `'trees'` (a tree line), or `'none'`; haze at the horizon.
- `grass`, `sandGround`, `tarmac` (grain, edge line, dashed centre, kerb,
  verge), `railBed` (ballast, sleepers end on, a rail with a bright head),
  `floorboards`, `water` (crests drifting with `phase`), `stone` (courses lit
  from the left), `interior` (a wall, high windows with light falling, a dado
  and panels), `softShadow(g, x, y, rx, ry)`.
- From above: `seaFromAbove`, `floorFromAbove` (tiles, grout, a sheen),
  `fieldFromAbove` (mown stripes), `skyFromAbove` (cloud shadows).
- `paper(g, x, y, w, h)` — a sheet with a shadow and a fine grid: a graph drawn
  over a scene sits on it, so it reads.
- `landscape(g, w, h, Y, o)` — a whole outdoor scene: `skyscape` down to the
  ground at Y, grass (or sand or water) below.
- `fitSide(box, area, { sky })` — fit a side-on motion's own extent (metres,
  y up) to the canvas at one scale both ways. A wide, low motion leaves height
  spare; the ground comes up to take most of it rather than leave the action
  in a strip under an empty sky. Returns `{ k, X, Y, ox, oy }`.

### Effects — `js/render/effects.js`

The moments a motion has: `dust`, `splash`, `pulse` (two meet; a mark
passed), `flash` (a collision), `squash(age, life)` (a bounce),
`speedLines`. Each takes `age` — the time since the ENGINE's event — and a
`life`; `ageOf(t, tEvent, tMax)` gives both (an event at the very end, where
playback stops, shows a third of the way through, so the impact still reads).
The engine says when; the art only shows it (rule 4).

### Figures, detailed — `js/render/figures.js`

`car` — a painted body with a sheen, glass with a highlight, a door seam,
`roadWheel`s in their arches turning with the distance, a headlight and a tail
light that glows when `brake` (slowing: v·a < 0), a soft shadow. `train` —
cream carriages with a livery stripe, glazed windows and doors, bogies with
road wheels, a headlight, a pantograph, a soft shadow. `runner` — dressed (a
shirt, shorts, skin lit from the left, hair, shoes), the far limbs in shade, a
soft shadow; the stride is unchanged. The surfaces `roadway`, `rails` and
`runningTrack` draw the scenery's tarmac, railway bed and a red running track.

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

- `thrower(g, X, Y, H, P, { dir, pose, aim, ring })` — a dressed person who
  winds up (`pose` 0) and releases (1) along `aim` degrees, feet at (X, Y),
  at least `THROWER_MIN` (50 px) tall. `throwerHand(H, aim)` is the hand at
  release. Every launch with a person behind it uses it.
- `ballAt(g, x, y, r, color)` — the stadium's shaded ball, with a ring in
  `color` when there are two to tell apart. Never a hollow ring or a dot.
- `hudBoxes(w, rows)` (in `util.js`) — the readouts' boxes over the stage, at
  laptop and phone sizes, for `labels().reserve` and for keeping key art out
  from under them. Every stage uses it rather than its own guess.
- `sig3(x)` (in `util.js`) — a ruler's or a tag's number to three significant
  figures, as a paper answers.

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
kind of thing to clear. A wall it hits may carry a window (`winLo`, `winHi`,
`winBreak`): the engine says whether the hit is in it and whether it breaks;
the window is drawn glazed in the wall. Used by: `over-the-wall`.

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

### A sports hall, side on — `js/render/ceiling.js`

The floor, `hallCeiling(g, x0, x1, Y, P)` (exported — a slab with beams), the
kicker (`runner`); the ball up one line and down beside it, its velocity solid;
the greatest height marked; the moment it meets the ceiling ringed with the
time and speed. Kit `ceiling`. Used by: `under-the-ceiling`.
