# The flight view, rebuilt in a place

Notes on what changed, and why. Companion to `design/dimensions.md` (every
measurement) and `design/launch-map.svg` (where each scenario starts).

## Removed: the perspective view — 7 October 2026

There used to be a second view of the same flight: the world extruded instead
of cut, with an orbitable camera, four named viewpoints and a hand-written
perspective projector. It is gone, along with `js/render/scene3d.js`,
`js/render/world3d.js`, `js/render/grid.js`, the 2D/3D switch and the
see-through-the-near-stand option. It cost a third of the render code and
earned no physics: a projectile question is a question about one vertical
plane, and the cut IS that plane.

Two consequences worth knowing. The flight model is now genuinely planar —
`flight()` lost its `azimuth` argument and its `uz`/`z` components, which were
always zero and existed only to point a camera. And the world model keeps its
third dimension on purpose: `z` is what the section is cut at, not something
that gets drawn.

Sections below that describe the extruded model are kept as history. Where
they describe the world data — plan geometry, dimensions, tokens — they are
still live, because the section reads the same arrays.

## The idea

The motion used to happen on a blank grid. It now happens in a large modern
football stadium, at 1 unit = 1 metre, with nothing exaggerated. The object is
a football, 0.22 m across, drawn 0.22 m across.

There was a district around the stadium as well — streets, traffic, a station,
parks. It has been removed; *Nothing outside the stadium* below says why.

There is **one model**, shown one way: a cross-section through it along the
plane the flight happens in. The model is kept in three dimensions so the
section can move with the launch site — a free kick and a goal kick cut
different planes through the same stadium — but the only thing ever drawn is
the cut.

The stadium takes its proportions from Tottenham Hotspur Stadium — a 250 × 200 m
bowl, a 48 m cable-net roof on an elliptical ring, one end a single steep tier —
but it is an original building. There is no club name, crest, bird, sponsor or
kit colour anywhere: the hoardings are blank LED panels in a 2.4 m rhythm and
the seats are neutral grey.

## New files

| File | What it is |
| --- | --- |
| `js/world/dims.js` | The dimension sheet, as data. Single source of truth for both renderers and for `design/dimensions.md`. |
| `js/world/world.js` | Builds the world once: ground surfaces, solids, markings, props, the four seating decks, the roof. Also the cross-section slicer and the per-scenario launch sites. |
| `js/render/world2d.js` | Paints the cross-section: sky, far field, surfaces, markings, boxes, decks, roof, props. Owns the LOD rules and the offscreen layer cache. |
| `tools/dimension-sheet.mjs` | Writes `design/dimensions.md` from `dims.js`, so the sheet cannot drift. |
| `tools/launch-map.mjs` | Writes `design/launch-map.svg` from `world.js` and the real engine. |

## `js/render/scene.js` — the 2D view

**Two coordinate systems, kept apart.** Flight `x` is metres from the launch
point, which is what the physics talks about. Section `u` is metres along the
cutting plane, which is what the world is built in. They differ by one constant
`u0` that the launch site supplies, so `sx(x) = su(u0 + x)`. Every axis label
the student reads is in flight `x`; every piece of scenery is placed in section
`u`. Nothing is converted twice, and a free kick shooting west shares one world
with a goal kick shooting east without either being drawn backwards.

**The camera fits once.** `cam.auto` became `cam.fit`, a one-shot flag consumed
by the first render after it is set. Launch sets it; double-click sets it; a
resize sets it only if the student has not panned. It is never set during a
flight. This is the whole reason a faster launch now visibly crosses the pitch
faster — a camera that keeps rescaling turns every launch into the same picture.
There is also a 96 m minimum span, so a short flight is still seen *somewhere*.

**The world is painted once.** `W2.layer()` keeps an offscreen canvas keyed on
size, theme, camera and scenario. During a flight the key never changes, so one
bitmap is blitted and the only live drawing is the ball, its trail and the
arrows — a few dozen calls a frame.

