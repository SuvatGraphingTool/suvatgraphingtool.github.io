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
