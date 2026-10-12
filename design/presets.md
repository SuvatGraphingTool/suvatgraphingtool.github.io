# Scenarios

Every ready-made scenario the presets screen should offer.

The student sets the numbers themselves — speed, angle, height, gravity. A
preset only chooses the **situation**: what the object is doing and what is
worth looking at. Numbers are defaults to be dragged, never fixed answers.

---

## Straight up and down

| Scenario | What happens |
|---|---|
| **Dropped** | Released from rest. Falls straight down |
| **Thrown straight up** | Goes up, stops, comes back to your hand |
| **Thrown straight down** | Thrown downward from a height |
| **Dropped from a rising balloon** | The balloon is going up, so the bag rises before it falls |

## Thrown flat

| Scenario | What happens |
|---|---|
| **Off a table** | Rolls off an edge and drops |
| **Off a roof** | Kicked horizontally off a flat roof |
| **Off a cliff** | Thrown horizontally from a clifftop into the sea |
| **Dart at a board** | Almost flat — only dips slightly on the way |
| **Package from a plane** | Released from a plane flying level |

## Thrown at an angle, from the ground

| Scenario | What happens |
|---|---|
| **Simple arc** | Thrown up and out, lands back at ground level |
| **Over a fence** | Has to clear an obstacle partway along |
| **Two angles, same landing** | A steep throw and a shallow one land in the same place |
| **Best angle** | Sweep the angle to find the one that goes furthest |

## Thrown at an angle, from a height

> The most examined situation of all.

| Scenario | What happens |
|---|---|
| **Up and off a cliff** | Thrown upward from a height, lands far below |
| **Downwards off a height** ✓ | Thrown *below* the horizontal, so it drops faster — built, as *Down and off a platform* |
| **Hit from just above the ground** | A cricket or golf shot — launched from about hand height |

## Two objects at once

| Scenario | What happens |
|---|---|
| **Catch it** | One thrown, one runner setting off later to intercept it |
| **Head start** | The same throw twice, one delayed |

## Worth looking at

| Scenario | What it shows |
|---|---|
| **Time above a line** ✓ | How long the object stays above a chosen height — built |
| **Parachute drop** ✓ | Free fall, then a canopy, then a steady descent — built, see below |
| **Turned 90°** | The moment its direction is at right angles to how it set off |
| **Reach a given height** | Work backwards from the top of the path to the angle needed |
| **One second at a time** | How much further it falls in each successive second |
| **Low gravity** | The same throw somewhere gravity is weaker |
| **No gravity** | It never comes down — shows what gravity was doing all along |

---

## The parachute, and the one place air resistance gets in

Built 12 October 2026, under *Interesting ones*. It is the only scenario that
is not the idealised model, and the reason is worth writing down.

Everywhere else, "no air resistance" is a simplification: the answer is a bit
wrong and the question says so. A parachute is different — a canopy is a
device for making drag enormous on purpose, so leaving air out does not
simplify the situation, it deletes it. The scenario would be a drop.

So air gets in the way the exams let it in: **not as a drag law, but as a
stated constant for each stretch of the fall.** Three stretches —

| Phase | What acts | Acceleration |
|---|---|---|
| Free fall | gravity alone | *g* downwards, the ordinary model |
| The canopy opens | drag exceeds weight | a constant deceleration the question states |
| Steady descent | drag balances weight | zero — constant velocity |

— and SUVAT is applied to each one in turn. That *is* the lesson, and it is
why the question gets set: it is the first time most students have to notice
that the five equations describe a **phase** of a motion rather than a motion.
A v–t graph question about a parachutist is a staple of both the Physics and
the Mechanics papers.

**What the student types** is the setup, not three of the five: the height she
jumps from, how long she falls before pulling, the deceleration the canopy
gives, and the steady speed it settles to. The five boxes are not offered,
because a single row of `s u v a t` could only be about one phase with nothing
on screen to say which. The engine returns all five **for each phase**, and
the ending card is three rows of five with the three added up underneath.

**What it refuses**, each with the reason: a canopy pulled after she would
already have landed, a canopy open before she has started moving, a steady
speed at or above the speed she is doing when she pulls, and no gravitational
field at all. **What it does not refuse** is running out of height while still
slowing down — that happens, she lands faster than the steady speed, and the
card says so rather than calling it an error.