**New on screen:** a scale bar whose length is a round number of metres, a
height ruler up the left edge, named landmark lines (roof 48 m, upper tier front
25 m, back of the lower tier 10 m, crossbar 2.44 m), and the frame's width and
launch site in words. The metre grid is now pinned to the launch point rather
than the world origin, and is off by default — the ruler and the scale bar carry
the measuring job, and the grid is the overlay you switch on.

**Markers grew up.** The fence is a defensive wall of four players at 1.8 m and
still draggable. The height line snaps onto the crossbar, the back of the lower
tier, the upper tier front and the roof, and names what it has snapped to. The
target starts on the top corner of the goal. Every existing overlay — traced
path, equal-time marks, component arrows, range bar, apex, the perpendicular
instant — works unchanged.

**The ball is drawn at 0.22 m.** Below about 5 px of radius it also gets a ring,
which is chrome and not the ball; above that the ring becomes its outline.

**The ground is stated, not hidden.** The idealised model lands on a flat plane
at y = 0 that runs under everything, stands included. That plane is drawn right
across the canvas and the ground below it is filled solid, so the idealisation
is visible rather than quietly papered over by scenery.

## Two geometry bugs worth naming

Both are in the world model itself — `js/world/world.js` and `dims.js` — so
they still matter to the section and to `design/launch-map.svg`.

The roof opening was an ellipse, 128 × 82, over a front row that is a rounded
rectangle. In the pitch-corner direction the ellipse reaches about 53 m while
the pitch corner is at 62.6 m, so the roof oversailed nine metres of playing
surface at each corner while leaving the end seats open to the sky. The
opening is now the front row's own plan inset by 2 m, so every seat is covered
and the whole pitch is open — by construction rather than by tuning.

The bowl and the roof were generated from two *different* rounded rectangles —
the bowl by offsetting the front row outward, the roof from its own plan with
its own corner radius. They agreed along the straight sides and missed each
other in the corners. Both now come from one function, `planRadius(direction,
d)`: the front row is a rounded rectangle 124 × 84 with a 30 m radius, and
offsetting it outward by d grows every radius by exactly d. 63 m of depth
therefore gives a bowl and a roof that are both 250 × 210 with a 93 m corner
radius, by construction rather than by coincidence.

## `css/tokens.css`

A new scenery block at the bottom, in two themes. Rules it follows:

- **Three value bands, at least 2:1 apart.** A section cuts material, and the
  convention is that cut material is the darkest thing on the page, the volume
  behind the cut is the lightest, and the surfaces you are looking at sit
  between: `--structure-dark` (poché) → `--seat` (raked seating) → `--interior`.
  The first attempt had seating and cut concrete at 1.01:1 — the same colour —
  and the whole bowl read as a quarry face.
- **Scenery never competes.** Every token is low chroma and lives in a narrow
  lightness band, well away from the five physics hues. In particular the
  brickwork was pulled out of the velocity hue: a district of warm orange roofs
  is a district arguing with the velocity vector. Velocity itself was darkened
  in the light theme, from 3.2:1 against its own sky to 5.9:1 — the loudest
  thing on screen cannot be the weakest-contrasting element in the frame.
- **Light is a daytime match, dark is a floodlit night match** — not a dark copy
  of the day. At night the *grass gets brighter* while everything around it gets
  darker, the box glazing lights up, beams fall from the compression ring onto
  the turf (clipped to the roof opening, because light does not pass through a
  stand), and a glow dome sits over the bowl that gets *stronger* as you pull
  away — which is how you find a night match from a mile off, and the opposite
  of what level-of-detail would do if left to itself.
- **The value bands invert at night, deliberately.** On paper the poché is
  darkest and the volume behind is lightest. Against a near-black sky the
  darkest possible poché is invisible, so at night the cut material is the
  lightest of the three — it is the edge catching the floodlights — and the
  unlit volume behind it is the darkest. Same convention, read by another light.
- **Figure and ground.** `--structure-dark` is the poché — the material the
  section actually cuts — and sits clearly darker than `--interior`, the volume
  behind the cut. Without that gap a three-tier stand is a grey wedge.

