# The angle of projection, and why you usually do not need it

A lot of exam questions give you everything except the angle. You know it is
an arc, you have the numbers, and there is no angle anywhere on the page. The
natural conclusion is that something is missing.

Nothing is missing. This is the reasoning the app now states on the values
screen rather than keeping in a list at the bottom of it.

---

## You do not need it to solve the five

**Any three of *s*, *u*, *v*, *a*, *t* determine the other two.** That is the
whole of SUVAT, and not one of the five equations mentions a direction:

| | |
|---|---|
| *v* = *u* + *at* | |
| *s* = *ut* + ½*at*² | |
| *s* = *vt* − ½*at*² | |
| *v*² = *u*² + 2*as* | |
| *s* = ½(*u* + *v*)*t* | |

A question that gives you three of them has given you everything. The angle is
not a missing fourth input; it is a different question.

`js/core/solve.js` states this as the promise the file keeps, in its own
header, and has always behaved that way. What was missing was saying so where
the question gets asked.

## So what is it for?

**Drawing the arc.** The five equations describe motion along a line. To put
that motion in a plane — to know where it is sideways as well as how high —
you need a direction, and that is all the angle is for.

So the app's behaviour follows from the physics rather than from a
convenience:

- angle given, or findable → a two-dimensional arc
- angle unknown and unfindable → straight-line motion, **said out loud**
- fewer than three values → refuse, and name what is missing

The straight-line case is not a degraded answer or a fallback that lost
something. It is the correct answer to a question that never mentioned a
direction, and every number in it is exact.

## And when you do want the arc, the angle usually comes out

Three ways, all of them already implemented:

| What you have | How θ comes out | Where |
|---|---|---|
| *s* and *t* | *u*ₓ = *s* ∕ *t* and *u*ᵧ = (½*gt*² − *h*) ∕ *t*, so tan θ = *u*ᵧ ∕ *u*ₓ | `solve.js` — resolve and divide |
| *u*, *t* and *h* | sin θ = (½*gt*² − *h*) ∕ (*ut*) | `solve.js` — vertical only |
| *s*, *u* and *h* | the range equation — a quadratic, so **two** answers | `solve.js` — `altTheta` |

The third is worth dwelling on, because two answers is not a defect. A given
speed reaches a given point at two different angles: the low ball, which gets
there fast and flat, and the high ball, which lobs. Both are correct and they
land in the same place. The app names both and offers to switch to the other,
because a student who sees only one may well have been asked for the other.

## What the app says, and where

Between the five boxes and the angle box — which is where the question gets
asked, not at the bottom of the screen:

**A band stating which kind of motion is being solved.** Either "a
two-dimensional arc at the angle you gave", or "you did not give the angle and
did not need to — the engine recovered it as θ = 20.4°", or, in full and
without apology, that this is straight-line motion, that nothing is missing,
and what to add if you want the arc drawn.

**Inside the angle box, what it did.** When the angle was worked out, the line
of algebra that produced it, and that leaving the box blank is a normal thing
to do and usually the right one. When there are two answers, both of them and
a way to take the other.

**And the diagram shows what was found**, in a muted tone rather than the
velocity hue, so it is clear it is the engine's answer and not yours. A flat
diagram beside a panel saying "recovered as 20.4°" would make the two
disagree, and the picture is the part that gets believed.

## The short version, for a student

> You almost never need the angle. Three of the five is a complete question
> and the five equations never mention a direction. The angle only decides how
> to *draw* it — and if you want it drawn, the angle can usually be worked out
> from what you already have. When it cannot, the motion is a straight line,
> which is the honest answer rather than a failure.