**What is still not modelled**, and the ending card lists every item: free
fall has no drag in it at all, so it never levels off near a real skydiver's
55 m s⁻¹; the opening is one instantaneous change of acceleration rather than
a snatch with a peak; and the deceleration is a figure the student gave, not
one worked out from canopy area, mass or air density. None of those three was
computed, and the card does not pretend otherwise.

The engine is `js/core/descent.js`, which also owns its own working panel and
resolve card, because the formulas have to quote the phase they belong to.

### Four panes — 12 October 2026

The drop was being watched in the side-on stadium view like every other
scenario, and that was the wrong room for it. A parachute descent has no
horizontal part at all, so the one thing the stadium view is for — a place at
a scale you can judge a height against, with an arc standing in it — had
nothing to do. What it contributed instead was a goal, a crowd, a metre grid
and a football-shaped object, to a question about none of those. The three
graphs, meanwhile, were three 185 px canvases in a sidebar behind an Options
button.

So this scenario now has its own window: **four equal panes**, over one play
button, one scrub bar and one time cursor shared by all four.

| Pane | What it shows |
|---|---|
| **The jump** | Sky. The aircraft crosses it, the door opens, she leaves, falls, the canopy inflates, and she lands. No stadium, no football, no metre grid. |
| **Velocity–time** | Rising in free fall, dropping hard at the opening, flat under the canopy. The area under it is the height fallen. |
| **Height–time** | A steepening curve, a knee at the opening, then a straight ramp to zero. |
| **Acceleration–time** | The step. `g` down, the canopy up, then nothing. |

**Why the fourth pane is acceleration–time.** This scenario exists to show
that `a` is not one number, and `a–t` is the only pane where that is the whole
picture rather than a slope to infer off another graph. It also completes the
trio every exam question on a parachutist is built from.

**The graphs are exact, not sampled.** Inside a phase the acceleration is
constant, so `v` is linear in `t`, `s` is a parabola and `a` is a constant.
`js/render/plot.js` takes segments rather than a function to sample: a
polyline through the phase boundaries IS the velocity–time graph, the step IS
the acceleration–time graph, and the height is drawn as a quadratic Bézier,
which is not an approximation of a parabola but a parabola. Read back off the
rendered pixels, all three agree with the engine to within the width of their
own stroke.

**Downwards is positive** on all three, which is the convention
`js/core/descent.js` states, the one the ending card's table is in, and the one
a student is taught to choose for a drop. Each pane's header says so.

**The pre-roll is outside the clock.** The aircraft crossing, the door
opening and the step out all happen before `t = 0`, because `t = 0` is the
instant of release. It runs in real seconds rather than playback seconds — the
speed control is about how fast to watch the physics, and a drop asked to run
at a tenth of real time should not spend half a minute watching an aeroplane.
Nothing in it is presented as physics: no numbers are drawn, no readout moves,
and the three graph panes hold at zero with nothing on them and one line of
text saying why. A flat line at zero would be a claim about a motion that has
not happened.

**The aircraft's speed does not count, and the card says so.** She leaves from
rest and falls vertically; the engine stays one-dimensional. A real jumper
carries the aircraft's speed out of the door, which bends the first second or
two into an arc, and none of that is in any of these numbers. The aeroplane
and the door are scenery — drawn at a size you can see rather than at the size
they are — and the ending card's list of what is not modelled now says all of
this out loud beside the three it already said.

**What the window replaces.** In it there are no readout boxes on the diagram
— four panes have no corner to spare, so the clock moved to the transport,
where all four already share it — no resolve card, because the gesture on
every pane is pan and zoom and there is nothing to point at, and none of the
seven Show options, because every one of them is about the single diagram.
What the resolve card was for is on screen instead: three graphs with axes to
read the velocity, the height and the acceleration off.

**Maximize, and the same map in all four.** Every pane carries a button at its
top left that blows it up to fill the stage, collapsing the other three to a
row of named tabs; the same button restores the layout. Every pane takes drag
to pan and wheel to zoom, in its own units — metres of sky for the jump,
seconds across and `m s⁻¹` or `m` or `m s⁻²` up for a graph — and each
remembers its own view, so zooming one pane into the nine tenths of a second
the canopy works in leaves the other three where they were. Each has its own
**Whole flight** button, lit while that is what it is showing.