New tokens: `--sky-top`, `--sky-bottom`, `--haze`, `--earth`, `--interior`,
`--terrain`, `--grass`, `--grass-alt`, `--runoff`, `--pitchline`, `--concrete`,
`--window`, `--glass`, `--metal`, `--net`, `--seat`, `--seat-alt`, `--board`,
`--structure`, `--structure-dark`, `--roof-top`, `--roof-under`, `--prop`,
`--flood`, `--far-grid`.

The brick, roofing, render, panel, asphalt, paving, kerb-line, ballast, park,
pond, trunk and five car-paint tokens went with the district they were mixed
for. The note about pulling brickwork out of the velocity hue is kept above
because it is why the palette is built the way it is, not because there is
still brickwork.

## Readability decisions worth recording

- **Labels have a 13 px floor and no plates.** The floor used to be 15, which
  silently overrode every `size: 13` a caller asked for. Opaque plates punched
  white holes in the daylight drawing, so a label now gets a halo stroke in the
  surface colour instead — it lifts text off the background without erasing it.
  A label that cannot find space used to be dropped; important ones now take a
  further slot and draw a leader back to what they name.
- **Nothing points at nothing.** A landmark height is only drawn when the
  geometry carrying it is in this cut and on screen, and it anchors to that
  geometry's own position rather than to the right edge. Seven of the nine
  scenarios cut across the pitch, where there is no goal — so there is no
  crossbar label in them.
- **The range bracket measures the past.** Drawing the full range while the ball
  is halfway there puts a tick on empty grass fifty metres ahead of the object
  and calls it a measurement. It reads "travelled so far" during the flight and
  snaps to the full range on landing.
- **The crowd is the ruler.** A section cuts through one spectator per row, and
  a seated person is 0.85 m above a seat on rows 0.80 m apart. That makes the
  stand measurable by eye, and it is the best scale reference in the building.

## Motion

Playback was already real time; it is now labelled as such and joined by 0.5×
and 0.25×, as a segmented control in the stage bar. Because the camera
no longer rescales mid-flight, a faster launch visibly crosses the pitch faster.

## Level of detail

Three bands, by visible width: **pitch** under 30 m, **stadium** 30–300 m,
**wide** 300 m–2 km. They used to be three *cameras* as well, offered as a
segmented control in the stage bar — Pitch riding with the ball at a 27 m span,
Stadium the fit, Wide pulled back to 941 m. That control is gone; see *One
view* at the end of this file. The bands survive as what they always were
underneath: thresholds for how much detail to draw at a given visible width,
now reached by the wheel rather than by a button. Each feature also has its own threshold, so detail
fades independently rather than snapping at a band edge — pitch markings survive
to 560 m because they are still readable there, individual seat rows stop at
130 m because they are not. Every fade runs over the last quarter of its range.
The full table is in `design/dimensions.md`.

## Light, colour and depth

The first version was legible and grey. These are the changes that made it a
place rather than a diagram of one.

**Time of day.** Light is now a late-afternoon match: the sun low in the west,
a warm band along the horizon, a blue sky above it, and long shadows. Dark is
still a floodlit night. Both are lit scenes with a key and a fill; a scene with
no light in it has no depth, whatever colours you give it.

**Shadows.** A band of shade is thrown across the pitch from each stand,
worked out from the sun's 28° elevation: a 35 m stand lays 66 m of shadow,
which is the one cue that tells you, in a drawing with no perspective in it,
which things are tall.

**Light in a flat drawing.** The section has no normals to shade, so the light
is put in by hand: surfaces facing the sun take a warm lift, surfaces turned
away take the cool of the sky, and the volume behind the cut graduates from
daylight at the top to shadow at the bottom.

**Colour where it is real.** Cars take one of five muted automotive paints —
silver, graphite, white, navy, bottle green, and deliberately no reds, because
a red car at that size reads as a velocity vector from across the room. Houses
take brick, render or panel from their own position, with two roof colours;
the seats are two greys in broad bands and never a club's. Scenery is held
under about 35% saturation throughout and the trajectory carries a casing
stroke, so none of it can out-shout the physics.

