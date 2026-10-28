# The composer: scenarios assembled from the app's own pieces

Students meet A-level SUVAT questions that none of the twelve ready-made
scenarios fit. The composer lets Ask Suvat build one there and then. It does
not draw anything new: it puts together the pieces the twelve are already made
of (an engine, a stage, an object, markers, a companion) and hands the result
to the app. The app runs it like any other scenario.

**The model names pieces; the engine calculates.** A recipe says which pieces
and with what settings. It never carries a result. Every number the student
sees still comes from `js/core/` (CLAUDE.md rule 4).

Code: [`js/compose/registry.js`](../js/compose/registry.js).
Test: `node test/compose.test.mjs`.

## Why a scenario can be assembled at all

A ready-made scenario in `js/scenarios.js` is a set of flags the app reads:
`lockAngle`, `dragLine`, `stage: 'range'`, `second`, and so on. Each flag
switches on one piece of the app:

- `stage: 'range'` → the indoor range in `js/render/range.js`
- `markers.heightLine` + `dragLine` → the draggable line and `timeAbove`
- `second` → a companion object flown beside the first on one clock

So a scenario *is* a composition already; it was just written by hand. The
registry names each piece and the flags it stands for. `assemble(recipe)`
writes those flags onto a fresh scenario of exactly the shape
`js/scenarios.js` holds.

The test proves the pieces are the right ones. It rebuilds **all twelve**
ready-made scenarios from recipes and checks three things:

- every structural flag matches the hand-built scenario;
- each launches from the same place;
- the engine solves both to the same flight, digit for digit.

## The pieces

| kind | how many | pieces |
|---|---|---|
| motion | exactly 1 | `launch`, `straight-line`, `parachute-phases` |
| stage | exactly 1 | `stadium`, `plate`, `range`, `road`, `sky` |
| body | 0–1 | `ball`, `round`, `banana`, `skydiver`, `vehicle` |
| companion | 0–1 | `released-beside`, `drops-from-target` |
| marker | 0–2 | `height-line`, `target` |
| control | 0–2 | `straight-up`, `live-sliders` |
| graph | always | `graph-s`, `graph-v`, `graph-a` |
| working | always | `working`, chosen by the motion |
| values | always | `values`, the boxes the motion asks for |

**Always there.** Graphs, working and values come with every motion and are
never named in a recipe. A composed scenario cannot leave out its graphs or
its worked solution: that is how it keeps up to the standard of the twelve.

**Motions name their engines**, listed in `ENGINES`:

| motion | engines |
|---|---|
| `launch` | `solveLaunch`, `trajectory`, `flight` / `timeAbove`, `buildWorking` |
| `straight-line` | `solveRoad`, the plain five in `js/core/suvat.js`, `roadWorking` |
| `parachute-phases` | `solveDescent`, `descentWorking` |

The `target` marker brings in `intercept`.

**Pieces check each other.** A piece refuses company it cannot work with, and
says why. Examples:

- a road motion is only drawn on the road;
- a banana only on the plate;
- a target can hang from a branch only on the plain plate, where the tree is;
- aiming at a target sets the angle, so the launch angle must be free.

**Hand-built only.** The card, the words on it, an experiment's opening card
and the long ending ("where this stops being the real thing") are written,
not assembled. A composed scenario has its name, a line under it and a note,
and none of those.

## A recipe

One JSON object: `name`, optional `sub` and `note`, and `pieces`. Each piece
is an object naming its `piece`, plus its settings and nothing else.

A question no ready-made scenario fits, *"a stone is thrown horizontally at
12 m/s from a 45 m tower; at the same instant a second is dropped; which lands
first?"* (Bullet vs Drop is a rifle on a bench, at most 3 m up):

```json
{
  "name": "Thrown and dropped",
  "sub": "off a tower, at the same instant",
  "pieces": [
    { "piece": "launch", "angle": "fixed", "degrees": 0, "from": "height" },
    { "piece": "stadium", "spot": "platform" },
    { "piece": "ball" },
    { "piece": "released-beside", "label": "dropped", "pair": "same height" }
  ]
}
```

What the student typed (45 m, 12 m/s) is not in the recipe. It goes in the
values boxes as it does today, through `js/core/question.js`, and
`solveLaunch` works out the rest.

The most involved of the twelve, Monkey vs Hunter, is six pieces:

```json
{ "name": "Monkey vs Hunter", "pieces": [
  { "piece": "launch", "angle": "free" },
  { "piece": "plate", "backdrop": "plain", "u": 22, "h": 1.5 },
  { "piece": "banana" },
  { "piece": "target", "x": 10.1, "y": 9.4, "drag": true, "aim": true, "branches": true, "caught": "caught — every time" },
  { "piece": "drops-from-target", "label": "the monkey", "pair": "same fall" },
  { "piece": "live-sliders", "uMin": 4, "uMax": 60, "uStep": 0.5, "thetaMin": -20, "thetaMax": 85, "thetaStep": 0.5 }
] }
```

### What is refused

`assemble()` returns `{ ok: false, error }` with a reason a person can read.
It refuses:

- an unknown field, piece or setting;
- a value of the wrong type or out of range;
- a missing required setting;
- a piece named twice;
- the wrong number of pieces of a kind;
- pieces that do not go together.

It never guesses a fix. `test/compose.test.mjs` has a case for each.

### What comes out

A scenario object, the same shape as the twelve. It also carries:

- `id: 'composed-<slug>'`, which never collides with a ready-made id;
- `group: 'composed'`, so it is not one of the four picker groups;
- `composed: true`;
- `spot`, the stadium site key (the twelve find their site by their own id);
- `recipe`, kept so it can be saved and rebuilt, as the whiteboard keeps its
  blueprints.

