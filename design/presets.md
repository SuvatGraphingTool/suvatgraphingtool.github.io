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
| **Downwards off a height** | Thrown *below* the horizontal, so it drops faster |
| **Hit from just above the ground** | A cricket or golf shot — launched from about hand height |

## Two objects at once

| Scenario | What happens |
|---|---|
| **Catch it** | One thrown, one runner setting off later to intercept it |
| **Head start** | The same throw twice, one delayed |

## Worth looking at

| Scenario | What it shows |
|---|---|
| **Time above a line** | How long the object stays above a chosen height |
| **Turned 90°** | The moment its direction is at right angles to how it set off |
| **Reach a given height** | Work backwards from the top of the path to the angle needed |
| **One second at a time** | How much further it falls in each successive second |
| **Low gravity** | The same throw somewhere gravity is weaker |
| **No gravity** | It never comes down — shows what gravity was doing all along |

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