**The camera travels.** Zoom and refits are eased rather than cut:
scale in log space because zoom is multiplicative, the look-at point linearly.
Dragging stays immediate — lag in a direct manipulation reads as a fault, not
as smoothing.

**Streets, not runways.** Terraces are built in 88 m blocks with 11 m cross
streets between them. One unbroken six-hundred-metre ridge read as a runway.

## The model, gone over again

A second pass, after the first one had been looked at properly. Six things.
Three of them — the cracked quads, the bowl mesh, the eleven-box car — were
about the extruded model and are history now; the rest changed the world data
and still show up in the section.

**The pitch had twenty-three people standing on it.** A kick-off formation,
drawn as 1.8 m cards. At the size the touchline camera sees them, a figure is
about as big as the velocity arrow and about as dark — so the one thing on
screen a student is meant to follow had twenty-three decoys of the same size
scattered across the ground it has to cross. They are gone: no players, no
keepers, no referee. The scale reference is the crowd in the stands, where
nothing has to be read through it. The corner flags stay, because a flag is
1.5 m and does not move. (The cars on the road and the people on the podium
were named here too, and they have since gone with the district.)

**Every quad had a crack down its edge.** A canvas antialiases each polygon
edge against whatever is already behind it, so two faces sharing an edge leave
a half-covered hairline between them — and a bowl made of several thousand
faces turned into crazed porcelain. An opaque face is now stroked with its own
fill colour, which puts the half-pixel back. This is the single change that
made the model read as a surface rather than as a mesh. It is skipped on
translucent faces, where a stroke would double the coverage along the edge and
draw the mesh back on in outline, and on faces under about fourteen pixels of
girth, where the crack is narrower than the antialiasing either side of it and
sealing it costs a second raster pass for nothing.

**The inside of the bowl was bands of mud.** The flat concourse runs and the
balcony fronts were both taking `--structure-dark`, which is the poché tone —
the colour of CUT material in the section drawing, and quite wrong for a wall
you are looking AT. In every stadium ever built the balcony front is pale
concrete. It is pale concrete here now, with the concourse behind each tier
the same material in shadow, and nothing else in the bowl bright: an early
attempt that also lit the gangways turned the stand into tartan and left the
seating as the gaps in a grid. The seating itself takes the row rhythm — a
seat back catches the light, the tread in front of it does not — instead of
the two broad bands of grey it had, which read as geology.

**The stairs are a known width.** Eighteen vomitories climb the rake, and they
are most of why a photograph of a stand tells you how big it is: a known 2.6 m
against an unknown wall of seats. They are laid as their own strips rather
than as columns of the bowl mesh, because a column is 2.8 m wide at the front
row and 5 m at the back, and a flight of steps that widens as it climbs is the
one thing on this model nobody would believe.

**A car was a loaf of bread.** Two stacked boxes. It is eleven boxes now —
four wheels, a body sitting clear of the road, and a glasshouse set in on all
four sides and set back along the length so the thing has a bonnet — and a bus
has its two decks of windows. Both only for cars big enough on screen to be
worth it; past that it is the body and the glasshouse, and past that one card.
A tree was a balloon on a stick: it has a box trunk that takes the same light
as everything else, and a crown of three overlapping lobes in three greens.
The dugout was a pane of blue glass hanging at the touchline; it is a solid
back with a glass canopy over it. The goal net was a box of frosted glass and
is now the mesh it actually is, on the back, both sides and the roof of the
net, at 0.9 m squares — reverting to the translucent box past 170 m, where the
squares would be finer than a pixel. Terraced houses within 320 m have two
floors of windows at one pair per 5.5 m frontage, lit from inside at night
with a quarter of them dark.