`params` is set the way the twelve set it. It matters only where the app reads
it (the locked angle); otherwise it is the card's sketch.

## A reading that carries a recipe

When none of the twelve fits, the reader sends `scenario: "composed"` with the
recipe beside the values the question gives, in the same flat fields as any
other reading:

```json
{ "understood": true, "scenario": "composed",
  "recipe": { "name": "Above a line, from a cliff", "pieces": [ … ] },
  "summary": "A ball is thrown at 15 m/s at 40° from a 20 m cliff.",
  "h": 20, "u": 15, "angleDegrees": 40, "heightLine": 22 }
```

`toApp` in `js/core/question.js` hands the recipe to `compose()`. That
assembles it, keeps it in `COMPOSED` in `js/scenarios.js` (so `byId` finds
it), and gives back its id. The reading then goes the route every reading
goes: `applyReading`, `chooseScenario`, the values screen, `solveLaunch`, the
stage.

The values are read by the scenario's **pieces**, by the same rules the
twelve are read by their ids. A released object has no speed and no angle; a
fixed angle wins over one the reader sent; a height line or a target is read
only when the recipe has one; a straight-line motion is read as the road is.

A recipe that does not assemble refuses the whole reading, with
`assemble()`'s reason.

The same route serves the whiteboard (`solveObject`) and questions in parts
(`js/core/parts.js`). A composed part is solved by the same engines, so it
returns `solved.five` and `solved.extras`, and a later part carries from it
like any other. The stadium reads a composed scenario's `spot`
(`js/render/scene.js`).

## The reader composes

`worker/src/schema.js` has a section, COMPOSING A SCENARIO, that tells the
model when to compose and how. Its piece list (`PIECE_GUIDE`) is written out
from `PIECES` and `KINDS` when the Worker is built: each kind with its count,
each piece with its `says`, and each setting with its type, range and `says`.
The prompt cannot offer a piece the code does not have.

It tells the model to compose **only when none of the twelve fits**. Most
questions fit: every launch takes the height the question gives, and Time
above a line takes any height and any angle. A composed scenario has no card
and no words written for it, so a ready-made one is always better when there
is one. What the pieces build today that the twelve cannot is a throw from a
height beside an object let go at the same instant. Stage 2b adds more.

`test/compose.test.mjs` checks that:

- every piece and setting is in the prompt, in its own words;
- the reader and the whiteboard are both told them;
- every composed example the prompt shows assembles, and its reading reaches
  the app.

On the whiteboard, a composed scenario's companion is its second object. If
the model lists it again in `others`, `readBlueprint` drops the repeat.

## Adding a piece

The registry is the one place a piece is described, and the library of
past-paper scenarios adds its reusable pieces here. A new piece is **one entry
in `PIECES`**:

```js
{ id: 'kebab-case-id',            // what a recipe names
  kind: 'marker',                 // one of KINDS
  says: 'One sentence the model is told: what it is and when to use it.',
  engines: ['projectile'],        // ids from ENGINES it relies on, if any
  render: { module: 'js/render/x.js', exports: ['render'] },  // stages and graphs: what draws it
  params: {                       // every setting it takes, and nothing else is accepted
    at:   { type: 'number', min: 0, max: 500, required: true, says: 'its height in metres' },
    drag: { type: 'bool', says: 'the student can drag it' },
    // type: 'number' {min,max} · 'bool' · 'one' {of:[…]} · 'text' {max}
  },
  needs(p, ctx) { return '';  },  // why it cannot go with the others, or '' if it can
  apply(sc, p, ctx) { /* write the flags it stands for onto the scenario */ },
}
```

Rules for a new piece:

1. **A piece sets flags the app already reads.** If it needs a new flag, add
   the code that reads it first: the stage, the engine call, the values
   screen. Then add the flag to `SCENARIO_KEYS.structural` (or `.words` if it
   is only something the student reads). The test scans `js/` for every
   `scenario.<flag>` and fails on one the registry has not classified.
2. **A new engine or renderer is listed** in `ENGINES` or in the piece's
   `render`. The test checks every named export exists in the module named.
3. **If a ready-made scenario uses it, its recipe in the test uses it**, and
   must still rebuild that scenario exactly.
4. **`says` is written for the model**: plain, one sentence, no equations.
   Stage 3 builds the reader's compose prompt from these, so the prompt can
   never describe a piece the code does not have.

## Where this goes next

1. **Registry** (done): the pieces, the recipe, `assemble()`, and the
   proof that the twelve are compositions.
2a. **Readings with a recipe** (done): `scenario: "composed"` is assembled,
   chosen, solved and drawn like a ready-made scenario, on the stage, on the
   whiteboard and as one part of a question in parts.
2b. **Recipes with more than one part**: several objects, or one motion in
   phases (a ball thrown up a cliff, then rolling; two objects with
   different launches meeting). The page validates and assembles them, and
   the engine solves each part. Multi-part *questions* are being built
   separately in the reader, so this stage agrees the hand-off with that
   work.
3. **The reader composes** (done): COMPOSING A SCENARIO in
   `worker/src/schema.js`, its piece list written out from this registry.
   Ask Suvat and the whiteboard use it when no ready-made scenario fits.
4. **On the stage**: the app takes a composed scenario wherever it takes a
   ready-made one, with the same stage, graphs, working panel and notation.
   `siteFor` reads `spot`, and the chooser shows what was composed. A composed
   scenario that looks second-rate is a fail.