**Chosen before anything moves.** The speed card gained a layout picker — all
four, two side by side, or one — because four quarter-size panes is the right
default for exactly the reason the scenario exists and the wrong answer on a
small screen. It is remembered the way the theme is remembered.

**Scope.** The window (`js/render/panes.js`) is general: a pane is four
strings, a view adapter and a draw function, so the other ten scenarios could
be moved onto it later. None of them is moved now. The 13 px floor is a floor
and not a starting point, which is why the title, the convention, the axis
numbers and both buttons are all there at quarter size; the only thing that
waits for a bigger layout is the pane's own sentence of prose, and that is
half of what maximize is for.

The window is `js/render/panes.js`, the plotter `js/render/plot.js`, and this
scenario's four panes `js/render/drop.js`.

#### The aircraft stays, and the canopy is big enough to watch

Two things the first build got wrong, both of them about the jump pane rather
than about the physics.

**The aircraft used to fly off and be gone.** It crossed during the pre-roll,
left the right-hand edge, and the top of the pane was empty for the whole of a
fall — which made the drop look like it had come from nowhere. A real jump
aircraft does not vanish either: it flies on, turns, and descends, because it
has to get down and land, usually well before the jumper does. So it stays in
the picture, drifting out to the side and losing height.

Three things keep it unmistakably scenery rather than a second object with a
motion worth reading: it goes **out**, to the far side of the pane, while she
falls down the middle; it **sinks far less** than she falls; and it **fades**
as it goes, so it reads as receding rather than as a subject.

The sink had to be eased in, and the test is what found it. She leaves from
rest, so for the first second of the fall she is barely moving — and an
aeroplane losing height at a steady rate from the same instant passes *below*
her and sits there. Her own fall is `½gt²`, so the aircraft's descent is in
`t²` too, with a coefficient that keeps it slower than hers at every instant
rather than merely by the end. `test/scenarios.test.mjs` checks the whole
flight: always out to the side, never below her, never losing height faster
than she falls, only ever further out and only ever fainter.

None of that motion is computed, and the ending card's list now says so in as
many words: the aircraft's way down was not worked out any more than its speed
was.

**The canopy was a smudge.** At her true size a 1.8 m jumper in a
quarter-size pane holding 140 m of them is three pixels tall and her 7 m
canopy eleven across — and since the canopy is floored at seven pixels anyway,
the inflation that the whole middle phase is *about* grew from seven pixels to
eleven and was invisible. The sprite now takes a scale of its own, floored
against the pane's height rather than against a fixed number of pixels, so she
is the same share of a quarter-size pane as of a maximized one, and it only
ever enlarges — zoom in far enough and her true size takes over again. The
person-to-canopy **ratio** is untouched, because that ratio is most of why the
picture reads as a parachute at all. Measured: the canopy inflates from 7 px
to 59 px across at quarter size and to 121 px maximized, in both themes.

Her feet now stand on the position rather than straddling it. The engine
treats her as a point, and the point a landing is about is the one that reaches
the ground — so the trail ends at her feet and the last frame is not a person
whose legs go through the ground.

---

## Built, then removed

Two of the above were implemented and have since been taken out. The research
behind them is still sound — `design/scenarios.md` records how often the exams
ask for each — so this is a note about the product, not a correction to the
evidence.

| Scenario | Why it went |
|---|---|
| **Throw at a target** | The aim was computed FROM the target, so the path could not miss it. Dragging the point moved the answer rather than testing it, which made it a picture of a throw rather than a question about one. The draggable target itself survives, in Monkey vs Hunter, where never missing is the whole result. |
| **Two that collide** | Same problem, worse. The second object's launch was derived so that the two always met, whatever was typed — so "they still meet" was true by construction and not by physics. A demonstration that cannot fail demonstrates nothing. |

The machinery each needed is gone with them where nothing else used it.

---

## What these need from the interface

- **Launch height on the main screen.** Around half of exam questions use it — it
  is not an advanced setting.
- **Angle enterable as a ratio** (`tan θ = 3⁄4`) as well as degrees. Papers give
  ratios far more often than angles.
- **A plain 9.8 / 10 switch for gravity.** Papers state which to use and answers
  depend on it.
- **A draggable height line**, for "time above a line" and "does it clear".
- **A second object**, for the collision, catching and comparison scenarios.