**The roof was a tarpaulin.** The ring is finer, the fascia and soffit shade
across each ring rather than stepping at it, the inner third is the brighter
material a cable-net roof really is where it has to let light onto the grass,
and the radial cables stopped being dark gashes. The soffit is no longer close
to black: it is a dark surface being bounced into by a lit pitch, and it
brightens towards the opening. The outside of the bowl gained a plinth, the
glazed concourse that rings every modern stadium, and a panelled upper facade
whose bay rhythm is a change of VALUE rather than of material — alternating
two tones across whole bays chopped the elevation into a chequerboard that was
visible from inside the bowl, over the roof.

### What it costs

Measured against the previous commit, back when the perspective view still
shipped. Kept for the record; the orbiting rows no longer apply.

| | before | after |
| --- | --- | --- |
| frame during a flight | 0.51 ms | 0.52 ms |
| frame while orbiting | 5.4–6.1 ms | 6.4–9.3 ms |
| the one repaint when the camera stops | 28–33 ms | 49–54 ms |

The frame that matters — the one that runs sixty times a second while the ball
is in the air — is unchanged, because the scenery is still painted once into
an offscreen bitmap and blitted after that. Orbiting still has eight times the
headroom it needs. The repaint when the camera stops is the price of the finer
bowl and roof; it happens once, and what the user sees is the coarse model
sharpening, not a stutter. The roof was taken back from 120 segments to 96 and
from ten rings to eight when the first version of this pass put that repaint
at 75 ms.

### Two stale references, fixed

`tools/dimension-sheet.mjs` and `tools/launch-map.mjs` were still reading
`D.roof.ringA` / `ringB` — the semi-axes of an elliptical roof opening that
stopped existing when the roof and the bowl were made to share one
rounded-rectangle family. The sheet had been printing `undefined × undefined`
and `NaN × NaN`, and the map had been drawing an ellipse with `rx="NaN"`. Both
now derive the opening from the front row inset by `roof.ringInset`, which is
what the renderer does: 120 × 80 m. `D.lod.players` went with the players.

## What did not change

`js/core/` — `projectile.js`, `trajectory.js`, `suvat.js`, `solve.js`,
`question.js` — is untouched. All 149 engine, solver and question tests still
pass. The five physics hues are the same five. Every overlay that existed before
still exists and still works.

---

## The framing band, reconsidered — 7 October 2026

The brief this view was built to is one sentence: *fit before launch and do not
rescale during it.* A camera that keeps rescaling turns a fast launch and a
slow one into the same picture, which destroys the one thing the view exists
to show. That brief is right and it has not changed.

What was wrong was how it was kept. `autoFit` enforced it with a single floor,
`MIN_SPAN = 96` metres, plus two more floors that pushed the same way: `yHi`
starting at 4 m, and the roof forced into the frame at no less than 34% of its
height whatever the flight was doing. The effect was that **every flight from
about 0.1 m to 85 m got the identical 96 m frame**.

That is not preserving a comparison. Two throws of 40 m and 60 m are worth
comparing; a 0.4 m one has nothing to do with either. Giving all three the same
picture does not protect the first comparison — they would have shared a frame
anyway — it only refuses to show the third.

### What it does now

The frame a flight needs is worked out honestly, with no floor except the
object's own size. Then one question: **does the frame already on screen still
hold this flight, and does this flight fill at least 45% of it?** If yes, the
frame does not move at all. If no, it refits.

```
want      = max(width × 1.2, height × 0.9, 14 ball-widths)
frame     = fits the one already up ? keep it : want
```

Measured, five launches in a row from the same scenario:

| launch | range | frame |
|---|---|---|
| 25 m s⁻¹ | 63.7 m | 133.8 m |
| 22 m s⁻¹ | 49.3 m | **133.8 m** — held |
| 18 m s⁻¹ | 33.0 m | 55.0 m — let go |
| 25 m s⁻¹ | 63.7 m | 133.8 m |
| 3 m s⁻¹ | 0.9 m | 4.5 m |

The second launch is the case the brief cares about and it gets a
pixel-identical frame. The third has dropped below 45% and takes its own. The
last is a different question entirely and is finally visible: under the old
floor its parabola was about nine pixels wide.

### Why 45%

Below about a half the smaller flight stops being readable inside the larger
flight's frame, which is the point at which holding the band costs more than
it buys. It is also comfortably more than the 2× gap between successive
launches a student actually makes while sweeping a value, so the common case
holds the frame.

### Why there is still a floor, and why it is the ball

Zooming into a 15 cm flight until it fills the frame puts a football across
most of the motion. A ball bigger than the motion is no more readable than a
motion too small to see, so the floor is fourteen ball-widths — close enough
to look at, far enough that the ball is still a ball. It is derived from
`D.prop.ball` rather than written down, so it follows the ball if the ball
changes.

### What makes leaving the band safe

The scale bar and the caption beside it were already on screen and already
correct. They are what turns "this frame is not the last frame" from a trap
into a reading: at 4.5 m the bar says 0.5 m and the caption says *4.5 m across
· 1 unit = 1 m*, so the size of what you are looking at is never in doubt.
Leaving the band would not be safe without them. (That caption used to name the
zoom band — *Pitch level* — and now gives the width; the reason is in *One
view*, at the end of this file.)

### And the fit travels

`autoFit` used to end with `snapWant`, so the whole fit happened between one
frame and the next and a launch was an instant cut — which reads as a bug
rather than as a camera. Band changes already eased through `easeCamera`, so
the launch fit goes the same way. Measured on a launch that needs a very
different frame: the scale moves 6.4 doublings over 34 frames, with the
largest single step 15% of the journey. The first fit of a session still
lands directly, because there is nothing to travel from.

## Nothing outside the stadium — 12 October 2026

The district has been removed. Two parks with ponds and trees on a jittered
grid, four terraces of houses stored as rows, four car parks full of cars, a
dual carriageway with its street trees and traffic, a west-side street, and a
rail station with four tracks and forty people on the platform. With it go the
180 people and 30 young trees on the podium plaza, which stood outside the
bowl too. The podium itself stays, because it is what the stadium stands on.

### Why

It was built as scale reference, and it blinked.

Every one of those items is a *point instance* — a `prop` record, gathered by
the cut inside a 9 m band and drawn one sprite at a time. The sprite pass was
one of three per-item loops skipped while `cam.moving` was set, a saving worth
taking when a district could put a few hundred gradients and canopy arcs in
one frame. But at pitch level the camera *follows the ball*, so `cam.moving`
is set for the whole of a flight: the trees and the people vanished on launch,
came back when the view settled, and vanished again on the next drag. A scale
reference that is absent whenever anything is happening is not a scale
reference, and scenery that flickers reads as a fault in the physics rather
than as a saving.

The crowd was always the better ruler anyway, and the *Readability decisions*
section above already said so: a section cuts one spectator per row, a seated
person is 0.85 m above seats 0.80 m apart, and all of it is inside the frame
the flight is in. It needs no 9 m band and no sprite loop.

### What came out with it

`A.cheap` is gone, and with it the whole idea of a cheaper frame while the
camera moves — the two loops it was protecting against were the district's.
`cam.moving` no longer appears in the scenery layer's cache key either: a flag
that changes nothing in the drawing but changes the key means the moment the
camera settles, the identical frame is repainted for nothing.

Then the painters with no caller: `person`, `car`, `bus`, `tree`, `lamp`, the
terrace branch of `blocks()` and the frontage rhythm in `windowsAlong`. Then
twenty-one scenery tokens — brick, render, panel, two roofings, asphalt,
paving, kerb lines, ballast, two park greens, trunk, pond and five car paints —
from `css/tokens.css` as well as from the renderer's `KEYS` map, because a
colour nothing can ask for is not part of a palette. Then the district entries
in `dims.js`, the second fade in `groundMarks` for road lines and rails, and
the panel of the launch map that was a plan of the district, which is now the
distance grid instead.

`D.prop.person` stays: the free kick's defensive wall is four of them shoulder
to shoulder, and that is inside the pitch markings.

### One thing that turned up on the way

The four corner floodlight clusters were placed on `D.roof.ringA` / `ringB` —
the semi-axes of an elliptical roof opening that stopped existing when the roof
and the bowl were made to share one rounded-rectangle family. Both read
`undefined`, so every cluster has been sitting at `x = NaN`. NaN fails the band
test and the visibility test alike, which is why four floodlights went missing
without anything ever looking wrong. They are derived from the front row inset
by `ringInset` now, which is what the renderer already did; the same two stale
references were fixed in the tools in an earlier pass and missed here.

## The ball is 0.22 m — 12 October 2026

It was drawn at 1.45 × 0.22 m, a factor that lived in `dims.js` so the
exaggeration would at least be a stated number. The reason given was that a
true-size ball is a speck at stadium scale — and that is true, but it is not
what the factor fixed. At a 67 m frame the ball's true radius is 0.9 px and
the exaggerated one is 1.3 px; what *finds* it at that size is the magnifier
ring in `ballSprite`, which is what the ring is for. All the factor really did
was act at the close end, where the ball is already large.

So the factor is gone and the ball is 0.22 m, which means it now scales with
the view exactly as the trajectory it sits on does.

The other half is a ceiling, in `js/render/util.js` with the other pixel
floors — a screen distance does not belong in a sheet that is metres
everywhere. Measured on `u = 1.2 m s⁻¹` at 45°: the flight is 0.147 m long,
the frame it gets is 3.4 m, and the path is **58 px** long on screen. The ball
was being drawn at a radius of **63 px** — a football twice the width of the
whole trajectory, which is the one thing on the screen it exists to show. It
is 9 px now, which is the same order as the path's own 3.4 px stroke in its
6.2 px casing, and still wide enough for the panels, so it is still a football.

The floor in `autoFit` is unchanged in form — fourteen ball-widths — but it
is now fourteen *real* ball-widths, 3.08 m instead of 4.47 m, so a desk-sized
flight gets a frame a third tighter than it did.

---

## One view — 12 October 2026

**Pitch / Stadium / Wide is gone.** One button, *Whole flight*, and the wheel.

The three were cameras rather than crops, which was the right fix for what was
wrong with them in October — but it left a control whose whole job was to ask a
question a student standing in front of a projectile question does not have.
They want to see the flight. Two of the three answers could only give them less
of it:

- **Pitch** fixed the span at 26 m and rode along with the ball. Any flight
  wider than that was therefore cropped, and the crop moved while it was being
  read. For the launches this app is mostly used for — the angled throw from a
  height, 30 to 60 m of range — it showed about a third of the arc.
- **Wide** fixed the span at 900 m. The district it pulled back to show was
  taken out of the world months ago, so what it framed was eight hundred metres
  of empty ground around a flight reduced to a scratch.

Neither was labelled with what it would cost, and both sat one click from the
fit at all times.

What is left is the frame `autoFit` already worked out — the whole flight, plus
as much of the place as the flight's own size earns, which is the subject of
*The framing band, reconsidered* above — and a button that returns to it.
Panning and zooming are untouched: the view is still yours to move, and the
button lights up while the fitted frame is what you are looking at and dims the
moment you leave it, so it reads as the way back rather than as a mode. A
double-click on the canvas does the same thing, and always did.

**One number went with it.** The corner caption used to print the band's name,
`BAND_LABEL[zoomBand(span)]` — *Pitch level*, *Stadium*, *Wide*. A caption
naming a camera that cannot be chosen is a label pointing at nothing, so it
gives the frame's width in metres instead, which is the part of it a student can
use. `zoomBand` had no other caller and is deleted; `D.lod.bands` is untouched,
because the level-of-detail thresholds were never read through it.

**And a refit re-frames honestly.** `fitView` clears `heldSpan`, the memory that
keeps two comparable launches in the identical frame. Holding the band is right
when a flight has just been fired and wrong when somebody has asked, in as many
words, to see *this* flight framed.
